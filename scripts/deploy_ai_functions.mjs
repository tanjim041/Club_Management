import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.trimStart().startsWith('#') && line.includes('='))
  .map((line) => { const i = line.indexOf('='); return [line.slice(0, i).trim(), line.slice(i + 1).trim()] }))
if (!env.SUPABASE_ACCESS_TOKEN || !env.SUPABASE_URL) throw new Error('Supabase deployment credentials are unavailable.')
const projectRef = new URL(env.SUPABASE_URL).hostname.split('.')[0]
for (const name of ['festivo-assistant', 'organizer-copilot']) {
  console.log(`Deploying ${name}...`)
  const result = spawnSync('npx.cmd', ['supabase', 'functions', 'deploy', name, '--project-ref', projectRef], {
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: env.SUPABASE_ACCESS_TOKEN }, stdio: 'inherit', shell: true,
  })
  if (result.status !== 0) process.exit(result.status || 1)
}
