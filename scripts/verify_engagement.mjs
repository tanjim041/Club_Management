import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const config = Object.fromEntries(fs.readFileSync('.env', 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.trimStart().startsWith('#') && line.includes('='))
  .map((line) => { const i = line.indexOf('='); return [line.slice(0, i).trim(), line.slice(i + 1).trim()] }))
for (const key of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'SUPABASE_ACCESS_TOKEN']) if (!config[key]) throw new Error(`Missing ${key}`)
const admin = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
const anon = createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
const prefix = `engage-verify-${randomUUID().slice(0, 8)}`
const password = randomUUID() + 'Aa1!'
const users = []
const clubId = randomUUID()
const festId = randomUUID()
const eventId = randomUUID()
let clubCreated = false
let checks = 0
function ok(name, value) { assert.ok(value, name); checks++; console.log(`PASS ${name}`) }
async function saved(request, label) { const { data, error } = await request; if (error) throw new Error(`${label}: ${error.message}`); return data }
async function actor(name) {
  const email = `${prefix}-${name}@example.com`
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } })
  if (created.error) throw created.error
  users.push(created.data.user.id)
  await saved(admin.from('profiles').update({ full_name: name, institution: 'Fixture Institute', experience_level: 'beginner' }).eq('id', created.data.user.id), 'profile')
  const client = createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const login = await client.auth.signInWithPassword({ email, password })
  if (login.error) throw login.error
  return { id: created.data.user.id, client }
}
async function rpc(person, name, args) { const { data, error } = await person.client.rpc(name, args); if (error) throw new Error(`${name}: ${error.message}`); return data }
async function run() {
  const organizer = await actor('organizer')
  const participant = await actor('participant')
  const outsider = await actor('outsider')
  const staff = await actor('staff')
  await saved(admin.from('organizations').insert({ id: clubId, owner_id: organizer.id, name: 'Engagement Verification Club', slug: prefix, is_public_profile: true }), 'club')
  clubCreated = true
  await saved(admin.from('organization_memberships').insert([{ organization_id: clubId, user_id: organizer.id, role: 'organizer' }, { organization_id: clubId, user_id: staff.id, role: 'check_in_staff' }]), 'memberships')
  await saved(admin.from('fests').insert({ id: festId, organization_id: clubId, title: 'Engagement Verification Fest', slug: prefix, status: 'published', starts_at: '2026-12-15T00:00:00Z', ends_at: '2026-12-18T00:00:00Z' }), 'fest')
  await saved(admin.from('events').insert({ id: eventId, fest_id: festId, title: 'Engagement Workshop', slug: prefix, status: 'published', starts_at: '2026-12-16T10:00:00Z', ends_at: '2026-12-16T12:00:00Z', capacity: 10, blocks_schedule_conflicts: false }), 'event')
  const registration = (await rpc(participant, 'register_individual_event_with_conflicts', { p_event_id: eventId, p_accept_rules: true, p_acknowledge_conflicts: false }))[0]
  ok('fixture registration confirmed', registration.status === 'confirmed')
  const publicId = await rpc(organizer, 'publish_operational_announcement', { p_organization_id: clubId, p_fest_id: festId, p_event_id: eventId, p_audience: 'public', p_title: 'Public update', p_body: 'Venue opens at nine.' })
  const privateId = await rpc(organizer, 'publish_operational_announcement', { p_organization_id: clubId, p_fest_id: festId, p_event_id: eventId, p_audience: 'registered', p_title: 'Private update', p_body: 'Bring your pass.' })
  const anonRows = await saved(anon.from('operational_announcements').select('id').in('id',[publicId,privateId]), 'anonymous announcements')
  ok('anonymous sees public but not private', anonRows.length === 1 && anonRows[0].id === publicId)
  const participantRows = await saved(participant.client.from('operational_announcements').select('id').in('id',[publicId,privateId]), 'registered announcements')
  ok('registered participant sees both', participantRows.length === 2)
  const outsiderRows = await saved(outsider.client.from('operational_announcements').select('id').in('id',[publicId,privateId]), 'outsider announcements')
  ok('unregistered participant cannot see private update', outsiderRows.length === 1 && outsiderRows[0].id === publicId)
  const privateNotices = await saved(participant.client.from('notifications').select('id,read_at').eq('recipient_id',participant.id).contains('data',{ announcement_id: privateId }), 'announcement notification')
  ok('recipient has one unread in-app notification', privateNotices.length === 1 && privateNotices[0].read_at === null)
  const publicNotices = await saved(participant.client.from('notifications').select('id').eq('recipient_id',participant.id).contains('data',{ announcement_id: publicId }), 'public announcement notification')
  ok('registered participant receives public announcement in-app', publicNotices.length === 1)
  await saved(participant.client.from('notifications').update({ read_at: new Date().toISOString() }).eq('id',privateNotices[0].id), 'mark read')
  const readNotice = await saved(participant.client.from('notifications').select('read_at').eq('id',privateNotices[0].id).single(), 'read status')
  ok('recipient can mark notification read', Boolean(readNotice.read_at))
  const deniedPublish = await staff.client.rpc('publish_operational_announcement', { p_organization_id: clubId, p_fest_id: festId, p_event_id: null, p_audience: 'public', p_title: 'No', p_body: 'Denied' })
  ok('check-in staff cannot publish as organizer', deniedPublish.error?.message.includes('organizer_not_authorized'))
  const assignable = await rpc(organizer,'help_desk_assignable_staff',{p_organization_id:clubId})
  ok('organizer can select assigned club staff',assignable.some((item) => item.user_id === staff.id))
  const deniedStaffList = await staff.client.rpc('help_desk_assignable_staff',{p_organization_id:clubId})
  ok('check-in staff cannot enumerate organizer assignment roster',deniedStaffList.error?.message.includes('organizer_not_authorized'))
  const helpId = await rpc(participant,'submit_help_desk_request',{ p_fest_id: festId,p_event_id:eventId,p_category:'venue',p_description:'I need directions to the event room.',p_venue:'Main hall' })
  const ownHelp = await saved(participant.client.from('help_desk_requests').select('id,status').eq('id',helpId), 'own help')
  const otherHelp = await saved(outsider.client.from('help_desk_requests').select('id').eq('id',helpId), 'other help')
  ok('requester sees own request; outsider cannot', ownHelp.length === 1 && ownHelp[0].status === 'new' && otherHelp.length === 0)
  await rpc(organizer,'update_help_desk_request',{p_request_id:helpId,p_priority:'high',p_assigned_staff_id:staff.id,p_status:'assigned'})
  const staffHelp = await saved(staff.client.from('help_desk_requests').select('id,status').eq('id',helpId), 'assigned help')
  ok('assigned staff sees only assigned request',staffHelp.length === 1 && staffHelp[0].status === 'assigned')
  await rpc(organizer,'update_help_desk_request',{p_request_id:helpId,p_priority:'high',p_assigned_staff_id:staff.id,p_status:'resolved'})
  const pass = (await rpc(participant,'my_digital_passes',{})).find((item) => item.registration_id === registration.registration_id)
  const scan = (await rpc(staff,'check_in_event_pass',{p_event_id:eventId,p_token:pass.token}))[0]
  ok('check-in persisted',scan.result === 'checked_in')
  const initial = await rpc(participant,'my_club_passport',{})
  ok('attendance awards one event and 20 XP',initial.attendedEvents.length === 1 && Number(initial.xp) === 20)
  const verification = {p_user_id:participant.id,p_organization_id:clubId,p_event_id:eventId,p_kind:'workshop',p_title:'Workshop complete'}
  const awardA = await rpc(organizer,'verify_passport_item',verification)
  const awardB = await rpc(organizer,'verify_passport_item',verification)
  ok('repeated verification returns same source',awardA === awardB)
  const passport = await rpc(participant,'my_club_passport',{})
  ok('workshop XP is idempotent',Number(passport.xp) === 50 && passport.rewards.length === 2 && passport.verifications.length === 1)
  const outsiderPassport = await rpc(outsider,'my_club_passport',{})
  ok('passport is private to signed-in user',outsiderPassport.rewards.length === 0)
  const report = await rpc(organizer,'post_fest_report',{p_fest_id:festId})
  const analytics = await rpc(organizer,'organizer_analytics',{p_organization_id:clubId,p_fest_id:festId})
  ok('post-fest report shares analytics metrics',JSON.stringify(report.metrics) === JSON.stringify(analytics.metrics))
  ok('post-fest help desk outcomes correct',Number(report.helpDesk.total) === 1 && Number(report.helpDesk.resolved) === 1)
  const summary = await organizer.client.functions.invoke('organizer-copilot', { body: { mode:'post_fest_report', organizationId:clubId, festId, question:'Summarize this fest.' } })
  if (summary.error) throw summary.error
  ok('optional report summary uses calculated scoped facts',Number(summary.data?.calculated?.helpDesk?.resolved) === 1 && typeof summary.data.answer === 'string')
  const deniedReport = await outsider.client.rpc('post_fest_report',{p_fest_id:festId})
  ok('participant cannot read organizer report',deniedReport.error?.message.includes('organizer_not_authorized'))
}
async function cleanup() {
  if (clubCreated) {
    const sql = `begin;
      alter table public.organizations disable trigger audit_organizations_before_delete;
      alter table public.organization_memberships disable trigger audit_organization_memberships_before_delete;
      alter table public.organization_memberships disable trigger guard_organization_membership_before_write;
      delete from public.notifications where organization_id = '${clubId}';
      delete from public.events where fest_id = '${festId}';
      delete from public.fests where id = '${festId}';
      delete from public.audit_logs where organization_id = '${clubId}';
      delete from public.organizations where id = '${clubId}' and slug = '${prefix}';
      alter table public.organization_memberships enable trigger audit_organization_memberships_before_delete;
      alter table public.organization_memberships enable trigger guard_organization_membership_before_write;
      alter table public.organizations enable trigger audit_organizations_before_delete;
      commit;`
    const response = await fetch(`https://api.supabase.com/v1/projects/${new URL(config.SUPABASE_URL).hostname.split('.')[0]}/database/query`, {
      method:'POST',headers:{Authorization:`Bearer ${config.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql}) })
    if (!response.ok) throw new Error(`Fixture club cleanup failed: ${await response.text()}`)
  }
  for (const id of users) { const removed = await admin.auth.admin.deleteUser(id); if (removed.error) throw removed.error }
}
try { await run() } finally { await cleanup(); console.log(`Removed isolated fixture ${prefix}.`) }
console.log(`${checks} engagement checks passed.`)
