-- Team consent, immutable submitted rosters, and server-enforced schedule policy.
begin;

alter table public.registrations add column team_id uuid;
alter table public.registrations add column conflict_ack_hash text;

create table public.event_teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  captain_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 100),
  status text not null default 'draft' check (status in ('draft','submitted','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, event_id)
);
create index event_teams_captain_idx on public.event_teams (captain_id, created_at desc);
create index event_teams_event_idx on public.event_teams (event_id, status);
alter table public.registrations add constraint registrations_team_fk foreign key (team_id, event_id)
  references public.event_teams(id, event_id);
create unique index registrations_one_team_submission_idx on public.registrations(team_id) where team_id is not null;

create table public.event_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  event_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_captain boolean not null default false,
  status text not null default 'accepted' check (status in ('accepted','withdrawn')),
  rules_accepted_hash text not null,
  rules_accepted_at timestamptz not null default now(),
  conflict_ack_hash text,
  conflict_acknowledged_at timestamptz,
  joined_at timestamptz not null default now(),
  foreign key (team_id, event_id) references public.event_teams(id, event_id) on delete cascade,
  unique (team_id, user_id)
);
create unique index event_team_members_one_active_team_idx
  on public.event_team_members(event_id, user_id) where status = 'accepted';
create index event_team_members_user_idx on public.event_team_members(user_id, status);

create table public.event_team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.event_teams(id) on delete cascade,
  intended_email text not null,
  intended_user_id uuid references public.profiles(id) on delete set null,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','declined','revoked')),
  expires_at timestamptz not null,
  responded_by uuid references public.profiles(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  check (char_length(intended_email) between 3 and 320),
  check (expires_at > created_at)
);
create index event_team_invitations_team_idx on public.event_team_invitations(team_id, status);
create unique index event_team_invitations_one_pending_email_idx
  on public.event_team_invitations(team_id, intended_email) where status = 'pending';

create table public.team_roster_snapshots (
  registration_id uuid not null references public.registrations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  full_name text not null,
  email text not null,
  is_captain boolean not null,
  rules_accepted_hash text not null,
  conflict_ack_hash text,
  accepted_at timestamptz not null,
  primary key (registration_id, user_id)
);
create index team_roster_snapshots_user_idx on public.team_roster_snapshots(user_id, registration_id);

alter table public.event_teams enable row level security;
alter table public.event_team_members enable row level security;
alter table public.event_team_invitations enable row level security;
alter table public.team_roster_snapshots enable row level security;
revoke all on public.event_teams, public.event_team_members,
  public.event_team_invitations, public.team_roster_snapshots from public, anon, authenticated;
grant all on public.event_teams, public.event_team_members,
  public.event_team_invitations, public.team_roster_snapshots to service_role;

-- No browser table grants: scoped SECURITY DEFINER RPCs are the only API.
create policy registrations_select_accepted_team_member
  on public.registrations for select to authenticated
  using (team_id is not null and exists (
    select 1 from public.event_team_members m
    where m.team_id = registrations.team_id
      and m.user_id = (select auth.uid()) and m.status = 'accepted'
  ));
-- The policy above needs SELECT privileges on event_team_members for its
-- subquery, so use a privileged, non-exposed helper instead.
drop policy registrations_select_accepted_team_member on public.registrations;
create function private.is_active_team_member(p_team_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.event_team_members
  where team_id = p_team_id and user_id = p_user_id and status = 'accepted'); $$;
revoke all on function private.is_active_team_member(uuid, uuid) from public, anon;
grant execute on function private.is_active_team_member(uuid, uuid) to authenticated;
create policy registrations_select_accepted_team_member
  on public.registrations for select to authenticated
  using (team_id is not null and private.is_active_team_member(team_id, (select auth.uid())));

create function private.event_conflicts(p_event_id uuid, p_user_id uuid)
returns table (other_event_id uuid, other_title text, other_starts_at timestamptz,
  other_ends_at timestamptz, overlap_starts_at timestamptz, overlap_ends_at timestamptz,
  overlap_seconds integer, blocks_conflict boolean)
language sql stable security definer set search_path = ''
as $$
  select other.id, other.title, other.starts_at, other.ends_at,
         greatest(target.starts_at, other.starts_at),
         least(target.ends_at, other.ends_at),
         extract(epoch from least(target.ends_at, other.ends_at)
           - greatest(target.starts_at, other.starts_at))::integer,
         (target.blocks_schedule_conflicts or other.blocks_schedule_conflicts)
  from public.events target
  join public.registrations r on r.status = 'confirmed'::public.registration_status
  join public.events other on other.id = r.event_id
  join public.fests f on f.id = other.fest_id
  where target.id = p_event_id and other.id <> target.id
    and other.status = 'published'::public.publication_status
    and other.operational_status = 'scheduled'::public.operational_status
    and f.status = 'published'::public.publication_status
    and f.operational_status = 'scheduled'::public.operational_status
    and (r.participant_id = p_user_id or exists (
      select 1 from public.team_roster_snapshots s
      where s.registration_id = r.id and s.user_id = p_user_id))
    and target.starts_at < other.ends_at and other.starts_at < target.ends_at
  order by other.starts_at, other.id;
$$;

