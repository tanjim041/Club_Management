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
  console.log('Cleaning up isolated walkthrough fixtures...');
  const eventIds = [
    'bbbbbbbb-1111-4000-b000-000000000001',
    'bbbbbbbb-1111-4000-b000-000000000002',
    'bbbbbbbb-1111-4000-b000-000000000003',
    'bbbbbbbb-1111-4000-b000-000000000004'
  ];

  const { error: notifErr } = await admin.from('notifications').delete().in('event_id', eventIds);
  if (notifErr) console.warn('Notif cleanup error:', notifErr.message);

  const { error: regErr } = await admin.from('registrations').delete().in('event_id', eventIds);
  if (regErr) console.warn('Reg cleanup error:', regErr.message);

  const { error: evtErr } = await admin.from('events').delete().in('id', eventIds);
  if (evtErr) console.warn('Event cleanup error:', evtErr.message);

  console.log('Isolated walkthrough fixtures successfully cleaned up. Real and demo records untouched.');
}

cleanup().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
