import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient, isSupabaseConfigured } from '../../supabase/client'

export interface RegistrationMetadata {
  is_demo?: boolean
  team_name?: string
  team_members?: string[]
  team_roster?: Array<{ name: string; email: string; role?: string }>
  attendance_status?: 'verified' | 'unverified'
  checked_in_at?: string
  cancellation_reason?: string
  [key: string]: unknown
}

export interface UserRegistration {
  id: string
  event_id: string
  team_id: string | null
  status: 'confirmed' | 'waitlisted' | 'cancelled'
  waitlist_position: number | null
  current_waitlist_position?: number | null
  registered_at: string
  confirmed_at: string | null
  cancelled_at?: string | null
  metadata: RegistrationMetadata | null
  events: {
    id: string
    title: string
    slug: string
    starts_at: string
    ends_at: string
    cancellation_closes_at: string | null
    venue: string | null
    registration_mode: 'individual' | 'team'
    category: string | null
    fests?: {
      id: string
      title: string
      slug: string
      organizations?: { slug: string } | null
    } | null
  } | null
}

export async function fetchParticipantRegistrations(userId: string): Promise<UserRegistration[]> {
  if (!isSupabaseConfigured() || !userId) return []

  const supabase = getSupabaseClient()
  const { data: teamRows, error: teamError } = await supabase.rpc('my_team_registration_ids')
  if (teamError) throw new Error(`Failed to load team registrations: ${teamError.message}`)
  const teamIds = (teamRows ?? []).map((row) => row.registration_id)
  const query = supabase
    .from('registrations')
    .select(`
      id,
      event_id,
      team_id,
      status,
      waitlist_position,
      registered_at,
      confirmed_at,
      cancelled_at,
      metadata,
      events (
        id,
        title,
        slug,
        starts_at,
        ends_at,
        cancellation_closes_at,
        venue,
        registration_mode,
        category,
        fests (
          id,
          title,
          slug,
          organizations (slug)
        )
      )
    `)
  const { data, error } = await (teamIds.length
    ? query.or(`participant_id.eq.${userId},id.in.(${teamIds.join(',')})`)
    : query.eq('participant_id', userId)
  ).order('registered_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to load your registrations: ${error.message}`)
  }
  const { data: ranks, error: ranksError } = await supabase.rpc('my_waitlist_positions')
  if (ranksError) throw new Error(`Failed to load waitlist positions: ${ranksError.message}`)
  const rankById = new Map((ranks ?? []).map((row) => [row.registration_id, row.current_position]))
  return ((data as unknown as UserRegistration[]) ?? []).map((row) => ({
    ...row,
    current_waitlist_position: row.status === 'waitlisted' ? rankById.get(row.id) ?? null : null,
  }))
}

export interface ClubOrganization {
  id: string
  name: string
  slug: string
  description: string
  logo_url: string | null
  website_url: string | null
  owner_id: string
  is_active: boolean
  institute_id: string | null
  is_public_profile: boolean
  tagline: string
  cover_image_url: string | null
  facebook_url: string | null
  category: string | null
}

export async function fetchAuthorizedClubs(userId: string): Promise<ClubOrganization[]> {
  if (!isSupabaseConfigured() || !userId) return []

  const supabase = getSupabaseClient()
  const clubFields = 'id, name, slug, description, logo_url, website_url, owner_id, is_active, institute_id, is_public_profile, tagline, cover_image_url, facebook_url, category' as const

  // RLS remains the authorization boundary; this function only resolves
  // organizations the caller already owns or has an active membership for.
  const [ownedResult, membershipsResult] = await Promise.all([
    supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', userId),
    supabase
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('role', 'organizer')
      .eq('is_active', true),
  ])

  if (ownedResult.error) {
    throw new Error(`Failed to load owned clubs: ${ownedResult.error.message}`)
  }

  if (membershipsResult.error) {
    throw new Error(`Failed to load club memberships: ${membershipsResult.error.message}`)
  }

  const orgIds = new Set<string>()
  ownedResult.data?.forEach((organization) => orgIds.add(organization.id))
  membershipsResult.data?.forEach((membership) => orgIds.add(membership.organization_id))

  if (orgIds.size === 0) {
    return []
  }

  const { data: organizations, error } = await supabase
    .from('organizations')
    .select(clubFields)
    .in('id', Array.from(orgIds))

  if (error) {
    throw new Error(`Failed to load authorized clubs: ${error.message}`)
  }

  return (organizations as ClubOrganization[]) ?? []
}

