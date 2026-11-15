import { BookOpen, Hand, History, ListChecks, MessageSquareText, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { ButtonLink } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/States'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Magandang umaga'
  if (h < 18) return 'Magandang hapon'
  return 'Magandang gabi'
}

const shortcuts = [
  { to: '/app/speech', label: 'Speech & text', body: 'Captions and read-aloud', Icon: MessageSquareText },
  { to: '/app/learn', label: 'Learn FSL', body: 'Lessons and vocabulary', Icon: BookOpen },
  { to: '/app/practice', label: 'Practice', body: 'Quizzes and challenges', Icon: ListChecks },
]

export default function Dashboard() {
  const { user } = useAuth()
  const firstName = user?.name.split(' ')[0]

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="text-muted">{greeting()},</p>
        <h1 className="text-3xl font-bold tracking-tight">{firstName}</h1>
      </header>

      {/* The translator is the hero of the product. */}
      <section
        aria-labelledby="translator-title"
        className="grid items-center gap-6 rounded-3xl bg-primary p-6 text-on-primary sm:p-10 md:grid-cols-[1fr_auto]"
      >
        <div>
          <Hand className="mb-4 size-9 opacity-90" aria-hidden />
          <h2 id="translator-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Sign translator
          </h2>
          <p className="mt-2 max-w-lg opacity-85">
            Sign in front of your camera and see supported FSL signs as text. Processing happens on this device.
          </p>
        </div>
        <ButtonLink
          to="/app/translate"
          size="lg"
          className="bg-surface text-primary hover:bg-surface-2 dark:bg-bg dark:text-primary"
        >
          Start translating
        </ButtonLink>
      </section>

      <section aria-label="Shortcuts">
        <ul className="grid gap-3 sm:grid-cols-3">
          {shortcuts.map(({ to, label, body, Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex min-h-20 items-center gap-4 rounded-2xl border border-border bg-surface px-5 py-4 transition-colors hover:border-accent"
              >
                <Icon className="size-6 shrink-0 text-secondary" aria-hidden />
                <span>
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-sm text-muted">{body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="recent-title">
          <h2 id="recent-title" className="mb-3 text-lg font-bold">
            Recent translations
          </h2>
          <EmptyState icon={<History className="size-7" />} title="No saved translations yet">
            Translations you save from the translator or speech tools will appear here.
          </EmptyState>
        </section>
        <section aria-labelledby="progress-title">
          <h2 id="progress-title" className="mb-3 text-lg font-bold">
            Learning progress
          </h2>
          <EmptyState
            icon={<Star className="size-7" />}
            title="You haven’t started a lesson"
            action={<ButtonLink to="/app/learn" variant="secondary">Browse lessons</ButtonLink>}
          >
            Your completed lessons and favorite signs will show up here.
          </EmptyState>
        </section>
      </div>
    </div>
  )
}
