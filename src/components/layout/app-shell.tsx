import { Compass, Sparkles } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { getPostAuthenticationPath, useAuth } from '../../features/auth'
import { SiteHeader } from './site-header'

export function AppShell() {
  const auth = useAuth()
  const isSignedIn = auth.status === 'authenticated' && Boolean(auth.user)
  const dashboardPath = getPostAuthenticationPath(auth)
  const registrationPath = isSignedIn && auth.role === 'participant' ? '/my-registrations' : '/login?redirect=/my-registrations'
  const canAccessRegistrations = !isSignedIn || auth.role === 'participant'

  return (
    <div className="flex min-h-screen flex-col bg-page font-sans text-text-body">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-page focus:outline-none">
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main-content" className="w-full flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      {/* Footer */}
      <footer className="border-t border-[var(--color-border-subtle)] bg-[var(--color-page)] text-[var(--color-text-body)]">
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
  )
}
