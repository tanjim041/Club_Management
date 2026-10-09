begin;
create function public.help_desk_assignable_staff(p_organization_id uuid)
returns table(user_id uuid, full_name text, staff_role public.organization_member_role)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.current_user_is_organizer(p_organization_id) then
    raise exception 'organizer_not_authorized' using errcode='P0001';
  end if;
  return query select m.user_id, coalesce(p.full_name, 'Staff member'), m.role
    from public.organization_memberships m join public.profiles p on p.id=m.user_id
    where m.organization_id=p_organization_id and m.is_active
    order by p.full_name, m.user_id;
end; $$;
revoke all on function public.help_desk_assignable_staff(uuid) from public;
grant execute on function public.help_desk_assignable_staff(uuid) to authenticated;
commit;
