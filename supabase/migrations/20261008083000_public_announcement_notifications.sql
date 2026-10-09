begin;
-- Public updates remain publicly readable; currently registered participants
-- also get a private inbox copy when the update is fest/event scoped.
create function private.notify_public_announcement() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.audience = 'public' and new.fest_id is not null then
    insert into public.notifications(recipient_id, organization_id, fest_id, event_id, kind, title, body, data)
    select distinct people.user_id, new.organization_id, new.fest_id, new.event_id,
      'announcement'::public.notification_kind, new.title, new.body,
      jsonb_build_object('announcement_id',new.id)
    from (
      select r.participant_id as user_id from public.registrations r
      join public.events e on e.id=r.event_id
      where e.fest_id=new.fest_id and (new.event_id is null or e.id=new.event_id)
        and r.status in ('confirmed'::public.registration_status,'waitlisted'::public.registration_status)
      union
      select s.user_id from public.team_roster_snapshots s
      join public.registrations r on r.id=s.registration_id
      join public.events e on e.id=r.event_id
      where e.fest_id=new.fest_id and (new.event_id is null or e.id=new.event_id)
        and r.status in ('confirmed'::public.registration_status,'waitlisted'::public.registration_status)
    ) people;
  end if;
  return new;
end; $$;
create trigger notify_public_announcement_after_insert
  after insert on public.operational_announcements
  for each row execute function private.notify_public_announcement();
commit;
