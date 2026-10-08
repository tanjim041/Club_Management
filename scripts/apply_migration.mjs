import fs from 'fs'

const envContent = fs.readFileSync('.env', 'utf-8')
const env = {}
for (const rawLine of envContent.split(/\r?\n/)) {
  const line = rawLine.trim()
  if (!line || line.startsWith('#')) continue
  const idx = line.indexOf('=')
  if (idx > -1) {
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
}

const ref = 'ylmjekpzaxnitthrwncs'
const token = env.SUPABASE_ACCESS_TOKEN
const migrationPath = process.argv[2]

if (!migrationPath) {
  console.error('Please specify a migration file path')
  process.exit(1)
}

const sql = fs.readFileSync(migrationPath, 'utf-8')

async function apply() {
  console.log(`Applying migration: ${migrationPath}...`)
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  })

  const text = await res.text()
  console.log('HTTP Status:', res.status)
  if (!res.ok) {
    console.error('Error applying migration:', text)
    process.exit(1)
  }
  console.log('Migration applied successfully!')
}

apply()
