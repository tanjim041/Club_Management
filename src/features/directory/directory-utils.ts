import type {
  DirectoryCapacityUnit,
  DirectoryDeliveryFormat,
  DirectoryExperienceLevel,
  DirectoryOperationalStatus,
  DirectoryRegistrationState,
  PublicEvent,
  PublicFestAvailabilitySummary,
} from './directory-types'

const displayLabels: Record<string, string> = {
  in_person: 'In person',
  online: 'Online',
  hybrid: 'Hybrid',
  to_be_announced: 'Format TBA',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  scheduled: 'Scheduled',
  postponed: 'Postponed',
  cancelled: 'Cancelled',
  completed: 'Completed',
  not_open: 'Opens soon',
  open: 'Registration open',
  closed: 'Registration closed',
  full: 'Full',
  waitlist: 'Waitlist available',
  people: 'people',
  teams: 'teams',
}

export function directoryLabel(
  value:
    | DirectoryDeliveryFormat
    | DirectoryExperienceLevel
    | DirectoryOperationalStatus
    | DirectoryRegistrationState
    | DirectoryCapacityUnit,
): string {
  return displayLabels[value] ?? value.replace(/_/g, ' ')
}

export function formatDirectoryDateTime(value: string | null | undefined, timezone?: string): string {
  if (!value) return 'To be announced'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'To be announced'

  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone || undefined,
    }).format(date)
  } catch {
    return date.toLocaleString()
  }
}

export function formatDirectoryDateRange(start: string, end: string, timezone?: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 'Dates to be announced'

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone || undefined,
  })

  if (startDate.toDateString() === endDate.toDateString()) {
    return dateFormatter.format(startDate)
  }

  return `${dateFormatter.format(startDate)} â€“ ${dateFormatter.format(endDate)}`
}

export function formatExperienceLevels(levels: DirectoryExperienceLevel[]): string {
  return levels.length > 0 ? levels.map(directoryLabel).join(' Â· ') : 'All experience levels'
}

export function formatEventParticipation(event: Pick<PublicEvent, 'registrationMode' | 'teamMinSize' | 'teamMaxSize'>): string {
  if (event.registrationMode === 'individual') return 'Individual participation'

  if (event.teamMinSize && event.teamMaxSize) {
    return `Team of ${event.teamMinSize}â€“${event.teamMaxSize}`
  }

  return 'Team participation'
}

export function getAvailabilityTone(state: DirectoryRegistrationState | DirectoryOperationalStatus): string {
  switch (state) {
    case 'open':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    case 'waitlist':
    case 'postponed':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    case 'not_open':
    case 'scheduled':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-300'
    case 'closed':
    case 'full':
    case 'completed':
      return 'border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-[var(--color-text-body)]'
    case 'cancelled':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-300'
    default:
      return 'border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-[var(--color-text-body)]'
  }
}

export function getFestAvailabilityLabel(summary: PublicFestAvailabilitySummary): DirectoryRegistrationState | 'program_soon' {
  if (summary.openEventCount > 0) return 'open'
  if (summary.waitlistEventCount > 0) return 'waitlist'
  if (summary.registrationStates.includes('not_open')) return 'not_open'
  if (summary.registrationStates.includes('full')) return 'full'
  if (summary.registrationStates.includes('closed')) return 'closed'
  if (summary.registrationStates.includes('completed')) return 'completed'
  if (summary.registrationStates.includes('cancelled')) return 'cancelled'
  return 'program_soon'
}

export function festAvailabilityText(summary: PublicFestAvailabilitySummary): string {
  const state = getFestAvailabilityLabel(summary)
  return state === 'program_soon' ? 'Program coming soon' : directoryLabel(state)
}

export function eligibilityItems(value: unknown): Array<{ label: string; value: string }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []

  return Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== null && item !== undefined && item !== '')
    .map(([key, item]) => ({
      label: key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      value: Array.isArray(item) ? item.join(', ') : String(item),
    }))
}
