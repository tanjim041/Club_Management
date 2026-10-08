import { useMemo, useState, type ReactNode } from 'react'
import { CalendarDays, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { ErrorState, EmptyState } from '../../components/states/page-states'
import { Button } from '../../components/ui/button'
import { FestDirectoryCard, FestDirectoryCardSkeleton } from '../directory/fest-directory-card'
import {
  directoryDeliveryFormats,
  directoryExperienceLevels,
  directoryRegistrationStates,
  usePublicFestDirectoryQuery,
  type DirectoryDeliveryFormat,
  type DirectoryExperienceLevel,
  type DirectoryRegistrationState,
  type PublicFestDirectoryItem,
} from '../directory'
import { directoryLabel } from '../directory/directory-utils'

type DateFilter = 'upcoming' | 'this_week' | 'this_month' | 'all'

const initialFilterState = {
  search: '',
  category: 'all',
  date: 'upcoming' as DateFilter,
  deliveryFormat: 'all' as const,
  experienceLevel: 'all' as const,
  availability: 'all' as const,
}

const EMPTY_FESTS: PublicFestDirectoryItem[] = []

function isFestInDateWindow(fest: PublicFestDirectoryItem, filter: DateFilter, now: Date): boolean {
  const start = new Date(fest.startsAt)
  const end = new Date(fest.endsAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return filter === 'all'

  if (filter === 'all') return true
  if (end < now) return false
  if (filter === 'upcoming') return true

  const boundary = new Date(now)
  if (filter === 'this_week') boundary.setDate(boundary.getDate() + 7)
  if (filter === 'this_month') boundary.setMonth(boundary.getMonth() + 1)
  return start <= boundary
}

function matchesSearch(fest: PublicFestDirectoryItem, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return true

  return [
    fest.title,
    fest.description,
    fest.category ?? '',
    fest.locationName ?? '',
    fest.locationAddress ?? '',
    fest.club.name,
    fest.club.category ?? '',
  ].some((value) => value.toLocaleLowerCase().includes(normalized))
}

export function FestDirectoryPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = usePublicFestDirectoryQuery()
  const [search, setSearch] = useState(initialFilterState.search)
  const [category, setCategory] = useState(initialFilterState.category)
  const [date, setDate] = useState<DateFilter>(initialFilterState.date)
  const [deliveryFormat, setDeliveryFormat] = useState<'all' | DirectoryDeliveryFormat>(initialFilterState.deliveryFormat)
  const [experienceLevel, setExperienceLevel] = useState<'all' | DirectoryExperienceLevel>(initialFilterState.experienceLevel)
  const [availability, setAvailability] = useState<'all' | DirectoryRegistrationState>(initialFilterState.availability)

  const allFests = data?.items ?? EMPTY_FESTS
  const categories = useMemo(
    () => Array.from(new Set(allFests.map((fest) => fest.category).filter((value): value is string => Boolean(value)))).sort(),
    [allFests],
  )

  const filteredFests = useMemo(() => {
    const now = new Date()
    return allFests.filter((fest) => {
      if (!matchesSearch(fest, search)) return false
      if (category !== 'all' && fest.category !== category) return false
      if (!isFestInDateWindow(fest, date, now)) return false
      if (deliveryFormat !== 'all' && fest.deliveryFormat !== deliveryFormat) return false
      if (experienceLevel !== 'all' && fest.experienceLevels.length > 0 && !fest.experienceLevels.includes(experienceLevel)) return false
      if (availability !== 'all' && !fest.availability.registrationStates.includes(availability)) return false
      return true
    })
  }, [allFests, availability, category, date, deliveryFormat, experienceLevel, search])

  const filtersActive = search.trim().length > 0
    || category !== 'all'
    || date !== 'upcoming'
    || deliveryFormat !== 'all'
    || experienceLevel !== 'all'
    || availability !== 'all'

  function resetFilters() {
    setSearch(initialFilterState.search)
    setCategory(initialFilterState.category)
    setDate(initialFilterState.date)
    setDeliveryFormat(initialFilterState.deliveryFormat)
    setExperienceLevel(initialFilterState.experienceLevel)
    setAvailability(initialFilterState.availability)
  }

  return (
    <div className="content-container space-y-8 py-6 sm:space-y-10 sm:py-8 lg:space-y-12 lg:py-10">
      <header className="border-b border-[var(--color-border-subtle)] pb-8">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Public fest directory
        </div>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-4xl lg:text-5xl">
              Explore campus fests
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-[1.7] text-[var(--color-text-body)] sm:text-base">
              Search published fests, compare formats and experience levels, then find events with real-time registration availability.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-muted)] lg:self-auto">
            <CalendarDays className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
            {filteredFests.length} {filteredFests.length === 1 ? 'fest' : 'fests'} shown
          </div>
        </div>
      </header>

      <section aria-label="Fest directory filters" className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 sm:p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden="true" />
          Refine your search
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="relative block sm:col-span-2 lg:col-span-3 xl:col-span-2">
            <span className="sr-only">Search fests</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search fest, club, category, or location"
              className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-page)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/70 focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </label>

          <FilterSelect label="Category" value={category} onChange={setCategory}>
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="Date" value={date} onChange={(value) => setDate(value as DateFilter)}>
            <option value="upcoming">Upcoming & ongoing</option>
            <option value="this_week">Within 7 days</option>
            <option value="this_month">Within a month</option>
            <option value="all">All published dates</option>
          </FilterSelect>
          <FilterSelect label="Format" value={deliveryFormat} onChange={(value) => setDeliveryFormat(value as 'all' | DirectoryDeliveryFormat)}>
            <option value="all">All formats</option>
            {directoryDeliveryFormats.map((item) => <option key={item} value={item}>{directoryLabel(item)}</option>)}
          </FilterSelect>
          <FilterSelect label="Experience" value={experienceLevel} onChange={(value) => setExperienceLevel(value as 'all' | DirectoryExperienceLevel)}>
            <option value="all">All experience levels</option>
            {directoryExperienceLevels.map((item) => <option key={item} value={item}>{directoryLabel(item)}</option>)}
          </FilterSelect>
          <FilterSelect label="Availability" value={availability} onChange={(value) => setAvailability(value as 'all' | DirectoryRegistrationState)}>
            <option value="all">Any availability</option>
            {directoryRegistrationStates.filter((item) => !['cancelled', 'completed'].includes(item)).map((item) => <option key={item} value={item}>{directoryLabel(item)}</option>)}
          </FilterSelect>
        </div>

        {filtersActive && (
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={resetFilters} className="text-xs font-semibold text-[var(--color-accent)] hover:underline">
              Reset filters
            </button>
          </div>
        )}
      </section>

      {isLoading ? (
        <section aria-label="Loading fests" className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <FestDirectoryCardSkeleton key={index} />)}
        </section>
      ) : isError ? (
        <ErrorState
          title="We could not load the fest directory"
          description={error instanceof Error ? error.message : 'Please check your connection and try again.'}
          onRetry={() => { void refetch() }}
        />
      ) : filteredFests.length === 0 ? (
        <EmptyState
          title="No fests match these filters"
          description={allFests.length === 0 ? 'No published fests are available yet. Check back soon.' : 'Try a different keyword, date range, or availability filter.'}
          action={filtersActive ? <Button variant="secondary" size="sm" onClick={resetFilters}>Clear filters</Button> : undefined}
        />
      ) : (
        <section aria-label="Published fests" className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredFests.map((fest) => <FestDirectoryCard key={fest.id} fest={fest} />)}
        </section>
      )}

      {isFetching && !isLoading && (
        <p className="text-center text-xs text-[var(--color-text-muted)]">Refreshing live availabilityâ€¦</p>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-page)] px-3 py-2.5 text-xs font-medium text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
      >
        {children}
      </select>
    </label>
  )
}
