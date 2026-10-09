import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getSupabaseClient } from '../../supabase/client'
import { useAuth } from '../auth'
import { useAuthorizedClubsQuery } from '../dashboard/dashboard-api'
import type { AnalyticsSnapshot } from '../analytics/analytics-api'
import { Button } from '../../components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '../../components/states/page-states'

type Report = AnalyticsSnapshot & { helpDesk: { total: number; new: number; assigned: number; resolved: number }; generatedAt: string }
const field = 'min-h-11 w-full rounded-xl border border-border-subtle bg-surface px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

export function OrganizerOperationsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const clubs = useAuthorizedClubsQuery(user?.id)
  const [clubId, setClubId] = useState('')
  const [festId, setFestId] = useState('')
  const [eventId, setEventId] = useState('')
  const [audience, setAudience] = useState('public')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [message, setMessage] = useState('')
  const [recipient, setRecipient] = useState('')
  const [verifyKind, setVerifyKind] = useState('workshop')
  const [verifyTitle, setVerifyTitle] = useState('')
  const [summary, setSummary] = useState<{ answer: string; aiAvailable: boolean } | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const selectedClub = clubId || clubs.data?.[0]?.id || ''
  const fests = useQuery({ queryKey: ['operations', 'fests', selectedClub], enabled: Boolean(selectedClub), queryFn: async () => {
    const { data, error } = await getSupabaseClient().from('fests').select('id,title').eq('organization_id', selectedClub).order('starts_at', { ascending: false })
    if (error) throw error
    return data ?? []
  } })
  const events = useQuery({ queryKey: ['operations', 'events', festId], enabled: Boolean(festId), queryFn: async () => {
    const { data, error } = await getSupabaseClient().from('events').select('id,title').eq('fest_id', festId).order('starts_at')
    if (error) throw error
    return data ?? []
  } })
  const report = useQuery({ queryKey: ['operations', 'report', festId], enabled: Boolean(festId), refetchInterval: 30_000, queryFn: async () => {
    const { data, error } = await getSupabaseClient().rpc('post_fest_report', { p_fest_id: festId })
    if (error) throw error
    return data as unknown as Report
  } })
  const announcements = useQuery({ queryKey: ['operations', 'announcements', selectedClub], enabled: Boolean(selectedClub), queryFn: async () => {
    const { data, error } = await getSupabaseClient().from('operational_announcements').select('id,title,body,audience,published_at,fest_id,event_id').eq('organization_id', selectedClub).order('published_at', { ascending: false }).limit(30)
    if (error) throw error
    return data ?? []
  } })
  async function publish() {
    setMessage('')
    const { error } = await getSupabaseClient().rpc('publish_operational_announcement', { p_organization_id: selectedClub, p_fest_id: festId || null, p_event_id: eventId || null, p_audience: audience, p_title: title, p_body: body })
    if (error) throw error
    setTitle(''); setBody(''); setMessage('Announcement published and eligible recipients notified.')
    await queryClient.invalidateQueries({ queryKey: ['operations', 'announcements', selectedClub] })
  }
  async function verify() {
    setMessage('')
    const { error } = await getSupabaseClient().rpc('verify_passport_item', { p_user_id: recipient.trim(), p_organization_id: selectedClub, p_event_id: eventId || null, p_kind: verifyKind, p_title: verifyTitle.trim() })
    if (error) throw error
    setRecipient(''); setVerifyTitle(''); setMessage('Passport item verified and XP awarded.')
  }
  async function explainReport() {
    if (!festId || !report.data) return
    setSummaryLoading(true)
    setSummary(null)
    try {
      const { data, error } = await getSupabaseClient().functions.invoke('organizer-copilot', { body: {
        mode: 'post_fest_report', organizationId: selectedClub, festId,
        question: 'Summarize attendance, popular events, waitlist demand, and help-desk outcomes for this fest.',
      } })
      if (error) throw error
      setSummary({ answer: data.answer, aiAvailable: Boolean(data.aiAvailable) })
    } catch {
      setSummary({ answer: `${report.data.metrics.confirmedEntries} confirmed entries, ${report.data.metrics.checkedInPeople} check-ins (${report.data.metrics.attendanceRate}% attendance), ${report.data.metrics.waitlistEntries} waitlisted, and ${report.data.helpDesk.resolved}/${report.data.helpDesk.total} help requests resolved.`, aiAvailable: false })
    } finally { setSummaryLoading(false) }
  }
  if (clubs.isLoading) return <LoadingState label="Loading club operations..." />
  if (clubs.isError) return <div className="content-container py-10"><ErrorState title="Operations unavailable" description={clubs.error.message} onRetry={() => { void clubs.refetch() }} /></div>
  if (!clubs.data?.length) return <div className="content-container py-10"><EmptyState title="No assigned club" description="Only assigned organizers can access this workspace." /></div>
  const popular = [...(report.data?.events ?? [])].sort((a,b) => b.confirmedEntries - a.confirmedEntries).slice(0,5)
  return <main className="content-container space-y-7 py-8 sm:py-10"><header className="border-b border-border-subtle pb-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Organizer workspace</p><h1 className="font-heading mt-2 text-3xl font-bold text-text-primary">Fest Operations</h1><p className="mt-2 text-sm text-text-body">Publish scoped updates, verify passport achievements, and review post-fest outcomes.</p></header><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-text-body">Club<select className={`${field} mt-1`} value={selectedClub} onChange={(event) => { setClubId(event.target.value); setFestId(''); setEventId('') }}>{clubs.data.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select></label><label className="text-xs text-text-body">Fest<select className={`${field} mt-1`} value={festId} onChange={(event) => { setFestId(event.target.value); setEventId('') }}><option value="">All club / select fest</option>{fests.data?.map((fest) => <option key={fest.id} value={fest.id}>{fest.title}</option>)}</select></label><label className="text-xs text-text-body sm:col-span-2">Event (optional)<select className={`${field} mt-1`} value={eventId} disabled={!festId} onChange={(event) => setEventId(event.target.value)}><option value="">All fest</option>{events.data?.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label></div>
    <section className="rounded-2xl border border-border-subtle bg-surface p-5"><h2 className="font-heading text-xl font-semibold text-text-primary">Publish announcement</h2><p className="mt-1 text-xs text-text-muted">Public updates appear in Live Fest Mode. Registered-only updates are sent privately to current confirmed and waitlisted participants.</p><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void publish().catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Publish failed')) }}><label className="text-xs text-text-body">Audience<select className={`${field} mt-1`} value={audience} onChange={(event) => setAudience(event.target.value)}><option value="public">Public</option><option value="registered">Registered participants</option></select></label><label className="text-xs text-text-body">Title<input required maxLength={200} className={`${field} mt-1`} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="text-xs text-text-body sm:col-span-2">Message<textarea required maxLength={5000} className={`${field} mt-1 min-h-28 py-3`} value={body} onChange={(event) => setBody(event.target.value)} /></label><div className="sm:col-span-2"><Button type="submit" disabled={!selectedClub || (audience === 'registered' && !festId)}>Publish update</Button></div></form>{message && <p role="status" className="mt-3 text-sm text-accent">{message}</p>}{announcements.data?.length ? <ul className="mt-5 space-y-2">{announcements.data.map((item) => <li key={item.id} className="rounded-xl border border-border-subtle bg-surface-raised p-3 text-sm text-text-body"><strong className="text-text-primary">{item.title}</strong> · {item.audience} · {new Date(item.published_at).toLocaleString()}</li>)}</ul> : null}</section>
    <section className="rounded-2xl border border-border-subtle bg-surface p-5"><h2 className="font-heading text-xl font-semibold text-text-primary">Verify passport item</h2><p className="mt-1 text-xs text-text-muted">Workshops require a confirmed registration in the selected event. Use a participant ID from the authorized analytics roster.</p><form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={(event) => { event.preventDefault(); void verify().catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Verification failed')) }}><label className="text-xs text-text-body">Participant ID<input required className={`${field} mt-1`} value={recipient} onChange={(event) => setRecipient(event.target.value)} /></label><label className="text-xs text-text-body">Type<select className={`${field} mt-1`} value={verifyKind} onChange={(event) => setVerifyKind(event.target.value)}><option value="workshop">Workshop completion</option><option value="achievement">Verified achievement</option></select></label><label className="text-xs text-text-body">Title<input required maxLength={200} className={`${field} mt-1`} value={verifyTitle} onChange={(event) => setVerifyTitle(event.target.value)} /></label><div className="sm:col-span-3"><Button type="submit" variant="secondary" disabled={!recipient || !verifyTitle || (verifyKind === 'workshop' && !eventId)}>Verify</Button></div></form></section>
    <section className="rounded-2xl border border-border-subtle bg-surface p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-heading text-xl font-semibold text-text-primary">Post-fest report</h2><p className="mt-1 text-xs text-text-muted">The same database metric snapshot powers Analytics and this report.</p></div><Link to="/analytics"><Button variant="secondary">Full analytics</Button></Link></div>{!festId ? <p className="mt-4 text-sm text-text-muted">Select a fest to calculate its report.</p> : report.isLoading ? <LoadingState label="Calculating report..." /> : report.isError ? <ErrorState title="Report unavailable" description={report.error.message} onRetry={() => { void report.refetch() }} /> : report.data ? <><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Confirmed entries', report.data.metrics.confirmedEntries], ['Unique people', report.data.metrics.uniqueConfirmedParticipants], ['Check-ins', report.data.metrics.checkedInPeople], ['Attendance rate', `${report.data.metrics.attendanceRate}%`], ['Waitlist demand', report.data.metrics.waitlistEntries], ['Help requests', report.data.helpDesk.total], ['Resolved requests', report.data.helpDesk.resolved]].map(([label,value]) => <div key={label} className="rounded-xl border border-border-subtle bg-surface-raised p-4"><p className="text-xs text-text-muted">{label}</p><p className="mt-1 text-xl font-bold text-text-primary">{value}</p></div>)}</div><div className="mt-5 grid gap-5 sm:grid-cols-2"><div><h3 className="font-semibold text-text-primary">Popular events</h3><ol className="mt-2 space-y-2 text-sm text-text-body">{popular.map((item) => <li key={item.id}>{item.title} · {item.confirmedEntries} confirmed · {item.waitlistEntries} waitlisted</li>)}</ol></div><div><h3 className="font-semibold text-text-primary">Help-desk outcomes</h3><p className="mt-2 text-sm text-text-body">{report.data.helpDesk.new} new · {report.data.helpDesk.assigned} assigned · {report.data.helpDesk.resolved} resolved</p><Link to="/help-desk" className="mt-2 inline-block text-sm text-accent hover:underline">Open queue</Link></div></div><div className="mt-5 flex flex-wrap items-center gap-3"><Button variant="secondary" disabled={summaryLoading} onClick={() => { void explainReport() }}>{summaryLoading ? 'Summarizing...' : 'Generate optional summary'}</Button><span className="text-xs text-text-muted">AI is optional; a calculated summary is always available.</span></div>{summary && <div role="status" className="mt-3 rounded-xl border border-border-subtle bg-surface-raised p-4 text-sm text-text-body"><p className="text-xs font-semibold uppercase text-accent">{summary.aiAvailable ? 'AI summary' : 'Calculated summary'}</p><p className="mt-2 whitespace-pre-wrap">{summary.answer}</p></div>}<p className="mt-5 text-xs text-text-muted">Calculated {new Date(report.data.generatedAt).toLocaleString()}.</p></> : null}</section>
  </main>
}
