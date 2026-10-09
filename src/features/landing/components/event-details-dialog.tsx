import { useEffect } from 'react'
import {
  Calendar,
  Clock,
  FileText,
  MapPin,
  Shield,
  Tag,
  Users,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/button'
import type { PublishedEvent } from '../landing-types'
import { formatEventSchedule, formatVenue, getRegistrationStatus } from '../landing-utils'

interface EventDetailsDialogProps {
  event: PublishedEvent | null
  onClose: () => void
}

export function EventDetailsDialog({ event, onClose }: EventDetailsDialogProps) {

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (event) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [event, onClose])

  if (!event) return null

  const scheduleStr = formatEventSchedule(event)
  const venueStr = formatVenue(event.venue)
  const regStatus = getRegistrationStatus(
    event.registration_closes_at,
    event.registration_opens_at,
  )
  const clubSlug = event.fests?.organizations?.slug
  const detailPath = clubSlug && event.fests?.slug
    ? `/fests/${clubSlug}/${event.fests.slug}/events/${event.slug}`
    : '/events'

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[var(--color-page)]/85 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 text-left shadow-2xl sm:p-8 z-10 my-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close event details"
          className="absolute right-4 top-4 rounded-xl p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Cover Image banner if available */}
        {event.cover_image_url && (
          <div className="mb-4 h-44 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 overflow-hidden border-b border-[var(--color-border-subtle)]">
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Header Tags */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-3 py-1 text-xs font-medium text-[var(--color-accent)]">
            <Tag className="h-3 w-3" aria-hidden="true" />
            <span>{displayCategory}</span>
          </span>
          {event.fests?.title && (
            <span className="rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
              {event.fests.title}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 id="dialog-title" className="font-heading mt-3 text-2xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">
          {event.title}
        </h2>

        {/* Description */}
        <p className="mt-3 text-sm leading-[1.6] text-[var(--color-text-body)]">
          {event.description || 'Competition event organized under campus club activities.'}
        </p>

        {/* Details Grid */}
        <div className="mt-6 space-y-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4 text-xs text-[var(--color-text-primary)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2.5">
            <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <Clock className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
              Event Schedule
            </span>
            <span className="font-semibold text-amber-300">{scheduleStr}</span>
          </div>

          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2.5">
            <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <MapPin className="h-4 w-4 text-sky-400" aria-hidden="true" />
              Venue Location
            </span>
            <span className="font-semibold">{venueStr}</span>
          </div>

          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2.5">
            <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <Users className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
              Participation Format
            </span>
            <span className="font-semibold">{formatStr}</span>
          </div>

          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2.5">
            <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <Calendar className="h-4 w-4 text-accent" aria-hidden="true" />
              Scheduled Registration Window
            </span>
            <span
              className={`font-semibold ${
                regStatus.variant === 'open'
                  ? 'text-emerald-400'
                  : regStatus.variant === 'closing-soon'
                    ? 'text-amber-400'
                    : 'text-[var(--color-text-muted)]'
              }`}
            >
              {regStatus.label}
            </span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <Shield className="h-4 w-4 text-violet-400" aria-hidden="true" />
              Capacity & Limits
            </span>
            <span className="font-semibold">
              {event.capacity} {event.registration_mode === 'team' ? 'teams' : 'people'} total; view details for live availability
            </span>
          </div>
        </div>

        {/* Rules & Guidelines if available */}
        {event.rules && (
          <div className="mt-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4 text-xs">
            <h4 className="font-heading font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5 mb-2">
              <FileText className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              Rules & Guidelines
            </h4>
            <p className="text-[var(--color-text-body)] whitespace-pre-line leading-[1.6]">{event.rules}</p>
          </div>
        )}

        {/* Details CTA */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-4">
          <div className="text-xs text-[var(--color-text-muted)]">
            Live capacity, rules, and eligibility are shown on the event page.
          </div>

          <div className="flex items-center gap-2">
            <Link to={detailPath} onClick={onClose}>
              <Button variant="primary" size="default">View full event details</Button>
            </Link>

            <Button variant="secondary" size="default" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
