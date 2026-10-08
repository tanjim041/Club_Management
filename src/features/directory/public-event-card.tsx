import { CalendarClock, ChevronRight, MapPin, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PublicClubSummary, PublicEvent, PublicFest } from './directory-types'
import {
  directoryLabel,
  formatDirectoryDateTime,
  formatEventParticipation,
  formatExperienceLevels,
  getAvailabilityTone,
} from './directory-utils'

type PublicEventCardProps = {
  event: PublicEvent
  fest: Pick<PublicFest, 'slug' | 'title' | 'timezone'>
  club: Pick<PublicClubSummary, 'slug' | 'name'>
}

export function PublicEventCard({ event, fest, club }: PublicEventCardProps) {
  const registrationState = event.availability?.registrationState
  const capacityUnit = event.availability?.capacityUnit ?? (event.registrationMode === 'team' ? 'teams' : 'people')

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] transition-all duration-150 hover:-translate-y-1 hover:border-[var(--color-accent)] hover:shadow-xl">
      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--color-surface-raised)]">
        {event.coverImageUrl ? (
          <img src={event.coverImageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[var(--color-surface-raised)] to-[var(--color-surface)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-[var(--color-surface)]/20 to-transparent" />
        <span className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md ${registrationState ? getAvailabilityTone(registrationState) : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
          {registrationState ? directoryLabel(registrationState) : 'Availability unavailable'}
        </span>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-xs">
          <span className="truncate font-medium text-[var(--color-text-primary)]">{fest.title}</span>
          {event.category && <span className="shrink-0 rounded-md bg-[var(--color-surface)]/90 px-2 py-1 text-[10px] font-semibold text-[var(--color-accent)] backdrop-blur-md">{event.category}</span>}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-heading text-base font-bold tracking-[-0.03em] text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-accent)]">{event.title}</h3>
        <p className="mt-2 line-clamp-2 text-xs leading-[1.6] text-[var(--color-text-body)]">{event.description || 'Details will be published by the host club.'}</p>

        <div className="mt-4 space-y-2 border-t border-[var(--color-border-subtle)] pt-3 text-xs text-[var(--color-text-muted)]">
          <p className="flex items-center gap-2 text-amber-300">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{formatDirectoryDateTime(event.startsAt, fest.timezone)}</span>
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-300" aria-hidden="true" />
            <span className="truncate">{event.venue || 'Venue to be announced'}</span>
          </p>
          <p className="flex items-center gap-2">
            <UsersRound className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
            <span className="truncate">{formatEventParticipation(event)}</span>
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-[var(--color-text-body)]">
          <span className="rounded-lg bg-[var(--color-surface-raised)] px-2.5 py-1">{directoryLabel(event.deliveryFormat)}</span>
          <span className="rounded-lg bg-[var(--color-surface-raised)] px-2.5 py-1">{formatExperienceLevels(event.experienceLevels)}</span>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-4">
          <span className="text-xs text-[var(--color-text-muted)]">
            {event.availability ? `${event.availability.availableCapacity} ${capacityUnit} available` : 'Availability unavailable'}
          </span>
          <Link
            to={`/fests/${club.slug}/${fest.slug}/events/${event.slug}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-accent)] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
          >
            Event details <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  )
}

export function PublicEventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] animate-pulse" aria-hidden="true">
      <div className="aspect-[16/9] bg-[var(--color-surface-raised)]" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-3/4 rounded bg-[var(--color-surface-raised)]" />
        <div className="h-3 w-full rounded bg-[var(--color-surface-raised)]" />
        <div className="h-3 w-2/3 rounded bg-[var(--color-surface-raised)]" />
      </div>
    </div>
  )
}
