import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, ClipboardCopy, Send, UsersRound } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '../../components/states/page-states'
import { useAuth } from '../auth'
import { registrationErrorMessage } from '../registrations/registration-api'
import { ConflictSummary } from './conflict-summary'
import {
  acknowledgeEventTeamConflicts,
  cancelEventTeamRegistration,
  inviteEventTeamMember,
  leaveDraftEventTeam,
  respondEventTeamInvitation,
  revokeEventTeamInvitation,
  submitEventTeam,
  useEventConflictsQuery,
  useEventTeamDetailQuery,
  useInvitationPreviewQuery,
  useMyEventTeamsQuery,
  useScheduleAlternativesQuery,
} from './team-api'

const panel = 'rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 sm:p-6'
const input = 'mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none'

export function MyTeamsPage() {
  const { user } = useAuth()
  const teams = useMyEventTeamsQuery(user?.id)
  if (teams.isLoading) return <LoadingState label="Loading your teams..." />
  if (teams.isError) return <div className="content-container py-10"><ErrorState title="Could not load teams" description={teams.error instanceof Error ? teams.error.message : 'Please try again.'} onRetry={() => { void teams.refetch() }} /></div>
  return <div className="content-container space-y-7 py-8 sm:py-10">
    <header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">Participant workspace</p>
      <h1 className="font-heading mt-2 text-3xl font-bold text-[var(--color-text-primary)]">My Teams</h1>
      <p className="mt-2 text-sm text-[var(--color-text-body)]">Drafts, accepted rosters, and submitted team registrations.</p></header>
    {teams.data?.length ? <div className="grid gap-4 md:grid-cols-2">{teams.data.map((team) =>
      <article key={team.team_id} className={panel}>
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">{team.team_status} · {team.is_captain ? 'Captain' : 'Member'}</span>
        <h2 className="font-heading mt-3 text-xl font-bold text-[var(--color-text-primary)]">{team.team_name}</h2>
        <p className="mt-1 text-sm text-[var(--color-text-body)]">{team.event_title}</p>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">{new Date(team.event_starts_at).toLocaleString()}{team.registration_status ? ` · ${team.registration_status}` : ' · no place reserved yet'}</p>
        <Link to={`/teams/${team.team_id}`} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-accent)] hover:underline">Open team</Link>
      </article>)}</div> : <EmptyState title="No teams yet" description="Open a team event to create a draft, or ask a captain for an invitation." action={<Link to="/events"><Button>Explore events</Button></Link>} />}
  </div>
}

