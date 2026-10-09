import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Compass,
  MapPin,
  Megaphone,
  UsersRound,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/states/page-states'
import { Button } from '../../components/ui/button'
import { PublicEventCard } from '../directory/public-event-card'
import { usePublicFestDetailQuery } from '../directory'
import {
  directoryLabel,
  festAvailabilityText,
  formatDirectoryDateRange,
  formatDirectoryDateTime,
  formatExperienceLevels,
  getAvailabilityTone,
  getFestAvailabilityLabel,
} from '../directory/directory-utils'

export function FestDetailPage() {
  const { clubSlug, festSlug } = useParams<{ clubSlug: string; festSlug: string }>()
  const { data: fest, isLoading, isError, error, refetch, isFetching } = usePublicFestDetailQuery(clubSlug, festSlug)

  if (isLoading) return <LoadingState label="Loading fest details…" />

  if (isError) {
    return (
      <div className="content-container py-12">
        <ErrorState
          title="We could not load this fest"
          description={error instanceof Error ? error.message : 'Please try again in a moment.'}
          onRetry={() => { void refetch() }}
        />
      </div>
    )
  }

  if (!fest) {
    return (
      <div className="content-container py-12">
        <EmptyState
          title="Fest not found"
          description="This fest is not published, has moved, or the link is incorrect."
          action={<Link to="/fests"><Button variant="secondary">Browse fests</Button></Link>}
        />
      </div>
    )
  }

  const availabilityState = getFestAvailabilityLabel(fest.availability)
  const schedule = fest.scheduleItems.length > 0
    ? fest.scheduleItems
    : fest.events.map((event) => ({
      id: event.id,
      eventId: event.id,
      title: event.title,
      description: event.description,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      venue: event.venue,
      sortOrder: 0,
    }))

  return (
    <div className="pb-14">
      <section className="border-b border-[var(--color-border-subtle)] bg-[var(--color-page)]">
        <div className="content-container py-5">
          <Link to="/fests" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent)] hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All fests
          </Link>
          <Link to={`/live/${fest.club.slug}/${fest.slug}`} className="ml-5 inline-flex min-h-11 items-center text-xs font-semibold text-[var(--color-accent)] hover:underline">Live Fest Mode</Link>
        </div>
      </section>

      <section className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
        <div className="content-container grid gap-8 py-8 lg:grid-cols-[1.2fr_0.8fr] lg:py-12">
          <div className="order-2 lg:order-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getAvailabilityTone(availabilityState === 'program_soon' ? 'scheduled' : availabilityState)}`}>
                {festAvailabilityText(fest.availability)}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getAvailabilityTone(fest.operationalStatus)}`}>
                {directoryLabel(fest.operationalStatus)}
              </span>
              {fest.category && <span className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-3 py-1 text-xs text-[var(--color-text-body)]">{fest.category}</span>}
            </div>

            <h1 className="font-heading mt-4 text-3xl font-bold tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-4xl lg:text-5xl">{fest.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-[1.75] text-[var(--color-text-body)] sm:text-base">{fest.description || 'The host club will publish the full fest program shortly.'}</p>

            <div className="mt-6 flex flex-wrap gap-3 text-xs">
              <Link to={`/clubs/${fest.club.slug}`} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
                <Compass className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden="true" />
                Hosted by {fest.club.name}
              </Link>
              <span className="inline-flex items-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text-body)]">
                {directoryLabel(fest.deliveryFormat)} · {formatExperienceLevels(fest.experienceLevels)}
              </span>
            </div>
          </div>

          <div className="order-1 overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] shadow-xl lg:order-2">
            {fest.bannerUrl ? (
              <img src={fest.bannerUrl} alt={`${fest.title} banner`} className="aspect-[16/10] h-full w-full object-cover" />
            ) : (
              <div className="aspect-[16/10] bg-[radial-gradient(var(--color-accent)_1px,transparent_1px)] [background-size:18px_18px] opacity-30" />
            )}
          </div>
        </div>
      </section>

      <main className="content-container space-y-10 py-8 lg:space-y-12 lg:py-12">
        <section aria-label="Fest information" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard icon={<CalendarDays className="h-4 w-4 text-amber-300" />} label="Fest dates" value={formatDirectoryDateRange(fest.startsAt, fest.endsAt, fest.timezone)} />
          <InfoCard icon={<Clock3 className="h-4 w-4 text-[var(--color-accent)]" />} label="Registration closes" value={formatDirectoryDateTime(fest.registrationClosesAt, fest.timezone)} />
          <InfoCard icon={<MapPin className="h-4 w-4 text-sky-300" />} label="Location" value={fest.locationName || 'Location to be announced'} />
          <InfoCard icon={<UsersRound className="h-4 w-4 text-[var(--color-accent)]" />} label="Available program" value={`${fest.availability.eventCount} ${fest.availability.eventCount === 1 ? 'event' : 'events'} · ${fest.availability.openEventCount} open`} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 sm:p-6">
            <h2 className="font-heading text-xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">Schedule</h2>
            <p className="mt-1 text-xs leading-[1.6] text-[var(--color-text-muted)]">
              {fest.scheduleItems.length > 0 ? 'Published agenda items for this fest.' : 'Event timings currently form the published program.'}
            </p>
            {schedule.length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed border-[var(--color-border-subtle)] p-5 text-sm text-[var(--color-text-muted)]">The host club has not published schedule items yet.</p>
            ) : (
              <ol className="mt-5 space-y-3">
                {schedule.map((item) => (
                  <li key={item.id} className="grid gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4 sm:grid-cols-[9.5rem_1fr]">
                    <p className="text-xs font-semibold leading-[1.5] text-amber-300">{formatDirectoryDateTime(item.startsAt, fest.timezone)}</p>
                    <div>
                      <h3 className="font-heading text-sm font-semibold text-[var(--color-text-primary)]">{item.title}</h3>
                      {item.description && <p className="mt-1 text-xs leading-[1.6] text-[var(--color-text-body)]">{item.description}</p>}
                      <p className="mt-2 text-xs text-sky-300">{item.venue || 'Venue to be announced'}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 sm:p-6">
              <h2 className="font-heading text-lg font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">Location</h2>
              <div className="mt-4 flex gap-3 text-sm leading-[1.6] text-[var(--color-text-body)]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
                <span>{fest.locationAddress || fest.locationName || 'Location details will be shared by the host club.'}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                <h2 className="font-heading text-lg font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">Announcements</h2>
              </div>
              {fest.announcements.length === 0 ? (
                <p className="mt-4 text-sm leading-[1.6] text-[var(--color-text-muted)]">No public announcements have been posted yet.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {fest.announcements.map((announcement) => (
                    <article key={announcement.id} className="border-b border-[var(--color-border-subtle)] pb-4 last:border-0 last:pb-0">
                      <p className="text-[11px] text-[var(--color-text-muted)]">{formatDirectoryDateTime(announcement.publishedAt, fest.timezone)}</p>
                      <h3 className="mt-1 font-heading text-sm font-semibold text-[var(--color-text-primary)]">{announcement.title}</h3>
                      <p className="mt-1 text-xs leading-[1.6] text-[var(--color-text-body)]">{announcement.body}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </section>

        <section aria-labelledby="fest-events-heading">
          <div className="flex flex-col gap-2 border-b border-[var(--color-border-subtle)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="fest-events-heading" className="font-heading text-2xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">Events</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">Choose an event to review its deadline, capacity, rules, and eligibility.</p>
            </div>
            <span className="text-xs font-semibold text-[var(--color-accent)]">Live availability from Festivo</span>
          </div>
          {fest.events.length === 0 ? (
            <div className="mt-6"><EmptyState title="No published events yet" description="The host club has not added public events to this fest." /></div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {fest.events.map((event) => <PublicEventCard key={event.id} event={event} fest={fest} club={fest.club} />)}
            </div>
          )}
        </section>
      </main>

      {isFetching && <p className="pb-4 text-center text-xs text-[var(--color-text-muted)]">Refreshing live availability…</p>}
    </div>
  )
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-sm font-medium leading-[1.5] text-[var(--color-text-primary)]">{value}</p>
    </div>
  )
}
