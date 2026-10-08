-- Directory validation refinements. Existing records are unchanged.

begin;

alter table public.organizations
  drop constraint if exists organizations_facebook_url_format;
alter table public.organizations
  add constraint organizations_facebook_url_format check (
    facebook_url is null
    or facebook_url ~* '^https?://(www[.])?(facebook[.]com|fb[.]com)/'
  );

alter table public.institutes
  drop constraint if exists institutes_facebook_url_format;
alter table public.institutes
  add constraint institutes_facebook_url_format check (
    facebook_url is null
    or facebook_url ~* '^https?://(www[.])?(facebook[.]com|fb[.]com)/'
  );

create or replace function public.validate_club_showcase_links()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  linked_event_fest_id uuid;
begin
  if new.fest_id is not null and not exists (
    select 1
    from public.fests f
    where f.id = new.fest_id
      and f.organization_id = new.organization_id
  ) then
    raise exception 'A showcase fest must belong to this club.' using errcode = '23514';
  end if;

  if new.event_id is not null then
    select e.fest_id into linked_event_fest_id
    from public.events e
    join public.fests f on f.id = e.fest_id
    where e.id = new.event_id
      and f.organization_id = new.organization_id;

    if linked_event_fest_id is null then
      raise exception 'A showcase event must belong to this club.' using errcode = '23514';
    end if;

    if new.fest_id is not null and new.fest_id <> linked_event_fest_id then
      raise exception 'A showcase event must belong to its linked fest.' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger validate_club_showcase_links_before_write
  before insert or update on public.club_showcases
  for each row execute procedure public.validate_club_showcase_links();

revoke all on function public.validate_club_showcase_links() from public;

-- The aggregate exposes only counts, never registration rows or identities.
-- One confirmed registration consumes one capacity unit: a person for an
-- individual event, or a team entry for a team event. Team registration writes
-- remain disabled until a transactional enrollment RPC enforces roster sizes.
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
      coalesce(e.registration_opens_at, f.registration_opens_at) as effective_opens_at,
      coalesce(e.registration_closes_at, f.registration_closes_at) as effective_closes_at,
      e.starts_at,
      e.ends_at,
      e.waitlist_enabled,
      e.operational_status as event_operational_status,
      f.operational_status as fest_operational_status
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
      when e.event_operational_status = 'cancelled'::public.operational_status
        or e.fest_operational_status = 'cancelled'::public.operational_status then 'cancelled'
      when e.event_operational_status = 'completed'::public.operational_status
        or e.fest_operational_status = 'completed'::public.operational_status
        or now() >= e.ends_at then 'completed'
      when e.event_operational_status = 'postponed'::public.operational_status
        or e.fest_operational_status = 'postponed'::public.operational_status then 'not_open'
      when e.effective_opens_at is null
        or now() < e.effective_opens_at then 'not_open'
      when (e.effective_closes_at is not null and now() >= e.effective_closes_at)
        or now() >= e.starts_at then 'closed'
      when coalesce(c.confirmed_units, 0) >= e.capacity and e.waitlist_enabled then 'waitlist'
      when coalesce(c.confirmed_units, 0) >= e.capacity then 'full'
      else 'open'
    end as registration_state
  from public_events e
  left join confirmed_counts c on c.event_id = e.id;
$$;

revoke all on function public.get_public_event_availability() from public;
grant execute on function public.get_public_event_availability() to anon, authenticated, service_role;

commit;
