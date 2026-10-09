import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.trimStart().startsWith('#') && line.includes('='))
  .map((line) => { const index = line.indexOf('='); return [line.slice(0, index).trim(), line.slice(index + 1).trim()] }))
if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) throw new Error('Server-side Supabase credentials required')
const client = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
async function rows(table, columns, filter) {
  let request = client.from(table).select(columns)
  if (filter) request = filter(request)
  const { data, error } = await request
  if (error) throw error
  return data ?? []
}
const clubIds = Array.from({ length: 5 }, (_, index) => `22222222-2222-2222-2222-22222222222${index + 1}`)
const clubs = await rows('organizations', 'id,name,slug', (q) => q.in('id', clubIds))
const fests = await rows('fests', 'id,organization_id,title,slug,status,operational_status,starts_at,ends_at,timezone,registration_opens_at,registration_closes_at', (q) => q.in('organization_id', clubIds))
const events = await rows('events', 'id,fest_id,title,slug,status,operational_status,starts_at,ends_at,registration_opens_at,registration_closes_at,cancellation_closes_at,capacity,registration_mode,waitlist_enabled', (q) => q.in('fest_id', fests.map((fest) => fest.id)))
const registrations = await rows('registrations', 'id,event_id,status,participant_id,team_id,metadata', (q) => q.in('event_id', events.map((event) => event.id)))
const passes = await rows('event_passes', 'id,registration_id', (q) => q.in('registration_id', registrations.map((registration) => registration.id)))
const attendance = passes.length ? await rows('event_pass_attendance', 'pass_id,checked_in_at', (q) => q.in('pass_id', passes.map((pass) => pass.id))) : []
const schedules = await rows('fest_schedule_items', 'id,fest_id,title,starts_at,ends_at', (q) => q.in('fest_id', fests.map((fest) => fest.id)))
for (const fest of fests.sort((a,b) => a.starts_at.localeCompare(b.starts_at))) {
  const club = clubs.find((item) => item.id === fest.organization_id)
  console.log(`FEST ${club?.slug} ${fest.id} ${fest.title} | ${fest.starts_at} -> ${fest.ends_at} | ${fest.operational_status} | reg ${fest.registration_opens_at ?? '-'} -> ${fest.registration_closes_at ?? '-'}`)
  for (const event of events.filter((item) => item.fest_id === fest.id).sort((a,b) => a.starts_at.localeCompare(b.starts_at))) {
    const entry = registrations.filter((item) => item.event_id === event.id)
    const confirmed = entry.filter((item) => item.status === 'confirmed').length
    const waitlisted = entry.filter((item) => item.status === 'waitlisted').length
    const cancelled = entry.filter((item) => item.status === 'cancelled').length
    const eventPassIds = passes.filter((pass) => entry.some((registration) => registration.id === pass.registration_id)).map((pass) => pass.id)
    const checkins = attendance.filter((scan) => eventPassIds.includes(scan.pass_id)).length
    const nonDemo = entry.filter((item) => item.metadata?.is_demo !== true).length
    console.log(`  EVENT ${event.id} ${event.title} | ${event.starts_at} -> ${event.ends_at} | ${event.operational_status} | reg ${event.registration_opens_at ?? '-'} -> ${event.registration_closes_at ?? '-'} | cancel ${event.cancellation_closes_at ?? '-'} | ${confirmed}/${event.capacity} confirmed, ${waitlisted} waitlisted, ${cancelled} cancelled, ${checkins} pass scans, ${nonDemo} non-demo entries`)
    if (event.id.startsWith('77777777-7777-7777-7777-777777777')) console.log(`    registrations: ${entry.map((item) => `${item.id}:${item.status}:person=${item.participant_id}:team=${item.team_id ?? '-'}:demo=${item.metadata?.is_demo}`).join(' | ') || 'none'}`)
  }
  console.log(`  schedule items: ${schedules.filter((item) => item.fest_id === fest.id).map((item) => `${item.title} ${item.starts_at}->${item.ends_at}`).join(' | ') || 'none'}`)
}
const other = await rows('fests', 'id,title,starts_at,ends_at', (q) => q.ilike('title', '%DRMC%'))
console.log(`DRMC FESTS: ${JSON.stringify(other)}`)
