"""
Step 2: train the FSL-105 word recognizer on extracted landmarks, evaluate it on
signers it has never seen, calibrate it, and export it for the browser.

FSL-105 has 4 signers; clip numbers are grouped per signer in blocks of five
(0–4, 5–9, 10–14, 15–19; extra takes 20–21 belong to the last block). The dataset's
own random train/test split mixes the same people into both sides, which overstates
accuracy for new users. We therefore evaluate with leave-one-signer-out (LOSO):
train on 3 signers, test on the 4th, for each signer. Calibration (temperature and
the "Not recognized" threshold) is fitted on those out-of-signer predictions.
The shipped model is then trained on all 4 signers.

Usage:  .venv\\Scripts\\python train.py [--epochs 120] [--seed 7] [--skip-loso]

Outputs
  ../frontend/public/models/fsl105/model.onnx   browser model (input [1, T, F] → logits)
  ../frontend/public/models/fsl105/meta.json    labels, calibration, threshold, metrics, attribution
  runs/report.md                                 evaluation report
"""

import argparse
import json
import math
import random
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F_
from sklearn.model_selection import train_test_split

from signbridge_features import FEATURES, T, frame_features, resample, trim_to_activity

ROOT = Path(__file__).parent
DATA = ROOT / "data" / "fsl105"
LANDMARKS = DATA / "landmarks"
EXPORT = ROOT.parent / "frontend" / "public" / "models" / "fsl105"
RUNS = ROOT / "runs"
VERSION = f"fsl105-gru-{date.today():%Y%m%d}"
torch.set_num_threads(max(1, torch.get_num_threads()))

# Spelling fixes for display (dataset labels are kept as the source of truth for ids).
LABEL_FIXES = {"WEELCHAIR PERSON": "WHEELCHAIR USER", "IM FINE": "I'M FINE", "YOURE WELCOME": "YOU'RE WELCOME"}


# ── Data ────────────────────────────────────────────────────────────────

def load_labels() -> list[dict]:
    df = pd.read_csv(DATA / "labels.csv")
    out = []
    for _, r in df.sort_values("id").iterrows():
        name = " ".join(str(r["label"]).replace("’", "'").split())
        out.append({"id": int(r["id"]), "label": LABEL_FIXES.get(name, name), "category": str(r["category"]).strip().title()})
    return out


