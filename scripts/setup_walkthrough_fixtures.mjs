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
  console.log('Setting up browser walkthrough fixtures...');

  // Find TechNova 2026 fest
  const { data: fest } = await admin
    .from('fests')
    .select('id, slug, organization_id, organizations(slug)')
    .eq('slug', 'technova-2026')
    .single();

  if (!fest) {
    throw new Error('TechNova fest not found');
  }

  const clubSlug = fest.organizations.slug;
  const festSlug = fest.slug;

  const event1Id = 'bbbbbbbb-1111-4000-b000-000000000001';
  const event2Id = 'bbbbbbbb-1111-4000-b000-000000000002';
  const event3Id = 'bbbbbbbb-1111-4000-b000-000000000003';

  // Clean prior walkthrough data
  await admin.from('notifications').delete().in('event_id', [event1Id, event2Id, event3Id]);
  await admin.from('registrations').delete().in('event_id', [event1Id, event2Id, event3Id]);
  await admin.from('events').delete().in('id', [event1Id, event2Id, event3Id]);

  // Event 1: Open event for standard registration, refresh, duplicate check
  await admin.from('events').insert({
    id: event1Id,
    fest_id: fest.id,
    title: 'Walkthrough: Open Systems Challenge [Demo]',
    slug: 'walkthrough-open-systems',
    status: 'published',
    operational_status: 'scheduled',
    registration_mode: 'individual',
    capacity: 10,
    waitlist_enabled: true,
    rules: 'Follow tournament rules. Individual participation only.',
    starts_at: '2026-11-20T10:00:00Z',
    ends_at: '2026-11-20T13:00:00Z',
    registration_opens_at: '2026-10-01T00:00:00Z',
    registration_closes_at: '2026-11-19T23:59:59Z',
    cancellation_closes_at: '2026-11-20T09:00:00Z',
    blocks_schedule_conflicts: false
  });

  // Event 2: Single-capacity event for waitlist queue, promotion & cancel
  // User 1 (participant1) is pre-registered as confirmed
  await admin.from('events').insert({
    id: event2Id,
    fest_id: fest.id,
    title: 'Walkthrough: Autonomous Robotics Sprint [Demo]',
    slug: 'walkthrough-robotics-sprint',
    status: 'published',
    operational_status: 'scheduled',
    registration_mode: 'individual',
    capacity: 1,
    waitlist_enabled: true,
    rules: 'One participant capacity. Waitlist enabled.',
    starts_at: '2026-11-21T14:00:00Z',
    ends_at: '2026-11-21T17:00:00Z',
    registration_opens_at: '2026-10-01T00:00:00Z',
    registration_closes_at: '2026-11-20T23:59:59Z',
    cancellation_closes_at: '2026-11-21T12:00:00Z',
    blocks_schedule_conflicts: false
  });

  // Pre-register participant1 into Event 2
  const { data: p1 } = await admin.from('profiles').select('id').eq('email', 'participant1@festivo.org').single();
  await admin.from('registrations').insert({
    event_id: event2Id,
    participant_id: p1.id,
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
    rules_accepted_at: new Date().toISOString(),
    rules_accepted_hash: 'manual-pre-seed'
  });

  // Event 3: Closed deadline event for deadline rejection
  await admin.from('events').insert({
    id: event3Id,
    fest_id: fest.id,
    title: 'Walkthrough: Closed Deadline Showcase [Demo]',
    slug: 'walkthrough-closed-deadline',
    status: 'published',
    operational_status: 'scheduled',
    registration_mode: 'individual',
    capacity: 5,
    waitlist_enabled: false,
    rules: 'Deadline passed.',
    starts_at: '2026-11-22T10:00:00Z',
    ends_at: '2026-11-22T12:00:00Z',
    registration_opens_at: '2026-10-01T00:00:00Z',
    registration_closes_at: '2026-10-05T00:00:00Z', // in past
    cancellation_closes_at: '2026-10-05T00:00:00Z', // in past
    blocks_schedule_conflicts: false
  });

  // Event 4: Past cancellation cutoff for cancellation rejection
  const event4Id = 'bbbbbbbb-1111-4000-b000-000000000004';
  const reg4Id = 'cccccccc-4444-4000-c000-000000000004';

  await admin.from('notifications').delete().in('event_id', [event4Id]);
  await admin.from('registrations').delete().in('event_id', [event4Id]);
  await admin.from('events').delete().in('id', [event4Id]);

  await admin.from('events').insert({
    id: event4Id,
    fest_id: fest.id,
    title: 'Walkthrough: Past Cancellation Cutoff [Demo]',
    slug: 'walkthrough-past-cancellation',
    status: 'published',
    operational_status: 'scheduled',
    registration_mode: 'individual',
    capacity: 10,
    waitlist_enabled: true,
    rules: 'Cancellation cutoff passed.',
    starts_at: '2026-11-25T10:00:00Z',
    ends_at: '2026-11-25T12:00:00Z',
    registration_opens_at: '2026-10-01T00:00:00Z',
    registration_closes_at: '2026-11-24T00:00:00Z',
    cancellation_closes_at: '2026-10-05T00:00:00Z', // in past!
    blocks_schedule_conflicts: false
  });

  // Pre-register participant4 into Event 4
  const { data: p4 } = await admin.from('profiles').select('id').eq('email', 'participant4@festivo.org').single();
  await admin.from('registrations').insert({
    id: reg4Id,
    event_id: event4Id,
    participant_id: p4.id,
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
    rules_accepted_at: new Date().toISOString(),
    rules_accepted_hash: 'manual-pre-seed'
  });

  console.log('Fixtures created successfully!');
  console.log(`Event 1 URL: /fests/${clubSlug}/${festSlug}/events/walkthrough-open-systems`);
  console.log(`Event 2 URL: /fests/${clubSlug}/${festSlug}/events/walkthrough-robotics-sprint`);
  console.log(`Event 3 URL: /fests/${clubSlug}/${festSlug}/events/walkthrough-closed-deadline`);
  console.log(`Event 4 Reg URL: /my-registrations/${reg4Id}`);
}

setup().catch(err => {
  console.error(err);
  process.exit(1);
});

