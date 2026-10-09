/*
 * Generated-type-compatible schema definition for the checked-in initial
 * migration. Regenerate it with `npx supabase gen types typescript --linked
 * --schema public` once the repository is linked to a Supabase project.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type NoRelations = []

export type Database = {
  public: {
    Tables: {
      operational_announcements: {
        Row: { id: string; organization_id: string; fest_id: string | null; event_id: string | null; audience: 'public' | 'registered'; title: string; body: string; published_at: string; created_by: string }
        Insert: never
        Update: never
        Relationships: NoRelations
      }
      help_desk_requests: {
        Row: { id: string; organization_id: string; fest_id: string; event_id: string | null; category: string; description: string; venue: string | null; submitter_id: string; priority: 'low' | 'normal' | 'high' | 'urgent'; assigned_staff_id: string | null; status: 'new' | 'assigned' | 'resolved'; created_at: string; updated_at: string; resolved_at: string | null }
        Insert: never
        Update: never
        Relationships: NoRelations
      }
      passport_reward_ledger: {
        Row: { id: string; user_id: string; organization_id: string; source_kind: string; source_id: string; xp: number; label: string; awarded_at: string; awarded_by: string | null }
        Insert: never
        Update: never
        Relationships: NoRelations
      }
      passport_verifications: {
        Row: { id: string; user_id: string; organization_id: string; event_id: string | null; kind: 'workshop' | 'achievement'; title: string; verified_by: string; verified_at: string }
        Insert: never
        Update: never
        Relationships: NoRelations
      }
      institutes: {
        Row: { id: string; name: string; slug: string; tagline: string; description: string; logo_url: string | null; banner_url: string | null; website_url: string | null; facebook_url: string | null; location_name: string | null; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; slug: string; tagline?: string; description?: string; logo_url?: string | null; banner_url?: string | null; website_url?: string | null; facebook_url?: string | null; location_name?: string | null; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; slug?: string; tagline?: string; description?: string; logo_url?: string | null; banner_url?: string | null; website_url?: string | null; facebook_url?: string | null; location_name?: string | null; is_active?: boolean; created_at?: string; updated_at?: string }
        Relationships: NoRelations
      }
      profiles: {
        Row: { id: string; email: string | null; full_name: string | null; avatar_url: string | null; institution: string | null; department: string | null; phone: string | null; interests: string[]; skills: string[]; experience_level: Database['public']['Enums']['experience_level'] | null; bio: string | null; profile_completed: boolean; profile_completed_at: string | null; created_at: string; updated_at: string }
        Insert: { id: string; email?: string | null; full_name?: string | null; avatar_url?: string | null; institution?: string | null; department?: string | null; phone?: string | null; interests?: string[]; skills?: string[]; experience_level?: Database['public']['Enums']['experience_level'] | null; bio?: string | null; profile_completed?: boolean; profile_completed_at?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; email?: string | null; full_name?: string | null; avatar_url?: string | null; institution?: string | null; department?: string | null; phone?: string | null; interests?: string[]; skills?: string[]; experience_level?: Database['public']['Enums']['experience_level'] | null; bio?: string | null; profile_completed?: boolean; profile_completed_at?: string | null; created_at?: string; updated_at?: string }
        Relationships: NoRelations
      }
      organizations: {
        Row: { id: string; name: string; slug: string; description: string; logo_url: string | null; website_url: string | null; owner_id: string; is_active: boolean; institute_id: string | null; is_public_profile: boolean; tagline: string; cover_image_url: string | null; facebook_url: string | null; category: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; slug: string; description?: string; logo_url?: string | null; website_url?: string | null; owner_id: string; is_active?: boolean; institute_id?: string | null; is_public_profile?: boolean; tagline?: string; cover_image_url?: string | null; facebook_url?: string | null; category?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; slug?: string; description?: string; logo_url?: string | null; website_url?: string | null; owner_id?: string; is_active?: boolean; institute_id?: string | null; is_public_profile?: boolean; tagline?: string; cover_image_url?: string | null; facebook_url?: string | null; category?: string | null; created_at?: string; updated_at?: string }
        Relationships: NoRelations
      }
      organization_memberships: {
        Row: { id: string; organization_id: string; user_id: string; role: Database['public']['Enums']['organization_member_role']; is_active: boolean; granted_by: string | null; granted_at: string; updated_at: string }
        Insert: { id?: string; organization_id: string; user_id: string; role: Database['public']['Enums']['organization_member_role']; is_active?: boolean; granted_by?: string | null; granted_at?: string; updated_at?: string }
        Update: { id?: string; organization_id?: string; user_id?: string; role?: Database['public']['Enums']['organization_member_role']; is_active?: boolean; granted_by?: string | null; granted_at?: string; updated_at?: string }
        Relationships: NoRelations
      }
      fests: {
        Row: { id: string; organization_id: string; title: string; slug: string; description: string; status: Database['public']['Enums']['publication_status']; starts_at: string; ends_at: string; registration_opens_at: string | null; registration_closes_at: string | null; timezone: string; location_name: string | null; location_address: string | null; banner_url: string | null; published_at: string | null; created_by: string | null; updated_by: string | null; category: string | null; delivery_format: Database['public']['Enums']['delivery_format']; experience_levels: Database['public']['Enums']['experience_level'][]; operational_status: Database['public']['Enums']['operational_status']; created_at: string; updated_at: string }
        Insert: { id?: string; organization_id: string; title: string; slug: string; description?: string; status?: Database['public']['Enums']['publication_status']; starts_at: string; ends_at: string; registration_opens_at?: string | null; registration_closes_at?: string | null; timezone?: string; location_name?: string | null; location_address?: string | null; banner_url?: string | null; published_at?: string | null; created_by?: string | null; updated_by?: string | null; category?: string | null; delivery_format?: Database['public']['Enums']['delivery_format']; experience_levels?: Database['public']['Enums']['experience_level'][]; operational_status?: Database['public']['Enums']['operational_status']; created_at?: string; updated_at?: string }
        Update: { id?: string; organization_id?: string; title?: string; slug?: string; description?: string; status?: Database['public']['Enums']['publication_status']; starts_at?: string; ends_at?: string; registration_opens_at?: string | null; registration_closes_at?: string | null; timezone?: string; location_name?: string | null; location_address?: string | null; banner_url?: string | null; published_at?: string | null; created_by?: string | null; updated_by?: string | null; category?: string | null; delivery_format?: Database['public']['Enums']['delivery_format']; experience_levels?: Database['public']['Enums']['experience_level'][]; operational_status?: Database['public']['Enums']['operational_status']; created_at?: string; updated_at?: string }
        Relationships: NoRelations
      }
      events: {
        Row: { id: string; fest_id: string; title: string; slug: string; description: string; category: string | null; subcategory: string | null; status: Database['public']['Enums']['publication_status']; starts_at: string; ends_at: string; registration_opens_at: string | null; registration_closes_at: string | null; cancellation_closes_at: string | null; venue: string | null; registration_mode: Database['public']['Enums']['event_registration_mode']; capacity: number; team_min_size: number | null; team_max_size: number | null; waitlist_enabled: boolean; blocks_schedule_conflicts: boolean; eligibility: Json; rules: string; cover_image_url: string | null; published_at: string | null; created_by: string | null; updated_by: string | null; delivery_format: Database['public']['Enums']['delivery_format']; experience_levels: Database['public']['Enums']['experience_level'][]; operational_status: Database['public']['Enums']['operational_status']; created_at: string; updated_at: string }
        Insert: { id?: string; fest_id: string; title: string; slug: string; description?: string; category?: string | null; subcategory?: string | null; status?: Database['public']['Enums']['publication_status']; starts_at: string; ends_at: string; registration_opens_at?: string | null; registration_closes_at?: string | null; cancellation_closes_at?: string | null; venue?: string | null; registration_mode?: Database['public']['Enums']['event_registration_mode']; capacity: number; team_min_size?: number | null; team_max_size?: number | null; waitlist_enabled?: boolean; blocks_schedule_conflicts?: boolean; eligibility?: Json; rules?: string; cover_image_url?: string | null; published_at?: string | null; created_by?: string | null; updated_by?: string | null; delivery_format?: Database['public']['Enums']['delivery_format']; experience_levels?: Database['public']['Enums']['experience_level'][]; operational_status?: Database['public']['Enums']['operational_status']; created_at?: string; updated_at?: string }
        Update: { id?: string; fest_id?: string; title?: string; slug?: string; description?: string; category?: string | null; subcategory?: string | null; status?: Database['public']['Enums']['publication_status']; starts_at?: string; ends_at?: string; registration_opens_at?: string | null; registration_closes_at?: string | null; cancellation_closes_at?: string | null; venue?: string | null; registration_mode?: Database['public']['Enums']['event_registration_mode']; capacity?: number; team_min_size?: number | null; team_max_size?: number | null; waitlist_enabled?: boolean; blocks_schedule_conflicts?: boolean; eligibility?: Json; rules?: string; cover_image_url?: string | null; published_at?: string | null; created_by?: string | null; updated_by?: string | null; delivery_format?: Database['public']['Enums']['delivery_format']; experience_levels?: Database['public']['Enums']['experience_level'][]; operational_status?: Database['public']['Enums']['operational_status']; created_at?: string; updated_at?: string }
        Relationships: NoRelations
      }
      club_segments: {
        Row: { id: string; organization_id: string; title: string; description: string; image_url: string | null; sort_order: number; is_published: boolean; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; organization_id: string; title: string; description?: string; image_url?: string | null; sort_order?: number; is_published?: boolean; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; organization_id?: string; title?: string; description?: string; image_url?: string | null; sort_order?: number; is_published?: boolean; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: NoRelations
      }
      club_achievements: {
        Row: { id: string; organization_id: string; title: string; description: string; achieved_on: string | null; awarded_by: string | null; image_url: string | null; sort_order: number; is_published: boolean; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; organization_id: string; title: string; description?: string; achieved_on?: string | null; awarded_by?: string | null; image_url?: string | null; sort_order?: number; is_published?: boolean; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; organization_id?: string; title?: string; description?: string; achieved_on?: string | null; awarded_by?: string | null; image_url?: string | null; sort_order?: number; is_published?: boolean; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: NoRelations
      }
      club_showcases: {
        Row: { id: string; organization_id: string; fest_id: string | null; event_id: string | null; title: string; description: string; showcase_type: string; occurred_on: string | null; cover_image_url: string | null; external_url: string | null; sort_order: number; is_published: boolean; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; organization_id: string; fest_id?: string | null; event_id?: string | null; title: string; description?: string; showcase_type?: string; occurred_on?: string | null; cover_image_url?: string | null; external_url?: string | null; sort_order?: number; is_published?: boolean; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; organization_id?: string; fest_id?: string | null; event_id?: string | null; title?: string; description?: string; showcase_type?: string; occurred_on?: string | null; cover_image_url?: string | null; external_url?: string | null; sort_order?: number; is_published?: boolean; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: NoRelations
      }
      club_gallery_items: {
        Row: { id: string; organization_id: string; image_url: string; alt_text: string; caption: string | null; taken_at: string | null; sort_order: number; is_published: boolean; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; organization_id: string; image_url: string; alt_text?: string; caption?: string | null; taken_at?: string | null; sort_order?: number; is_published?: boolean; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; organization_id?: string; image_url?: string; alt_text?: string; caption?: string | null; taken_at?: string | null; sort_order?: number; is_published?: boolean; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: NoRelations
      }
      fest_schedule_items: {
        Row: { id: string; fest_id: string; event_id: string | null; title: string; description: string; starts_at: string; ends_at: string; venue: string | null; sort_order: number; is_published: boolean; published_at: string | null; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; fest_id: string; event_id?: string | null; title: string; description?: string; starts_at: string; ends_at: string; venue?: string | null; sort_order?: number; is_published?: boolean; published_at?: string | null; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; fest_id?: string; event_id?: string | null; title?: string; description?: string; starts_at?: string; ends_at?: string; venue?: string | null; sort_order?: number; is_published?: boolean; published_at?: string | null; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: NoRelations
      }
      fest_announcements: {
        Row: { id: string; fest_id: string; title: string; body: string; is_published: boolean; published_at: string | null; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; fest_id: string; title: string; body: string; is_published?: boolean; published_at?: string | null; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; fest_id?: string; title?: string; body?: string; is_published?: boolean; published_at?: string | null; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: NoRelations
      }
      registrations: {
        Row: { id: string; event_id: string; participant_id: string; team_id: string | null; status: Database['public']['Enums']['registration_status']; waitlist_position: number | null; registered_at: string; confirmed_at: string | null; cancelled_at: string | null; cancellation_reason: string | null; rules_accepted_at: string | null; rules_accepted_hash: string | null; conflict_ack_hash: string | null; metadata: Json; created_at: string; updated_at: string }
        Insert: { id?: string; event_id: string; participant_id: string; team_id?: string | null; status: Database['public']['Enums']['registration_status']; waitlist_position?: number | null; registered_at?: string; confirmed_at?: string | null; cancelled_at?: string | null; cancellation_reason?: string | null; rules_accepted_at?: string | null; rules_accepted_hash?: string | null; conflict_ack_hash?: string | null; metadata?: Json; created_at?: string; updated_at?: string }
        Update: { id?: string; event_id?: string; participant_id?: string; team_id?: string | null; status?: Database['public']['Enums']['registration_status']; waitlist_position?: number | null; registered_at?: string; confirmed_at?: string | null; cancelled_at?: string | null; cancellation_reason?: string | null; rules_accepted_at?: string | null; rules_accepted_hash?: string | null; conflict_ack_hash?: string | null; metadata?: Json; created_at?: string; updated_at?: string }
        Relationships: NoRelations
      }
      registration_attendance: {
        Row: { registration_id: string; verified_at: string; verified_by: string | null; notes: string; created_at: string }
        Insert: { registration_id: string; verified_at?: string; verified_by?: string | null; notes?: string; created_at?: string }
        Update: { registration_id?: string; verified_at?: string; verified_by?: string | null; notes?: string; created_at?: string }
        Relationships: NoRelations
      }
      event_passes: {
        Row: { id: string; registration_id: string; user_id: string; token: string; revoked_at: string | null; revoked_by: string | null; created_at: string }
        Insert: { id?: string; registration_id: string; user_id: string; token?: string; revoked_at?: string | null; revoked_by?: string | null; created_at?: string }
        Update: { id?: string; registration_id?: string; user_id?: string; token?: string; revoked_at?: string | null; revoked_by?: string | null; created_at?: string }
        Relationships: NoRelations
      }
      event_pass_attendance: {
        Row: { pass_id: string; checked_in_at: string; checked_in_by: string; created_at: string }
        Insert: { pass_id: string; checked_in_at?: string; checked_in_by: string; created_at?: string }
        Update: { pass_id?: string; checked_in_at?: string; checked_in_by?: string; created_at?: string }
        Relationships: NoRelations
      }
      notifications: {
        Row: { id: string; recipient_id: string; organization_id: string | null; fest_id: string | null; event_id: string | null; kind: Database['public']['Enums']['notification_kind']; title: string; body: string; data: Json; read_at: string | null; created_at: string }
        Insert: { id?: string; recipient_id: string; organization_id?: string | null; fest_id?: string | null; event_id?: string | null; kind?: Database['public']['Enums']['notification_kind']; title: string; body: string; data?: Json; read_at?: string | null; created_at?: string }
        Update: { id?: string; recipient_id?: string; organization_id?: string | null; fest_id?: string | null; event_id?: string | null; kind?: Database['public']['Enums']['notification_kind']; title?: string; body?: string; data?: Json; read_at?: string | null; created_at?: string }
        Relationships: NoRelations
      }
      audit_logs: {
        Row: { id: number; actor_id: string | null; organization_id: string | null; fest_id: string | null; event_id: string | null; registration_id: string | null; action: string; entity_type: string; entity_id: string | null; metadata: Json; created_at: string }
        Insert: { id?: never; actor_id?: string | null; organization_id?: string | null; fest_id?: string | null; event_id?: string | null; registration_id?: string | null; action: string; entity_type: string; entity_id?: string | null; metadata?: Json; created_at?: string }
        Update: { id?: never; actor_id?: string | null; organization_id?: string | null; fest_id?: string | null; event_id?: string | null; action?: string; entity_type?: string; entity_id?: string | null; metadata?: Json; created_at?: string }
        Relationships: NoRelations
      }
    }
    Views: Record<string, never>
    Functions: {
      help_desk_assignable_staff: { Args: { p_organization_id: string }; Returns: { user_id: string; full_name: string; staff_role: Database['public']['Enums']['organization_member_role'] }[] }
      publish_operational_announcement: { Args: { p_organization_id: string; p_fest_id: string | null; p_event_id: string | null; p_audience: string; p_title: string; p_body: string }; Returns: string }
      submit_help_desk_request: { Args: { p_fest_id: string; p_event_id: string | null; p_category: string; p_description: string; p_venue: string }; Returns: string }
      update_help_desk_request: { Args: { p_request_id: string; p_priority: string; p_assigned_staff_id: string | null; p_status: string }; Returns: undefined }
      verify_passport_item: { Args: { p_user_id: string; p_organization_id: string; p_event_id: string | null; p_kind: string; p_title: string }; Returns: string }
      my_club_passport: { Args: Record<string, never>; Returns: Json }
      post_fest_report: { Args: { p_fest_id: string }; Returns: Json }
      bootstrap_organization: { Args: { p_owner_id: string; p_name: string; p_slug: string; p_description?: string }; Returns: string }
      current_user_is_organization_owner: { Args: { target_organization_id: string }; Returns: boolean }
      current_user_is_organizer: { Args: { target_organization_id: string }; Returns: boolean }
      current_user_has_organization_access: { Args: { target_organization_id: string }; Returns: boolean }
      current_user_has_fest_access: { Args: { target_fest_id: string }; Returns: boolean }
      is_public_organization: { Args: { target_organization_id: string }; Returns: boolean }
      is_public_fest: { Args: { target_fest_id: string }; Returns: boolean }
      is_public_event: { Args: { target_event_id: string }; Returns: boolean }
      current_user_can_manage_fest: { Args: { target_fest_id: string }; Returns: boolean }
      current_user_can_operate_event: { Args: { target_event_id: string }; Returns: boolean }
      get_public_event_availability: {
        Args: Record<string, never>
        Returns: { event_id: string; confirmed_units: number; available_capacity: number; capacity_unit: string; registration_state: string }[]
      }
      register_individual_event: { Args: { p_event_id: string; p_accept_rules: boolean }; Returns: { registration_id: string; status: Database['public']['Enums']['registration_status']; waitlist_position: number | null; registered_at: string; cancellation_closes_at: string }[] }
      cancel_individual_registration: { Args: { p_registration_id: string; p_reason?: string | null }; Returns: { registration_id: string; status: Database['public']['Enums']['registration_status']; cancelled_at: string }[] }
      my_waitlist_positions: { Args: Record<string, never>; Returns: { registration_id: string; current_position: number }[] }
      register_individual_event_with_conflicts: { Args: { p_event_id: string; p_accept_rules: boolean; p_acknowledge_conflicts: boolean }; Returns: { registration_id: string; status: Database['public']['Enums']['registration_status']; waitlist_position: number | null; registered_at: string; cancellation_closes_at: string }[] }
      create_event_team: { Args: { p_event_id: string; p_name: string; p_accept_rules: boolean }; Returns: string }
      invite_event_team_member: { Args: { p_team_id: string; p_email: string; p_expiry_hours?: number }; Returns: { invitation_id: string; invitation_token: string; expires_at: string }[] }
      respond_event_team_invitation: { Args: { p_token: string; p_accept: boolean; p_accept_rules?: boolean }; Returns: string }
      revoke_event_team_invitation: { Args: { p_invitation_id: string }; Returns: undefined }
      leave_draft_event_team: { Args: { p_team_id: string }; Returns: undefined }
      acknowledge_event_team_conflicts: { Args: { p_team_id: string }; Returns: string | null }
      submit_event_team: { Args: { p_team_id: string }; Returns: { registration_id: string; status: Database['public']['Enums']['registration_status']; waitlist_position: number | null }[] }
      cancel_event_team_registration: { Args: { p_team_id: string; p_reason?: string | null }; Returns: string }
      my_event_teams: { Args: Record<string, never>; Returns: { team_id: string; event_id: string; team_name: string; team_status: string; is_captain: boolean; registration_id: string | null; registration_status: Database['public']['Enums']['registration_status'] | null; event_title: string; event_starts_at: string }[] }
      event_team_detail: { Args: { p_team_id: string }; Returns: Json }
      preview_event_team_invitation: { Args: { p_token: string }; Returns: Json }
      event_schedule_conflicts: { Args: { p_event_id: string; p_team_id?: string | null }; Returns: { person_id: string; person_name: string; other_event_id: string; other_title: string; other_starts_at: string; other_ends_at: string; overlap_starts_at: string; overlap_ends_at: string; overlap_seconds: number; blocks_conflict: boolean }[] }
      event_schedule_alternatives: { Args: { p_event_id: string; p_team_id?: string | null }; Returns: { event_id: string; event_title: string; starts_at: string; ends_at: string; club_slug: string; fest_slug: string; event_slug: string }[] }
      my_team_registration_ids: { Args: Record<string, never>; Returns: { registration_id: string }[] }
      my_confirmed_schedule: { Args: Record<string, never>; Returns: { registration_id: string; event_id: string; event_title: string; starts_at: string; ends_at: string; venue: string | null; registration_mode: Database['public']['Enums']['event_registration_mode']; team_name: string | null; club_slug: string; fest_slug: string; event_slug: string; timezone: string }[] }
      organizer_team_rosters: { Args: { p_organization_id: string }; Returns: { registration_id: string; user_id: string; full_name: string; email: string; is_captain: boolean }[] }
      my_digital_passes: { Args: Record<string, never>; Returns: { pass_id: string; registration_id: string; event_id: string; participant_name: string; fest_title: string; event_title: string; team_name: string | null; registration_status: Database['public']['Enums']['registration_status']; token: string; revoked_at: string | null; checked_in_at: string | null; starts_at: string }[] }
      staff_lookup_event_passes: { Args: { p_event_id: string; p_registration_id: string }; Returns: { pass_id: string; participant_name: string; team_name: string | null; registration_status: Database['public']['Enums']['registration_status']; revoked_at: string | null; checked_in_at: string | null }[] }
      check_in_event_pass: { Args: { p_event_id: string; p_token?: string | null; p_pass_id?: string | null }; Returns: { result: string; pass_id: string; participant_name: string; team_name: string | null; registration_id: string; checked_in_at: string }[] }
      event_check_in_metrics: { Args: { p_event_id: string }; Returns: { confirmed_people: number; checked_in_people: number }[] }
      revoke_event_pass: { Args: { p_pass_id: string }; Returns: undefined }
      organization_check_in_summary: { Args: { p_organization_id: string }; Returns: { registration_id: string; confirmed_people: number; checked_in_people: number }[] }
      organizer_analytics: { Args: { p_organization_id: string; p_fest_id?: string | null; p_event_id?: string | null; p_from?: string | null; p_to?: string | null }; Returns: Json }
      my_event_match_facts: { Args: Record<string, never>; Returns: { event_id: string; eligibility_error: string | null; conflict_titles: string[]; has_blocking_conflict: boolean; already_registered: boolean }[] }
    }
    Enums: {
      organization_member_role: 'organizer' | 'check_in_staff'
      publication_status: 'draft' | 'published' | 'cancelled' | 'archived' | 'completed'
      event_registration_mode: 'individual' | 'team'
      registration_status: 'confirmed' | 'waitlisted' | 'cancelled'
      notification_kind: 'general' | 'registration' | 'waitlist' | 'schedule_change' | 'announcement' | 'system'
      experience_level: 'beginner' | 'intermediate' | 'advanced'
      delivery_format: 'in_person' | 'online' | 'hybrid' | 'to_be_announced'
      operational_status: 'scheduled' | 'postponed' | 'cancelled' | 'completed'
    }
    CompositeTypes: Record<string, never>
  }
}