create function private.conflict_fingerprint(p_event_id uuid, p_user_id uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select case when count(*) = 0 then null else pg_catalog.md5(
    pg_catalog.string_agg(other_event_id::text || '|' || other_starts_at::text ||
      '|' || other_ends_at::text || '|' || blocks_conflict::text,
      ';' order by other_event_id)) end
  from private.event_conflicts(p_event_id, p_user_id);
$$;

create function private.assert_event_open(p_event_id uuid, p_mode public.event_registration_mode)
returns public.events language plpgsql security definer set search_path = ''
as $$
declare v_event public.events; v_fest public.fests; v_open timestamptz; v_close timestamptz;
begin
  select e.* into v_event from public.events e
  join public.fests f on f.id=e.fest_id
  join public.organizations o on o.id=f.organization_id
  where e.id=p_event_id and o.is_active and o.is_public_profile
  for update of e;
  if not found then raise exception 'event_unavailable' using errcode='P0001'; end if;
  select * into v_fest from public.fests where id=v_event.fest_id;
  if v_event.registration_mode <> p_mode or v_event.status <> 'published'::public.publication_status
    or v_fest.status <> 'published'::public.publication_status
    or v_event.operational_status <> 'scheduled'::public.operational_status
    or v_fest.operational_status <> 'scheduled'::public.operational_status then
    raise exception 'event_unavailable' using errcode='P0001';
  end if;
  v_open := coalesce(v_event.registration_opens_at, v_fest.registration_opens_at);
  v_close := least(coalesce(v_event.registration_closes_at,v_fest.registration_closes_at,v_event.starts_at),v_event.starts_at);
  if v_open is not null and clock_timestamp() < v_open then
    raise exception 'registration_not_open' using errcode='P0001'; end if;
  if clock_timestamp() >= v_close or clock_timestamp() >= v_fest.ends_at then
    raise exception 'registration_closed' using errcode='P0001'; end if;
  return v_event;
end;
$$;

create function private.assert_member_eligible(p_event public.events, p_user_id uuid)
returns public.profiles language plpgsql security definer set search_path = ''
as $$
declare v_profile public.profiles; v_error text;
begin
  select * into v_profile from public.profiles where id=p_user_id for update;
  if not found then raise exception 'profile_missing' using errcode='P0001'; end if;
  v_error := private.individual_eligibility_error(p_event,v_profile);
  if v_error is not null then raise exception '%',v_error using errcode='P0001'; end if;
  return v_profile;
end;
$$;

create function private.assert_conflict_policy(p_event_id uuid, p_user_id uuid,
  p_acknowledged boolean, p_saved_fingerprint text default null)
returns text language plpgsql stable security definer set search_path = ''
as $$
declare v_fingerprint text;
begin
  if exists (select 1 from private.event_conflicts(p_event_id,p_user_id) where blocks_conflict) then
    raise exception 'schedule_conflict' using errcode='P0001'; end if;
  v_fingerprint := private.conflict_fingerprint(p_event_id,p_user_id);
  if v_fingerprint is not null and
    (not coalesce(p_acknowledged,false) or
     (p_saved_fingerprint is not null and p_saved_fingerprint is distinct from v_fingerprint)) then
    raise exception 'conflict_ack_required' using errcode='P0001'; end if;
  return v_fingerprint;
end;
$$;

revoke all on function private.event_conflicts(uuid,uuid),
  private.conflict_fingerprint(uuid,uuid),
  private.assert_event_open(uuid,public.event_registration_mode),
  private.assert_member_eligible(public.events,uuid),
  private.assert_conflict_policy(uuid,uuid,boolean,text) from public,anon,authenticated;

create function private.account_email(p_user_id uuid)
returns text language sql stable security definer set search_path = ''
as $$ select pg_catalog.lower(email) from auth.users where id=p_user_id; $$;
revoke all on function private.account_email(uuid) from public,anon,authenticated;

create function public.create_event_team(p_event_id uuid, p_name text, p_accept_rules boolean)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_event public.events; v_profile public.profiles;
  v_team uuid; v_fingerprint text;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='P0001'; end if;
  if p_accept_rules is distinct from true then raise exception 'rules_acceptance_required' using errcode='P0001'; end if;
  if char_length(btrim(coalesce(p_name,''))) not between 2 and 100 then
    raise exception 'invalid_team_name' using errcode='P0001'; end if;
  v_event := private.assert_event_open(p_event_id,'team'::public.event_registration_mode);
  v_profile := private.assert_member_eligible(v_event,v_user);
  if exists (select 1 from public.event_team_members where event_id=p_event_id and user_id=v_user and status='accepted')
    or exists (select 1 from public.registrations where event_id=p_event_id and participant_id=v_user
      and status in ('confirmed'::public.registration_status,'waitlisted'::public.registration_status)) then
    raise exception 'already_in_event_team' using errcode='P0001'; end if;
  insert into public.event_teams(event_id,captain_id,name)
  values(p_event_id,v_user,btrim(p_name)) returning id into v_team;
  insert into public.event_team_members(team_id,event_id,user_id,is_captain,rules_accepted_hash)
  values(v_team,p_event_id,v_user,true,pg_catalog.md5(v_event.rules));
  return v_team;
end;
$$;

create function public.invite_event_team_member(p_team_id uuid,p_email text,p_expiry_hours integer default 72)
returns table(invitation_id uuid, invitation_token text, expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare v_team public.event_teams; v_event public.events; v_email text;
  v_user uuid; v_token text; v_expires timestamptz; v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='P0001'; end if;
  select * into v_team from public.event_teams where id=p_team_id;
  if not found or v_team.captain_id <> auth.uid() then raise exception 'team_not_found' using errcode='P0001'; end if;
  v_event := private.assert_event_open(v_team.event_id,'team'::public.event_registration_mode);
  select * into v_team from public.event_teams where id=p_team_id for update;
  if v_team.status <> 'draft' then raise exception 'team_locked' using errcode='P0001'; end if;
  v_email := pg_catalog.lower(pg_catalog.btrim(coalesce(p_email,'')));
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(v_email)>320 then
    raise exception 'invalid_invitee_email' using errcode='P0001'; end if;
  if p_expiry_hours not between 1 and 168 then raise exception 'invalid_invitation_expiry' using errcode='P0001'; end if;
  if v_email = private.account_email(auth.uid()) then raise exception 'cannot_invite_self' using errcode='P0001'; end if;
  select id into v_user from auth.users where pg_catalog.lower(email)=v_email limit 1;
  if exists (select 1 from public.event_team_members m where m.team_id=p_team_id and m.user_id=v_user and m.status='accepted') then
    raise exception 'member_already_accepted' using errcode='P0001'; end if;
  -- Expired pending invitations are revoked before the unique-email check.
  update public.event_team_invitations i set status='revoked'
  where i.team_id=p_team_id and i.intended_email=v_email and i.status='pending' and i.expires_at<=clock_timestamp();
  if exists (select 1 from public.event_team_invitations
    where team_id=p_team_id and intended_email=v_email and status='pending') then
    raise exception 'invitation_already_pending' using errcode='P0001'; end if;
  v_token := pg_catalog.encode(extensions.gen_random_bytes(32),'hex');
  v_expires := clock_timestamp() + pg_catalog.make_interval(hours=>p_expiry_hours);
  insert into public.event_team_invitations(team_id,intended_email,intended_user_id,token_hash,expires_at)
  values(p_team_id,v_email,v_user,pg_catalog.encode(extensions.digest(v_token,'sha256'),'hex'),v_expires)
  returning id into v_id;
  return query select v_id,v_token,v_expires;
end;
$$;

create function public.respond_event_team_invitation(p_token text,p_accept boolean,p_accept_rules boolean default false)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_invitation public.event_team_invitations; v_team public.event_teams;
  v_event public.events; v_user uuid := auth.uid(); v_email text;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='P0001'; end if;
  if p_token !~ '^[0-9a-f]{64}$' then raise exception 'invitation_invalid' using errcode='P0001'; end if;
  select * into v_invitation from public.event_team_invitations
  where token_hash=pg_catalog.encode(extensions.digest(p_token,'sha256'),'hex');
  if not found then raise exception 'invitation_invalid' using errcode='P0001'; end if;
  select * into v_team from public.event_teams where id=v_invitation.team_id;
  if not found then raise exception 'invitation_invalid' using errcode='P0001'; end if;
  select * into v_event from public.events where id=v_team.event_id for update;
  select * into v_team from public.event_teams where id=v_team.id for update;
  select * into v_invitation from public.event_team_invitations where id=v_invitation.id for update;
  if v_team.status <> 'draft' or v_invitation.status <> 'pending'
    or v_invitation.expires_at <= clock_timestamp() then
    raise exception 'invitation_unavailable' using errcode='P0001'; end if;
  v_email := private.account_email(v_user);
  if v_email is distinct from v_invitation.intended_email
    or (v_invitation.intended_user_id is not null and v_invitation.intended_user_id<>v_user) then
    raise exception 'invitation_not_for_account' using errcode='P0001'; end if;
  if p_accept is distinct from true then
    update public.event_team_invitations set status='declined',responded_by=v_user,
      responded_at=clock_timestamp() where id=v_invitation.id;
    return v_team.id;
  end if;
  v_event := private.assert_event_open(v_team.event_id,'team'::public.event_registration_mode);
  if p_accept_rules is distinct from true then raise exception 'rules_acceptance_required' using errcode='P0001'; end if;
  perform private.assert_member_eligible(v_event,v_user);
  if exists (select 1 from public.event_team_members where event_id=v_team.event_id
    and user_id=v_user and status='accepted')
    or exists (select 1 from public.registrations where event_id=v_team.event_id and participant_id=v_user
      and status in ('confirmed'::public.registration_status,'waitlisted'::public.registration_status)) then
    raise exception 'already_in_event_team' using errcode='P0001'; end if;
  insert into public.event_team_members(team_id,event_id,user_id,rules_accepted_hash)
  values(v_team.id,v_team.event_id,v_user,pg_catalog.md5(v_event.rules))
  on conflict (team_id,user_id) do update set status='accepted',
    rules_accepted_hash=excluded.rules_accepted_hash,
    rules_accepted_at=clock_timestamp(),joined_at=clock_timestamp(),
    conflict_ack_hash=null,conflict_acknowledged_at=null;
  update public.event_team_invitations set status='accepted',responded_by=v_user,
    responded_at=clock_timestamp() where id=v_invitation.id;
  return v_team.id;
end;
$$;

create function public.revoke_event_team_invitation(p_invitation_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_team public.event_teams; v_invitation public.event_team_invitations;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='P0001'; end if;
  select * into v_invitation from public.event_team_invitations where id=p_invitation_id;
  if not found then raise exception 'invitation_not_found' using errcode='P0001'; end if;
  select * into v_team from public.event_teams where id=v_invitation.team_id;
  if not found or v_team.captain_id<>auth.uid() then raise exception 'invitation_not_found' using errcode='P0001'; end if;
  perform 1 from public.events where id=v_team.event_id for update;
  select * into v_team from public.event_teams where id=v_team.id for update;
  if v_team.status<>'draft' then raise exception 'team_locked' using errcode='P0001'; end if;
  update public.event_team_invitations set status='revoked'
  where id=p_invitation_id and status='pending';
end;
$$;

create function public.leave_draft_event_team(p_team_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_team public.event_teams;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='P0001'; end if;
  select * into v_team from public.event_teams where id=p_team_id;
  if not found or v_team.captain_id=auth.uid() then raise exception 'team_not_found' using errcode='P0001'; end if;
  perform 1 from public.events where id=v_team.event_id for update;
  select * into v_team from public.event_teams where id=p_team_id for update;
  if v_team.status<>'draft' then raise exception 'team_locked' using errcode='P0001'; end if;
  update public.event_team_members set status='withdrawn' where team_id=p_team_id
    and user_id=auth.uid() and status='accepted';
  if not found then raise exception 'team_not_found' using errcode='P0001'; end if;
end;
$$;

create function public.acknowledge_event_team_conflicts(p_team_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_team public.event_teams; v_fingerprint text;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='P0001'; end if;
  select * into v_team from public.event_teams where id=p_team_id;
  if not found then raise exception 'team_not_found' using errcode='P0001'; end if;
  perform 1 from public.events where id=v_team.event_id for update;
  select * into v_team from public.event_teams where id=p_team_id for update;
  if v_team.status<>'draft' and not (v_team.status='submitted' and exists(
    select 1 from public.registrations r where r.team_id=p_team_id
      and r.status='waitlisted'::public.registration_status)) then
    raise exception 'team_locked' using errcode='P0001'; end if;
  if not exists(select 1 from public.event_team_members where team_id=p_team_id
    and user_id=auth.uid() and status='accepted') then raise exception 'team_not_found' using errcode='P0001'; end if;
  v_fingerprint := private.assert_conflict_policy(v_team.event_id,auth.uid(),true);
  update public.event_team_members set conflict_ack_hash=v_fingerprint,
    conflict_acknowledged_at=clock_timestamp()
  where team_id=p_team_id and user_id=auth.uid();
  return v_fingerprint;
end;
$$;

create function public.my_event_teams()
returns table(team_id uuid,event_id uuid,team_name text,team_status text,
  is_captain boolean,registration_id uuid,registration_status public.registration_status,
  event_title text,event_starts_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select t.id,t.event_id,t.name,t.status,m.is_captain,r.id,r.status,e.title,e.starts_at
  from public.event_team_members m
  join public.event_teams t on t.id=m.team_id
  join public.events e on e.id=t.event_id
  left join public.registrations r on r.team_id=t.id
  where m.user_id=auth.uid() and m.status='accepted'
  order by e.starts_at,t.created_at;
$$;

create function public.event_team_detail(p_team_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_team public.event_teams; v_result jsonb;
begin
  select * into v_team from public.event_teams where id=p_team_id;
  if not found or not exists(select 1 from public.event_team_members
    where team_id=p_team_id and user_id=auth.uid() and status='accepted') then
    return null; end if;
  select pg_catalog.jsonb_build_object(
    'id',t.id,'event_id',t.event_id,'name',t.name,'status',t.status,
    'captain_id',t.captain_id,'event_title',e.title,
    'team_min_size',e.team_min_size,'team_max_size',e.team_max_size,
    'registration_id',r.id,'registration_status',r.status,
    'members',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'user_id',m.user_id,'full_name',p.full_name,'is_captain',m.is_captain,
      'rules_current',m.rules_accepted_hash=pg_catalog.md5(e.rules),
      'conflict_acknowledged_at',m.conflict_acknowledged_at) order by m.is_captain desc,m.joined_at)
      from public.event_team_members m join public.profiles p on p.id=m.user_id
      where m.team_id=t.id and m.status='accepted'),'[]'::jsonb),
    'invitations',case when t.captain_id=auth.uid() then coalesce((select pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object('id',i.id,'email',i.intended_email,
      'status',case when i.status='pending' and i.expires_at<=clock_timestamp() then 'expired' else i.status end,
      'expires_at',i.expires_at) order by i.created_at)
      from public.event_team_invitations i where i.team_id=t.id),'[]'::jsonb) else '[]'::jsonb end)
  into v_result
  from public.event_teams t join public.events e on e.id=t.event_id
  left join public.registrations r on r.team_id=t.id
  where t.id=p_team_id;
  return v_result;
end;
$$;

create function public.preview_event_team_invitation(p_token text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_invitation public.event_team_invitations; v_team public.event_teams;
begin
  if auth.uid() is null or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select * into v_invitation from public.event_team_invitations
  where token_hash=pg_catalog.encode(extensions.digest(p_token,'sha256'),'hex');
  if not found or v_invitation.intended_email is distinct from private.account_email(auth.uid())
    or (v_invitation.intended_user_id is not null and v_invitation.intended_user_id<>auth.uid()) then
    return null; end if;
  select * into v_team from public.event_teams where id=v_invitation.team_id;
  return (select pg_catalog.jsonb_build_object('team_id',v_team.id,'team_name',v_team.name,
    'event_id',e.id,'event_title',e.title,'rules',e.rules,
    'status',case when v_invitation.status='pending' and v_invitation.expires_at<=clock_timestamp()
      then 'expired' else v_invitation.status end,'expires_at',v_invitation.expires_at)
    from public.events e where e.id=v_team.event_id);
end;
$$;

create function public.event_schedule_conflicts(p_event_id uuid,p_team_id uuid default null)
returns table(person_id uuid,person_name text,other_event_id uuid,other_title text,
  other_starts_at timestamptz,other_ends_at timestamptz,overlap_starts_at timestamptz,
  overlap_ends_at timestamptz,overlap_seconds integer,blocks_conflict boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='P0001'; end if;
  if p_team_id is null then
    return query select p.id,p.full_name,c.* from public.profiles p
      cross join lateral private.event_conflicts(p_event_id,p.id) c where p.id=auth.uid();
  else
    if not exists(select 1 from public.event_teams t join public.event_team_members mine
      on mine.team_id=t.id where t.id=p_team_id and t.event_id=p_event_id
        and mine.user_id=auth.uid() and mine.status='accepted') then
      raise exception 'team_not_found' using errcode='P0001'; end if;
    return query select p.id,p.full_name,c.* from public.event_team_members m
      join public.profiles p on p.id=m.user_id
      cross join lateral private.event_conflicts(p_event_id,m.user_id) c
      where m.team_id=p_team_id and m.status='accepted';
  end if;
end;
$$;

create function private.promote_event_waitlist_locked(p_event public.events,p_fest public.fests)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_candidate public.registrations; v_member public.event_team_members;
  v_profile public.profiles; v_team public.event_teams; v_valid boolean;
  v_confirmed integer; v_roster_count integer; v_member_count integer;
  v_deadline timestamptz;
begin
  v_deadline := least(coalesce(p_event.registration_closes_at,p_fest.registration_closes_at,p_event.starts_at),p_event.starts_at);
  if clock_timestamp()>=v_deadline or p_event.status<>'published'::public.publication_status
    or p_fest.status<>'published'::public.publication_status
    or p_event.operational_status<>'scheduled'::public.operational_status
    or p_fest.operational_status<>'scheduled'::public.operational_status then return null; end if;
  select count(*) into v_confirmed from public.registrations r
    where r.event_id=p_event.id and r.status='confirmed'::public.registration_status;
  if v_confirmed>=p_event.capacity then return null; end if;
  for v_candidate in select * from public.registrations r
    where r.event_id=p_event.id and r.status='waitlisted'::public.registration_status
    order by r.waitlist_position,r.registered_at,r.id for update
  loop
    v_valid := true;
    if p_event.registration_mode='individual'::public.event_registration_mode and v_candidate.team_id is null then
      select * into v_profile from public.profiles where id=v_candidate.participant_id for update;
      if not found or private.individual_eligibility_error(p_event,v_profile) is not null
        or v_candidate.rules_accepted_hash is distinct from pg_catalog.md5(p_event.rules) then
        v_valid := false;
      else
        begin
          perform private.assert_conflict_policy(p_event.id,v_candidate.participant_id,
            v_candidate.conflict_ack_hash is not null,v_candidate.conflict_ack_hash);
        exception when sqlstate 'P0001' then v_valid := false;
        end;
      end if;
    elsif p_event.registration_mode='team'::public.event_registration_mode and v_candidate.team_id is not null then
      select * into v_team from public.event_teams where id=v_candidate.team_id for update;
      select count(*) into v_roster_count from public.team_roster_snapshots
        where registration_id=v_candidate.id;
      select count(*) into v_member_count from public.event_team_members
        where team_id=v_candidate.team_id and status='accepted';
      if v_team.id is null or v_team.status<>'submitted' or v_roster_count<>v_member_count
        or v_roster_count not between p_event.team_min_size and p_event.team_max_size then
        v_valid := false;
      else
        for v_member in select * from public.event_team_members
          where team_id=v_candidate.team_id and status='accepted' order by user_id
        loop
          select * into v_profile from public.profiles where id=v_member.user_id for update;
          if not found or private.individual_eligibility_error(p_event,v_profile) is not null
            or v_member.rules_accepted_hash is distinct from pg_catalog.md5(p_event.rules)
            or not exists(select 1 from public.team_roster_snapshots s
              where s.registration_id=v_candidate.id and s.user_id=v_member.user_id) then
            v_valid := false; exit;
          end if;
          begin
            perform private.assert_conflict_policy(p_event.id,v_member.user_id,
              v_member.conflict_ack_hash is not null,v_member.conflict_ack_hash);
          exception when sqlstate 'P0001' then v_valid := false;
          end;
          if not v_valid then exit; end if;
        end loop;
      end if;
    else
      v_valid := false;
    end if;
    if not v_valid then continue; end if;
    update public.registrations set status='confirmed'::public.registration_status,
      waitlist_position=null,confirmed_at=clock_timestamp() where id=v_candidate.id;
    if v_candidate.team_id is null then
      insert into public.notifications(recipient_id,organization_id,fest_id,event_id,kind,title,body,data)
      values(v_candidate.participant_id,p_fest.organization_id,p_fest.id,p_event.id,
        'waitlist'::public.notification_kind,'Your waitlist place is confirmed',
        'A place opened in '||p_event.title||'. Your registration is now confirmed.',
        pg_catalog.jsonb_build_object('registration_id',v_candidate.id,'status','confirmed'));
    else
      insert into public.notifications(recipient_id,organization_id,fest_id,event_id,kind,title,body,data)
      select s.user_id,p_fest.organization_id,p_fest.id,p_event.id,
        'waitlist'::public.notification_kind,'Your team is confirmed',
        'A place opened in '||p_event.title||'. Your team is now confirmed.',
        pg_catalog.jsonb_build_object('registration_id',v_candidate.id,'team_id',v_candidate.team_id,'status','confirmed')
      from public.team_roster_snapshots s where s.registration_id=v_candidate.id;
    end if;
    return v_candidate.id;
  end loop;
  return null;
end;
$$;

create or replace function private.promote_individual_waitlist_locked(p_event public.events,p_fest public.fests)
returns uuid language sql security definer set search_path = ''
as $$ select private.promote_event_waitlist_locked(p_event,p_fest); $$;

create function public.submit_event_team(p_team_id uuid)
returns table(registration_id uuid,status public.registration_status,waitlist_position integer)
language plpgsql security definer set search_path = ''
as $$
declare v_team public.event_teams; v_event public.events; v_member public.event_team_members;
  v_profile public.profiles; v_count integer; v_confirmed integer; v_position integer;
  v_registration public.registrations;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='P0001'; end if;
  select * into v_team from public.event_teams where id=p_team_id;
  if not found or v_team.captain_id<>auth.uid() then raise exception 'team_not_found' using errcode='P0001'; end if;
  v_event := private.assert_event_open(v_team.event_id,'team'::public.event_registration_mode);
  select * into v_team from public.event_teams where id=p_team_id for update;
  if v_team.status<>'draft' then raise exception 'team_locked' using errcode='P0001'; end if;
  select count(*) into v_count from public.event_team_members m
    where m.team_id=p_team_id and m.status='accepted';
  if v_count<v_event.team_min_size then raise exception 'team_incomplete' using errcode='P0001'; end if;
  if v_count>v_event.team_max_size then raise exception 'team_too_large' using errcode='P0001'; end if;
  for v_member in select * from public.event_team_members m
    where m.team_id=p_team_id and m.status='accepted' order by m.user_id
  loop
    v_profile := private.assert_member_eligible(v_event,v_member.user_id);
    if v_member.rules_accepted_hash is distinct from pg_catalog.md5(v_event.rules) then
      raise exception 'team_rules_changed' using errcode='P0001'; end if;
    if exists(select 1 from public.registrations existing where existing.event_id=v_event.id
      and existing.participant_id=v_member.user_id and existing.status in
      ('confirmed'::public.registration_status,'waitlisted'::public.registration_status)) then
      raise exception 'already_registered' using errcode='P0001'; end if;
    perform private.assert_conflict_policy(v_event.id,v_member.user_id,
      v_member.conflict_ack_hash is not null,v_member.conflict_ack_hash);
  end loop;
  perform private.promote_event_waitlist_locked(v_event,(select f from public.fests f where id=v_event.fest_id));
  select count(*) into v_confirmed from public.registrations r
    where r.event_id=v_event.id and r.status='confirmed'::public.registration_status;
  if v_confirmed<v_event.capacity then
    insert into public.registrations(event_id,participant_id,team_id,status,confirmed_at,
      rules_accepted_hash,rules_accepted_at,metadata)
    values(v_event.id,v_team.captain_id,v_team.id,'confirmed'::public.registration_status,
      clock_timestamp(),pg_catalog.md5(v_event.rules),clock_timestamp(),
      pg_catalog.jsonb_build_object('team_name',v_team.name)) returning * into v_registration;
  else
    if not v_event.waitlist_enabled then raise exception 'event_full' using errcode='P0001'; end if;
    select coalesce(max(r.waitlist_position),0)+1 into v_position from public.registrations r
      where r.event_id=v_event.id and r.status='waitlisted'::public.registration_status;
    insert into public.registrations(event_id,participant_id,team_id,status,waitlist_position,
      rules_accepted_hash,rules_accepted_at,metadata)
    values(v_event.id,v_team.captain_id,v_team.id,'waitlisted'::public.registration_status,
      v_position,pg_catalog.md5(v_event.rules),clock_timestamp(),
      pg_catalog.jsonb_build_object('team_name',v_team.name)) returning * into v_registration;
  end if;
  insert into public.team_roster_snapshots(registration_id,user_id,full_name,email,
    is_captain,rules_accepted_hash,conflict_ack_hash,accepted_at)
  select v_registration.id,m.user_id,coalesce(p.full_name,''),coalesce(private.account_email(m.user_id),''),
    m.is_captain,m.rules_accepted_hash,m.conflict_ack_hash,m.joined_at
  from public.event_team_members m join public.profiles p on p.id=m.user_id
  where m.team_id=p_team_id and m.status='accepted';
  update public.event_teams set status='submitted',updated_at=clock_timestamp()
    where id=p_team_id;
  return query select v_registration.id,v_registration.status,v_registration.waitlist_position;
end;
$$;

create function public.cancel_event_team_registration(p_team_id uuid,p_reason text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_team public.event_teams; v_event public.events; v_fest public.fests;
  v_registration public.registrations; v_confirmed boolean;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='P0001'; end if;
  if char_length(coalesce(p_reason,''))>500 then raise exception 'cancellation_reason_too_long' using errcode='P0001'; end if;
  select * into v_team from public.event_teams where id=p_team_id;
  if not found or v_team.captain_id<>auth.uid() then raise exception 'team_not_found' using errcode='P0001'; end if;
  select * into v_event from public.events where id=v_team.event_id for update;
  select * into v_team from public.event_teams where id=p_team_id for update;
  select * into v_registration from public.registrations where team_id=p_team_id for update;
  if not found or v_registration.status='cancelled'::public.registration_status then
    raise exception 'registration_not_found' using errcode='P0001'; end if;
  if clock_timestamp()>=coalesce(v_event.cancellation_closes_at,v_event.starts_at) then
    raise exception 'cancellation_closed' using errcode='P0001'; end if;
  v_confirmed := v_registration.status='confirmed'::public.registration_status;
  update public.registrations set status='cancelled'::public.registration_status,
    waitlist_position=null,cancelled_at=clock_timestamp(),cancellation_reason=nullif(btrim(p_reason),'')
    where id=v_registration.id;
  update public.event_teams set status='cancelled',updated_at=clock_timestamp() where id=p_team_id;
  update public.event_team_members set status='withdrawn' where team_id=p_team_id;
  if v_confirmed then
    select * into v_fest from public.fests where id=v_event.fest_id;
    perform private.promote_event_waitlist_locked(v_event,v_fest);
  end if;
  return v_registration.id;
end;
$$;

create function private.register_individual_with_conflicts_impl(
  p_event_id uuid,p_accept_rules boolean,p_acknowledge_conflicts boolean)
returns table(registration_id uuid,status public.registration_status,
  waitlist_position integer,registered_at timestamptz,cancellation_closes_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_event public.events; v_fest public.fests;
  v_profile public.profiles; v_fingerprint text; v_confirmed integer;
  v_position integer; v_registration public.registrations;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='P0001'; end if;
  if p_accept_rules is distinct from true then raise exception 'rules_acceptance_required' using errcode='P0001'; end if;
  v_event := private.assert_event_open(p_event_id,'individual'::public.event_registration_mode);
  v_profile := private.assert_member_eligible(v_event,v_user);
  if exists(select 1 from public.registrations r where r.event_id=p_event_id
    and r.participant_id=v_user and r.status in
      ('confirmed'::public.registration_status,'waitlisted'::public.registration_status)) then
    raise exception 'already_registered' using errcode='P0001'; end if;
  v_fingerprint := private.assert_conflict_policy(p_event_id,v_user,p_acknowledge_conflicts);
  select * into v_fest from public.fests where id=v_event.fest_id;
  perform private.promote_event_waitlist_locked(v_event,v_fest);
  select count(*) into v_confirmed from public.registrations r
    where r.event_id=p_event_id and r.status='confirmed'::public.registration_status;
  if v_confirmed<v_event.capacity then
    insert into public.registrations(event_id,participant_id,status,confirmed_at,
      rules_accepted_at,rules_accepted_hash,conflict_ack_hash)
    values(p_event_id,v_user,'confirmed'::public.registration_status,clock_timestamp(),
      clock_timestamp(),pg_catalog.md5(v_event.rules),v_fingerprint)
    returning * into v_registration;
  else
    if not v_event.waitlist_enabled then raise exception 'event_full' using errcode='P0001'; end if;
    select coalesce(max(r.waitlist_position),0)+1 into v_position from public.registrations r
      where r.event_id=p_event_id and r.status='waitlisted'::public.registration_status;
    insert into public.registrations(event_id,participant_id,status,waitlist_position,
      rules_accepted_at,rules_accepted_hash,conflict_ack_hash)
    values(p_event_id,v_user,'waitlisted'::public.registration_status,v_position,
      clock_timestamp(),pg_catalog.md5(v_event.rules),v_fingerprint)
    returning * into v_registration;
  end if;
  return query select v_registration.id,v_registration.status,v_registration.waitlist_position,
    v_registration.registered_at,coalesce(v_event.cancellation_closes_at,v_event.starts_at);
end;
$$;

-- Retain the existing RPC for older clients, but never let it bypass the new
-- acknowledgement rule. New clients use the explicit-acknowledgement RPC.
create or replace function public.register_individual_event(p_event_id uuid,p_accept_rules boolean)
returns table(registration_id uuid,status public.registration_status,
  waitlist_position integer,registered_at timestamptz,cancellation_closes_at timestamptz)
language sql security invoker set search_path = ''
as $$ select * from private.register_individual_with_conflicts_impl(p_event_id,p_accept_rules,false); $$;

create function public.register_individual_event_with_conflicts(
  p_event_id uuid,p_accept_rules boolean,p_acknowledge_conflicts boolean)
returns table(registration_id uuid,status public.registration_status,
  waitlist_position integer,registered_at timestamptz,cancellation_closes_at timestamptz)
language sql security invoker set search_path = ''
as $$ select * from private.register_individual_with_conflicts_impl(
  p_event_id,p_accept_rules,p_acknowledge_conflicts); $$;

create function public.my_confirmed_schedule()
returns table(registration_id uuid,event_id uuid,event_title text,starts_at timestamptz,
  ends_at timestamptz,venue text,registration_mode public.event_registration_mode,
  team_name text,club_slug text,fest_slug text,event_slug text,timezone text)
language sql stable security definer set search_path = ''
as $$
  select r.id,e.id,e.title,e.starts_at,e.ends_at,e.venue,e.registration_mode,
    t.name,o.slug,f.slug,e.slug,f.timezone
  from public.registrations r
  join public.events e on e.id=r.event_id
  join public.fests f on f.id=e.fest_id
  join public.organizations o on o.id=f.organization_id
  left join public.event_teams t on t.id=r.team_id
  where r.status='confirmed'::public.registration_status
    and (r.participant_id=auth.uid() or exists(select 1 from public.team_roster_snapshots s
      where s.registration_id=r.id and s.user_id=auth.uid()))
  order by e.starts_at,e.id;
$$;

create function public.event_schedule_alternatives(p_event_id uuid,p_team_id uuid default null)
returns table(event_id uuid,event_title text,starts_at timestamptz,ends_at timestamptz,
  club_slug text,fest_slug text,event_slug text)
language plpgsql stable security definer set search_path = ''
as $$
declare v_target public.events;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='P0001'; end if;
  select * into v_target from public.events where id=p_event_id;
  if not found then return; end if;
  if p_team_id is not null and not exists(select 1 from public.event_teams t
    join public.event_team_members m on m.team_id=t.id
    where t.id=p_team_id and t.event_id=p_event_id and m.user_id=auth.uid()
      and m.status='accepted') then
    raise exception 'team_not_found' using errcode='P0001'; end if;
  return query select e.id,e.title,e.starts_at,e.ends_at,o.slug,f.slug,e.slug
  from public.events e join public.fests f on f.id=e.fest_id
  join public.organizations o on o.id=f.organization_id
  where e.id<>p_event_id and e.fest_id=v_target.fest_id
    and e.registration_mode=v_target.registration_mode
    and e.status='published'::public.publication_status
    and e.operational_status='scheduled'::public.operational_status
    and e.starts_at>clock_timestamp()
    and not exists(select 1 from
      (select auth.uid() as user_id where p_team_id is null
       union all
       select m.user_id from public.event_team_members m
       where p_team_id is not null and m.team_id=p_team_id and m.status='accepted') people
      cross join lateral private.event_conflicts(e.id,people.user_id) c)
  order by e.starts_at limit 3;
end;
$$;

revoke all on function private.promote_event_waitlist_locked(public.events,public.fests),
  private.register_individual_with_conflicts_impl(uuid,boolean,boolean)
  from public,anon;
revoke all on function private.register_individual_event_impl(uuid,boolean)
  from authenticated;
grant execute on function private.register_individual_with_conflicts_impl(uuid,boolean,boolean)
  to authenticated;
revoke all on function public.register_individual_event_with_conflicts(uuid,boolean,boolean),
  public.submit_event_team(uuid),public.cancel_event_team_registration(uuid,text),
  public.my_confirmed_schedule(),public.event_schedule_alternatives(uuid,uuid)
  from public,anon;
grant execute on function public.register_individual_event_with_conflicts(uuid,boolean,boolean),
  public.submit_event_team(uuid),public.cancel_event_team_registration(uuid,text),
  public.my_confirmed_schedule(),public.event_schedule_alternatives(uuid,uuid)
  to authenticated;

revoke all on function public.create_event_team(uuid,text,boolean),
  public.invite_event_team_member(uuid,text,integer),
  public.respond_event_team_invitation(text,boolean,boolean),
  public.revoke_event_team_invitation(uuid),
  public.leave_draft_event_team(uuid),
  public.acknowledge_event_team_conflicts(uuid),
  public.my_event_teams(),public.event_team_detail(uuid),
  public.preview_event_team_invitation(text),
  public.event_schedule_conflicts(uuid,uuid) from public,anon;
grant execute on function public.create_event_team(uuid,text,boolean),
  public.invite_event_team_member(uuid,text,integer),
  public.respond_event_team_invitation(text,boolean,boolean),
  public.revoke_event_team_invitation(uuid),
  public.leave_draft_event_team(uuid),
  public.acknowledge_event_team_conflicts(uuid),
  public.my_event_teams(),public.event_team_detail(uuid),
  public.preview_event_team_invitation(text),
  public.event_schedule_conflicts(uuid,uuid) to authenticated;

commit;
