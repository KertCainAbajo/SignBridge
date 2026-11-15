// Copies the MediaPipe WASM runtime into public/ and downloads the MediaPipe models once,
// so the app self-hosts everything (no third-party requests at runtime).
// Runs automatically before `npm run dev` and `npm run build`.
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const wasmSrc = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const wasmDst = join(root, 'public', 'mediapipe', 'wasm')
const modelsDir = join(root, 'public', 'models')

const MODELS = {
  'hand_landmarker.task':
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  'pose_landmarker_lite.task':
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
}

mkdirSync(wasmDst, { recursive: true })
for (const file of readdirSync(wasmSrc)) {
  const src = join(wasmSrc, file)
  const dst = join(wasmDst, file)
  if (!existsSync(dst) || statSync(dst).size !== statSync(src).size) copyFileSync(src, dst)
}

mkdirSync(modelsDir, { recursive: true })
for (const [name, url] of Object.entries(MODELS)) {
  const dst = join(modelsDir, name)
  if (existsSync(dst) && statSync(dst).size > 1_000_000) continue
  console.log(`[mediapipe] downloading ${name} …`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download of ${name} failed: HTTP ${res.status}`)
  writeFileSync(dst, Buffer.from(await res.arrayBuffer()))
  console.log(`[mediapipe] saved ${name} (${(statSync(dst).size / 1e6).toFixed(1)} MB)`)
}
