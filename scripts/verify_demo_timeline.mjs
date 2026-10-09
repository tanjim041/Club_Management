import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.trimStart().startsWith('#') && line.includes('='))
  .map((line) => { const index = line.indexOf('='); return [line.slice(0, index).trim(), line.slice(index + 1).trim()] }))
for (const key of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_PUBLISHABLE_KEY']) {
  assert.ok(env[key], `Missing ${key}`)
}
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
const publicClient = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
const check = (result) => { if (result.error) throw result.error; return result.data ?? [] }
const localDate = (iso) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(iso))
const upcomingIds = ['101', '201', '301', '401', '501'].map((n) => `33333333-3333-3333-3333-333333333${n}`)
const fests = check(await admin.from('fests').select('*').in('id', upcomingIds))
assert.equal(fests.length, 5)
const events = check(await admin.from('events').select('*').in('fest_id', upcomingIds))
assert.equal(events.length, 15)
const festMap = new Map(fests.map((fest) => [fest.id, fest]))
for (const fest of fests) {
  assert.equal(fest.timezone, 'Asia/Dhaka')
  assert.equal(fest.status, 'published')
  assert.match(localDate(fest.starts_at), /^11\/\d\d\/2026$|^2026-11-\d\d$/)
  assert.match(localDate(fest.ends_at), /^11\/\d\d\/2026$|^2026-11-\d\d$/)
}
for (const event of events) {
  const fest = festMap.get(event.fest_id)
  assert.equal(event.status, 'published')
  assert.equal(event.operational_status, 'scheduled')
  assert.match(localDate(event.starts_at), /^11\/\d\d\/2026$|^2026-11-\d\d$/)
  assert.ok(Date.parse(fest.starts_at) <= Date.parse(event.starts_at), `${event.title}: before fest`)
  assert.ok(Date.parse(event.ends_at) <= Date.parse(fest.ends_at), `${event.title}: after fest`)
  assert.ok(Date.parse(event.registration_opens_at) < Date.parse(event.registration_closes_at), `${event.title}: window`)
  assert.ok(Date.parse(event.registration_closes_at) < Date.parse(event.starts_at), `${event.title}: deadline`)
  assert.equal(Date.parse(event.cancellation_closes_at), Date.parse(event.starts_at))
}
const publicFests = check(await publicClient.from('fests').select('id,starts_at,ends_at,timezone').in('id', upcomingIds))
const publicEvents = check(await publicClient.from('events').select('id,fest_id,starts_at,ends_at,registration_closes_at').in('fest_id', upcomingIds))
assert.equal(publicFests.length, 5, 'Public cards must see all upcoming demo fests')
assert.equal(publicEvents.length, 15, 'Public detail pages must see all upcoming demo events')
for (const row of publicEvents) {
  const saved = events.find((event) => event.id === row.id)
  assert.equal(Date.parse(row.starts_at), Date.parse(saved.starts_at))
  assert.equal(Date.parse(row.registration_closes_at), Date.parse(saved.registration_closes_at))
}
const availability = check(await publicClient.rpc('get_public_event_availability'))
const availabilityBySuffix = (suffix) => availability.find((row) => row.event_id === `77777777-7777-7777-7777-777777777${suffix}`)
for (const [suffix, state] of Object.entries({ 101: 'open', 102: 'waitlist', 201: 'open', 202: 'full', 203: 'closed', 302: 'waitlist', 402: 'closed', 403: 'open', 502: 'waitlist' })) {
  assert.equal(availabilityBySuffix(suffix)?.registration_state, state, `Event ${suffix} backend state`)
}
for (const suffix of ['102', '302', '502']) {
  const row = availabilityBySuffix(suffix)
  assert.equal(row.available_capacity, 0)
  assert.equal(row.capacity_unit, 'teams')
}
const registrations = check(await admin.from('registrations').select('id,event_id,status,metadata').in('event_id', events.map((event) => event.id)))
assert.ok(registrations.every((row) => row.metadata?.is_demo === true), 'Unexpected real registration in demo fixture')
const passes = check(await admin.from('event_passes').select('id,registration_id').in('registration_id', registrations.map((row) => row.id)))
if (passes.length) {
  const scans = check(await admin.from('event_pass_attendance').select('pass_id,checked_in_at').in('pass_id', passes.map((pass) => pass.id)))
  assert.equal(scans.length, 0, 'Upcoming demo events must not already have attendance')
}
const historicalFest = check(await admin.from('fests').select('*').eq('id', '33333333-3333-3333-3333-333333333403'))[0]
const historicalEvent = check(await admin.from('events').select('*').eq('id', '77777777-7777-7777-7777-777777777405'))[0]
assert.match(historicalFest.title, /\[Historical Demo\]/)
assert.match(historicalEvent.title, /\[Historical Demo\]/)
assert.equal(historicalEvent.operational_status, 'completed')
assert.ok(Date.parse(historicalEvent.starts_at) >= Date.parse(historicalFest.starts_at))
assert.ok(Date.parse(historicalEvent.ends_at) <= Date.parse(historicalFest.ends_at))
assert.equal(availabilityBySuffix('405')?.registration_state, 'completed')
const historicalReg = check(await admin.from('registrations').select('id').eq('event_id', historicalEvent.id))
const historicalPass = check(await admin.from('event_passes').select('id').eq('registration_id', historicalReg[0].id))
const historicalScan = check(await admin.from('event_pass_attendance').select('checked_in_at').eq('pass_id', historicalPass[0].id))
assert.equal(historicalScan.length, 1)
assert.ok(Date.parse(historicalScan[0].checked_in_at) >= Date.parse(historicalEvent.starts_at))
assert.ok(Date.parse(historicalScan[0].checked_in_at) <= Date.parse(historicalEvent.ends_at))
for (const [a, b] of [['102', '103'], ['302', '303'], ['502', '503']]) {
  const one = events.find((event) => event.id.endsWith(a))
  const two = events.find((event) => event.id.endsWith(b))
  assert.ok(Date.parse(one.starts_at) < Date.parse(two.ends_at) && Date.parse(two.starts_at) < Date.parse(one.ends_at), `Conflict ${a}/${b}`)
}
const asOf = new Date('2026-10-09T00:00:00+06:00').getTime()
assert.equal(events.filter((event) => Date.parse(event.starts_at) <= asOf && asOf < Date.parse(event.ends_at)).length, 0,
  'Live Fest must not claim a November event is happening on October 9')
