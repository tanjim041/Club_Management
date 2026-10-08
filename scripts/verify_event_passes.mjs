import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const config = Object.fromEntries(fs.readFileSync('.env', 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.trimStart().startsWith('#') && line.includes('='))
  .map((line) => { const i = line.indexOf('='); return [line.slice(0, i).trim(), line.slice(i + 1).trim()] }))
for (const key of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY']) {
  if (!config[key]) throw new Error(`Missing ${key}`)
}
const admin = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
const prefix = `pass-verify-${randomUUID().slice(0, 8)}`
const password = randomUUID() + 'Aa1!'
const createdUsers = []
let clubId = null
let festId = null
const eventIds = []
const results = []

function ok(label, condition) { assert.ok(condition, label); results.push(label); console.log(`PASS ${label}`) }
async function saved(query, label) { const { data, error } = await query; if (error) throw new Error(`${label}: ${error.message}`); return data }
async function user(name) {
  const email = `${prefix}-${name.toLowerCase().replaceAll(' ', '-')}@example.com`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } })
  if (error) throw error
  createdUsers.push(data.user.id)
  await saved(admin.from('profiles').update({ full_name: name, institution: 'Fixture Institute', experience_level: 'beginner' }).eq('id', data.user.id), 'profile')
  const client = createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const session = await client.auth.signInWithPassword({ email, password })
  if (session.error) throw session.error
  return { id: data.user.id, email, client }
}
async function rpc(actor, name, args, expectedError = null) {
  const { data, error } = await actor.client.rpc(name, args)
  if (expectedError) { ok(`${name} rejects ${expectedError}`, Boolean(error?.message.includes(expectedError))); return null }
  if (error) throw new Error(`${name}: ${error.message}`)
  return data
}
async function makeEvent(slug, mode = 'individual') {
  const id = randomUUID(); eventIds.push(id)
  await saved(admin.from('events').insert({
    id, fest_id: festId, title: `Pass verification ${slug}`, slug,
    status: 'published', operational_status: 'scheduled', registration_mode: mode,
    team_min_size: mode === 'team' ? 2 : null, team_max_size: mode === 'team' ? 2 : null,
    capacity: 10, waitlist_enabled: false, blocks_schedule_conflicts: false,
    starts_at: mode === 'team' ? '2026-12-17T10:00:00Z' : '2026-12-16T10:00:00Z',
    ends_at: mode === 'team' ? '2026-12-17T12:00:00Z' : '2026-12-16T12:00:00Z',
    rules: 'Fixture only.',
  }), 'event')
  return id
}