def load_clips() -> pd.DataFrame:
    df = pd.concat([pd.read_csv(DATA / "train.csv"), pd.read_csv(DATA / "test.csv")], ignore_index=True)
    parts = df["vid_path"].str.replace("\\", "/", regex=False).str.split("/")
    df["key"] = parts.str[-2] + "_" + parts.str[-1].str.split(".").str[0]
    df["take"] = parts.str[-1].str.split(".").str[0].astype(int)
    df["signer"] = (df["take"] // 5).clip(upper=3)
    return df[["key", "id_label", "signer"]].rename(columns={"id_label": "y"})


def clip_frames(key: str) -> np.ndarray | None:
    f = LANDMARKS / f"{key}.npz"
    if not f.exists():
        return None
    try:
        d = np.load(f)
        pose, hands, present = d["pose"], d["hands"], d["present"]
    except Exception:  # truncated file from an interrupted extraction run
        print(f"  ! unreadable {f.name}, delete it and re-run extract_landmarks.py")
        return None
    if len(present) < 3 or present.max() == 0:
        return None
    feats = np.stack([frame_features(pose[i], hands[i], present[i]) for i in range(len(present))])
    return feats[trim_to_activity(present)]


# ── Augmentation (feature space) ────────────────────────────────────────

POSE_SWAP = [0, 2, 1, 4, 3, 6, 5]


def mirror(seq: np.ndarray) -> np.ndarray:
    """Left-handed signer simulation: flip x, swap left/right body points and hand slots."""
    out = seq.copy()
    pose = out[:, :14].reshape(-1, 7, 2)[:, POSE_SWAP]
    pose[..., 0] *= -1
    hands = out[:, 14:140].reshape(-1, 2, 21, 3)[:, ::-1].copy()
    hands[..., 0] *= -1
    out[:, :14] = pose.reshape(-1, 14)
    out[:, 14:140] = hands.reshape(-1, 126)
    out[:, 140:142] = out[:, 140:142][:, ::-1]
    out[:, 142:144] = out[:, 142:144][:, ::-1]
    return out


def augment(seq: np.ndarray, rng: random.Random) -> np.ndarray:
    n = len(seq)
    if n > 8:  # imperfect segmentation: crop up to 15% at either end
        a = rng.randint(0, int(n * 0.15))
        b = n - rng.randint(0, int(n * 0.15))
        seq = seq[a:max(b, a + 4)]
    seq = seq.copy()
    if rng.random() < 0.3:
        seq = mirror(seq)
    ang = math.radians(rng.uniform(-10, 10))
    s = rng.uniform(0.88, 1.12)
    rot = np.array([[math.cos(ang), -math.sin(ang)], [math.sin(ang), math.cos(ang)]], np.float32) * s
    pose = seq[:, :14].reshape(-1, 7, 2) @ rot.T
    hands = seq[:, 14:140].reshape(-1, 2, 21, 3)
    present = seq[:, 140:142]
    hands[..., :2] = (hands[..., :2] @ rot.T) * present[:, :, None, None]
    hands[..., 2] *= s
    seq[:, :14] = pose.reshape(-1, 14)
    seq[:, 14:140] = hands.reshape(-1, 126)
    seq[:, 142:144] *= s
    seq[:, :140] += np.random.normal(0, 0.015, seq[:, :140].shape).astype(np.float32)
    return seq


# ── Model ────────────────────────────────────────────────────────────────

class SignNet(nn.Module):
    def __init__(self, n_classes: int, mean: np.ndarray, std: np.ndarray, hidden: int = 160):
        super().__init__()
        # Normalisation lives inside the model, so the browser feeds raw features.
        self.register_buffer("mean", torch.tensor(mean, dtype=torch.float32))
        self.register_buffer("std", torch.tensor(std, dtype=torch.float32))
        self.inp = nn.Sequential(nn.Linear(FEATURES, hidden), nn.LayerNorm(hidden), nn.GELU(), nn.Dropout(0.25))
        self.conv = nn.Sequential(
            nn.Conv1d(hidden, hidden, 5, padding=2), nn.GELU(), nn.Dropout(0.2),
            nn.Conv1d(hidden, hidden, 5, padding=2), nn.GELU(),
        )
        self.gru = nn.GRU(hidden, hidden, batch_first=True, bidirectional=True)
        self.head = nn.Sequential(nn.Dropout(0.35), nn.Linear(hidden * 4, n_classes))

    def forward(self, x):  # x: [B, T, F]
        x = (x - self.mean) / self.std
        h = self.inp(x)
        h = h + self.conv(h.transpose(1, 2)).transpose(1, 2)
        o, _ = self.gru(h)
        return self.head(torch.cat([o.mean(1), o.amax(1)], dim=1))


# ── Training helpers ─────────────────────────────────────────────────────

def batches(X, y, size, shuffle, rng=None, aug=False):
    idx = list(range(len(X)))
    if shuffle:
        rng.shuffle(idx)
    for i in range(0, len(idx), size):
        chunk = idx[i:i + size]
        xs = [resample(augment(X[j], rng) if aug else X[j]) for j in chunk]
        yield torch.tensor(np.stack(xs)), torch.tensor([y[j] for j in chunk])


@torch.no_grad()
def predict_logits(model, X):
    model.eval()
    return torch.cat([model(xb) for xb, _ in batches(X, [0] * len(X), 256, False)])


def train_model(X, y, n_classes, epochs, seed, tag):
    """Trains with a stratified 12% early-stopping split taken from the given data."""
    rng = random.Random(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    X_tr, X_val, y_tr, y_val = train_test_split(X, y, test_size=0.12, stratify=y, random_state=seed)
    stack = np.concatenate(X_tr)
    model = SignNet(n_classes, stack.mean(0), stack.std(0) + 1e-4)
    steps = epochs * math.ceil(len(X_tr) / 64)
    opt = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=2e-2)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=2e-3, total_steps=steps)
    best, best_state = -1.0, None
    for epoch in range(1, epochs + 1):
        model.train()
        for xb, yb in batches(X_tr, y_tr, 64, True, rng, aug=True):
            opt.zero_grad()
            F_.cross_entropy(model(xb), yb, label_smoothing=0.1).backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            sched.step()
        acc = float((predict_logits(model, X_val).argmax(1).numpy() == np.array(y_val)).mean())
        if acc >= best:
            best, best_state = acc, {k: v.clone() for k, v in model.state_dict().items()}
        if epoch % 20 == 0:
            print(f"  [{tag}] epoch {epoch:3d}  val acc {acc:.3f}  best {best:.3f}", flush=True)
    model.load_state_dict(best_state)
    return model


