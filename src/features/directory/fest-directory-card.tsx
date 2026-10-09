import { CalendarDays, ChevronRight, Compass, MapPin, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PublicFestDirectoryItem } from './directory-types'
import { ThemedCardImage } from '../../components/ui/themed-card-image'
import {
  directoryLabel,
  festAvailabilityText,
  formatDirectoryDateRange,
  formatExperienceLevels,
  getAvailabilityTone,
  getFestAvailabilityLabel,
} from './directory-utils'

export function FestDirectoryCard({ fest }: { fest: PublicFestDirectoryItem }) {
  const availability = getFestAvailabilityLabel(fest.availability)
  const statusTone = getAvailabilityTone(availability === 'program_soon' ? 'scheduled' : availability)

  return (
    <article className="festivo-card group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-lg">
      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--color-surface-raised)]">
        <ThemedCardImage
          src={fest.bannerUrl}
          alt={`${fest.title} banner`}
          category={fest.category || 'Festival'}
          aspectRatioClassName="aspect-[16/9]"
        />
        <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md ${statusTone}`}>
            {festAvailabilityText(fest.availability)}
          </span>
          <span className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface)]/90 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-primary)] backdrop-blur-md">
            {directoryLabel(fest.deliveryFormat)}
          </span>
        </div>
        <Link
          to={`/clubs/${fest.club.slug}`}
          className="absolute bottom-3 left-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)]/90 px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-primary)] backdrop-blur-md transition-colors hover:text-[var(--color-accent)]"
        >
          <Compass className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
          <span className="truncate">{fest.club.name}</span>
        </Link>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]">
          <span className="inline-flex items-center gap-1.5 text-amber-300">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {formatDirectoryDateRange(fest.startsAt, fest.endsAt, fest.timezone)}
          </span>
          {fest.locationName && (
            <span className="inline-flex max-w-full items-center gap-1.5 text-sky-300">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{fest.locationName}</span>
            </span>
          )}
        </div>

        <h2 className="font-heading mt-3 text-lg font-bold tracking-[-0.03em] text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-accent)]">
          {fest.title}
        </h2>
        <p className="mt-2 line-clamp-3 text-sm leading-[1.6] text-[var(--color-text-body)]">
          {fest.description || 'A student-led fest with events, workshops, and campus showcases.'}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--color-border-subtle)] pt-4 text-[11px] text-[var(--color-text-body)]">
          {fest.category && <span className="rounded-lg bg-[var(--color-surface-raised)] px-2.5 py-1">{fest.category}</span>}
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-raised)] px-2.5 py-1">
            <UsersRound className="h-3 w-3 text-[var(--color-accent)]" aria-hidden="true" />
            {formatExperienceLevels(fest.experienceLevels)}
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-4">
          <span className="text-xs text-[var(--color-text-muted)]">
            {fest.availability.eventCount} {fest.availability.eventCount === 1 ? 'event' : 'events'}
            {fest.availability.openEventCount > 0 ? ` · ${fest.availability.openEventCount} open` : ''}
          </span>
          <Link
            to={`/fests/${fest.club.slug}/${fest.slug}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-accent)] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
          >
            Explore fest <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  )
}

export function FestDirectoryCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] animate-pulse" aria-hidden="true">
      <div className="aspect-[16/9] bg-[var(--color-surface-raised)]" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-2/3 rounded bg-[var(--color-surface-raised)]" />
        <div className="h-5 w-4/5 rounded bg-[var(--color-surface-raised)]" />
        <div className="h-3 w-full rounded bg-[var(--color-surface-raised)]" />
        <div className="h-3 w-3/4 rounded bg-[var(--color-surface-raised)]" />
      </div>
    </div>
  )
}
