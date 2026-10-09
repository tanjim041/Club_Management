import { AlertCircle, CheckCircle2, Inbox, LoaderCircle, ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../ui/button'

type StateProps = { title: string; description: string; action?: ReactNode }

function StateShell({
  icon,
  title,
  description,
  action,
}: StateProps & { icon: ReactNode }) {
  return (
    <section className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-12 text-center shadow-xl">
      {icon}
      <h2 className="mt-5 font-heading text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">{title}</h2>
      <p className="mt-2 text-sm leading-[1.6] text-[var(--color-text-body)]">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </section>
  )
}

export function LoadingState({ label = 'Loading Festivo workspace…' }: { label?: string }) {
  return (
    <div className="flex min-h-64 items-center justify-center text-sm font-medium text-[var(--color-text-body)]">
      <LoaderCircle className="mr-2.5 h-5 w-5 animate-spin text-[var(--color-accent)]" />
      {label}
    </div>
  )
}

export function EmptyState({
  title = 'Nothing here yet',
  description = 'New information will appear here when it becomes available.',
  action,
}: StateProps) {
  return (
    <StateShell
      icon={
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-[var(--color-accent)]">
          <Inbox className="h-6 w-6" />
        </div>
      }
      title={title}
      description={description}
      action={action}
    />
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again in a moment.',
  onRetry,
}: StateProps & { onRetry?: () => void }) {
  return (
    <StateShell
      icon={
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
          <AlertCircle className="h-6 w-6" />
        </div>
      }
      title={title}
      description={description}
      action={onRetry ? <Button variant="secondary" onClick={onRetry}>Try again</Button> : undefined}
    />
  )
}

export function SuccessState({ title, description }: StateProps) {
  return (
    <StateShell
      icon={
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </div>
      }
      title={title}
      description={description}
    />
  )
}

export function UnauthorizedState({
  title = 'Access restricted',
  description = 'You do not have permission to view this area.',
  action,
}: Partial<StateProps> = {}) {
  return (
    <StateShell
      icon={
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
          <ShieldAlert className="h-6 w-6" />
        </div>
      }
      title={title}
      description={description}
      action={action ?? <Button variant="secondary" onClick={() => { window.location.href = '/' }}>Return home</Button>}
    />
  )
}
