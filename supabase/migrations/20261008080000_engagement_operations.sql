begin;

-- Operational announcements are separate from the legacy public fest feed.
-- A private announcement is delivered to an immutable recipient snapshot.
create table public.operational_announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  fest_id uuid references public.fests(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  audience text not null check (audience in ('public', 'registered')),
  title text not null check (char_length(trim(title)) between 1 and 200),
  body text not null check (char_length(trim(body)) between 1 and 5000),
  published_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  constraint announcement_scope check (event_id is null or fest_id is not null)
);
create index operational_announcements_scope_idx on public.operational_announcements(organization_id, fest_id, event_id, published_at desc);
create table public.announcement_recipients (
  announcement_id uuid not null references public.operational_announcements(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  primary key (announcement_id, recipient_id)
);
create index announcement_recipients_user_idx on public.announcement_recipients(recipient_id);
alter table public.operational_announcements enable row level security;
alter table public.announcement_recipients enable row level security;
revoke all on public.operational_announcements, public.announcement_recipients from public, anon, authenticated;
grant select on public.operational_announcements to anon, authenticated;
grant select on public.announcement_recipients to authenticated;
grant all on public.operational_announcements, public.announcement_recipients to service_role;
create policy announcement_public_or_recipient_or_organizer on public.operational_announcements
  for select to anon, authenticated using (
    public.current_user_is_organizer(organization_id)
    or (audience = 'public' and public.is_public_organization(organization_id)
      and (fest_id is null or public.is_public_fest(fest_id))
      and (event_id is null or public.is_public_event(event_id)))
    or (auth.uid() is not null and exists (select 1 from public.announcement_recipients ar
      where ar.announcement_id = id and ar.recipient_id = auth.uid()))
  );
create policy announcement_recipients_own on public.announcement_recipients
  for select to authenticated using (recipient_id = auth.uid());

create function public.publish_operational_announcement(
  p_organization_id uuid, p_fest_id uuid, p_event_id uuid,
  p_audience text, p_title text, p_body text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_recipient uuid;
begin
  if auth.uid() is null or not public.current_user_is_organizer(p_organization_id) then
    raise exception 'organizer_not_authorized' using errcode = 'P0001';
  end if;
  if p_audience not in ('public', 'registered') or
     (p_audience = 'registered' and p_fest_id is null) or
     char_length(trim(coalesce(p_title, ''))) not between 1 and 200 or
     char_length(trim(coalesce(p_body, ''))) not between 1 and 5000 then
    raise exception 'invalid_announcement' using errcode = 'P0001';
  end if;
  if p_fest_id is not null and not exists (select 1 from public.fests
    where id = p_fest_id and organization_id = p_organization_id) then
    raise exception 'fest_out_of_scope' using errcode = 'P0001';
  end if;
  if p_event_id is not null and (p_fest_id is null or not exists (select 1 from public.events
    where id = p_event_id and fest_id = p_fest_id)) then
    raise exception 'event_out_of_scope' using errcode = 'P0001';
  end if;
  insert into public.operational_announcements(organization_id, fest_id, event_id, audience, title, body, created_by)
  values (p_organization_id, p_fest_id, p_event_id, p_audience, trim(p_title), trim(p_body), auth.uid()) returning id into v_id;
  if p_audience = 'registered' then
    for v_recipient in
      select distinct people.user_id from (
        select r.participant_id as user_id from public.registrations r
        join public.events e on e.id = r.event_id
        where e.fest_id = p_fest_id and (p_event_id is null or e.id = p_event_id)
          and r.status in ('confirmed'::public.registration_status, 'waitlisted'::public.registration_status)
        union all
        select s.user_id from public.team_roster_snapshots s
        join public.registrations r on r.id = s.registration_id
        join public.events e on e.id = r.event_id
        where e.fest_id = p_fest_id and (p_event_id is null or e.id = p_event_id)
          and r.status in ('confirmed'::public.registration_status, 'waitlisted'::public.registration_status)
      ) people
    loop
      insert into public.announcement_recipients values (v_id, v_recipient);
      insert into public.notifications(recipient_id, organization_id, fest_id, event_id, kind, title, body, data)
      values (v_recipient, p_organization_id, p_fest_id, p_event_id, 'announcement', trim(p_title), trim(p_body),
        jsonb_build_object('announcement_id', v_id));
    end loop;
  end if;
  return v_id;
end; $$;
revoke all on function public.publish_operational_announcement(uuid,uuid,uuid,text,text,text) from public;
grant execute on function public.publish_operational_announcement(uuid,uuid,uuid,text,text,text) to authenticated;

create table public.help_desk_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  fest_id uuid not null references public.fests(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  category text not null check (category in ('schedule','venue','registration','accessibility','safety','other')),
  description text not null check (char_length(trim(description)) between 10 and 3000),
  venue text check (venue is null or char_length(venue) <= 200),
  submitter_id uuid not null references public.profiles(id) on delete restrict,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_staff_id uuid references public.profiles(id) on delete set null,
  status text not null default 'new' check (status in ('new','assigned','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint help_desk_state check ((status = 'resolved') = (resolved_at is not null))
);
create index help_desk_queue_idx on public.help_desk_requests(organization_id, status, created_at desc);
create index help_desk_submitter_idx on public.help_desk_requests(submitter_id, created_at desc);
alter table public.help_desk_requests enable row level security;
revoke all on public.help_desk_requests from public, anon, authenticated;
grant select on public.help_desk_requests to authenticated;
grant all on public.help_desk_requests to service_role;
create policy help_desk_own_or_organizer on public.help_desk_requests for select to authenticated
  using (submitter_id = auth.uid() or public.current_user_is_organizer(organization_id));
create function public.submit_help_desk_request(p_fest_id uuid, p_event_id uuid, p_category text, p_description text, p_venue text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = 'P0001'; end if;
  select organization_id into v_org from public.fests where id = p_fest_id and status = 'published';
  if v_org is null or not public.is_public_fest(p_fest_id) then raise exception 'fest_unavailable' using errcode = 'P0001'; end if;
  if p_event_id is not null and not exists (select 1 from public.events where id = p_event_id and fest_id = p_fest_id)
    then raise exception 'event_out_of_scope' using errcode = 'P0001'; end if;
  insert into public.help_desk_requests(organization_id, fest_id, event_id, category, description, venue, submitter_id)
  values (v_org, p_fest_id, p_event_id, p_category, trim(p_description), nullif(trim(p_venue),''), auth.uid())
  returning id into v_id;
  return v_id;
end; $$;
create function public.update_help_desk_request(p_request_id uuid, p_priority text, p_assigned_staff_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.help_desk_requests where id = p_request_id for update;
  if v_org is null or not public.current_user_is_organizer(v_org) then raise exception 'organizer_not_authorized' using errcode = 'P0001'; end if;
  if p_assigned_staff_id is not null and not exists (
    select 1 from public.organization_memberships where organization_id = v_org and user_id = p_assigned_staff_id and is_active
  ) then raise exception 'assignee_out_of_scope' using errcode = 'P0001'; end if;
  if (p_status = 'assigned' and p_assigned_staff_id is null) or (p_status = 'new' and p_assigned_staff_id is not null) then
    raise exception 'invalid_assignment' using errcode = 'P0001'; end if;
  update public.help_desk_requests set priority = p_priority, assigned_staff_id = p_assigned_staff_id,
    status = p_status, resolved_at = case when p_status = 'resolved' then coalesce(resolved_at, now()) else null end,
    updated_at = now() where id = p_request_id;
end; $$;
revoke all on function public.submit_help_desk_request(uuid,uuid,text,text,text), public.update_help_desk_request(uuid,text,uuid,text) from public;
grant execute on function public.submit_help_desk_request(uuid,uuid,text,text,text), public.update_help_desk_request(uuid,text,uuid,text) to authenticated;

-- Ledger rows are append-only and uniquely keyed by their verified source.
create table public.passport_reward_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_kind text not null check (source_kind in ('attendance','workshop','achievement')),
  source_id uuid not null,
  xp integer not null check (xp > 0 and xp <= 1000),
  label text not null check (char_length(trim(label)) between 1 and 200),
  awarded_at timestamptz not null default now(),
  awarded_by uuid references public.profiles(id) on delete set null,
  unique(user_id, source_kind, source_id)
);
create table public.passport_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  kind text not null check (kind in ('workshop','achievement')),
  title text not null check (char_length(trim(title)) between 1 and 200),
  verified_by uuid not null references public.profiles(id) on delete restrict,
  verified_at timestamptz not null default now()
);
create index passport_ledger_user_idx on public.passport_reward_ledger(user_id, awarded_at desc);
create index passport_verifications_user_idx on public.passport_verifications(user_id, verified_at desc);
alter table public.passport_reward_ledger enable row level security;
alter table public.passport_verifications enable row level security;
revoke all on public.passport_reward_ledger, public.passport_verifications from public, anon, authenticated;
grant select on public.passport_reward_ledger, public.passport_verifications to authenticated;
grant all on public.passport_reward_ledger, public.passport_verifications to service_role;
create policy passport_ledger_private on public.passport_reward_ledger for select to authenticated using (user_id = auth.uid());
create policy passport_verifications_private on public.passport_verifications for select to authenticated using (user_id = auth.uid());

create function private.award_check_in_xp() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.passport_reward_ledger(user_id, organization_id, source_kind, source_id, xp, label, awarded_by)
  select p.user_id, f.organization_id, 'attendance', new.pass_id, 20, 'Event check-in: ' || e.title, new.checked_in_by
  from public.event_passes p join public.registrations r on r.id = p.registration_id
  join public.events e on e.id = r.event_id join public.fests f on f.id = e.fest_id
  where p.id = new.pass_id and p.revoked_at is null and r.status = 'confirmed'::public.registration_status
  on conflict (user_id, source_kind, source_id) do nothing;
  return new;
end; $$;
create trigger award_check_in_xp_after_insert after insert on public.event_pass_attendance
  for each row execute function private.award_check_in_xp();
insert into public.passport_reward_ledger(user_id, organization_id, source_kind, source_id, xp, label, awarded_by)
select p.user_id, f.organization_id, 'attendance', a.pass_id, 20, 'Event check-in: ' || e.title, a.checked_in_by
from public.event_pass_attendance a join public.event_passes p on p.id = a.pass_id
join public.registrations r on r.id = p.registration_id join public.events e on e.id = r.event_id
join public.fests f on f.id = e.fest_id where p.revoked_at is null and r.status = 'confirmed'::public.registration_status
on conflict (user_id, source_kind, source_id) do nothing;

create function public.verify_passport_item(p_user_id uuid, p_organization_id uuid, p_event_id uuid, p_kind text, p_title text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_xp integer;
begin
  if auth.uid() is null or not public.current_user_is_organizer(p_organization_id) then
    raise exception 'organizer_not_authorized' using errcode = 'P0001'; end if;
  if p_kind not in ('workshop','achievement') or char_length(trim(coalesce(p_title,''))) not between 1 and 200 then
    raise exception 'invalid_verification' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then raise exception 'participant_not_found' using errcode = 'P0001'; end if;
  if p_event_id is not null and not exists (select 1 from public.events e join public.fests f on f.id=e.fest_id
    where e.id=p_event_id and f.organization_id=p_organization_id) then raise exception 'event_out_of_scope' using errcode = 'P0001'; end if;
  -- A participant must actually hold a confirmed place before workshop credit.
  if p_kind = 'workshop' and (p_event_id is null or not exists (
    select 1 from public.registrations r where r.event_id=p_event_id and r.status='confirmed'::public.registration_status
      and (r.participant_id=p_user_id or exists (select 1 from public.team_roster_snapshots s where s.registration_id=r.id and s.user_id=p_user_id))
  )) then raise exception 'confirmed_participation_required' using errcode = 'P0001'; end if;
  insert into public.passport_verifications(user_id, organization_id, event_id, kind, title, verified_by)
    values(p_user_id,p_organization_id,p_event_id,p_kind,trim(p_title),auth.uid()) returning id into v_id;
  v_xp := case when p_kind='workshop' then 30 else 50 end;
  insert into public.passport_reward_ledger(user_id,organization_id,source_kind,source_id,xp,label,awarded_by)
    values(p_user_id,p_organization_id,p_kind,v_id,v_xp,trim(p_title),auth.uid());
  return v_id;
end; $$;
revoke all on function public.verify_passport_item(uuid,uuid,uuid,text,text) from public;
grant execute on function public.verify_passport_item(uuid,uuid,uuid,text,text) to authenticated;

create function public.my_club_passport() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='P0001'; end if;
  select jsonb_build_object(
    'xp', coalesce((select sum(xp) from public.passport_reward_ledger where user_id=auth.uid()),0),
    'attendedEvents', coalesce((select jsonb_agg(jsonb_build_object('eventTitle',e.title,'festTitle',f.title,'clubName',o.name,'checkedInAt',a.checked_in_at) order by a.checked_in_at desc)
      from public.event_pass_attendance a join public.event_passes p on p.id=a.pass_id
      join public.registrations r on r.id=p.registration_id join public.events e on e.id=r.event_id
      join public.fests f on f.id=e.fest_id join public.organizations o on o.id=f.organization_id
      where p.user_id=auth.uid() and p.revoked_at is null and r.status='confirmed'::public.registration_status),'[]'::jsonb),
    'participatedFests', coalesce((select jsonb_agg(distinct jsonb_build_object('id',f.id,'title',f.title,'clubName',o.name))
      from public.event_pass_attendance a join public.event_passes p on p.id=a.pass_id
      join public.registrations r on r.id=p.registration_id join public.events e on e.id=r.event_id
      join public.fests f on f.id=e.fest_id join public.organizations o on o.id=f.organization_id
      where p.user_id=auth.uid() and p.revoked_at is null and r.status='confirmed'::public.registration_status),'[]'::jsonb),
    'verifications', coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'title',title,'verifiedAt',verified_at) order by verified_at desc)
      from public.passport_verifications where user_id=auth.uid()),'[]'::jsonb),
    'rewards', coalesce((select jsonb_agg(jsonb_build_object('kind',source_kind,'label',label,'xp',xp,'awardedAt',awarded_at) order by awarded_at desc)
      from public.passport_reward_ledger where user_id=auth.uid()),'[]'::jsonb)
  ) into v_result;
  return v_result;
end; $$;
revoke all on function public.my_club_passport() from public;
grant execute on function public.my_club_passport() to authenticated;

-- Reuse the dashboard's exact analytics snapshot for all report metrics.
create function public.post_fest_report(p_fest_id uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_org uuid; v_base jsonb;
begin
  select organization_id into v_org from public.fests where id=p_fest_id;
  if v_org is null or not public.current_user_is_organizer(v_org) then raise exception 'organizer_not_authorized' using errcode='P0001'; end if;
  v_base := public.organizer_analytics(v_org,p_fest_id,null,null,null);
  return v_base || jsonb_build_object('helpDesk',(
    select jsonb_build_object('total',count(*),'new',count(*) filter(where status='new'),
      'assigned',count(*) filter(where status='assigned'),'resolved',count(*) filter(where status='resolved'))
    from public.help_desk_requests where fest_id=p_fest_id),
    'generatedAt', now(), 'festId',p_fest_id);
end; $$;
revoke all on function public.post_fest_report(uuid) from public;
grant execute on function public.post_fest_report(uuid) to authenticated;

-- RLS applies to Postgres Changes; polling remains the fallback when Realtime is unavailable.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='operational_announcements') then
      alter publication supabase_realtime add table public.operational_announcements;
    end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='fest_schedule_items') then
      alter publication supabase_realtime add table public.fest_schedule_items;
    end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='events') then
      alter publication supabase_realtime add table public.events;
    end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end $$;
commit;
