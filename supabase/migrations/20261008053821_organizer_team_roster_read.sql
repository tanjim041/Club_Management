-- Expose submitted roster snapshots only to organizers of the owning club.
begin;

create function public.organizer_team_rosters(p_organization_id uuid)
returns table(registration_id uuid,user_id uuid,full_name text,email text,is_captain boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.current_user_is_organizer(p_organization_id) then
    raise exception 'organization_access_denied' using errcode='P0001'; end if;
  return query select s.registration_id,s.user_id,s.full_name,s.email,s.is_captain
    from public.team_roster_snapshots s
    join public.registrations r on r.id=s.registration_id
    join public.events e on e.id=r.event_id
    join public.fests f on f.id=e.fest_id
    where f.organization_id=p_organization_id
    order by s.registration_id,s.is_captain desc,s.accepted_at;
end;
$$;
revoke all on function public.organizer_team_rosters(uuid) from public,anon;
grant execute on function public.organizer_team_rosters(uuid) to authenticated;

commit;
