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

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function setup() {
  console.log('Setting up Part 7 team walkthrough fixtures...');

  // Find TechNova 2026 fest
  const { data: fest } = await admin
    .from('fests')
    .select('id, slug, organization_id, organizations(slug)')
    .eq('slug', 'technova-2026')
    .single();

  if (!fest) throw new Error('TechNova fest not found');

  const clubSlug = fest.organizations.slug;
  const festSlug = fest.slug;

  const evt1Id = 'eeeeeeee-0001-4000-a000-000000000001';
  const evt2Id = 'eeeeeeee-0002-4000-a000-000000000002';
  const evt3Id = 'eeeeeeee-0003-4000-a000-000000000003';

  const eventIds = [evt1Id, evt2Id, evt3Id];

  // Clean prior walkthrough data
  for (const eid of eventIds) {
    const regIds = (await admin.from('registrations').select('id').eq('event_id', eid)).data?.map(r => r.id) || [];
    if (regIds.length) await admin.from('team_roster_snapshots').delete().in('registration_id', regIds);
    await admin.from('notifications').delete().eq('event_id', eid);
    await admin.from('registrations').delete().eq('event_id', eid);
    const teamIds = (await admin.from('event_teams').select('id').eq('event_id', eid)).data?.map(t => t.id) || [];
    if (teamIds.length) await admin.from('event_team_invitations').delete().in('team_id', teamIds);
    await admin.from('event_team_members').delete().eq('event_id', eid);
    await admin.from('event_teams').delete().eq('event_id', eid);
    await admin.from('events').delete().eq('id', eid);
  }

  // Event 1: Open Team Championship (Capacity: 5 teams, min 2, max 4)
  await admin.from('events').insert({
    id: evt1Id,
    fest_id: fest.id,
    title: 'Walkthrough: Autonomous Team Championship [Demo]',
    slug: 'walkthrough-team-championship',
    status: 'published',
    operational_status: 'scheduled',
    registration_mode: 'team',
    team_min_size: 2,
    team_max_size: 4,
    capacity: 5,
    waitlist_enabled: true,
    rules: 'Follow tournament rules. 2 to 4 members required per team.',
    starts_at: '2026-11-20T10:00:00Z',
    ends_at: '2026-11-20T13:00:00Z',
    registration_opens_at: '2026-10-01T00:00:00Z',
    registration_closes_at: '2026-11-19T23:59:59Z',
    cancellation_closes_at: '2026-11-20T08:00:00Z',
    blocks_schedule_conflicts: false
  });

  // Event 2: Conflicting Individual Colloquium (11:00 - 12:30, overlaps Event 1 by 1.5h)
  await admin.from('events').insert({
    id: evt2Id,
    fest_id: fest.id,
    title: 'Walkthrough: Concurrent Research Colloquium [Demo]',
    slug: 'walkthrough-conflict-colloquium',
    status: 'published',
    operational_status: 'scheduled',
    registration_mode: 'individual',
    capacity: 10,
    waitlist_enabled: true,
    rules: 'Colloquium rules.',
    starts_at: '2026-11-20T11:00:00Z',
    ends_at: '2026-11-20T12:30:00Z',
    registration_opens_at: '2026-10-01T00:00:00Z',
    registration_closes_at: '2026-11-19T23:59:59Z',
    blocks_schedule_conflicts: false
  });

  // Event 3: Second Team Event for Conflict Identification & Acknowledgement
  await admin.from('events').insert({
    id: evt3Id,
    fest_id: fest.id,
    title: 'Walkthrough: Overlapping Hackathon Sprint [Demo]',
    slug: 'walkthrough-conflict-hackathon',
    status: 'published',
    operational_status: 'scheduled',
    registration_mode: 'team',
    team_min_size: 2,
    team_max_size: 4,
    capacity: 5,
    waitlist_enabled: true,
    rules: 'Hackathon sprint rules.',
    starts_at: '2026-11-20T11:00:00Z',
    ends_at: '2026-11-20T13:30:00Z',
    registration_opens_at: '2026-10-01T00:00:00Z',
    registration_closes_at: '2026-11-19T23:59:59Z',
    blocks_schedule_conflicts: false
  });

  console.log('Part 7 walkthrough fixtures created successfully!');
  console.log(`Event 1 URL: /fests/${clubSlug}/${festSlug}/events/walkthrough-team-championship`);
  console.log(`Event 2 URL: /fests/${clubSlug}/${festSlug}/events/walkthrough-conflict-colloquium`);
  console.log(`Event 3 URL: /fests/${clubSlug}/${festSlug}/events/walkthrough-conflict-hackathon`);
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
