import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bot, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { getSupabaseClient } from '../../supabase/client'
import { useAuth } from '../auth'
import { usePublicEventDirectoryQuery } from '../directory'

type Reply = { question: string; answer: string; aiAvailable: boolean; note: string | null }

export function AssistantPage() {
  const { user, profile } = useAuth()
  const [question, setQuestion] = useState('What events can I explore?')
  const [reply, setReply] = useState<Reply | null>(null)
  const [loading, setLoading] = useState(false)
  const events = usePublicEventDirectoryQuery()
  const schedule = useQuery({
    queryKey: ['participant', 'confirmed-schedule', user?.id],
    queryFn: async () => { const { data, error } = await getSupabaseClient().rpc('my_confirmed_schedule'); if (error) throw error; return data ?? [] },
    enabled: Boolean(user), staleTime: 20_000,
  })

  async function ask(event: FormEvent) {
    event.preventDefault()
    if (!question.trim()) return
    setLoading(true)
    setReply(null)
    const currentQuestion = question.trim()
    try {
      const { data, error } = await getSupabaseClient().functions.invoke('festivo-assistant', { body: { question: currentQuestion } })
      if (error) throw error
      setReply({ question: currentQuestion, answer: data.answer, aiAvailable: Boolean(data.aiAvailable), note: data.note ?? null })
    } catch {
      const open = (events.data ?? []).filter((item) => item.availability?.registrationState === 'open')
      const answer = `Your current schedule has ${schedule.data?.length ?? 0} confirmed event(s). ${open.length ? `Open published events include ${open.slice(0, 3).map((item) => item.title).join(', ')}.` : 'Browse the event directory for current openings.'} Event Matcher can check eligibility and conflicts before you act.`
      setReply({ question: currentQuestion, answer, aiAvailable: false, note: 'Assistant service unavailable; this is a read-only catalog and schedule fallback.' })
    } finally { setLoading(false) }
  }

  return <main className="content-container max-w-4xl space-y-7 py-8 sm:py-10"><header className="border-b border-[var(--color-border-subtle)] pb-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Participant workspace</p><h1 className="font-heading mt-2 flex items-center gap-3 text-3xl font-bold text-[var(--color-text-primary)]"><Bot className="h-8 w-8 text-accent" /> Festivo Assistant</h1><p className="mt-2 text-sm text-[var(--color-text-body)]">Ask about your current schedule and published events. Answers are informational; the assistant never registers you or changes data.</p></header>
    <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 sm:p-7"><p className="text-sm text-[var(--color-text-body)]">Hello, {profile?.full_name?.split(' ')[0] || 'participant'}. You have <strong className="text-[var(--color-text-primary)]">{schedule.data?.length ?? 0}</strong> confirmed events on your schedule. <Link to="/event-matcher" className="font-semibold text-accent hover:underline">Explore matched events</Link>.</p><form onSubmit={(event) => { void ask(event) }} className="mt-5 flex flex-col gap-2 sm:flex-row"><label htmlFor="assistant-question" className="sr-only">Ask Festivo Assistant</label><input id="assistant-question" maxLength={1000} value={question} onChange={(event) => setQuestion(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-3 text-sm text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" /><Button type="submit" disabled={loading || !question.trim()}><Send className="mr-2 h-4 w-4" />{loading ? 'Thinking...' : 'Ask'}</Button></form>{reply && <div role="status" className="mt-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4"><p className="text-xs font-semibold text-accent">{reply.aiAvailable ? 'AI answer' : 'Rule-based answer'}</p><p className="mt-2 text-sm text-[var(--color-text-body)]">{reply.answer}</p>{reply.note && <p className="mt-2 text-xs text-[var(--color-text-muted)]">{reply.note}</p>}</div>}</div>
  </main>
}
