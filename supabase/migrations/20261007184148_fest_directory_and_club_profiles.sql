-- Festivo public directory and club-profile expansion.
--
-- This migration is deliberately additive: it preserves existing clubs, fests,
-- events, and registrations while adding durable public-profile content and a
-- privacy-safe availability aggregate for public discovery.

begin;

create type public.delivery_format as enum (
  'in_person',
  'online',
  'hybrid',
  'to_be_announced'
);

create type public.operational_status as enum (
  'scheduled',
  'postponed',
  'cancelled',
  'completed'
);

create table public.institutes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  tagline text not null default '',
  description text not null default '',
  logo_url text,
  banner_url text,
  website_url text,
  facebook_url text,
  location_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institutes_name_length check (char_length(trim(name)) between 2 and 200),
  constraint institutes_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint institutes_tagline_length check (char_length(tagline) <= 240),
  constraint institutes_description_length check (char_length(description) <= 5000),
  constraint institutes_website_url_length check (website_url is null or char_length(website_url) <= 2048),
  constraint institutes_facebook_url_format check (
    facebook_url is null
    or facebook_url ~* '^https?://(www\\.)?(facebook\\.com|fb\\.com)/'
  )
);

alter table public.organizations
  add column institute_id uuid references public.institutes(id) on delete set null,
  add column is_public_profile boolean not null default false,
  add column tagline text not null default '',
  add column cover_image_url text,
  add column facebook_url text,
  add column category text;

alter table public.organizations
  add constraint organizations_tagline_length check (char_length(tagline) <= 240),
  add constraint organizations_category_length check (category is null or char_length(trim(category)) between 1 and 100),
  add constraint organizations_facebook_url_format check (
    facebook_url is null
    or facebook_url ~* '^https?://(www\\.)?(facebook\\.com|fb\\.com)/'
  );

-- Keep every currently public club public after the visibility model changes.
-- No institute relationship or display metadata is inferred for existing records.
update public.organizations o
set is_public_profile = true
where o.is_active
  and exists (
    select 1
    from public.fests f
    where f.organization_id = o.id
      and f.status = 'published'
  );

alter table public.fests
  add column category text,
  add column delivery_format public.delivery_format not null default 'to_be_announced',
  add column experience_levels public.experience_level[] not null default '{}'::public.experience_level[],
  add column operational_status public.operational_status not null default 'scheduled';

alter table public.fests
  add constraint fests_category_length check (category is null or char_length(trim(category)) between 1 and 100),
  add constraint fests_experience_levels_no_nulls check (array_position(experience_levels, null) is null);

alter table public.events
  add column delivery_format public.delivery_format not null default 'to_be_announced',
  add column experience_levels public.experience_level[] not null default '{}'::public.experience_level[],
  add column operational_status public.operational_status not null default 'scheduled';

alter table public.events
  add constraint events_experience_levels_no_nulls check (array_position(experience_levels, null) is null);

create table public.club_segments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text not null default '',
  image_url text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_segments_title_length check (char_length(trim(title)) between 1 and 160),
  constraint club_segments_description_length check (char_length(description) <= 5000)
);

create table public.club_achievements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text not null default '',
  achieved_on date,
  awarded_by text,
  image_url text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_achievements_title_length check (char_length(trim(title)) between 1 and 200),
  constraint club_achievements_description_length check (char_length(description) <= 5000),
  constraint club_achievements_awarded_by_length check (awarded_by is null or char_length(trim(awarded_by)) <= 200)
);

create table public.club_showcases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  fest_id uuid references public.fests(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  title text not null,
  description text not null default '',
  showcase_type text not null default 'event',
  occurred_on date,
  cover_image_url text,
  external_url text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_showcases_title_length check (char_length(trim(title)) between 1 and 200),
  constraint club_showcases_description_length check (char_length(description) <= 10000),
  constraint club_showcases_type check (showcase_type in ('event', 'competition', 'project', 'award', 'recap')),
  constraint club_showcases_external_url_length check (external_url is null or char_length(external_url) <= 2048)
);

create table public.club_gallery_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  image_url text not null,
  alt_text text not null default '',
  caption text,
  taken_at timestamptz,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_gallery_items_image_url_length check (char_length(image_url) between 1 and 2048),
  constraint club_gallery_items_alt_text_length check (char_length(alt_text) <= 300),
  constraint club_gallery_items_caption_length check (caption is null or char_length(caption) <= 2000)
);

