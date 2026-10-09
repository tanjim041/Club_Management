import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { CalendarClock, MapPin, Radio, RefreshCw, Ticket } from 'lucide-react'
import { getSupabaseClient } from '../../supabase/client'
import { useAuth } from '../auth'
import { Button } from '../../components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '../../components/states/page-states'

async function loadLiveFest(clubSlug: string, festSlug: string, signedIn: boolean) {
  const client = getSupabaseClient()
  const { data: club, error: clubError } = await client.from('organizations').select('id,name,slug').eq('slug', clubSlug).maybeSingle()
  if (clubError) throw clubError
  if (!club) return null
  const { data: fest, error: festError } = await client.from('fests').select('id,title,slug,starts_at,ends_at,location_name,timezone').eq('organization_id', club.id).eq('slug', festSlug).eq('status', 'published').maybeSingle()
  if (festError) throw festError
  if (!fest) return null
  const [eventsResult, scheduleResult, announcementsResult, legacyResult, passesResult] = await Promise.all([
    client.from('events').select('id,title,slug,starts_at,ends_at,venue,operational_status,updated_at,published_at').eq('fest_id', fest.id).eq('status', 'published').order('starts_at'),
    client.from('fest_schedule_items').select('id,title,description,starts_at,ends_at,venue,updated_at,published_at').eq('fest_id', fest.id).eq('is_published', true).order('starts_at'),
    client.from('operational_announcements').select('id,title,body,audience,published_at,fest_id,event_id').eq('organization_id', club.id).or(`fest_id.is.null,fest_id.eq.${fest.id}`).order('published_at', { ascending: false }).limit(50),
    client.from('fest_announcements').select('id,title,body,published_at').eq('fest_id', fest.id).eq('is_published', true).order('published_at', { ascending: false }).limit(30),
    signedIn ? client.rpc('my_digital_passes') : Promise.resolve({ data: [], error: null }),
  ])
  for (const result of [eventsResult, scheduleResult, announcementsResult, legacyResult, passesResult]) if (result.error) throw result.error
  const events = eventsResult.data ?? []
  const relevantAnnouncements = (announcementsResult.data ?? []).filter((item) => !item.fest_id || item.fest_id === fest.id)
  const publicAnnouncements = relevantAnnouncements.filter((item) => item.audience === 'public')
  const privateAnnouncements = relevantAnnouncements.filter((item) => item.audience === 'registered')
  const passes = (passesResult.data ?? []).filter((pass) => events.some((event) => event.id === pass.event_id) && !pass.revoked_at)
  return { club, fest, events, schedule: scheduleResult.data ?? [], publicAnnouncements, privateAnnouncements,
    legacyAnnouncements: legacyResult.data ?? [], passes, fetchedAt: new Date().toISOString() }
}

