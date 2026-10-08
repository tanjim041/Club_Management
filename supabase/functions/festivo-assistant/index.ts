import { authenticatedClient, corsHeaders, explainWithProvider, json } from '../_shared/ai.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  try {
    const auth = await authenticatedClient(request)
    if (!auth) return json({ error: 'authentication_required' }, 401)
    const input = await request.json()
    const question = typeof input?.question === 'string' ? input.question.trim().slice(0, 1000) : ''
    if (!question) return json({ error: 'question_required' }, 400)
    const [profile, schedule, events, facts] = await Promise.all([
      auth.client.from('profiles').select('full_name, interests, skills, experience_level').eq('id', auth.user.id).single(),
      auth.client.rpc('my_confirmed_schedule'),
      auth.client.from('events').select('id, title, category, starts_at, ends_at, registration_mode, status, operational_status')
        .eq('status', 'published').eq('operational_status', 'scheduled').gt('ends_at', new Date().toISOString())
        .order('starts_at').limit(30),
      auth.client.rpc('my_event_match_facts'),
    ])
    if (profile.error || schedule.error || events.error || facts.error) return json({ error: 'authorized_context_unavailable' }, 503)
    const eligible = new Set((facts.data ?? []).filter((fact: { eligibility_error: string | null; already_registered: boolean }) => !fact.eligibility_error && !fact.already_registered).map((fact: { event_id: string }) => fact.event_id))
    const context = {
      profile: profile.data,
      confirmedSchedule: (schedule.data ?? []).slice(0, 15).map((row: { event_title: string; starts_at: string; ends_at: string }) => ({ title: row.event_title, startsAt: row.starts_at, endsAt: row.ends_at })),
      availableEvents: (events.data ?? []).filter((event: { id: string }) => eligible.has(event.id)).slice(0, 15)
        .map((event: { title: string; category: string | null; starts_at: string; registration_mode: string }) => ({ title: event.title, category: event.category, startsAt: event.starts_at, mode: event.registration_mode })),
    }
    const fallback = `You have ${context.confirmedSchedule.length} confirmed schedule item(s). ${context.availableEvents.length ? `Eligible events to explore include ${context.availableEvents.slice(0, 3).map((event: { title: string }) => event.title).join(', ')}.` : 'No eligible upcoming events were found in the current public catalog.'} Open Event Matcher for scored recommendations and check each event’s current availability before registering.`
    return json(await explainWithProvider('You are Festivo’s read-only student event assistant. Use only the current authorized facts.', context, question, fallback))
  } catch { return json({ error: 'assistant_unavailable' }, 503) }
})
