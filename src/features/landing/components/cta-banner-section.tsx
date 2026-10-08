import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getPostAuthenticationPath, useAuth } from '../../auth'
import { Button } from '../../../components/ui/button'

export function CtaBannerSection() {
  const auth = useAuth()
  const isSignedIn = auth.status === 'authenticated' && Boolean(auth.user)
  const getStartedPath = isSignedIn ? getPostAuthenticationPath(auth) : '/signup'
  const getStartedLabel = isSignedIn ? 'Go to Dashboard' : 'Get Started with Festivo'

  return (
    <section
      aria-labelledby="cta-banner-heading"
      className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-gradient-to-b from-[var(--color-surface)] to-page px-6 py-14 sm:px-12 lg:py-16 text-center"
    >
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(var(--color-accent)_1px,transparent_1px)] [background-size:20px_20px]" />

      <div className="relative mx-auto max-w-2xl">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Campus Club Network</span>
        </div>

        <h2
          id="cta-banner-heading"
          className="font-heading mt-4 text-3xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-4xl lg:text-5xl"
        >
          Ready to experience your next campus event?
        </h2>

        <p className="mt-4 text-sm leading-[1.6] text-[var(--color-text-body)] sm:text-base">
          Join clubs, participate in competitions, collaborate with teammates, and manage your campus journey with Festivo.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Link to="/clubs" id="banner-explore-clubs-btn">
            <Button size="lg" className="px-6 py-3.5 text-sm sm:text-base font-semibold">
              Explore Clubs
              <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden="true" />
            </Button>
          </Link>

          <Link to={getStartedPath} id="banner-get-started-btn">
            <Button variant="secondary" size="lg" className="px-6 py-3.5 text-sm sm:text-base">
              {getStartedLabel}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
