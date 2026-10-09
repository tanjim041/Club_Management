import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '../../components/states/page-states'
import { useAuth } from '../auth'
import { useAuthorizedClubsQuery } from '../dashboard/dashboard-api'
import { CopilotPanel } from '../assistant/assistant-panel'
import { useAnalyticsFilterOptionsQuery, useAnalyticsQuery } from './analytics-api'
import { downloadParticipantCsv } from './export-csv'

const selectClass = 'min-h-11 min-w-0 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

export function AnalyticsPage() {
  const { user } = useAuth()
  const clubs = useAuthorizedClubsQuery(user?.id)
  const [clubId, setClubId] = useState('')
  const [festId, setFestId] = useState('')
  const [eventId, setEventId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const selectedClub = clubId || clubs.data?.[0]?.id || ''
  const options = useAnalyticsFilterOptionsQuery(selectedClub || undefined)
  const invalidRange = Boolean(from && to && from > to)
  const filters = selectedClub && !invalidRange ? {
    organizationId: selectedClub, festId: festId || null, eventId: eventId || null,
    dateFrom: from || null, dateTo: to || null,
  } : null
  const analytics = useAnalyticsQuery(filters)
  const snapshot = analytics.data
  const visibleEvents = (options.data?.events ?? []).filter((event) => !festId || event.fest_id === festId)
  const participants = useMemo(() => (snapshot?.participants ?? []).filter((row) =>
    !search.trim() || [row.name, row.email ?? '', row.eventTitle, row.teamName ?? '', row.registrationId]
      .some((value) => value.toLowerCase().includes(search.trim().toLowerCase()))
  ), [search, snapshot])
  const growthChart = useMemo(() => {
    return (snapshot?.growth ?? []).reduce<Array<{ day: string; registrations: number; cumulative: number }>>(
      (series, row) => [...series, { ...row, cumulative: (series.at(-1)?.cumulative ?? 0) + row.registrations }], [],
    )
  }, [snapshot])
  const statusTotal = snapshot ? snapshot.statusDistribution.confirmed + snapshot.statusDistribution.waitlisted + snapshot.statusDistribution.cancelled : 0
  const selectedClubName = clubs.data?.find((club) => club.id === selectedClub)?.name ?? 'Club'

  if (clubs.isLoading) return <LoadingState label="Loading authorized clubs..." />
  if (clubs.isError) return <div className="content-container py-10"><ErrorState title="Could not load clubs" description={clubs.error.message} onRetry={() => { void clubs.refetch() }} /></div>
  if (!clubs.data?.length) return <div className="content-container py-10"><EmptyState title="Organizer access required" description="Analytics are available only for clubs assigned to your organizer account." /></div>

  return <main className="content-container space-y-7 py-8 sm:py-10">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-6"><div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Organizer workspace</p>
      <h1 className="font-heading mt-2 text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">Analytics</h1>
      <p className="mt-2 text-sm text-[var(--color-text-body)]">Calculated from current registrations, roster snapshots, and verified pass scans.</p>
    </div><Link to="/organizer"><Button variant="secondary">Club dashboard</Button></Link></header>

    <section aria-label="Analytics filters" className="grid gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4 sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-xs text-[var(--color-text-body)]">Organization<select className={`mt-1 w-full ${selectClass}`} value={selectedClub} onChange={(event) => { setClubId(event.target.value); setFestId(''); setEventId('') }}>{clubs.data.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select></label>
      <label className="text-xs text-[var(--color-text-body)]">Fest<select className={`mt-1 w-full ${selectClass}`} value={festId} onChange={(event) => { setFestId(event.target.value); setEventId('') }}><option value="">All fests</option>{options.data?.fests.map((fest) => <option key={fest.id} value={fest.id}>{fest.title}</option>)}</select></label>
      <label className="text-xs text-[var(--color-text-body)]">Event<select className={`mt-1 w-full ${selectClass}`} value={eventId} onChange={(event) => setEventId(event.target.value)}><option value="">All events</option>{visibleEvents.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label>
      <label className="text-xs text-[var(--color-text-body)]">Event from (UTC)<input type="date" className={`mt-1 w-full ${selectClass}`} value={from} onChange={(event) => setFrom(event.target.value)} /></label>
      <label className="text-xs text-[var(--color-text-body)]">Event to (UTC)<input type="date" className={`mt-1 w-full ${selectClass}`} value={to} onChange={(event) => setTo(event.target.value)} /></label>
      {invalidRange && <p role="alert" className="text-sm text-rose-300 sm:col-span-2 lg:col-span-5">The start date must not be after the end date.</p>}
    </section>

    {analytics.isLoading && <LoadingState label="Calculating analytics..." />}
    {analytics.isError && <ErrorState title="Could not calculate analytics" description={analytics.error.message} onRetry={() => { void analytics.refetch() }} />}
    {snapshot && <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]"><span>{selectedClubName} · Event dates filter the cohort; growth shows registration creation dates for that cohort.</span><Button size="sm" variant="ghost" onClick={() => { void analytics.refetch() }}><RefreshCw className="mr-1 h-4 w-4" /> Refresh</Button></div>
      <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
        ['Confirmed entries', snapshot.metrics.confirmedEntries], ['Unique confirmed participants', snapshot.metrics.uniqueConfirmedParticipants],
        ['Waitlist entries', snapshot.metrics.waitlistEntries], ['Active events', snapshot.metrics.activeEvents],
        ['Checked-in participants', snapshot.metrics.checkedInPeople], ['Confirmed people-places', snapshot.metrics.confirmedRegisteredPeople],
        ['Attendance rate', `${snapshot.metrics.attendanceRate}%`],
      ].map(([label, value]) => <div key={label} className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4"><p className="text-xs text-[var(--color-text-muted)]">{label}</p><p className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">{value}</p></div>)}</section>
      <p className="text-xs text-[var(--color-text-muted)]">Unique participants deduplicate people across events. Attendance rate = checked-in people-places ÷ confirmed registered people-places. Capacity is measured in people for individual events and teams for team events.</p>

      <section className="grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5"><h2 className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">Registration growth</h2><div className="mt-5 h-56" role="img" aria-label="Cumulative registrations for selected events"><ResponsiveContainer width="100%" height="100%"><LineChart data={growthChart}><CartesianGrid stroke="#303946" strokeDasharray="3 3" /><XAxis dataKey="day" tick={{ fill: '#929CAA', fontSize: 11 }} /><YAxis tick={{ fill: '#929CAA', fontSize: 11 }} allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="cumulative" name="Cumulative registrations" stroke="#93B4E8" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></div>
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5"><h2 className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">Registrations by event</h2><div className="mt-5 h-56" role="img" aria-label="Confirmed and waitlisted entries by event"><ResponsiveContainer width="100%" height="100%"><BarChart data={snapshot.events}><CartesianGrid stroke="#303946" strokeDasharray="3 3" /><XAxis dataKey="title" hide /><YAxis tick={{ fill: '#929CAA', fontSize: 11 }} allowDecimals={false} /><Tooltip /><Bar dataKey="confirmedEntries" name="Confirmed" fill="#93B4E8" /><Bar dataKey="waitlistEntries" name="Waitlisted" fill="#687FA5" /></BarChart></ResponsiveContainer></div></div></section>

      <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5"><h2 className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">Status distribution & capacity</h2><p className="mt-2 text-sm text-[var(--color-text-body)]">Confirmed {snapshot.statusDistribution.confirmed} · Waitlisted {snapshot.statusDistribution.waitlisted} · Cancelled {snapshot.statusDistribution.cancelled}</p><div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[var(--color-surface-raised)]" role="img" aria-label={`${snapshot.statusDistribution.confirmed} confirmed, ${snapshot.statusDistribution.waitlisted} waitlisted, ${snapshot.statusDistribution.cancelled} cancelled`}><span style={{ width: `${statusTotal ? 100 * snapshot.statusDistribution.confirmed / statusTotal : 0}%` }} className="bg-accent" /><span style={{ width: `${statusTotal ? 100 * snapshot.statusDistribution.waitlisted / statusTotal : 0}%` }} className="bg-amber-400" /><span style={{ width: `${statusTotal ? 100 * snapshot.statusDistribution.cancelled / statusTotal : 0}%` }} className="bg-slate-500" /></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-[var(--color-border-subtle)] text-xs text-[var(--color-text-muted)]"><tr><th className="pb-3">Event</th><th className="pb-3">Confirmed</th><th className="pb-3">Waitlist</th><th className="pb-3">Capacity usage</th><th className="pb-3">Attendance</th></tr></thead><tbody>{snapshot.events.map((event) => <tr key={event.id} className="border-b border-[var(--color-border-subtle)]/70 text-[var(--color-text-body)]"><td className="py-3 pr-3 font-medium text-[var(--color-text-primary)]">{event.title}<span className="block text-xs text-[var(--color-text-muted)]">{event.festTitle}</span></td><td className="py-3">{event.confirmedEntries} {event.capacityUnit}</td><td className="py-3">{event.waitlistEntries}</td><td className="py-3">{event.confirmedEntries}/{event.capacity} {event.capacityUnit} · {event.capacityUsage}%</td><td className="py-3">{event.checkedInPeople}/{event.confirmedPeople} people</td></tr>)}</tbody></table>{!snapshot.events.length && <p className="py-5 text-sm text-[var(--color-text-muted)]">No events match these filters.</p>}</div></section>

      <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">Participants</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">{participants.length} matching people; team members appear individually.</p></div><Button variant="secondary" disabled={!participants.length} onClick={() => downloadParticipantCsv(participants)}><Download className="mr-2 h-4 w-4" /> Export filtered CSV</Button></div><label className="mt-4 block text-xs text-[var(--color-text-body)]">Search participant, event, team, email, or registration ID<input type="search" className={`mt-2 w-full ${selectClass}`} value={search} onChange={(event) => setSearch(event.target.value)} /></label><div className="mt-4 max-h-96 overflow-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="sticky top-0 bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)]"><tr><th className="pb-3">Participant</th><th className="pb-3">Event / team</th><th className="pb-3">Status</th><th className="pb-3">Check-in</th></tr></thead><tbody>{participants.map((row) => <tr key={`${row.registrationId}-${row.userId}`} className="border-t border-[var(--color-border-subtle)] text-[var(--color-text-body)]"><td className="py-3 pr-3"><span className="font-medium text-[var(--color-text-primary)]">{row.name}</span><span className="block text-xs">{row.email}</span></td><td className="py-3 pr-3">{row.eventTitle}<span className="block text-xs">{row.teamName}</span></td><td className="py-3 capitalize">{row.status}</td><td className="py-3">{row.checkedInAt ? new Date(row.checkedInAt).toLocaleString() : '—'}</td></tr>)}</tbody></table>{!participants.length && <p className="py-4 text-sm text-[var(--color-text-muted)]">No matching participants.</p>}</div></section>
      <CopilotPanel filters={filters!} snapshot={snapshot} />
    </>}
  </main>
}
