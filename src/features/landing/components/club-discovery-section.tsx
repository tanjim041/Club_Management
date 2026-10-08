import { ArrowRight, Compass, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/button'
import { useClubsQuery } from '../landing-api'

export function ClubDiscoverySection() {
  const { data: clubs = [], isLoading, isError } = useClubsQuery()

  return (
    <section aria-labelledby="club-discovery-heading" className="space-y-8">
      {/* Editorial Heading Row */}
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Campus Organizations</span>
          </div>
          <h2
            id="club-discovery-heading"
            className="font-heading mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-3xl lg:text-4xl"
          >
            Find your community.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-[1.6] text-[var(--color-text-body)] sm:text-base">
            Explore student organizations, chapters, and societies powering campus life.
          </p>
        </div>

        <Link to="/clubs" className="shrink-0">
          <Button variant="secondary" size="default" className="w-full sm:w-auto">
            View All Clubs
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-72 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-rose-500/30 bg-[var(--color-surface)] p-6 text-center text-sm text-rose-300">
          Failed to load campus clubs. Please try refreshing.
        </div>
      ) : clubs.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] py-4">
          No student organizations registered yet. Check back soon.
        </p>
      ) : (
        <div
          className={`grid gap-6 sm:gap-8 ${
            clubs.length === 1
              ? 'grid-cols-1 max-w-md'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {clubs.slice(0, 6).map((club) => {
            const initials = club.name
              .split(' ')
              .map((n) => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')

            return (
              <article
                key={club.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] magazine-card-hover hover:border-[var(--color-accent)]/50"
              >
                <div>
                  {/* Image Banner Header */}
                  <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface)] to-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)]">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(var(--color-accent)_1px,transparent_1px)] [background-size:16px_16px]" />

                    {/* Category Tag */}
                    <div className="absolute top-3 right-3">
                      <span className="rounded-full bg-[var(--color-page)]/80 backdrop-blur-md border border-[var(--color-border-subtle)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                        Campus Chapter
                      </span>
                    </div>

                    {/* Logo Overlay */}
                    <div className="absolute bottom-3 left-4">
                      {club.logo_url ? (
                        <img
                          src={club.logo_url}
                          alt={`${club.name} logo`}
                          className="h-12 w-12 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-page)] object-cover shadow-lg"
                        />
                      ) : (
                        <div className="grid h-12 w-12 place-items-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-sm font-bold text-[var(--color-accent)] shadow-lg">
                          {initials}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Club Body */}
                  <div className="p-5">
                    <h3 className="font-heading text-lg font-bold tracking-[-0.03em] text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                      {club.name}
                    </h3>

                    <p className="mt-2 line-clamp-3 text-xs leading-[1.6] text-[var(--color-text-body)]">
                      {club.description || 'Dedicated to student activities and community collaboration.'}
                    </p>
                  </div>
                </div>

                {/* Footer Link */}
                <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] px-5 py-3.5 bg-[var(--color-page)]">
                  <Link
                    to={`/clubs/${club.slug}`}
                    className="editorial-link text-xs font-semibold text-[var(--color-accent)]"
                  >
                    View Club <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>

                  {club.website_url && (
                    <a
                      href={club.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                      title="Club external link"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
