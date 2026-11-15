# SignBridge – Architecture & Implementation Plan

AI-assisted Filipino Sign Language (FSL) communication platform.
Status: **Phase 1 in progress**. The sign translator runs a real FSL model trained on FSL-105
(105 words, 4 signers; see `ml/README.md` and `ml/runs/report.md`). On signers it never saw: 67% top-1,
89% top-5; with the "Not recognized" threshold it answers 46% of signs at 90% precision.
The translator is public (no login) and translation history is done. The speech tools page is next.
The earlier "teach your own signs" k-NN prototype was removed at the user's request.
Earlier: **Phase 0 (Foundation) complete** — schema, Sanctum SPA auth, RBAC, preferences, design system,
app shell. Local dev runs on MySQL; code is kept PostgreSQL-compatible for Supabase.

---

## 1. Honest scope statement

SignBridge v1 recognizes a **limited, explicitly listed set of FSL signs** (starting with static
fingerspelling handshapes). It is **not** a full FSL translator and must never present itself as one.
The UI always shows which signs are supported and displays "Not recognized" rather than guessing.

---

## 2. System architecture

```
┌──────────────────────── Browser (React + TS) ────────────────────────┐
│ Camera ─► MediaPipe HandLandmarker ─► feature normalizer ─► model     │
│   (frames never leave the device)        (21×3 landmarks)   (ONNX/TF.js)
│                                                    │                  │
│                     stabilizer (window vote + threshold + hold time)  │
│                                                    ▼                  │
│   Translator UI ◄── Web Speech API (TTS / STT) ── text result         │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ JSON over HTTPS (Sanctum SPA cookie auth)
┌───────────────────────────────▼──────────────────────────────────────┐
│ Laravel 13 REST API: auth, RBAC, vocabulary, lessons, quizzes,         │
│ translation history (text only), preferences, analytics, file uploads │
└───────────────────────────────┬──────────────────────────────────────┘
                                ▼
                  PostgreSQL (Supabase) + Supabase Storage (S3 API)
```

**Deployment:** database + media on Supabase; Laravel API on a PHP host (Laravel Cloud / Railway /
Render / Fly.io); React build on a static host (Vercel / Netlify / Cloudflare Pages). Auth stays in
Laravel (Sanctum), not Supabase Auth, so roles/policies live in one place. Use Supabase's connection
pooler for the API host, and keep the Laravel API as the only writer (Supabase's auto REST API is unused,
so enable RLS with no policies on all tables to keep it closed).

| Concern | Decision | Why |
|---|---|---|
| Auth | Sanctum **SPA cookie** auth (same-site) | Web-only app; httpOnly cookies avoid token theft via XSS; CSRF protection built in |
| RBAC | `spatie/laravel-permission` | Mature, provides roles/permissions tables + policies/middleware |
| Frontend styling | Tailwind CSS + own component set (design tokens below) | Avoids generic dashboard templates |
| Data fetching | TanStack Query + axios | Caching, loading/error states |
| Landmarks | `@mediapipe/tasks-vision` HandLandmarker (WASM/GPU) | Runs locally, free |
| Model runtime | ONNX Runtime Web (or TF.js) | Train in Python, run in browser |
| Speech | Web Speech API (`speechSynthesis`, `SpeechRecognition`) with feature detection + typed fallback | No paid API |
| ML training | Python in `ml/` (MediaPipe, scikit-learn/PyTorch) | Reproducible pipeline, separate from app |

Repo layout: `backend/` (Laravel), `frontend/` (React), `ml/` (dataset scripts, training, exported model), `docs/`.

---

## 3. Database design (PostgreSQL on Supabase)

Roles/permissions come from spatie: `roles`, `permissions`, `model_has_roles`,
`model_has_permissions`, `role_has_permissions`. Roles: `user`, `admin`, `super_admin`.

| Table | Purpose | Key columns / constraints |
|---|---|---|
| `users` | Accounts | name, email (unique), password (hashed), `is_active`, `last_active_at` (index) — for "active users" stats |
| `user_preferences` | Accessibility settings (1:1 with users) | user_id (unique FK), theme, font_scale, high_contrast, reduced_motion, tts_voice, tts_rate, stt_language, save_history (bool) |
| `vocabulary_categories` | Groups signs (Alphabet, Greetings, Family…) | name, slug (unique), description, sort_order, is_published |
| `sign_vocabulary` | Each FSL sign: learning content **and** what the model can recognize | category_id FK, word, slug (unique), description, level (beginner/intermediate/advanced), media_type, media_path, is_published, `is_recognizable` (bool), `model_label` (nullable, unique) — links a model class to the vocabulary entry |
| `learning_lessons` | Ordered lessons | category_id FK, title, slug, level, content (sanitized), sort_order, is_published |
| `lesson_sign` | Pivot: which signs a lesson teaches | lesson_id, sign_id (composite PK) |
| `lesson_progress` | Per-user lesson completion | user_id, lesson_id (unique pair), status, completed_at |
| `quizzes` | Quiz definitions | category_id (nullable), title, level, is_published |
| `quiz_questions` | Questions | quiz_id FK, type (text_choice / image_choice / sign_identify), prompt, sign_id (nullable FK for media), sort_order |
| `quiz_choices` | Answer options | question_id FK, label, sign_id (nullable), is_correct |
| `quiz_attempts` | One user sitting a quiz | user_id, quiz_id, score, total, started_at, completed_at; index (user_id, quiz_id) |
| `quiz_answers` | Answers within an attempt | attempt_id FK, question_id FK, choice_id FK, is_correct; unique (attempt_id, question_id) |
| `translation_histories` | Saved translations — **text only, never video** | user_id, source (sign/speech/text), text, avg_confidence (nullable), model_version, created_at; index (user_id, created_at) |
| `favorite_signs` | User favorites | user_id, sign_id, unique pair |

