"""
Shared landmark → feature transform for the FSL word model.

THIS MUST STAY IDENTICAL to frontend/src/features/recognition/wordFeatures.ts.
Any change here requires the same change there and a retrained model.

Raw per-frame landmarks (as produced by MediaPipe Tasks in VIDEO mode on the
un-mirrored camera image):
  pose  : (7, 3)      upper-body points [nose, L/R shoulder, L/R elbow, L/R wrist] (x, y, z), NaN if missing
  hands : (2, 21, 3)  hand slot 0 = hand nearest the body's left wrist, slot 1 = right; zeros if missing
  present: (2,)       1.0 if that hand was detected

Per-frame feature vector (FEATURES = 144):
  pose x,y relative to shoulder centre / shoulder width          7 × 2 = 14
  each hand x,y,z relative to shoulder centre / shoulder width   2 × 21 × 3 = 126
  hand presence flags                                            2
  wrist-relative spread of each hand (handshape scale cue)       2
"""

import numpy as np

POSE_IDX = [0, 11, 12, 13, 14, 15, 16]  # nose, shoulders, elbows, wrists (MediaPipe Pose indices)
T = 32  # frames per sequence fed to the model
FEATURES = 14 + 126 + 2 + 2


def body_frame(pose: np.ndarray):
    """Returns (centre_xy, scale) from the shoulders, with safe fallbacks."""
    ls, rs = pose[1, :2], pose[2, :2]
    if np.isnan(ls).any() or np.isnan(rs).any():
        return np.array([0.5, 0.5], dtype=np.float32), 0.3
    centre = (ls + rs) / 2
    scale = float(np.linalg.norm(ls - rs)) or 0.3
    return centre.astype(np.float32), max(scale, 0.05)


def frame_features(pose: np.ndarray, hands: np.ndarray, present: np.ndarray) -> np.ndarray:
    centre, scale = body_frame(pose)
    out = np.zeros(FEATURES, dtype=np.float32)

    p = (pose[:, :2] - centre) / scale
    out[0:14] = np.nan_to_num(p, nan=0.0).reshape(-1)

    for h in range(2):
        base = 14 + h * 63
        if present[h] > 0:
            xy = (hands[h, :, :2] - centre) / scale
            z = hands[h, :, 2:3] / scale
            out[base:base + 63] = np.concatenate([xy, z], axis=1).reshape(-1)
            spread = np.linalg.norm(hands[h, :, :2] - hands[h, 0, :2], axis=1).mean() / scale
            out[142 + h] = spread
        out[140 + h] = present[h]
    return out


def resample(seq: np.ndarray, length: int = T) -> np.ndarray:
    """Linearly resamples a (n, F) sequence to (length, F)."""
    n = len(seq)
    if n == 0:
        return np.zeros((length, seq.shape[1] if seq.ndim == 2 else FEATURES), dtype=np.float32)
    if n == 1:
        return np.repeat(seq, length, axis=0)
    pos = np.linspace(0, n - 1, length)
    lo = np.floor(pos).astype(int)
    hi = np.minimum(lo + 1, n - 1)
    w = (pos - lo)[:, None]
    return ((1 - w) * seq[lo] + w * seq[hi]).astype(np.float32)


def trim_to_activity(present: np.ndarray, pad: int = 2) -> slice:
    """Frames from the first to the last detected hand (+ padding). Matches the browser's segmenter."""
    active = np.where(present.max(axis=1) > 0)[0]
    if len(active) == 0:
        return slice(0, len(present))
    return slice(max(0, active[0] - pad), min(len(present), active[-1] + pad + 1))
