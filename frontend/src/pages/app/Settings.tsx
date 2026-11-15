import { Monitor, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { Alert } from '../../components/ui/Alert'
import { Switch } from '../../components/ui/Switch'
import { PageHeader } from '../../layouts/AppShell'
import { errorMessage } from '../../lib/api'
import { cn } from '../../lib/cn'
import type { Preferences, Theme } from '../../lib/types'

const themes: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
]
const scales: Preferences['font_scale'][] = [100, 112, 125, 150]
const languages: { value: Preferences['stt_language']; label: string }[] = [
  { value: 'fil-PH', label: 'Filipino' },
  { value: 'en-PH', label: 'English (Philippines)' },
  { value: 'en-US', label: 'English (US)' },
]

function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const load = () =>
      setVoices(window.speechSynthesis.getVoices().filter((v) => /^(fil|tl|en)/i.test(v.lang)))
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])
  return voices
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-border py-8 first:pt-0 last:border-0 md:grid-cols-[16rem_1fr] md:gap-10">
      <div>
        <h2 className="font-bold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div>{children}</div>
    </section>
  )
}

function Segmented<T extends string | number>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string
  value: T
  options: { value: T; label: string; Icon?: typeof Sun }[]
  onChange: (v: T) => void
}) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-border bg-surface-2 p-1">
        {options.map((o) => (
          <label
            key={String(o.value)}
            className={cn(
              'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 font-medium',
              'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus',
              value === o.value ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-text',
            )}
          >
            <input type="radio" className="sr-only" name={legend} checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.Icon && <o.Icon className="size-4" aria-hidden />}
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default function Settings() {
  const { user, updatePreferences } = useAuth()
  const voices = useVoices()
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [rate, setRate] = useState(user?.preferences.tts_rate ?? 1)
  const prefs = user!.preferences

  const save = async (patch: Partial<Preferences>) => {
    setStatus(null)
    try {
      await updatePreferences(patch)
      setStatus({ tone: 'success', text: 'Settings saved.' })
    } catch (error) {
      setStatus({ tone: 'error', text: errorMessage(error) })
    }
  }

  return (
    <>
      <PageHeader title="Settings" description="Accessibility and speech preferences. Saved to your account, so they follow you across devices." />

      <div aria-live="polite" className="mb-6 empty:hidden">
        {status && <Alert tone={status.tone}>{status.text}</Alert>}
      </div>

      <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <Section title="Appearance">
          <div className="flex flex-col gap-6">
            <Segmented legend="Theme" value={prefs.theme} options={themes} onChange={(theme) => save({ theme })} />
            <div>
              <p className="mb-2 font-semibold" id="scale-label">
                Text size
              </p>
              <Segmented
                legend="Text size"
                value={prefs.font_scale}
                options={scales.map((s) => ({ value: s, label: `${s}%` }))}
                onChange={(font_scale) => save({ font_scale })}
              />
            </div>
          </div>
        </Section>

        <Section title="Accessibility">
          <Switch
            label="High contrast"
            description="Stronger borders and darker secondary text."
            checked={prefs.high_contrast}
            onChange={(high_contrast) => save({ high_contrast })}
          />
          <Switch
            label="Reduce motion"
            description="Turns off animations and transitions."
            checked={prefs.reduced_motion}
            onChange={(reduced_motion) => save({ reduced_motion })}
          />
        </Section>

        <Section title="Speech" description="Used by text-to-speech and speech-to-text.">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="voice" className="font-semibold">
                Voice
              </label>
              {voices.length ? (
                <select
                  id="voice"
                  className="min-h-11 rounded-xl border border-border bg-surface px-3"
                  value={prefs.tts_voice ?? ''}
                  onChange={(e) => save({ tts_voice: e.target.value || null })}
                >
                  <option value="">Browser default</option>
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-muted">No Filipino or English voices are available in this browser.</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rate" className="font-semibold">
                Speaking speed: {rate.toFixed(2)}×
              </label>
              <input
                id="rate"
                type="range"
                min={0.5}
                max={2}
                step={0.25}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                onPointerUp={() => rate !== prefs.tts_rate && save({ tts_rate: rate })}
                onKeyUp={() => rate !== prefs.tts_rate && save({ tts_rate: rate })}
                className="w-full max-w-sm accent-[var(--sb-primary)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="stt" className="font-semibold">
                Speech recognition language
              </label>
              <select
                id="stt"
                className="min-h-11 max-w-sm rounded-xl border border-border bg-surface px-3"
                value={prefs.stt_language}
                onChange={(e) => save({ stt_language: e.target.value as Preferences['stt_language'] })}
              >
                {languages.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Section>

        <Section title="Privacy">
          <Switch
            label="Save translation history"
            description="Keeps the text of translations you save. Camera video is never stored."
            checked={prefs.save_history}
            onChange={(save_history) => save({ save_history })}
          />
        </Section>
      </div>
    </>
  )
}
