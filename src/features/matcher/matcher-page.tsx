import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/states/page-states'
import { Button } from '../../components/ui/button'
import { getSupabaseClient } from '../../supabase/client'
import { useAuth } from '../auth'
import { usePublicEventDirectoryQuery } from '../directory'
import { rankEvent, type MatchFacts } from './match-rules'

export function EventMatcherPage() {
  const { user, profile } = useAuth()
  const events = usePublicEventDirectoryQuery()
  const facts = useQuery({
    queryKey: ['participant', 'event-match-facts', user?.id],
    queryFn: async () => { const { data, error } = await getSupabaseClient().rpc('my_event_match_facts'); if (error) throw error; return (data ?? []) as MatchFacts[] },
    enabled: Boolean(user), staleTime: 30_000,
  })
  const matches = useMemo(() => {
    const byId = new Map((facts.data ?? []).map((fact) => [fact.event_id, fact]))
    return (events.data ?? []).flatMap((event) => {
      const fact = byId.get(event.id)
      return fact ? [rankEvent(event, profile, fact)] : []
    }).sort((a, b) => b.score - a.score || a.event.startsAt.localeCompare(b.event.startsAt))
  }, [events.data, facts.data, profile])

  if (events.isLoading || facts.isLoading) return <LoadingState label="Checking your event matches..." />
  if (events.isError || facts.isError) return <div className="content-container py-10"><ErrorState title="Could not match events" description={(events.error ?? facts.error)?.message ?? 'Please try again.'} onRetry={() => { void events.refetch(); void facts.refetch() }} /></div>

  return <main className="content-container space-y-7 py-8 sm:py-10"><header className="border-b border-[var(--color-border-subtle)] pb-6"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent"><Sparkles className="h-4 w-4" /> Participant workspace</p><h1 className="font-heading mt-2 text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">AI Event Matcher</h1><p className="mt-2 max-w-3xl text-sm text-[var(--color-text-body)]">Matches are scored from your interests, skills, experience, current availability, and confirmed schedule. Eligibility and conflict rules come from the database. The rule-based rankings remain available when AI is offline.</p></header>
    {!matches.length ? <EmptyState title="No upcoming published matches" description="Check the event directory later or complete your profile to improve future matches." action={<Link to="/events"><Button>Explore events</Button></Link>} /> : <section aria-label="Ranked event matches" className="grid gap-4 md:grid-cols-2">{matches.map((match) => <article key={match.event.id} className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-accent">{match.event.club.name} · {match.event.fest.title}</p><h2 className="font-heading mt-2 text-xl font-bold text-[var(--color-text-primary)]">{match.event.title}</h2></div><div className="shrink-0 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-center"><strong className="text-xl text-accent">{match.score}</strong><span className="block text-[10px] text-[var(--color-text-muted)]">/ 100</span></div></div><p className="mt-2 text-xs text-[var(--color-text-muted)]">{new Date(match.event.startsAt).toLocaleString()} · {match.event.registrationMode === 'team' ? 'Team' : 'Individual'} · {match.event.availability?.registrationState.replaceAll('_', ' ') ?? 'Unavailable'}</p><div className="mt-4"><h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-primary)]">Why it matches</h3><ul className="mt-2 space-y-1 text-sm text-[var(--color-text-body)]">{match.reasons.map((reason) => <li key={reason}>• {reason}</li>)}</ul></div><div className="mt-4"><h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-primary)]">Requirements</h3><ul className="mt-2 space-y-1 text-sm text-[var(--color-text-body)]">{match.requirements.length ? match.requirements.map((requirement) => <li key={requirement}>• {requirement}</li>) : <li>• Review the event rules before registering</li>}</ul></div><Link to={`/fests/${match.event.club.slug}/${match.event.fest.slug}/events/${match.event.slug}`} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent hover:underline">{match.action} <ArrowRight className="h-4 w-4" /></Link></article>)}</section>}
    <p className="text-xs text-[var(--color-text-muted)]">Scores are recommendations, not authorization. Final eligibility, team roster, capacity, and schedule rules are rechecked at registration.</p>
  </main>
}