create table public.fest_schedule_items (
  id uuid primary key default gen_random_uuid(),
  fest_id uuid not null references public.fests(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fest_schedule_items_title_length check (char_length(trim(title)) between 1 and 200),
  constraint fest_schedule_items_description_length check (char_length(description) <= 10000),
  constraint fest_schedule_items_dates_are_chronological check (ends_at > starts_at),
  constraint fest_schedule_items_published_timestamp check (
    (is_published = false and published_at is null)
    or (is_published = true and published_at is not null)
  )
);

create table public.fest_announcements (
  id uuid primary key default gen_random_uuid(),
  fest_id uuid not null references public.fests(id) on delete cascade,
  title text not null,
  body text not null,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fest_announcements_title_length check (char_length(trim(title)) between 1 and 200),
  constraint fest_announcements_body_length check (char_length(body) <= 10000),
  constraint fest_announcements_published_timestamp check (
    (is_published = false and published_at is null)
    or (is_published = true and published_at is not null)
  )
);

create index organizations_institute_public_idx
  on public.organizations (institute_id, name)
  where is_active and is_public_profile;
create index fests_public_directory_idx
  on public.fests (starts_at, ends_at, category, delivery_format, operational_status)
  where status = 'published';
create index fests_experience_levels_idx
  on public.fests using gin (experience_levels);
create index events_public_directory_idx
  on public.events (starts_at, ends_at, category, delivery_format, operational_status)
  where status = 'published';
create index events_experience_levels_idx
  on public.events using gin (experience_levels);
create index club_segments_public_idx
  on public.club_segments (organization_id, sort_order, created_at)
  where is_published;
create index club_achievements_public_idx
  on public.club_achievements (organization_id, sort_order, achieved_on desc)
  where is_published;
create index club_showcases_public_idx
  on public.club_showcases (organization_id, sort_order, occurred_on desc)
  where is_published;
create index club_gallery_items_public_idx
  on public.club_gallery_items (organization_id, sort_order, created_at)
  where is_published;
create index fest_schedule_items_public_idx
  on public.fest_schedule_items (fest_id, starts_at, sort_order)
  where is_published;
create index fest_announcements_public_idx
  on public.fest_announcements (fest_id, published_at desc)
  where is_published;

create or replace function public.maintain_institute()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    raise exception 'An institute identity cannot be changed.' using errcode = '22023';
  end if;

  new.name := trim(new.name);
  new.slug := lower(trim(new.slug));
  new.tagline := trim(coalesce(new.tagline, ''));
  new.description := coalesce(new.description, '');
  new.website_url := nullif(trim(new.website_url), '');
  new.facebook_url := nullif(trim(new.facebook_url), '');
  new.location_name := nullif(trim(new.location_name), '');
  new.updated_at := now();
  return new;
end;
$$;

create trigger maintain_institute_before_write
  before insert or update on public.institutes
  for each row execute procedure public.maintain_institute();

create or replace function public.maintain_organization()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.owner_id is distinct from old.owner_id then
      raise exception 'Organization ownership can only be changed by a server-side administrative workflow.'
        using errcode = '42501';
    end if;
    if new.institute_id is distinct from old.institute_id then
      raise exception 'An organization institute can only be changed by a server-side administrative workflow.'
        using errcode = '42501';
    end if;
  end if;

  new.name := trim(new.name);
  new.slug := lower(trim(new.slug));
  new.tagline := trim(coalesce(new.tagline, ''));
  new.description := coalesce(new.description, '');
  new.website_url := nullif(trim(new.website_url), '');
  new.facebook_url := nullif(trim(new.facebook_url), '');
  new.category := nullif(trim(new.category), '');
  new.updated_at := now();
  return new;
end;
$$;

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
  elsif auth.uid() is not null then
    if new.created_by is null then
      new.created_by := auth.uid();
    elsif new.created_by is distinct from auth.uid() then
      raise exception 'A fest must be attributed to the authenticated user.' using errcode = '42501';
    end if;
  end if;

  new.title := trim(new.title);
  new.slug := lower(trim(new.slug));
  new.category := nullif(trim(new.category), '');
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
  elsif auth.uid() is not null then
    if new.created_by is null then
      new.created_by := auth.uid();
    elsif new.created_by is distinct from auth.uid() then
      raise exception 'An event must be attributed to the authenticated user.' using errcode = '42501';
    end if;
  end if;

  new.title := trim(new.title);
  new.slug := lower(trim(new.slug));
  new.category := nullif(trim(new.category), '');
  new.subcategory := nullif(trim(new.subcategory), '');
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

create or replace function public.maintain_club_content()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.organization_id is distinct from old.organization_id
       or new.created_by is distinct from old.created_by then
      raise exception 'Club content cannot be reassigned after creation.' using errcode = '22023';
    end if;
  elsif auth.uid() is not null then
    if new.created_by is null then
      new.created_by := auth.uid();
    elsif new.created_by is distinct from auth.uid() then
      raise exception 'Club content must be attributed to the authenticated user.' using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger maintain_club_segment_before_write
  before insert or update on public.club_segments
  for each row execute procedure public.maintain_club_content();
create trigger maintain_club_achievement_before_write
  before insert or update on public.club_achievements
  for each row execute procedure public.maintain_club_content();
create trigger maintain_club_showcase_before_write
  before insert or update on public.club_showcases
  for each row execute procedure public.maintain_club_content();
create trigger maintain_club_gallery_item_before_write
  before insert or update on public.club_gallery_items
  for each row execute procedure public.maintain_club_content();

create or replace function public.maintain_fest_content()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.fest_id is distinct from old.fest_id
       or new.created_by is distinct from old.created_by then
      raise exception 'Fest content cannot be reassigned after creation.' using errcode = '22023';
    end if;
  elsif auth.uid() is not null then
    if new.created_by is null then
      new.created_by := auth.uid();
    elsif new.created_by is distinct from auth.uid() then
      raise exception 'Fest content must be attributed to the authenticated user.' using errcode = '42501';
    end if;
  end if;

  if new.is_published and new.published_at is null then
    new.published_at := now();
  elsif not new.is_published then
    new.published_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.validate_fest_schedule_item()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  target_fest public.fests%rowtype;
begin
  select * into target_fest
  from public.fests
  where id = new.fest_id;

  if not found then
    raise exception 'The selected fest does not exist.' using errcode = '23503';
  end if;

  if new.event_id is not null and not exists (
    select 1 from public.events e where e.id = new.event_id and e.fest_id = new.fest_id
  ) then
    raise exception 'A schedule event must belong to the selected fest.' using errcode = '23514';
  end if;

  if new.starts_at < target_fest.starts_at or new.ends_at > target_fest.ends_at then
    raise exception 'A schedule item must fall within its fest dates.' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger validate_fest_schedule_item_before_write
  before insert or update on public.fest_schedule_items
  for each row execute procedure public.validate_fest_schedule_item();
create trigger maintain_fest_schedule_item_before_write
  before insert or update on public.fest_schedule_items
  for each row execute procedure public.maintain_fest_content();
create trigger maintain_fest_announcement_before_write
  before insert or update on public.fest_announcements
  for each row execute procedure public.maintain_fest_content();

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
      and o.is_public_profile
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
      and o.is_public_profile
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
    where e.id = target_event_id
      and e.status = 'published'
      and public.is_public_fest(e.fest_id)
  );
