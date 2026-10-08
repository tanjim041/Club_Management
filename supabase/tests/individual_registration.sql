-- Runs inside one transaction and rolls back every fixture and notification.
-- Requires at least four existing profiles in the selected test project.
begin;

do $test$
declare
  v_users uuid[];
  v_org uuid;
  v_fest uuid;
  v_event uuid;
  v_other uuid;
  v_probe uuid;
  v_reg uuid;
  v_status public.registration_status;
  v_position integer;
  v_count integer;
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
begin
  select array_agg(id) into v_users from (
    select id from public.profiles order by id limit 4
  ) picked;
  if cardinality(v_users) < 4 then raise exception 'Four profiles are required for the registration regression test'; end if;

  update public.profiles set full_name = coalesce(full_name, 'Test participant'),
    institution = coalesce(institution, 'Test Institute'),
    experience_level = 'beginner'::public.experience_level
  where id = any(v_users);

  insert into public.organizations (name, slug, owner_id, is_public_profile)
  values ('Registration regression fixture', 'registration-test-' || v_suffix, v_users[1], true)
  returning id into v_org;
  insert into public.fests (organization_id, title, slug, status, starts_at, ends_at)
  values (v_org, 'Registration regression fest', 'regression-fest', 'published',
          now() + interval '365 days', now() + interval '367 days')
  returning id into v_fest;
  insert into public.events
    (fest_id, title, slug, status, starts_at, ends_at, registration_opens_at,
     registration_closes_at, registration_mode, capacity, waitlist_enabled, rules)
  values
    (v_fest, 'Individual registration regression', 'individual-regression', 'published',
     now() + interval '365 days', now() + interval '365 days 2 hours',
     now() - interval '1 day', now() + interval '1 day', 'individual', 1, true, 'Follow event rules')
  returning id into v_event;

  perform set_config('request.jwt.claim.sub', v_users[1]::text, true);
  select registration_id, status into v_reg, v_status
  from public.register_individual_event(v_event, true);
  if v_status <> 'confirmed' then raise exception 'first registration was not confirmed'; end if;
  begin
    perform public.register_individual_event(v_event, true);
    raise exception 'duplicate was accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'already_registered' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', v_users[2]::text, true);
  select status, waitlist_position into v_status, v_position
  from public.register_individual_event(v_event, true);
  if v_status <> 'waitlisted' or v_position <> 1 then raise exception 'first waitlist ticket incorrect'; end if;
  perform set_config('request.jwt.claim.sub', v_users[3]::text, true);
  select status, waitlist_position into v_status, v_position
  from public.register_individual_event(v_event, true);
  if v_status <> 'waitlisted' or v_position <> 2 then raise exception 'second waitlist ticket incorrect'; end if;

  perform set_config('request.jwt.claim.sub', v_users[1]::text, true);
  perform public.cancel_individual_registration(v_reg, 'Cannot attend');
  select count(*) into v_count from public.registrations
  where event_id = v_event and participant_id = v_users[2] and status = 'confirmed';
  if v_count <> 1 then raise exception 'FIFO first candidate was not promoted'; end if;
  select count(*) into v_count from public.notifications
  where recipient_id = v_users[2] and event_id = v_event and kind = 'waitlist';
  if v_count <> 1 then raise exception 'promotion notification missing'; end if;

  perform set_config('request.jwt.claim.sub', v_users[2]::text, true);
  select id into v_reg from public.registrations where event_id = v_event and participant_id = v_users[2];
  perform public.cancel_individual_registration(v_reg, null);
  select count(*) into v_count from public.registrations
  where event_id = v_event and participant_id = v_users[3] and status = 'confirmed';
  if v_count <> 1 then raise exception 'FIFO second candidate was not promoted'; end if;

  -- No waitlist: the final place cannot be overbooked.
  insert into public.events
    (fest_id, title, slug, status, starts_at, ends_at, registration_mode,
     capacity, waitlist_enabled)
  values (v_fest, 'Capacity regression', 'capacity-regression', 'published',
          now() + interval '366 days', now() + interval '366 days 2 hours',
          'individual', 1, false)
  returning id into v_other;
  perform set_config('request.jwt.claim.sub', v_users[1]::text, true);
  perform public.register_individual_event(v_other, true);
  perform set_config('request.jwt.claim.sub', v_users[2]::text, true);
  begin
    perform public.register_individual_event(v_other, true);
    raise exception 'over-capacity registration was accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'event_full' then raise; end if;
  end;

  -- Server-side eligibility and cross-event schedule conflict policy.
  insert into public.events
    (fest_id, title, slug, status, starts_at, ends_at, registration_mode,
     capacity, blocks_schedule_conflicts, eligibility)
  values (v_fest, 'Conflict regression', 'conflict-regression', 'published',
          now() + interval '366 days 1 hour', now() + interval '366 days 3 hours',
          'individual', 8, true, '{}'::jsonb)
  returning id into v_probe;
  perform set_config('request.jwt.claim.sub', v_users[1]::text, true);
  begin
    perform public.register_individual_event(v_probe, true);
    raise exception 'schedule conflict was ignored';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'schedule_conflict' then raise; end if;
  end;
  update public.events set eligibility = '{"allowed_institutions":["Never Eligible Institute"]}'::jsonb
  where id = v_probe;
  perform set_config('request.jwt.claim.sub', v_users[4]::text, true);
  begin
    perform public.register_individual_event(v_probe, true);
    raise exception 'eligibility was ignored';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'institution_not_eligible' then raise; end if;
  end;

  -- A published event with an expired deadline must reject new entries.
  update public.events set registration_opens_at = now() - interval '2 days',
    registration_closes_at = now() - interval '1 day' where id = v_other;
  perform set_config('request.jwt.claim.sub', v_users[4]::text, true);
  begin
    perform public.register_individual_event(v_other, true);
    raise exception 'expired deadline was ignored';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'registration_closed' then raise; end if;
  end;

  -- A changed rules document pauses promotion for candidates who accepted
  -- only the older version. A closed deadline also pauses promotion.
  update public.events set rules = 'Updated event rules',
    registration_closes_at = now() - interval '1 hour'
  where id = v_event;
  -- The remaining confirmed participant can still cancel before event start.
  perform set_config('request.jwt.claim.sub', v_users[3]::text, true);
  select id into v_reg from public.registrations where event_id = v_event and participant_id = v_users[3];
  perform public.cancel_individual_registration(v_reg, null);
  select count(*) into v_count from public.registrations
  where event_id = v_event and status = 'confirmed';
  if v_count <> 0 then raise exception 'promotion continued past deadline'; end if;

  -- Restore the deadline; a future eligible registration may take the seat.
  update public.events set registration_closes_at = now() + interval '1 day' where id = v_event;
  perform set_config('request.jwt.claim.sub', v_users[4]::text, true);
  select status into v_status from public.register_individual_event(v_event, true);
  if v_status <> 'confirmed' then raise exception 'organizer-reopened deadline was not honored'; end if;

  -- Cancellation cutoff is independent of the registration deadline.
  update public.events set cancellation_closes_at = now() - interval '1 hour' where id = v_event;
  select id into v_reg from public.registrations where event_id = v_event and participant_id = v_users[4];
  begin
    perform public.cancel_individual_registration(v_reg, null);
    raise exception 'cancellation cutoff was ignored';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'cancellation_closed' then raise; end if;
  end;

  raise notice 'individual registration regression tests passed';
end;
$test$;

rollback;
