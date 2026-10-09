import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { randomUUID } from 'crypto'

const envContent = fs.readFileSync('.env', 'utf-8')
const env = {}
for (const rawLine of envContent.split(/\r?\n/)) {
  const line = rawLine.trim()
  if (!line || line.startsWith('#')) continue
  const idx = line.indexOf('=')
  if (idx > -1) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY)

async function seedMissingRegistrations() {
  console.log('Fetching participants...')
  const { data: participants } = await supabase.from('profiles').select('id, full_name, email')
  const participantUsers = participants.filter(p => !p.email.includes('admin') && !p.email.includes('staff'))
  console.log(`Found ${participantUsers.length} participant profiles`)

  const clubIds = [
    '26c834b8-9723-467c-a2e6-84a36f9edc64', // Campus Sandbox
    '0ac157be-d13e-4f1d-96e0-ec377995c4b9', // DRMC IT CLUB
  ]

  for (const orgId of clubIds) {
    const { data: org } = await supabase.from('organizations').select('name, slug').eq('id', orgId).single()
    console.log(`\nChecking events for ${org?.name}...`)

    const { data: fests } = await supabase.from('fests').select('id').eq('organization_id', orgId)
    const festIds = fests?.map(f => f.id) ?? []
    if (!festIds.length) continue

    const { data: events } = await supabase.from('events').select('id, title, registration_mode').in('fest_id', festIds)
    if (!events?.length) continue

    console.log(`Found ${events.length} events for ${org?.name}`)

    const targetEvents = events.slice(0, 5)
    for (let i = 0; i < targetEvents.length; i++) {
      const event = targetEvents[i]
      const participant = participantUsers[i % participantUsers.length]

      // Check existing registration
      const { data: existing } = await supabase
        .from('registrations')
        .select('id')
        .eq('event_id', event.id)
        .eq('participant_id', participant.id)

      if (!existing || existing.length === 0) {
        const regId = randomUUID()
        const status = i % 4 === 3 ? 'waitlisted' : 'confirmed'
        const regRow = {
          id: regId,
          event_id: event.id,
          participant_id: participant.id,
          status,
          waitlist_position: status === 'waitlisted' ? 1 : null,
          registered_at: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
          confirmed_at: status === 'confirmed' ? new Date(Date.now() - (i + 1) * 86400000).toISOString() : null,
          metadata: {
            notes: `Demo registration for ${event.title}`,
            institution: 'Horizon Institute of Technology'
          }
        }

        const { error: regErr } = await supabase.from('registrations').insert(regRow)
        if (regErr) {
          console.error(`Failed to insert registration: ${regErr.message}`)
        } else {
          console.log(`+ Added ${status} registration for ${participant.full_name} -> ${event.title}`)

          // Also create an event pass for confirmed registrations
          if (status === 'confirmed') {
            await supabase.from('event_passes').upsert({
              registration_id: regId,
              user_id: participant.id,
              event_id: event.id,
              status: 'active',
              qr_payload: `festivo://pass/${regId}`
            }, { onConflict: 'registration_id', ignoreDuplicates: true })
          }
        }
      }
    }
  }

  console.log('\nSeed missing registrations finished!')
}

seedMissingRegistrations()
