-- Resolve PL/pgSQL output-column ambiguity in the idempotent insert.
create or replace function public.check_in_event_pass(p_event_id uuid, p_token text default null, p_pass_id uuid default null)
returns table(result text, pass_id uuid, participant_name text, team_name text,
  registration_id uuid, checked_in_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_pass public.event_passes; v_registration public.registrations;
  v_event public.events; v_attendance public.event_pass_attendance; v_inserted boolean := false;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = 'P0001'; end if;
  if not public.current_user_can_operate_event(p_event_id) then
    raise exception 'staff_not_authorized' using errcode = 'P0001';
  end if;
  if (p_token is null) = (p_pass_id is null) then
    raise exception 'provide_one_pass_identifier' using errcode = 'P0001';
  end if;
  if p_token is not null and p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_pass' using errcode = 'P0001';
  end if;
  select * into v_pass from public.event_passes p
    where (p_token is not null and p.token = p_token)
       or (p_pass_id is not null and p.id = p_pass_id)
    for update;
  if not found then raise exception 'invalid_pass' using errcode = 'P0001'; end if;
  select * into v_registration from public.registrations r where r.id = v_pass.registration_id;
  if v_registration.event_id <> p_event_id then
    raise exception 'wrong_event' using errcode = 'P0001';
  end if;
  select * into v_event from public.events e where e.id = p_event_id;
  if v_event.status <> 'published'::public.publication_status
     or v_event.operational_status <> 'scheduled'::public.operational_status then
    raise exception 'event_unavailable' using errcode = 'P0001';
  end if;
  if v_registration.status <> 'confirmed'::public.registration_status then
    raise exception 'registration_not_confirmed' using errcode = 'P0001';
  end if;
  if v_pass.revoked_at is not null then
    raise exception 'pass_revoked' using errcode = 'P0001';
  end if;
  if not (v_registration.team_id is null and v_registration.participant_id = v_pass.user_id
    or v_registration.team_id is not null and exists (
      select 1 from public.team_roster_snapshots s
      where s.registration_id = v_registration.id and s.user_id = v_pass.user_id)) then
    raise exception 'invalid_pass_holder' using errcode = 'P0001';
  end if;
  insert into public.event_pass_attendance(pass_id, checked_in_by)
    values (v_pass.id, auth.uid()) on conflict on constraint event_pass_attendance_pkey do nothing
    returning true into v_inserted;
  select * into v_attendance from public.event_pass_attendance a where a.pass_id = v_pass.id;
  return query select
    case when coalesce(v_inserted, false) then 'checked_in'::text else 'already_checked_in'::text end,
    v_pass.id, coalesce(pr.full_name, 'Participant'), t.name,
    v_registration.id, v_attendance.checked_in_at
    from public.profiles pr
    left join public.event_teams t on t.id = v_registration.team_id
    where pr.id = v_pass.user_id;
end; $$;
