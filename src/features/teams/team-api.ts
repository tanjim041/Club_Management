import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '../../supabase/client'

export type TeamSummary = {
  team_id: string
  event_id: string
  team_name: string
  team_status: string
  is_captain: boolean
  registration_id: string | null
  registration_status: 'confirmed' | 'waitlisted' | 'cancelled' | null
  event_title: string
  event_starts_at: string
}

export type TeamDetail = {
  id: string
  event_id: string
  name: string
  status: string
  captain_id: string
  event_title: string
  team_min_size: number
  team_max_size: number
  registration_id: string | null
  registration_status: 'confirmed' | 'waitlisted' | 'cancelled' | null
  members: Array<{
    user_id: string
    full_name: string | null
    is_captain: boolean
    rules_current: boolean
    conflict_acknowledged_at: string | null
  }>
  invitations: Array<{ id: string; email: string; status: string; expires_at: string }>
}

export type InvitationPreview = {
  team_id: string
  team_name: string
  event_id: string
  event_title: string
  rules: string
  status: string
  expires_at: string
}

export type EventConflict = {
  person_id: string
  person_name: string | null
  other_event_id: string
  other_title: string
  other_starts_at: string
  other_ends_at: string
  overlap_starts_at: string
  overlap_ends_at: string
  overlap_seconds: number
  blocks_conflict: boolean
}

export type ScheduleAlternative = {
  event_id: string
  event_title: string
  starts_at: string
  ends_at: string
  club_slug: string
  fest_slug: string
  event_slug: string
}

export async function createEventTeam(eventId: string, name: string): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc('create_event_team', {
    p_event_id: eventId, p_name: name, p_accept_rules: true,
  })
  if (error) throw error
  if (!data) throw new Error('Team creation did not complete.')
  return data
}

export async function inviteEventTeamMember(teamId: string, email: string, expiryHours: number) {
  const { data, error } = await getSupabaseClient().rpc('invite_event_team_member', {
    p_team_id: teamId, p_email: email, p_expiry_hours: expiryHours,
  })
  if (error) throw error
  if (!data?.[0]) throw new Error('Invitation was not created.')
  return data[0]
}

export async function respondEventTeamInvitation(token: string, accept: boolean, acceptRules: boolean) {
  const { data, error } = await getSupabaseClient().rpc('respond_event_team_invitation', {
    p_token: token, p_accept: accept, p_accept_rules: acceptRules,
  })
  if (error) throw error
  return data
}

export async function revokeEventTeamInvitation(invitationId: string) {
  const { error } = await getSupabaseClient().rpc('revoke_event_team_invitation', {
    p_invitation_id: invitationId,
  })
  if (error) throw error
}

export async function leaveDraftEventTeam(teamId: string) {
  const { error } = await getSupabaseClient().rpc('leave_draft_event_team', { p_team_id: teamId })
  if (error) throw error
}

export async function acknowledgeEventTeamConflicts(teamId: string) {
  const { error } = await getSupabaseClient().rpc('acknowledge_event_team_conflicts', { p_team_id: teamId })
  if (error) throw error
}

export async function submitEventTeam(teamId: string) {
  const { data, error } = await getSupabaseClient().rpc('submit_event_team', { p_team_id: teamId })
  if (error) throw error
  if (!data?.[0]) throw new Error('Team registration did not complete.')
  return data[0]
}

export async function cancelEventTeamRegistration(teamId: string, reason: string) {
  const { data, error } = await getSupabaseClient().rpc('cancel_event_team_registration', {
    p_team_id: teamId, p_reason: reason.trim() || null,
  })
  if (error) throw error
  return data
}

export function useMyEventTeamsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['participant', 'teams', userId],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().rpc('my_event_teams')
      if (error) throw error
      return (data ?? []) as TeamSummary[]
    },
    enabled: Boolean(userId), staleTime: 20_000,
  })
}

export function useEventTeamDetailQuery(teamId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['participant', 'team', teamId, userId],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().rpc('event_team_detail', { p_team_id: teamId! })
      if (error) throw error
      return data as TeamDetail | null
    },
    enabled: Boolean(teamId && userId), staleTime: 15_000,
  })
}

export function useInvitationPreviewQuery(token: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['participant', 'team-invitation', token, userId],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().rpc('preview_event_team_invitation', { p_token: token! })
      if (error) throw error
      return data as InvitationPreview | null
    },
    enabled: Boolean(token && userId), staleTime: 15_000,
  })
}

export function useEventConflictsQuery(eventId: string | undefined, teamId: string | null, userId: string | undefined) {
  return useQuery({
    queryKey: ['participant', 'event-conflicts', eventId, teamId, userId],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().rpc('event_schedule_conflicts', {
        p_event_id: eventId!, p_team_id: teamId,
      })
      if (error) throw error
      return (data ?? []) as EventConflict[]
    },
    enabled: Boolean(eventId && userId), staleTime: 15_000,
  })
}

export function useScheduleAlternativesQuery(eventId: string | undefined, teamId: string | null, userId: string | undefined) {
  return useQuery({
    queryKey: ['participant', 'event-alternatives', eventId, teamId, userId],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().rpc('event_schedule_alternatives', {
        p_event_id: eventId!, p_team_id: teamId,
      })
      if (error) throw error
      return (data ?? []) as ScheduleAlternative[]
    },
    enabled: Boolean(eventId && userId), staleTime: 30_000,
  })
}
