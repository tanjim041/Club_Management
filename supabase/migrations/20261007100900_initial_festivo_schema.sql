-- Festivo Phase 2: core data model, authorization helpers, and row-level security.
--
-- Important: browser clients use the anon/publishable key and are intentionally
-- unable to create organizations or grant privileged memberships. Provision an
-- organization through the server-only `bootstrap_organization` RPC (or the
-- Supabase service role) after an approval workflow.

begin;

create extension if not exists pgcrypto with schema extensions;

create type public.organization_member_role as enum ('organizer', 'check_in_staff');
create type public.publication_status as enum ('draft', 'published', 'cancelled', 'archived', 'completed');
create type public.event_registration_mode as enum ('individual', 'team');
create type public.registration_status as enum ('confirmed', 'waitlisted', 'cancelled');
create type public.notification_kind as enum (
  'general',
  'registration',
  'waitlist',
  'schedule_change',
  'announcement',
  'system'
);
create type public.experience_level as enum ('beginner', 'intermediate', 'advanced');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  institution text,
  department text,
  phone text,
  interests text[] not null default '{}',
  skills text[] not null default '{}',
  experience_level public.experience_level,
  bio text,
  profile_completed boolean not null default false,
  profile_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (full_name is null or char_length(trim(full_name)) between 1 and 160),
  constraint profiles_institution_length check (institution is null or char_length(trim(institution)) between 1 and 200),
  constraint profiles_phone_length check (phone is null or char_length(trim(phone)) between 1 and 40),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 1200),
  constraint profiles_completion_timestamp check (
    (profile_completed = false and profile_completed_at is null)
    or (profile_completed = true and profile_completed_at is not null)
  )
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  logo_url text,
  website_url text,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_length check (char_length(trim(name)) between 2 and 160),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint organizations_description_length check (char_length(description) <= 5000),
  constraint organizations_website_url_length check (website_url is null or char_length(website_url) <= 2048)
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.organization_member_role not null,
  is_active boolean not null default true,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_memberships_one_role_per_user unique (organization_id, user_id)
);

