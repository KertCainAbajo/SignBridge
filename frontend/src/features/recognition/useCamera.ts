import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraStatus = 'off' | 'starting' | 'on' | 'error'

function describe(error: unknown): string {
  const name = (error as DOMException)?.name
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera permission was denied. Allow camera access in your browser’s address bar, then try again.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found. Connect a camera and try again.'
    case 'NotReadableError':
      return 'Your camera is being used by another app. Close it and try again.'
    default:
      return 'The camera could not be started. Please try again.'
  }
}

/** Starts/stops the user-facing camera. Video stays local; nothing is recorded. */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<CameraStatus>('off')
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus('off')
  }, [])

  const start = useCallback(async () => {
    setError(null)
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus('error')
      setError('Camera access needs a secure (https) connection and a modern browser.')
      return
    }
    setStatus('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }
      setStatus('on')
    } catch (e) {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setStatus('error')
      setError(describe(e))
    }
  }, [])

  // Always release the camera when leaving the page.
  useEffect(() => stop, [stop])

  return { videoRef, status, error, start, stop }
}
