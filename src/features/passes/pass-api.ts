import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '../../supabase/client'
import type { Database } from '../../types/database'

export type DigitalPass = Database['public']['Functions']['my_digital_passes']['Returns'][number]
export type StaffPass = Database['public']['Functions']['staff_lookup_event_passes']['Returns'][number]
export type CheckInResult = Database['public']['Functions']['check_in_event_pass']['Returns'][number]

export async function fetchDigitalPasses() {
  const { data, error } = await getSupabaseClient().rpc('my_digital_passes')
  if (error) throw error
  return data ?? []
}

export function useDigitalPassesQuery(enabled: boolean) {
  return useQuery({ queryKey: ['digital-passes'], queryFn: fetchDigitalPasses, enabled, staleTime: 15_000 })
}

export async function fetchStaffEvents(userId: string) {
  const client = getSupabaseClient()
  const { data: memberships, error: membershipError } = await client.from('organization_memberships')
    .select('organization_id').eq('user_id', userId).eq('is_active', true)
  if (membershipError) throw membershipError
  const clubIds = [...new Set((memberships ?? []).map((row) => row.organization_id))]
  if (!clubIds.length) return []
  const { data: fests, error: festError } = await client.from('fests')
    .select('id, title').in('organization_id', clubIds)
  if (festError) throw festError
  if (!fests?.length) return []
  const festNames = new Map(fests.map((fest) => [fest.id, fest.title]))
  const { data: events, error: eventError } = await client.from('events')
    .select('id, fest_id, title, starts_at').in('fest_id', fests.map((fest) => fest.id))
    .order('starts_at', { ascending: false })
  if (eventError) throw eventError
  return (events ?? []).map((event) => ({ ...event, fest_title: festNames.get(event.fest_id) ?? 'Fest' }))
}

export function useStaffEventsQuery(userId: string | undefined) {
  return useQuery({ queryKey: ['check-in', 'events', userId], queryFn: () => fetchStaffEvents(userId!), enabled: Boolean(userId) })
}

export async function lookupStaffPasses(eventId: string, registrationId: string) {
  const { data, error } = await getSupabaseClient().rpc('staff_lookup_event_passes', {
    p_event_id: eventId, p_registration_id: registrationId,
  })
  if (error) throw error
  return data ?? []
}

export async function checkInPass(eventId: string, identifier: { token: string } | { passId: string }) {
  const { data, error } = await getSupabaseClient().rpc('check_in_event_pass', {
    p_event_id: eventId,
    p_token: 'token' in identifier ? identifier.token : null,
    p_pass_id: 'passId' in identifier ? identifier.passId : null,
  })
  if (error) throw error
  if (!data?.[0]) throw new Error('The server did not confirm this check-in.')
  return data[0]
}

export async function fetchCheckInMetrics(eventId: string) {
  const { data, error } = await getSupabaseClient().rpc('event_check_in_metrics', { p_event_id: eventId })
  if (error) throw error
  return data?.[0] ?? { confirmed_people: 0, checked_in_people: 0 }
}

export function useCheckInMetricsQuery(eventId: string | undefined) {
  return useQuery({ queryKey: ['check-in', 'metrics', eventId], queryFn: () => fetchCheckInMetrics(eventId!), enabled: Boolean(eventId), refetchInterval: 15_000 })
}
