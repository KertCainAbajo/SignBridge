import { ButtonLink } from '../components/ui/Button'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-semibold text-muted">404</p>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-muted">The page you’re looking for doesn’t exist or has moved.</p>
      <ButtonLink to="/" variant="secondary" className="mt-3">
        Back to home
      </ButtonLink>
    </div>
  )
}
