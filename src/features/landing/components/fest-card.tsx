import { Calendar, ChevronRight, Compass, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PublishedFest } from '../landing-types'
import { formatDateRange, getRegistrationStatus } from '../landing-utils'
import { ThemedCardImage } from '../../../components/ui/themed-card-image'

interface FestCardProps {
  fest: PublishedFest
}

export function FestCard({ fest }: FestCardProps) {
  const dateRange = formatDateRange(fest.starts_at, fest.ends_at)
  const regStatus = getRegistrationStatus(fest.registration_closes_at, fest.starts_at)

  return (
    <article className="festivo-card group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-xl">
      {/* Banner Image Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-[var(--color-surface-raised)]">
        <ThemedCardImage
          src={fest.banner_url}
          alt={fest.title}
          category={fest.category || 'Festival'}
          aspectRatioClassName="aspect-video"
        />

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface)]/90 px-2.5 py-0.5 text-xs font-medium text-[var(--color-accent)] backdrop-blur-md">
            {regStatus.label}
          </span>
        </div>

        {/* Organization Tag */}
        {fest.organizations?.name && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg bg-[var(--color-surface)]/90 px-2.5 py-1 text-xs font-medium text-[var(--color-text-primary)] backdrop-blur-md border border-[var(--color-border-subtle)]">
            <Compass className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden="true" />
            <span className="truncate max-w-[200px]">{fest.organizations.name}</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-1 flex-col p-5">
        {/* Date and Location Pills */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--color-text-muted)]">
          <div className="flex items-center gap-1.5 text-amber-300">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{dateRange}</span>
          </div>

          {fest.location_name && (
            <div className="flex items-center gap-1.5 truncate text-sky-400">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="truncate max-w-[180px]">{fest.location_name}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="font-heading mt-3 text-lg font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors line-clamp-1">
          {fest.title}
        </h3>

        {/* Description */}
        <p className="mt-2 text-sm leading-[1.6] text-[var(--color-text-body)] line-clamp-2 flex-1">
          {fest.description || 'Join this exciting campus fest for competitions, workshops, and exhibitions.'}
        </p>

        {/* Bottom CTA */}
        <div className="mt-5 pt-4 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">Published fest</span>
          <Link
            to={fest.organizations?.slug ? `/fests/${fest.organizations.slug}/${fest.slug}` : '/fests'}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-accent)] group-hover:underline transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
            aria-label={`View details for ${fest.title}`}
          >
            Explore Fest
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  )
}

export function FestCardSkeleton() {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] animate-pulse"
      aria-hidden="true"
    >
      <div className="aspect-video w-full bg-[var(--color-surface-raised)]" />
      <div className="p-5 space-y-3 flex-1">
        <div className="h-3.5 w-2/5 bg-[var(--color-surface-raised)] rounded" />
        <div className="h-5 w-4/5 bg-[var(--color-surface-raised)] rounded" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-full bg-[var(--color-surface-raised)] rounded" />
          <div className="h-3.5 w-3/4 bg-[var(--color-surface-raised)] rounded" />
        </div>
        <div className="pt-4 border-t border-[var(--color-border-subtle)] flex justify-between">
          <div className="h-3 w-16 bg-[var(--color-surface-raised)] rounded" />
          <div className="h-3 w-20 bg-[var(--color-surface-raised)] rounded" />
        </div>
      </div>
    </div>
  )
}
