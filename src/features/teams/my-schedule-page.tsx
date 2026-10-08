import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Download, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/states/page-states'
import { Button } from '../../components/ui/button'
import { getSupabaseClient } from '../../supabase/client'
import { useAuth } from '../auth'

type ScheduleEntry = {
  registration_id: string
  event_id: string
  event_title: string
  starts_at: string
  ends_at: string
  venue: string | null
  registration_mode: 'individual' | 'team'
  team_name: string | null
  club_slug: string
  fest_slug: string
  event_slug: string
  timezone: string
}

function escapeCalendarText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function calendarDate(value: string): string {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function exportCalendar(entries: ScheduleEntry[]) {
  const stamp = calendarDate(new Date().toISOString())
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Festivo//My Schedule//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
  for (const entry of entries) {
    lines.push('BEGIN:VEVENT', `UID:${entry.registration_id}@festivo`, `DTSTAMP:${stamp}`,
      `DTSTART:${calendarDate(entry.starts_at)}`, `DTEND:${calendarDate(entry.ends_at)}`,
      `SUMMARY:${escapeCalendarText(entry.event_title)}`,
      `DESCRIPTION:${escapeCalendarText(entry.team_name ? `Team: ${entry.team_name}` : 'Confirmed Festivo registration')}`,
      `LOCATION:${escapeCalendarText(entry.venue || '')}`, 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  const blob = new Blob([`${lines.join('\r\n')}\r\n`], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'festivo-my-schedule.ics'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function MySchedulePage() {
  const { user } = useAuth()
  const schedule = useQuery({
    queryKey: ['participant', 'confirmed-schedule', user?.id],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().rpc('my_confirmed_schedule')
      if (error) throw error
      return (data ?? []) as ScheduleEntry[]
    },
    enabled: Boolean(user?.id), staleTime: 20_000,
  })
  if (schedule.isLoading) return <LoadingState label="Loading your schedule..." />
  if (schedule.isError) return <div className="content-container py-10"><ErrorState title="Could not load schedule" description={schedule.error instanceof Error ? schedule.error.message : 'Please try again.'} onRetry={() => { void schedule.refetch() }} /></div>
  const entries = schedule.data ?? []
  return <div className="content-container space-y-7 py-8 sm:py-10">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-6">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">Participant workspace</p>
        <h1 className="font-heading mt-2 text-3xl font-bold text-[var(--color-text-primary)]">My Schedule</h1>
        <p className="mt-2 text-sm text-[var(--color-text-body)]">Your confirmed individual events and accepted team registrations, ordered by start time.</p></div>
      {entries.length > 0 && <Button variant="secondary" className="min-h-11" onClick={() => exportCalendar(entries)}><Download className="h-4 w-4" /> Export calendar</Button>}
    </header>
    {entries.length === 0 ? <EmptyState title="No confirmed events yet" description="Confirmed registrations appear here. Waitlisted and cancelled entries remain in My Registrations." action={<Link to="/events"><Button>Explore events</Button></Link>} /> :
      <ol className="space-y-4">{entries.map((entry) => <li key={entry.registration_id} className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 sm:p-6">
        <p className="flex items-center gap-2 text-xs font-semibold text-[var(--color-accent)]"><CalendarDays className="h-4 w-4" /> {new Date(entry.starts_at).toLocaleString()} – {new Date(entry.ends_at).toLocaleTimeString()}</p>
        <h2 className="font-heading mt-3 text-lg font-bold text-[var(--color-text-primary)]">{entry.event_title}</h2>
        <p className="mt-1 text-xs text-[var(--color-text-body)]">{entry.registration_mode === 'team' ? `Team · ${entry.team_name || 'Registered team'}` : 'Individual registration'}</p>
        {entry.venue && <p className="mt-2 flex items-center gap-2 text-xs text-[var(--color-text-muted)]"><MapPin className="h-4 w-4" /> {entry.venue}</p>}
        <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-[var(--color-accent)]"><Link to={`/fests/${entry.club_slug}/${entry.fest_slug}/events/${entry.event_slug}`} className="inline-flex min-h-11 items-center hover:underline">Event details</Link><Link to={`/my-registrations/${entry.registration_id}`} className="inline-flex min-h-11 items-center hover:underline">Registration</Link></div>
      </li>)}</ol>}
  </div>
}
