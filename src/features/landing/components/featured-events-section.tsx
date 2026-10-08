import { useState, useMemo } from 'react'
import { AlertCircle, MapPin, RefreshCw, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFeaturedEventsQuery } from '../landing-api'
import type { PublishedEvent } from '../landing-types'
import { EventDetailsDialog } from './event-details-dialog'
import { Button } from '../../../components/ui/button'

const EVENT_CATEGORIES = [
  'All',
  'Programming',
  'Robotics',
  'Gaming Tournament',
  'Olympiad and Quiz',
  'Showcasing',
  'Exhibition',
  'Online Events',
  'Others',
]

export function FeaturedEventsSection() {
  const { data: events, isLoading, isError, error, refetch, isFetching } = useFeaturedEventsQuery()
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [activeDialogEvent, setActiveDialogEvent] = useState<PublishedEvent | null>(null)

  // Filter events based on selected category
  const filteredEvents = useMemo(() => {
    if (!events) return []
    if (selectedCategory === 'All') return events.slice(0, 10)
    return events.filter((e) => e.category === selectedCategory)
  }, [events, selectedCategory])

  return (
    <section aria-labelledby="featured-events-heading" className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Campus Activities</span>
          </div>
          <h2
            id="featured-events-heading"
            className="font-heading mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-3xl lg:text-4xl"
          >
            Upcoming Competitions & Fests
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-[1.6] text-[var(--color-text-body)] sm:text-base">
            Editorial schedule of upcoming multi-track challenges, workshops, and exhibitions.
          </p>
        </div>

        <Link to="/events" className="shrink-0">
          <Button variant="secondary" size="default" className="w-full sm:w-auto">
            Full Events Catalog
          </Button>
        </Link>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {EVENT_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-sm'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex items-center justify-between py-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-[var(--color-surface)]" />
                <div className="space-y-2">
                  <div className="h-4 w-48 rounded bg-[var(--color-surface)]" />
                  <div className="h-3 w-32 rounded bg-[var(--color-surface)]" />
                </div>
              </div>
              <div className="h-8 w-24 rounded bg-[var(--color-surface)]" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/30 bg-[var(--color-surface)] p-10 text-center"
        >
          <AlertCircle className="h-10 w-10 text-rose-400" aria-hidden="true" />
          <h3 className="font-heading mt-4 text-base font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
            Unable to load campus events
          </h3>
          <p className="mt-1 max-w-sm text-xs leading-[1.6] text-[var(--color-text-body)]">
            {error instanceof Error ? error.message : 'Please check your connection.'}
          </p>
          <Button
            variant="secondary"
            size="default"
            className="mt-5"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Try again
          </Button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="py-12 text-center border-y border-[var(--color-border-subtle)]">
          <p className="font-heading text-base font-semibold text-[var(--color-text-primary)]">
            No events found in this category
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Select another category or view the full events catalog.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => setSelectedCategory('All')}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        /* Editorial Event Rows List */
        <div className="divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
          {filteredEvents.map((event) => {
            const dateObj = event.starts_at ? new Date(event.starts_at) : null
            const monthStr = dateObj
              ? dateObj.toLocaleDateString(undefined, { month: 'short' })
              : 'TBA'
            const dayStr = dateObj
              ? dateObj.toLocaleDateString(undefined, { day: '2-digit' })
              : '--'

            const now = new Date()
            const closesAt = event.registration_closes_at
              ? new Date(event.registration_closes_at)
              : null
            const isClosed = closesAt && closesAt < now

            return (
              <article
                key={event.id}
                className="group py-4 sm:py-5 transition-colors hover:bg-[var(--color-surface)]/70"
              >
                {/* Desktop layout: Grid */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-center md:gap-6">
                  {/* Col 1: Date Block (2 cols on md) */}
                  <div className="flex items-center gap-3.5 md:col-span-2">
                    <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-1.5 min-w-[54px] text-center shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent)] font-heading">
                        {monthStr}
                      </span>
                      <span className="text-xl font-bold text-[var(--color-text-primary)] leading-tight font-heading">
                        {dayStr}
                      </span>
                    </div>

                    {/* Mobile-only visible category badge */}
                    <div className="md:hidden flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                        {event.category}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">{event.fests?.title}</span>
                    </div>
                  </div>

                  {/* Col 2: Title and Host (4 cols on md) */}
                  <div className="min-w-0 md:col-span-4">
                    <h3 className="font-heading text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors truncate">
                      {event.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)] truncate hidden md:block">
                      {event.fests?.title || 'Campus Event'}
                    </p>
                  </div>

                  {/* Col 3: Category & Format (2 cols on md) */}
                  <div className="hidden md:block md:col-span-2">
                    <span className="inline-block rounded-md bg-[var(--color-surface)] border border-[var(--color-border-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-body)]">
                      {event.category}
                    </span>
                    <span className="block mt-1 text-[11px] text-[var(--color-text-muted)] capitalize">
                      {event.registration_mode || 'Individual'}
                    </span>
                  </div>

                  {/* Col 4: Venue (2 cols on md) */}
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] md:col-span-2">
                    <MapPin className="h-3.5 w-3.5 text-[var(--color-accent)] shrink-0" />
                    <span className="truncate">{event.venue || 'Venue TBA'}</span>
                  </div>

                  {/* Col 5: Availability & Action (2 cols on md) */}
                  <div className="flex items-center justify-between gap-3 md:col-span-2 md:justify-end">
                    {/* Status badge */}
                    {isClosed ? (
                      <span className="rounded-full bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-medium text-rose-300">
                        Closed
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
                        Open
                      </span>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveDialogEvent(event)}
                      className="text-xs font-semibold hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Connected Details Dialog */}
      <EventDetailsDialog
        event={activeDialogEvent}
        onClose={() => setActiveDialogEvent(null)}
      />
    </section>
  )
}