$$;

create or replace function public.current_user_has_fest_access(target_fest_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.fests f
    where f.id = target_fest_id
      and public.current_user_has_organization_access(f.organization_id)
  );
$$;

-- Only aggregate capacity data is public. Individual registration rows and
-- participant identities remain protected by their existing RLS policies.
create or replace function public.get_public_event_availability()
returns table (
  event_id uuid,
  confirmed_units integer,
  available_capacity integer,
  capacity_unit text,
  registration_state text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with public_events as (
    select
      e.id,
      e.capacity,
      e.registration_mode,
      e.registration_opens_at,
      e.registration_closes_at,
      e.waitlist_enabled,
      e.operational_status
    from public.events e
    join public.fests f on f.id = e.fest_id
    join public.organizations o on o.id = f.organization_id
    where e.status = 'published'
      and f.status = 'published'
      and o.is_active
      and o.is_public_profile
  ),
  confirmed_counts as (
    select r.event_id, count(*)::integer as confirmed_units
    from public.registrations r
    join public_events e on e.id = r.event_id
    where r.status = 'confirmed'
    group by r.event_id
  )
  select
    e.id as event_id,
    coalesce(c.confirmed_units, 0) as confirmed_units,
    greatest(e.capacity - coalesce(c.confirmed_units, 0), 0) as available_capacity,
    case e.registration_mode
      when 'individual'::public.event_registration_mode then 'people'
      else 'teams'
    end as capacity_unit,
    case
      when e.operational_status = 'cancelled'::public.operational_status then 'cancelled'
      when e.operational_status = 'completed'::public.operational_status then 'completed'
      when e.registration_opens_at is not null and now() < e.registration_opens_at then 'not_open'
      when e.registration_closes_at is not null and now() >= e.registration_closes_at then 'closed'
      when coalesce(c.confirmed_units, 0) >= e.capacity and e.waitlist_enabled then 'waitlist'
      when coalesce(c.confirmed_units, 0) >= e.capacity then 'full'
      else 'open'
    end as registration_state
  from public_events e
  left join confirmed_counts c on c.event_id = e.id;
$$;

create or replace function public.write_content_audit_log()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  org_id uuid;
  fest_ref uuid;
  entity_ref uuid := (row_data ->> 'id')::uuid;
begin
  if tg_table_name in ('club_segments', 'club_achievements', 'club_showcases', 'club_gallery_items') then
    org_id := (row_data ->> 'organization_id')::uuid;
  elsif tg_table_name in ('fest_schedule_items', 'fest_announcements') then
    fest_ref := (row_data ->> 'fest_id')::uuid;
    select f.organization_id into org_id from public.fests f where f.id = fest_ref;
  else
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  insert into public.audit_logs (actor_id, organization_id, fest_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    org_id,
    fest_ref,
    lower(tg_table_name) || '.' || lower(tg_op),
    tg_table_name,
    entity_ref,
    jsonb_build_object('operation', tg_op)
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger audit_club_segments_after_change
  after insert or update on public.club_segments
  for each row execute procedure public.write_content_audit_log();
create trigger audit_club_segments_before_delete
  before delete on public.club_segments
  for each row execute procedure public.write_content_audit_log();
create trigger audit_club_achievements_after_change
  after insert or update on public.club_achievements
  for each row execute procedure public.write_content_audit_log();
create trigger audit_club_achievements_before_delete
  before delete on public.club_achievements
  for each row execute procedure public.write_content_audit_log();
create trigger audit_club_showcases_after_change
  after insert or update on public.club_showcases
  for each row execute procedure public.write_content_audit_log();
create trigger audit_club_showcases_before_delete
  before delete on public.club_showcases
  for each row execute procedure public.write_content_audit_log();
create trigger audit_club_gallery_items_after_change
  after insert or update on public.club_gallery_items
  for each row execute procedure public.write_content_audit_log();
create trigger audit_club_gallery_items_before_delete
  before delete on public.club_gallery_items
  for each row execute procedure public.write_content_audit_log();
create trigger audit_fest_schedule_items_after_change
  after insert or update on public.fest_schedule_items
  for each row execute procedure public.write_content_audit_log();
create trigger audit_fest_schedule_items_before_delete
  before delete on public.fest_schedule_items
  for each row execute procedure public.write_content_audit_log();
create trigger audit_fest_announcements_after_change
  after insert or update on public.fest_announcements
  for each row execute procedure public.write_content_audit_log();
create trigger audit_fest_announcements_before_delete
  before delete on public.fest_announcements
  for each row execute procedure public.write_content_audit_log();

alter table public.institutes enable row level security;
alter table public.club_segments enable row level security;
alter table public.club_achievements enable row level security;
alter table public.club_showcases enable row level security;
alter table public.club_gallery_items enable row level security;
alter table public.fest_schedule_items enable row level security;
alter table public.fest_announcements enable row level security;

revoke all on table public.institutes, public.club_segments, public.club_achievements,
  public.club_showcases, public.club_gallery_items, public.fest_schedule_items,
  public.fest_announcements from public, anon, authenticated;

grant select on table public.institutes, public.club_segments, public.club_achievements,
  public.club_showcases, public.club_gallery_items, public.fest_schedule_items,
  public.fest_announcements to anon, authenticated;
grant insert, update, delete on table public.club_segments, public.club_achievements,
  public.club_showcases, public.club_gallery_items, public.fest_schedule_items,
  public.fest_announcements to authenticated;
grant all privileges on table public.institutes, public.club_segments, public.club_achievements,
  public.club_showcases, public.club_gallery_items, public.fest_schedule_items,
  public.fest_announcements to service_role;

create policy institutes_select_active
  on public.institutes for select to anon, authenticated
  using (is_active);

create policy club_segments_select_public_or_assigned
  on public.club_segments for select to anon, authenticated
  using (
    (is_published and public.is_public_organization(organization_id))
    or public.current_user_has_organization_access(organization_id)
  );
create policy club_segments_insert_organizer_scope
  on public.club_segments for insert to authenticated
  with check (public.current_user_is_organizer(organization_id));
create policy club_segments_update_organizer_scope
  on public.club_segments for update to authenticated
  using (public.current_user_is_organizer(organization_id))
  with check (public.current_user_is_organizer(organization_id));
create policy club_segments_delete_organizer_scope
  on public.club_segments for delete to authenticated
  using (public.current_user_is_organizer(organization_id));

create policy club_achievements_select_public_or_assigned
  on public.club_achievements for select to anon, authenticated
  using (
    (is_published and public.is_public_organization(organization_id))
    or public.current_user_has_organization_access(organization_id)
  );
create policy club_achievements_insert_organizer_scope
  on public.club_achievements for insert to authenticated
  with check (public.current_user_is_organizer(organization_id));
create policy club_achievements_update_organizer_scope
  on public.club_achievements for update to authenticated
  using (public.current_user_is_organizer(organization_id))
  with check (public.current_user_is_organizer(organization_id));
create policy club_achievements_delete_organizer_scope
  on public.club_achievements for delete to authenticated
  using (public.current_user_is_organizer(organization_id));

create policy club_showcases_select_public_or_assigned
  on public.club_showcases for select to anon, authenticated
  using (
    (is_published and public.is_public_organization(organization_id))
    or public.current_user_has_organization_access(organization_id)
  );
create policy club_showcases_insert_organizer_scope
  on public.club_showcases for insert to authenticated
  with check (public.current_user_is_organizer(organization_id));
create policy club_showcases_update_organizer_scope
  on public.club_showcases for update to authenticated
  using (public.current_user_is_organizer(organization_id))
  with check (public.current_user_is_organizer(organization_id));
create policy club_showcases_delete_organizer_scope
  on public.club_showcases for delete to authenticated
  using (public.current_user_is_organizer(organization_id));

create policy club_gallery_items_select_public_or_assigned
  on public.club_gallery_items for select to anon, authenticated
  using (
    (is_published and public.is_public_organization(organization_id))
    or public.current_user_has_organization_access(organization_id)
  );
create policy club_gallery_items_insert_organizer_scope
  on public.club_gallery_items for insert to authenticated
  with check (public.current_user_is_organizer(organization_id));
create policy club_gallery_items_update_organizer_scope
  on public.club_gallery_items for update to authenticated
  using (public.current_user_is_organizer(organization_id))
  with check (public.current_user_is_organizer(organization_id));
create policy club_gallery_items_delete_organizer_scope
  on public.club_gallery_items for delete to authenticated
  using (public.current_user_is_organizer(organization_id));

create policy fest_schedule_items_select_public_or_assigned
  on public.fest_schedule_items for select to anon, authenticated
  using (
    (is_published and public.is_public_fest(fest_id))
    or public.current_user_has_fest_access(fest_id)
  );
create policy fest_schedule_items_insert_organizer_scope
  on public.fest_schedule_items for insert to authenticated
  with check (public.current_user_can_manage_fest(fest_id));
create policy fest_schedule_items_update_organizer_scope
  on public.fest_schedule_items for update to authenticated
  using (public.current_user_can_manage_fest(fest_id))
  with check (public.current_user_can_manage_fest(fest_id));
create policy fest_schedule_items_delete_organizer_scope
  on public.fest_schedule_items for delete to authenticated
  using (public.current_user_can_manage_fest(fest_id));

create policy fest_announcements_select_public_or_assigned
  on public.fest_announcements for select to anon, authenticated
  using (
    (is_published and public.is_public_fest(fest_id))
    or public.current_user_has_fest_access(fest_id)
  );
create policy fest_announcements_insert_organizer_scope
  on public.fest_announcements for insert to authenticated
  with check (public.current_user_can_manage_fest(fest_id));
create policy fest_announcements_update_organizer_scope
  on public.fest_announcements for update to authenticated
  using (public.current_user_can_manage_fest(fest_id))
  with check (public.current_user_can_manage_fest(fest_id));
create policy fest_announcements_delete_organizer_scope
  on public.fest_announcements for delete to authenticated
  using (public.current_user_can_manage_fest(fest_id));

revoke all on function public.maintain_institute() from public;
revoke all on function public.maintain_club_content() from public;
revoke all on function public.maintain_fest_content() from public;
revoke all on function public.validate_fest_schedule_item() from public;
revoke all on function public.write_content_audit_log() from public;
revoke all on function public.current_user_has_fest_access(uuid) from public;
revoke all on function public.get_public_event_availability() from public;

grant execute on function public.is_public_organization(uuid) to anon, authenticated, service_role;
grant execute on function public.is_public_fest(uuid) to anon, authenticated, service_role;
grant execute on function public.is_public_event(uuid) to anon, authenticated, service_role;
grant execute on function public.current_user_has_fest_access(uuid) to anon, authenticated, service_role;
grant execute on function public.get_public_event_availability() to anon, authenticated, service_role;

commit;
