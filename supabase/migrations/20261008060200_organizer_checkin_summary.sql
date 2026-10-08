-- Organizer dashboard reads per-person gate attendance from saved pass scans.
create function public.organization_check_in_summary(p_organization_id uuid)
returns table(registration_id uuid, confirmed_people bigint, checked_in_people bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.current_user_is_organizer(p_organization_id) then
    raise exception 'organizer_not_authorized' using errcode = 'P0001';
  end if;
  return query
    select r.id, count(p.id) filter (where p.revoked_at is null),
      count(a.pass_id) filter (where p.revoked_at is null)
    from public.registrations r
    join public.events e on e.id = r.event_id
    join public.fests f on f.id = e.fest_id
    left join public.event_passes p on p.registration_id = r.id
    left join public.event_pass_attendance a on a.pass_id = p.id
    where f.organization_id = p_organization_id and r.status = 'confirmed'::public.registration_status
    group by r.id;
end; $$;
revoke all on function public.organization_check_in_summary(uuid) from public, anon;
grant execute on function public.organization_check_in_summary(uuid) to authenticated, service_role;
