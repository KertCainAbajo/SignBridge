import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { HAND_CONNECTIONS, getTrackers, type Trackers } from './trackers'
import { POSE_IDX, assignSlots, type RawFrame } from './wordFeatures'

export type TrackerStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface TrackedFrame extends RawFrame {
  time: number
}

const MIN_FRAME_MS = 1000 / 24 // cap processing at ~24 fps to keep laptops cool
const ARM_LINES: [number, number][] = [[1, 2], [1, 3], [3, 5], [2, 4], [4, 6]] // indices into POSE_IDX

function cssVar(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function draw(canvas: HTMLCanvasElement, video: HTMLVideoElement, frame: RawFrame) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
  }
  const w = canvas.width
  const h = canvas.height
  const unit = Math.max(2, w / 260)
  ctx.clearRect(0, 0, w, h)
  ctx.lineCap = 'round'

  if (frame.pose) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = unit * 1.2
    for (const [a, b] of ARM_LINES) {
      ctx.beginPath()
      ctx.moveTo(frame.pose[a][0] * w, frame.pose[a][1] * h)
      ctx.lineTo(frame.pose[b][0] * w, frame.pose[b][1] * h)
      ctx.stroke()
    }
  }

  const line = cssVar('--sb-secondary', '#5276B8')
  const dot = cssVar('--sb-accent', '#6C8EF5')
  for (const hand of frame.hands) {
    if (!hand) continue
    ctx.strokeStyle = line
    ctx.lineWidth = unit
    for (const { start, end } of HAND_CONNECTIONS) {
      ctx.beginPath()
      ctx.moveTo(hand[start].x * w, hand[start].y * h)
      ctx.lineTo(hand[end].x * w, hand[end].y * h)
      ctx.stroke()
    }
    ctx.fillStyle = dot
    for (const p of hand) {
      ctx.beginPath()
      ctx.arc(p.x * w, p.y * h, unit * 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/**
 * Runs MediaPipe hand + pose tracking on the live video while `active`, draws the
 * overlay and reports each frame. Frames are processed in memory only.
 */
export function useSignTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  active: boolean,
  onFrame: (frame: TrackedFrame) => void,
) {
  const [status, setStatus] = useState<Exclude<TrackerStatus, 'idle'>>('loading')
  const onFrameRef = useRef(onFrame)
  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  useEffect(() => {
    if (!active) return
    let cancelled = false
    let raf = 0
    let trackers: Trackers | null = null
    let lastVideoTime = -1
    let lastProcessed = 0
    const canvas = canvasRef.current

    const loop = () => {
      const video = videoRef.current
      if (cancelled || !video || !canvas || !trackers) return
      const now = performance.now()
      if (video.readyState >= 2 && video.currentTime !== lastVideoTime && now - lastProcessed >= MIN_FRAME_MS) {
        lastVideoTime = video.currentTime
        lastProcessed = now
        const poseResult = trackers.pose.detectForVideo(video, now)
        const handResult = trackers.hands.detectForVideo(video, now)
        const lm = poseResult.landmarks[0]
        const pose = lm ? POSE_IDX.map((i) => [lm[i].x, lm[i].y, lm[i].z]) : null
        const frame: TrackedFrame = {
          pose,
          hands: assignSlots(handResult.landmarks as NormalizedLandmark[][], pose),
          time: now,
        }
        draw(canvas, video, frame)
        onFrameRef.current(frame)
      }
      raf = requestAnimationFrame(loop)
    }

    getTrackers()
      .then((t) => {
        if (cancelled) return
        trackers = t
        setStatus('ready')
        raf = requestAnimationFrame(loop)
      })
      .catch(() => !cancelled && setStatus('error'))

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
      setStatus('loading')
    }
  }, [active, videoRef, canvasRef])

  return active ? status : 'idle'
}
