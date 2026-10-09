import { Bot, Compass, Sparkles } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { getPostAuthenticationPath, useAuth } from '../../features/auth'
import { SiteHeader } from './site-header'

export function AppShell() {
  const auth = useAuth()
  const location = useLocation()
  const isSignedIn = auth.status === 'authenticated' && Boolean(auth.user)
  const dashboardPath = getPostAuthenticationPath(auth)
  const registrationPath = isSignedIn && auth.role === 'participant' ? '/my-registrations' : '/login?redirect=/my-registrations'
  const canAccessRegistrations = !isSignedIn || auth.role === 'participant'
  const isAssistantRoute = location.pathname.startsWith('/assistant') || location.pathname.startsWith('/ask')

  return (
    <div className="relative flex min-h-screen flex-col bg-page font-sans text-text-body overflow-x-clip">
      {/* Festivo Atmospheric Glass Background Layers */}
      <div className="festivo-atmosphere pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="festivo-atmosphere-facets absolute inset-0" />
        <div className="festivo-atmosphere-lighting absolute inset-0" />
        <div className="festivo-atmosphere-vignette absolute inset-0" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-page focus:outline-none">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main-content" className="w-full flex-1" tabIndex={-1}>
          <Outlet />
        </main>

        {/* Floating Ask Festivo dock button */}
        {!isAssistantRoute && (
          <Link
            to="/assistant"
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-border-subtle bg-surface-raised/90 px-4 py-2.5 text-xs font-semibold text-text-primary shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-accent hover:shadow-[0_0_20px_rgba(147,180,232,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Open Ask Festivo AI Assistant"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
            </span>
            <Bot className="h-4 w-4 text-accent" />
            <span className="font-heading tracking-tight">Ask Festivo</span>
          </Link>
        )}

        {/* Footer */}
        <footer className="border-t border-border-subtle/80 bg-page/85 backdrop-blur-md text-[var(--color-text-body)]">
        <div className="content-container py-12 lg:py-16">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
            {/* Column 1: Festivo Overview */}
            <div className="space-y-4">
              <Link
                to="/"
                className="flex items-center gap-2.5 font-bold tracking-tight text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-xl w-fit"
              >
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-[var(--color-accent)]">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="font-heading text-lg font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">Festivo</span>
              </Link>

              <p className="max-w-sm text-sm leading-[1.6] text-[var(--color-text-body)]">
                The modern campus club and event management platform. Discover student clubs, explore events, celebrate achievements, and manage participation in one place.
              </p>
            </div>

            {/* Column 2: Navigation Links */}
            <div>
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                Platform
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link
                    to="/clubs"
                    className="text-[var(--color-text-body)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] rounded"
                  >
                    Club Directory
                  </Link>
                </li>
                <li>
                  <Link
                    to="/events"
                    className="text-[var(--color-text-body)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] rounded"
                  >
                    Explore Events
                  </Link>
                </li>
                <li>
                  <a
                    href="/#how-it-works"
                    className="text-[var(--color-text-body)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] rounded"
                  >
                    How It Works
                  </a>
                </li>
                <li>
                  <Link
                    to="/fests"
                    className="text-[var(--color-text-body)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] rounded"
                  >
                    Campus Fests
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Account & Participation */}
            <div>
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                Participation
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link
                    to="/signup"
                    className="text-[var(--color-text-body)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] rounded"
                  >
                    Get Started
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="text-[var(--color-text-body)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] rounded"
                  >
                    Sign In
                  </Link>
                </li>
                {canAccessRegistrations && <li>
                  <Link
                    to={registrationPath}
                    className="text-[var(--color-text-body)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] rounded"
                  >
                    My Registrations
                  </Link>
                </li>}
                <li>
                  <Link
                    to={isSignedIn ? dashboardPath : '/login'}
                    className="text-[var(--color-text-body)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] rounded"
                  >
                    Dashboard Access
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Configured Platform Information */}
            <div className="space-y-3">
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                Campus Network
              </h3>
              <p className="text-xs leading-[1.6] text-[var(--color-text-body)]">
                Festivo connects students, clubs, and campus organizers. Club identities, fests, and activity schedules are maintained by registered campus leaders.
              </p>
              <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3 text-xs">
                <span className="font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                  Institute Club Hub
                </span>
                <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                  Authorized club organizers can access administrative tools via the organizer dashboard.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--color-border-subtle)] pt-8 sm:flex-row text-xs text-[var(--color-text-muted)]">
            <p>
              &copy; {new Date().getFullYear()} Festivo. Campus club and event management platform.
            </p>
            <div className="flex flex-wrap gap-6">
              <Link to="/privacy" className="hover:text-[var(--color-text-primary)] transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-[var(--color-text-primary)] transition-colors">
                Terms of Service
              </Link>
              <Link to="/code-of-conduct" className="hover:text-[var(--color-text-primary)] transition-colors">
                Code of Conduct
              </Link>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </div>
  )
}
