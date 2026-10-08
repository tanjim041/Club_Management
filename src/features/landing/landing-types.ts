export type PublicationStatus = 'published' | 'draft' | 'cancelled' | 'archived' | 'completed'

export type PublishedOrganization = {
  id: string
  name: string
  slug: string
  description: string | null
  tagline: string
  category: string | null
  logo_url: string | null
  cover_image_url: string | null
  website_url: string | null
  facebook_url: string | null
  is_active: boolean
  is_public_profile: boolean
  created_at: string
}

export type ClubSegment = {
  id: string
  organization_id: string
  title: string
  description: string
  image_url: string | null
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export type ClubAchievement = {
  id: string
  organization_id: string
  title: string
  description: string
  achieved_on: string | null
  awarded_by: string | null
  image_url: string | null
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export type ClubShowcaseType = 'event' | 'competition' | 'project' | 'award' | 'recap'

export type ClubShowcase = {
  id: string
  organization_id: string
  fest_id: string | null
  event_id: string | null
  title: string
  description: string
  showcase_type: ClubShowcaseType
  occurred_on: string | null
  cover_image_url: string | null
  external_url: string | null
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export type ClubGalleryItem = {
  id: string
  organization_id: string
  image_url: string
  alt_text: string
  caption: string | null
  taken_at: string | null
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export type PublishedFest = {
  id: string
  organization_id: string
  title: string
  slug: string
  description: string
  status: PublicationStatus
  starts_at: string
  ends_at: string
  registration_opens_at: string | null
  registration_closes_at: string | null
  timezone: string
  location_name: string | null
  location_address: string | null
  banner_url: string | null
  published_at: string | null
  organizations?: PublishedOrganization | null
}

export type PublishedEventFestInfo = {
  id: string
  title: string
  slug: string
  location_name: string | null
  organizations?: { slug: string } | null
}

export type PublishedEvent = {
  id: string
  fest_id: string
  title: string
  slug: string
  description: string
  category: string | null
  subcategory?: string | null
  status: PublicationStatus
  starts_at: string
  ends_at: string
  registration_opens_at: string | null
  registration_closes_at: string | null
  venue: string | null
  registration_mode: 'individual' | 'team'
  capacity: number
  team_min_size: number | null
  team_max_size: number | null
  cover_image_url: string | null
  published_at: string | null
  rules?: string
  eligibility?: unknown
  fests?: PublishedEventFestInfo | null
}

export type PublicClubProfile = {
  club: PublishedOrganization
  segments: ClubSegment[]
  achievements: ClubAchievement[]
  showcases: ClubShowcase[]
  galleryItems: ClubGalleryItem[]
  events: PublishedEvent[]
  fests: PublishedFest[]
}
