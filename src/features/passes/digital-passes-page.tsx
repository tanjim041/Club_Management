import { QrCode, Ticket } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '../../components/states/page-states'
import { useAuth } from '../auth'
import { useDigitalPassesQuery } from './pass-api'

export function DigitalPassesPage() {
  const { user } = useAuth()
  const query = useDigitalPassesQuery(Boolean(user))
  if (query.isLoading) return <LoadingState label="Loading your digital passes..." />
  if (query.isError) return <div className="content-container py-10"><ErrorState title="Could not load passes" description={query.error.message} onRetry={() => { void query.refetch() }} /></div>

  return <main className="content-container space-y-8 py-8 sm:py-10">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Participant workspace</p>
        <h1 className="font-heading mt-2 text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">Digital Passes</h1>
        <p className="mt-2 text-sm text-[var(--color-text-body)]">One private pass for each confirmed event place. Show it only to authorized gate staff.</p>
      </div>
      <Link to="/my-registrations"><Button variant="secondary">My Registrations</Button></Link>
    </div>
    {!query.data?.length ? <EmptyState title="No confirmed passes" description="A digital pass appears when your individual place or team roster is confirmed." action={<Link to="/events"><Button>Explore events</Button></Link>} /> :
      <section aria-label="Your event passes" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {query.data.map((pass) => <article key={pass.pass_id} className="overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border-subtle)] p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent"><Ticket className="h-4 w-4" /> Confirmed event pass</p>
            <h2 className="font-heading mt-3 text-xl font-bold text-[var(--color-text-primary)]">{pass.event_title}</h2>
            <p className="mt-1 text-sm text-[var(--color-text-body)]">{pass.fest_title}</p>
          </div>
          <div className="space-y-3 p-5 text-sm text-[var(--color-text-body)]">
            <p><span className="text-[var(--color-text-muted)]">Participant:</span> <span className="text-[var(--color-text-primary)]">{pass.participant_name}</span></p>
            {pass.team_name && <p><span className="text-[var(--color-text-muted)]">Team:</span> {pass.team_name}</p>}
            <p><span className="text-[var(--color-text-muted)]">Registration:</span> <span className="break-all font-mono text-xs">{pass.registration_id}</span></p>
            <p><span className="text-[var(--color-text-muted)]">Status:</span> {pass.revoked_at ? 'Revoked' : pass.checked_in_at ? `Checked in ${new Date(pass.checked_in_at).toLocaleString()}` : 'Ready for check-in'}</p>
            <p><span className="text-[var(--color-text-muted)]">Event starts:</span> {new Date(pass.starts_at).toLocaleString()}</p>
          </div>
          {!pass.revoked_at && <div className="flex flex-col items-center gap-3 border-t border-[var(--color-border-subtle)] p-5">
            <div className="rounded-xl bg-white p-4"><QRCodeSVG value={pass.token} size={176} level="H" marginSize={0} title={`QR event pass for ${pass.event_title}`} /></div>
            <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]"><QrCode className="h-3.5 w-3.5" /> QR contains an opaque token only</p>
          </div>}
        </article>)}
      </section>}
  </main>
}