create table public.fests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  slug text not null,
  description text not null default '',
  status public.publication_status not null default 'draft',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  timezone text not null default 'Asia/Dhaka',
  location_name text,
  location_address text,
  banner_url text,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fests_organization_slug_unique unique (organization_id, slug),
  constraint fests_title_length check (char_length(trim(title)) between 2 and 200),
  constraint fests_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint fests_description_length check (char_length(description) <= 20000),
  constraint fests_dates_are_chronological check (ends_at > starts_at),
  constraint fests_registration_window_is_valid check (
    (registration_opens_at is null and registration_closes_at is null)
    or (
      registration_opens_at is not null
      and registration_closes_at is not null
      and registration_closes_at > registration_opens_at
      and registration_closes_at <= starts_at
    )
  )
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  fest_id uuid not null references public.fests(id) on delete cascade,
  title text not null,
  slug text not null,
  description text not null default '',
  category text,
  status public.publication_status not null default 'draft',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  venue text,
  registration_mode public.event_registration_mode not null default 'individual',
  capacity integer not null,
  team_min_size smallint,
  team_max_size smallint,
  waitlist_enabled boolean not null default true,
  blocks_schedule_conflicts boolean not null default true,
  eligibility jsonb not null default '{}'::jsonb,
  rules text not null default '',
  cover_image_url text,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_fest_slug_unique unique (fest_id, slug),
  constraint events_title_length check (char_length(trim(title)) between 2 and 200),
  constraint events_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint events_description_length check (char_length(description) <= 20000),
  constraint events_dates_are_chronological check (ends_at > starts_at),
  constraint events_capacity_is_positive check (capacity > 0),
  constraint events_eligibility_is_object check (jsonb_typeof(eligibility) = 'object'),
  constraint events_registration_window_is_valid check (
    (registration_opens_at is null and registration_closes_at is null)
    or (
      registration_opens_at is not null
      and registration_closes_at is not null
      and registration_closes_at > registration_opens_at
      and registration_closes_at <= starts_at
    )
  ),
  constraint events_team_size_matches_registration_mode check (
    (
      registration_mode = 'individual'
      and team_min_size is null
      and team_max_size is null
    )
    or (
      registration_mode = 'team'
      and team_min_size is not null
      and team_max_size is not null
      and team_min_size >= 2
      and team_max_size >= team_min_size
      and team_max_size <= 100
    )
  )
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  status public.registration_status not null,
  waitlist_position integer,
  registered_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registrations_metadata_is_object check (jsonb_typeof(metadata) = 'object'),
  constraint registrations_waitlist_position_is_positive check (
    waitlist_position is null or waitlist_position > 0
  ),
  constraint registrations_waitlist_position_matches_status check (
    (status = 'waitlisted' and waitlist_position is not null)
    or (status <> 'waitlisted' and waitlist_position is null)
  ),
  constraint registrations_cancellation_timestamp_matches_status check (
    (status = 'cancelled' and cancelled_at is not null)
    or (status <> 'cancelled' and cancelled_at is null)
  ),
  constraint registrations_confirmation_timestamp_matches_status check (
    status <> 'confirmed' or confirmed_at is not null
  )
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  fest_id uuid references public.fests(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  kind public.notification_kind not null default 'general',
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_title_length check (char_length(trim(title)) between 1 and 200),
  constraint notifications_body_length check (char_length(body) <= 5000),
  constraint notifications_data_is_object check (jsonb_typeof(data) = 'object')
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  fest_id uuid references public.fests(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  registration_id uuid references public.registrations(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_length check (char_length(trim(action)) between 1 and 160),
  constraint audit_logs_entity_type_length check (char_length(trim(entity_type)) between 1 and 80),
  constraint audit_logs_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index organization_memberships_user_active_idx
  on public.organization_memberships (user_id, is_active)
  where is_active;
create index organization_memberships_organization_role_active_idx
  on public.organization_memberships (organization_id, role, user_id)
  where is_active;
create index fests_organization_status_starts_idx
  on public.fests (organization_id, status, starts_at);
create index fests_public_browse_idx
  on public.fests (starts_at)
  where status = 'published';
create index events_fest_status_starts_idx
  on public.events (fest_id, status, starts_at);
create index events_public_browse_idx
  on public.events (starts_at)
  where status = 'published';
create index registrations_event_status_idx
  on public.registrations (event_id, status, registered_at);
create index registrations_participant_idx
  on public.registrations (participant_id, registered_at desc);
create unique index registrations_one_active_entry_per_participant_idx
  on public.registrations (event_id, participant_id)
  where status in ('confirmed', 'waitlisted');
create unique index registrations_unique_waitlist_position_idx
  on public.registrations (event_id, waitlist_position)
  where status = 'waitlisted';
create index notifications_recipient_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;
create index audit_logs_organization_created_idx
  on public.audit_logs (organization_id, created_at desc);
create index audit_logs_actor_created_idx
  on public.audit_logs (actor_id, created_at desc);

-- Authentication owns profile creation. A browser cannot insert profiles or
-- impersonate a different auth.users row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.maintain_profile()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id then
      raise exception 'A profile identity cannot be changed.' using errcode = '22023';
    end if;
    if new.email is distinct from old.email then
      raise exception 'Email is managed by Supabase Auth and cannot be changed here.' using errcode = '42501';
    end if;
  end if;

  new.full_name := nullif(trim(new.full_name), '');
  new.institution := nullif(trim(new.institution), '');
  new.department := nullif(trim(new.department), '');
  new.phone := nullif(trim(new.phone), '');
  new.email := lower(nullif(trim(new.email), ''));
  new.interests := coalesce(new.interests, '{}');
  new.skills := coalesce(new.skills, '{}');

  -- Phone is useful for event operations but optional at profile completion.
  -- Requiring experience level makes the matcher onboarding data meaningful.
  if new.full_name is not null
     and new.institution is not null
     and new.experience_level is not null then
    new.profile_completed := true;
    if tg_op = 'UPDATE' then
      new.profile_completed_at := coalesce(old.profile_completed_at, now());
    else
      new.profile_completed_at := now();
    end if;
  else
    new.profile_completed := false;
    new.profile_completed_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger maintain_profile_before_write
  before insert or update on public.profiles
  for each row execute procedure public.maintain_profile();

create or replace function public.current_user_is_organization_owner(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id = target_organization_id
      and o.owner_id = auth.uid()
  );
$$;

create or replace function public.current_user_is_organizer(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
      and m.role = 'organizer'
      and m.is_active
  );
$$;

create or replace function public.current_user_has_organization_access(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
      and m.is_active
  );
$$;

create or replace function public.is_public_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id = target_organization_id
      and o.is_active
      and exists (
        select 1
        from public.fests f
        where f.organization_id = o.id
          and f.status = 'published'
      )
  );
$$;

create or replace function public.is_public_fest(target_fest_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.fests f
    join public.organizations o on o.id = f.organization_id
    where f.id = target_fest_id
      and f.status = 'published'
      and o.is_active
  );
$$;

create or replace function public.is_public_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.events e
    join public.fests f on f.id = e.fest_id
    join public.organizations o on o.id = f.organization_id
    where e.id = target_event_id
      and e.status = 'published'
      and f.status = 'published'
      and o.is_active
  );
$$;

create or replace function public.current_user_can_manage_fest(target_fest_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.fests f
    join public.organization_memberships m on m.organization_id = f.organization_id
    where f.id = target_fest_id
      and m.user_id = auth.uid()
      and m.role = 'organizer'
      and m.is_active
  );
$$;

create or replace function public.current_user_can_operate_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.events e
    join public.fests f on f.id = e.fest_id
    join public.organization_memberships m on m.organization_id = f.organization_id
    where e.id = target_event_id
      and m.user_id = auth.uid()
      and m.is_active
      and m.role in ('organizer', 'check_in_staff')
  );
