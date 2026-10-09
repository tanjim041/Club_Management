import { useState, useRef, useEffect, type FormEvent, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Lock,
  MapPin,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  User,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { getSupabaseClient } from '../../supabase/client'
import { useAuth } from '../auth'
import { usePublicEventDirectoryQuery } from '../directory'

interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  aiAvailable?: boolean
  note?: string | null
  isPersonalPrompt?: boolean
  timestamp: string
}

interface ExamplePrompt {
  id: string
  category: string
  label: string
  question: string
  icon: typeof Calendar
  isPersonal?: boolean
}

const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    id: 'rules',
    category: 'Event Rules',
    label: 'Eligibility & Rules',
    question: 'What are the eligibility rules and guidelines for competitions?',
    icon: FileText,
  },
  {
    id: 'deadlines',
    category: 'Deadlines',
    label: 'Registration Deadlines',
    question: 'When are the upcoming registration deadlines for campus fests?',
    icon: Clock,
  },
  {
    id: 'venues',
    category: 'Venues',
    label: 'Event Locations & Venues',
    question: 'Where are the events and tournament venues located?',
    icon: MapPin,
  },
  {
    id: 'recommendations',
    category: 'Recommendations',
    label: 'Event Recommendations',
    question: 'What events can I explore based on my interests?',
    icon: Sparkles,
  },
  {
    id: 'schedule',
    category: 'My Schedule',
    label: 'My Confirmed Schedule',
    question: 'What is my confirmed schedule for upcoming events?',
    icon: Calendar,
    isPersonal: true,
  },
]

let msgSeq = 0
function nextMsgId(prefix: string): string {
  msgSeq += 1
  return `${prefix}-${msgSeq}`
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome',
    sender: 'assistant',
    text: "Hello! I'm your Festivo AI Assistant. I can help you explore campus fests, understand competition rules, check deadlines, locate venues, and look up your schedule. What would you like to know today?",
    aiAvailable: true,
    timestamp: 'Just now',
  },
]

