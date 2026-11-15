/**
 * Splits continuous camera input into individual signs, the same way FSL-105 clips
 * are recorded: hands come up, the sign is made, hands go back down.
 *
 * A segment starts when a hand is visible for a few frames and ends when no hand has
 * been visible for `endAfterMs`. It is trimmed to first…last visible hand (+2 frames),
 * matching ml/signbridge_features.trim_to_activity.
 */
export type SegmenterState = 'idle' | 'signing'

export class SignSegmenter {
  private frames: { features: Float32Array; hand: boolean }[] = []
  private state: SegmenterState = 'idle'
  private startStreak = 0
  private lastHandAt = 0
  private startedAt = 0
  private readonly startFrames: number
  private readonly endAfterMs: number
  private readonly maxMs: number
  private readonly minHandFrames: number

  constructor({ startFrames = 3, endAfterMs = 500, maxMs = 5000, minHandFrames = 6 } = {}) {
    this.startFrames = startFrames
    this.endAfterMs = endAfterMs
    this.maxMs = maxMs
    this.minHandFrames = minHandFrames
  }

  get current(): SegmenterState {
    return this.state
  }

  reset() {
    this.frames = []
    this.state = 'idle'
    this.startStreak = 0
  }

  /** Feed one frame; returns a finished sign's frames when one ends. */
  push(features: Float32Array, hand: boolean, now: number): Float32Array[] | null {
    if (this.state === 'idle') {
      this.startStreak = hand ? this.startStreak + 1 : 0
      // Keep a little lead-in so the start of the movement isn't lost.
      this.frames.push({ features, hand })
      if (this.frames.length > 4) this.frames.shift()
      if (this.startStreak >= this.startFrames) {
        this.state = 'signing'
        this.startedAt = now
        this.lastHandAt = now
      }
      return null
    }

    this.frames.push({ features, hand })
    if (hand) this.lastHandAt = now

    const ended = now - this.lastHandAt >= this.endAfterMs
    const tooLong = now - this.startedAt >= this.maxMs
    if (!ended && !tooLong) return null

    const frames = this.frames
    this.reset()
    const visible = frames.map((f, i) => (f.hand ? i : -1)).filter((i) => i >= 0)
    if (visible.length < this.minHandFrames) return null
    const from = Math.max(0, visible[0] - 2)
    const to = Math.min(frames.length, visible[visible.length - 1] + 3)
    return frames.slice(from, to).map((f) => f.features)
  }
}