async function run() {
  const owner = await user('Pass Organizer')
  const staff = await user('Pass Staff')
  const alice = await user('Pass Alice')
  const bob = await user('Pass Bob')
  clubId = randomUUID(); festId = randomUUID()
  await saved(admin.from('organizations').insert({ id: clubId, owner_id: owner.id, name: 'Pass Verification Club', slug: prefix, is_public_profile: true }), 'club')
  await saved(admin.from('organization_memberships').insert([
    { organization_id: clubId, user_id: owner.id, role: 'organizer' },
    { organization_id: clubId, user_id: staff.id, role: 'check_in_staff' },
  ]), 'memberships')
  await saved(admin.from('fests').insert({ id: festId, organization_id: clubId, title: 'Pass Verification Fest', slug: prefix,
    status: 'published', operational_status: 'scheduled', starts_at: '2026-12-15T00:00:00Z', ends_at: '2026-12-18T00:00:00Z' }), 'fest')
  const individual = await makeEvent(`${prefix}-individual`)
  const otherEvent = await makeEvent(`${prefix}-other`)
  const teamEvent = await makeEvent(`${prefix}-team`, 'team')

  const individualReg = (await rpc(alice, 'register_individual_event_with_conflicts', {
    p_event_id: individual, p_accept_rules: true, p_acknowledge_conflicts: false,
  }))[0]
  ok('individual registration confirmed', individualReg.status === 'confirmed')
  const alicePass = (await rpc(alice, 'my_digital_passes', {})).find((p) => p.registration_id === individualReg.registration_id)
  ok('individual gets exactly one opaque pass', Boolean(alicePass && /^[0-9a-f]{64}$/.test(alicePass.token)))
  ok('token contains no contact details', !alicePass.token.includes(alice.email))
  ok('unrelated participant cannot see pass', !(await rpc(bob, 'my_digital_passes', {})).some((p) => p.pass_id === alicePass.pass_id))
  await rpc(staff, 'check_in_event_pass', { p_event_id: individual, p_token: 'x'.repeat(64) }, 'invalid_pass')
  await rpc(staff, 'check_in_event_pass', { p_event_id: otherEvent, p_token: alicePass.token }, 'wrong_event')
  const first = (await rpc(staff, 'check_in_event_pass', { p_event_id: individual, p_token: alicePass.token }))[0]
  ok('valid pass check-in saved', first.result === 'checked_in')
  const repeat = (await rpc(staff, 'check_in_event_pass', { p_event_id: individual, p_token: alicePass.token }))[0]
  ok('repeat returns existing attendance', repeat.result === 'already_checked_in' && repeat.checked_in_at === first.checked_in_at)
  const metrics = (await rpc(staff, 'event_check_in_metrics', { p_event_id: individual }))[0]
  ok('attendance metrics reflect saved check-in', Number(metrics.confirmed_people) === 1 && Number(metrics.checked_in_people) === 1)
  const lookup = await rpc(staff, 'staff_lookup_event_passes', { p_event_id: individual, p_registration_id: individualReg.registration_id })
  ok('manual lookup scoped and hides token', lookup.length === 1 && lookup[0].pass_id === alicePass.pass_id && !('token' in lookup[0]))
  await rpc(bob, 'staff_lookup_event_passes', { p_event_id: individual, p_registration_id: individualReg.registration_id }, 'staff_not_authorized')
  await rpc(owner, 'revoke_event_pass', { p_pass_id: alicePass.pass_id })
  await rpc(staff, 'check_in_event_pass', { p_event_id: individual, p_token: alicePass.token }, 'pass_revoked')

  const cancelledReg = (await rpc(bob, 'register_individual_event_with_conflicts', {
    p_event_id: otherEvent, p_accept_rules: true, p_acknowledge_conflicts: false,
  }))[0]
  const cancelledPass = (await rpc(bob, 'my_digital_passes', {})).find((p) => p.registration_id === cancelledReg.registration_id)
  await rpc(bob, 'cancel_individual_registration', { p_registration_id: cancelledReg.registration_id, p_reason: 'Fixture cancellation' })
  await rpc(staff, 'check_in_event_pass', { p_event_id: otherEvent, p_token: cancelledPass.token }, 'registration_not_confirmed')

  const teamId = await rpc(alice, 'create_event_team', { p_event_id: teamEvent, p_name: 'Fixture Pair', p_accept_rules: true })
  const invite = (await rpc(alice, 'invite_event_team_member', { p_team_id: teamId, p_email: bob.email, p_expiry_hours: 24 }))[0]
  await rpc(bob, 'respond_event_team_invitation', { p_token: invite.invitation_token, p_accept: true, p_accept_rules: true })
  const teamReg = (await rpc(alice, 'submit_event_team', { p_team_id: teamId }))[0]
  ok('team registration confirmed', teamReg.status === 'confirmed')
  const teamPasses = await saved(admin.from('event_passes').select('id, user_id').eq('registration_id', teamReg.registration_id), 'team passes')
  ok('one pass per accepted registered team member', teamPasses.length === 2 && new Set(teamPasses.map((p) => p.user_id)).size === 2)
  const memberPass = (await rpc(bob, 'my_digital_passes', {})).find((p) => p.registration_id === teamReg.registration_id)
  ok('team member can open own pass', Boolean(memberPass))
  const memberCheckIn = (await rpc(staff, 'check_in_event_pass', { p_event_id: teamEvent, p_token: memberPass.token }))[0]
  ok('team member attendance recorded separately', memberCheckIn.result === 'checked_in')
  const staffMetrics = (await rpc(staff, 'event_check_in_metrics', { p_event_id: teamEvent }))[0]
  ok('team metrics count people', Number(staffMetrics.confirmed_people) === 2 && Number(staffMetrics.checked_in_people) === 1)
  const clubSummary = await rpc(owner, 'organization_check_in_summary', { p_organization_id: clubId })
  const teamSummary = clubSummary.find((row) => row.registration_id === teamReg.registration_id)
  ok('organizer summary reflects per-person team attendance', Number(teamSummary?.confirmed_people) === 2 && Number(teamSummary?.checked_in_people) === 1)
  await rpc(staff, 'organization_check_in_summary', { p_organization_id: clubId }, 'organizer_not_authorized')
  const manualTeam = await rpc(staff, 'staff_lookup_event_passes', { p_event_id: teamEvent, p_registration_id: teamReg.registration_id })
  const captainManualPass = manualTeam.find((pass) => pass.pass_id !== memberPass.pass_id)
  const manualResult = (await rpc(staff, 'check_in_event_pass', { p_event_id: teamEvent, p_pass_id: captainManualPass.pass_id }))[0]
  ok('manual fallback records captain independently', manualResult.result === 'checked_in')
  const completedMetrics = (await rpc(staff, 'event_check_in_metrics', { p_event_id: teamEvent }))[0]
  ok('metrics refresh to both team members', Number(completedMetrics.checked_in_people) === 2)
  const finalRows = await saved(admin.from('event_pass_attendance').select('pass_id').in('pass_id', [alicePass.pass_id, ...teamPasses.map((p) => p.id)]), 'saved attendance')
  ok('invalid, wrong, revoked, cancelled and repeat did not create extra attendance', finalRows.length === 3)
}