$$;

-- Full participant profiles may be read only by organizers, and only where the
-- participant has a registration in that organizer's organization. Check-in
-- staff can read operational registration rows but never contact profile data;
-- a later check-in phase can add narrowly scoped assigned-event views.
create or replace function public.current_user_can_view_participant_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.registrations r
    join public.events e on e.id = r.event_id
    join public.fests f on f.id = e.fest_id
    join public.organization_memberships m on m.organization_id = f.organization_id
    where r.participant_id = target_profile_id
      and m.user_id = auth.uid()
      and m.is_active
      and m.role = 'organizer'
  );
$$;

create or replace function public.maintain_organization()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' and new.owner_id is distinct from old.owner_id then
    raise exception 'Organization ownership can only be changed by a server-side administrative workflow.'
      using errcode = '42501';
  end if;
  new.name := trim(new.name);
  new.slug := lower(trim(new.slug));
  new.updated_at := now();
  return new;
end;
$$;

create trigger maintain_organization_before_write
  before insert or update on public.organizations
  for each row execute procedure public.maintain_organization();

-- Membership writes are deliberately constrained twice: RLS scopes the row
-- operation and this trigger verifies privilege transitions and blocks self-grants.
create or replace function public.guard_organization_membership()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  remaining_organizers boolean;
begin
  if tg_op = 'DELETE' then
    if old.role = 'organizer' and old.is_active then
      select exists (
        select 1
        from public.organization_memberships m
        where m.organization_id = old.organization_id
          and m.id <> old.id
          and m.role = 'organizer'
          and m.is_active
      ) into remaining_organizers;

      if not remaining_organizers then
        raise exception 'An organization must retain at least one active organizer.'
          using errcode = '23514';
      end if;
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.organization_id is distinct from old.organization_id
       or new.user_id is distinct from old.user_id then
      raise exception 'A membership cannot be moved to another organization or user.'
        using errcode = '22023';
    end if;

    if old.role = 'organizer' and old.is_active
       and (new.role <> 'organizer' or not new.is_active) then
      select exists (
        select 1
        from public.organization_memberships m
        where m.organization_id = old.organization_id
          and m.id <> old.id
          and m.role = 'organizer'
          and m.is_active
      ) into remaining_organizers;

      if not remaining_organizers then
        raise exception 'An organization must retain at least one active organizer.'
          using errcode = '23514';
      end if;
    end if;
  end if;

  if actor_id is not null then
    if new.user_id = actor_id then
      raise exception 'Users cannot grant, edit, or escalate their own organization access.'
        using errcode = '42501';
    end if;

    if new.role = 'organizer'
       and not public.current_user_is_organization_owner(new.organization_id) then
      raise exception 'Only the organization owner can grant or modify organizer access.'
        using errcode = '42501';
    end if;

    if new.role = 'check_in_staff'
       and not public.current_user_is_organizer(new.organization_id) then
      raise exception 'Only an organizer can grant or modify check-in staff access.'
        using errcode = '42501';
    end if;

    new.granted_by := actor_id;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger guard_organization_membership_before_write
  before insert or update or delete on public.organization_memberships
  for each row execute procedure public.guard_organization_membership();