Not included (no need yet): separate "supported signs" table (covered by `is_recognizable` + `model_label`),
recordings table (we don't store footage). Analytics are computed from the tables above.
All FKs use `cascadeOnDelete` for user-owned rows and `restrictOnDelete` for content referenced by quizzes.

---

## 4. AI recognition plan

### 4.1 What MediaPipe does and doesn't do
MediaPipe gives 21 3D hand landmarks per hand. It does **not** recognize signs. We train our own
classifier on top of the landmarks.

### 4.2 Datasets (licenses must be re-verified on the source page before use)

| Dataset | Content | License / access | Use |
|---|---|---|---|
| [In-The-Wild FSL Alphabet](https://campol-russel.github.io/In-the-wild-FSL) | 8,100 images, 27 alphabet classes, 100 participants | **Access by request**, reviewed by maintainers | Phase 1 static alphabet |
| [FSL-105](https://data.mendeley.com/datasets/48y2y99mb9) (Tupal) | ~2,130 short videos, 105 word-level signs (~20 per sign) | CC BY 4.0 (per listing; attribution required) | Phase 2 dynamic signs (small subset) |
| Roboflow Universe FSL projects | Per-letter image sets of varying quality | Varies per project | Supplementary only, after license check |

### 4.3 Phases
1. **Static fingerspelling (MVP).** Classes = static FSL alphabet letters. Letters that require motion
   are excluded until Phase 2 and are listed in the UI as "not yet supported".
   - Pipeline: image → MediaPipe → 21×(x,y,z) → translate to wrist origin, scale by palm size,
     mirror left hands → 63-dim vector.
   - Model: small MLP (baseline: logistic regression / random forest for comparison).
   - **Split by participant** (train/val/test signers are disjoint) to avoid data leakage.
   - Metrics: per-class precision/recall, confusion matrix, macro-F1 on held-out signers.
   - Calibration: temperature scaling on the validation set; reject below threshold → "Not recognized".
2. **Dynamic word signs.** Choose 10–20 FSL-105 signs with enough samples; sequence model (GRU/1D-CNN)
   over 30-frame landmark windows (hands + pose). Augment with mirroring, time-warp, noise.
3. **Community dataset.** Consented collection with Deaf FSL users and interpreters: written consent
   form, landmark-only storage by default, signer diversity (handedness, skin tone, lighting), interpreter
   validation of labels. Enables two-hand signs, facial expressions, continuous signing.

### 4.4 Browser runtime
- HandLandmarker in a requestAnimationFrame loop (~15–30 fps), model inference on landmark vectors only.
- Stabilizer: sliding window (e.g. 15 frames) majority vote + calibrated threshold + minimum hold time,
  plus a cooldown before the same letter is appended again.
- Model ships as a static file with a `model_version`; label map is synced with `sign_vocabulary.model_label`.

---

## 5. UI/UX tokens

Primary `#243B6B` · Secondary `#5276B8` · Accent `#6C8EF5` · Background `#F7F9FC` · Surface `#FFFFFF`
· Text `#202534` · Muted `#687086` · Success `#16A36A` · Warning `#F59E0B` · Error `#DC2626`.
Dark-mode equivalents defined as CSS variables. Translator is the hero screen. WCAG 2.2 AA contrast,
visible focus rings, 44px min targets, `prefers-reduced-motion` respected.

---

## 6. Security checklist
Sanctum SPA auth + CSRF · bcrypt/argon hashing · FormRequest validation on every write · Policies +
role middleware on admin routes · rate limiting (login, register, write endpoints) · CORS limited to
`FRONTEND_URL` with credentials · Eloquent/query bindings only (no raw interpolation) · rich text
sanitized server-side · upload validation (mime, size, stored outside web root via Storage) · generic
error responses in production · `.env` never committed · camera processed locally; nothing uploaded.

---

## 7. Roadmap

| Phase | Deliverable |
|---|---|
| 0 Foundation | PostgreSQL, Sanctum SPA auth, RBAC, seeders, React app shell, design system, light/dark |
| 1 Communication | Translator page (camera + landmarks + stabilizer, no model yet → shows "model not loaded"), TTS, STT |
| 2 Content | Vocabulary + categories + lessons (admin CRUD + learner views), favorites, progress |
| 3 Quizzes | Quiz builder (admin), quiz taking, history |
| 4 Dashboards | User dashboard, admin analytics |
| 5 AI | `ml/` pipeline, training, evaluation report, model export + integration |
| 6 Hardening | Feature/E2E tests, accessibility audit, deployment |

Dataset access requests (Phase 5) should be sent **now**, since review takes time.
