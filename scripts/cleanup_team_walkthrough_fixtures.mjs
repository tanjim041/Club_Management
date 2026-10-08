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

async function cleanup() {
  console.log('Cleaning up Part 7 team walkthrough fixtures...');
  const eventIds = [
    'eeeeeeee-0001-4000-a000-000000000001',
    'eeeeeeee-0002-4000-a000-000000000002',
    'eeeeeeee-0003-4000-a000-000000000003'
  ];

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

  console.log('Part 7 walkthrough fixtures cleaned up successfully. Real and demo records untouched.');
}

cleanup().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
