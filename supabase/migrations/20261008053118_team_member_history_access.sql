-- Let submitted team members view their own immutable registration history.
begin;

create function private.is_team_roster_member(p_registration_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.team_roster_snapshots
  where registration_id=p_registration_id and user_id=p_user_id); $$;
revoke all on function private.is_team_roster_member(uuid,uuid) from public,anon;
grant execute on function private.is_team_roster_member(uuid,uuid) to authenticated;

drop policy registrations_select_accepted_team_member on public.registrations;
create policy registrations_select_team_roster_member
  on public.registrations for select to authenticated
  using (team_id is not null and private.is_team_roster_member(id,(select auth.uid())));

create function public.my_team_registration_ids()
returns table(registration_id uuid)
language sql stable security definer set search_path = ''
as $$ select s.registration_id from public.team_roster_snapshots s
  where s.user_id=auth.uid(); $$;
revoke all on function public.my_team_registration_ids() from public,anon;
grant execute on function public.my_team_registration_ids() to authenticated;

create or replace function private.my_waitlist_positions_impl()
returns table(registration_id uuid,current_position bigint)
language sql security definer set search_path = ''
as $$
  select mine.id,(select count(*) from public.registrations ahead
    where ahead.event_id=mine.event_id and ahead.status='waitlisted'::public.registration_status
      and ahead.waitlist_position<=mine.waitlist_position)
  from public.registrations mine
  where mine.status='waitlisted'::public.registration_status
    and (mine.participant_id=auth.uid() or exists(select 1 from public.team_roster_snapshots s
      where s.registration_id=mine.id and s.user_id=auth.uid()));
$$;

create or replace function public.my_event_teams()
returns table(team_id uuid,event_id uuid,team_name text,team_status text,
  is_captain boolean,registration_id uuid,registration_status public.registration_status,
  event_title text,event_starts_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select t.id,t.event_id,t.name,t.status,t.captain_id=auth.uid(),r.id,r.status,e.title,e.starts_at
  from public.event_teams t
  join public.events e on e.id=t.event_id
  left join public.registrations r on r.team_id=t.id
  where exists(select 1 from public.event_team_members m
    where m.team_id=t.id and m.user_id=auth.uid() and m.status='accepted')
    or exists(select 1 from public.team_roster_snapshots s
      where s.registration_id=r.id and s.user_id=auth.uid())
  order by e.starts_at,t.created_at;
$$;

create or replace function public.event_team_detail(p_team_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_team public.event_teams; v_result jsonb;
begin
  select * into v_team from public.event_teams where id=p_team_id;
  if not found or not (
    exists(select 1 from public.event_team_members where team_id=p_team_id
      and user_id=auth.uid() and status='accepted')
    or exists(select 1 from public.registrations r join public.team_roster_snapshots s
      on s.registration_id=r.id where r.team_id=p_team_id and s.user_id=auth.uid())
  ) then return null; end if;
  select pg_catalog.jsonb_build_object(
    'id',t.id,'event_id',t.event_id,'name',t.name,'status',t.status,
    'captain_id',t.captain_id,'event_title',e.title,
    'team_min_size',e.team_min_size,'team_max_size',e.team_max_size,
    'registration_id',r.id,'registration_status',r.status,
    'members',case when r.id is not null then coalesce((select pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object('user_id',s.user_id,'full_name',s.full_name,
      'is_captain',s.is_captain,'rules_current',s.rules_accepted_hash=pg_catalog.md5(e.rules),
      'conflict_acknowledged_at',m.conflict_acknowledged_at) order by s.is_captain desc,s.accepted_at)
      from public.team_roster_snapshots s left join public.event_team_members m
      on m.team_id=t.id and m.user_id=s.user_id where s.registration_id=r.id),'[]'::jsonb)
      else coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'user_id',m.user_id,'full_name',p.full_name,'is_captain',m.is_captain,
        'rules_current',m.rules_accepted_hash=pg_catalog.md5(e.rules),
        'conflict_acknowledged_at',m.conflict_acknowledged_at) order by m.is_captain desc,m.joined_at)
        from public.event_team_members m join public.profiles p on p.id=m.user_id
        where m.team_id=t.id and m.status='accepted'),'[]'::jsonb) end,
    'invitations',case when t.captain_id=auth.uid() then coalesce((select pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object('id',i.id,'email',i.intended_email,
      'status',case when i.status='pending' and i.expires_at<=clock_timestamp() then 'expired' else i.status end,
      'expires_at',i.expires_at) order by i.created_at)
      from public.event_team_invitations i where i.team_id=t.id),'[]'::jsonb) else '[]'::jsonb end)
  into v_result from public.event_teams t join public.events e on e.id=t.event_id
  left join public.registrations r on r.team_id=t.id where t.id=p_team_id;
  return v_result;
end;
$$;

commit;
