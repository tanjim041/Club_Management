import { Link } from 'react-router-dom'

export interface ClubAchievement {
  id: string
  clubName: string
  title: string
  year: string
  description: string
  badgeLabel?: string
  imageUrl?: string
  clubSlug?: string
}

interface ClubAchievementsSectionProps {
  achievements?: ClubAchievement[]
  /** If true, show compact one-liner or omit when empty */
  isPublicHomepage?: boolean
}

export function ClubAchievementsSection({
  achievements = [],
  isPublicHomepage = true,
}: ClubAchievementsSectionProps) {
  // If on public homepage and no verified records exist, omit completely per requirements
  if (achievements.length === 0) {
    if (isPublicHomepage) {
      return null
    }
    return (
      <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">
        No organizational achievement records published for this club yet.
      </div>
    )
  }

  const [featured, ...supporting] = achievements

  return (
    <section aria-labelledby="achievements-heading" className="space-y-8">
      {/* Section Header */}
      <div className="border-b border-[var(--color-border-subtle)] pb-6">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          Honors & Milestones
        </span>
        <h2
          id="achievements-heading"
          className="font-heading mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-3xl lg:text-4xl"
        >
          Club Achievements
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-[1.6] text-[var(--color-text-body)]">
          Recognizing verified organizational milestones, chapter awards, and inter-institute honors.
        </p>
      </div>

      {/* Asymmetric Image / Story Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Featured Large Story Tile (7 cols) */}
        {featured && (
          <article className="overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] lg:col-span-7 flex flex-col justify-between magazine-card-hover">
            {featured.imageUrl && (
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-surface)]">
                <img
                  src={featured.imageUrl}
                  alt={featured.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {featured.clubName}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">{featured.year}</span>
              </div>
              <h3 className="font-heading mt-3 text-xl sm:text-2xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">
                {featured.title}
              </h3>
              <p className="mt-3 text-sm leading-[1.6] text-[var(--color-text-body)]">
                {featured.description}
              </p>
              {featured.clubSlug && (
                <div className="mt-6 pt-4 border-t border-[var(--color-border-subtle)]">
                  <Link
                    to={`/clubs/${featured.clubSlug}`}
                    className="editorial-link text-xs font-semibold text-[var(--color-accent)]"
                  >
                    View Club Profile →
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
                  <span className="text-xs font-semibold text-[var(--color-accent)]">{item.clubName}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{item.year}</span>
                </div>
                <h4 className="font-heading mt-2 text-base font-semibold text-[var(--color-text-primary)]">
                  {item.title}
                </h4>
                <p className="mt-1.5 text-xs leading-[1.6] text-[var(--color-text-body)] line-clamp-2">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