export function EventTeamPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const team = useEventTeamDetailQuery(teamId, user?.id)
  const conflicts = useEventConflictsQuery(team.data?.event_id, teamId ?? null, user?.id)
  const alternatives = useScheduleAlternativesQuery(team.data?.event_id, teamId ?? null, user?.id)
  const [email, setEmail] = useState('')
  const [expiry, setExpiry] = useState(72)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['participant', 'team', teamId] }),
      queryClient.invalidateQueries({ queryKey: ['participant', 'teams', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['participant', 'registrations', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['participant', 'event-conflicts'] }),
      queryClient.invalidateQueries({ queryKey: ['public-directory'] }),
    ])
  }
  const invite = useMutation({
    mutationFn: () => inviteEventTeamMember(teamId!, email, expiry),
    onSuccess: async (result) => {
      setInviteLink(`${window.location.origin}/team-invite#${result.invitation_token}`)
      setCopied(false)
      setEmail('')
      await refresh()
    },
  })
  const revoke = useMutation({ mutationFn: revokeEventTeamInvitation, onSuccess: refresh })
  const submit = useMutation({ mutationFn: () => submitEventTeam(teamId!), onSuccess: refresh })
  const acknowledge = useMutation({ mutationFn: () => acknowledgeEventTeamConflicts(teamId!), onSuccess: refresh })
  const leave = useMutation({ mutationFn: () => leaveDraftEventTeam(teamId!), onSuccess: async () => { await refresh(); navigate('/my-teams') } })
  const cancel = useMutation({ mutationFn: () => cancelEventTeamRegistration(teamId!, cancelReason), onSuccess: async () => { setConfirmCancel(false); await refresh() } })

  if (team.isLoading) return <LoadingState label="Loading team..." />
  if (team.isError) return <div className="content-container py-10"><ErrorState title="Could not load team" description={team.error instanceof Error ? team.error.message : 'Please try again.'} onRetry={() => { void team.refetch() }} /></div>
  if (!team.data) return <div className="content-container py-10"><EmptyState title="Team not found" description="This team is not available to your account." action={<Link to="/my-teams"><Button variant="secondary">My Teams</Button></Link>} /></div>

  const detail = team.data
  const isCaptain = detail.captain_id === user?.id
  const ownConflicts = (conflicts.data ?? []).filter((item) => item.person_id === user?.id)
  const hasBlockingConflict = (conflicts.data ?? []).some((item) => item.blocks_conflict)
  const acceptedCount = detail.members.length
  const readyForSize = acceptedCount >= detail.team_min_size && acceptedCount <= detail.team_max_size
  const rulesCurrent = detail.members.every((member) => member.rules_current)

  return <div className="content-container max-w-5xl space-y-6 py-8 sm:py-10">
    <Link to="/my-teams" className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--color-accent)] hover:underline"><ArrowLeft className="h-4 w-4" /> My Teams</Link>
    <header className={panel}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">{detail.status} team · {isCaptain ? 'Captain' : 'Member'}</p>
      <h1 className="font-heading mt-2 text-3xl font-bold text-[var(--color-text-primary)]">{detail.name}</h1>
      <p className="mt-2 text-sm text-[var(--color-text-body)]">{detail.event_title}</p>
      <p className="mt-3 text-sm text-[var(--color-text-body)]">{acceptedCount} accepted member{acceptedCount === 1 ? '' : 's'} · required {detail.team_min_size}–{detail.team_max_size}</p>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">{detail.registration_status ? `Registration: ${detail.registration_status}` : 'Draft only — no capacity reserved.'}</p>
      {detail.registration_id && <Link to={`/my-registrations/${detail.registration_id}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-accent)] hover:underline">View registration</Link>}
    </header>

    <section className={panel} aria-label="Accepted team roster">
      <h2 className="font-heading text-lg font-bold text-[var(--color-text-primary)]">Accepted roster</h2>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">Invitations do not count until a member accepts. A submitted roster is frozen.</p>
      <div className="mt-4 space-y-2">{detail.members.map((member) => <div key={member.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3 text-sm">
        <span className="text-[var(--color-text-primary)]">{member.full_name || 'Participant'}{member.is_captain ? ' · captain' : ''}</span>
        <span className={member.rules_current ? 'text-[var(--color-text-muted)]' : 'text-amber-200'}>{member.rules_current ? 'Rules accepted' : 'Rules changed — review needed'}</span>
      </div>)}</div>
    </section>

    {isCaptain && detail.status === 'draft' && <section className={panel}>
      <h2 className="font-heading text-lg font-bold text-[var(--color-text-primary)]">Invite a member</h2>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">The one-time link is bound to the intended email. Share it privately; it cannot be retrieved after leaving this page.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
        <label className="text-xs font-semibold text-[var(--color-text-primary)]">Email<input type="email" value={email} onChange={(change) => setEmail(change.target.value)} className={input} placeholder="member@example.com" /></label>
        <label className="text-xs font-semibold text-[var(--color-text-primary)]">Expires in hours<input type="number" min={1} max={168} value={expiry} onChange={(change) => setExpiry(Number(change.target.value))} className={input} /></label>
        <Button className="min-h-11" disabled={invite.isPending || !email.trim() || expiry < 1 || expiry > 168} onClick={() => invite.mutate()}><Send className="h-4 w-4" /> Invite</Button>
      </div>
      {invite.isError && <p role="alert" className="mt-3 text-xs text-rose-300">{registrationErrorMessage(invite.error)}</p>}
      {inviteLink && <div className="mt-4 rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-surface-raised)] p-4">
        <p className="text-xs font-semibold text-[var(--color-text-primary)]">Invitation created. Copy this link now.</p>
        <p className="mt-2 break-all text-xs text-[var(--color-text-body)]">{inviteLink}</p>
        <Button className="mt-3 min-h-11" variant="secondary" onClick={() => { void navigator.clipboard.writeText(inviteLink).then(() => setCopied(true)) }}><ClipboardCopy className="h-4 w-4" /> {copied ? 'Copied' : 'Copy link'}</Button>
      </div>}
      {detail.invitations.length > 0 && <div className="mt-5 space-y-2"><h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Invitations</h3>{detail.invitations.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] py-2 text-xs">
        <span className="break-all text-[var(--color-text-body)]">{item.email} · {item.status} · expires {new Date(item.expires_at).toLocaleString()}</span>
        {item.status === 'pending' && <Button variant="outline" size="sm" disabled={revoke.isPending} onClick={() => revoke.mutate(item.id)}>Revoke</Button>}
      </div>)}</div>}
      {revoke.isError && <p role="alert" className="mt-2 text-xs text-rose-300">{registrationErrorMessage(revoke.error)}</p>}
    </section>}

    <section className={panel}>
      <h2 className="font-heading text-lg font-bold text-[var(--color-text-primary)]">Schedule check</h2>
      <div className="mt-3">{conflicts.isLoading ? <p className="text-xs text-[var(--color-text-muted)]">Checking every accepted member...</p> : conflicts.isError ? <p role="alert" className="text-xs text-rose-300">Could not check team schedules. Please retry.</p> : <ConflictSummary conflicts={conflicts.data ?? []} alternatives={alternatives.data ?? []} />}</div>
      {ownConflicts.length > 0 && !ownConflicts.some((item) => item.blocks_conflict) && (detail.status === 'draft' || detail.registration_status === 'waitlisted') && <div className="mt-4">
        <p className="text-xs text-[var(--color-text-body)]">Only you can acknowledge your own overlap. A new or changed conflict requires a fresh acknowledgement.</p>
        <Button className="mt-2 min-h-11" variant="secondary" disabled={acknowledge.isPending} onClick={() => acknowledge.mutate()}><Check className="h-4 w-4" /> Acknowledge my overlap</Button>
        {acknowledge.isSuccess && <p role="status" className="mt-2 text-xs text-[var(--color-accent)]">Your current overlap was acknowledged.</p>}
        {acknowledge.isError && <p role="alert" className="mt-2 text-xs text-rose-300">{registrationErrorMessage(acknowledge.error)}</p>}
      </div>}
      {hasBlockingConflict && <p className="mt-3 text-xs text-amber-200">The team cannot submit while a member has a blocking conflict. Consider another event.</p>}
    </section>

    {isCaptain && detail.status === 'draft' && <section className={panel}>
      <h2 className="font-heading text-lg font-bold text-[var(--color-text-primary)]">Submit team registration</h2>
      <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-body)]">Only the captain can submit. The backend rechecks every accepted member, rules, schedule, deadline, and capacity. The roster is snapshotted after submission.</p>
      <Button className="mt-4 min-h-11" disabled={!readyForSize || !rulesCurrent || hasBlockingConflict || conflicts.isLoading || conflicts.isError || submit.isPending} onClick={() => submit.mutate()}>
        <UsersRound className="h-4 w-4" /> {submit.isPending ? 'Submitting...' : 'Submit team'}
      </Button>
      {!readyForSize && <p className="mt-2 text-xs text-amber-200">You need {detail.team_min_size}–{detail.team_max_size} accepted members.</p>}
      {submit.isError && <p role="alert" className="mt-3 text-xs text-rose-300">{registrationErrorMessage(submit.error)}</p>}
      {submit.isSuccess && <p role="status" className="mt-3 text-xs text-[var(--color-accent)]">The team was saved as {submit.data.status}. {submit.data.status === 'waitlisted' ? `Waitlist ticket #${submit.data.waitlist_position}.` : 'Its place is confirmed.'}</p>}
    </section>}

    {!isCaptain && detail.status === 'draft' && <section className={panel}>
      <p className="text-sm text-[var(--color-text-body)]">You can leave while the team is still a draft.</p>
      <Button className="mt-3 min-h-11" variant="outline" disabled={leave.isPending} onClick={() => leave.mutate()}>Leave draft team</Button>
      {leave.isError && <p role="alert" className="mt-2 text-xs text-rose-300">{registrationErrorMessage(leave.error)}</p>}
    </section>}

    {isCaptain && detail.status === 'submitted' && detail.registration_status !== 'cancelled' && <section className={panel}>
      <h2 className="font-heading text-lg font-bold text-[var(--color-text-primary)]">Cancel team registration</h2>
      <p className="mt-2 text-xs text-[var(--color-text-body)]">Only the captain can cancel before the event cutoff. A confirmed place may pass to the next eligible waitlisted team.</p>
      {!confirmCancel ? <Button className="mt-3 min-h-11" variant="outline" onClick={() => setConfirmCancel(true)}>Review cancellation</Button> : <div className="mt-3 space-y-3">
        <label className="block text-xs text-[var(--color-text-primary)]">Reason (optional)<textarea value={cancelReason} onChange={(change) => setCancelReason(change.target.value)} maxLength={500} rows={2} className={input} /></label>
        <div className="flex flex-wrap gap-2"><Button variant="danger" disabled={cancel.isPending} onClick={() => cancel.mutate()}>{cancel.isPending ? 'Cancelling...' : 'Confirm cancellation'}</Button><Button variant="secondary" onClick={() => setConfirmCancel(false)}>Keep team</Button></div>
      </div>}
      {cancel.isError && <p role="alert" className="mt-2 text-xs text-rose-300">{registrationErrorMessage(cancel.error)}</p>}
    </section>}
  </div>
}