create or replace function public.maintain_fest()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.organization_id is distinct from old.organization_id
       or new.created_by is distinct from old.created_by then
      raise exception 'A fest cannot be moved or reassigned after creation.' using errcode = '22023';
    end if;
  elsif new.created_by is null and auth.uid() is not null then
    new.created_by := auth.uid();
  end if;

  new.title := trim(new.title);
  new.slug := lower(trim(new.slug));
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger maintain_fest_before_write
  before insert or update on public.fests
  for each row execute procedure public.maintain_fest();

create or replace function public.maintain_event()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.fest_id is distinct from old.fest_id
       or new.created_by is distinct from old.created_by then
      raise exception 'An event cannot be moved or reassigned after creation.' using errcode = '22023';
    end if;
  elsif new.created_by is null and auth.uid() is not null then
    new.created_by := auth.uid();
  end if;

  new.title := trim(new.title);
  new.slug := lower(trim(new.slug));
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger maintain_event_before_write
  before insert or update on public.events
  for each row execute procedure public.maintain_event();

create or replace function public.maintain_registration()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' and (
    new.event_id is distinct from old.event_id
    or new.participant_id is distinct from old.participant_id
    or new.registered_at is distinct from old.registered_at
  ) then
    raise exception 'A registration identity cannot be changed.' using errcode = '22023';
  end if;

  if new.status = 'confirmed' and new.confirmed_at is null then
    new.confirmed_at := now();
  end if;
  if new.status = 'cancelled' and new.cancelled_at is null then
    new.cancelled_at := now();
  elsif new.status <> 'cancelled' then
    new.cancelled_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger maintain_registration_before_write
  before insert or update on public.registrations
  for each row execute procedure public.maintain_registration();

create or replace function public.guard_notification_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if (to_jsonb(new) - 'read_at') is distinct from (to_jsonb(old) - 'read_at') then
    raise exception 'Only notification read status can be changed by a client.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_notification_before_update
  before update on public.notifications
  for each row execute procedure public.guard_notification_update();

-- Minimal, privacy-conscious audit trail. It stores operation metadata rather
-- than full row snapshots, avoiding unnecessary copies of participant data.
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  org_id uuid;
  fest_ref uuid;
  event_ref uuid;
  registration_ref uuid;
  entity_ref uuid;