console.log('Public cards/details: 5 fests and 15 events match saved dates')
console.log('Backend registration states:', Object.fromEntries(['101', '102', '201', '202', '203', '302', '402', '403', '502', '405']
  .map((suffix) => [suffix, availabilityBySuffix(suffix).registration_state])))
console.log('Registration buttons: open/waitlist enabled; full/closed/completed disabled by derived state')
console.log('Upcoming attendance: zero premature scans; historical attendance: one in-window scan')
console.log('Schedule overlaps: 102/103, 302/303, 502/503; Live Fest on Oct 9: none happening')

const participant = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
const login = await participant.auth.signInWithPassword({ email: 'participant1@festivo.org', password: 'Password123!' })
if (login.error) throw new Error(`Demo participant login failed: ${login.error.message}`)
const schedule = check(await participant.rpc('my_confirmed_schedule'))
const facts = check(await participant.rpc('my_event_match_facts'))
assert.ok(schedule.length > 0, 'My Schedule should include confirmed demo entries')
const knownEventIds = new Set(events.map((event) => event.id))
assert.ok(schedule.some((row) => knownEventIds.has(row.event_id)), 'My Schedule must include a November event')
assert.ok(Array.isArray(facts), 'Matcher facts should be returned')
console.log(`Authenticated My Schedule: ${schedule.length} rows, November demo included; Event Matcher facts: ${facts.length} rows`)
console.log('Demo timeline verification passed')
