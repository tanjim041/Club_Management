import fs from 'fs'

const envContent = fs.readFileSync('.env', 'utf-8')
const env = {}
for (const rawLine of envContent.split(/\r?\n/)) {
  const line = rawLine.trim()
  if (!line || line.startsWith('#')) continue
  const idx = line.indexOf('=')
  if (idx > -1) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
}

const ref = 'ylmjekpzaxnitthrwncs'
const token = env.SUPABASE_ACCESS_TOKEN

async function check() {
  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  })
  const tables = await res.json()
  console.log('Public tables:', tables.map(r => r.table_name))

  // Also check columns of registrations
  const regColsRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'registrations'
        ORDER BY ordinal_position;
      `
    })
  })
  const regCols = await regColsRes.json()
  console.log('Registrations columns:', regCols)
}

check()
