import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient, isSupabaseConfigured } from '../../supabase/client'
import type {
  ClubAchievement,
  ClubGalleryItem,
  ClubSegment,
  ClubShowcase,
  PublicClubProfile,
  PublishedEvent,
  PublishedFest,
  PublishedOrganization,
} from './landing-types'

type PublicRowsResponse<Row> = {
  data: Row[] | null
  error: { message: string } | null
}

type PublicRowsBuilder<Row> = PromiseLike<PublicRowsResponse<Row>> & {
  select: (columns: string) => PublicRowsBuilder<Row>
  eq: (column: string, value: unknown) => PublicRowsBuilder<Row>
  order: (
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean },
  ) => PublicRowsBuilder<Row>
}

type ClubContentTable =
  | 'club_segments'
  | 'club_achievements'
  | 'club_showcases'
  | 'club_gallery_items'

/**
 * The new club-profile tables are introduced by the current migration. Keep
 * their read surface local until the checked-in generated database types are
 * regenerated, rather than treating their rows as untyped UI data.
 */
function publicClubContentTable<Row>(table: ClubContentTable): PublicRowsBuilder<Row> {
  return getSupabaseClient().from(table as never) as unknown as PublicRowsBuilder<Row>
}

function ensureConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase configuration is missing. Please check your environment variables.')
  }
}

function unwrapPublicRows<Row>(result: PublicRowsResponse<Row>, label: string): Row[] {
  if (result.error) {
    throw new Error(`Failed to load ${label}: ${result.error.message}`)
  }

  return result.data ?? []
}

const clubSelectFields = `
  id,
  name,
  slug,
  description,
  tagline,
  category,
  logo_url,
  cover_image_url,
  website_url,
  facebook_url,
  is_active,
  is_public_profile,
  created_at
`

export async function fetchPublishedClubs(): Promise<PublishedOrganization[]> {
  ensureConfigured()

  const { data, error } = await getSupabaseClient()
    .from('organizations')
    .select(clubSelectFields)
    .eq('is_active', true)
    .eq('is_public_profile', true)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to load clubs: ${error.message}`)
  }

  const raw = (data as unknown as PublishedOrganization[]) ?? []
  return raw.filter((c) => {
    const n = c.name.toLowerCase()
    const s = c.slug.toLowerCase()
    return !n.includes('verification club') && !n.includes('fixture') && !s.startsWith('engage-verify') && !s.startsWith('test-')
  })
}

export async function fetchClubBySlug(slug: string): Promise<PublishedOrganization | null> {
  ensureConfigured()

  const { data, error } = await getSupabaseClient()
    .from('organizations')
    .select(clubSelectFields)
    .eq('slug', slug)
    .eq('is_active', true)
    .eq('is_public_profile', true)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load club details: ${error.message}`)
  }

  return (data as unknown as PublishedOrganization | null) ?? null
}

export async function fetchPublishedClubEvents(
  organizationId: string,
): Promise<PublishedEvent[]> {
  ensureConfigured()

  const { data, error } = await getSupabaseClient()
    .from('events')
    .select(`
      id,
      fest_id,
      title,
      slug,
      description,
      category,
      subcategory,
      status,
      starts_at,
      ends_at,
      registration_opens_at,
      registration_closes_at,
      venue,
      registration_mode,
      capacity,
      team_min_size,
      team_max_size,
      cover_image_url,
      published_at,
      rules,
      eligibility,
      fests!inner (
        id,
        title,
        slug,
        location_name,
        organizations (slug)
      )
    `)
    .eq('status', 'published')
    .eq('fests.organization_id', organizationId)
    .gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to load this club's published events: ${error.message}`)
  }

  return (data as unknown as PublishedEvent[]) ?? []
}

export async function fetchPublishedClubFests(
  organizationId: string,
): Promise<PublishedFest[]> {
  ensureConfigured()

  const { data, error } = await getSupabaseClient()
    .from('fests')
    .select(`
      id,
      organization_id,
      title,
      slug,
      description,
      status,
      starts_at,
      ends_at,
      registration_opens_at,
      registration_closes_at,
      timezone,
      location_name,
      location_address,
      banner_url,
      published_at
    `)
    .eq('status', 'published')
    .eq('organization_id', organizationId)
    .gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to load this club's published fests: ${error.message}`)
  }

  return (data as unknown as PublishedFest[]) ?? []
}