def fit_temperature(logits: torch.Tensor, y: torch.Tensor) -> float:
    t = torch.ones(1, requires_grad=True)
    opt = torch.optim.LBFGS([t], lr=0.05, max_iter=200)

    def step():
        opt.zero_grad()
        loss = F_.cross_entropy(logits / t.clamp(min=0.05), y)
        loss.backward()
        return loss

    opt.step(step)
    return float(t.clamp(min=0.05))


def choose_threshold(probs: np.ndarray, y: np.ndarray, target_precision: float = 0.9) -> float:
    """Lowest confidence threshold whose accepted predictions reach the target precision."""
    conf, pred = probs.max(1), probs.argmax(1)
    for th in np.arange(0.2, 0.96, 0.01):
        keep = conf >= th
        if keep.sum() >= 0.1 * len(y) and (pred[keep] == y[keep]).mean() >= target_precision:
            return round(float(th), 2)
    return 0.7


def summarize(probs, y, threshold):
    pred = probs.argmax(1)
    keep = probs.max(1) >= threshold
    return {
        "top1": float((pred == y).mean()),
        "top5": float(np.mean([y[i] in np.argsort(-probs[i])[:5] for i in range(len(y))])),
        "coverage": float(keep.mean()),
        "precision": float((pred[keep] == y[keep]).mean()) if keep.any() else 0.0,
    }


