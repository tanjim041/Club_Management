import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env', 'utf-8')
const env = {}
for (const rawLine of envContent.split(/\r?\n/)) {
  const line = rawLine.trim()
  if (!line || line.startsWith('#')) continue
  const idx = line.indexOf('=')
  if (idx > -1) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })

const tables = [
  'profiles',
  'organizations',
  'organization_memberships',
  'club_segments',
  'club_achievements',
  'club_showcases',
  'fests',
  'fest_schedule_items',
  'events',
  'registrations',
  'event_teams',
  'event_team_members',
  'team_roster_snapshots',
  'event_passes',
  'event_pass_attendance',
  'operational_announcements',
  'announcement_recipients',
  'notifications',
  'passport_verifications',
  'passport_reward_ledger',
  'help_desk_requests',
]

async function inspect() {
  console.log('Database Table Counts:')
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true })
    if (error) console.log(`- ${t}: ERROR ${error.message}`)
    else console.log(`- ${t}: ${count} rows`)
  }
}

inspect()
