# SignBridge ML: FSL word recognition

Trains the Filipino Sign Language (FSL) word model that the translator runs in the browser.

## Dataset

**FSL-105** by Isaiah Jassen Tupal (De La Salle University), licensed **CC BY 4.0**:
<https://doi.org/10.17632/48y2y99mb9.2>

- 105 everyday FSL signs in 10 categories (greetings, survival phrases, numbers 1–10, months,
  days, family, relationships, colors, food, drinks), 2,130 four-second clips, 4 signers.
- Clip numbers are grouped per signer in blocks of five (0–4, 5–9, 10–14, 15–19). We
  checked this by looking at frames from several clips.
- Attribution is shown in the app (translator → "What can it recognize?").

## Pipeline

```
clips (.MOV) ──► extract_landmarks.py ──► landmarks/*.npz ──► train.py ──► frontend/public/models/fsl105/
                 MediaPipe hands + pose        raw points           GRU model    model.onnx + meta.json
```

1. **Landmarks**: the same MediaPipe Tasks models the browser uses (`hand_landmarker.task`,
   `pose_landmarker_lite.task`), sampled at 15 fps. Video never leaves this step; only points are kept.
2. **Features** (`signbridge_features.py`, mirrored exactly in
   `frontend/src/features/recognition/wordFeatures.ts`): both hands and the upper body, relative to the
   shoulders, so position and distance from the camera don't matter. Each sign is trimmed to
   first…last visible hand, which is the same rule the browser uses to segment live signing.
3. **Model**: a small 1D-conv + bidirectional GRU, about 0.7M parameters, trained with augmentation
   (crop, rotation, scale, noise, left-handed mirroring).
4. **Honest evaluation**: leave-one-signer-out. The model is tested on a person it has never
   seen, 4 times. The dataset's own random split mixes the same signers into train and test, so it
   overstates real-world accuracy and is not used for reporting.
5. **Calibration**: temperature scaling plus a confidence threshold chosen on those unseen-signer
   predictions. Below the threshold the app shows "Not recognized" with its top 3 guesses instead
   of a wrong answer.

## Reproduce

```powershell
cd ml
py -3.11 -m venv .venv
.venv\Scripts\python -m pip install mediapipe opencv-python-headless numpy pandas scikit-learn onnx onnxruntime
.venv\Scripts\python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
# download FSL-105 into data/fsl105/ (clips/<id>/<n>.MOV + labels.csv, train.csv, test.csv)
.venv\Scripts\python extract_landmarks.py --workers 8
.venv\Scripts\python train.py
```

The results of the last run are in `runs/report.md`.

## Limits (be upfront with users)

- Recognizes only the 105 listed **isolated words**. No fingerspelling, no sentences, no grammar.
- Trained on 4 adult signers filmed against a plain background. Accuracy for other signers,
  lighting and backgrounds will be lower than the reported figure.
- Facial expressions (grammatically important in FSL) are not modeled yet.
- To grow coverage: consented recordings from more Deaf signers, checked by FSL interpreters.
  See `docs/ARCHITECTURE.md` §4.