export interface OrganizerStats {
  festCount: number
  eventCount: number
  regCount: number
}

export interface OrganizerClubEvent {
  id: string
  fest_id: string
  title: string
  category: string | null
  venue: string | null
  starts_at: string
  registration_mode: 'individual' | 'team'
  capacity: number
  status: 'draft' | 'published' | 'cancelled' | 'archived' | 'completed'
}

export async function fetchOrganizerClubEvents(organizationId: string): Promise<OrganizerClubEvent[]> {
  if (!isSupabaseConfigured() || !organizationId) return []

  const supabase = getSupabaseClient()
  const { data: fests, error: festError } = await supabase
    .from('fests')
    .select('id')
    .eq('organization_id', organizationId)

  if (festError) throw new Error(`Failed to load club fests: ${festError.message}`)
  const festIds = fests?.map((fest) => fest.id) ?? []
  if (festIds.length === 0) return []

  const { data, error } = await supabase
    .from('events')
    .select('id, fest_id, title, category, venue, starts_at, registration_mode, capacity, status')
    .in('fest_id', festIds)
    .order('starts_at', { ascending: true })

  if (error) throw new Error(`Failed to load club events: ${error.message}`)
  return (data ?? []) as OrganizerClubEvent[]
}

export async function fetchOrganizerStats(organizationId: string): Promise<OrganizerStats> {
  if (!isSupabaseConfigured() || !organizationId) {
    return { festCount: 0, eventCount: 0, regCount: 0 }
  }

  const supabase = getSupabaseClient()

  const { data: fests, error: festsError } = await supabase
    .from('fests')
    .select('id')
    .eq('organization_id', organizationId)

  if (festsError) {
    throw new Error(`Failed to load club fests: ${festsError.message}`)
  }

  const festIds = fests?.map((fest) => fest.id) ?? []
  if (festIds.length === 0) {
    return { festCount: 0, eventCount: 0, regCount: 0 }
  }

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id')
    .in('fest_id', festIds)

  if (eventsError) {
    throw new Error(`Failed to load club events: ${eventsError.message}`)
  }

  const eventIds = events?.map((event) => event.id) ?? []
  if (eventIds.length === 0) {
    return { festCount: festIds.length, eventCount: 0, regCount: 0 }
  }

  const { count: registrationCount, error: registrationsError } = await supabase
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .in('event_id', eventIds)

  if (registrationsError) {
    throw new Error(`Failed to load club registrations: ${registrationsError.message}`)
  }

  return {
    festCount: festIds.length,
    eventCount: eventIds.length,
    regCount: registrationCount ?? 0,
  }
}

export function useParticipantRegistrationsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['participant', 'registrations', userId],
    queryFn: () => (userId ? fetchParticipantRegistrations(userId) : Promise.resolve([])),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}

export function useAuthorizedClubsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['organizer', 'clubs', userId],
    queryFn: () => (userId ? fetchAuthorizedClubs(userId) : Promise.resolve([])),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}

export function useOrganizerStatsQuery(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organizer', 'stats', organizationId],
    queryFn: () =>
      organizationId
        ? fetchOrganizerStats(organizationId)
        : Promise.resolve({ festCount: 0, eventCount: 0, regCount: 0 }),
    enabled: Boolean(organizationId),
    staleTime: 30_000,
  })
}

export function useOrganizerClubEventsQuery(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organizer', 'club-events', organizationId],
    queryFn: () => (organizationId ? fetchOrganizerClubEvents(organizationId) : Promise.resolve([])),
    enabled: Boolean(organizationId),
    staleTime: 30_000,
  })
}

