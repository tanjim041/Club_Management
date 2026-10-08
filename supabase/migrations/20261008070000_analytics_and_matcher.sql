begin;

-- One club-scoped snapshot keeps cards, charts, roster and exports consistent.
-- The date range selects events by local calendar date of starts_at (UTC).
create function public.organizer_analytics(
  p_organization_id uuid, p_fest_id uuid default null, p_event_id uuid default null,
  p_from date default null, p_to date default null
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.current_user_is_organizer(p_organization_id) then
    raise exception 'organizer_not_authorized' using errcode = 'P0001';
  end if;
  if p_from is not null and p_to is not null and p_from > p_to then
    raise exception 'invalid_date_range' using errcode = 'P0001';
  end if;
  if p_fest_id is not null and not exists (
    select 1 from public.fests where id = p_fest_id and organization_id = p_organization_id
  ) then raise exception 'fest_out_of_scope' using errcode = 'P0001'; end if;
  if p_event_id is not null and not exists (
    select 1 from public.events e join public.fests f on f.id = e.fest_id
    where e.id = p_event_id and f.organization_id = p_organization_id
      and (p_fest_id is null or f.id = p_fest_id)
  ) then raise exception 'event_out_of_scope' using errcode = 'P0001'; end if;

  with scoped_events as materialized (
    select e.id, e.fest_id, e.title, f.title as fest_title, e.starts_at, e.ends_at,
      e.status, e.operational_status, e.registration_mode, e.capacity
    from public.events e join public.fests f on f.id = e.fest_id
    where f.organization_id = p_organization_id
      and (p_fest_id is null or f.id = p_fest_id)
      and (p_event_id is null or e.id = p_event_id)
      and (p_from is null or (e.starts_at at time zone 'UTC')::date >= p_from)
      and (p_to is null or (e.starts_at at time zone 'UTC')::date <= p_to)
  ), scoped_reg as materialized (
    select r.id, r.event_id, r.participant_id, r.team_id, r.status, r.registered_at
    from public.registrations r join scoped_events e on e.id = r.event_id
  ), confirmed_people as materialized (
    select r.id as registration_id, r.participant_id as user_id
    from scoped_reg r where r.status = 'confirmed'::public.registration_status and r.team_id is null
    union all
    select r.id, s.user_id from scoped_reg r
    join public.team_roster_snapshots s on s.registration_id = r.id
    where r.status = 'confirmed'::public.registration_status and r.team_id is not null
  ), scans as materialized (
    select p.registration_id, p.user_id, a.checked_in_at
    from public.event_pass_attendance a
    join public.event_passes p on p.id = a.pass_id
    join confirmed_people cp on cp.registration_id = p.registration_id and cp.user_id = p.user_id
    where p.revoked_at is null
  ), event_counts as materialized (
    select e.id, e.fest_id, e.title, e.fest_title, e.starts_at, e.registration_mode,
      e.capacity, e.status, e.operational_status,
      (select count(*) from scoped_reg r where r.event_id = e.id and r.status = 'confirmed'::public.registration_status) as confirmed_entries,
      (select count(*) from scoped_reg r where r.event_id = e.id and r.status = 'waitlisted'::public.registration_status) as waitlist_entries,
      (select count(*) from confirmed_people cp join scoped_reg r on r.id = cp.registration_id where r.event_id = e.id) as confirmed_people,
      (select count(*) from scans s join scoped_reg r on r.id = s.registration_id where r.event_id = e.id) as checked_in_people
    from scoped_events e
  ), roster as materialized (
    select r.id as registration_id, r.event_id, r.status, r.registered_at,
      r.participant_id as user_id, coalesce(pr.full_name, 'Participant') as full_name,
      pr.email, null::text as team_name, a.checked_in_at
    from scoped_reg r join public.profiles pr on pr.id = r.participant_id
    left join scans a on a.registration_id = r.id and a.user_id = r.participant_id
    where r.team_id is null
    union all
    select r.id, r.event_id, r.status, r.registered_at, s.user_id,
      s.full_name, s.email, t.name, a.checked_in_at
    from scoped_reg r join public.team_roster_snapshots s on s.registration_id = r.id
    join public.event_teams t on t.id = r.team_id
    left join scans a on a.registration_id = r.id and a.user_id = s.user_id
    where r.team_id is not null
  )
  select pg_catalog.jsonb_build_object(
    'metrics', pg_catalog.jsonb_build_object(
      'confirmedEntries', (select count(*) from scoped_reg where status = 'confirmed'::public.registration_status),
      'uniqueConfirmedParticipants', (select count(distinct user_id) from confirmed_people),
      'confirmedRegisteredPeople', (select count(*) from confirmed_people),
      'waitlistEntries', (select count(*) from scoped_reg where status = 'waitlisted'::public.registration_status),
      'activeEvents', (select count(*) from scoped_events where status = 'published'::public.publication_status
        and operational_status = 'scheduled'::public.operational_status and ends_at > now()),
      'checkedInPeople', (select count(*) from scans),
      'attendanceRate', (select case when count(*) = 0 then 0 else
        round(100.0 * (select count(*) from scans) / count(*), 1) end from confirmed_people)
    ),
    'statusDistribution', (select pg_catalog.jsonb_build_object(
      'confirmed', count(*) filter (where status = 'confirmed'::public.registration_status),
      'waitlisted', count(*) filter (where status = 'waitlisted'::public.registration_status),
      'cancelled', count(*) filter (where status = 'cancelled'::public.registration_status)
    ) from scoped_reg),
    'growth', (select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'day', day, 'registrations', total) order by day), '[]'::jsonb)
      from (select (registered_at at time zone 'UTC')::date as day, count(*) as total
        from scoped_reg group by 1) g),
    'events', (select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id', id, 'festId', fest_id, 'title', title, 'festTitle', fest_title,
      'startsAt', starts_at, 'status', status, 'capacityUnit',
      case when registration_mode = 'team'::public.event_registration_mode then 'teams' else 'people' end,
      'capacity', capacity, 'confirmedEntries', confirmed_entries,
      'waitlistEntries', waitlist_entries, 'confirmedPeople', confirmed_people,
      'checkedInPeople', checked_in_people,
      'capacityUsage', round(100.0 * confirmed_entries / capacity, 1)
    ) order by starts_at, id), '[]'::jsonb) from event_counts),
    'participants', (select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'registrationId', roster.registration_id, 'eventId', roster.event_id,
      'eventTitle', e.title, 'userId', roster.user_id, 'name', roster.full_name,
      'email', roster.email, 'teamName', roster.team_name,
      'status', roster.status, 'registeredAt', roster.registered_at,
      'checkedInAt', roster.checked_in_at
    ) order by roster.registered_at desc, roster.registration_id, roster.user_id), '[]'::jsonb)
      from roster join scoped_events e on e.id = roster.event_id)
  ) into v_result;
  return v_result;
