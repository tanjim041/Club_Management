import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient, isSupabaseConfigured } from '../../supabase/client'
import type {
  DirectoryCapacityUnit,
  DirectoryDeliveryFormat,
  DirectoryExperienceLevel,
  DirectoryOperationalStatus,
  DirectoryRegistrationState,
  PublicClubSummary,
  PublicEvent,
  PublicEventAvailability,
  PublicEventDetail,
  PublicFest,
  PublicFestAnnouncement,
  PublicFestDetail,
  PublicFestDirectoryFilters,
  PublicFestDirectoryItem,
  PublicFestDirectoryResult,
  PublicFestScheduleItem,
} from './directory-types'

const DIRECTORY_STALE_TIME = 45_000

const CLUB_COLUMNS = `
  id,
  name,
  slug,
  description,
  tagline,
  category,
  logo_url,
  cover_image_url,
  website_url,
  facebook_url
`

const FEST_COLUMNS = `
  id,
  organization_id,
  title,
  slug,
  description,
  category,
  delivery_format,
  experience_levels,
  operational_status,
  starts_at,
  ends_at,
  registration_opens_at,
  registration_closes_at,
  timezone,
  location_name,
  location_address,
  banner_url
`

const EVENT_COLUMNS = `
  id,
  fest_id,
  title,
  slug,
  description,
  category,
  subcategory,
  delivery_format,
  experience_levels,
  operational_status,
  starts_at,
  ends_at,
  registration_opens_at,
  registration_closes_at,
  venue,
  registration_mode,
  capacity,
  team_min_size,
  team_max_size,
  waitlist_enabled,
  eligibility,
  rules,
  cover_image_url
`

type RawPublicClub = {
  id: string
  name: string
  slug: string
  description: string
  tagline: string
  category: string | null
  logo_url: string | null
  cover_image_url: string | null
  website_url: string | null
  facebook_url: string | null
}

type RawPublicFest = {
  id: string
  organization_id: string
  title: string
  slug: string
  description: string
  category: string | null
  delivery_format: DirectoryDeliveryFormat
  experience_levels: DirectoryExperienceLevel[]
  operational_status: DirectoryOperationalStatus
  starts_at: string
  ends_at: string
  registration_opens_at: string | null
  registration_closes_at: string | null
  timezone: string
  location_name: string | null
  location_address: string | null
  banner_url: string | null
}

type RawPublicEvent = {
  id: string
  fest_id: string
  title: string
  slug: string
  description: string
  category: string | null
  subcategory: string | null
  delivery_format: DirectoryDeliveryFormat
  experience_levels: DirectoryExperienceLevel[]
  operational_status: DirectoryOperationalStatus
  starts_at: string
  ends_at: string
  registration_opens_at: string | null
  registration_closes_at: string | null
  venue: string | null
  registration_mode: 'individual' | 'team'
  capacity: number
  team_min_size: number | null
  team_max_size: number | null
  waitlist_enabled: boolean
  eligibility: unknown
  rules: string
  cover_image_url: string | null
}

type RawAvailability = {
  event_id: string
  confirmed_units: number
  available_capacity: number
  capacity_unit: DirectoryCapacityUnit
  registration_state: DirectoryRegistrationState
}

type RawScheduleItem = {
  id: string
  event_id: string | null
  title: string
  description: string
  starts_at: string
  ends_at: string
  venue: string | null
  sort_order: number
}

type RawAnnouncement = {
  id: string
  title: string
  body: string
  published_at: string
}

function assertSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error('Festivo data is not configured. Please check the Supabase environment variables.')
  }
}

function publicQueryError(resource: string, error: unknown): Error {
  // Keep user-facing errors safe while retaining the actual database error for
  // local diagnostics.
  console.error(`Public directory query failed: ${resource}`, error)
  return new Error(`Unable to load ${resource}. Please try again.`)
}

function throwIfQueryFailed(resource: string, error: unknown): void {
  if (error) throw publicQueryError(resource, error)
}

function normalizeSlug(slug: string | undefined): string | null {
  const normalized = slug?.trim()
  return normalized ? normalized : null
}

