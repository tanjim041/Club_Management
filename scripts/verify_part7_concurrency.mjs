import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf-8');
  for (const line of envContent.split(/\r?\n/)) {
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

async function loginUser(email, password = 'Password123!') {
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  return { client, user: data.user, session: data.session };
}

async function run() {
  console.log('======================================================================');
  console.log('STARTING PART 7: CONCURRENT TEAM SUBMISSION VERIFICATION');
  console.log('======================================================================\n');

  console.log('Logging in test participants...');
  const u1 = await loginUser('participant1@festivo.org');
  const u2 = await loginUser('participant2@festivo.org');
  const u3 = await loginUser('participant3@festivo.org');
  const u4 = await loginUser('participant4@festivo.org');
  console.log('Authenticated: U1 (P1), U2 (P2), U3 (P3), U4 (P4)\n');

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
    // TEST 1A: Concurrent Team Submission (Waitlist Enabled)
    // -------------------------------------------------------------------------
    console.log('--- TEST 1A: Concurrent Team Submission (Waitlist Enabled, Capacity = 1) ---');
    const evt1Id = 'dddddddd-0001-4000-a000-000000000001';
    testEventIds.push(evt1Id);

    // Clean prior
    await admin.from('team_roster_snapshots').delete().in('registration_id',
      (await admin.from('registrations').select('id').eq('event_id', evt1Id)).data?.map(r => r.id) || []
    );
    await admin.from('registrations').delete().eq('event_id', evt1Id);
    await admin.from('event_team_invitations').delete().in('team_id',
      (await admin.from('event_teams').select('id').eq('event_id', evt1Id)).data?.map(t => t.id) || []
    );
    await admin.from('event_team_members').delete().eq('event_id', evt1Id);
    await admin.from('event_teams').delete().eq('event_id', evt1Id);
    await admin.from('events').delete().eq('id', evt1Id);

    await admin.from('events').insert({
      id: evt1Id,
      fest_id: fest.id,
      title: 'Part 7: Concurrency Team Sprint (WL Enabled) [Demo]',
      slug: 'part7-concurrency-wl-enabled',
      status: 'published',
      operational_status: 'scheduled',
      registration_mode: 'team',
      team_min_size: 2,
      team_max_size: 3,
      capacity: 1, // Exactly 1 team capacity
      waitlist_enabled: true,
      rules: 'One team capacity. Waitlist enabled.',
      starts_at: '2026-11-25T10:00:00Z',
      ends_at: '2026-11-25T13:00:00Z',
      registration_opens_at: '2026-10-01T00:00:00Z',
      registration_closes_at: '2026-11-24T23:59:59Z',
      blocks_schedule_conflicts: false
    });

    // Create Team A (Captain: U1, Member: U2)
    const { data: teamAId } = await u1.client.rpc('create_event_team', {
      p_event_id: evt1Id,
      p_name: 'Team Alpha Concurrency',
      p_accept_rules: true
    });
    const { data: invARes } = await u1.client.rpc('invite_event_team_member', {
      p_team_id: teamAId,
      p_email: 'participant2@festivo.org',
      p_expiry_hours: 24
    });
    await u2.client.rpc('respond_event_team_invitation', {
      p_token: invARes[0].invitation_token,
      p_accept: true,
      p_accept_rules: true
    });

    // Create Team B (Captain: U3, Member: U4)
    const { data: teamBId } = await u3.client.rpc('create_event_team', {
      p_event_id: evt1Id,
      p_name: 'Team Beta Concurrency',
      p_accept_rules: true
    });
    const { data: invBRes } = await u3.client.rpc('invite_event_team_member', {
      p_team_id: teamBId,
      p_email: 'participant4@festivo.org',
      p_expiry_hours: 24
    });
    await u4.client.rpc('respond_event_team_invitation', {
      p_token: invBRes[0].invitation_token,
      p_accept: true,
      p_accept_rules: true
    });

    console.log('Two complete, eligible teams created. Firing concurrent submissions via Promise.all...');
    const [resA, resB] = await Promise.all([
      u1.client.rpc('submit_event_team', { p_team_id: teamAId }),
      u3.client.rpc('submit_event_team', { p_team_id: teamBId })
    ]);

    const teamASub = resA.data?.[0];
    const teamBSub = resB.data?.[0];

    console.log('Result Team A:', teamASub);
    console.log('Result Team B:', teamBSub);

    const statuses = [teamASub?.status, teamBSub?.status].sort();
    if (statuses[0] !== 'confirmed' || statuses[1] !== 'waitlisted') {
      throw new Error(`Expected exactly one confirmed and one waitlisted, got: ${JSON.stringify({ resA, resB })}`);
    }

    const confirmedTeam = teamASub?.status === 'confirmed' ? 'Team A' : 'Team B';
    const waitlistedTeam = teamASub?.status === 'waitlisted' ? 'Team A' : 'Team B';
    const waitlistPos = (teamASub?.status === 'waitlisted' ? teamASub : teamBSub)?.waitlist_position;

    console.log(`✓ Exactly one confirmed (${confirmedTeam}) and one waitlisted (${waitlistedTeam} at pos ${waitlistPos})`);

    // Verify database state: capacity and roster snapshots
    const { data: dbRegs1 } = await admin
      .from('registrations')
      .select('id, team_id, status, waitlist_position')
      .eq('event_id', evt1Id);

    if (dbRegs1.length !== 2) throw new Error(`Expected 2 DB registrations, got ${dbRegs1.length}`);
    const confirmedCount = dbRegs1.filter(r => r.status === 'confirmed').length;
    const waitlistedCount = dbRegs1.filter(r => r.status === 'waitlisted').length;
    if (confirmedCount !== 1 || waitlistedCount !== 1) {
      throw new Error(`DB counts incorrect: confirmed=${confirmedCount}, waitlisted=${waitlistedCount}`);
    }
    console.log(`✓ DB state verified: 1 confirmed registration, 1 waitlisted registration (capacity 1 enforced)`);

    // Verify roster snapshots for both registrations
    for (const reg of dbRegs1) {
      const { data: snaps } = await admin
        .from('team_roster_snapshots')
        .select('*')
        .eq('registration_id', reg.id);
      if (snaps.length !== 2) throw new Error(`Expected 2 roster snapshots for reg ${reg.id}, got ${snaps.length}`);
      const capCount = snaps.filter(s => s.is_captain).length;
      if (capCount !== 1) throw new Error('Expected exactly 1 captain in snapshot!');
      console.log(`✓ Roster snapshot verified for ${reg.status} team registration (${snaps.length} members, 1 captain)`);
    }

    // -------------------------------------------------------------------------
    // TEST 1B: Concurrent Team Submission (Waitlist Disabled)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1B: Concurrent Team Submission (Waitlist Disabled, Capacity = 1) ---');
    const evt2Id = 'dddddddd-0001-4000-a000-000000000002';
    testEventIds.push(evt2Id);

    // Clean prior
    await admin.from('team_roster_snapshots').delete().in('registration_id',
      (await admin.from('registrations').select('id').eq('event_id', evt2Id)).data?.map(r => r.id) || []
    );
    await admin.from('registrations').delete().eq('event_id', evt2Id);
    await admin.from('event_team_invitations').delete().in('team_id',
      (await admin.from('event_teams').select('id').eq('event_id', evt2Id)).data?.map(t => t.id) || []
    );
    await admin.from('event_team_members').delete().eq('event_id', evt2Id);
    await admin.from('event_teams').delete().eq('event_id', evt2Id);
    await admin.from('events').delete().eq('id', evt2Id);

    await admin.from('events').insert({
      id: evt2Id,
      fest_id: fest.id,
      title: 'Part 7: Concurrency Team Sprint (WL Disabled) [Demo]',
      slug: 'part7-concurrency-wl-disabled',
      status: 'published',
      operational_status: 'scheduled',
      registration_mode: 'team',
      team_min_size: 2,
      team_max_size: 3,
      capacity: 1, // Exactly 1 team capacity
      waitlist_enabled: false, // Waitlist DISABLED
      rules: 'One team capacity. Waitlist disabled.',
      starts_at: '2026-11-26T10:00:00Z',
      ends_at: '2026-11-26T13:00:00Z',
      registration_opens_at: '2026-10-01T00:00:00Z',
      registration_closes_at: '2026-11-25T23:59:59Z',
      blocks_schedule_conflicts: false
    });

    // Create Team C (Captain: U1, Member: U2)
    const { data: teamCId } = await u1.client.rpc('create_event_team', {
      p_event_id: evt2Id,
      p_name: 'Team Charlie Concurrency',
      p_accept_rules: true
    });
    const { data: invCRes } = await u1.client.rpc('invite_event_team_member', {
      p_team_id: teamCId,
      p_email: 'participant2@festivo.org',
      p_expiry_hours: 24
    });
    await u2.client.rpc('respond_event_team_invitation', {
      p_token: invCRes[0].invitation_token,
      p_accept: true,
      p_accept_rules: true
    });

    // Create Team D (Captain: U3, Member: U4)
    const { data: teamDId } = await u3.client.rpc('create_event_team', {
      p_event_id: evt2Id,
      p_name: 'Team Delta Concurrency',
      p_accept_rules: true
    });
    const { data: invDRes } = await u3.client.rpc('invite_event_team_member', {
      p_team_id: teamDId,
      p_email: 'participant4@festivo.org',
      p_expiry_hours: 24
    });
    await u4.client.rpc('respond_event_team_invitation', {
      p_token: invDRes[0].invitation_token,
      p_accept: true,
      p_accept_rules: true
    });

    console.log('Two complete, eligible teams created. Firing concurrent submissions via Promise.all...');
    const [resC, resD] = await Promise.all([
      u1.client.rpc('submit_event_team', { p_team_id: teamCId }),
      u3.client.rpc('submit_event_team', { p_team_id: teamDId })
    ]);

    const successRes = resC.data ? resC : resD;
    const errorRes = resC.error ? resC : resD;

    if (!successRes.data?.[0] || successRes.data[0].status !== 'confirmed') {
      throw new Error(`Expected one successful confirmed team, got: ${JSON.stringify(successRes)}`);
    }
    if (!errorRes.error || !errorRes.error.message.includes('event_full')) {
      throw new Error(`Expected other team to receive event_full error, got: ${JSON.stringify(errorRes)}`);
    }

    console.log(`✓ Exactly one team confirmed:`, successRes.data[0]);
    console.log(`✓ Other team rejected with: "${errorRes.error.message}"`);

    // Verify database state: exactly 1 registration in DB
    const { data: dbRegs2 } = await admin
      .from('registrations')
      .select('id, team_id, status')
      .eq('event_id', evt2Id);

    if (dbRegs2.length !== 1 || dbRegs2[0].status !== 'confirmed') {
      throw new Error(`Expected exactly 1 confirmed registration in DB, got: ${JSON.stringify(dbRegs2)}`);
    }
    console.log(`✓ DB state verified: Exactly 1 registration confirmed; capacity limit strictly held (no overfill)`);

    // Verify roster snapshot for winning team
    const { data: snaps2 } = await admin
      .from('team_roster_snapshots')
      .select('*')
      .eq('registration_id', dbRegs2[0].id);
    if (snaps2.length !== 2) throw new Error(`Expected 2 roster snapshots, got ${snaps2.length}`);
    console.log(`✓ Winning team roster snapshot verified (${snaps2.length} members captured)`);

    console.log('\n======================================================================');
    console.log('PART 7 CONCURRENCY VERIFICATION PASSED (2/2 SCENARIOS)');
    console.log('======================================================================\n');

  } finally {
    console.log('Cleaning up isolated concurrency test fixtures...');
    for (const evtId of testEventIds) {
      const regIds = (await admin.from('registrations').select('id').eq('event_id', evtId)).data?.map(r => r.id) || [];
      if (regIds.length) await admin.from('team_roster_snapshots').delete().in('registration_id', regIds);
      await admin.from('registrations').delete().eq('event_id', evtId);
      const teamIds = (await admin.from('event_teams').select('id').eq('event_id', evtId)).data?.map(t => t.id) || [];
      if (teamIds.length) await admin.from('event_team_invitations').delete().in('team_id', teamIds);
      await admin.from('event_team_members').delete().eq('event_id', evtId);
      await admin.from('event_teams').delete().eq('event_id', evtId);
      await admin.from('events').delete().eq('id', evtId);
    }
    console.log('Cleanup complete. Real records preserved.');
  }
}

run().catch(err => {
  console.error('\n*** PART 7 CONCURRENCY FAILED ***\n', err);
  process.exit(1);
});
