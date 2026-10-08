import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env', 'utf-8')
const env = {}
for (const rawLine of envContent.split(/\r?\n/)) {
  const line = rawLine.trim()
  if (!line || line.startsWith('#')) continue
  const idx = line.indexOf('=')
  if (idx > -1) {
    const k = line.slice(0, idx).trim()
    const v = line.slice(idx + 1).trim()
    env[k] = v
  }
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY)

async function inspect() {
  const { data: institutes, error: instErr } = await supabase.from('institutes').select('*')
  console.log('Institutes:', JSON.stringify(institutes, null, 2), instErr?.message)

  const { data: orgs, error: orgErr } = await supabase.from('organizations').select('id, name, slug, institute_id, is_public_profile, is_active, category, tagline')
  console.log('Organizations:', JSON.stringify(orgs, null, 2), orgErr?.message)

  const { data: memberships, error: memErr } = await supabase.from('organization_memberships').select('*')
  console.log('Memberships:', JSON.stringify(memberships, null, 2), memErr?.message)

  const { data: users, error: userErr } = await supabase.auth.admin.listUsers()
  console.log('Auth Users:', JSON.stringify(users?.users?.map(u => ({ id: u.id, email: u.email })), null, 2), userErr?.message)
}

inspect()