export function AssistantPage() {
  const { user, profile } = useAuth()
  const isSignedIn = Boolean(user)
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [inputQuestion, setInputQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [simulateOffline, setSimulateOffline] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const events = usePublicEventDirectoryQuery()
  const schedule = useQuery({
    queryKey: ['participant', 'confirmed-schedule', user?.id],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().rpc('my_confirmed_schedule')
      if (error) throw error
      return data ?? []
    },
    enabled: isSignedIn,
    staleTime: 20_000,
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function isPersonalQuery(text: string): boolean {
    return /\bmy\b.*?\b(schedule|registration|registrations|pass|passes|team|teams)|am\s+i\s+registered/i.test(text)
  }

  async function handleSend(textToSend?: string) {
    const rawQuestion = (textToSend ?? inputQuestion).trim()
    if (!rawQuestion || loading) return

    setErrorMessage(null)
    setInputQuestion('')

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMessage: ChatMessage = {
      id: nextMsgId('user'),
      sender: 'user',
      text: rawQuestion,
      timestamp: timeStr,
    }

    setMessages((prev) => [...prev, userMessage])
    setLoading(true)

    // Check if query is personal and user is not signed in
    if (!isSignedIn && isPersonalQuery(rawQuestion)) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: nextMsgId('asst'),
            sender: 'assistant',
            text: 'Sign-in required: To view your personal confirmed schedule, registered events, or digital passes, please sign in to your Festivo participant account.',
            aiAvailable: false,
            note: 'Personal data requires active authentication.',
            isPersonalPrompt: true,
            timestamp: timeStr,
          },
        ])
        setLoading(false)
      }, 400)
      return
    }

    // If simulate offline fallback is enabled
    if (simulateOffline) {
      setTimeout(() => {
        const openEvents = (events.data ?? []).filter((item) => item.availability?.registrationState === 'open')
        const schedCount = schedule.data?.length ?? 0
        const answer = isSignedIn
          ? `[Offline Fallback] You currently have ${schedCount} confirmed schedule item(s). Open events include: ${openEvents.slice(0, 3).map((e) => `${e.title} (/events)`).join(', ')}. Review event matcher for detailed compatibility.`
          : `[Offline Fallback] Published campus events available for registration: ${openEvents.slice(0, 3).map((e) => `${e.title} (/events)`).join(', ')}. Sign in to access your personal schedule.`
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        setMessages((prev) => [
          ...prev,
          {
            id: nextMsgId('asst'),
            sender: 'assistant',
            text: answer,
            aiAvailable: false,
            note: 'Simulated fallback mode active; rule-based calculation used.',
            timestamp: timeNow,
          },
        ])
        setLoading(false)
      }, 500)
      return
    }

    try {
      const { data, error } = await getSupabaseClient().functions.invoke('festivo-assistant', {
        body: { question: rawQuestion },
      })
      if (error) throw error

      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setMessages((prev) => [
        ...prev,
        {
          id: nextMsgId('asst'),
          sender: 'assistant',
          text: data.answer || 'No answer available.',
          aiAvailable: Boolean(data.aiAvailable),
          note: data.note ?? null,
          timestamp: timeNow,
        },
      ])
    } catch {
      const open = (events.data ?? []).filter((item) => item.availability?.registrationState === 'open')
      const answer = isSignedIn
        ? `Your current schedule has ${schedule.data?.length ?? 0} confirmed event(s). ${open.length ? `Open published events include ${open.slice(0, 3).map((item) => item.title).join(', ')}.` : 'Browse the event directory for current openings.'} Event Matcher can check eligibility and conflicts before you act.`
        : `Published campus events include: ${open.slice(0, 3).map((item) => item.title).join(', ')}. Sign in to view your personalized schedule and digital passes.`
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setMessages((prev) => [
        ...prev,
        {
          id: nextMsgId('asst'),
          sender: 'assistant',
          text: answer,
          aiAvailable: false,
          note: 'Assistant service temporarily unavailable; this is a deterministic rule-based catalog and schedule fallback.',
          timestamp: timeNow,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    void handleSend()
  }

  function handleClearChat() {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: "Chat cleared. What else can I help you discover about Festivo fests, rules, or your schedule?",
        aiAvailable: true,
        timestamp: 'Just now',
      },
    ])
    setErrorMessage(null)
  }

  // Safe formatter that turns relative event links and markdown styling into interactive components
  function renderFormattedText(content: string): ReactNode {
    const lines = content.split('\n')
    return (
      <div className="space-y-2 text-sm leading-relaxed">
        {lines.map((line, lIdx) => {
          const trimmed = line.trim()
          if (!trimmed) return <div key={lIdx} className="h-1" />

          // Detect list items
          const isListItem = trimmed.startsWith('* ') || trimmed.startsWith('- ')
          const cleanLine = isListItem ? trimmed.slice(2) : line

          // Parse markdown bold and relative urls
          const parts: ReactNode[] = []
          // Regex matching URLs like /fests/.../events/... or markdown links [text](url)
          const tokenRegex = /(\[[^\]]+\]\(\/[^)]+\)|\/[a-zA-Z0-9_/-]+|\*\*[^*]+\*\*)/g
          let lastIndex = 0
          let match: RegExpExecArray | null

          while ((match = tokenRegex.exec(cleanLine)) !== null) {
            if (match.index > lastIndex) {
              parts.push(cleanLine.substring(lastIndex, match.index))
            }

            const token = match[0]
            if (token.startsWith('[') && token.includes('](')) {
              // Markdown link [Title](/path)
              const titleMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/)
              if (titleMatch) {
                parts.push(
                  <Link
                    key={`${lIdx}-${match.index}`}
                    to={titleMatch[2]}
                    className="inline-flex items-center gap-1 font-semibold text-accent underline hover:text-accent/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  >
                    <span>{titleMatch[1]}</span>
                    <ExternalLink className="h-3 w-3 inline" />
                  </Link>
                )
              }
            } else if (token.startsWith('/fests/') || token.startsWith('/events') || token.startsWith('/clubs')) {
              // Raw relative path
              parts.push(
                <Link
                  key={`${lIdx}-${match.index}`}
                  to={token}
                  className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2 py-0.5 font-mono text-xs font-semibold text-accent hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  <span>{token}</span>
                  <ExternalLink className="h-2.5 w-2.5 inline" />
                </Link>
              )
            } else if (token.startsWith('**') && token.endsWith('**')) {
              // Bold text
              parts.push(
                <strong key={`${lIdx}-${match.index}`} className="font-semibold text-text-primary">
                  {token.slice(2, -2)}
                </strong>
              )
            } else {
              parts.push(token)
            }

            lastIndex = tokenRegex.lastIndex
          }

          if (lastIndex < cleanLine.length) {
            parts.push(cleanLine.substring(lastIndex))
          }

          if (isListItem) {
            return (
              <div key={lIdx} className="flex items-start gap-2 pl-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <div className="flex-1">{parts}</div>
              </div>
            )
          }

          return <p key={lIdx}>{parts}</p>
        })}
      </div>
    )
  }

  return (
    <main className="content-container max-w-4xl space-y-6 py-6 sm:py-10">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-border-subtle pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-0.5 text-xs font-semibold text-accent">
              <Bot className="h-3.5 w-3.5" />
              Ask Festivo
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface px-2.5 py-0.5 text-[11px] text-text-secondary">
              <Sparkles className="h-3 w-3 text-accent" />
              Powered by Gemini
            </span>
          </div>
          <h1 className="font-heading mt-2 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            Campus AI Assistant
          </h1>
          <p className="mt-1 text-xs text-text-secondary sm:text-sm">
            Instant answers on event rules, deadlines, venues, recommendations, and your confirmed schedule.
          </p>
        </div>

        {/* Header Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:self-end">
          <Button
            type="button"
            variant={simulateOffline ? 'danger' : 'outline'}
            size="sm"
            onClick={() => setSimulateOffline((prev) => !prev)}
            className="text-xs"
            title="Toggle fallback simulation to test behavior when provider is unavailable"
          >
            <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
            {simulateOffline ? 'Offline Mode Active' : 'Test Fallback Mode'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="text-xs text-text-secondary hover:text-text-primary"
            title="Clear chat history"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset Chat
          </Button>
        </div>
      </header>

      {/* Account Context Banner */}
      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-border-subtle bg-surface p-4 text-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-raised text-accent">
            {isSignedIn ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Lock className="h-4 w-4 text-text-muted" />}
          </span>
          <div>
            {isSignedIn ? (
              <p className="font-medium text-text-primary">
                Signed in as <strong className="text-accent">{profile?.full_name || user?.email}</strong>
                <span className="ml-2 text-text-secondary">
                  ({schedule.data?.length ?? 0} confirmed schedule items)
                </span>
              </p>
            ) : (
              <p className="text-text-secondary">
                Browsing as <strong className="text-text-primary">Visitor</strong>. Personal schedule and pass queries require signing in.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isSignedIn ? (
            <Link to="/my-schedule" className="font-medium text-accent hover:underline">
              View Schedule &rarr;
            </Link>
          ) : (
            <Link
              to="/login?redirect=/assistant"
              className="rounded-lg bg-accent/15 px-3 py-1 font-semibold text-accent hover:bg-accent/25"
            >
              Sign In to Festivo
            </Link>
          )}
        </div>
      </div>

      {/* Suggested Questions Section */}
      <section aria-label="Suggested Questions" className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Suggested Questions
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((prompt) => {
            const Icon = prompt.icon
            return (
              <button
                key={prompt.id}
                type="button"
                onClick={() => void handleSend(prompt.question)}
                disabled={loading}
                className="group inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-surface px-3 py-2 text-left text-xs text-text-body transition-colors hover:border-accent hover:bg-surface-raised hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
              >
                <Icon className="h-3.5 w-3.5 text-accent transition-transform group-hover:scale-110" />
                <span className="font-medium">{prompt.label}</span>
                {prompt.isPersonal && !isSignedIn && (
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] text-amber-300">
                    Sign-in
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Chat Conversation Thread */}
      <section
        aria-label="Conversation"
        className="flex min-h-[420px] max-h-[580px] flex-col rounded-2xl border border-border-subtle bg-surface"
      >
        {/* Messages Stream */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" role="log" aria-live="polite">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user'

            return (
              <div
                key={msg.id}
                data-message-sender={msg.sender}
                data-message-id={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-surface-raised border border-border-subtle text-accent">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                    isUser
                      ? 'rounded-tr-none bg-accent/20 border border-accent/40 text-text-primary'
                      : 'rounded-tl-none bg-surface-raised border border-border-subtle text-text-body'
                  }`}
                >
                  {/* Status header for assistant messages */}
                  {!isUser && (
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-1.5 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        {msg.aiAvailable ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-accent">
                            <Sparkles className="h-3 w-3" />
                            AI Reply
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                            <ShieldAlert className="h-3 w-3" />
                            Rule-Based Fallback
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-text-muted">{msg.timestamp}</span>
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="text-sm">
                    {isUser ? <p className="whitespace-pre-wrap">{msg.text}</p> : renderFormattedText(msg.text)}
                  </div>

                  {/* Note banner if fallback or advisory note exists */}
                  {!isUser && msg.note && (
                    <div className="mt-2.5 rounded-lg border border-border-subtle bg-page/40 p-2 text-[11px] text-text-muted">
                      <em>Note:</em> {msg.note}
                    </div>
                  )}

                  {/* Dedicated Sign-In Callout if message prompted sign-in */}
                  {!isUser && msg.isPersonalPrompt && (
                    <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                      <p className="font-semibold text-amber-200">Participant Authentication Needed</p>
                      <p className="mt-1 text-amber-300/90">
                        Sign in to view your registrations, roster snapshots, and active event entry passes.
                      </p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <Link
                          to="/login?redirect=/assistant"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-300"
                        >
                          <User className="h-3.5 w-3.5" />
                          Sign In Now
                        </Link>
                        <Link
                          to="/signup"
                          className="rounded-lg border border-amber-400/40 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/10"
                        >
                          Create Account
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent text-page font-semibold text-xs">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            )
          })}

          {/* Thinking / Loading Bubble */}
          {loading && (
            <div className="flex gap-3 justify-start items-center animate-pulse">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-surface-raised border border-border-subtle text-accent">
                <Bot className="h-4 w-4 animate-spin" />
              </div>
              <div className="rounded-2xl rounded-tl-none border border-border-subtle bg-surface-raised px-4 py-3 text-xs text-text-secondary flex items-center gap-2">
                <span className="flex space-x-1">
                  <span className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span>Festivo Assistant is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="border-t border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {errorMessage}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleSend()}
              className="text-xs text-red-300 hover:bg-red-500/20"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={handleFormSubmit}
          className="border-t border-border-subtle p-3 sm:p-4 bg-surface rounded-b-2xl"
        >
          <div className="flex items-center gap-2">
            <label htmlFor="chat-input" className="sr-only">
              Type your question for Festivo Assistant
            </label>
            <input
              id="chat-input"
              type="text"
              maxLength={1000}
              placeholder={
                isSignedIn
                  ? "Ask about events, venues, rules, deadlines, or your schedule..."
                  : "Ask about events, rules, venues, or deadlines..."
              }
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              disabled={loading}
              className="min-h-11 flex-1 rounded-xl border border-border-subtle bg-surface-raised px-4 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={loading || !inputQuestion.trim()}
              className="min-h-11 px-4"
              aria-label="Send message"
            >
              <Send className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{loading ? 'Sending...' : 'Send'}</span>
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted px-1">
            <span>Read-only assistant; never modifies registrations or accounts.</span>
            <span>{inputQuestion.length}/1000</span>
          </div>
        </form>
      </section>
    </main>
  )
}
