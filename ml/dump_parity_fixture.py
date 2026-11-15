"""Dumps raw landmarks + Python features for a few clips, so the browser's TypeScript
feature code can be checked against the training code (see frontend parity check)."""

import json
import sys
from pathlib import Path

import numpy as np

from signbridge_features import frame_features, resample, trim_to_activity

files = sorted((Path(__file__).parent / "data" / "fsl105" / "landmarks").glob("*.npz"))[:5]
out = []
for f in files:
    d = np.load(f)
    pose, hands, present = d["pose"], d["hands"], d["present"]
    frames = []
    for i in range(len(present)):
        frames.append({
            "pose": None if np.isnan(pose[i]).any() else pose[i].tolist(),
            "hands": [hands[i, h].tolist() if present[i, h] > 0 else None for h in range(2)],
        })
    feats = np.stack([frame_features(pose[i], hands[i], present[i]) for i in range(len(present))])
    trim = trim_to_activity(present)
    seq = feats[trim]
    out.append({"clip": f.stem, "frames": frames, "trimmed": [int(trim.start), int(trim.stop)],
                "features": feats.tolist(), "resampled": resample(seq).tolist()})
Path(sys.argv[1]).write_text(json.dumps(out))
print(f"wrote {len(out)} clips")
