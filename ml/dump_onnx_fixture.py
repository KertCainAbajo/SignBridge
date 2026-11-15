"""Writes logits from Python onnxruntime for a few clips (one per sign category), so the
browser runtime (onnxruntime-web) + TypeScript features can be checked against them."""

import json
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort

from signbridge_features import frame_features, resample, trim_to_activity

ROOT = Path(__file__).parent
model = ROOT.parent / "frontend" / "public" / "models" / "fsl105" / "model.onnx"
sess = ort.InferenceSession(str(model), providers=["CPUExecutionProvider"])
clips = ["0_3", "17_8", "30_12", "45_16", "74_6", "102_1"]  # sign id _ take
out = []
for key in clips:
    d = np.load(ROOT / "data" / "fsl105" / "landmarks" / f"{key}.npz")
    pose, hands, present = d["pose"], d["hands"], d["present"]
    feats = np.stack([frame_features(pose[i], hands[i], present[i]) for i in range(len(present))])
    logits = sess.run(None, {"landmarks": resample(feats[trim_to_activity(present)])[None]})[0][0]
    out.append({
        "clip": key,
        "true_id": int(key.split("_")[0]),
        "frames": [{"pose": None if np.isnan(pose[i]).any() else pose[i].tolist(),
                    "hands": [hands[i, h].tolist() if present[i, h] > 0 else None for h in range(2)],
                    "present": present[i].tolist()} for i in range(len(present))],
        "logits": logits.tolist(),
    })
Path(sys.argv[1]).write_text(json.dumps(out))
print(f"wrote {len(out)} clips")
