import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env', 'utf-8')
const env = {}
for (const rawLine of envContent.split(/\r?\n/)) {
  const line = rawLine.trim()
  if (!line || line.startsWith('#')) continue
  const idx = line.indexOf('=')
  if (idx > -1) {
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
}

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
const supabaseAnonKey = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY
const client = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: 'admin@festivo.org',
    password: 'Password123!'
  })
  if (authErr) {
    console.error('Auth error:', authErr)
    return
  }
  console.log('Logged in as:', auth.user.email, 'ID:', auth.user.id)

  const { data: clubs, error: clubsErr } = await client.from('organizations').select('id, name, slug')
  console.log('Clubs found:', clubs?.length)

  for (const club of clubs || []) {
    console.log(`\n--- Testing Club: ${club.name} (${club.slug}) [${club.id}] ---`)
    
    // Check if user is organizer of club
    const { data: orgMember, error: orgMemberErr } = await client
      .from('club_organizers')
      .select('*')
      .eq('organization_id', club.id)
      .eq('user_id', auth.user.id)
    console.log('Is club_organizer row present?', orgMember, orgMemberErr ? `Err: ${orgMemberErr.message}` : '')

    // Fests
    const { data: fests, error: festError } = await client
      .from('fests')
      .select('id, title')
      .eq('organization_id', club.id)
    if (festError) {
      console.log('fests ERROR:', festError)
      continue
    }
    console.log('Fests count:', fests?.length)
    const festIds = fests?.map(f => f.id) ?? []
    if (festIds.length === 0) {
      console.log('No fests for club.')
      continue
    }

    // Events
    const { data: events, error: eventsError } = await client
      .from('events')
      .select('id, title')
      .in('fest_id', festIds)
    if (eventsError) {
      console.log('events ERROR:', eventsError)
      continue
    }
    console.log('Events count:', events?.length)
    const eventIds = events?.map(e => e.id) ?? []
    if (eventIds.length === 0) {
      console.log('No events for club.')
      continue
    }

    // Registrations
    const { data: regs, error: regError } = await client
      .from('registrations')
      .select(`
        id,
        event_id,
        participant_id,
        status,
        events (id, title),
        profiles!registrations_participant_id_fkey (id, full_name, email, institution)
      `)
      .in('event_id', eventIds)
    if (regError) {
      console.log('registrations ERROR:', regError)
    } else {
      console.log('Registrations count:', regs?.length)
    }

    // Check-in summary RPC
    const { data: att, error: attError } = await client.rpc('organization_check_in_summary', {
      p_organization_id: club.id
    })
    if (attError) {
      console.log('check-in RPC ERROR:', attError)
    } else {
      console.log('Check-in RPC count:', att?.length)
    }

    // Team rosters RPC
    const { data: rost, error: rostError } = await client.rpc('organizer_team_rosters', {
      p_organization_id: club.id
    })
    if (rostError) {
      console.log('roster RPC ERROR:', rostError)
    } else {
      console.log('Roster RPC count:', rost?.length)
    }
  }
}

test()
