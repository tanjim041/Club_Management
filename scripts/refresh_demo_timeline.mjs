import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.trimStart().startsWith('#') && line.includes('='))
  .map((line) => { const index = line.indexOf('='); return [line.slice(0, index).trim(), line.slice(index + 1).trim()] }))
for (const key of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_ACCESS_TOKEN']) if (!env[key]) throw new Error(`Missing ${key}`)
const client = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
const realFestId = 'c9383b61-a40e-4657-a5e8-2e48d97175a3'
async function realSnapshot() {
  const fest = await client.from('fests').select('*').eq('id', realFestId).maybeSingle()
  if (fest.error) throw fest.error
  if (!fest.data) return null
  assert.equal(fest.data.title, '9th DRMC International Tech Carnival 2026', 'Real fest identity changed; stopping')
  const events = await client.from('events').select('*').eq('fest_id', realFestId).order('id')
  if (events.error) throw events.error
  return { fest: fest.data, events: events.data }
}
const before = await realSnapshot()
const sql = `begin;
do $$ begin
  if exists (
    select 1 from public.registrations r
    where r.event_id in (
      '77777777-7777-7777-7777-777777777101',
      '77777777-7777-7777-7777-777777777102',
      '77777777-7777-7777-7777-777777777203',
      '77777777-7777-7777-7777-777777777402',
      '77777777-7777-7777-7777-777777777403'
    ) and r.metadata->>'is_demo' is distinct from 'true'
  ) then raise exception 'Non-demo registration found in target events'; end if;
  if not exists (select 1 from public.events where id='77777777-7777-7777-7777-777777777403'
    and fest_id='33333333-3333-3333-3333-333333333401') then
    raise exception 'Expected Beacon demo event not found'; end if;
end $$;

-- Real November/December events: only the two deliberately closed examples
-- change deadline, and the formerly misplaced completed event becomes upcoming.
update public.events set registration_closes_at='2026-10-08T23:59:59+06:00'
  where id in ('77777777-7777-7777-7777-777777777203','77777777-7777-7777-7777-777777777402');
update public.events set starts_at='2026-11-27T10:00:00+06:00', ends_at='2026-11-27T16:00:00+06:00',
  registration_opens_at='2026-09-01T00:00:00+06:00', registration_closes_at='2026-11-24T23:59:59+06:00',
  operational_status='scheduled'
  where id='77777777-7777-7777-7777-777777777403';
update public.events e set cancellation_closes_at=e.starts_at
  from public.fests f where e.fest_id=f.id and f.id in (
    '33333333-3333-3333-3333-333333333101','33333333-3333-3333-3333-333333333201',
    '33333333-3333-3333-3333-333333333301','33333333-3333-3333-3333-333333333401',
    '33333333-3333-3333-3333-333333333501');
update public.events set capacity=1 where id in (
  '77777777-7777-7777-7777-777777777302','77777777-7777-7777-7777-777777777502');
update public.events e set capacity=greatest(1,(
  select count(*)::integer from public.registrations r where r.event_id=e.id and r.status='confirmed'))
  where e.id='77777777-7777-7777-7777-777777777102';

-- Existing 2025 completed showcase rows are historical, not future events.
update public.fests set title=replace(title,'[Demo]','[Historical Demo]')
  where id in ('33333333-3333-3333-3333-333333333102','33333333-3333-3333-3333-333333333202',
    '33333333-3333-3333-3333-333333333302','33333333-3333-3333-3333-333333333402',
    '33333333-3333-3333-3333-333333333502') and title like '%[Demo]%';
update public.events set title=replace(title,'[Demo]','[Historical Demo]')
  where id in ('77777777-7777-7777-7777-777777777104','77777777-7777-7777-7777-777777777105',
    '77777777-7777-7777-7777-777777777204','77777777-7777-7777-7777-777777777304',
    '77777777-7777-7777-7777-777777777404','77777777-7777-7777-7777-777777777504')
    and title like '%[Demo]%';

-- Remove only synthetic early check-ins on these two future demo events.
-- Their pass and registration remain ready for judging. Reverse only XP
-- sourced from the invalid scans, preserving unrelated ledger entries.
delete from public.passport_reward_ledger l using public.event_passes p,
  public.registrations r, public.events e, public.event_pass_attendance a
  where l.source_kind='attendance' and l.source_id=p.id and p.registration_id=r.id
    and e.id=r.event_id and a.pass_id=p.id and a.checked_in_at<e.starts_at
    and e.id in ('77777777-7777-7777-7777-777777777101','77777777-7777-7777-7777-777777777102')
    and r.metadata->>'is_demo'='true';
delete from public.event_pass_attendance a using public.event_passes p,
  public.registrations r, public.events e
  where a.pass_id=p.id and p.registration_id=r.id and e.id=r.event_id
    and a.checked_in_at<e.starts_at
    and e.id in ('77777777-7777-7777-7777-777777777101','77777777-7777-7777-7777-777777777102')
    and r.metadata->>'is_demo'='true';
update public.registrations r set metadata=(r.metadata - 'checked_in_at' - 'gate_verified_by') ||
  jsonb_build_object('attendance_status','unverified')
  where r.event_id in ('77777777-7777-7777-7777-777777777101',
    '77777777-7777-7777-7777-777777777102','77777777-7777-7777-7777-777777777403')
    and r.metadata->>'is_demo'='true' and r.metadata->>'attendance_status'='verified';

-- A distinct historical fixture preserves an honest completed event and a
-- chronologically valid check-in. Stable IDs make this rerunnable.
insert into public.fests(id,organization_id,title,slug,description,status,operational_status,timezone,
  starts_at,ends_at,registration_opens_at,registration_closes_at)
values('33333333-3333-3333-3333-333333333403','22222222-2222-2222-2222-222222222224',
  'Beacon Service Archive, September 2026 [Historical Demo]','beacon-service-archive-september-2026',
  '[Historical demo scenario] Completed September workshop for attendance and passport examples.',
  'published','completed','Asia/Dhaka','2026-09-27T09:00:00+06:00','2026-09-29T17:00:00+06:00',
  '2026-09-01T00:00:00+06:00','2026-09-26T23:59:59+06:00') on conflict(id) do nothing;
insert into public.events(id,fest_id,title,slug,description,status,operational_status,registration_mode,capacity,
  starts_at,ends_at,registration_opens_at,registration_closes_at,cancellation_closes_at,venue)
values('77777777-7777-7777-7777-777777777405','33333333-3333-3333-3333-333333333403',
  'Grassroots Fundraising Workshop [Historical Demo]','historical-fundraising-workshop',
  '[Historical demo scenario] Completed September workshop with verified attendance.',
  'published','completed','individual',30,'2026-09-28T10:00:00+06:00','2026-09-28T16:00:00+06:00',
  '2026-09-01T00:00:00+06:00','2026-09-26T23:59:59+06:00',
  '2026-09-28T10:00:00+06:00','Civic Leadership Room 102') on conflict(id) do nothing;
insert into public.registrations(id,event_id,participant_id,status,registered_at,confirmed_at,metadata)
select '77777777-7777-7777-7777-777777777852',
  '77777777-7777-7777-7777-777777777405',r.participant_id,'confirmed',
  '2026-09-10T10:00:00+06:00','2026-09-10T10:00:00+06:00',
  '{"is_demo":true,"historical_scenario":true}'::jsonb
from public.registrations r where r.id='77777777-7777-7777-7777-777777777851'
on conflict(id) do nothing;
insert into public.event_pass_attendance(pass_id,checked_in_by,checked_in_at)
select p.id,staff.id,'2026-09-28T10:15:00+06:00'
from public.event_passes p join public.registrations r on r.id=p.registration_id
cross join (select id from public.profiles where email='staff@festivo.org') staff
where r.id='77777777-7777-7777-7777-777777777852'
on conflict(pass_id) do nothing;

-- Existing waitlist demand was created by the old seed but capacity was never
-- filled. Add one properly snapshotted confirmed team per event; no existing
-- registration or waitlist position is rewritten.
do $$
declare v_event uuid; v_team uuid; v_reg uuid; v_captain uuid; v_member uuid;
begin
  select id into v_captain from public.profiles where email='participant1@festivo.org';
  select id into v_member from public.profiles where email='participant2@festivo.org';
  if v_captain is null or v_member is null then raise exception 'Demo participant profiles missing'; end if;
  for v_event,v_team,v_reg in
    select * from (values
      ('77777777-7777-7777-7777-777777777302'::uuid,'88888888-8888-8888-8888-888888888302'::uuid,'77777777-7777-7777-7777-777777777870'::uuid),
      ('77777777-7777-7777-7777-777777777502'::uuid,'88888888-8888-8888-8888-888888888502'::uuid,'77777777-7777-7777-7777-777777777871'::uuid)
    ) fixture(event_id,team_id,registration_id)
  loop
    insert into public.event_teams(id,event_id,captain_id,name,status)
      values(v_team,v_event,v_captain,'Judging Demo Pair','submitted') on conflict(id) do nothing;
    insert into public.event_team_members(team_id,event_id,user_id,is_captain,status,rules_accepted_hash,rules_accepted_at)
      select v_team,v_event,m.user_id,m.is_captain,'accepted',md5(e.rules),'2026-10-08T10:00:00+06:00'
      from (values(v_captain,true),(v_member,false)) m(user_id,is_captain)
      cross join public.events e where e.id=v_event
      on conflict(team_id,user_id) do nothing;
    insert into public.registrations(id,event_id,participant_id,team_id,status,registered_at,confirmed_at,metadata)
      values(v_reg,v_event,v_captain,v_team,'confirmed','2026-10-08T10:00:00+06:00',
        '2026-10-08T10:00:00+06:00','{"is_demo":true,"timeline_fixture":true}'::jsonb)
      on conflict(id) do nothing;
    insert into public.team_roster_snapshots(registration_id,user_id,full_name,email,is_captain,
      rules_accepted_hash,accepted_at)
      select v_reg,p.id,coalesce(p.full_name,'Demo Participant'),coalesce(p.email,''),
        p.id=v_captain,md5(e.rules),'2026-10-08T10:00:00+06:00'
      from public.profiles p cross join public.events e
      where e.id=v_event and p.id in (v_captain,v_member)
      on conflict(registration_id,user_id) do nothing;
  end loop;
end $$;
commit;`

const projectRef = new URL(env.SUPABASE_URL).hostname.split('.')[0]
const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST', headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
})
if (!response.ok) throw new Error(`Demo timeline update failed: ${await response.text()}`)
const after = await realSnapshot()
assert.deepEqual(after, before, 'Real DRMC fest or event changed')
console.log(`Demo timeline refreshed; ${before ? 'real DRMC fest and official event rows unchanged' : 'no real DRMC fest found'}.`)
