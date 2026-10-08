import { createClient } from '@supabase/supabase-js'
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

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY)

async function checkStorage() {
  const { data: buckets, error } = await supabase.storage.listBuckets()
  console.log('Storage Buckets:', buckets, error?.message)
}

checkStorage()
