import { getSupabaseClient } from '../../supabase/client'
import type { ParticipantProfile } from './auth-types'
import type { ProfileCompletionValues, SignInValues, SignUpValues } from './auth-schemas'
import { parseList } from './auth-schemas'

type MembershipRow = { role: 'organizer' | 'check_in_staff' }

/**
 * Loads only the current user's profile and assigned operational roles. The
 * database RLS policies remain the authorization boundary for both queries.
 */
export async function loadCurrentUserAccess(userId: string): Promise<{ profile: ParticipantProfile | null; membershipRoles: MembershipRow['role'][] }> {
  const supabase = getSupabaseClient()
  const [profileResult, membershipsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, institution, phone, interests, skills, experience_level, profile_completed, profile_completed_at')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('organization_memberships')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true),
  ])

  if (profileResult.error) throw profileResult.error
  if (membershipsResult.error) throw membershipsResult.error

  return {
    profile: profileResult.data as ParticipantProfile | null,
    membershipRoles: ((membershipsResult.data ?? []) as MembershipRow[]).map((membership) => membership.role),
  }
}

export async function signInWithPassword(values: SignInValues) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password })
  if (error) throw error
  return data
}

export async function signUpParticipant(values: SignUpValues) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: { full_name: values.fullName },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw error
  return data
}

export async function completeParticipantProfile(userId: string, values: ProfileCompletionValues): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: values.fullName.trim(),
      institution: values.institution.trim(),
      phone: values.phone.trim() || null,
      interests: parseList(values.interests),
      skills: parseList(values.skills),
      experience_level: values.experienceLevel,
    })
    .eq('id', userId)

  if (error) throw error
}

export async function signOutCurrentUser(): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
