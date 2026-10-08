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

async function promote() {
  const event2Id = 'bbbbbbbb-1111-4000-b000-000000000002';
  const { data: p1 } = await admin.from('profiles').select('id').eq('email', 'participant1@festivo.org').single();
  const { data: reg1 } = await admin.from('registrations').select('id').eq('event_id', event2Id).eq('participant_id', p1.id).single();

  if (reg1) {
    const user1Client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
    await user1Client.auth.signInWithPassword({ email: 'participant1@festivo.org', password: 'Password123!' });
    const { data, error } = await user1Client.rpc('cancel_individual_registration', {
      p_registration_id: reg1.id,
      p_reason: 'Voluntary cancellation'
    });
    console.log('Cancelled User 1 registration:', data, error);
  }
}

promote().catch(console.error);
