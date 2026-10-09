import { useMemo, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { EmptyState, ErrorState } from '../../components/states/page-states'
import { PublicEventCard, PublicEventCardSkeleton } from '../directory/public-event-card'
import { usePublicEventDirectoryQuery } from '../directory'
import { directoryDeliveryFormats, directoryExperienceLevels } from '../directory/directory-types'
import { directoryLabel } from '../directory/directory-utils'

export function EventDiscoveryPage() {
  const { data: events = [], isLoading, isError, error, refetch } = usePublicEventDirectoryQuery()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [format, setFormat] = useState('all')
  const [experience, setExperience] = useState('all')
  const [availability, setAvailability] = useState('all')

  const categories = useMemo(
    () => Array.from(new Set(events.map((event) => event.category).filter((value): value is string => Boolean(value)))).sort(),
    [events],
  )

  const filteredEvents = useMemo(() => events.filter((event) => {
    const query = search.trim().toLocaleLowerCase()
    const matchesSearch = !query || [
      event.title,
      event.description,
      event.category ?? '',
      event.subcategory ?? '',
      event.venue ?? '',
      event.fest.title,
      event.club.name,
    ].some((value) => value.toLocaleLowerCase().includes(query))

    return matchesSearch
      && (category === 'all' || event.category === category)
      && (format === 'all' || event.deliveryFormat === format)
      && (experience === 'all' || event.experienceLevels.includes(experience as 'beginner' | 'intermediate' | 'advanced'))
      && (availability === 'all' || event.availability?.registrationState === availability)
  }), [availability, category, events, experience, format, search])

  function resetFilters() {
    setSearch('')
    setCategory('all')
    setFormat('all')
    setExperience('all')
    setAvailability('all')
  }

  return (
    <div className="content-container space-y-8 py-6 sm:py-8 lg:py-10">
      <header className="border-b border-[var(--color-border-subtle)] pb-8">
        <div className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Campus catalog
        </div>
        <h1 className="font-serif mt-3 text-4xl font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-5xl">Events & competitions</h1>
        <p className="mt-2 max-w-2xl text-sm leading-[1.6] text-[var(--color-text-body)] sm:text-base">
          Explore published events across student clubs and review rules, deadlines, team requirements, and live availability.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="relative sm:col-span-2">
            <span className="sr-only">Search events</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search event, club, or venue"
              className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/70 focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </label>
          <label className="sr-only" htmlFor="event-category">Category</label>
          <select id="event-category" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-2.5 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none">
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <label className="sr-only" htmlFor="event-format">Delivery format</label>
          <select id="event-format" value={format} onChange={(event) => setFormat(event.target.value)} className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-2.5 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none">
            <option value="all">All formats</option>
            {directoryDeliveryFormats.map((item) => <option key={item} value={item}>{directoryLabel(item)}</option>)}
          </select>
          <label className="sr-only" htmlFor="event-experience">Experience level</label>
          <select id="event-experience" value={experience} onChange={(event) => setExperience(event.target.value)} className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-2.5 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none">
            <option value="all">All experience levels</option>
            {directoryExperienceLevels.map((item) => <option key={item} value={item}>{directoryLabel(item)}</option>)}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium text-[var(--color-text-muted)]">Availability:</span>
          {(['all', 'open', 'waitlist', 'not_open', 'full', 'closed'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setAvailability(item)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${availability === item ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)]' : 'border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
            >
              {item === 'all' ? 'All' : directoryLabel(item)}
            </button>
          ))}
        </div>
      </header>

      <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <span>Showing <strong className="text-[var(--color-text-primary)]">{filteredEvents.length}</strong> events</span>
        {(search || category !== 'all' || format !== 'all' || experience !== 'all' || availability !== 'all') && (
          <button type="button" onClick={resetFilters} className="font-semibold text-[var(--color-accent)] hover:underline">Clear filters</button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <PublicEventCardSkeleton key={index} />)}
        </div>
      ) : isError ? (
        <ErrorState title="We could not load the events" description={error instanceof Error ? error.message : 'Please try again.'} onRetry={() => { void refetch() }} />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          title="No events match these filters"
          description={events.length === 0 ? 'No published events are available yet.' : 'Try a different search or filter.'}
          action={<Button variant="secondary" size="sm" onClick={resetFilters}>Reset filters</Button>}
        />
      ) : (
        <section aria-label="Published events" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 card-grid-interactive">
          {filteredEvents.map((event) => <PublicEventCard key={event.id} event={event} fest={event.fest} club={event.club} />)}
        </section>
      )}
    </div>
  )
}
