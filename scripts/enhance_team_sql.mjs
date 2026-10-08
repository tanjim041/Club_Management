import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const idx = line.indexOf('=');
  if (idx > -1 && !line.trim().startsWith('#')) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
}
const token = env.SUPABASE_ACCESS_TOKEN;
const ref = 'ylmjekpzaxnitthrwncs';

async function run() {
  console.log('Enhancing submit_event_team to explicitly check team_roster_snapshots for duplicate members...');
  const query = `
    create or replace function public.submit_event_team(p_team_id uuid)
    returns table(registration_id uuid, status public.registration_status, waitlist_position integer)
    language plpgsql security definer set search_path=public,extensions as $$
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
          and (existing.participant_id=v_member.user_id or exists(
            select 1 from public.team_roster_snapshots s
            where s.registration_id=existing.id and s.user_id=v_member.user_id
          ))
          and existing.status in
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
  `;
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  console.log('Result:', data);
}
run();
