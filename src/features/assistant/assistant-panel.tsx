import { useState, type FormEvent } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { getSupabaseClient } from '../../supabase/client'
import type { AnalyticsFilters, AnalyticsSnapshot } from '../analytics/analytics-api'

type Reply = { answer: string; aiAvailable: boolean; note: string | null }

export function CopilotPanel({ filters, snapshot }: { filters: AnalyticsFilters; snapshot: AnalyticsSnapshot }) {
  const [question, setQuestion] = useState('What should I pay attention to?')
  const [reply, setReply] = useState<Reply | null>(null)
  const [loading, setLoading] = useState(false)
  const fallback = `Calculated results remain available above: ${snapshot.metrics.confirmedEntries} confirmed entries, ${snapshot.metrics.waitlistEntries} waitlisted entries, and ${snapshot.metrics.checkedInPeople}/${snapshot.metrics.confirmedRegisteredPeople} checked-in/confirmed people-places (${snapshot.metrics.attendanceRate}% attendance).`

  async function ask(event: FormEvent) {
    event.preventDefault()
    if (!question.trim()) return
    setLoading(true)
    setReply(null)
    try {
      const { data, error } = await getSupabaseClient().functions.invoke('organizer-copilot', {
        body: { organizationId: filters.organizationId, festId: filters.festId, eventId: filters.eventId,
          dateFrom: filters.dateFrom, dateTo: filters.dateTo, question: question.trim() },
      })
      if (error) throw error
      setReply({ answer: data.answer, aiAvailable: Boolean(data.aiAvailable), note: data.note ?? null })
    } catch { setReply({ answer: fallback, aiAvailable: false, note: 'Copilot service is unavailable. Calculated analytics are unaffected.' }) }
    finally { setLoading(false) }
  }

  return <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 sm:p-6"><h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-[var(--color-text-primary)]"><Sparkles className="h-5 w-5 text-accent" /> Organizer Copilot</h2><p className="mt-2 text-sm text-[var(--color-text-body)]">Ask for an explanation of the calculated, currently filtered metrics. Copilot cannot change records or register anyone.</p><form onSubmit={(event) => { void ask(event) }} className="mt-4 flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor="copilot-question">Question for Organizer Copilot</label><input id="copilot-question" maxLength={1000} value={question} onChange={(event) => setQuestion(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-3 text-sm text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" /><Button disabled={loading || !question.trim()} type="submit">{loading ? 'Explaining...' : 'Explain metrics'}</Button></form>{reply && <div role="status" className="mt-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4 text-sm text-[var(--color-text-body)]"><p className="text-xs font-semibold uppercase tracking-wide text-accent">{reply.aiAvailable ? 'AI explanation' : 'Calculated fallback'}</p><p className="mt-2 whitespace-pre-wrap">{reply.answer}</p>{reply.note && <p className="mt-2 text-xs text-[var(--color-text-muted)]">{reply.note}</p>}</div>}</section>
}
