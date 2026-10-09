import {
  ArrowLeft,
  CalendarClock,
  Clock3,
  Compass,
  FileText,
  MapPin,
  ShieldCheck,
  Tag,
  UsersRound,
} from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/states/page-states'
import { Button } from '../../components/ui/button'
import { useAuth } from '../auth'
import { registerIndividualEvent, registrationErrorMessage } from '../registrations/registration-api'
import { createEventTeam, useEventConflictsQuery, useScheduleAlternativesQuery } from '../teams/team-api'
import { ConflictSummary } from '../teams/conflict-summary'
import { usePublicEventDetailQuery } from '../directory'
import {
  directoryLabel,
  eligibilityItems,
  formatDirectoryDateTime,
  formatEventParticipation,
  formatExperienceLevels,
  getAvailabilityTone,
} from '../directory/directory-utils'

export function EventDetailPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [acceptedRules, setAcceptedRules] = useState(false)
  const [acknowledgeConflicts, setAcknowledgeConflicts] = useState(false)
  const [teamName, setTeamName] = useState('')
  const { clubSlug, festSlug, eventSlug } = useParams<{
    clubSlug: string
    festSlug: string
    eventSlug: string
  }>()
  const { data: event, isLoading, isError, error, refetch, isFetching } = usePublicEventDetailQuery(clubSlug, festSlug, eventSlug)
  const conflicts = useEventConflictsQuery(event?.id, null, auth.user?.id)
  const alternatives = useScheduleAlternativesQuery(event?.id, null, auth.user?.id)
  const registration = useMutation({
    mutationFn: () => registerIndividualEvent(event!.id, acknowledgeConflicts),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['participant', 'registrations', auth.user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['public-directory'] }),
      ])
      navigate(`/my-registrations/${result.registration_id}`, { state: { registrationCreated: true } })
    },
  })
  const teamCreation = useMutation({
    mutationFn: () => createEventTeam(event!.id, teamName),
    onSuccess: async (teamId) => {
      await queryClient.invalidateQueries({ queryKey: ['participant', 'teams', auth.user?.id] })
      navigate(`/teams/${teamId}`)
    },
  })

  if (isLoading) return <LoadingState label="Loading event details…" />

  if (isError) {
    return (
      <div className="content-container py-12">
        <ErrorState
          title="We could not load this event"
          description={error instanceof Error ? error.message : 'Please try again in a moment.'}
          onRetry={() => { void refetch() }}
        />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="content-container py-12">
        <EmptyState
          title="Event not found"
          description="This event is not published, has moved, or the link is incorrect."
          action={<Link to="/fests"><Button variant="secondary">Browse fests</Button></Link>}
        />
      </div>
    )
  }

  const availability = event.availability
  const capacityUnit = availability?.capacityUnit ?? (event.registrationMode === 'team' ? 'teams' : 'people')
  const eligibility = eligibilityItems(event.eligibility)
  const festPath = `/fests/${event.club.slug}/${event.fest.slug}`

  return (
    <div className="content-container space-y-8 py-6 sm:py-8 lg:space-y-10 lg:py-10">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs">
        <Link to="/fests" className="text-[var(--color-accent)] hover:underline">Fests</Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <Link to={festPath} className="text-[var(--color-accent)] hover:underline">{event.fest.title}</Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <span className="text-[var(--color-text-primary)]">{event.title}</span>
      </nav>

      <header className="grid gap-8 border-b border-[var(--color-border-subtle)] pb-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
        <div>
          <div className="flex flex-wrap gap-2">
            {event.category && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
                <Tag className="h-3 w-3" aria-hidden="true" />
                {event.category}{event.subcategory ? ` · ${event.subcategory}` : ''}
              </span>
            )}
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getAvailabilityTone(event.operationalStatus)}`}>
              {directoryLabel(event.operationalStatus)}
            </span>
            {availability ? (
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getAvailabilityTone(availability.registrationState)}`}>
                {directoryLabel(availability.registrationState)}
              </span>
            ) : (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                Availability unavailable
              </span>
            )}
          </div>

          <h1 className="font-heading mt-4 text-3xl font-bold tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-4xl lg:text-5xl">{event.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-[1.75] text-[var(--color-text-body)] sm:text-base">{event.description || 'The host club will publish the full event description shortly.'}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs">
            <Link to={`/clubs/${event.club.slug}`} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
              <Compass className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden="true" />
              {event.club.name}
            </Link>
            <Link to={festPath} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text-body)] hover:text-[var(--color-accent)]">
              <CalendarClock className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden="true" />
              {event.fest.title}
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] shadow-xl">
          {event.coverImageUrl ? (
            <img src={event.coverImageUrl} alt={`${event.title} cover`} className="aspect-[16/10] w-full object-cover" />
          ) : (
            <div className="aspect-[16/10] bg-gradient-to-br from-[var(--color-surface-raised)] to-[var(--color-surface)]" />
          )}
        </div>
      </header>

      <section aria-labelledby="event-facts-heading">
        <h2 id="event-facts-heading" className="font-heading text-2xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">Event details</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Fact icon={<CalendarClock className="h-4 w-4 text-amber-300" />} label="Starts" value={formatDirectoryDateTime(event.startsAt, event.fest.timezone)} />
          <Fact icon={<Clock3 className="h-4 w-4 text-amber-300" />} label="Ends" value={formatDirectoryDateTime(event.endsAt, event.fest.timezone)} />
          <Fact icon={<Clock3 className="h-4 w-4 text-[var(--color-accent)]" />} label="Registration deadline" value={formatDirectoryDateTime(event.registrationClosesAt ?? event.fest.registrationClosesAt ?? event.startsAt, event.fest.timezone)} />
          <Fact icon={<MapPin className="h-4 w-4 text-sky-300" />} label="Venue" value={event.venue || event.fest.locationName || 'Venue to be announced'} />
          <Fact icon={<UsersRound className="h-4 w-4 text-[var(--color-accent)]" />} label="Participation" value={formatEventParticipation(event)} />
          <Fact icon={<ShieldCheck className="h-4 w-4 text-violet-300" />} label="Delivery format" value={directoryLabel(event.deliveryFormat)} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 sm:p-6">
            <h2 className="font-heading text-lg font-bold text-[var(--color-text-primary)]">Rules</h2>
            {event.rules.trim() ? (
              <p className="mt-3 whitespace-pre-line text-sm leading-[1.7] text-[var(--color-text-body)]">{event.rules}</p>
            ) : (
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">Rules have not been published yet.</p>
            )}
          </div>
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 sm:p-6">
            <h2 className="font-heading flex items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]">
              <FileText className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
              Eligibility
            </h2>
            <p className="mt-3 text-sm text-[var(--color-text-body)]">{formatExperienceLevels(event.experienceLevels)}</p>
            {eligibility.length > 0 ? (
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {eligibility.map((item) => (
                  <div key={item.label} className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">{item.label}</dt>
                    <dd className="mt-1 text-xs leading-[1.6] text-[var(--color-text-primary)]">{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : <p className="mt-2 text-xs text-[var(--color-text-muted)]">No additional eligibility conditions are published.</p>}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 sm:p-6">
            <h2 className="font-heading text-lg font-bold text-[var(--color-text-primary)]">Registration availability</h2>
            <p className="mt-2 text-xs leading-[1.6] text-[var(--color-text-muted)]">Counts are calculated from confirmed registrations in the database.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Capacity" value={`${event.capacity} ${capacityUnit}`} />
              <Metric label="Available" value={availability ? `${availability.availableCapacity} ${capacityUnit}` : 'Unavailable'} />
            </div>
            <div className="mt-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3 text-xs leading-[1.6] text-[var(--color-text-body)]">
              <span className="font-semibold text-[var(--color-text-primary)]">State: </span>
              {availability ? directoryLabel(availability.registrationState) : 'Availability cannot be confirmed right now.'}
              {event.registrationMode === 'team' && (
                <p className="mt-2 text-[var(--color-text-muted)]">Team registration requires {event.teamMinSize ?? 'a minimum number of'}–{event.teamMaxSize ?? 'a maximum number of'} members per team.</p>
              )}
            </div>
            {event.registrationMode === 'individual' ? (
              <div className="mt-5 space-y-3">
                {!auth.user ? (
                  <Link to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}><Button className="min-h-11 w-full">Log in to register</Button></Link>
                ) : auth.role !== 'participant' ? (
                  <p className="text-xs text-[var(--color-text-muted)]">Individual registration is available to participant accounts.</p>
                ) : !auth.isProfileComplete ? (
                  <Link to="/complete-profile"><Button className="min-h-11 w-full">Complete profile to register</Button></Link>
                ) : (
                  <>
                    {conflicts.isError && <p role="alert" className="text-xs text-rose-300">Could not check your schedule. Try again before registering.</p>}
                    {!conflicts.isLoading && !conflicts.isError && <ConflictSummary conflicts={conflicts.data ?? []} alternatives={alternatives.data ?? []} />}
                    {(conflicts.data ?? []).some((item) => !item.blocks_conflict) && !(conflicts.data ?? []).some((item) => item.blocks_conflict) && (
                      <label className="flex items-start gap-3 text-xs leading-[1.6] text-[var(--color-text-body)]">
                        <input type="checkbox" checked={acknowledgeConflicts} onChange={(change) => setAcknowledgeConflicts(change.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
                        <span>I understand that these event times overlap and choose to participate in both.</span>
                      </label>
                    )}
                    <label className="flex items-start gap-3 text-xs leading-[1.6] text-[var(--color-text-body)]">
                      <input type="checkbox" checked={acceptedRules} onChange={(change) => setAcceptedRules(change.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
                      <span>I have read and accept the event rules and eligibility requirements.</span>
                    </label>
                    <Button
                      className="min-h-11 w-full"
                      disabled={!acceptedRules || registration.isPending || conflicts.isLoading || conflicts.isError || (conflicts.data ?? []).some((item) => item.blocks_conflict) || ((conflicts.data ?? []).length > 0 && !acknowledgeConflicts) || !availability || !['open', 'waitlist'].includes(availability.registrationState)}
                      onClick={() => registration.mutate()}
                    >
                      {registration.isPending ? 'Saving registration...' : availability?.registrationState === 'waitlist' ? 'Join waitlist' : 'Register for event'}
                    </Button>
                    {registration.isError && <p role="alert" className="text-xs text-rose-300">{registrationErrorMessage(registration.error)}</p>}
                    {!availability && <p className="text-xs text-[var(--color-text-muted)]">Availability cannot be verified right now. Please try again later.</p>}
                  </>
                )}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {!auth.user ? (
                  <Link to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}><Button className="min-h-11 w-full">Log in to create a team</Button></Link>
                ) : auth.role !== 'participant' ? (
                  <p className="text-xs text-[var(--color-text-muted)]">Team registration is available to participant accounts.</p>
                ) : !auth.isProfileComplete ? (
                  <Link to="/complete-profile"><Button className="min-h-11 w-full">Complete profile to create a team</Button></Link>
                ) : (
                  <>
                    <p className="text-xs text-[var(--color-text-body)]">Create a draft team, invite members, then submit when enough people have accepted. Drafts do not reserve capacity.</p>
                    {!conflicts.isLoading && !conflicts.isError && <ConflictSummary conflicts={conflicts.data ?? []} alternatives={alternatives.data ?? []} />}
                    <label className="block text-xs font-semibold text-[var(--color-text-primary)]">Team name
                      <input value={teamName} onChange={(change) => setTeamName(change.target.value)} maxLength={100} placeholder="Your team name" className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none" />
                    </label>
                    <label className="flex items-start gap-3 text-xs leading-[1.6] text-[var(--color-text-body)]">
                      <input type="checkbox" checked={acceptedRules} onChange={(change) => setAcceptedRules(change.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
                      <span>I have read and accept the event rules. Every invited member must accept separately.</span>
                    </label>
                    <Button className="min-h-11 w-full" disabled={!acceptedRules || teamName.trim().length < 2 || teamCreation.isPending || !availability || !['open', 'waitlist'].includes(availability.registrationState)} onClick={() => teamCreation.mutate()}>
                      {teamCreation.isPending ? 'Creating team...' : 'Create draft team'}
                    </Button>
                    {teamCreation.isError && <p role="alert" className="text-xs text-rose-300">{registrationErrorMessage(teamCreation.error)}</p>}
                  </>
                )}
              </div>
            )}
          </div>
          <Link to={festPath} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent)] hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to fest
          </Link>
        </aside>
      </section>

      {isFetching && <p className="text-center text-xs text-[var(--color-text-muted)]">Refreshing live availability…</p>}
    </div>
  )
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{icon}{label}</div>
      <p className="mt-3 text-sm font-medium leading-[1.5] text-[var(--color-text-primary)]">{value}</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 font-heading text-lg font-bold text-[var(--color-text-primary)]">{value}</p>
    </div>
  )
}
