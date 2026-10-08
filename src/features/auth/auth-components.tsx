import { AlertCircle, CheckCircle2, Eye, EyeOff, Sparkles } from 'lucide-react'
import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

export const authInputClassName =
  'mt-1.5 block w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)]/50 focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60'

export function AuthPageFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="content-container py-6 sm:py-10 lg:py-14">
      <section className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-2xl lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="relative hidden overflow-hidden border-r border-[var(--color-border-subtle)] bg-page px-9 py-10 lg:block">
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
                <Sparkles className="h-3 w-3" />
                <span>Festivo Platform</span>
              </div>
              <h2 className="mt-6 max-w-xs font-heading text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                Campus clubs, working in rhythm.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-[1.6] text-[var(--color-text-body)]">
                A unified system for discovering student organizations, coordinating teams, and participating in campus events.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 text-xs text-[var(--color-text-body)]">
              <p className="font-semibold text-[var(--color-text-primary)]">Security & Permissions</p>
              <p className="mt-1 leading-relaxed">
                Every account starts with participant access. Organizer roles are granted directly through authorized campus club administrators.
              </p>
            </div>
          </div>
        </aside>
      <div className="px-6 py-8 sm:px-10 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">{eyebrow}</p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-lg text-sm leading-[1.6] text-[var(--color-text-body)]">{description}</p>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  </div>
  )
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--color-text-primary)]">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs leading-5 text-[var(--color-text-muted)]">{hint}</p> : null}
      {error ? (
        <p className="flex items-start gap-1.5 text-xs leading-5 text-rose-300" role="alert">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(authInputClassName, className)} {...props} />
}

export function PasswordInput({
  invalid,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { invalid?: boolean }) {
  const [visible, setVisible] = useState(false)
  const generatedId = useId()
  const inputId = props.id ?? generatedId
  return (
    <div className="relative">
      <TextInput
        {...props}
        id={inputId}
        type={visible ? 'text' : 'password'}
        aria-invalid={invalid || undefined}
        className={cn('pr-12', props.className)}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-[var(--color-text-muted)] transition hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export function FormMessage({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'success'
  children: ReactNode
}) {
  const isSuccess = tone === 'success'
  return (
    <div
      className={cn(
        'flex gap-2 rounded-xl border px-3 py-2.5 text-sm leading-5',
        isSuccess
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border-rose-500/30 bg-rose-500/10 text-rose-300',
      )}
      role={isSuccess ? 'status' : 'alert'}
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
      )}
      <span>{children}</span>
    </div>
  )
}
