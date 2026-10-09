import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getSupabaseClient } from '../../supabase/client'
import { useAuth } from '../auth'
import { useAuthorizedClubsQuery } from '../dashboard/dashboard-api'
import { Button } from '../../components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '../../components/states/page-states'

const field = 'min-h-11 w-full rounded-xl border border-border-subtle bg-surface px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

export function HelpDeskPage() {
  const { user, role } = useAuth()
  const organizer = role === 'organizer'
  const assignedStaff = role === 'check_in_staff'
  const queryClient = useQueryClient()
  const clubs = useAuthorizedClubsQuery(organizer ? user?.id : undefined)
  const [clubId, setClubId] = useState('')
  const selectedClub = clubId || clubs.data?.[0]?.id || ''
  const [festId, setFestId] = useState('')
  const [category, setCategory] = useState('other')
  const [description, setDescription] = useState('')
  const [venue, setVenue] = useState('')
  const [message, setMessage] = useState('')
  const [assignmentRequest, setAssignmentRequest] = useState('')
  const [assignmentStaff, setAssignmentStaff] = useState('')
  const [assignmentPriority, setAssignmentPriority] = useState('normal')
  const fests = useQuery({ queryKey: ['help-desk', 'fests', selectedClub, organizer], queryFn: async () => {
    let request = getSupabaseClient().from('fests').select('id,title,organization_id').eq('status','published').order('starts_at', { ascending: false }).limit(100)
    if (organizer) request = request.eq('organization_id', selectedClub)
    const { data, error } = await request
    if (error) throw error
    return data ?? []
  }, enabled: !organizer || Boolean(selectedClub) })
  const requests = useQuery({ queryKey: ['help-desk', 'requests', user?.id, selectedClub, organizer], queryFn: async () => {
    let request = getSupabaseClient().from('help_desk_requests').select('*').order('created_at', { ascending: false }).limit(100)
    request = organizer ? request.eq('organization_id', selectedClub) : assignedStaff ? request.eq('assigned_staff_id', user!.id) : request.eq('submitter_id', user!.id)
    const { data, error } = await request
    if (error) throw error
    return data ?? []
  }, enabled: Boolean(user) && (!organizer || Boolean(selectedClub)), refetchInterval: 30_000 })
  const staff = useQuery({ queryKey: ['help-desk', 'staff', selectedClub], enabled: organizer && Boolean(selectedClub), queryFn: async () => {
    const { data, error } = await getSupabaseClient().rpc('help_desk_assignable_staff', { p_organization_id: selectedClub })
    if (error) throw error
    return data ?? []
  } })
  async function submit() {
    setMessage('')
    const { error } = await getSupabaseClient().rpc('submit_help_desk_request', { p_fest_id: festId, p_event_id: null, p_category: category, p_description: description, p_venue: venue })
    if (error) throw error
    setDescription(''); setVenue(''); setMessage('Request sent. The club team can now review it.')
    await queryClient.invalidateQueries({ queryKey: ['help-desk', 'requests'] })
  }
  async function update(id: string, priority: string, status: string, assigned: string | null) {
    const { error } = await getSupabaseClient().rpc('update_help_desk_request', { p_request_id: id, p_priority: priority, p_status: status, p_assigned_staff_id: assigned })
    if (error) throw error
    await queryClient.invalidateQueries({ queryKey: ['help-desk', 'requests'] })
  }
  if (requests.isLoading || fests.isLoading) return <LoadingState label="Loading help desk..." />
  if (requests.isError || fests.isError || staff.isError) return <div className="content-container py-10"><ErrorState title="Help desk unavailable" description={(requests.error || fests.error || staff.error)?.message || 'Please try again.'} onRetry={() => { void requests.refetch(); void fests.refetch(); void staff.refetch() }} /></div>
  return <main className="content-container space-y-7 py-8 sm:py-10"><header className="border-b border-border-subtle pb-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Fest operations</p><h1 className="font-heading mt-2 text-3xl font-bold text-text-primary">Help Desk</h1><p className="mt-2 text-sm text-text-body">{organizer ? 'Manage requests for your assigned club.' : assignedStaff ? 'Requests assigned to your staff account.' : 'Send a request to a fest team. Only you and authorized staff can read it.'}</p></header>
    {organizer && <label className="block max-w-sm text-xs text-text-body">Club<select className={`${field} mt-1`} value={selectedClub} onChange={(event) => setClubId(event.target.value)}>{clubs.data?.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select></label>}
    {!organizer && !assignedStaff && <form className="grid gap-3 rounded-2xl border border-border-subtle bg-surface p-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void submit().catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Could not submit request')) }}><h2 className="font-heading text-lg font-semibold text-text-primary sm:col-span-2">New request</h2><label className="text-xs text-text-body">Fest<select required className={`${field} mt-1`} value={festId} onChange={(event) => setFestId(event.target.value)}><option value="">Select a fest</option>{fests.data?.map((fest) => <option key={fest.id} value={fest.id}>{fest.title}</option>)}</select></label><label className="text-xs text-text-body">Category<select className={`${field} mt-1`} value={category} onChange={(event) => setCategory(event.target.value)}>{['schedule','venue','registration','accessibility','safety','other'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="text-xs text-text-body sm:col-span-2">Description<textarea required minLength={10} maxLength={3000} className={`${field} mt-1 min-h-28 py-3`} value={description} onChange={(event) => setDescription(event.target.value)} /></label><label className="text-xs text-text-body">Venue (optional)<input maxLength={200} className={`${field} mt-1`} value={venue} onChange={(event) => setVenue(event.target.value)} /></label><div className="flex items-end"><Button type="submit" disabled={!festId || description.trim().length < 10}>Send request</Button></div>{message && <p role="status" className="text-sm text-accent sm:col-span-2">{message}</p>}</form>}
    {organizer && <form className="grid gap-3 rounded-2xl border border-border-subtle bg-surface p-5 sm:grid-cols-4" onSubmit={(event) => { event.preventDefault(); void update(assignmentRequest, assignmentPriority, 'assigned', assignmentStaff).then(() => setMessage('Request assigned.')).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Assignment failed')) }}><h2 className="font-heading text-lg font-semibold text-text-primary sm:col-span-4">Assign a request</h2><label className="text-xs text-text-body">Request<select required className={`${field} mt-1`} value={assignmentRequest} onChange={(event) => setAssignmentRequest(event.target.value)}><option value="">Select request</option>{requests.data?.filter((item) => item.status !== 'resolved').map((item) => <option key={item.id} value={item.id}>{item.category} · {item.description.slice(0, 45)}</option>)}</select></label><label className="text-xs text-text-body">Staff member<select required className={`${field} mt-1`} value={assignmentStaff} onChange={(event) => setAssignmentStaff(event.target.value)}><option value="">Select staff</option>{staff.data?.map((person) => <option key={person.user_id} value={person.user_id}>{person.full_name} · {person.staff_role.replace('_', ' ')}</option>)}</select></label><label className="text-xs text-text-body">Priority<select className={`${field} mt-1`} value={assignmentPriority} onChange={(event) => setAssignmentPriority(event.target.value)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label><div className="flex items-end"><Button type="submit" disabled={!assignmentRequest || !assignmentStaff}>Assign</Button></div>{message && <p role="status" className="text-sm text-accent sm:col-span-4">{message}</p>}</form>}
    <section><h2 className="font-heading text-xl font-semibold text-text-primary">{organizer ? 'Club queue' : assignedStaff ? 'Assigned to me' : 'My requests'}</h2>{requests.data?.length ? <ul className="mt-4 space-y-3">{requests.data.map((item) => <li key={item.id} className="rounded-2xl border border-border-subtle bg-surface p-5"><div className="flex flex-wrap justify-between gap-2"><p className="text-xs uppercase tracking-wider text-accent">{item.category} · {item.priority} priority</p><p className="text-xs text-text-muted">{new Date(item.created_at).toLocaleString()}</p></div><p className="mt-2 whitespace-pre-wrap text-sm text-text-primary">{item.description}</p><p className="mt-2 text-xs text-text-body">{item.venue || 'Venue not specified'} · Status: <strong className="capitalize">{item.status}</strong>{item.resolved_at && ` · Resolved ${new Date(item.resolved_at).toLocaleString()}`}</p>{organizer && <div className="mt-3 flex flex-wrap gap-2"><select aria-label="Priority" className={`${field} max-w-36`} defaultValue={item.priority} id={`priority-${item.id}`}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select><Button size="sm" variant="secondary" onClick={() => { const priority = (document.getElementById(`priority-${item.id}`) as HTMLSelectElement).value; void update(item.id, priority, 'assigned', user!.id).catch((error: unknown) => window.alert(error instanceof Error ? error.message : 'Update failed')) }}>Assign to me</Button><Button size="sm" variant="secondary" onClick={() => { const priority = (document.getElementById(`priority-${item.id}`) as HTMLSelectElement).value; void update(item.id, priority, 'resolved', item.assigned_staff_id || user!.id).catch((error: unknown) => window.alert(error instanceof Error ? error.message : 'Update failed')) }}>Resolve</Button></div>}</li>)}</ul> : <div className="mt-4"><EmptyState title="No requests" description="Help-desk requests will appear here." /></div>}</section><Link to="/fests" className="text-sm text-accent hover:underline">Explore fests</Link></main>
}