export function LiveFestPage() {
  const { clubSlug = '', festSlug = '' } = useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [clock, setClock] = useState(0)
  const [realtime, setRealtime] = useState(false)
  const key = useMemo(() => ['live-fest', clubSlug, festSlug, user?.id], [clubSlug, festSlug, user?.id])
  const query = useQuery({ queryKey: key, queryFn: () => loadLiveFest(clubSlug, festSlug, Boolean(user)), enabled: Boolean(clubSlug && festSlug), refetchInterval: 30_000, refetchOnWindowFocus: true })
  const festId = query.data?.fest.id
  const orgId = query.data?.club.id
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 30_000); return () => window.clearInterval(timer) }, [])
  useEffect(() => {
    if (!festId || !orgId) return
    const client = getSupabaseClient()
    const refresh = () => { void queryClient.invalidateQueries({ queryKey: key }) }
    const channel = client.channel(`live-fest-${festId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `fest_id=eq.${festId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fest_schedule_items', filter: `fest_id=eq.${festId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operational_announcements', filter: `organization_id=eq.${orgId}` }, refresh)
      .subscribe((status) => setRealtime(status === 'SUBSCRIBED'))
    return () => { setRealtime(false); void client.removeChannel(channel) }
  }, [festId, orgId, key, queryClient])
  if (query.isLoading) return <LoadingState label="Loading live fest..." />
  if (query.isError) return <div className="content-container py-10"><ErrorState title="Live updates unavailable" description={query.error.message} onRetry={() => { void query.refetch() }} /></div>
  const data = query.data
  if (!data) return <div className="content-container py-10"><EmptyState title="Fest not found" description="This fest is not publicly available." action={<Link to="/fests"><Button>Explore fests</Button></Link>} /></div>
  const now = clock || new Date(data.fetchedAt).getTime()
  const happening = data.events.filter((event) => new Date(event.starts_at).getTime() <= now && new Date(event.ends_at).getTime() > now && event.operational_status !== 'cancelled')
  const coming = data.events.filter((event) => new Date(event.starts_at).getTime() > now && event.operational_status !== 'cancelled').slice(0, 5)
  const nextPass = [...data.passes].filter((pass) => data.events.some((event) => event.id === pass.event_id && new Date(event.ends_at).getTime() > now)).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0]
  const venues = [...new Set([...data.events.map((event) => event.venue), ...data.schedule.map((item) => item.venue)].filter((venue): venue is string => Boolean(venue)))]
  const changes = [...data.schedule, ...data.events].filter((item) => item.published_at && new Date(item.updated_at).getTime() > new Date(item.published_at).getTime() + 1000)
  return <main className="content-container space-y-7 py-8 sm:py-10">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border-subtle pb-6"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent"><Radio className="h-4 w-4" /> Live Fest Mode</p><h1 className="font-heading mt-2 text-3xl font-bold text-text-primary sm:text-4xl">{data.fest.title}</h1><p className="mt-2 text-sm text-text-body">Hosted by {data.club.name} · {data.fest.location_name || 'Venue to be announced'}</p></div><Button variant="secondary" onClick={() => { void query.refetch() }}><RefreshCw className="h-4 w-4" /> Refresh</Button></header>
    <p role="status" className="text-xs text-text-muted">{realtime ? 'Realtime connected' : 'Checking for updates every 30 seconds'} · Last updated {new Date(data.fetchedAt).toLocaleTimeString()}</p>
    {user && <section className="rounded-2xl border border-accent/40 bg-accent/10 p-5"><h2 className="font-heading text-lg font-semibold text-text-primary">Your next event</h2>{nextPass ? <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-text-body">{nextPass.event_title} · {new Date(nextPass.starts_at).toLocaleString()}</p><Link to="/my-passes"><Button><Ticket className="h-4 w-4" /> Open pass</Button></Link></div> : <p className="mt-2 text-sm text-text-body">No upcoming confirmed pass for this fest.</p>}</section>}
    <div className="grid gap-5 lg:grid-cols-2"><LiveSection title="Happening now" items={happening} clubSlug={clubSlug} festSlug={festSlug} empty="No event is in progress right now." /><LiveSection title="Coming next" items={coming} clubSlug={clubSlug} festSlug={festSlug} empty="No more upcoming events are published." /></div>
    <section className="grid gap-5 lg:grid-cols-2"><article className="rounded-2xl border border-border-subtle bg-surface p-5"><h2 className="font-heading text-lg font-semibold text-text-primary">Venues</h2>{venues.length ? <ul className="mt-3 space-y-2">{venues.map((venue) => <li key={venue} className="flex gap-2 text-sm text-text-body"><MapPin className="h-4 w-4 shrink-0 text-accent" /> {venue}</li>)}</ul> : <p className="mt-3 text-sm text-text-muted">Venues will appear as the program is published.</p>}</article><article className="rounded-2xl border border-border-subtle bg-surface p-5"><h2 className="font-heading text-lg font-semibold text-text-primary">Schedule changes</h2>{changes.length ? <ul className="mt-3 space-y-3">{changes.map((item) => <li key={item.id} className="text-sm text-text-body"><span className="font-semibold text-text-primary">{item.title}</span><br />{new Date(item.starts_at).toLocaleString()} · {item.venue || 'Venue TBA'}</li>)}</ul> : <p className="mt-3 text-sm text-text-muted">No published schedule changes.</p>}</article></section>
    <section className="rounded-2xl border border-border-subtle bg-surface p-5"><h2 className="font-heading text-lg font-semibold text-text-primary">Announcements</h2>{[...data.privateAnnouncements, ...data.publicAnnouncements, ...data.legacyAnnouncements.map((item) => ({ ...item, audience: 'public' as const, fest_id: data.fest.id, event_id: null }))].length ? <ul className="mt-4 space-y-3">{[...data.privateAnnouncements, ...data.publicAnnouncements, ...data.legacyAnnouncements.map((item) => ({ ...item, audience: 'public' as const, fest_id: data.fest.id, event_id: null }))].sort((a, b) => (b.published_at || '').localeCompare(a.published_at || '')).map((item) => <li key={item.id} className="rounded-xl border border-border-subtle bg-surface-raised p-4"><p className="text-xs text-text-muted">{item.audience === 'registered' ? 'Registered participants' : 'Public'} · {item.published_at ? new Date(item.published_at).toLocaleString() : 'Published'}</p><h3 className="mt-1 font-semibold text-text-primary">{item.title}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-text-body">{item.body}</p></li>)}</ul> : <p className="mt-3 text-sm text-text-muted">No announcements yet.</p>}</section>
    <div className="flex flex-wrap gap-3"><Link to={`/fests/${clubSlug}/${festSlug}`}><Button variant="secondary">Fest details</Button></Link>{user && <Link to="/help-desk"><Button variant="secondary">Contact help desk</Button></Link>}</div>
  </main>
}

function LiveSection({ title, items, clubSlug, festSlug, empty }: { title: string; items: { id: string; title: string; slug: string; starts_at: string; ends_at: string; venue: string | null }[]; clubSlug: string; festSlug: string; empty: string }) {
  return <section className="rounded-2xl border border-border-subtle bg-surface p-5"><h2 className="font-heading flex items-center gap-2 text-lg font-semibold text-text-primary"><CalendarClock className="h-5 w-5 text-accent" /> {title}</h2>{items.length ? <ul className="mt-3 space-y-3">{items.map((event) => <li key={event.id} className="rounded-xl border border-border-subtle bg-surface-raised p-3"><Link className="font-semibold text-text-primary hover:text-accent" to={`/fests/${clubSlug}/${festSlug}/events/${event.slug}`}>{event.title}</Link><p className="mt-1 text-xs text-text-body">{new Date(event.starts_at).toLocaleString()} – {new Date(event.ends_at).toLocaleTimeString()} · {event.venue || 'Venue TBA'}</p></li>)}</ul> : <p className="mt-3 text-sm text-text-muted">{empty}</p>}</section>
}
