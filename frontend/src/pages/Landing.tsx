import { ArrowRight, BookOpen, Hand, Lock, Mic, Volume2 } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { ButtonLink } from '../components/ui/Button'

const modes = [
  { Icon: Hand, title: 'Sign → Text', body: 'Recognizes 105 everyday FSL words from your camera, right in your browser.' },
  { Icon: Volume2, title: 'Text → Speech', body: 'Reads typed or recognized text aloud in Filipino or English voices.' },
  { Icon: Mic, title: 'Speech → Text', body: 'Turns spoken words into readable captions, with typing as a fallback.' },
  { Icon: BookOpen, title: 'Learn FSL', body: 'Lessons, vocabulary and quizzes from beginner to advanced.' },
]

/** Decorative: a stylised hand drawn as MediaPipe-style landmarks. */
function LandmarkHand() {
  const pts: [number, number][] = [
    [100, 190], [70, 168], [52, 140], [40, 116], [30, 96],
    [78, 110], [72, 74], [68, 50], [65, 30],
    [100, 104], [100, 64], [100, 38], [100, 16],
    [122, 110], [128, 74], [132, 50], [135, 30],
    [140, 122], [152, 96], [160, 78], [166, 62],
  ]
  const chains = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [0, 17, 18, 19, 20], [5, 9, 13, 17]]
  return (
    <svg viewBox="0 0 200 210" className="h-full w-full" aria-hidden>
      {chains.map((c, i) => (
        <polyline
          key={i}
          points={c.map((p) => pts[p].join(',')).join(' ')}
          fill="none"
          className="stroke-secondary"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 0 ? 6 : 4.5} className="fill-accent" />
      ))}
    </svg>
  )
}

export default function Landing() {
  const { user } = useAuth()

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
        <div>
          <p className="mb-4 inline-flex rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-primary">
            Filipino Sign Language · Accessibility
          </p>
          <h1 className="text-4xl leading-[1.1] font-bold tracking-tight text-balance sm:text-5xl">
            A bridge between signed and spoken conversation.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            SignBridge helps Deaf, hard-of-hearing and hearing people understand each other. Use sign recognition,
            speech captions and text-to-speech in one place, and learn FSL along the way.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/" size="lg" icon={<Hand className="size-5" aria-hidden />}>
              Open translator
            </ButtonLink>
            <ButtonLink to={user ? '/app' : '/register'} variant="secondary" size="lg">
              {user ? 'Your dashboard' : 'Create free account'}
            </ButtonLink>
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-muted">
            <Lock className="size-4" aria-hidden />
            No account needed. Camera video stays on your device; nothing is recorded or uploaded.
          </p>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-sm rounded-[2rem] border border-border bg-surface p-10">
          <div className="absolute inset-6 rounded-[1.5rem] bg-surface-2" aria-hidden />
          <div className="relative h-full">
            <LandmarkHand />
          </div>
          <p className="absolute right-6 bottom-5 left-6 text-center text-sm text-muted">
            21 hand landmarks, tracked in your browser
          </p>
        </div>
      </section>

      <section aria-labelledby="modes-title" className="border-y border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
          <h2 id="modes-title" className="text-2xl font-bold tracking-tight">
            Four ways to communicate
          </h2>
          <ul className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {modes.map(({ Icon, title, body }) => (
              <li key={title}>
                <Icon className="size-7 text-secondary" aria-hidden />
                <h3 className="mt-3 font-bold">{title}</h3>
                <p className="mt-1 text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="honest-title" className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
        <div className="max-w-3xl">
          <h2 id="honest-title" className="text-2xl font-bold tracking-tight">
            What SignBridge can and can’t do yet
          </h2>
          <p className="mt-3 text-muted">
            Sign recognition currently covers 105 common FSL words (greetings, numbers, days, months, family,
            colors, food and more), one word at a time. It does not yet understand fingerspelling, sentences or
            facial grammar, and it is not a full FSL interpreter. When the system isn’t confident, it says{' '}
            <strong className="text-text">“Not recognized”</strong> instead of guessing. For important conversations,
            such as medical or legal ones, please use a qualified FSL interpreter.
          </p>
          <ButtonLink to={user ? '/app' : '/register'} variant="ghost" className="mt-4 -ml-4" icon={<ArrowRight className="size-5" aria-hidden />}>
            {user ? 'Go to your dashboard' : 'Create a free account'}
          </ButtonLink>
        </div>
      </section>
    </>
  )
}
