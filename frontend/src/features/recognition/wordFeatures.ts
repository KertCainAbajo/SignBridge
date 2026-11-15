/**
 * Landmark → feature transform for the FSL word model.
 *
 * THIS MUST STAY IDENTICAL to ml/signbridge_features.py (the model was trained on it).
 * Layout per frame (144 values):
 *   [0..13]    pose x,y (nose, L/R shoulder, L/R elbow, L/R wrist) relative to shoulder centre / width
 *   [14..139]  hand slot 0 then slot 1: 21 × (x, y, z) relative to shoulder centre / width
 *   [140..141] hand presence flags
 *   [142..143] mean fingertip-to-wrist spread per hand
 */
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export const POSE_IDX = [0, 11, 12, 13, 14, 15, 16]
export const FEATURES = 144

export interface RawFrame {
  /** 7 × [x, y, z] or null when no body detected. */
  pose: number[][] | null
  /** Slot 0 = hand nearest the body's left wrist, slot 1 = right. */
  hands: [NormalizedLandmark[] | null, NormalizedLandmark[] | null]
}

const dist2 = (a: { x: number; y: number }, b: number[]) => Math.hypot(a.x - b[0], a.y - b[1])

/** Mirrors ml/extract_landmarks.py:assign_slots. */
export function assignSlots(hands: NormalizedLandmark[][], pose: number[][] | null): RawFrame['hands'] {
  const slots: RawFrame['hands'] = [null, null]
  if (!hands.length) return slots
  if (!pose) {
    const sorted = [...hands].sort((a, b) => b[0].x - a[0].x)
    slots[0] = sorted[0] ?? null
    slots[1] = sorted[1] ?? null
    return slots
  }
  const lw = pose[5]
  const rw = pose[6]
  if (hands.length === 1) {
    const h = hands[0]
    slots[dist2(h[0], lw) <= dist2(h[0], rw) ? 0 : 1] = h
    return slots
  }
  const [a, b] = hands
  const ab = dist2(a[0], lw) + dist2(b[0], rw)
  const ba = dist2(b[0], lw) + dist2(a[0], rw)
  return ab <= ba ? [a, b] : [b, a]
}

export function frameFeatures(frame: RawFrame): Float32Array {
  const out = new Float32Array(FEATURES)
  let cx = 0.5
  let cy = 0.5
  let scale = 0.3
  const pose = frame.pose
  if (pose) {
    const [ls, rs] = [pose[1], pose[2]]
    cx = (ls[0] + rs[0]) / 2
    cy = (ls[1] + rs[1]) / 2
    scale = Math.max(Math.hypot(ls[0] - rs[0], ls[1] - rs[1]) || 0.3, 0.05)
    for (let i = 0; i < 7; i++) {
      out[i * 2] = (pose[i][0] - cx) / scale
      out[i * 2 + 1] = (pose[i][1] - cy) / scale
    }
  }

  for (let h = 0; h < 2; h++) {
    const hand = frame.hands[h]
    if (!hand) continue
    const base = 14 + h * 63
    let spread = 0
    for (let i = 0; i < 21; i++) {
      const p = hand[i]
      out[base + i * 3] = (p.x - cx) / scale
      out[base + i * 3 + 1] = (p.y - cy) / scale
      out[base + i * 3 + 2] = p.z / scale
      spread += Math.hypot(p.x - hand[0].x, p.y - hand[0].y)
    }
    out[140 + h] = 1
    out[142 + h] = spread / 21 / scale
  }
  return out
}

/** Linear resampling of a (n × F) sequence to `length` frames. Mirrors signbridge_features.resample. */
export function resample(seq: Float32Array[], length: number): Float32Array {
  const out = new Float32Array(length * FEATURES)
  const n = seq.length
  if (!n) return out
  for (let t = 0; t < length; t++) {
    const pos = n === 1 ? 0 : (t * (n - 1)) / (length - 1)
    const lo = Math.floor(pos)
    const hi = Math.min(lo + 1, n - 1)
    const w = pos - lo
    for (let f = 0; f < FEATURES; f++) out[t * FEATURES + f] = (1 - w) * seq[lo][f] + w * seq[hi][f]
  }
  return out
}