function toIsoDate(value: string | undefined, fieldName: string): string | undefined {
  if (!value) return undefined

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date.`)
  }

  return date.toISOString()
}

function toPublicClub(row: RawPublicClub): PublicClubSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    tagline: row.tagline,
    category: row.category,
    logoUrl: row.logo_url,
    coverImageUrl: row.cover_image_url,
    websiteUrl: row.website_url,
    facebookUrl: row.facebook_url,
  }
}

function toPublicFest(row: RawPublicFest): PublicFest {
  return {
    id: row.id,
    clubId: row.organization_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: row.category,
    deliveryFormat: row.delivery_format,
    experienceLevels: row.experience_levels,
    operationalStatus: row.operational_status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    registrationOpensAt: row.registration_opens_at,
    registrationClosesAt: row.registration_closes_at,
    timezone: row.timezone,
    locationName: row.location_name,
    locationAddress: row.location_address,
    bannerUrl: row.banner_url,
  }
}

function toAvailabilityMap(rows: RawAvailability[]): Map<string, PublicEventAvailability> {
  return new Map(
    rows.map((row) => [
      row.event_id,
      {
        confirmedUnits: row.confirmed_units,
        availableCapacity: row.available_capacity,
        capacityUnit: row.capacity_unit,
        registrationState: row.registration_state,
      },
    ]),
  )
}

function toPublicEvent(
  row: RawPublicEvent,
  availabilityByEventId: Map<string, PublicEventAvailability>,
): PublicEvent {
  return {
    id: row.id,
    festId: row.fest_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: row.category,
    subcategory: row.subcategory,
    deliveryFormat: row.delivery_format,
    experienceLevels: row.experience_levels,
    operationalStatus: row.operational_status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    registrationOpensAt: row.registration_opens_at,
    registrationClosesAt: row.registration_closes_at,
    venue: row.venue,
    registrationMode: row.registration_mode,
    capacity: row.capacity,
    teamMinSize: row.team_min_size,
    teamMaxSize: row.team_max_size,
    waitlistEnabled: row.waitlist_enabled,
    eligibility: row.eligibility,
    rules: row.rules,
    coverImageUrl: row.cover_image_url,
    availability: availabilityByEventId.get(row.id) ?? null,
  }
}

function toScheduleItem(row: RawScheduleItem): PublicFestScheduleItem {
  return {
    id: row.id,
    eventId: row.event_id,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    venue: row.venue,
    sortOrder: row.sort_order,
  }
}

function toAnnouncement(row: RawAnnouncement): PublicFestAnnouncement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    publishedAt: row.published_at,
  }
}

function summarizeFestAvailability(events: PublicEvent[]) {
  const states = new Set<DirectoryRegistrationState>()
  let openEventCount = 0
  let waitlistEventCount = 0
  let totalAvailableCapacity = 0

  for (const event of events) {
    const availability = event.availability
    if (!availability) continue

    states.add(availability.registrationState)
    totalAvailableCapacity += availability.availableCapacity
    if (availability.registrationState === 'open') openEventCount += 1
    if (availability.registrationState === 'waitlist') waitlistEventCount += 1
  }

  return {
    eventCount: events.length,
    openEventCount,
    waitlistEventCount,
    totalAvailableCapacity,
    registrationStates: Array.from(states),
  }
}

function matchesDirectorySearch(item: PublicFestDirectoryItem, search: string | undefined): boolean {
  const query = search?.trim().toLocaleLowerCase()
  if (!query) return true

  return [
    item.title,
    item.description,
    item.category ?? '',
    item.locationName ?? '',
    item.locationAddress ?? '',
    item.club.name,
    item.club.category ?? '',
  ].some((value) => value.toLocaleLowerCase().includes(query))
}

function matchesAvailability(
  item: PublicFestDirectoryItem,
  registrationState: DirectoryRegistrationState | undefined,
): boolean {
  return !registrationState || item.availability.registrationStates.includes(registrationState)
}

async function fetchPublicAvailabilityRows(): Promise<RawAvailability[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('get_public_event_availability')
  throwIfQueryFailed('event availability', error)
  return (data ?? []) as RawAvailability[]
}

async function fetchPublicEventsForFestIds(festIds: string[]): Promise<RawPublicEvent[]> {
  if (festIds.length === 0) return []

  const { data, error } = await getSupabaseClient()
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('status', 'published')
    .in('fest_id', festIds)
    .order('starts_at', { ascending: true })

  throwIfQueryFailed('fest events', error)
  return (data ?? []) as unknown as RawPublicEvent[]
}

async function fetchPublicClubBySlug(clubSlug: string): Promise<PublicClubSummary | null> {
  const { data, error } = await getSupabaseClient()
    .from('organizations')
    .select(CLUB_COLUMNS)
    .eq('slug', clubSlug)
    .eq('is_active', true)
    .eq('is_public_profile', true)
    .maybeSingle()

  throwIfQueryFailed('club profile', error)
  return data ? toPublicClub(data as unknown as RawPublicClub) : null
}

async function fetchPublicFestForPath(
  clubSlug: string,
  festSlug: string,
): Promise<{ club: PublicClubSummary; fest: PublicFest } | null> {
  const club = await fetchPublicClubBySlug(clubSlug)
  if (!club) return null

  const { data, error } = await getSupabaseClient()
    .from('fests')
    .select(FEST_COLUMNS)
    .eq('organization_id', club.id)
    .eq('slug', festSlug)
    .eq('status', 'published')
    .maybeSingle()

  throwIfQueryFailed('fest details', error)
  return data ? { club, fest: toPublicFest(data as unknown as RawPublicFest) } : null
}

/**
 * Returns published public fests together with their actual event availability.
 * It makes a fixed number of batched requests regardless of result size.
 */
export async function fetchPublicFestDirectory(
  filters: PublicFestDirectoryFilters = {},
): Promise<PublicFestDirectoryResult> {
  assertSupabaseConfigured()
  const dateFrom = toIsoDate(filters.dateFrom, 'Date from')
  const dateTo = toIsoDate(filters.dateTo, 'Date to')
  const supabase = getSupabaseClient()

  const festsQuery = supabase
    .from('fests')
    .select(FEST_COLUMNS)
    .eq('status', 'published')
    .order('starts_at', { ascending: true })

  if (filters.category?.trim()) festsQuery.eq('category', filters.category.trim())
  if (filters.deliveryFormat) festsQuery.eq('delivery_format', filters.deliveryFormat)
  if (filters.experienceLevel) festsQuery.contains('experience_levels', [filters.experienceLevel])
  if (filters.operationalStatus) festsQuery.eq('operational_status', filters.operationalStatus)
  if (dateFrom) festsQuery.gte('ends_at', dateFrom)
  if (dateTo) festsQuery.lte('starts_at', dateTo)

  const [festResponse, availabilityRows] = await Promise.all([
    festsQuery,
    fetchPublicAvailabilityRows(),
  ])
  throwIfQueryFailed('fests', festResponse.error)

  const rawFests = (festResponse.data ?? []) as unknown as RawPublicFest[]
  if (rawFests.length === 0) return { items: [], total: 0 }

  const festIds = rawFests.map((fest) => fest.id)
  const clubIds = Array.from(new Set(rawFests.map((fest) => fest.organization_id)))
  const [clubResponse, eventRows] = await Promise.all([
    supabase
      .from('organizations')
      .select(CLUB_COLUMNS)
      .in('id', clubIds)
      .eq('is_active', true)
      .eq('is_public_profile', true),
    fetchPublicEventsForFestIds(festIds),
  ])
  throwIfQueryFailed('fest hosts', clubResponse.error)

  const clubsById = new Map(
    ((clubResponse.data ?? []) as unknown as RawPublicClub[]).map((club) => [
      club.id,
      toPublicClub(club),
    ]),
  )
  const availabilityByEventId = toAvailabilityMap(availabilityRows)
  const eventsByFestId = new Map<string, PublicEvent[]>()

  for (const event of eventRows) {
    const publicEvent = toPublicEvent(event, availabilityByEventId)
    const bucket = eventsByFestId.get(publicEvent.festId) ?? []
    bucket.push(publicEvent)
    eventsByFestId.set(publicEvent.festId, bucket)
  }

  const items = rawFests.flatMap((rawFest) => {
    const club = clubsById.get(rawFest.organization_id)
    if (!club) return []

    const events = eventsByFestId.get(rawFest.id) ?? []
    const item: PublicFestDirectoryItem = {
      ...toPublicFest(rawFest),
      club,
      availability: summarizeFestAvailability(events),
    }

    return matchesDirectorySearch(item, filters.search) && matchesAvailability(item, filters.availability)
      ? [item]
      : []
  })

  return { items, total: items.length }
}

/** Returns a public fest, its schedule, announcements, and published events. */
export async function fetchPublicFestDetail(
  clubSlug: string,
  festSlug: string,
): Promise<PublicFestDetail | null> {
  assertSupabaseConfigured()
  const normalizedClubSlug = normalizeSlug(clubSlug)
  const normalizedFestSlug = normalizeSlug(festSlug)
  if (!normalizedClubSlug || !normalizedFestSlug) return null

  const context = await fetchPublicFestForPath(normalizedClubSlug, normalizedFestSlug)
  if (!context) return null

  const supabase = getSupabaseClient()
  const scheduleQuery = supabase
    .from('fest_schedule_items')
    .select('id, event_id, title, description, starts_at, ends_at, venue, sort_order')
    .eq('fest_id', context.fest.id)
    .eq('is_published', true)
    .order('starts_at', { ascending: true })
    .order('sort_order', { ascending: true })
  const announcementQuery = supabase
    .from('fest_announcements')
    .select('id, title, body, published_at')
    .eq('fest_id', context.fest.id)
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  const [eventRows, availabilityRows, scheduleResponse, announcementResponse] = await Promise.all([
    fetchPublicEventsForFestIds([context.fest.id]),
    fetchPublicAvailabilityRows(),
    scheduleQuery,
    announcementQuery,
  ])
  throwIfQueryFailed('fest schedule', scheduleResponse.error)
  throwIfQueryFailed('fest announcements', announcementResponse.error)

  const availabilityByEventId = toAvailabilityMap(availabilityRows)
  const events = eventRows.map((event) => toPublicEvent(event, availabilityByEventId))
  const scheduleItems = ((scheduleResponse.data ?? []) as unknown as RawScheduleItem[]).map(toScheduleItem)
  const announcements = ((announcementResponse.data ?? []) as unknown as RawAnnouncement[]).map(toAnnouncement)

  return {
    ...context.fest,
    club: context.club,
    availability: summarizeFestAvailability(events),
    events,
    scheduleItems,
    announcements,
  }
}

/**
 * Resolves the full nested public path before loading an event. This ensures a
 * URL cannot expose an event from a different club or fest with a matching slug.
 */
export async function fetchPublicEventDetail(
  clubSlug: string,
  festSlug: string,
  eventSlug: string,
): Promise<PublicEventDetail | null> {
  assertSupabaseConfigured()
  const normalizedClubSlug = normalizeSlug(clubSlug)
  const normalizedFestSlug = normalizeSlug(festSlug)
  const normalizedEventSlug = normalizeSlug(eventSlug)
  if (!normalizedClubSlug || !normalizedFestSlug || !normalizedEventSlug) return null

  const context = await fetchPublicFestForPath(normalizedClubSlug, normalizedFestSlug)
  if (!context) return null

  const [eventResponse, availabilityRows] = await Promise.all([
    getSupabaseClient()
      .from('events')
      .select(EVENT_COLUMNS)
      .eq('fest_id', context.fest.id)
      .eq('slug', normalizedEventSlug)
      .eq('status', 'published')
      .maybeSingle(),
    fetchPublicAvailabilityRows(),
  ])
  throwIfQueryFailed('event details', eventResponse.error)
  if (!eventResponse.data) return null

  return {
    ...toPublicEvent(
      eventResponse.data as unknown as RawPublicEvent,
      toAvailabilityMap(availabilityRows),
    ),
    fest: context.fest,
    club: context.club,
  }
}

/** Published events with their public club and fest context for discovery cards. */
export async function fetchPublicEventDirectory(): Promise<PublicEventDetail[]> {
  assertSupabaseConfigured()
  const supabase = getSupabaseClient()
  const [festResponse, availabilityRows] = await Promise.all([
    supabase
      .from('fests')
      .select(FEST_COLUMNS)
      .eq('status', 'published')
      .order('starts_at', { ascending: true }),
    fetchPublicAvailabilityRows(),
  ])
  throwIfQueryFailed('fests', festResponse.error)

  const rawFests = (festResponse.data ?? []) as unknown as RawPublicFest[]
  if (rawFests.length === 0) return []

  const clubIds = Array.from(new Set(rawFests.map((fest) => fest.organization_id)))
  const [clubResponse, rawEvents] = await Promise.all([
    supabase
      .from('organizations')
      .select(CLUB_COLUMNS)
      .in('id', clubIds)
      .eq('is_active', true)
      .eq('is_public_profile', true),
    fetchPublicEventsForFestIds(rawFests.map((fest) => fest.id)),
  ])
  throwIfQueryFailed('event hosts', clubResponse.error)

  const clubsById = new Map(
    ((clubResponse.data ?? []) as unknown as RawPublicClub[]).map((club) => [club.id, toPublicClub(club)]),
  )
  const contextsByFestId = new Map(
    rawFests.flatMap((rawFest) => {
      const club = clubsById.get(rawFest.organization_id)
      return club ? [[rawFest.id, { fest: toPublicFest(rawFest), club }] as const] : []
    }),
  )
  const availabilityByEventId = toAvailabilityMap(availabilityRows)

  return rawEvents.flatMap((row) => {
    const context = contextsByFestId.get(row.fest_id)
    return context
      ? [{ ...toPublicEvent(row, availabilityByEventId), ...context }]
      : []
  })
}

function directoryFilterQueryKey(filters: PublicFestDirectoryFilters): PublicFestDirectoryFilters {
  return {
    search: filters.search?.trim().toLocaleLowerCase() || undefined,
    category: filters.category?.trim() || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    deliveryFormat: filters.deliveryFormat,
    experienceLevel: filters.experienceLevel,
    availability: filters.availability,
    operationalStatus: filters.operationalStatus,
  }
}

export function usePublicFestDirectoryQuery(filters: PublicFestDirectoryFilters = {}) {
  const queryFilters = directoryFilterQueryKey(filters)

  return useQuery({
    queryKey: ['public-directory', 'fests', queryFilters],
    queryFn: () => fetchPublicFestDirectory(queryFilters),
    staleTime: DIRECTORY_STALE_TIME,
  })
}

export function usePublicFestDetailQuery(clubSlug: string | undefined, festSlug: string | undefined) {
  const normalizedClubSlug = normalizeSlug(clubSlug)
  const normalizedFestSlug = normalizeSlug(festSlug)

  return useQuery({
    queryKey: ['public-directory', 'fest', normalizedClubSlug, normalizedFestSlug],
    queryFn: () =>
      normalizedClubSlug && normalizedFestSlug
        ? fetchPublicFestDetail(normalizedClubSlug, normalizedFestSlug)
        : Promise.resolve(null),
    enabled: Boolean(normalizedClubSlug && normalizedFestSlug),
    staleTime: DIRECTORY_STALE_TIME,
  })
}

export function usePublicEventDetailQuery(
  clubSlug: string | undefined,
  festSlug: string | undefined,
  eventSlug: string | undefined,
) {
  const normalizedClubSlug = normalizeSlug(clubSlug)
  const normalizedFestSlug = normalizeSlug(festSlug)
  const normalizedEventSlug = normalizeSlug(eventSlug)

  return useQuery({
    queryKey: [
      'public-directory',
      'event',
      normalizedClubSlug,
      normalizedFestSlug,
      normalizedEventSlug,
    ],
    queryFn: () =>
      normalizedClubSlug && normalizedFestSlug && normalizedEventSlug
        ? fetchPublicEventDetail(normalizedClubSlug, normalizedFestSlug, normalizedEventSlug)
        : Promise.resolve(null),
    enabled: Boolean(normalizedClubSlug && normalizedFestSlug && normalizedEventSlug),
    staleTime: DIRECTORY_STALE_TIME,
  })
}

export function usePublicEventDirectoryQuery() {
  return useQuery({
    queryKey: ['public-directory', 'events'],
    queryFn: fetchPublicEventDirectory,
    staleTime: DIRECTORY_STALE_TIME,
  })
}
