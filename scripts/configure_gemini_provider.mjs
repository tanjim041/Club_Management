import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.trimStart().startsWith('#') && line.includes('='))
  .map((line) => { const i = line.indexOf('='); return [line.slice(0, i).trim(), line.slice(i + 1).trim()] }))
if (!env.SUPABASE_ACCESS_TOKEN || !env.SUPABASE_URL) throw new Error('Supabase deployment credentials are unavailable.')
const projectRef = new URL(env.SUPABASE_URL).hostname.split('.')[0]
const result = spawnSync('npx.cmd', ['supabase', 'secrets', 'set',
  'AI_PROVIDER=openai_compatible',
  'AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai',
  'AI_MODEL=gemini-flash-lite-latest',
  '--project-ref', projectRef], {
  env: { ...process.env, SUPABASE_ACCESS_TOKEN: env.SUPABASE_ACCESS_TOKEN }, stdio: 'inherit', shell: true,
})
if (result.status !== 0) process.exit(result.status || 1)
console.log('Gemini provider endpoint configured. AI_API_KEY remains unset; fallback stays active.')
