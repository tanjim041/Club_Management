-- Do not suggest events people already joined or cannot enter.
begin;

create or replace function public.event_schedule_alternatives(p_event_id uuid,p_team_id uuid default null)
returns table(event_id uuid,event_title text,starts_at timestamptz,ends_at timestamptz,
  club_slug text,fest_slug text,event_slug text)
language plpgsql stable security definer set search_path = ''
as $$
declare v_target public.events;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='P0001'; end if;
  select e.* into v_target from public.events e
  join public.fests f on f.id=e.fest_id
  join public.organizations o on o.id=f.organization_id
  where e.id=p_event_id and e.status='published'::public.publication_status
    and f.status='published'::public.publication_status and o.is_active and o.is_public_profile;
  if not found then return; end if;
  if p_team_id is not null and not exists(select 1 from public.event_teams t
    join public.event_team_members m on m.team_id=t.id
    where t.id=p_team_id and t.event_id=p_event_id and m.user_id=auth.uid()
      and m.status='accepted') then
    raise exception 'team_not_found' using errcode='P0001'; end if;
  return query select e.id,e.title,e.starts_at,e.ends_at,o.slug,f.slug,e.slug
  from public.events e join public.fests f on f.id=e.fest_id
  join public.organizations o on o.id=f.organization_id
  cross join lateral (select count(*)::integer as units from public.registrations r
    where r.event_id=e.id and r.status='confirmed'::public.registration_status) occupied
  where e.id<>p_event_id and e.fest_id=v_target.fest_id
    and e.registration_mode=v_target.registration_mode
    and e.status='published'::public.publication_status
    and e.operational_status='scheduled'::public.operational_status
    and f.operational_status='scheduled'::public.operational_status
    and o.is_active and o.is_public_profile
    and e.starts_at>clock_timestamp() and f.ends_at>clock_timestamp()
    and (coalesce(e.registration_opens_at,f.registration_opens_at) is null
      or clock_timestamp()>=coalesce(e.registration_opens_at,f.registration_opens_at))
    and clock_timestamp()<least(coalesce(e.registration_closes_at,f.registration_closes_at,e.starts_at),e.starts_at)
    and (occupied.units<e.capacity or e.waitlist_enabled)
    and (p_team_id is null or (select count(*) from public.event_team_members m
      where m.team_id=p_team_id and m.status='accepted') between e.team_min_size and e.team_max_size)
    and not exists(
      select 1 from
        (select auth.uid() as user_id where p_team_id is null
         union all
         select m.user_id from public.event_team_members m
         where p_team_id is not null and m.team_id=p_team_id and m.status='accepted') people
      join public.profiles person on person.id=people.user_id
      where private.individual_eligibility_error(e,person) is not null
        or exists(select 1 from private.event_conflicts(e.id,people.user_id))
        or exists(select 1 from public.registrations r
          where r.event_id=e.id and r.status in
            ('confirmed'::public.registration_status,'waitlisted'::public.registration_status)
            and (r.participant_id=people.user_id or exists(
              select 1 from public.team_roster_snapshots s
              where s.registration_id=r.id and s.user_id=people.user_id)))
    )
  order by e.starts_at limit 3;
end;
$$;

commit;
