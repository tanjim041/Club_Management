/**
 * Public-facing directory models. These intentionally use camelCase so views
 * do not need to know about database column names. The mapper in
 * `directory-api.ts` is the single boundary between Supabase rows and UI data.
 */

export const directoryDeliveryFormats = [
  'in_person',
  'online',
  'hybrid',
  'to_be_announced',
] as const

export type DirectoryDeliveryFormat = (typeof directoryDeliveryFormats)[number]

export const directoryExperienceLevels = [
  'beginner',
  'intermediate',
  'advanced',
] as const

export type DirectoryExperienceLevel = (typeof directoryExperienceLevels)[number]

export const directoryOperationalStatuses = [
  'scheduled',
  'postponed',
  'cancelled',
  'completed',
] as const

export type DirectoryOperationalStatus = (typeof directoryOperationalStatuses)[number]

export const directoryRegistrationStates = [
  'not_open',
  'open',
  'closed',
  'full',
  'waitlist',
  'cancelled',
  'completed',
] as const

export type DirectoryRegistrationState = (typeof directoryRegistrationStates)[number]

export const directoryCapacityUnits = ['people', 'teams'] as const

export type DirectoryCapacityUnit = (typeof directoryCapacityUnits)[number]

export interface PublicClubSummary {
  id: string
  name: string
  slug: string
  description: string
  tagline: string
  category: string | null
  logoUrl: string | null
  coverImageUrl: string | null
  websiteUrl: string | null
  facebookUrl: string | null
}

export interface PublicFest {
  id: string
  clubId: string
  title: string
  slug: string
  description: string
  category: string | null
  deliveryFormat: DirectoryDeliveryFormat
  experienceLevels: DirectoryExperienceLevel[]
  operationalStatus: DirectoryOperationalStatus
  startsAt: string
  endsAt: string
  registrationOpensAt: string | null
  registrationClosesAt: string | null
  timezone: string
  locationName: string | null
  locationAddress: string | null
  bannerUrl: string | null
}

export interface PublicEventAvailability {
  confirmedUnits: number
  availableCapacity: number
  capacityUnit: DirectoryCapacityUnit
  registrationState: DirectoryRegistrationState
}

export interface PublicEvent {
  id: string
  festId: string
  title: string
  slug: string
  description: string
  category: string | null
  subcategory: string | null
  deliveryFormat: DirectoryDeliveryFormat
  experienceLevels: DirectoryExperienceLevel[]
  operationalStatus: DirectoryOperationalStatus
  startsAt: string
  endsAt: string
  registrationOpensAt: string | null
  registrationClosesAt: string | null
  venue: string | null
  registrationMode: 'individual' | 'team'
  capacity: number
  teamMinSize: number | null
  teamMaxSize: number | null
  waitlistEnabled: boolean
  eligibility: unknown
  rules: string
  coverImageUrl: string | null
  /** Null only when the backend does not expose this event through its public RPC. */
  availability: PublicEventAvailability | null
}

export interface PublicFestAvailabilitySummary {
  eventCount: number
  openEventCount: number
  waitlistEventCount: number
  totalAvailableCapacity: number
  registrationStates: DirectoryRegistrationState[]
}

export interface PublicFestDirectoryItem extends PublicFest {
  club: PublicClubSummary
  availability: PublicFestAvailabilitySummary
}

export interface PublicFestScheduleItem {
  id: string
  eventId: string | null
  title: string
  description: string
  startsAt: string
  endsAt: string
  venue: string | null
  sortOrder: number
}

export interface PublicFestAnnouncement {
  id: string
  title: string
  body: string
  publishedAt: string
}

export interface PublicFestDetail extends PublicFestDirectoryItem {
  events: PublicEvent[]
  scheduleItems: PublicFestScheduleItem[]
  announcements: PublicFestAnnouncement[]
}

export interface PublicEventDetail extends PublicEvent {
  fest: PublicFest
  club: PublicClubSummary
}

/**
 * The directory accepts one value per UI control. Date filters use an
 * overlapping-window comparison, so a multi-day fest remains visible when
 * any part of it falls within the selected date range.
 */
export interface PublicFestDirectoryFilters {
  search?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  deliveryFormat?: DirectoryDeliveryFormat
  experienceLevel?: DirectoryExperienceLevel
  availability?: DirectoryRegistrationState
  operationalStatus?: DirectoryOperationalStatus
}

export interface PublicFestDirectoryResult {
  items: PublicFestDirectoryItem[]
  total: number
}
