import { anonymousClient, authenticatedClient, corsHeaders, explainWithProvider, json } from '../_shared/ai.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  try {
    const auth = await authenticatedClient(request)
    const input = await request.json()
    const question = typeof input?.question === 'string' ? input.question.trim().slice(0, 1000) : ''
    const targetEventId = typeof input?.eventId === 'string' && /^[0-9a-f-]{36}$/i.test(input.eventId) ? input.eventId : null
    if (!question) return json({ error: 'question_required' }, 400)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildEventLink = (ev: any) => {
      const orgSlug = ev?.fest?.organization?.slug
      const festSlug = ev?.fest?.slug
      const eventSlug = ev?.slug
      return orgSlug && festSlug && eventSlug ? `/fests/${orgSlug}/${festSlug}/events/${eventSlug}` : '/events'
    }

    if (!auth) {
      const isPersonal = /\bmy\b.*?\b(schedule|registration|registrations|pass|passes|team|teams)|am\s+i\s+registered/i.test(question)
      if (isPersonal) {
        return json({
          answer: 'Sign-in required: Please sign in to your Festivo participant account to view your personal schedule, registrations, or event passes.',
          aiAvailable: false,
          note: 'Sign-in required for personal schedule queries.',
        })
      }
      const anon = anonymousClient()
      const publicEventsRes = await anon.from('events')
        .select('id, title, slug, category, starts_at, ends_at, venue, registration_mode, status, operational_status, fest:fests(slug, organization:organizations(slug))')
        .eq('status', 'published').eq('operational_status', 'scheduled').gt('ends_at', new Date().toISOString())
        .order('starts_at').limit(20)
      if (publicEventsRes.error) return json({ error: 'public_catalog_unavailable' }, 503)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const availableList = (publicEventsRes.data ?? []).map((event: any) => ({
        title: event.title,
        category: event.category,
        startsAt: event.starts_at,
        venue: event.venue || 'Campus Venue TBA',
        mode: event.registration_mode,
        link: buildEventLink(event),
      }))
      const context = {
        visitor: 'unauthenticated',
        availableEvents: availableList,
        note: 'User is not signed in. For personal schedule, pass, or registration questions, advise them to sign in to Festivo.',
      }
      const fallback = `Browse our published campus events: ${availableList.slice(0, 3).map((e) => `${e.title} (${e.link})`).join(', ')}. Sign in to access your personal schedule and event passes.`
      return json(await explainWithProvider('You are Festivo’s read-only student event assistant. Use only the current authorized facts. When recommending or discussing an upcoming event, provide its title and link (e.g. /fests/.../events/...). For personal schedules or passes, state that sign-in is required.', context, question, fallback))
    }

    const [profile, schedule, events, facts, target] = await Promise.all([
      auth.client.from('profiles').select('full_name, interests, skills, experience_level').eq('id', auth.user.id).single(),
      auth.client.rpc('my_confirmed_schedule'),
      auth.client.from('events').select('id, title, slug, category, starts_at, ends_at, venue, registration_mode, status, operational_status, fest:fests(slug, organization:organizations(slug))')
        .eq('status', 'published').eq('operational_status', 'scheduled').gt('ends_at', new Date().toISOString())
        .order('starts_at').limit(30),
      auth.client.rpc('my_event_match_facts'),
      targetEventId ? auth.client.from('events').select('id, title, slug, category, starts_at, ends_at, venue, registration_mode, status, operational_status, fest:fests(slug, organization:organizations(slug))')
        .eq('id', targetEventId).eq('status', 'published').eq('operational_status', 'scheduled')
        .gt('ends_at', new Date().toISOString()).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ])
    if (profile.error || schedule.error || events.error || facts.error || target.error) return json({ error: 'authorized_context_unavailable' }, 503)
    const eligible = new Set((facts.data ?? []).filter((fact: { eligibility_error: string | null; already_registered: boolean }) => !fact.eligibility_error && !fact.already_registered).map((fact: { event_id: string }) => fact.event_id))

    const availableList = (events.data ?? []).filter((event: { id: string }) => eligible.has(event.id)).slice(0, 15)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((event: any) => ({
        title: event.title,
        category: event.category,
        startsAt: event.starts_at,
        venue: event.venue || 'Campus Venue TBA',
        mode: event.registration_mode,
        link: buildEventLink(event),
      }))

    const targetEventData = target.data ? {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(target.data as any),
      link: buildEventLink(target.data),
    } : null

    const context = {
      profile: profile.data,
      confirmedSchedule: (schedule.data ?? []).slice(0, 15).map((row: { event_title: string; starts_at: string; ends_at: string }) => ({ title: row.event_title, startsAt: row.starts_at, endsAt: row.ends_at })),
      availableEvents: availableList,
      targetEvent: targetEventData,
      targetFacts: targetEventId ? (facts.data ?? []).find((fact: { event_id: string }) => fact.event_id === targetEventId) ?? null : null,
    }
    if (targetEventId && (!context.targetEvent || !context.targetFacts)) return json({ error: 'event_unavailable' }, 404)
    const fallback = context.targetEvent && context.targetFacts
      ? `${context.targetEvent.title}: ${context.targetFacts.eligibility_error ? `eligibility needs review (${context.targetFacts.eligibility_error})` : 'your current profile meets the deterministic eligibility rules'}. ${context.targetFacts.has_blocking_conflict ? 'A blocking schedule conflict must be resolved.' : context.targetFacts.conflict_titles?.length ? `Schedule overlap with ${context.targetFacts.conflict_titles.join(', ')} needs explicit acknowledgement.` : 'No confirmed schedule overlap was found.'} Event page: ${context.targetEvent.link}. Review live availability and rules on the event page before acting.`
      : `You have ${context.confirmedSchedule.length} confirmed schedule item(s). ${context.availableEvents.length ? `Eligible events to explore include ${context.availableEvents.slice(0, 3).map((event: { title: string; link: string }) => `${event.title} (${event.link})`).join(', ')}.` : 'No eligible upcoming events were found in the current public catalog.'} Open Event Matcher for scored recommendations and check each event’s current availability before registering.`
    return json(await explainWithProvider('You are Festivo’s read-only student event assistant. Use only the current authorized facts. When recommending or discussing an upcoming event, provide its title and link (e.g. /fests/.../events/...). Cite only supplied facts.', context, question, fallback))
  } catch { return json({ error: 'assistant_unavailable' }, 503) }
})
