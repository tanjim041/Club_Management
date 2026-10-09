begin;
create unique index passport_verifications_one_source_idx on public.passport_verifications
  (user_id, organization_id, kind, coalesce(event_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(title));
drop policy help_desk_own_or_organizer on public.help_desk_requests;
create policy help_desk_own_assignee_or_organizer on public.help_desk_requests for select to authenticated
  using (submitter_id = auth.uid() or assigned_staff_id = auth.uid() or public.current_user_is_organizer(organization_id));
create or replace function public.verify_passport_item(p_user_id uuid, p_organization_id uuid, p_event_id uuid, p_kind text, p_title text)
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
  if p_kind = 'workshop' and (p_event_id is null or not exists (
    select 1 from public.registrations r where r.event_id=p_event_id and r.status='confirmed'::public.registration_status
      and (r.participant_id=p_user_id or exists (select 1 from public.team_roster_snapshots s where s.registration_id=r.id and s.user_id=p_user_id))
  )) then raise exception 'confirmed_participation_required' using errcode = 'P0001'; end if;
  insert into public.passport_verifications(user_id, organization_id, event_id, kind, title, verified_by)
    values(p_user_id,p_organization_id,p_event_id,p_kind,trim(p_title),auth.uid())
    on conflict do nothing returning id into v_id;
  if v_id is null then
    select id into v_id from public.passport_verifications where user_id=p_user_id and organization_id=p_organization_id
      and kind=p_kind and event_id is not distinct from p_event_id and lower(title)=lower(trim(p_title));
    return v_id;
  end if;
  v_xp := case when p_kind='workshop' then 30 else 50 end;
  insert into public.passport_reward_ledger(user_id,organization_id,source_kind,source_id,xp,label,awarded_by)
    values(p_user_id,p_organization_id,p_kind,v_id,v_xp,trim(p_title),auth.uid())
    on conflict (user_id, source_kind, source_id) do nothing;
  return v_id;
end; $$;
commit;