export function EventTeamInvitationPage() {
  const token = window.location.hash.slice(1)
  const { user, status: authStatus, isProfileComplete } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const invitation = useInvitationPreviewQuery(token, user?.id)
  const conflicts = useEventConflictsQuery(invitation.data?.event_id, null, user?.id)
  const alternatives = useScheduleAlternativesQuery(invitation.data?.event_id, null, user?.id)
  const [acceptRules, setAcceptRules] = useState(false)
  const response = useMutation({
    mutationFn: (accept: boolean) => respondEventTeamInvitation(token, accept, acceptRules),
    onSuccess: async (teamId, accept) => {
      await queryClient.invalidateQueries({ queryKey: ['participant', 'teams', user?.id] })
      navigate(accept ? `/teams/${teamId}` : '/my-teams')
    },
  })
  if (authStatus === 'loading') return <LoadingState label="Checking your account..." />
  if (!user) return <div className="content-container max-w-2xl py-12"><div className={panel}><h1 className="font-heading text-2xl text-[var(--color-text-primary)]">Team invitation</h1><p className="mt-3 text-sm text-[var(--color-text-body)]">Sign in or create an account with the email address invited by the captain.</p><div className="mt-4 flex flex-wrap gap-2"><Link to={`/login?redirect=${encodeURIComponent(`/team-invite#${token}`)}`}><Button>Log in to respond</Button></Link><Link to={`/signup?redirect=${encodeURIComponent(`/team-invite#${token}`)}`}><Button variant="secondary">Create account</Button></Link></div></div></div>
  if (invitation.isLoading) return <LoadingState label="Checking invitation..." />
  if (invitation.isError) return <div className="content-container py-10"><ErrorState title="Could not load invitation" description="Please retry your invitation link." onRetry={() => { void invitation.refetch() }} /></div>
  if (!invitation.data) return <div className="content-container py-10"><EmptyState title="Invitation not available" description="This link is invalid or belongs to another account." /></div>
  const item = invitation.data
  return <div className="content-container max-w-2xl space-y-5 py-8 sm:py-10">
    <div className={panel}><p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">Team invitation · {item.status}</p>
      <h1 className="font-heading mt-2 text-2xl font-bold text-[var(--color-text-primary)]">Join {item.team_name}?</h1>
      <p className="mt-2 text-sm text-[var(--color-text-body)]">Event: {item.event_title}</p>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">Expires {new Date(item.expires_at).toLocaleString()}</p>
    </div>
    <div className={panel}><h2 className="font-heading text-lg font-bold text-[var(--color-text-primary)]">Event rules</h2><p className="mt-3 whitespace-pre-line text-sm text-[var(--color-text-body)]">{item.rules || 'No additional rules were published.'}</p></div>
    <div className={panel}><h2 className="font-heading text-lg font-bold text-[var(--color-text-primary)]">Your schedule</h2><div className="mt-3">{conflicts.isLoading ? <p className="text-xs text-[var(--color-text-muted)]">Checking schedule...</p> : <ConflictSummary conflicts={conflicts.data ?? []} alternatives={alternatives.data ?? []} />}</div></div>
    {item.status === 'pending' && !isProfileComplete && <div className={panel}><p className="text-sm text-[var(--color-text-body)]">Complete your participant profile before accepting this invitation.</p><Link to={`/complete-profile?redirect=${encodeURIComponent(`/team-invite#${token}`)}`} className="mt-3 inline-block"><Button>Complete profile</Button></Link></div>}
    {item.status === 'pending' && isProfileComplete && <div className={panel}>
      <label className="flex items-start gap-3 text-sm text-[var(--color-text-body)]"><input type="checkbox" checked={acceptRules} onChange={(change) => setAcceptRules(change.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" /><span>I have read and accept this event&apos;s rules and eligibility requirements.</span></label>
      <p className="mt-3 text-xs text-[var(--color-text-muted)]">Accepting joins the draft roster; it does not reserve an event place. The captain submits when the team is complete.</p>
      <div className="mt-4 flex flex-wrap gap-2"><Button disabled={!acceptRules || response.isPending} onClick={() => response.mutate(true)}>Accept invitation</Button><Button variant="outline" disabled={response.isPending} onClick={() => response.mutate(false)}>Decline</Button></div>
      {response.isError && <p role="alert" className="mt-3 text-xs text-rose-300">{registrationErrorMessage(response.error)}</p>}
    </div>}
  </div>
}