begin
  entity_ref := (row_data ->> 'id')::uuid;

  if tg_table_name = 'organizations' then
    org_id := entity_ref;
  elsif tg_table_name = 'organization_memberships' then
    org_id := (row_data ->> 'organization_id')::uuid;
  elsif tg_table_name = 'fests' then
    org_id := (row_data ->> 'organization_id')::uuid;
    fest_ref := entity_ref;
  elsif tg_table_name = 'events' then
    fest_ref := (row_data ->> 'fest_id')::uuid;
    event_ref := entity_ref;
    select f.organization_id into org_id from public.fests f where f.id = fest_ref;
  elsif tg_table_name = 'registrations' then
    registration_ref := entity_ref;
    select e.id, f.id, f.organization_id
      into event_ref, fest_ref, org_id
      from public.events e
      join public.fests f on f.id = e.fest_id
      where e.id = (row_data ->> 'event_id')::uuid;
  else
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  insert into public.audit_logs (
    actor_id,
    organization_id,
    fest_id,
    event_id,
    registration_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    org_id,
    fest_ref,
    event_ref,
    registration_ref,
    lower(tg_table_name) || '.' || lower(tg_op),
    tg_table_name,
    entity_ref,
    jsonb_build_object('operation', tg_op)
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger audit_organizations_after_change
  after insert or update on public.organizations
  for each row execute procedure public.write_audit_log();
create trigger audit_organizations_before_delete
  before delete on public.organizations
  for each row execute procedure public.write_audit_log();
create trigger audit_organization_memberships_after_change
  after insert or update on public.organization_memberships
  for each row execute procedure public.write_audit_log();
create trigger audit_organization_memberships_before_delete
  before delete on public.organization_memberships
  for each row execute procedure public.write_audit_log();
create trigger audit_fests_after_change
  after insert or update on public.fests
  for each row execute procedure public.write_audit_log();
create trigger audit_fests_before_delete
  before delete on public.fests
  for each row execute procedure public.write_audit_log();
create trigger audit_events_after_change
  after insert or update on public.events
  for each row execute procedure public.write_audit_log();
create trigger audit_events_before_delete
  before delete on public.events
  for each row execute procedure public.write_audit_log();
create trigger audit_registrations_after_change
  after insert or update on public.registrations
  for each row execute procedure public.write_audit_log();
create trigger audit_registrations_before_delete
  before delete on public.registrations
  for each row execute procedure public.write_audit_log();

-- Server-only organization provisioning. Edge Functions can call this through
-- the Supabase service-role key after an external/admin approval flow. It is
-- intentionally not granted to anon or authenticated browser roles.
create or replace function public.bootstrap_organization(
  p_owner_id uuid,
  p_name text,
  p_slug text,
  p_description text default ''
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_organization_id uuid;
begin
  if not exists (select 1 from public.profiles where id = p_owner_id) then
    raise exception 'The organization owner must have a profile.' using errcode = '23503';
  end if;

  insert into public.organizations (name, slug, description, owner_id)
  values (p_name, p_slug, coalesce(p_description, ''), p_owner_id)
  returning id into new_organization_id;

  insert into public.organization_memberships (
    organization_id,
    user_id,
    role,
    is_active,
    granted_by
  ) values (
    new_organization_id,
    p_owner_id,
    'organizer',
    true,
    p_owner_id
  );

  return new_organization_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.fests enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- Table grants are deliberately narrow. RLS decides which permitted rows a
-- browser may access; these grants ensure no table is accidentally exposed for
-- an operation that lacks a matching policy.
revoke create on schema public from public, anon, authenticated;
revoke all on table public.profiles, public.organizations, public.organization_memberships,
  public.fests, public.events, public.registrations, public.notifications, public.audit_logs
  from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant select on table public.organizations, public.fests, public.events to anon;
grant select on table public.profiles, public.organizations, public.organization_memberships,
  public.fests, public.events, public.registrations, public.notifications, public.audit_logs
  to authenticated;
grant update on table public.profiles, public.organizations, public.organization_memberships,
  public.fests, public.events, public.notifications to authenticated;
grant insert, delete on table public.organization_memberships, public.fests, public.events
  to authenticated;
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

create policy profiles_select_own
  on public.profiles for select to authenticated
  using (
    (select auth.uid()) = id
    or public.current_user_can_view_participant_profile(id)
  );
create policy profiles_update_own
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Anonymous visitors can only discover organizations that currently host a
-- published fest. Staff may read their assigned organization operationally.
create policy organizations_select_public_or_assigned
  on public.organizations for select to anon, authenticated
  using (
    public.is_public_organization(id)
    or public.current_user_has_organization_access(id)
  );
create policy organizations_update_organizer_scope
  on public.organizations for update to authenticated
  using (public.current_user_is_organizer(id))
  with check (public.current_user_is_organizer(id));

create policy organization_memberships_select_own_or_organizer
  on public.organization_memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.current_user_is_organizer(organization_id)
  );
create policy organization_memberships_insert_privileged
  on public.organization_memberships for insert to authenticated
  with check (
    user_id <> (select auth.uid())
    and (
      (role = 'organizer' and public.current_user_is_organization_owner(organization_id))
      or (role = 'check_in_staff' and public.current_user_is_organizer(organization_id))
    )
  );
create policy organization_memberships_update_privileged
  on public.organization_memberships for update to authenticated
  using (
    user_id <> (select auth.uid())
    and case
      when role = 'organizer' then public.current_user_is_organization_owner(organization_id)
      else public.current_user_is_organizer(organization_id)
    end
  )
  with check (
    user_id <> (select auth.uid())
    and case
      when role = 'organizer' then public.current_user_is_organization_owner(organization_id)
      else public.current_user_is_organizer(organization_id)
    end
  );
create policy organization_memberships_delete_privileged
  on public.organization_memberships for delete to authenticated
  using (
    user_id <> (select auth.uid())
    and case
      when role = 'organizer' then public.current_user_is_organization_owner(organization_id)
      else public.current_user_is_organizer(organization_id)
    end
  );

create policy fests_select_published_or_operational_scope
  on public.fests for select to anon, authenticated
  using (
    public.is_public_fest(id)
    or public.current_user_has_organization_access(organization_id)
  );
create policy fests_insert_organizer_scope
  on public.fests for insert to authenticated
  with check (public.current_user_is_organizer(organization_id));
create policy fests_update_organizer_scope
  on public.fests for update to authenticated
  using (public.current_user_is_organizer(organization_id))
  with check (public.current_user_is_organizer(organization_id));
create policy fests_delete_organizer_scope
  on public.fests for delete to authenticated
  using (public.current_user_is_organizer(organization_id));

create policy events_select_published_or_operational_scope
  on public.events for select to anon, authenticated
  using (
    public.is_public_event(id)
    or public.current_user_can_operate_event(id)
  );
create policy events_insert_organizer_scope
  on public.events for insert to authenticated
  with check (public.current_user_can_manage_fest(fest_id));
create policy events_update_organizer_scope
  on public.events for update to authenticated
  using (public.current_user_can_manage_fest(fest_id))
  with check (public.current_user_can_manage_fest(fest_id));
create policy events_delete_organizer_scope
  on public.events for delete to authenticated
  using (public.current_user_can_manage_fest(fest_id));

-- Registration writes are intentionally deferred to transactional database RPCs
-- in the registration phase. This prevents capacity, deadline, and waitlist
-- rules from being bypassed with a direct browser update.
create policy registrations_select_own_or_operational_scope
  on public.registrations for select to authenticated
  using (
    participant_id = (select auth.uid())
    or public.current_user_can_operate_event(event_id)
  );

create policy notifications_select_own
  on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
create policy notifications_mark_own_read_state
  on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create policy audit_logs_select_organizer_scope
  on public.audit_logs for select to authenticated
  using (
    organization_id is not null
    and public.current_user_is_organizer(organization_id)
  );

-- Security-definer helpers execute only where needed by RLS or trusted server
-- workflows. `bootstrap_organization` is explicitly service-role only.
revoke all on function public.handle_new_user() from public;
revoke all on function public.maintain_profile() from public;
revoke all on function public.maintain_organization() from public;
revoke all on function public.guard_organization_membership() from public;
revoke all on function public.maintain_fest() from public;
revoke all on function public.maintain_event() from public;
revoke all on function public.maintain_registration() from public;
revoke all on function public.guard_notification_update() from public;
revoke all on function public.write_audit_log() from public;
revoke all on function public.current_user_is_organization_owner(uuid) from public;
revoke all on function public.current_user_is_organizer(uuid) from public;
revoke all on function public.current_user_has_organization_access(uuid) from public;
revoke all on function public.is_public_organization(uuid) from public;
revoke all on function public.is_public_fest(uuid) from public;
revoke all on function public.is_public_event(uuid) from public;
revoke all on function public.current_user_can_manage_fest(uuid) from public;
revoke all on function public.current_user_can_operate_event(uuid) from public;
revoke all on function public.current_user_can_view_participant_profile(uuid) from public;
revoke all on function public.bootstrap_organization(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.bootstrap_organization(uuid, text, text, text) to service_role;

grant execute on function public.current_user_is_organization_owner(uuid) to anon, authenticated, service_role;
grant execute on function public.current_user_is_organizer(uuid) to anon, authenticated, service_role;
grant execute on function public.current_user_has_organization_access(uuid) to anon, authenticated, service_role;
grant execute on function public.is_public_organization(uuid) to anon, authenticated, service_role;
grant execute on function public.is_public_fest(uuid) to anon, authenticated, service_role;
grant execute on function public.is_public_event(uuid) to anon, authenticated, service_role;
grant execute on function public.current_user_can_manage_fest(uuid) to anon, authenticated, service_role;
grant execute on function public.current_user_can_operate_event(uuid) to anon, authenticated, service_role;
grant execute on function public.current_user_can_view_participant_profile(uuid) to authenticated, service_role;

commit;
