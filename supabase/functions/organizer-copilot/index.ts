import { authenticatedClient, corsHeaders, explainWithProvider, json } from '../_shared/ai.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  try {
    const auth = await authenticatedClient(request)
    if (!auth) return json({ error: 'authentication_required' }, 401)
    const input = await request.json()
    const organizationId = typeof input?.organizationId === 'string' ? input.organizationId : ''
    const question = typeof input?.question === 'string' ? input.question.trim().slice(0, 1000) : ''
    if (!/^[0-9a-f-]{36}$/i.test(organizationId) || !question) return json({ error: 'invalid_request' }, 400)
    const { data, error } = await auth.client.rpc('organizer_analytics', {
      p_organization_id: organizationId,
      p_fest_id: typeof input.festId === 'string' && input.festId ? input.festId : null,
      p_event_id: typeof input.eventId === 'string' && input.eventId ? input.eventId : null,
      p_from: typeof input.dateFrom === 'string' && input.dateFrom ? input.dateFrom : null,
      p_to: typeof input.dateTo === 'string' && input.dateTo ? input.dateTo : null,
    })
    if (error) return json({ error: error.message.includes('not_authorized') || error.message.includes('out_of_scope') ? 'not_authorized' : 'analytics_unavailable' }, error.message.includes('not_authorized') || error.message.includes('out_of_scope') ? 403 : 503)
    // Never send the authorized participant roster or contact details to the AI provider.
    const summary = { metrics: data.metrics, statusDistribution: data.statusDistribution,
      growth: data.growth, events: data.events }
    const fallback = `Calculated results: ${data.metrics.confirmedEntries} confirmed entries, ${data.metrics.uniqueConfirmedParticipants} unique confirmed participants, ${data.metrics.waitlistEntries} waitlist entries, and ${data.metrics.checkedInPeople}/${data.metrics.confirmedRegisteredPeople} checked-in/confirmed people-places (${data.metrics.attendanceRate}% attendance). Review the charts and event capacity table for detail.`
    const explanation = await explainWithProvider('You are Festivo Organizer Copilot. Explain already-calculated event metrics only. No writes or recommendations that imply an action occurred.', summary, question, fallback)
    return json({ ...explanation, calculated: summary })
  } catch { return json({ error: 'copilot_unavailable' }, 503) }
})