async function cleanup() {
  // Exact fixture IDs only. Registrations, passes, snapshots, and attendance cascade from events.
  if (eventIds.length) {
    await saved(admin.from('notifications').delete().in('event_id', eventIds), 'cleanup notifications')
    await saved(admin.from('audit_logs').delete().in('event_id', eventIds), 'cleanup event audit logs')
    await saved(admin.from('events').delete().in('id', eventIds), 'cleanup events')
  }
  if (festId) await saved(admin.from('fests').delete().eq('id', festId), 'cleanup fest')
  if (clubId) {
    const sql = `begin;
      alter table public.organizations disable trigger audit_organizations_before_delete;
      alter table public.organization_memberships disable trigger audit_organization_memberships_before_delete;
      alter table public.organization_memberships disable trigger guard_organization_membership_before_write;
      delete from public.audit_logs where organization_id = '${clubId}';
      delete from public.organizations where id = '${clubId}' and slug = '${prefix}';
      alter table public.organization_memberships enable trigger audit_organization_memberships_before_delete;
      alter table public.organization_memberships enable trigger guard_organization_membership_before_write;
      alter table public.organizations enable trigger audit_organizations_before_delete;
      commit;`
    const response = await fetch(`https://api.supabase.com/v1/projects/${new URL(config.SUPABASE_URL).hostname.split('.')[0]}/database/query`, {
      method: 'POST', headers: { Authorization: `Bearer ${config.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
    })
    if (!response.ok) throw new Error(`Scoped club cleanup failed: ${await response.text()}`)
  }
  for (const id of createdUsers) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) throw error
  }
}

try { await run() } finally {
  try { await cleanup(); console.log(`Cleaned up ${prefix} fixtures.`) }
  catch (error) { console.error(`Fixture cleanup needs attention for ${prefix}:`, error); process.exitCode = 1 }
}
console.log(`${results.length} pass checks succeeded.`)
