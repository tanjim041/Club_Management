-- Rollback-only integration test. Requires four auth users with profiles.
begin;
do $test$
<<team_test>>
declare
  u uuid[]; emails text[]; org_id uuid; fest_id uuid; event_id uuid; other_id uuid;
  adjacent_id uuid; acknowledgement_event_id uuid;
  team_one uuid; team_two uuid; team_three uuid; team_four uuid;
  token text; invitation uuid; reg_id uuid; reg_status public.registration_status;
  n integer; suffix text := replace(gen_random_uuid()::text,'-','');
begin
  select array_agg(id),array_agg(email) into u,emails from (
    select p.id,lower(a.email) as email from public.profiles p
    join auth.users a on a.id=p.id where a.email_confirmed_at is not null order by p.id limit 4
  ) people;
  if cardinality(u)<4 then raise exception 'Four auth users with profiles required'; end if;
  update public.profiles set full_name=coalesce(full_name,'Test participant'),
    institution=coalesce(institution,'Test Institute'),
    experience_level='beginner'::public.experience_level where id=any(u);
  insert into public.organizations(name,slug,owner_id,is_public_profile)
    values('Team regression fixture','team-regression-'||suffix,u[1],true) returning id into org_id;
  insert into public.fests(organization_id,title,slug,status,starts_at,ends_at)
    values(org_id,'Team regression fest','team-regression','published',
      now()+interval '365 days',now()+interval '367 days') returning id into fest_id;
  insert into public.events(fest_id,title,slug,status,starts_at,ends_at,
    registration_opens_at,registration_closes_at,registration_mode,capacity,
    team_min_size,team_max_size,waitlist_enabled,rules)
    values(fest_id,'Team regression event','team-regression','published',
      now()+interval '365 days',now()+interval '365 days 3 hours',
      now()-interval '1 day',now()+interval '1 day','team',1,2,3,true,'Respect all participants')
    returning id into event_id;

  perform set_config('request.jwt.claim.sub',u[1]::text,true);
  team_one := public.create_event_team(event_id,'First team',true);
  select count(*) into n from public.registrations where team_test.event_id=registrations.event_id;
  if n<>0 then raise exception 'draft team reserved capacity'; end if;
  begin
    perform public.submit_event_team(team_one);
    raise exception 'incomplete team submitted';
  exception when sqlstate 'P0001' then
    if sqlerrm<>'team_incomplete' then raise; end if;
  end;
  select invitation_id,invitation_token into invitation,token
    from public.invite_event_team_member(team_one,emails[2],72);
  if length(token)<>64 then raise exception 'invitation token is not 256-bit hex'; end if;
  perform set_config('request.jwt.claim.sub',u[2]::text,true);
  if public.preview_event_team_invitation(token)->>'team_name'<>'First team' then
    raise exception 'intended member could not preview invite'; end if;
  perform set_config('request.jwt.claim.sub',u[3]::text,true);
  if public.preview_event_team_invitation(token) is not null then
    raise exception 'unintended account could preview invite'; end if;
  begin
    perform public.respond_event_team_invitation(token,true,true);
    raise exception 'unintended account accepted invite';
  exception when sqlstate 'P0001' then
    if sqlerrm<>'invitation_not_for_account' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub',u[2]::text,true);
  perform public.respond_event_team_invitation(token,true,true);
  perform set_config('request.jwt.claim.sub',u[1]::text,true);
  select registration_id,status into reg_id,reg_status from public.submit_event_team(team_one);
  if reg_status<>'confirmed' then raise exception 'complete first team not confirmed'; end if;
  select count(*) into n from public.team_roster_snapshots where registration_id=reg_id;
  if n<>2 then raise exception 'registered roster snapshot incomplete'; end if;
  begin
    perform public.invite_event_team_member(team_one,emails[4],72);
    raise exception 'submitted roster was editable';
  exception when sqlstate 'P0001' then
    if sqlerrm<>'team_locked' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub',u[3]::text,true);
  team_two := public.create_event_team(event_id,'Second team',true);
  select invitation_token into token from public.invite_event_team_member(team_two,emails[2],72);
  perform set_config('request.jwt.claim.sub',u[2]::text,true);
  begin
    perform public.respond_event_team_invitation(token,true,true);
    raise exception 'duplicate event team membership accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm<>'already_in_event_team' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub',u[3]::text,true);
  select invitation_token into token from public.invite_event_team_member(team_two,emails[4],72);
  perform set_config('request.jwt.claim.sub',u[4]::text,true);
  perform public.respond_event_team_invitation(token,true,true);
  perform set_config('request.jwt.claim.sub',u[3]::text,true);
  select status into reg_status from public.submit_event_team(team_two);
  if reg_status<>'waitlisted' then raise exception 'second team did not waitlist'; end if;
  perform set_config('request.jwt.claim.sub',u[1]::text,true);
  perform public.cancel_event_team_registration(team_one,null);
  select count(*) into n from public.registrations
    where team_id=team_two and status='confirmed';
  if n<>1 then raise exception 'FIFO team promotion failed'; end if;
  select count(*) into n from public.notifications notice
    where notice.recipient_id in (u[3],u[4]) and notice.event_id=team_test.event_id and notice.kind='waitlist';
  if n<>2 then raise exception 'team promotion notifications missing'; end if;

  -- Give the invitee a confirmed overlapping individual event.
  insert into public.events(fest_id,title,slug,status,starts_at,ends_at,
    registration_mode,capacity,blocks_schedule_conflicts)
    values(fest_id,'Existing schedule','existing-schedule','published',
      now()+interval '365 days 1 hour',now()+interval '365 days 2 hours',
      'individual',5,true) returning id into other_id;
  perform set_config('request.jwt.claim.sub',u[2]::text,true);
  perform public.register_individual_event_with_conflicts(other_id,true,false);
  insert into public.events(fest_id,title,slug,status,starts_at,ends_at,
    registration_mode,capacity,blocks_schedule_conflicts)
    values(fest_id,'Back-to-back schedule','back-to-back','published',
      now()+interval '365 days 3 hours',now()+interval '365 days 4 hours',
      'individual',5,true) returning id into adjacent_id;
  perform public.register_individual_event_with_conflicts(adjacent_id,true,false);
  select count(*) into n from public.event_schedule_conflicts(event_id,null);
  if n<>1 then raise exception 'back-to-back event was incorrectly treated as overlapping'; end if;
  perform set_config('request.jwt.claim.sub',u[1]::text,true);
  team_three := public.create_event_team(event_id,'Third team',true);
  select invitation_token into token from public.invite_event_team_member(team_three,emails[2],72);
  perform set_config('request.jwt.claim.sub',u[2]::text,true);
  perform public.respond_event_team_invitation(token,true,true);
  perform set_config('request.jwt.claim.sub',u[1]::text,true);
  begin
    perform public.submit_event_team(team_three);
    raise exception 'blocking schedule conflict was ignored';
  exception when sqlstate 'P0001' then
    if sqlerrm<>'schedule_conflict' then raise; end if;
  end;
  update public.events set blocks_schedule_conflicts=false where id in (event_id,other_id);
  perform set_config('request.jwt.claim.sub',u[2]::text,true);
  insert into public.events(fest_id,title,slug,status,starts_at,ends_at,
    registration_mode,capacity,blocks_schedule_conflicts)
    values(fest_id,'Acknowledgement schedule','ack-schedule','published',
      now()+interval '365 days 1 hour 30 minutes',now()+interval '365 days 2 hours 30 minutes',
      'individual',5,false) returning id into acknowledgement_event_id;
  begin
    perform public.register_individual_event_with_conflicts(acknowledgement_event_id,true,false);
    raise exception 'individual overlap acknowledgement was not required';
  exception when sqlstate 'P0001' then
    if sqlerrm<>'conflict_ack_required' then raise; end if;
  end;
  perform public.register_individual_event_with_conflicts(acknowledgement_event_id,true,true);
  select count(*) into n from public.event_schedule_alternatives(other_id,null);
  if n<>0 then raise exception 'already-joined events were suggested as alternatives'; end if;
  perform set_config('request.jwt.claim.sub',u[1]::text,true);
  begin
    perform public.submit_event_team(team_three);
    raise exception 'schedule acknowledgement was not required';
  exception when sqlstate 'P0001' then
    if sqlerrm<>'conflict_ack_required' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub',u[2]::text,true);
  perform public.acknowledge_event_team_conflicts(team_three);
  perform set_config('request.jwt.claim.sub',u[1]::text,true);
  select status into reg_status from public.submit_event_team(team_three);
  if reg_status<>'waitlisted' then raise exception 'acknowledged team did not waitlist'; end if;

  -- Changed conflict fingerprint makes the next cancellation skip the team.
  update public.events set ends_at=ends_at+interval '1 minute' where id=other_id;
  perform set_config('request.jwt.claim.sub',u[3]::text,true);
  perform public.cancel_event_team_registration(team_two,null);
  select count(*) into n from public.registrations
    where team_id=team_three and status='waitlisted';
  if n<>1 then raise exception 'stale acknowledgement was promoted'; end if;
  perform set_config('request.jwt.claim.sub',u[2]::text,true);
  perform public.acknowledge_event_team_conflicts(team_three);
  perform set_config('request.jwt.claim.sub',u[3]::text,true);
  team_four := public.create_event_team(event_id,'Fourth team',true);
  select invitation_id,invitation_token into invitation,token
    from public.invite_event_team_member(team_four,emails[2],72);
  perform public.revoke_event_team_invitation(invitation);
  perform set_config('request.jwt.claim.sub',u[2]::text,true);
  begin
    perform public.respond_event_team_invitation(token,true,true);
    raise exception 'revoked invitation was accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm<>'invitation_unavailable' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub',u[3]::text,true);
  select invitation_id,invitation_token into invitation,token
    from public.invite_event_team_member(team_four,emails[2],1);
  update public.event_team_invitations set created_at=now()-interval '2 hours',
    expires_at=now()-interval '1 hour' where id=invitation;
  perform set_config('request.jwt.claim.sub',u[2]::text,true);
  begin
    perform public.respond_event_team_invitation(token,true,true);
    raise exception 'expired invitation was accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm<>'invitation_unavailable' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub',u[3]::text,true);
  select invitation_token into token from public.invite_event_team_member(team_four,emails[4],72);
  perform set_config('request.jwt.claim.sub',u[4]::text,true);
  perform public.respond_event_team_invitation(token,true,true);
  perform set_config('request.jwt.claim.sub',u[3]::text,true);
  perform public.submit_event_team(team_four);
  select count(*) into n from public.registrations
    where team_id=team_three and status='confirmed';
  if n<>1 then raise exception 'eligible reacknowledged team not promoted first'; end if;
  -- Exercise authenticated grants/RLS, not just definer logic as the test owner.
  perform set_config('request.jwt.claim.sub',u[2]::text,true);
  execute 'set local role authenticated';
  select count(*) into n from public.my_team_registration_ids();
  if n<2 then raise exception 'team member could not list registration history'; end if;
  select count(*) into n from public.registrations r
    where r.id in (select registration_id from public.my_team_registration_ids());
  if n<2 then raise exception 'registration RLS hid accepted team member history'; end if;
  if has_table_privilege(current_user,'public.event_team_invitations','SELECT') then
    raise exception 'invitation token hash table was exposed'; end if;
  begin
    perform public.organizer_team_rosters(org_id);
    raise exception 'participant read organizer roster';
  exception when sqlstate 'P0001' then
    if sqlerrm<>'organization_access_denied' then raise; end if;
  end;
  execute 'reset role';
  raise notice 'team registration and schedule conflict tests passed';
end;
$test$;
rollback;
