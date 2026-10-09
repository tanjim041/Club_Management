import { spawnSync } from 'node:child_process'

const suites = [
  { name: 'Part 6: Registration, Waitlist & FIFO Promotion', script: 'scripts/verify_part6_registration.mjs' },
  { name: 'Part 7: Concurrency & Team Race Conditions', script: 'scripts/verify_part7_concurrency.mjs' },
  { name: 'Team Rosters & Schedule Conflict Policy', script: 'scripts/verify_team_and_conflicts.mjs' },
  { name: 'QR Digital Passes & Gate Staff Check-In', script: 'scripts/verify_event_passes.mjs' },
  { name: 'Engagement, Announcements & Club Passport', script: 'scripts/verify_engagement.mjs' },
  { name: 'AI Model Integration, Security & Fallbacks', script: 'scripts/verify_ai_integration.mjs' },
  { name: 'CSV Sanitization & Event Matcher Rules', script: 'scripts/verify_analytics_rules.mjs', flags: ['--experimental-strip-types'] },
  { name: 'Ask Festivo Chatbot UI & Multi-Device Flow', script: 'scripts/verify_ask_festivo_browser.mjs' },
]

console.log('======================================================================')
console.log('FESTIVO PART 11 MASTER CONTEST VERIFICATION SUITE')
console.log('======================================================================\n')

let totalSuites = suites.length
let passedSuites = 0
const results = []

for (const suite of suites) {
  console.log(`\n>>> RUNNING: ${suite.name} (${suite.script}) <<<`)
  const start = Date.now()
  const args = [...(suite.flags || []), suite.script]
  const proc = spawnSync('node', args, { stdio: 'inherit', shell: true })
  const duration = ((Date.now() - start) / 1000).toFixed(1)

  if (proc.status === 0) {
    passedSuites++
    results.push({ name: suite.name, status: 'PASS', duration: `${duration}s` })
    console.log(`[PASS] ${suite.name} completed successfully in ${duration}s.`)
  } else {
    results.push({ name: suite.name, status: 'FAIL', duration: `${duration}s`, code: proc.status })
    console.error(`[FAIL] ${suite.name} failed with exit code ${proc.status}!`)
  }
}

console.log('\n======================================================================')
console.log('MASTER SUITE EXECUTION SUMMARY')
console.log('======================================================================')
for (const r of results) {
  console.log(`${r.status === 'PASS' ? '✓' : '✗'} ${r.name.padEnd(52)} ${r.status.padEnd(6)} (${r.duration})`)
}
console.log(`\nTOTAL: ${passedSuites}/${totalSuites} suites passed (${Math.round((passedSuites / totalSuites) * 100)}%).`)
console.log('======================================================================\n')

if (passedSuites !== totalSuites) {
  process.exit(1)
}
