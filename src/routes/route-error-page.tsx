import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { ErrorState } from '../components/states/page-states'

export function RouteErrorPage() {
  const error = useRouteError()
  const isMissingPage = isRouteErrorResponse(error) && error.status === 404
  const isModuleLoadFailure = error instanceof Error && /dynamically imported module|importing a module script|failed to fetch/i.test(error.message)

  if (import.meta.env.DEV) console.error('Festivo route error:', error)

  return (
    <main className="min-h-screen bg-[var(--color-page)] px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="mb-10 inline-flex min-h-11 items-center font-heading text-xl font-bold text-[var(--color-accent)] hover:opacity-80">
          Festivo
        </Link>
        <ErrorState
          title={isMissingPage ? 'Page not found' : isModuleLoadFailure ? 'This page did not load' : 'Something went wrong'}
          description={isMissingPage
            ? 'The page you requested does not exist or has moved.'
            : isModuleLoadFailure
              ? 'The app may have updated while this page was opening. Reload to get the latest version.'
              : 'We could not open this page. Please reload and try again.'}
          onRetry={() => window.location.reload()}
        />
      </div>
    </main>
  )
}
