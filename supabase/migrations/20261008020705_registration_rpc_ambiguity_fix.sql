-- Explicitly qualify registration columns that share names with RPC output parameters.
create or replace function private.register_individual_event_impl(
  p_event_id uuid,
  p_accept_rules boolean
) returns table (
  registration_id uuid,
  status public.registration_status,
  waitlist_position integer,
  registered_at timestamptz,
  cancellation_closes_at timestamptz
)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_event public.events;
  v_fest public.fests;
  v_profile public.profiles;
  v_now timestamptz;
  v_opens timestamptz;
  v_deadline timestamptz;
  v_confirmed integer;
  v_position integer;
  v_registration public.registrations;
  v_eligibility_error text;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = 'P0001'; end if;
  if p_accept_rules is distinct from true then raise exception 'rules_acceptance_required' using errcode = 'P0001'; end if;

  -- This row lock serializes all capacity decisions for the same event.
  select e.* into v_event
  from public.events e
  join public.fests f on f.id = e.fest_id
  join public.organizations o on o.id = f.organization_id
  where e.id = p_event_id and o.is_active and o.is_public_profile
  for update of e;
  if not found then raise exception 'event_unavailable' using errcode = 'P0001'; end if;
  select * into v_fest from public.fests where id = v_event.fest_id;
  if v_event.registration_mode <> 'individual'::public.event_registration_mode
     or v_event.status <> 'published'::public.publication_status
     or v_fest.status <> 'published'::public.publication_status
     or v_event.operational_status <> 'scheduled'::public.operational_status
     or v_fest.operational_status <> 'scheduled'::public.operational_status then
    raise exception 'event_unavailable' using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles where id = v_user for update;
  if not found then raise exception 'profile_missing' using errcode = 'P0001'; end if;
  v_now := pg_catalog.clock_timestamp();
  v_opens := coalesce(v_event.registration_opens_at, v_fest.registration_opens_at);
  v_deadline := least(
    coalesce(v_event.registration_closes_at, v_fest.registration_closes_at, v_event.starts_at),
    v_event.starts_at
  );
  if v_opens is not null and v_now < v_opens then raise exception 'registration_not_open' using errcode = 'P0001'; end if;
  if v_now >= v_deadline or v_now >= v_fest.ends_at then raise exception 'registration_closed' using errcode = 'P0001'; end if;

  if exists (
    select 1 from public.registrations r
    where r.event_id = p_event_id and r.participant_id = v_user
      and r.status in ('confirmed'::public.registration_status, 'waitlisted'::public.registration_status)
  ) then raise exception 'already_registered' using errcode = 'P0001'; end if;

  v_eligibility_error := private.individual_eligibility_error(v_event, v_profile);
  if v_eligibility_error is not null then raise exception '%', v_eligibility_error using errcode = 'P0001'; end if;
  if private.individual_schedule_conflict(v_event, v_user) then
    raise exception 'schedule_conflict' using errcode = 'P0001';
  end if;

  -- Existing eligible waitlisted users have first claim on an empty seat.
  perform private.promote_individual_waitlist_locked(v_event, v_fest);
  select count(*) into v_confirmed from public.registrations r
  where r.event_id = p_event_id and r.status = 'confirmed'::public.registration_status;

  if v_confirmed < v_event.capacity then
    insert into public.registrations
      (event_id, participant_id, status, confirmed_at, rules_accepted_at, rules_accepted_hash)
    values
      (p_event_id, v_user, 'confirmed'::public.registration_status, v_now, v_now, pg_catalog.md5(v_event.rules))
    returning * into v_registration;
  else
    if not v_event.waitlist_enabled then raise exception 'event_full' using errcode = 'P0001'; end if;
    select coalesce(max(r.waitlist_position), 0) + 1 into v_position
    from public.registrations r
    where r.event_id = p_event_id and r.status = 'waitlisted'::public.registration_status;
    insert into public.registrations
      (event_id, participant_id, status, waitlist_position, rules_accepted_at, rules_accepted_hash)
    values
      (p_event_id, v_user, 'waitlisted'::public.registration_status, v_position, v_now, pg_catalog.md5(v_event.rules))
    returning * into v_registration;
  end if;

  return query select v_registration.id, v_registration.status, v_registration.waitlist_position,
                      v_registration.registered_at,
                      coalesce(v_event.cancellation_closes_at, v_event.starts_at);
end;
$$;

