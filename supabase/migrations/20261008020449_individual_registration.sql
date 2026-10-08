-- Atomic individual registrations, cancellation, and FIFO waitlist promotion.
-- No existing registrations are rewritten or removed.
begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

alter table public.events
  add column cancellation_closes_at timestamptz;
alter table public.events
  add constraint events_cancellation_cutoff_before_start
  check (cancellation_closes_at is null or cancellation_closes_at <= starts_at);

alter table public.registrations
  add column rules_accepted_at timestamptz,
  add column rules_accepted_hash text;

create index registrations_fifo_waitlist_idx
  on public.registrations (event_id, waitlist_position, registered_at, id)
  where status = 'waitlisted';

-- Attendance is deliberately not encoded in registration status or metadata.
create table public.registration_attendance (
  registration_id uuid primary key references public.registrations(id) on delete cascade,
  verified_at timestamptz not null default now(),
  verified_by uuid references public.profiles(id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint registration_attendance_notes_length check (char_length(notes) <= 1000)
);
create index registration_attendance_verifier_idx
  on public.registration_attendance (verified_by, verified_at desc);
alter table public.registration_attendance enable row level security;
revoke all on table public.registration_attendance from public, anon, authenticated;
grant select on table public.registration_attendance to authenticated;
grant all on table public.registration_attendance to service_role;
create policy registration_attendance_select_own_or_scoped_staff
  on public.registration_attendance for select to authenticated
  using (exists (
    select 1 from public.registrations r
    where r.id = registration_id
      and (r.participant_id = (select auth.uid()) or public.current_user_can_operate_event(r.event_id))
  ));

-- Eligibility is intentionally fail-closed. Unknown JSON criteria must be
-- implemented on the server before an event using them can accept entrants.
create function private.individual_eligibility_error(
  p_event public.events,
  p_profile public.profiles
) returns text
language plpgsql stable
set search_path = ''
as $$
declare
  v_value jsonb;
  v_key text;
  v_level integer;
  v_required integer;
begin
  if not p_profile.profile_completed then return 'profile_incomplete'; end if;
  if cardinality(p_event.experience_levels) > 0
     and (p_profile.experience_level is null or not p_profile.experience_level = any(p_event.experience_levels)) then
    return 'experience_not_eligible';
  end if;

  for v_key in select pg_catalog.jsonb_object_keys(p_event.eligibility) loop
    if v_key not in ('allowed_institutions', 'allowed_departments', 'required_skills',
                     'required_interests', 'minimum_experience_level') then
      return 'unsupported_eligibility_rule';
    end if;
    v_value := p_event.eligibility -> v_key;
    if v_key = 'minimum_experience_level' then
      if pg_catalog.jsonb_typeof(v_value) <> 'string'
         or v_value #>> '{}' not in ('beginner', 'intermediate', 'advanced') then
        return 'invalid_eligibility_rule';
      end if;
    elsif pg_catalog.jsonb_typeof(v_value) <> 'array'
       or exists (select 1 from pg_catalog.jsonb_array_elements(v_value) as item(value)
                  where pg_catalog.jsonb_typeof(item.value) <> 'string') then
      return 'invalid_eligibility_rule';
    end if;
  end loop;

  if p_event.eligibility ? 'allowed_institutions'
     and not exists (
       select 1 from pg_catalog.jsonb_array_elements_text(p_event.eligibility -> 'allowed_institutions') as item(value)
       where pg_catalog.lower(item.value) = pg_catalog.lower(coalesce(p_profile.institution, ''))
     ) then return 'institution_not_eligible'; end if;

  if p_event.eligibility ? 'allowed_departments'
     and not exists (
       select 1 from pg_catalog.jsonb_array_elements_text(p_event.eligibility -> 'allowed_departments') as item(value)
       where pg_catalog.lower(item.value) = pg_catalog.lower(coalesce(p_profile.department, ''))
     ) then return 'department_not_eligible'; end if;

  if p_event.eligibility ? 'required_skills'
     and exists (
       select 1 from pg_catalog.jsonb_array_elements_text(p_event.eligibility -> 'required_skills') as required(value)
       where not exists (
         select 1 from pg_catalog.unnest(p_profile.skills) as actual(value)
         where pg_catalog.lower(actual.value) = pg_catalog.lower(required.value)
       )
     ) then return 'required_skills_missing'; end if;

  if p_event.eligibility ? 'required_interests'
     and exists (
       select 1 from pg_catalog.jsonb_array_elements_text(p_event.eligibility -> 'required_interests') as required(value)
       where not exists (
         select 1 from pg_catalog.unnest(p_profile.interests) as actual(value)
         where pg_catalog.lower(actual.value) = pg_catalog.lower(required.value)
       )
     ) then return 'required_interests_missing'; end if;

  if p_event.eligibility ? 'minimum_experience_level' then
    v_level := case p_profile.experience_level
      when 'beginner'::public.experience_level then 1
      when 'intermediate'::public.experience_level then 2
      when 'advanced'::public.experience_level then 3
      else 0 end;
    v_required := case p_event.eligibility ->> 'minimum_experience_level'
      when 'beginner' then 1 when 'intermediate' then 2 when 'advanced' then 3 else 4 end;
    if v_level < v_required then return 'experience_not_eligible'; end if;
  end if;
  return null;
end;
$$;

create function private.individual_schedule_conflict(
  p_event public.events,
  p_participant_id uuid
) returns boolean
language sql stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.registrations r
    join public.events other_event on other_event.id = r.event_id
    join public.fests other_fest on other_fest.id = other_event.fest_id
    where r.participant_id = p_participant_id
      and r.status = 'confirmed'::public.registration_status
      and other_event.id <> p_event.id
      and other_event.status = 'published'::public.publication_status
      and other_event.operational_status = 'scheduled'::public.operational_status
      and other_fest.status = 'published'::public.publication_status
      and other_fest.operational_status = 'scheduled'::public.operational_status
      and (p_event.blocks_schedule_conflicts or other_event.blocks_schedule_conflicts)
      and other_event.starts_at < p_event.ends_at
      and other_event.ends_at > p_event.starts_at
  );