end; $$;

-- Deterministic, authorized facts for recommendations; AI cannot override them.
create function public.my_event_match_facts()
returns table(event_id uuid, eligibility_error text, conflict_titles text[],
  has_blocking_conflict boolean, already_registered boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = 'P0001'; end if;
  select * into v_profile from public.profiles where id = auth.uid();
  if not found then raise exception 'profile_not_found' using errcode = 'P0001'; end if;
  return query
    select e.id, private.individual_eligibility_error(e, v_profile),
      coalesce((select array_agg(c.other_title order by c.other_starts_at, c.other_event_id)
        from private.event_conflicts(e.id, auth.uid()) c), array[]::text[]),
      exists(select 1 from private.event_conflicts(e.id, auth.uid()) c where c.blocks_conflict),
      exists(select 1 from public.registrations r where r.event_id = e.id
        and r.status in ('confirmed'::public.registration_status, 'waitlisted'::public.registration_status)
        and (r.participant_id = auth.uid() or exists(
          select 1 from public.team_roster_snapshots s where s.registration_id = r.id and s.user_id = auth.uid())))
    from public.events e join public.fests f on f.id = e.fest_id
    join public.organizations o on o.id = f.organization_id
    where e.status = 'published'::public.publication_status
      and e.operational_status = 'scheduled'::public.operational_status
      and f.status = 'published'::public.publication_status
      and f.operational_status = 'scheduled'::public.operational_status
      and o.is_active and o.is_public_profile and e.ends_at > now()
    order by e.starts_at, e.id;
end; $$;

revoke all on function public.organizer_analytics(uuid, uuid, uuid, date, date),
  public.my_event_match_facts() from public, anon;
grant execute on function public.organizer_analytics(uuid, uuid, uuid, date, date),
  public.my_event_match_facts() to authenticated, service_role;
commit;
