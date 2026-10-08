import type { User } from '@supabase/supabase-js'

export type MembershipRole = 'organizer' | 'check_in_staff'
export type AuthorizedRole = 'visitor' | 'participant' | MembershipRole
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'configuration-error'

export type ParticipantProfile = {
  id: string
  full_name: string | null
  institution: string | null
  phone: string | null
  interests: string[] | null
  skills: string[] | null
  experience_level: 'beginner' | 'intermediate' | 'advanced' | null
  profile_completed: boolean
  profile_completed_at: string | null
}

export type AuthSnapshot = {
  status: AuthStatus
  user: User | null
  profile: ParticipantProfile | null
  role: AuthorizedRole
  isProfileComplete: boolean
  configurationError: string | null
  error: string | null
}

export const unauthenticatedSnapshot: AuthSnapshot = {
  status: 'unauthenticated',
  user: null,
  profile: null,
  role: 'visitor',
  isProfileComplete: false,
  configurationError: null,
  error: null,
}

export function resolveAuthorizedRole(membershipRoles: readonly MembershipRole[]): AuthorizedRole {
  if (membershipRoles.includes('organizer')) return 'organizer'
  if (membershipRoles.includes('check_in_staff')) return 'check_in_staff'
  return 'participant'
}

export function isParticipantProfileComplete(profile: ParticipantProfile | null): boolean {
  return profile?.profile_completed === true
}

export function getPostAuthenticationPath(snapshot: Pick<AuthSnapshot, 'role' | 'isProfileComplete'>): string {
  if (snapshot.role === 'organizer') return '/organizer'
  if (snapshot.role === 'check_in_staff') return '/check-in'
  if (snapshot.role === 'participant' && !snapshot.isProfileComplete) return '/complete-profile'
  if (snapshot.role === 'participant') return '/participant'
  return '/'
}