# ── Main ───────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=120)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--skip-loso", action="store_true", help="only train the final model")
    args = ap.parse_args()

    labels = load_labels()
    id_to_index = {l["id"]: i for i, l in enumerate(labels)}
    clips = load_clips()
    X, y, signer, skipped = [], [], [], 0
    for key, lab, s in zip(clips.key, clips.y, clips.signer):
        seq = clip_frames(key)
        if seq is None:
            skipped += 1
            continue
        X.append(seq)
        y.append(id_to_index[lab])
        signer.append(int(s))
    y, signer = np.array(y), np.array(signer)
    print(f"{len(X)} clips loaded ({skipped} skipped: no hands found). Signers: {np.bincount(signer).tolist()}")

    # 1) Leave-one-signer-out evaluation.
    oof_logits = np.zeros((len(X), len(labels)), np.float32)
    fold_acc = {}
    if not args.skip_loso:
        for s in range(4):
            tr = np.where(signer != s)[0]
            te = np.where(signer == s)[0]
            model = train_model([X[i] for i in tr], y[tr].tolist(), len(labels), args.epochs, args.seed + s, f"signer {s} held out")
            logits = predict_logits(model, [X[i] for i in te]).numpy()
            oof_logits[te] = logits
            fold_acc[s] = float((logits.argmax(1) == y[te]).mean())
            print(f"signer {s} held out → accuracy {fold_acc[s]:.3f} on {len(te)} clips", flush=True)

        temperature = fit_temperature(torch.tensor(oof_logits), torch.tensor(y))
        oof_probs = F_.softmax(torch.tensor(oof_logits) / temperature, 1).numpy()
        threshold = choose_threshold(oof_probs, y)
        loso = summarize(oof_probs, y, threshold)
        print(f"\nUNSEEN-SIGNER  top-1 {loso['top1']:.3f}  top-5 {loso['top5']:.3f}  | "
              f"threshold {threshold}: answers {loso['coverage']:.1%} with {loso['precision']:.1%} precision")
    else:
        temperature, threshold, loso, oof_probs = 1.0, 0.7, None, None

    # 2) Final model on all signers.
    final = train_model(X, y.tolist(), len(labels), args.epochs, args.seed, "final")
    EXPORT.mkdir(parents=True, exist_ok=True)
    final.eval()
    torch.onnx.export(final, torch.zeros(1, T, FEATURES), EXPORT / "model.onnx",
                      input_names=["landmarks"], output_names=["logits"], opset_version=17, dynamo=False)

    # Verify the exported file reproduces PyTorch's outputs.
    import onnxruntime as ort_rt

    sess = ort_rt.InferenceSession(str(EXPORT / "model.onnx"), providers=["CPUExecutionProvider"])
    sample = [X[i] for i in range(0, len(X), max(1, len(X) // 20))][:20]
    torch_out = predict_logits(final, sample).numpy()
    onnx_out = np.concatenate([sess.run(None, {"landmarks": resample(s)[None]})[0] for s in sample])
    diff = float(np.abs(torch_out - onnx_out).max())
    print(f"ONNX check: max |torch - onnx| = {diff:.2e}")
    assert diff < 1e-3, "ONNX export does not match the PyTorch model"

    meta = {
        "version": VERSION,
        "frames": T,
        "features": FEATURES,
        "temperature": round(temperature, 4),
        "threshold": threshold,
        "labels": [{"label": l["label"], "category": l["category"]} for l in labels],
        "evaluation": {
            "method": "leave-one-signer-out (4 signers)",
            "unseen_signer_top1": round(loso["top1"], 4) if loso else None,
            "unseen_signer_top5": round(loso["top5"], 4) if loso else None,
            "coverage_at_threshold": round(loso["coverage"], 4) if loso else None,
            "precision_at_threshold": round(loso["precision"], 4) if loso else None,
            "per_signer_top1": {str(k): round(v, 4) for k, v in fold_acc.items()},
            "clips": len(X),
        },
        "dataset": {
            "name": "FSL-105",
            "author": "Isaiah Jassen Tupal (De La Salle University)",
            "license": "CC BY 4.0",
            "url": "https://doi.org/10.17632/48y2y99mb9.2",
        },
    }
    (EXPORT / "meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")

    if loso:
        RUNS.mkdir(exist_ok=True)
        pred = oof_probs.argmax(1)
        per_class = [(l["label"], float((pred[y == i] == i).mean())) for i, l in enumerate(labels) if (y == i).any()]
        conf = {}
        for a, b in zip(y, pred):
            if a != b:
                conf[(labels[a]["label"], labels[b]["label"])] = conf.get((labels[a]["label"], labels[b]["label"]), 0) + 1
        lines = [
            f"# FSL-105 model report ({VERSION})", "",
            "Evaluation: leave-one-signer-out. Every number below comes from signers the model did not see in training.", "",
            f"- Top-1 accuracy: **{loso['top1']:.1%}**, top-5: **{loso['top5']:.1%}**",
            f"- Per held-out signer: " + ", ".join(f"signer {k}: {v:.1%}" for k, v in fold_acc.items()),
            f"- With the app's \"Not recognized\" threshold ({threshold}): answers {loso['coverage']:.1%} of signs, "
            f"{loso['precision']:.1%} of those answers are correct.",
            f"- Calibration temperature: {temperature:.3f}", "",
            "## Hardest signs", "", "| Sign | Accuracy |", "|---|---|",
            *[f"| {n} | {a:.0%} |" for n, a in sorted(per_class, key=lambda r: r[1])[:15]],
            "", "## Most common confusions", "", "| Signed | Predicted | Count |", "|---|---|---|",
            *[f"| {a} | {b} | {c} |" for (a, b), c in sorted(conf.items(), key=lambda kv: -kv[1])[:15]],
        ]
        (RUNS / "report.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Exported {EXPORT / 'model.onnx'} + meta.json")


if __name__ == "__main__":
    main()