export async function fetchPublicClubProfile(slug: string): Promise<PublicClubProfile | null> {
  const club = await fetchClubBySlug(slug)
  if (!club) return null

  const [segmentsResult, achievementsResult, showcasesResult, galleryResult, events, fests] = await Promise.all([
    publicClubContentTable<ClubSegment>('club_segments')
      .select('id, organization_id, title, description, image_url, sort_order, is_published, created_at, updated_at')
      .eq('organization_id', club.id)
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    publicClubContentTable<ClubAchievement>('club_achievements')
      .select('id, organization_id, title, description, achieved_on, awarded_by, image_url, sort_order, is_published, created_at, updated_at')
      .eq('organization_id', club.id)
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('achieved_on', { ascending: false, nullsFirst: false }),
    publicClubContentTable<ClubShowcase>('club_showcases')
      .select('id, organization_id, fest_id, event_id, title, description, showcase_type, occurred_on, cover_image_url, external_url, sort_order, is_published, created_at, updated_at')
      .eq('organization_id', club.id)
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('occurred_on', { ascending: false, nullsFirst: false }),
    publicClubContentTable<ClubGalleryItem>('club_gallery_items')
      .select('id, organization_id, image_url, alt_text, caption, taken_at, sort_order, is_published, created_at, updated_at')
      .eq('organization_id', club.id)
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('taken_at', { ascending: false, nullsFirst: false }),
    fetchPublishedClubEvents(club.id),
    fetchPublishedClubFests(club.id),
  ])

  return {
    club,
    segments: unwrapPublicRows(segmentsResult, 'club segments'),
    achievements: unwrapPublicRows(achievementsResult, 'club achievements'),
    showcases: unwrapPublicRows(showcasesResult, 'club showcases'),
    galleryItems: unwrapPublicRows(galleryResult, 'club gallery'),
    events,
    fests,
  }
}

export async function fetchPublishedUpcomingFests(): Promise<PublishedFest[]> {
  ensureConfigured()

  const { data, error } = await getSupabaseClient()
    .from('fests')
    .select(`
      id,
      organization_id,
      title,
      slug,
      description,
      category,
      status,
      starts_at,
      ends_at,
      registration_opens_at,
      registration_closes_at,
      timezone,
      location_name,
      location_address,
      banner_url,
      published_at,
      organizations (
        ${clubSelectFields}
      )
    `)
    .eq('status', 'published')
    .gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(10)

  if (error) {
    throw new Error(`Failed to load fests: ${error.message}`)
  }

  return (data as unknown as PublishedFest[]) ?? []
}

export async function fetchPublishedFeaturedEvents(): Promise<PublishedEvent[]> {
  ensureConfigured()

  const { data, error } = await getSupabaseClient()
    .from('events')
    .select(`
      id,
      fest_id,
      title,
      slug,
      description,
      category,
      subcategory,
      status,
      starts_at,
      ends_at,
      registration_opens_at,
      registration_closes_at,
      venue,
      registration_mode,
      capacity,
      team_min_size,
      team_max_size,
      cover_image_url,
      published_at,
      rules,
      eligibility,
      fests (
        id,
        title,
        slug,
        location_name,
        organizations (slug)
      )
    `)
    .eq('status', 'published')
    .order('starts_at', { ascending: true })
    .limit(100)

  if (error) {
    throw new Error(`Failed to load events: ${error.message}`)
  }

  return (data as unknown as PublishedEvent[]) ?? []
}

export function useClubsQuery() {
  return useQuery({
    queryKey: ['landing', 'clubs'],
    queryFn: fetchPublishedClubs,
    staleTime: 60_000,
  })
}

export function useClubBySlugQuery(slug: string | undefined) {
  return useQuery({
    queryKey: ['club', slug],
    queryFn: () => (slug ? fetchClubBySlug(slug) : Promise.resolve(null)),
    enabled: Boolean(slug),
    staleTime: 60_000,
  })
}

export function usePublicClubProfileQuery(slug: string | undefined) {
  return useQuery({
    queryKey: ['club', 'public-profile', slug],
    queryFn: () => (slug ? fetchPublicClubProfile(slug) : Promise.resolve(null)),
    enabled: Boolean(slug),
    staleTime: 60_000,
  })
}

export function useUpcomingFestsQuery() {
  return useQuery({
    queryKey: ['landing', 'upcoming-fests'],
    queryFn: fetchPublishedUpcomingFests,
    staleTime: 60_000,
  })
}

export function useFeaturedEventsQuery() {
  return useQuery({
    queryKey: ['landing', 'featured-events'],
    queryFn: fetchPublishedFeaturedEvents,
    staleTime: 60_000,
  })
}
