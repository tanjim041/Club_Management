import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ThemedCardImage } from '../../../components/ui/themed-card-image'

export interface PastEventHighlight {
  id: string
  title: string
  date: string
  summary: string
  imageUrl?: string | null
  relatedEventLink?: string
  festName?: string
}

interface PastEventsSectionProps {
  highlights?: PastEventHighlight[]
  /** If true, omit section when no records exist */
  isPublicHomepage?: boolean
}

export function PastEventsSection({
  highlights = [],
  isPublicHomepage = true,
}: PastEventsSectionProps) {
  // If on public homepage and no past events exist, omit per requirement 6
  if (highlights.length === 0) {
    if (isPublicHomepage) {
      return null
    }
    return (
      <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">
        No previous event retrospectives archived for this club yet.
      </div>
    )
  }

  const [featured, ...supporting] = highlights

  return (
    <section aria-labelledby="past-events-heading" className="space-y-8">
      {/* Section Header */}
      <div className="border-b border-[var(--color-border-subtle)] pb-6">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          Retrospectives
        </span>
        <h2
          id="past-events-heading"
          className="font-heading mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-3xl lg:text-4xl"
        >
          Previous Event Highlights
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-[1.6] text-[var(--color-text-body)]">
          Explore photo showcases, winning project presentations, and retrospective summaries from past fests.
        </p>
      </div>

      {/* Asymmetric Image Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 card-grid-interactive">
        {/* Featured Story (7 cols) */}
        {featured && (
          <article className="overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] lg:col-span-7 flex flex-col justify-between festivo-card group shadow-xl">
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-surface)]">
              <ThemedCardImage
                src={featured.imageUrl}
                alt={featured.title}
                category="Exhibition"
                aspectRatioClassName="aspect-[16/9]"
              />
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {featured.festName || 'Event Archive'}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">{featured.date}</span>
              </div>
              <h3 className="font-heading mt-3 text-xl sm:text-2xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">
                {featured.title}
              </h3>
              <p className="mt-3 text-sm leading-[1.6] text-[var(--color-text-body)]">
                {featured.summary}
              </p>
              {featured.relatedEventLink && (
                <div className="mt-6 pt-4 border-t border-[var(--color-border-subtle)]">
                  <Link
                    to={featured.relatedEventLink}
                    className="editorial-link text-xs font-semibold text-[var(--color-accent)]"
                  >
                    View Archive Recap <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </div>
              )}
            </div>
          </article>
        )}

        {/* Supporting Stories Stack (5 cols) */}
        {supporting.length > 0 && (
          <div className="flex flex-col gap-6 lg:col-span-5">
            {supporting.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 magazine-card-hover"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--color-accent)]">
                    {item.festName || 'Retrospective'}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">{item.date}</span>
                </div>
                <h4 className="font-heading mt-2 text-base font-semibold text-[var(--color-text-primary)]">
                  {item.title}
                </h4>
                <p className="mt-1.5 text-xs leading-[1.6] text-[var(--color-text-body)] line-clamp-2">
                  {item.summary}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