export interface OrganizerClubRegistration {
  id: string
  checked_in_people: number
  confirmed_people: number
  event_id: string
  team_id: string | null
  participant_id: string
  status: 'confirmed' | 'waitlisted' | 'cancelled'
  waitlist_position: number | null
  registered_at: string
  confirmed_at: string | null
  cancelled_at: string | null
  metadata: RegistrationMetadata | null
  events: {
    id: string
    title: string
    registration_mode: 'individual' | 'team'
    category: string | null
    starts_at: string
    venue: string | null
  } | null
  profiles: {
    id: string
    full_name: string | null
    email: string | null
    institution: string | null
  } | null
}

export async function fetchOrganizerClubRegistrations(organizationId: string): Promise<OrganizerClubRegistration[]> {
  if (!isSupabaseConfigured() || !organizationId) return []

  const supabase = getSupabaseClient()
  const { data: fests, error: festError } = await supabase
    .from('fests')
    .select('id')
    .eq('organization_id', organizationId)

  if (festError) throw new Error(`Failed to load club fests: ${festError.message}`)
  const festIds = fests?.map((fest) => fest.id) ?? []
  if (festIds.length === 0) return []

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id')
    .in('fest_id', festIds)

  if (eventsError) throw new Error(`Failed to load club events: ${eventsError.message}`)
  const eventIds = events?.map((event) => event.id) ?? []
  if (eventIds.length === 0) return []

  const { data, error } = await supabase
    .from('registrations')
    .select(`
      id,
      event_id,
      participant_id,
      team_id,
      status,
      waitlist_position,
      registered_at,
      confirmed_at,
      cancelled_at,
      metadata,
      events (
        id,
        title,
        registration_mode,
        category,
        starts_at,
        venue
      ),
      profiles (
        id,
        full_name,
        email,
        institution
      )
    `)
    .in('event_id', eventIds)
    .order('registered_at', { ascending: false })

  if (error) throw new Error(`Failed to load club registrations: ${error.message}`)
  const { data: attendance, error: attendanceError } = await supabase.rpc('organization_check_in_summary', {
    p_organization_id: organizationId,
  })
  if (attendanceError) throw new Error(`Failed to load gate attendance: ${attendanceError.message}`)
  const attendanceByRegistration = new Map((attendance ?? []).map((row) => [row.registration_id, row]))
  const registrations = ((data ?? []) as unknown as OrganizerClubRegistration[]).map((row) => ({
    ...row,
    checked_in_people: Number(attendanceByRegistration.get(row.id)?.checked_in_people ?? 0),
    confirmed_people: Number(attendanceByRegistration.get(row.id)?.confirmed_people ?? 0),
  }))
  if (!registrations.some((row) => row.team_id)) return registrations
  const { data: roster, error: rosterError } = await supabase.rpc('organizer_team_rosters', {
    p_organization_id: organizationId,
  })
  if (rosterError) throw new Error(`Failed to load team rosters: ${rosterError.message}`)
  const rosterByRegistration = new Map<string, RegistrationMetadata['team_roster']>()
  for (const member of roster ?? []) {
    const list = rosterByRegistration.get(member.registration_id) ?? []
    list.push({ name: member.full_name, email: member.email, role: member.is_captain ? 'Captain' : 'Member' })
    rosterByRegistration.set(member.registration_id, list)
  }
  return registrations.map((row) => ({
    ...row,
    metadata: row.team_id && rosterByRegistration.has(row.id)
      ? { ...(row.metadata ?? {}), team_roster: rosterByRegistration.get(row.id) }
      : row.metadata,
  }))
}

export function useOrganizerClubRegistrationsQuery(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organizer', 'club-registrations', organizationId],
    queryFn: () => (organizationId ? fetchOrganizerClubRegistrations(organizationId) : Promise.resolve([])),
    enabled: Boolean(organizationId),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}
