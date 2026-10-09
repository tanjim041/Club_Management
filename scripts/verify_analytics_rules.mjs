import assert from 'node:assert/strict'
import { safeCsvCell, participantCsv } from '../src/features/analytics/export-csv.ts'
import { rankEvent } from '../src/features/matcher/match-rules.ts'

for (const input of ['=1+1', '+SUM(A1)', '-9+2', '@cmd', '  =HYPERLINK("x")', '\t+1']) {
  assert.ok(safeCsvCell(input).startsWith('"\''), `Formula-like cell must be neutralized: ${input}`)
}
assert.equal(safeCsvCell('Normal "Name"'), '"Normal ""Name"""')
const csv = participantCsv([{ name: '=HYPERLINK("bad")', email: 'user@example.com', eventTitle: 'Event',
  teamName: null, status: 'confirmed', registeredAt: '2026-10-08', checkedInAt: null,
  registrationId: 'id', eventId: 'event', userId: 'user' }])
assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'))

const event = {
  id: 'event', title: 'Robotics Sprint', category: 'Robotics', subcategory: null,
  experienceLevels: ['beginner'], eligibility: { required_skills: ['Python'] },
  availability: { registrationState: 'open' }, startsAt: '2026-11-01T10:00:00Z',
  registrationMode: 'individual', teamMinSize: null, teamMaxSize: null,
}
const profile = { interests: ['robotics'], skills: ['python'], experience_level: 'beginner' }
const facts = { event_id: 'event', eligibility_error: null, conflict_titles: [], has_blocking_conflict: false, already_registered: false }
const strong = rankEvent(event, profile, facts)
assert.equal(strong.score, 100)
assert.equal(strong.action, 'Register')
const blocked = rankEvent(event, profile, { ...facts, has_blocking_conflict: true, conflict_titles: ['Other Event'] })
assert.ok(blocked.score <= 45 && !blocked.eligible && blocked.action === 'Resolve conflict')
const ineligible = rankEvent(event, profile, { ...facts, eligibility_error: 'required_skills_missing' })
assert.ok(ineligible.score <= 35 && !ineligible.eligible)
console.log('CSV injection and deterministic matcher checks passed.')
