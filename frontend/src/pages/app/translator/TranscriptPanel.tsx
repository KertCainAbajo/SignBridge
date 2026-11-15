import { Check, Copy, Delete, Eraser, Save, Space, Square, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthProvider'
import { DEFAULT_PREFERENCES } from '../../../lib/preferences'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { api, errorMessage } from '../../../lib/api'
import { speak, stopSpeaking, ttsSupported } from '../../../lib/speech'

interface Props {
  text: string
  avgConfidence: number | null
  modelVersion: string | null
  onSpace: () => void
  onBackspace: () => void
  onClear: () => void
  onSaved: () => void
}

export function TranscriptPanel({ text, avgConfidence, modelVersion, onSpace, onBackspace, onClear, onSaved }: Props) {
  const { user } = useAuth()
  const prefs = user?.preferences ?? DEFAULT_PREFERENCES
  const [speaking, setSpeaking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const empty = !text.trim()

  const onSpeak = () => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    if (speak(text, prefs, { onEnd: () => setSpeaking(false) })) setSpeaking(true)
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text.trim())
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setNotice({ tone: 'error', text: 'Copy failed. Select the text and copy it manually.' })
    }
  }

  const onSave = async () => {
    setSaving(true)
    setNotice(null)
    try {
      await api.post('/translations', {
        source: 'sign',
        text: text.trim(),
        avg_confidence: avgConfidence,
        model_version: modelVersion,
      })
      setNotice({ tone: 'success', text: 'Saved to your history.' })
      onSaved()
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="transcript-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="transcript-title" className="font-bold">
          Translation
        </h2>
        <Button variant="ghost" onClick={onClear} disabled={empty} icon={<Eraser className="size-4" aria-hidden />}>
          Clear
        </Button>
      </div>

      <output
        aria-live="polite"
        className="block min-h-28 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-2xl font-semibold tracking-wide break-words whitespace-pre-wrap"
      >
        {empty ? <span className="text-base font-normal tracking-normal text-muted">Recognized words will appear here.</span> : text}
        {!empty && <span className="ml-0.5 inline-block h-7 w-0.5 translate-y-1 animate-pulse bg-accent" aria-hidden />}
      </output>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button variant="secondary" onClick={onSpace} icon={<Space className="size-4" aria-hidden />}>
          Space
        </Button>
        <Button variant="secondary" onClick={onBackspace} disabled={empty} icon={<Delete className="size-4" aria-hidden />}>
          Undo word
        </Button>
        <Button variant="secondary" onClick={onCopy} disabled={empty} icon={copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button
          variant="secondary"
          onClick={onSpeak}
          disabled={empty || !ttsSupported}
          title={ttsSupported ? undefined : 'Text-to-speech is not supported in this browser'}
          icon={speaking ? <Square className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
        >
          {speaking ? 'Stop' : 'Speak'}
        </Button>
      </div>

      {user ? (
        <>
          <Button onClick={onSave} loading={saving} disabled={empty || !prefs.save_history} icon={<Save className="size-4" aria-hidden />}>
            Save to history
          </Button>
          {!prefs.save_history && <p className="text-sm text-muted">Saving is turned off in Settings → Privacy.</p>}
        </>
      ) : (
        <p className="text-sm text-muted">
          <Link to="/login" state={{ from: '/' }} className="font-semibold text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>{' '}
          to save translations to your history. Everything else works without an account.
        </p>
      )}
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
    </section>
  )
}
