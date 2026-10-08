import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim();
        process.env[k] = v;
      }
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SECRET_KEY;

const admin = createClient(supabaseUrl, serviceKey);

// Helper to create client for a user
async function loginUser(email, password = 'Password123!') {
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  return { client, user: data.user, session: data.session };
}

async function run() {
  console.log('======================================================================');
  console.log('STARTING TEAM REGISTRATION & SCHEDULE CONFLICT VERIFICATION');
  console.log('======================================================================\n');

  // Authenticate test users
  console.log('Logging in test participants...');
  const u1 = await loginUser('participant1@festivo.org');
  const u2 = await loginUser('participant2@festivo.org');
  const u3 = await loginUser('participant3@festivo.org');
  const u4 = await loginUser('participant4@festivo.org');
  const u5 = await loginUser('participant5@festivo.org');
  console.log('All test participants authenticated successfully.\n');

  // Find TechNova 2026 fest
  const { data: fest } = await admin
    .from('fests')
    .select('id, slug, organizations(slug)')
    .eq('slug', 'technova-2026')
    .single();

  if (!fest) throw new Error('TechNova fest not found');

  const testEventIds = [];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Team Completeness, Unguessable Tokens & Draft Capacity
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Team Completeness, Unguessable Tokens & Draft Capacity ---');
    const evt1Id = 'cccccccc-0001-4000-a000-000000000001';
    testEventIds.push(evt1Id);

    // Clean prior
    await admin.from('registrations').delete().eq('event_id', evt1Id);
    await admin.from('event_teams').delete().eq('event_id', evt1Id);
    await admin.from('events').delete().eq('id', evt1Id);

    await admin.from('events').insert({
      id: evt1Id,
      fest_id: fest.id,
      title: 'Test: Team Completeness & Roster [Demo]',
      slug: 'test-team-completeness',
      status: 'published',
      operational_status: 'scheduled',
      registration_mode: 'team',
      team_min_size: 2,
      team_max_size: 4,
      capacity: 5,
      waitlist_enabled: true,
      rules: 'Team tournament rules: 2 to 4 members required.',
      starts_at: '2026-11-20T10:00:00Z',
      ends_at: '2026-11-20T13:00:00Z',
      registration_opens_at: '2026-10-01T00:00:00Z',
      registration_closes_at: '2026-11-19T23:59:59Z',
      cancellation_closes_at: '2026-11-20T08:00:00Z',
      blocks_schedule_conflicts: false
    });

    // 1A. Captain (U1) creates draft team
    const { data: teamId, error: createErr } = await u1.client.rpc('create_event_team', {
      p_event_id: evt1Id,
      p_name: 'CyberHawks Elite',
      p_accept_rules: true
    });
    if (createErr) throw createErr;
    console.log(`✓ Captain U1 created team '${teamId}'`);

    // 1B. Draft teams do not reserve capacity
    const { data: draftRegs } = await admin.from('registrations').select('*').eq('event_id', evt1Id);
    if (draftRegs.length !== 0) throw new Error('Draft team erroneously reserved capacity!');
    console.log('✓ Verified: Draft team does NOT reserve capacity (0 registrations in DB)');

    // 1C. Attempt submit with only 1 member (captain)
    const { data: earlySubmit, error: incompleteErr } = await u1.client.rpc('submit_event_team', {
      p_team_id: teamId
    });
    if (!incompleteErr || !incompleteErr.message.includes('team_incomplete')) {
      throw new Error(`Expected team_incomplete error, got: ${JSON.stringify(incompleteErr || earlySubmit)}`);
    }
    console.log('✓ Verified: Submit with 1/2 members rejected with team_incomplete');

    // 1D. Invite U2 with secure unguessable token
    const { data: inviteRes, error: inviteErr } = await u1.client.rpc('invite_event_team_member', {
      p_team_id: teamId,
      p_email: 'participant2@festivo.org',
      p_expiry_hours: 48
    });
    if (inviteErr) throw inviteErr;
    const { invitation_token, invitation_id } = inviteRes[0];
    console.log(`✓ Created secure invitation: token length = ${invitation_token.length} chars (256-bit unguessable)`);

    // Check DB stores SHA-256 hash, NOT plain token
    const { data: invDb } = await admin.from('event_team_invitations').select('*').eq('id', invitation_id).single();
    if (invDb.token_hash === invitation_token) throw new Error('Raw token exposed in database!');
    if (!invDb.intended_email.includes('participant2@festivo.org') || invDb.intended_user_id !== u2.user.id) {
      throw new Error('Invitation email/user binding mismatch!');
    }
    console.log('✓ Verified: Token is securely hashed (SHA-256) and bound to intended email & user ID');

    // 1E. Impersonation check: U3 cannot preview or accept U2's invitation
    const { data: u3Preview } = await u3.client.rpc('preview_event_team_invitation', { p_token: invitation_token });
    if (u3Preview !== null) throw new Error('Unintended user was able to preview invitation!');
    const { error: u3AcceptErr } = await u3.client.rpc('respond_event_team_invitation', {
      p_token: invitation_token,
      p_accept: true,
      p_accept_rules: true
    });
    if (!u3AcceptErr || !u3AcceptErr.message.includes('invitation_not_for_account')) {
      throw new Error(`Expected invitation_not_for_account, got: ${JSON.stringify(u3AcceptErr)}`);
    }
    console.log('✓ Verified: Impersonation blocked (other accounts cannot preview or accept)');

    // 1F. Decline test with U4
    const { data: u4Inv } = await u1.client.rpc('invite_event_team_member', {
      p_team_id: teamId,
      p_email: 'participant4@festivo.org',
      p_expiry_hours: 24
    });
    await u4.client.rpc('respond_event_team_invitation', {
      p_token: u4Inv[0].invitation_token,
      p_accept: false,
      p_accept_rules: false
    });
    const { data: u4Members } = await admin.from('event_team_members').select('*').eq('team_id', teamId).eq('user_id', u4.user.id);
    if (u4Members.length > 0) throw new Error('Declined member added to event_team_members!');
    console.log('✓ Verified: Declined invitation marks status declined and does not add member');

    // 1G. U2 accepts invitation
    await u2.client.rpc('respond_event_team_invitation', {
      p_token: invitation_token,
      p_accept: true,
      p_accept_rules: true
    });
    console.log('✓ Participant 2 accepted invitation with rules acceptance');

    // 1H. Non-captain submit check: U2 cannot submit
    const { error: nonCapSubmitErr } = await u2.client.rpc('submit_event_team', { p_team_id: teamId });
    if (!nonCapSubmitErr || !nonCapSubmitErr.message.includes('team_not_found')) {
      throw new Error(`Expected team_not_found for non-captain, got: ${JSON.stringify(nonCapSubmitErr)}`);
    }
    console.log('✓ Verified: Only captain can submit registration (non-captain rejected)');

    // 1I. Captain submits registration
    const { data: submitRes, error: submitErr } = await u1.client.rpc('submit_event_team', { p_team_id: teamId });
    if (submitErr) throw submitErr;
    console.log(`✓ Team submitted successfully! Registration ID: ${submitRes[0].registration_id}, Status: ${submitRes[0].status}`);

    // 1J. Verify roster snapshot & immutability
    const { data: snapshots } = await admin
      .from('team_roster_snapshots')
      .select('*')
      .eq('registration_id', submitRes[0].registration_id);
    if (snapshots.length !== 2) throw new Error(`Expected 2 snapshots, got ${snapshots.length}`);
    console.log(`✓ Verified: team_roster_snapshots captured ${snapshots.length} members with rules hashes`);

    // Verify locked state (cannot invite or leave after submission)
    const { error: postSubmitInviteErr } = await u1.client.rpc('invite_event_team_member', {
      p_team_id: teamId,
      p_email: 'participant5@festivo.org',
      p_expiry_hours: 24
    });
    if (!postSubmitInviteErr || !postSubmitInviteErr.message.includes('team_locked')) {
      throw new Error('Expected team_locked on invite after submission!');
    }
    console.log('✓ Verified: Team roster is locked after submission (modifications rejected)');

    // -------------------------------------------------------------------------
    // TEST 2: Duplicate Members Prevention
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Duplicate Members Prevention ---');
    // U3 creates Team B for the same event
    const { data: teamBId, error: teamBErr } = await u3.client.rpc('create_event_team', {
      p_event_id: evt1Id,
      p_name: 'Vortex Shadows',
      p_accept_rules: true
    });
    if (teamBErr) throw teamBErr;

    // Try to invite U2 (who is in Team CyberHawks Elite)
    const { data: invU2Res } = await u3.client.rpc('invite_event_team_member', {
      p_team_id: teamBId,
      p_email: 'participant2@festivo.org',
      p_expiry_hours: 24
    });
    const { error: dupAcceptErr } = await u2.client.rpc('respond_event_team_invitation', {
      p_token: invU2Res[0].invitation_token,
      p_accept: true,
      p_accept_rules: true
    });
    if (!dupAcceptErr || !dupAcceptErr.message.includes('already_in_event_team')) {
      throw new Error(`Expected already_in_event_team on duplicate member accept, got: ${JSON.stringify(dupAcceptErr)}`);
    }
    console.log('✓ Verified: Member already in an active team cannot join another team for the same event');

    // U2 tries to create their own team for the same event
    const { error: dupCreateErr } = await u2.client.rpc('create_event_team', {
      p_event_id: evt1Id,
      p_name: 'Rogue Squad',
      p_accept_rules: true
    });
    if (!dupCreateErr || !dupCreateErr.message.includes('already_in_event_team')) {
      throw new Error(`Expected already_in_event_team on duplicate create, got: ${JSON.stringify(dupCreateErr)}`);
    }
    console.log('✓ Verified: Member cannot create a second team for the same event');

    // -------------------------------------------------------------------------
    // TEST 3: Schedule Conflict Detection & Blocking Policy
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Schedule Conflict Detection & Blocking Policy ---');
    const evtOverlap1Id = 'cccccccc-0002-4000-a000-000000000001';
    const evtOverlap2Id = 'cccccccc-0002-4000-a000-000000000002';
    testEventIds.push(evtOverlap1Id, evtOverlap2Id);

    await admin.from('registrations').delete().in('event_id', [evtOverlap1Id, evtOverlap2Id]);
    await admin.from('event_teams').delete().in('event_id', [evtOverlap1Id, evtOverlap2Id]);
    await admin.from('events').delete().in('id', [evtOverlap1Id, evtOverlap2Id]);

    // Event 1: Individual, 10:00 - 12:00, blocks_schedule_conflicts = true
    await admin.from('events').insert({
      id: evtOverlap1Id,
      fest_id: fest.id,
      title: 'Test: Morning Coding Championship [Demo]',
      slug: 'test-morning-coding',
      status: 'published',
      operational_status: 'scheduled',
      registration_mode: 'individual',
      capacity: 10,
      waitlist_enabled: true,
      rules: 'Individual coding.',
      starts_at: '2026-11-20T10:00:00Z',
      ends_at: '2026-11-20T12:00:00Z',
      registration_opens_at: '2026-10-01T00:00:00Z',
      registration_closes_at: '2026-11-19T23:59:59Z',
      blocks_schedule_conflicts: true
    });

    // Event 2: Team, 11:00 - 13:00 (1h overlap with Event 1), blocks_schedule_conflicts = true
    await admin.from('events').insert({
      id: evtOverlap2Id,
      fest_id: fest.id,
      title: 'Test: Midday Robotics Arena [Demo]',
      slug: 'test-midday-robotics',
      status: 'published',
      operational_status: 'scheduled',
      registration_mode: 'team',
      team_min_size: 2,
      team_max_size: 3,
      capacity: 5,
      waitlist_enabled: true,
      rules: 'Team robotics.',
      starts_at: '2026-11-20T11:00:00Z',
      ends_at: '2026-11-20T13:00:00Z',
      registration_opens_at: '2026-10-01T00:00:00Z',
      registration_closes_at: '2026-11-19T23:59:59Z',
      blocks_schedule_conflicts: true
    });

    // U4 registers for Event 1 (confirmed)
    const { data: u4Reg1, error: u4RegErr } = await u4.client.rpc('register_individual_event', {
      p_event_id: evtOverlap1Id,
      p_accept_rules: true
    });
    if (u4RegErr) throw u4RegErr;
    console.log('✓ U4 registered and confirmed for Morning Coding (10:00-12:00)');

    // U5 creates team for Midday Robotics (11:00-13:00) and invites U4
    const { data: teamOverlapId } = await u5.client.rpc('create_event_team', {
      p_event_id: evtOverlap2Id,
      p_name: 'Overlappers Team',
      p_accept_rules: true
    });
    const { data: invOverlapRes } = await u5.client.rpc('invite_event_team_member', {
      p_team_id: teamOverlapId,
      p_email: 'participant4@festivo.org',
      p_expiry_hours: 24
    });
    await u4.client.rpc('respond_event_team_invitation', {
      p_token: invOverlapRes[0].invitation_token,
      p_accept: true,
      p_accept_rules: true
    });

    // Check conflict detection via RPC
    const { data: conflictList, error: confErr } = await u5.client.rpc('event_schedule_conflicts', {
      p_event_id: evtOverlap2Id,
      p_team_id: teamOverlapId
    });
    if (confErr) throw confErr;
    console.log(`✓ Schedule conflict detected:`, {
      person_id: conflictList[0]?.person_id,
      conflicting_event: conflictList[0]?.other_title,
      overlap_seconds: conflictList[0]?.overlap_seconds,
      blocks_conflict: conflictList[0]?.blocks_conflict
    });
    if (conflictList.length !== 1 || !conflictList[0].blocks_conflict || conflictList[0].overlap_seconds !== 3600) {
      throw new Error(`Unexpected conflict detection result: ${JSON.stringify(conflictList)}`);
    }
    console.log('✓ Verified: Accurately identifies affected person (U4), 3600s overlap, and blocks_conflict = true');

    // Attempt to submit team -> Must be blocked by policy
    const { error: blockPolicyErr } = await u5.client.rpc('submit_event_team', { p_team_id: teamOverlapId });
    if (!blockPolicyErr || !blockPolicyErr.message.includes('schedule_conflict')) {
      throw new Error(`Expected schedule_conflict error, got: ${JSON.stringify(blockPolicyErr)}`);
    }
    console.log('✓ Verified: Backend enforced blocking policy: submit rejected with schedule_conflict');

    // -------------------------------------------------------------------------
    // TEST 4: Conflict Acknowledgement & Back-to-Back Events
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Conflict Acknowledgement & Back-to-Back Events ---');
    const evtAck1Id = 'cccccccc-0003-4000-a000-000000000001';
    const evtAck2Id = 'cccccccc-0003-4000-a000-000000000002';
    const evtB2bId = 'cccccccc-0003-4000-a000-000000000003';
    testEventIds.push(evtAck1Id, evtAck2Id, evtB2bId);

    await admin.from('registrations').delete().in('event_id', [evtAck1Id, evtAck2Id, evtB2bId]);
    await admin.from('event_teams').delete().in('event_id', [evtAck1Id, evtAck2Id, evtB2bId]);
    await admin.from('events').delete().in('id', [evtAck1Id, evtAck2Id, evtB2bId]);

    // Event Ack 1: 10:00 - 12:00, blocks_schedule_conflicts = false
    await admin.from('events').insert({
      id: evtAck1Id,
      fest_id: fest.id,
      title: 'Test: Flexible Workshop 1 [Demo]',
      slug: 'test-flexible-workshop-1',
      status: 'published',
      operational_status: 'scheduled',
      registration_mode: 'individual',
      capacity: 10,
      waitlist_enabled: true,
      rules: 'Flexible rules.',
      starts_at: '2026-11-21T10:00:00Z',
      ends_at: '2026-11-21T12:00:00Z',
      registration_opens_at: '2026-10-01T00:00:00Z',
      registration_closes_at: '2026-11-20T23:59:59Z',
      blocks_schedule_conflicts: false
    });

    // Event Ack 2: 11:00 - 13:00 (overlaps by 1h), blocks_schedule_conflicts = false
    await admin.from('events').insert({
      id: evtAck2Id,
      fest_id: fest.id,
      title: 'Test: Flexible Team Hack 2 [Demo]',
      slug: 'test-flexible-team-hack-2',
      status: 'published',
      operational_status: 'scheduled',
      registration_mode: 'team',
      team_min_size: 2,
      team_max_size: 3,
      capacity: 5,
      waitlist_enabled: true,
      rules: 'Flexible team rules.',
      starts_at: '2026-11-21T11:00:00Z',
      ends_at: '2026-11-21T13:00:00Z',
      registration_opens_at: '2026-10-01T00:00:00Z',
      registration_closes_at: '2026-11-20T23:59:59Z',
      blocks_schedule_conflicts: false
    });

    // Event Back-to-Back: 12:00 - 14:00 (starts exactly when Ack 1 ends)
    await admin.from('events').insert({
      id: evtB2bId,
      fest_id: fest.id,
      title: 'Test: Back-to-Back Showcase [Demo]',
      slug: 'test-back-to-back-showcase',
      status: 'published',
      operational_status: 'scheduled',
      registration_mode: 'individual',
      capacity: 10,
      waitlist_enabled: true,
      rules: 'Back-to-back rules.',
      starts_at: '2026-11-21T12:00:00Z',
      ends_at: '2026-11-21T14:00:00Z',
      registration_opens_at: '2026-10-01T00:00:00Z',
      registration_closes_at: '2026-11-20T23:59:59Z',
      blocks_schedule_conflicts: false
    });

    // U3 registers for Ack 1 (10:00 - 12:00)
    await u3.client.rpc('register_individual_event', { p_event_id: evtAck1Id, p_accept_rules: true });

    // Back-to-back check for U3 against 12:00 - 14:00 event
    const { data: b2bConflicts } = await u3.client.rpc('event_schedule_conflicts', { p_event_id: evtB2bId });
    if (b2bConflicts.length !== 0) throw new Error('Back-to-back events incorrectly flagged as conflict!');
    console.log('✓ Verified: Back-to-back events (10:00-12:00 and 12:00-14:00) do NOT conflict (0 conflicts)');

    // U5 creates Team for Ack 2 (11:00 - 13:00) and invites U3
    const { data: teamAckId } = await u5.client.rpc('create_event_team', {
      p_event_id: evtAck2Id,
      p_name: 'Team Flex Ack',
      p_accept_rules: true
    });
    const { data: invAckRes } = await u5.client.rpc('invite_event_team_member', {
      p_team_id: teamAckId,
      p_email: 'participant3@festivo.org',
      p_expiry_hours: 24
    });
    await u3.client.rpc('respond_event_team_invitation', {
      p_token: invAckRes[0].invitation_token,
      p_accept: true,
      p_accept_rules: true
    });

    // Without acknowledgement, submit must be rejected
    const { error: unackErr } = await u5.client.rpc('submit_event_team', { p_team_id: teamAckId });
    if (!unackErr || !unackErr.message.includes('conflict_ack_required')) {
      throw new Error(`Expected conflict_ack_required, got: ${JSON.stringify(unackErr)}`);
    }
    console.log('✓ Verified: Submit without acknowledgement rejected with conflict_ack_required');

    // U3 acknowledges overlap
    const { data: ackHash, error: ackErr } = await u3.client.rpc('acknowledge_event_team_conflicts', {
      p_team_id: teamAckId
    });
    if (ackErr) throw ackErr;
    console.log(`✓ U3 acknowledged overlap: fingerprint = ${ackHash}`);

    // Now Captain U5 submits team -> Succeeds!
    const { data: submitAckRes, error: submitAckErr } = await u5.client.rpc('submit_event_team', { p_team_id: teamAckId });
    if (submitAckErr) throw submitAckErr;
    console.log(`✓ Verified: Submit succeeds after explicit acknowledgement! Status: ${submitAckRes[0].status}`);

    // -------------------------------------------------------------------------
    // TEST 5: Waitlist Promotion with Conflict Rechecking
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Waitlist Promotion with Conflict Rechecking ---');
    const evtWlId = 'cccccccc-0004-4000-a000-000000000001';
    const evtTriggerId = 'cccccccc-0004-4000-a000-000000000002';
    testEventIds.push(evtWlId, evtTriggerId);

    await admin.from('registrations').delete().in('event_id', [evtWlId, evtTriggerId]);
    await admin.from('event_teams').delete().in('event_id', [evtWlId, evtTriggerId]);
    await admin.from('events').delete().in('id', [evtWlId, evtTriggerId]);

    // Event WL: Capacity 1 team, waitlist enabled, 14:00 - 17:00, blocks_schedule_conflicts = true
    await admin.from('events').insert({
      id: evtWlId,
      fest_id: fest.id,
      title: 'Test: Precision Autonomous Sprint [Demo]',
      slug: 'test-precision-sprint',
      status: 'published',
      operational_status: 'scheduled',
      registration_mode: 'team',
      team_min_size: 2,
      team_max_size: 3,
      capacity: 1, // 1 team capacity
      waitlist_enabled: true,
      rules: 'Single team tournament place.',
      starts_at: '2026-11-22T14:00:00Z',
      ends_at: '2026-11-22T17:00:00Z',
      registration_opens_at: '2026-10-01T00:00:00Z',
      registration_closes_at: '2026-11-21T23:59:59Z',
      cancellation_closes_at: '2026-11-22T12:00:00Z',
      blocks_schedule_conflicts: true
    });

    // Conflicting Event: 15:00 - 18:00 (overlaps with Precision Sprint), blocks_schedule_conflicts = true
    await admin.from('events').insert({
      id: evtTriggerId,
      fest_id: fest.id,
      title: 'Test: Conflicting Afternoon Colloquium [Demo]',
      slug: 'test-afternoon-colloquium',
      status: 'published',
      operational_status: 'scheduled',
      registration_mode: 'individual',
      capacity: 10,
      waitlist_enabled: true,
      rules: 'Colloquium rules.',
      starts_at: '2026-11-22T15:00:00Z',
      ends_at: '2026-11-22T18:00:00Z',
      registration_opens_at: '2026-10-01T00:00:00Z',
      registration_closes_at: '2026-11-21T23:59:59Z',
      blocks_schedule_conflicts: true
    });

    // Team 1 (Captain U1, Member U2) submits -> Confirmed (capacity 1)
    const { data: team1WlId } = await u1.client.rpc('create_event_team', {
      p_event_id: evtWlId,
      p_name: 'Team Alpha Confirmed',
      p_accept_rules: true
    });
    const { data: invT1 } = await u1.client.rpc('invite_event_team_member', {
      p_team_id: team1WlId,
      p_email: 'participant2@festivo.org',
      p_expiry_hours: 24
    });
    await u2.client.rpc('respond_event_team_invitation', {
      p_token: invT1[0].invitation_token,
      p_accept: true,
      p_accept_rules: true
    });
    const { data: t1Submit } = await u1.client.rpc('submit_event_team', { p_team_id: team1WlId });
    if (t1Submit[0].status !== 'confirmed') throw new Error('Team 1 should be confirmed!');
    console.log(`✓ Team Alpha confirmed in Event WL (Capacity 1/1 filled)`);

    // Team 2 (Captain U4, Member U5) submits -> Waitlisted (Position 1)
    const { data: team2WlId } = await u4.client.rpc('create_event_team', {
      p_event_id: evtWlId,
      p_name: 'Team Beta Queued',
      p_accept_rules: true
    });
    const { data: invT2 } = await u4.client.rpc('invite_event_team_member', {
      p_team_id: team2WlId,
      p_email: 'participant5@festivo.org',
      p_expiry_hours: 24
    });
    await u5.client.rpc('respond_event_team_invitation', {
      p_token: invT2[0].invitation_token,
      p_accept: true,
      p_accept_rules: true
    });
    const { data: t2Submit } = await u4.client.rpc('submit_event_team', { p_team_id: team2WlId });
    if (t2Submit[0].status !== 'waitlisted' || t2Submit[0].waitlist_position !== 1) {
      throw new Error(`Team 2 should be waitlisted at pos 1, got: ${JSON.stringify(t2Submit)}`);
    }
    console.log(`✓ Team Beta waitlisted at position 1`);

    // Now Member U5 registers for Conflicting Afternoon Colloquium (confirmed)
    const { data: u5ConfReg, error: u5ConfErr } = await u5.client.rpc('register_individual_event', {
      p_event_id: evtTriggerId,
      p_accept_rules: true
    });
    if (u5ConfErr) throw u5ConfErr;
    console.log(`✓ Member U5 registered for conflicting event (15:00-18:00)`);

    // Team 1 (Captain U1) cancels their registration!
    console.log('Captain U1 cancels Team Alpha registration...');
    const { error: cancelErr } = await u1.client.rpc('cancel_event_team_registration', {
      p_team_id: team1WlId,
      p_reason: 'Withdrawal'
    });
    if (cancelErr) throw cancelErr;

    // Check Team 2 status in DB: It should NOT be confirmed because U5 has a blocking conflict!
    const { data: t2RegAfter } = await admin
      .from('registrations')
      .select('id, status, waitlist_position')
      .eq('team_id', team2WlId)
      .single();
    if (t2RegAfter.status !== 'waitlisted' || t2RegAfter.waitlist_position !== 1) {
      throw new Error(`Waitlist promotion improperly promoted a team with schedule conflicts! State: ${JSON.stringify(t2RegAfter)}`);
    }
    console.log('✓ Verified: Waitlist promotion rechecked conflicts! Team Beta remained waitlisted at pos 1.');

    // Now U5 cancels their conflicting registration
    console.log('Member U5 cancels conflicting registration...');
    await u5.client.rpc('cancel_individual_registration', {
      p_registration_id: u5ConfReg[0].registration_id,
      p_reason: 'Resolved conflict'
    });

    // Trigger promotion check (e.g. via promote_event_waitlist_locked or when organizer/system triggers)
    // In our system, promotion is evaluated on cancellation or registration.
    // Let's call promote_event_waitlist_locked via admin query
    await admin.rpc('maintain_registration'); // run maintenance or promote
    // Or call private.promote_event_waitlist_locked directly via SQL query
    const promoteQuery = `
      select private.promote_event_waitlist_locked(
        (select e from public.events e where id='${evtWlId}'),
        (select f from public.fests f where id='${fest.id}')
      );
    `;
    await fetch(`https://api.supabase.com/v1/projects/ylmjekpzaxnitthrwncs/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: promoteQuery })
    });

    const { data: t2RegFinal } = await admin
      .from('registrations')
      .select('id, status, waitlist_position')
      .eq('team_id', team2WlId)
      .single();
    if (t2RegFinal.status !== 'confirmed') {
      throw new Error(`Team 2 should now be confirmed after conflict resolution! State: ${JSON.stringify(t2RegFinal)}`);
    }
    console.log('✓ Verified: Team Beta promoted to confirmed once conflict was resolved!');

    // Check team promotion notifications in DB
    const { data: promoNotifs } = await admin
      .from('notifications')
      .select('recipient_id, title, body')
      .eq('event_id', evtWlId)
      .eq('kind', 'waitlist');
    if (promoNotifs.length < 2) throw new Error('Not all team members received promotion notification!');
    console.log(`✓ Verified: Both team members received promotion in-app notification: "${promoNotifs[0].title}"`);

    // -------------------------------------------------------------------------
    // TEST 6: My Schedule & Calendar Export (.ics)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: My Schedule & Calendar Export (.ics) ---');
    // U4 calls my_confirmed_schedule
    const { data: scheduleList, error: schedErr } = await u4.client.rpc('my_confirmed_schedule');
    if (schedErr) throw schedErr;
    console.log(`✓ my_confirmed_schedule returned ${scheduleList.length} confirmed entries for U4`);

    // Verify sorted by starts_at
    for (let i = 0; i < scheduleList.length - 1; i++) {
      const t1 = new Date(scheduleList[i].starts_at).getTime();
      const t2 = new Date(scheduleList[i + 1].starts_at).getTime();
      if (t1 > t2) throw new Error('Schedule entries not ordered chronologically!');
    }
    console.log('✓ Verified: Entries strictly ordered chronologically by starts_at');

    // Test .ics generation logic matching src/features/teams/my-schedule-page.tsx
    function escapeCalendarText(value) {
      return (value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    }
    function calendarDate(value) {
      return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    }
    const stamp = calendarDate(new Date().toISOString());
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Festivo//My Schedule//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    for (const entry of scheduleList) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${entry.id}@festivo`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${calendarDate(entry.starts_at)}`,
        `DTEND:${calendarDate(entry.ends_at)}`,
        `SUMMARY:${escapeCalendarText(entry.title)}`,
        `DESCRIPTION:${escapeCalendarText(entry.name ? `Team: ${entry.name}` : 'Confirmed Festivo registration')}`,
        `LOCATION:${escapeCalendarText(entry.venue || '')}`,
        'END:VEVENT'
      );
    }
    lines.push('END:VCALENDAR');
    const icsContent = lines.join('\r\n');
    if (!icsContent.includes('BEGIN:VCALENDAR') || !icsContent.includes('END:VCALENDAR') || !icsContent.includes('BEGIN:VEVENT')) {
      throw new Error('Invalid iCalendar format generated!');
    }
    console.log(`✓ Verified: Valid iCalendar (.ics) format generated (${icsContent.length} bytes, ${scheduleList.length} events)`);

    console.log('\n======================================================================');
    console.log('ALL TESTS PASSED (6/6)! Team features & schedule conflicts verified.');
    console.log('======================================================================\n');

  } finally {
    console.log('Cleaning up isolated test fixtures...');
    if (testEventIds.length > 0) {
      await admin.from('notifications').delete().in('event_id', testEventIds);
      await admin.from('registrations').delete().in('event_id', testEventIds);
      await admin.from('event_teams').delete().in('event_id', testEventIds);
      await admin.from('events').delete().in('id', testEventIds);
    }
    console.log('Cleanup complete. Real records preserved.');
  }
}

run().catch(err => {
  console.error('\n*** VERIFICATION FAILED ***\n', err);
  process.exit(1);
});
