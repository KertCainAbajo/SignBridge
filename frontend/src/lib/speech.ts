import type { Preferences } from './types'

export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

function pickVoice(voiceName: string | null, lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  return (
    (voiceName ? voices.find((v) => v.name === voiceName) : undefined) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase())) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('en'))
  )
}

/** Speaks text with the user's preferred voice and rate. Returns false if unsupported. */
export function speak(
  text: string,
  prefs: Pick<Preferences, 'tts_voice' | 'tts_rate' | 'stt_language'>,
  handlers: { onEnd?: () => void } = {},
): boolean {
  if (!ttsSupported || !text.trim()) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickVoice(prefs.tts_voice, prefs.stt_language)
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  }
  utterance.rate = prefs.tts_rate
  utterance.onend = () => handlers.onEnd?.()
  utterance.onerror = () => handlers.onEnd?.()
  window.speechSynthesis.speak(utterance)
  return true
}

export function stopSpeaking() {
  if (ttsSupported) window.speechSynthesis.cancel()
}
