import { Clock, MapPin, Tag, Users } from 'lucide-react'
import type { PublishedEvent } from '../landing-types'
import { formatEventSchedule, formatVenue } from '../landing-utils'
import { ThemedCardImage } from '../../../components/ui/themed-card-image'

interface EventCardProps {
  event: PublishedEvent
  onSelect?: (event: PublishedEvent) => void
}

export function EventCard({ event, onSelect }: EventCardProps) {
  const scheduleStr = formatEventSchedule(event)
  const venueStr = formatVenue(event.venue)

  const isOlympiadOrQuiz = event.category === 'Olympiad and Quiz'
  const displayCategory = isOlympiadOrQuiz && event.subcategory
    ? `Olympiad and Quiz • ${event.subcategory}`
    : event.category || 'General'

  const formatStr = event.registration_mode === 'team'
    ? `Team (${event.team_min_size || 1}–${event.team_max_size || 4} members)`
    : event.registration_mode === 'individual'
      ? 'Individual participation'
      : 'Format to be announced'

  return (
    <article
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.(event)
        }
      }}
      onClick={() => onSelect?.(event)}
      className="festivo-card group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-lg cursor-pointer focus-visible:outline-none"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--color-surface-raised)]">
        <ThemedCardImage
          src={event.cover_image_url}
          alt={event.title}
          category={event.category}
          aspectRatioClassName="aspect-[16/10]"
        />

        {/* Category & Subcategory Badge */}
        <div className="absolute top-3 left-3 max-w-[75%]">
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface)]/90 px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-accent)] backdrop-blur-md truncate">
            <Tag className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{displayCategory}</span>
          </span>
        </div>

        {/* Fest Name Pill */}
        {event.fests?.title && (
          <div className="absolute bottom-2.5 left-3 right-3">
            <p className="truncate text-xs font-medium text-[var(--color-text-primary)]">
              {event.fests.title}
            </p>
          </div>
        )}
      </div>

      {/* Details Container */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="font-heading text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors line-clamp-1">
          {event.title}
        </h3>

        <p className="mt-1.5 text-xs leading-[1.6] text-[var(--color-text-body)] line-clamp-2 flex-1">
          {event.description || 'Competition organized under campus club activities.'}
        </p>

        {/* Meta Info */}
        <div className="mt-4 space-y-1.5 border-t border-[var(--color-border-subtle)] pt-3 text-xs text-[var(--color-text-muted)]">
          <div className="flex items-center gap-2 text-amber-300">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{scheduleStr}</span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-sky-400 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{venueStr}</span>
          </div>

          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
            <Users className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
            <span className="truncate">{formatStr}</span>
          </div>
        </div>

        {/* CTA Bar */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-[var(--color-border-subtle)]">
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {event.capacity ? `Capacity: ${event.capacity}` : 'Open event'}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSelect?.(event)
            }}
            className="inline-flex items-center justify-center rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-surface-hover hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            aria-label={`View details for ${event.title}`}
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  )
}

export function EventCardSkeleton() {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] animate-pulse"
      aria-hidden="true"
    >
      <div className="aspect-[16/10] w-full bg-[var(--color-surface-raised)]" />
      <div className="p-4 sm:p-5 space-y-3 flex-1">
        <div className="h-4 w-3/4 bg-[var(--color-surface-raised)] rounded" />
        <div className="h-3 w-full bg-[var(--color-surface-raised)] rounded" />
        <div className="h-3 w-2/3 bg-[var(--color-surface-raised)] rounded" />
        <div className="pt-3 border-t border-[var(--color-border-subtle)] space-y-2">
          <div className="h-3 w-1/2 bg-[var(--color-surface-raised)] rounded" />
          <div className="h-3 w-2/5 bg-[var(--color-surface-raised)] rounded" />
        </div>
        <div className="pt-2 flex justify-between items-center">
          <div className="h-3 w-14 bg-[var(--color-surface-raised)] rounded" />
          <div className="h-7 w-24 bg-[var(--color-surface-raised)] rounded" />
        </div>
      </div>
    </div>
  )
}
