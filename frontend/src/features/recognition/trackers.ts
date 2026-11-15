import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision'

// Served from /public (see scripts/prepare-mediapipe.mjs), so no third-party requests.
// These are the same model files and settings used to extract the training data (ml/extract_landmarks.py).
const WASM_PATH = '/mediapipe/wasm'

let fileset: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null
const getFileset = () => (fileset ??= FilesetResolver.forVisionTasks(WASM_PATH))

async function withFallback<T>(create: (delegate: 'GPU' | 'CPU') => Promise<T>): Promise<T> {
  try {
    return await create('GPU')
  } catch {
    return create('CPU') // no WebGL2: slower but works everywhere
  }
}

export interface Trackers {
  hands: HandLandmarker
  pose: PoseLandmarker
}

let instance: Promise<Trackers> | null = null

async function create(): Promise<Trackers> {
  const fs = await getFileset()
  const [hands, pose] = await Promise.all([
    withFallback((delegate) =>
      HandLandmarker.createFromOptions(fs, {
        baseOptions: { modelAssetPath: '/models/hand_landmarker.task', delegate },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      }),
    ),
    withFallback((delegate) =>
      PoseLandmarker.createFromOptions(fs, {
        baseOptions: { modelAssetPath: '/models/pose_landmarker_lite.task', delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
      }),
    ),
  ])
  return { hands, pose }
}

/** Shared hand + pose trackers (loaded once). */
export function getTrackers(): Promise<Trackers> {
  instance ??= create().catch((error) => {
    instance = null // allow retry
    throw error
  })
  return instance
}

export const HAND_CONNECTIONS = HandLandmarker.HAND_CONNECTIONS
