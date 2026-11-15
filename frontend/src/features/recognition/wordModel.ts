import * as ort from 'onnxruntime-web/wasm'
import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import { FEATURES, resample } from './wordFeatures'

const BASE = '/models/fsl105'

// Vite emits the runtime as a hashed, self-hosted asset; point ONNX Runtime at it.
ort.env.wasm.wasmPaths = { wasm: ortWasmUrl }
ort.env.wasm.numThreads = 1 // multi-threading needs cross-origin isolation; one thread is plenty for this model

export interface ModelMeta {
  version: string
  frames: number
  features: number
  temperature: number
  threshold: number
  labels: { label: string; category: string }[]
  evaluation: {
    method: string
    unseen_signer_top1: number | null
    unseen_signer_top5: number | null
    coverage_at_threshold: number | null
    precision_at_threshold: number | null
  }
  dataset: { name: string; author: string; license: string; url: string }
}

export interface WordGuess {
  label: string
  category: string
  /** Calibrated probability (temperature-scaled on signers not seen in training). */
  probability: number
}

export interface WordResult {
  /** Accepted sign, or null when below the calibrated threshold ("Not recognized"). */
  accepted: WordGuess | null
  top: WordGuess[]
}

export class WordModel {
  readonly meta: ModelMeta
  private readonly session: ort.InferenceSession

  private constructor(meta: ModelMeta, session: ort.InferenceSession) {
    this.meta = meta
    this.session = session
  }

  static async load(): Promise<WordModel> {
    const res = await fetch(`${BASE}/meta.json`)
    if (!res.ok) throw new Error('The FSL model is not installed on this server.')
    const meta = (await res.json()) as ModelMeta
    if (meta.features !== FEATURES) throw new Error('Model and app feature formats do not match.')
    const session = await ort.InferenceSession.create(`${BASE}/model.onnx`, { executionProviders: ['wasm'] })
    return new WordModel(meta, session)
  }

  async classify(frames: Float32Array[]): Promise<WordResult> {
    const input = new ort.Tensor('float32', resample(frames, this.meta.frames), [1, this.meta.frames, FEATURES])
    const output = await this.session.run({ landmarks: input })
    const logits = output.logits.data as Float32Array

    const t = this.meta.temperature || 1
    let max = -Infinity
    for (const v of logits) max = Math.max(max, v / t)
    const exps = Array.from(logits, (v) => Math.exp(v / t - max))
    const sum = exps.reduce((a, b) => a + b, 0)

    const top = exps
      .map((e, i) => ({ ...this.meta.labels[i], probability: e / sum }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3)

    return { accepted: top[0].probability >= this.meta.threshold ? top[0] : null, top }
  }
}

let instance: Promise<WordModel> | null = null

export function getWordModel(): Promise<WordModel> {
  instance ??= WordModel.load().catch((error) => {
    instance = null
    throw error
  })
  return instance
}
