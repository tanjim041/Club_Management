import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { getSupabaseClient } from '../../supabase/client'

const metricsSchema = z.object({
  confirmedEntries: z.coerce.number(), uniqueConfirmedParticipants: z.coerce.number(),
  confirmedRegisteredPeople: z.coerce.number(), waitlistEntries: z.coerce.number(),
  activeEvents: z.coerce.number(), checkedInPeople: z.coerce.number(), attendanceRate: z.coerce.number(),
})
const eventSchema = z.object({
  id: z.string(), festId: z.string(), title: z.string(), festTitle: z.string(), startsAt: z.string(),
  status: z.string(), capacityUnit: z.enum(['people', 'teams']), capacity: z.coerce.number(),
  confirmedEntries: z.coerce.number(), waitlistEntries: z.coerce.number(),
  confirmedPeople: z.coerce.number(), checkedInPeople: z.coerce.number(), capacityUsage: z.coerce.number(),
})
const participantSchema = z.object({
  registrationId: z.string(), eventId: z.string(), eventTitle: z.string(), userId: z.string(),
  name: z.string(), email: z.string().nullable(), teamName: z.string().nullable(),
  status: z.enum(['confirmed', 'waitlisted', 'cancelled']), registeredAt: z.string(), checkedInAt: z.string().nullable(),
})
const analyticsSchema = z.object({
  metrics: metricsSchema,
  statusDistribution: z.object({ confirmed: z.coerce.number(), waitlisted: z.coerce.number(), cancelled: z.coerce.number() }),
  growth: z.array(z.object({ day: z.string(), registrations: z.coerce.number() })),
  events: z.array(eventSchema), participants: z.array(participantSchema),
})
export type AnalyticsSnapshot = z.infer<typeof analyticsSchema>
export type AnalyticsParticipant = AnalyticsSnapshot['participants'][number]

export type AnalyticsFilters = {
  organizationId: string
  festId: string | null
  eventId: string | null
  dateFrom: string | null
  dateTo: string | null
}

export async function fetchAnalytics(filters: AnalyticsFilters): Promise<AnalyticsSnapshot> {
  const { data, error } = await getSupabaseClient().rpc('organizer_analytics', {
    p_organization_id: filters.organizationId,
    p_fest_id: filters.festId, p_event_id: filters.eventId,
    p_from: filters.dateFrom, p_to: filters.dateTo,
  })
  if (error) throw error
  return analyticsSchema.parse(data)
}

export function useAnalyticsQuery(filters: AnalyticsFilters | null) {
  return useQuery({
    queryKey: ['organizer', 'analytics', filters], queryFn: () => fetchAnalytics(filters!),
    enabled: Boolean(filters?.organizationId), staleTime: 15_000, refetchInterval: 30_000,
  })
}

export async function fetchAnalyticsFilterOptions(organizationId: string) {
  const client = getSupabaseClient()
  const { data: fests, error: festError } = await client.from('fests').select('id, title').eq('organization_id', organizationId).order('starts_at', { ascending: false })
  if (festError) throw festError
  if (!fests?.length) return { fests: [], events: [] }
  const { data: events, error: eventError } = await client.from('events').select('id, fest_id, title').in('fest_id', fests.map((fest) => fest.id)).order('starts_at', { ascending: false })
  if (eventError) throw eventError
  return { fests, events: events ?? [] }
}

export function useAnalyticsFilterOptionsQuery(organizationId: string | undefined) {
  return useQuery({ queryKey: ['organizer', 'analytics-options', organizationId], queryFn: () => fetchAnalyticsFilterOptions(organizationId!), enabled: Boolean(organizationId) })
}
