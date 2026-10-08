import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, MapPin, Ticket, Users } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/states/page-states'
import { Button } from '../../components/ui/button'
import { useAuth } from '../auth'
import { useParticipantRegistrationsQuery, type UserRegistration } from '../dashboard/dashboard-api'
import { useDigitalPassesQuery } from '../passes/pass-api'
import {
  cancelIndividualRegistration,
  registrationErrorMessage,
  useMyRegistrationNotificationsQuery,
} from './registration-api'

function registrationStatusLabel(registration: UserRegistration): string {
  if (registration.status === 'confirmed') return 'Confirmed'
  if (registration.status === 'cancelled') return 'Cancelled'
  return registration.current_waitlist_position
    ? `Waitlisted · position ${registration.current_waitlist_position}`
    : 'Waitlisted'
}

function statusTone(status: UserRegistration['status']): string {
  if (status === 'confirmed') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  if (status === 'waitlisted') return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
  return 'border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]'
}

function eventPath(registration: UserRegistration): string | null {
  const event = registration.events
  const fest = event?.fests
  const clubSlug = fest?.organizations?.slug
  return event?.slug && fest?.slug && clubSlug
    ? `/fests/${clubSlug}/${fest.slug}/events/${event.slug}`
    : null
}

export function MyRegistrationsPage() {
  const { user } = useAuth()
  const { data: registrations = [], isLoading, isError, error, refetch } = useParticipantRegistrationsQuery(user?.id)
  const notifications = useMyRegistrationNotificationsQuery(user?.id)

  if (isLoading) return <LoadingState label="Loading your registrations..." />
  if (isError) return <div className="content-container py-12"><ErrorState title="Could not load registrations" description={error instanceof Error ? error.message : 'Please try again.'} onRetry={() => { void refetch() }} /></div>

  return (
    <div className="content-container space-y-8 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Participant workspace</p>
          <h1 className="font-heading mt-2 text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">My Registrations</h1>
          <p className="mt-2 text-sm text-[var(--color-text-body)]">Confirmed places, live waitlist positions, and cancellation details.</p>
        </div>
        <Link to="/events"><Button variant="secondary">Explore events</Button></Link>
      </div>

      {notifications.isError && <p role="alert" className="text-sm text-rose-300">Registration updates could not be loaded right now.</p>}
      {notifications.data && notifications.data.length > 0 && (
        <section aria-label="Registration updates" className="space-y-2">
          <h2 className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">Recent updates</h2>
          {notifications.data.slice(0, 3).map((item) => (
            <article key={item.id} className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4">
              <p className="text-sm font-semibold text-accent">{item.title}</p>
              <p className="mt-1 text-xs text-[var(--color-text-body)]">{item.body}</p>
            </article>
          ))}
        </section>
      )}

      {registrations.length === 0 ? (
        <EmptyState title="No registrations yet" description="Explore an individual event to reserve a place or join its waitlist." action={<Link to="/events"><Button>Browse events</Button></Link>} />
      ) : (
        <section aria-label="Your registrations" className="grid gap-4 md:grid-cols-2">
          {registrations.map((registration) => (
            <article key={registration.id} className="flex flex-col justify-between rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5">
              <div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(registration.status)}`}>{registrationStatusLabel(registration)}</span>
                <h2 className="font-heading mt-4 text-lg font-bold text-[var(--color-text-primary)]">{registration.events?.title || 'Event details unavailable'}</h2>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">{registration.events?.fests?.title || 'Fest information unavailable'}</p>
                <p className="mt-4 flex items-center gap-2 text-xs text-[var(--color-text-body)]"><CalendarDays className="h-4 w-4 text-accent" aria-hidden="true" />{registration.events?.starts_at ? new Date(registration.events.starts_at).toLocaleString() : 'Schedule unavailable'}</p>
              </div>
              <Link to={`/my-registrations/${registration.id}`} className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">View registration</Link>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}

export function RegistrationDetailPage() {
  const { registrationId } = useParams<{ registrationId: string }>()
  const { user } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [showCancel, setShowCancel] = useState(false)
  const [reason, setReason] = useState('')
  const [currentTime, setCurrentTime] = useState<number | null>(null)
  useEffect(() => {
    const updateTime = () => setCurrentTime(Date.now())
    updateTime()
    const timer = window.setInterval(updateTime, 30_000)
    return () => window.clearInterval(timer)
  }, [])
  const { data: registrations = [], isLoading, isError, error, refetch } = useParticipantRegistrationsQuery(user?.id)
  const registration = registrations.find((item) => item.id === registrationId)
  const passes = useDigitalPassesQuery(Boolean(user))
  const ownPass = passes.data?.find((pass) => pass.registration_id === registration?.id)
  const cancellation = useMutation({
    mutationFn: () => cancelIndividualRegistration(registration!.id, reason),
    onSuccess: async () => {
      setShowCancel(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['participant', 'registrations', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['public-directory'] }),
        queryClient.invalidateQueries({ queryKey: ['public-event'] }),
      ])
    },
  })

  if (isLoading) return <LoadingState label="Loading your registration..." />
  if (isError) return <div className="content-container py-12"><ErrorState title="Could not load this registration" description={error instanceof Error ? error.message : 'Please try again.'} onRetry={() => { void refetch() }} /></div>
  if (!registration) return <div className="content-container py-12"><EmptyState title="Registration not found" description="This registration is not in your account." action={<Link to="/my-registrations"><Button variant="secondary">My Registrations</Button></Link>} /></div>

  const event = registration.events
  const cutoff = event?.cancellation_closes_at || event?.starts_at
  const canCancel = event?.registration_mode === 'individual' && registration.status !== 'cancelled' && Boolean(cutoff) && currentTime !== null && new Date(cutoff!).getTime() > currentTime
  const path = eventPath(registration)
  const justRegistered = Boolean((location.state as { registrationCreated?: boolean } | null)?.registrationCreated)

  return (
    <div className="content-container max-w-4xl space-y-7 py-8 sm:py-10">
      <Link to="/my-registrations" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"><ArrowLeft className="h-4 w-4" /> My Registrations</Link>
      {justRegistered && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Your registration was saved successfully.</p>}
      <header className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(registration.status)}`}>{registrationStatusLabel(registration)}</span>
          <span className="text-xs text-[var(--color-text-muted)]">Registration #{registration.id.slice(0, 8)}</span>
        </div>
        <h1 className="font-heading mt-4 text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">{event?.title || 'Event details unavailable'}</h1>
        <p className="mt-2 text-sm text-[var(--color-text-body)]">{event?.fests?.title || 'Campus fest'}</p>
        {registration.team_id && <Link to={`/teams/${registration.team_id}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-accent)] hover:underline">View your team and roster</Link>}
        {registration.status === 'waitlisted' && <p className="mt-4 text-sm text-amber-200">You are on the waitlist{registration.current_waitlist_position ? ` at position ${registration.current_waitlist_position}` : ''}. An in-app update will appear here if a place opens and you remain eligible.</p>}
        {registration.status === 'confirmed' && <p className="mt-4 text-sm text-[var(--color-text-body)]">Your place is confirmed. <Link to="/my-passes" className="font-semibold text-accent hover:underline">Open your digital pass</Link> for gate check-in.</p>}
        {registration.status === 'cancelled' && <p className="mt-4 text-sm text-[var(--color-text-muted)]">This registration was cancelled{registration.cancelled_at ? ` on ${new Date(registration.cancelled_at).toLocaleString()}` : ''}.</p>}
      </header>

      <section aria-label="Registration facts" className="grid gap-3 sm:grid-cols-2">
        <DetailFact icon={<CalendarDays className="h-4 w-4 text-accent" />} label="Event starts" value={event?.starts_at ? new Date(event.starts_at).toLocaleString() : 'Unavailable'} />
        <DetailFact icon={<MapPin className="h-4 w-4 text-accent" />} label="Venue" value={event?.venue || 'To be announced'} />
        <DetailFact icon={<Clock3 className="h-4 w-4 text-accent" />} label="Cancellation cutoff" value={cutoff ? new Date(cutoff).toLocaleString() : 'Unavailable'} />
        <DetailFact icon={<Users className="h-4 w-4 text-accent" />} label="Attendance" value={passes.isLoading ? 'Checking...' : passes.isError ? 'Unavailable' : ownPass?.checked_in_at ? `Checked in ${new Date(ownPass.checked_in_at).toLocaleString()}` : 'Not checked in'} />
        <DetailFact icon={<Ticket className="h-4 w-4 text-accent" />} label="Registered" value={new Date(registration.registered_at).toLocaleString()} />
      </section>

      {path && <Link to={path} className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline">View event rules and details</Link>}

      {canCancel && (
        <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">Need to cancel?</h2>
          <p className="mt-2 text-sm text-[var(--color-text-body)]">You can cancel before the cutoff. If you hold a confirmed place, the first eligible waitlisted participant may be promoted.</p>
          {!showCancel ? <Button className="mt-4" variant="outline" onClick={() => setShowCancel(true)}>Cancel registration</Button> : (
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-[var(--color-text-primary)]">Reason (optional)
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={2} className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3 text-sm text-[var(--color-text-primary)] focus:border-accent focus:outline-none" />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" disabled={cancellation.isPending} onClick={() => cancellation.mutate()}>{cancellation.isPending ? 'Cancelling...' : 'Yes, cancel registration'}</Button>
                <Button variant="secondary" disabled={cancellation.isPending} onClick={() => setShowCancel(false)}>Keep registration</Button>
              </div>
            </div>
          )}
          {cancellation.isError && <p role="alert" className="mt-3 text-sm text-rose-300">{registrationErrorMessage(cancellation.error)}</p>}
        </section>
      )}
      {!canCancel && registration.status !== 'cancelled' && <p className="text-sm text-[var(--color-text-muted)]">{event?.registration_mode === 'team' ? 'Online team cancellation is not available yet. Contact the host club for help.' : 'Online cancellation is no longer available for this registration.'}</p>}
    </div>
  )
}

function DetailFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{icon}{label}</p><p className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">{value}</p></div>
}
