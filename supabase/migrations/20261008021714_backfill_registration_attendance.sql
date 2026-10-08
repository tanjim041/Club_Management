-- Preserve legacy verified attendance while moving its source of truth to the
-- dedicated table. The old metadata is retained for audit/history.
begin;

insert into public.registration_attendance (registration_id, verified_at, notes)
select r.id,
       (r.metadata ->> 'checked_in_at')::timestamptz,
       'Backfilled from legacy registration metadata'
from public.registrations r
where r.metadata ->> 'attendance_status' = 'verified'
  and r.metadata ->> 'checked_in_at' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
on conflict (registration_id) do nothing;

commit;
