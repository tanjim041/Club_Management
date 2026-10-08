-- Keep public availability in sync with the transactional individual RPC.
-- An omitted opening date means immediately open; an omitted deadline means
-- the event start. No existing events or registrations are changed.
begin;

create or replace function public.get_public_event_availability()
returns table (
  event_id uuid,
  confirmed_units integer,
  available_capacity integer,
  capacity_unit text,
  registration_state text
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  with public_events as (
    select e.id, e.capacity, e.registration_mode, e.starts_at, e.ends_at,
           e.waitlist_enabled, e.operational_status as event_operational_status,
           f.operational_status as fest_operational_status,
           f.ends_at as fest_ends_at,
           coalesce(e.registration_opens_at, f.registration_opens_at) as effective_opens_at,
           least(coalesce(e.registration_closes_at, f.registration_closes_at, e.starts_at), e.starts_at) as effective_closes_at
    from public.events e
    join public.fests f on f.id = e.fest_id
    join public.organizations o on o.id = f.organization_id
    where e.status = 'published' and f.status = 'published'
      and o.is_active and o.is_public_profile
  ),
  confirmed_counts as (
    select r.event_id, count(*)::integer as confirmed_units
    from public.registrations r
    join public_events e on e.id = r.event_id
    where r.status = 'confirmed'
    group by r.event_id
  )
  select e.id,
         coalesce(c.confirmed_units, 0),
         greatest(e.capacity - coalesce(c.confirmed_units, 0), 0),
         case e.registration_mode when 'individual'::public.event_registration_mode then 'people' else 'teams' end,
         case
           when e.event_operational_status = 'cancelled'::public.operational_status
             or e.fest_operational_status = 'cancelled'::public.operational_status then 'cancelled'
           when e.event_operational_status = 'completed'::public.operational_status
             or e.fest_operational_status = 'completed'::public.operational_status
             or now() >= e.ends_at then 'completed'
           when e.event_operational_status = 'postponed'::public.operational_status
             or e.fest_operational_status = 'postponed'::public.operational_status then 'not_open'
           when e.effective_opens_at is not null and now() < e.effective_opens_at then 'not_open'
           when now() >= e.effective_closes_at or now() >= e.fest_ends_at then 'closed'
           when coalesce(c.confirmed_units, 0) >= e.capacity and e.waitlist_enabled then 'waitlist'
           when coalesce(c.confirmed_units, 0) >= e.capacity then 'full'
           else 'open'
         end
  from public_events e
  left join confirmed_counts c on c.event_id = e.id;
$$;

revoke all on function public.get_public_event_availability() from public;
grant execute on function public.get_public_event_availability() to anon, authenticated, service_role;

commit;
