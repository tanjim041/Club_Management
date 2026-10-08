-- Opaque per-person passes and atomic, scoped check-in. Existing attendance is retained.
begin;

create table public.event_passes (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  token text not null default pg_catalog.encode(extensions.gen_random_bytes(32), 'hex'),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (registration_id, user_id),
  unique (token),
  constraint event_pass_token_format check (token ~ '^[0-9a-f]{64}$')
);
create index event_passes_user_idx on public.event_passes(user_id, created_at desc);
create index event_passes_registration_idx on public.event_passes(registration_id);

create table public.event_pass_attendance (
  pass_id uuid primary key references public.event_passes(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index event_pass_attendance_staff_idx on public.event_pass_attendance(checked_in_by, checked_in_at desc);

alter table public.event_passes enable row level security;
alter table public.event_pass_attendance enable row level security;
revoke all on public.event_passes, public.event_pass_attendance from public, anon, authenticated;
grant all on public.event_passes, public.event_pass_attendance to service_role;

-- The registration trigger handles individuals; the snapshot trigger handles teams.
create function private.issue_individual_event_pass()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'confirmed'::public.registration_status and new.team_id is null then
    insert into public.event_passes(registration_id, user_id)
    values (new.id, new.participant_id) on conflict (registration_id, user_id) do nothing;
  end if;
  return new;
end; $$;
create trigger issue_individual_event_pass_on_confirmation
  after insert or update of status on public.registrations
  for each row execute function private.issue_individual_event_pass();

create function private.issue_team_event_pass()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.registrations r
    where r.id = new.registration_id and r.status = 'confirmed'::public.registration_status
      and r.team_id is not null) then
    insert into public.event_passes(registration_id, user_id)
    values (new.registration_id, new.user_id) on conflict (registration_id, user_id) do nothing;
  end if;
  return new;
end; $$;
create trigger issue_team_event_pass_on_snapshot
  after insert on public.team_roster_snapshots
  for each row execute function private.issue_team_event_pass();

create function private.issue_promoted_team_passes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'confirmed'::public.registration_status and new.team_id is not null
     and old.status is distinct from new.status then
    insert into public.event_passes(registration_id, user_id)
    select new.id, s.user_id from public.team_roster_snapshots s
    where s.registration_id = new.id
    on conflict (registration_id, user_id) do nothing;
  end if;
  return new;
end; $$;
create trigger issue_promoted_team_passes_on_confirmation
  after update of status on public.registrations
  for each row execute function private.issue_promoted_team_passes();

-- Backfill only missing passes for registrations that are currently confirmed.
insert into public.event_passes(registration_id, user_id)
select r.id, r.participant_id from public.registrations r
where r.status = 'confirmed'::public.registration_status and r.team_id is null
on conflict (registration_id, user_id) do nothing;
insert into public.event_passes(registration_id, user_id)
select r.id, s.user_id from public.registrations r
join public.team_roster_snapshots s on s.registration_id = r.id
where r.status = 'confirmed'::public.registration_status and r.team_id is not null
on conflict (registration_id, user_id) do nothing;

create function public.my_digital_passes()
returns table(pass_id uuid, registration_id uuid, event_id uuid, participant_name text,
  fest_title text, event_title text, team_name text, registration_status public.registration_status,
  token text, revoked_at timestamptz, checked_in_at timestamptz, starts_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = 'P0001'; end if;
  return query
    select p.id, r.id, e.id, coalesce(pr.full_name, 'Participant'), f.title, e.title,
      t.name, r.status, p.token, p.revoked_at, a.checked_in_at, e.starts_at
    from public.event_passes p
    join public.registrations r on r.id = p.registration_id
    join public.events e on e.id = r.event_id
    join public.fests f on f.id = e.fest_id
    join public.profiles pr on pr.id = p.user_id
    left join public.event_teams t on t.id = r.team_id
    left join public.event_pass_attendance a on a.pass_id = p.id
    where p.user_id = auth.uid() and r.status = 'confirmed'::public.registration_status
      and (r.team_id is null and r.participant_id = auth.uid()
        or r.team_id is not null and exists (select 1 from public.team_roster_snapshots s
          where s.registration_id = r.id and s.user_id = auth.uid()))
    order by e.starts_at, p.id;
end; $$;

-- Manual fallback uses the registration UUID printed on the pass. It never returns QR secrets.
create function public.staff_lookup_event_passes(p_event_id uuid, p_registration_id uuid)
returns table(pass_id uuid, participant_name text, team_name text,
  registration_status public.registration_status, revoked_at timestamptz, checked_in_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = 'P0001'; end if;
  if not public.current_user_can_operate_event(p_event_id) then
    raise exception 'staff_not_authorized' using errcode = 'P0001';
  end if;
  return query
    select p.id, coalesce(pr.full_name, 'Participant'), t.name, r.status,
      p.revoked_at, a.checked_in_at
    from public.event_passes p
    join public.registrations r on r.id = p.registration_id
    join public.profiles pr on pr.id = p.user_id
    left join public.event_teams t on t.id = r.team_id
    left join public.event_pass_attendance a on a.pass_id = p.id
    where r.id = p_registration_id and r.event_id = p_event_id
    order by pr.full_name, p.id;
end; $$;

create function public.check_in_event_pass(p_event_id uuid, p_token text default null, p_pass_id uuid default null)
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

create function public.event_check_in_metrics(p_event_id uuid)
returns table(confirmed_people bigint, checked_in_people bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.current_user_can_operate_event(p_event_id) then
    raise exception 'staff_not_authorized' using errcode = 'P0001';
  end if;
  return query select count(*) filter (where p.revoked_at is null),
    count(*) filter (where p.revoked_at is null and a.pass_id is not null)
  from public.event_passes p
  join public.registrations r on r.id = p.registration_id
  left join public.event_pass_attendance a on a.pass_id = p.id
  where r.event_id = p_event_id and r.status = 'confirmed'::public.registration_status;
end; $$;

create function public.revoke_event_pass(p_pass_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_event_id uuid; v_org_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = 'P0001'; end if;
  select e.id, f.organization_id into v_event_id, v_org_id
    from public.event_passes p join public.registrations r on r.id = p.registration_id
    join public.events e on e.id = r.event_id join public.fests f on f.id = e.fest_id
    where p.id = p_pass_id;
  if v_event_id is null or not public.current_user_is_organizer(v_org_id) then
    raise exception 'organizer_not_authorized' using errcode = 'P0001';
  end if;
  update public.event_passes set revoked_at = now(), revoked_by = auth.uid()
    where id = p_pass_id and revoked_at is null;
end; $$;

revoke all on function public.my_digital_passes(),
  public.staff_lookup_event_passes(uuid, uuid),
  public.check_in_event_pass(uuid, text, uuid),
  public.event_check_in_metrics(uuid), public.revoke_event_pass(uuid) from public, anon;
grant execute on function public.my_digital_passes(),
  public.staff_lookup_event_passes(uuid, uuid),
  public.check_in_event_pass(uuid, text, uuid),
  public.event_check_in_metrics(uuid), public.revoke_event_pass(uuid) to authenticated, service_role;

commit;
