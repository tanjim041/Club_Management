import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '../../supabase/client'

export const registrationErrorMessages: Record<string, string> = {
  authentication_required: 'Please sign in before registering.',
  rules_acceptance_required: 'Please accept the event rules before continuing.',
  event_unavailable: 'This event is not available for registration.',
  profile_missing: 'Complete your participant profile before registering.',
  profile_incomplete: 'Complete your participant profile before registering.',
  registration_not_open: 'Registration has not opened yet.',
  registration_closed: 'The registration deadline has passed.',
  already_registered: 'You already have an active registration for this event.',
  experience_not_eligible: 'Your profile experience level does not meet this event’s eligibility rules.',
  institution_not_eligible: 'Your institution does not meet this event’s eligibility rules.',
  department_not_eligible: 'Your department does not meet this event’s eligibility rules.',
  required_skills_missing: 'Your profile is missing a required skill for this event.',
  required_interests_missing: 'Your profile is missing a required interest for this event.',
  unsupported_eligibility_rule: 'This event has eligibility rules that need organizer review before online registration can open.',
  invalid_eligibility_rule: 'This event’s eligibility rules need organizer review before online registration can open.',
  schedule_conflict: 'This event conflicts with another confirmed event on your schedule.',
  conflict_ack_required: 'Review and acknowledge the schedule overlap before registering.',
  team_incomplete: 'Only accepted members count. Invite enough people before submitting.',
  team_too_large: 'This team exceeds the event size limit.',
  already_in_event_team: 'This person is already in an active team for this event.',
  team_rules_changed: 'Event rules changed. The team must review them before submission.',
  invitation_not_for_account: 'This invitation is for a different account or email address.',
  invitation_unavailable: 'This invitation expired, was revoked, or has already been answered.',
  invitation_invalid: 'This invitation link is invalid.',
  team_locked: 'This team is already submitted and its roster cannot be edited.',
  team_not_found: 'This team is not available to your account.',
  invalid_team_name: 'Choose a team name between 2 and 100 characters.',
  invalid_invitee_email: 'Enter a valid invitation email address.',
  invalid_invitation_expiry: 'Invitation expiry must be between 1 and 168 hours.',
  cannot_invite_self: 'The captain is already part of this team.',
  invitation_already_pending: 'This email already has a pending invitation.',
  member_already_accepted: 'This member has already accepted the team invitation.',
  event_full: 'This event is full and does not offer a waitlist.',
  registration_not_found: 'This registration could not be found in your account.',
  already_cancelled: 'This registration is already cancelled.',
  cancellation_closed: 'The cancellation cutoff has passed.',
  cancellation_reason_too_long: 'Keep the cancellation reason under 500 characters.',
}

export function registrationErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '')
  const code = Object.keys(registrationErrorMessages).find((item) => raw.includes(item))
  return code ? registrationErrorMessages[code] : 'We could not save your registration. Please try again.'
}

export async function registerIndividualEvent(eventId: string, acknowledgeConflicts = false) {
  const { data, error } = await getSupabaseClient().rpc('register_individual_event_with_conflicts', {
    p_event_id: eventId,
    p_accept_rules: true,
    p_acknowledge_conflicts: acknowledgeConflicts,
  })
  if (error) throw error
  const result = data?.[0]
  if (!result) throw new Error('The registration transaction did not return a confirmation.')
  return result
}

export async function cancelIndividualRegistration(registrationId: string, reason?: string) {
  const { data, error } = await getSupabaseClient().rpc('cancel_individual_registration', {
    p_registration_id: registrationId,
    p_reason: reason?.trim() || null,
  })
  if (error) throw error
  const result = data?.[0]
  if (!result || result.status !== 'cancelled') throw new Error('The cancellation transaction did not complete.')
  return result
}

export type RegistrationNotification = {
  id: string
  title: string
  body: string
  event_id: string | null
  data: unknown
  read_at: string | null
  created_at: string
}

export async function fetchMyRegistrationNotifications(userId: string): Promise<RegistrationNotification[]> {
  const { data, error } = await getSupabaseClient()
    .from('notifications')
    .select('id, title, body, event_id, data, read_at, created_at')
    .eq('recipient_id', userId)
    .in('kind', ['registration', 'waitlist'])
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(`Failed to load registration notifications: ${error.message}`)
  return data ?? []
}

export function useMyRegistrationNotificationsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['participant', 'registration-notifications', userId],
    queryFn: () => fetchMyRegistrationNotifications(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}

export async function fetchRegistrationAttendance(registrationId: string) {
  const { data, error } = await getSupabaseClient()
    .from('registration_attendance')
    .select('registration_id, verified_at')
    .eq('registration_id', registrationId)
    .maybeSingle()
  if (error) throw new Error(`Failed to load attendance: ${error.message}`)
  return data
}

export function useRegistrationAttendanceQuery(registrationId: string | undefined) {
  return useQuery({
    queryKey: ['participant', 'attendance', registrationId],
    queryFn: () => fetchRegistrationAttendance(registrationId!),
    enabled: Boolean(registrationId),
    staleTime: 30_000,
  })
}
