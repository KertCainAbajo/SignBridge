"""
Step 1: run MediaPipe (the same Tasks models the browser uses) over every FSL-105
clip and save raw landmarks to data/fsl105/landmarks/<clip>.npz.

Usage:  .venv\\Scripts\\python extract_landmarks.py [--workers 6] [--fps 15]
"""

import argparse
import os
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).parent
DATA = ROOT / "data" / "fsl105"
CLIPS = DATA / "clips"
OUT = DATA / "landmarks"
HAND_MODEL = ROOT.parent / "frontend" / "public" / "models" / "hand_landmarker.task"
POSE_MODEL = ROOT.parent / "frontend" / "public" / "models" / "pose_landmarker_lite.task"

POSE_IDX = [0, 11, 12, 13, 14, 15, 16]



def clip_key(clip: Path) -> str:
    """clips/<sign id>/<n>.MOV → '<sign id>_<n>' (clip numbers repeat across sign folders)."""
    return f"{clip.parent.name}_{clip.stem}"


def _create():
    """Fresh detectors per clip: VIDEO-mode timestamps and tracking state restart with each clip."""
    from mediapipe.tasks.python import BaseOptions, vision

    hand = vision.HandLandmarker.create_from_options(
        vision.HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(HAND_MODEL)),
            running_mode=vision.RunningMode.VIDEO,
            num_hands=2,
            min_hand_detection_confidence=0.5,
            min_hand_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
    )
    pose = vision.PoseLandmarker.create_from_options(
        vision.PoseLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(POSE_MODEL)),
            running_mode=vision.RunningMode.VIDEO,
            num_poses=1,
        )
    )
    return hand, pose


def assign_slots(hand_lms, pose):
    """Slot 0 = hand nearest the body's left wrist (pose 15), slot 1 = right wrist (pose 16)."""
    hands = np.zeros((2, 21, 3), np.float32)
    present = np.zeros(2, np.float32)
    if not hand_lms:
        return hands, present
    arr = [np.array([[p.x, p.y, p.z] for p in h], np.float32) for h in hand_lms]
    lw, rw = pose[5, :2], pose[6, :2]
    if np.isnan(lw).any() or np.isnan(rw).any():
        # No pose: order by image x (larger x = signer's right side in an un-mirrored image is their left).
        arr.sort(key=lambda a: -a[0, 0])
        for i, a in enumerate(arr[:2]):
            hands[i], present[i] = a, 1
        return hands, present
    if len(arr) == 1:
        a = arr[0]
        slot = 0 if np.linalg.norm(a[0, :2] - lw) <= np.linalg.norm(a[0, :2] - rw) else 1
        hands[slot], present[slot] = a, 1
        return hands, present
    a, b = arr[:2]
    cost_ab = np.linalg.norm(a[0, :2] - lw) + np.linalg.norm(b[0, :2] - rw)
    cost_ba = np.linalg.norm(b[0, :2] - lw) + np.linalg.norm(a[0, :2] - rw)
    first, second = (a, b) if cost_ab <= cost_ba else (b, a)
    hands[0], hands[1], present[:] = first, second, 1
    return hands, present


def process(clip: Path, fps: float) -> tuple[str, int]:
    import mediapipe as mp

    hand_det, pose_det = _create()
    out = OUT / f"{clip_key(clip)}.npz"
    cap = cv2.VideoCapture(str(clip))
    src_fps = cap.get(cv2.CAP_PROP_FPS) or 30
    step = max(1, round(src_fps / fps))
    poses, hands_all, presents = [], [], []
    i = 0
    ts = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if i % step == 0:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            ts += int(1000 / fps)
            pr = pose_det.detect_for_video(image, ts)
            pose = np.full((7, 3), np.nan, np.float32)
            if pr.pose_landmarks:
                lm = pr.pose_landmarks[0]
                pose = np.array([[lm[k].x, lm[k].y, lm[k].z] for k in POSE_IDX], np.float32)
            hr = hand_det.detect_for_video(image, ts)
            hands, present = assign_slots(hr.hand_landmarks, pose)
            poses.append(pose)
            hands_all.append(hands)
            presents.append(present)
        i += 1
    cap.release()
    hand_det.close()
    pose_det.close()
    np.savez_compressed(out, pose=np.array(poses), hands=np.array(hands_all), present=np.array(presents))
    return clip.name, len(poses)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=max(1, (os.cpu_count() or 2) - 2))
    ap.add_argument("--fps", type=float, default=15)
    args = ap.parse_args()

    for m in (HAND_MODEL, POSE_MODEL):
        if not m.exists():
            sys.exit(f"Missing {m}. Run `npm run dev` or `node scripts/prepare-mediapipe.mjs` in frontend/ first.")

    OUT.mkdir(parents=True, exist_ok=True)
    clips = sorted(p for p in CLIPS.rglob("*") if p.suffix.lower() in {".mp4", ".mov", ".avi", ".mkv", ".webm"})
    todo = [c for c in clips if not (OUT / f"{clip_key(c)}.npz").exists()]
    print(f"{len(clips)} clips, {len(todo)} to process with {args.workers} workers")

    done = 0
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(process, c, args.fps) for c in todo]
        for f in as_completed(futures):
            name, n = f.result()
            done += 1
            if done % 50 == 0 or done == len(todo):
                print(f"  {done}/{len(todo)}  (last: {name}, {n} frames)", flush=True)


if __name__ == "__main__":
    main()