$$;

-- Called only by the event-locked registration/cancellation implementations.
-- Skip candidates who no longer satisfy eligibility, rules, or the conflict
-- policy; never silently cancel their waitlist entry. Eligible candidates keep
-- FIFO order by the durable waitlist ticket.
create function private.promote_individual_waitlist_locked(
  p_event public.events,
  p_fest public.fests
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_deadline timestamptz;
  v_candidate public.registrations;
  v_profile public.profiles;
  v_confirmed integer;
begin
  v_deadline := least(
    coalesce(p_event.registration_closes_at, p_fest.registration_closes_at, p_event.starts_at),
    p_event.starts_at
  );
  if pg_catalog.clock_timestamp() >= v_deadline
     or p_event.status <> 'published'::public.publication_status
     or p_fest.status <> 'published'::public.publication_status
     or p_event.operational_status <> 'scheduled'::public.operational_status
     or p_fest.operational_status <> 'scheduled'::public.operational_status then
    return null;
  end if;

  select count(*) into v_confirmed from public.registrations
  where event_id = p_event.id and status = 'confirmed'::public.registration_status;
  if v_confirmed >= p_event.capacity then return null; end if;

  for v_candidate in
    select * from public.registrations
    where event_id = p_event.id and status = 'waitlisted'::public.registration_status
    order by waitlist_position, registered_at, id
    for update
  loop
    select * into v_profile from public.profiles
    where id = v_candidate.participant_id for update;
    if not found then continue; end if;
    if private.individual_eligibility_error(p_event, v_profile) is not null
       or v_candidate.rules_accepted_hash is distinct from pg_catalog.md5(p_event.rules)
       or private.individual_schedule_conflict(p_event, v_candidate.participant_id) then
      continue;
    end if;

    update public.registrations
    set status = 'confirmed'::public.registration_status,
        waitlist_position = null,
        confirmed_at = pg_catalog.clock_timestamp()
    where id = v_candidate.id;

    insert into public.notifications
      (recipient_id, organization_id, fest_id, event_id, kind, title, body, data)
    values
      (v_candidate.participant_id, p_fest.organization_id, p_fest.id, p_event.id,
       'waitlist'::public.notification_kind,
       'Your waitlist place is confirmed',
       'A place opened in ' || p_event.title || '. Your registration is now confirmed.',
       pg_catalog.jsonb_build_object('registration_id', v_candidate.id, 'status', 'confirmed'));
    return v_candidate.id;
  end loop;
  return null;
end;
$$;

create function private.register_individual_event_impl(
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
  select count(*) into v_confirmed from public.registrations
  where event_id = p_event_id and status = 'confirmed'::public.registration_status;

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

create function private.cancel_individual_registration_impl(
  p_registration_id uuid,
  p_reason text
) returns table (
  registration_id uuid,
  status public.registration_status,
  cancelled_at timestamptz
)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_event_id uuid;
  v_event public.events;
  v_fest public.fests;
  v_registration public.registrations;
  v_was_confirmed boolean;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = 'P0001'; end if;
  if char_length(coalesce(p_reason, '')) > 500 then
    raise exception 'cancellation_reason_too_long' using errcode = 'P0001';
  end if;

  select r.event_id into v_event_id from public.registrations r
  where r.id = p_registration_id and r.participant_id = v_user;
  if not found then raise exception 'registration_not_found' using errcode = 'P0001'; end if;
  select e.* into v_event from public.events e
  where e.id = v_event_id for update of e;
  if not found or v_event.registration_mode <> 'individual'::public.event_registration_mode then
    raise exception 'registration_not_found' using errcode = 'P0001';
  end if;
  select * into v_fest from public.fests where id = v_event.fest_id;
  -- Same participant lock order as registration and waitlist promotion.
  perform 1 from public.profiles where id = v_user for update;
  select * into v_registration from public.registrations
  where id = p_registration_id and participant_id = v_user for update;
  if not found then raise exception 'registration_not_found' using errcode = 'P0001'; end if;
  if v_registration.status = 'cancelled'::public.registration_status then
    raise exception 'already_cancelled' using errcode = 'P0001';
  end if;
  if pg_catalog.clock_timestamp() >= coalesce(v_event.cancellation_closes_at, v_event.starts_at) then
    raise exception 'cancellation_closed' using errcode = 'P0001';
  end if;
  v_was_confirmed := v_registration.status = 'confirmed'::public.registration_status;
  update public.registrations
  set status = 'cancelled'::public.registration_status,
      waitlist_position = null,
      cancellation_reason = nullif(pg_catalog.btrim(p_reason), ''),
      cancelled_at = pg_catalog.clock_timestamp()
  where id = p_registration_id
  returning * into v_registration;

  if v_was_confirmed then
    perform private.promote_individual_waitlist_locked(v_event, v_fest);
  end if;
  return query select v_registration.id, v_registration.status, v_registration.cancelled_at;
end;
$$;

create function private.my_waitlist_positions_impl()
returns table (registration_id uuid, current_position bigint)
language sql security definer
set search_path = ''
as $$
  select mine.id,
         (select count(*) from public.registrations ahead
          where ahead.event_id = mine.event_id
            and ahead.status = 'waitlisted'::public.registration_status
            and ahead.waitlist_position <= mine.waitlist_position) as current_position
  from public.registrations mine
  where mine.participant_id = auth.uid()
    and mine.status = 'waitlisted'::public.registration_status;
$$;

-- Exposed wrappers run as the caller; privileged implementations live outside
-- the exposed public schema and independently check auth.uid()/ownership.
create function public.register_individual_event(p_event_id uuid, p_accept_rules boolean)
returns table (registration_id uuid, status public.registration_status,
               waitlist_position integer, registered_at timestamptz,
               cancellation_closes_at timestamptz)
language sql security invoker set search_path = ''
as $$ select * from private.register_individual_event_impl(p_event_id, p_accept_rules); $$;

create function public.cancel_individual_registration(p_registration_id uuid, p_reason text default null)
returns table (registration_id uuid, status public.registration_status, cancelled_at timestamptz)
language sql security invoker set search_path = ''
as $$ select * from private.cancel_individual_registration_impl(p_registration_id, p_reason); $$;

create function public.my_waitlist_positions()
returns table (registration_id uuid, current_position bigint)
language sql security invoker set search_path = ''
as $$ select * from private.my_waitlist_positions_impl(); $$;

revoke all on function private.individual_eligibility_error(public.events, public.profiles) from public, anon, authenticated;
revoke all on function private.individual_schedule_conflict(public.events, uuid) from public, anon, authenticated;
revoke all on function private.promote_individual_waitlist_locked(public.events, public.fests) from public, anon, authenticated;
revoke all on function private.register_individual_event_impl(uuid, boolean) from public, anon;
revoke all on function private.cancel_individual_registration_impl(uuid, text) from public, anon;
revoke all on function private.my_waitlist_positions_impl() from public, anon;
grant execute on function private.register_individual_event_impl(uuid, boolean) to authenticated;
grant execute on function private.cancel_individual_registration_impl(uuid, text) to authenticated;
grant execute on function private.my_waitlist_positions_impl() to authenticated;
revoke all on function public.register_individual_event(uuid, boolean) from public, anon;
revoke all on function public.cancel_individual_registration(uuid, text) from public, anon;
revoke all on function public.my_waitlist_positions() from public, anon;
grant execute on function public.register_individual_event(uuid, boolean) to authenticated;
grant execute on function public.cancel_individual_registration(uuid, text) to authenticated;
grant execute on function public.my_waitlist_positions() to authenticated;

commit;
