import type { ParticipantProfile } from '../auth/auth-types'
import type { PublicEventDetail } from '../directory/directory-types'

export type MatchFacts = { event_id: string; eligibility_error: string | null; conflict_titles: string[]; has_blocking_conflict: boolean; already_registered: boolean }
export type EventMatch = { event: PublicEventDetail; score: number; reasons: string[]; requirements: string[]; action: string; eligible: boolean }

const eligibilityLabels: Record<string, string> = {
  profile_incomplete: 'Complete your participant profile', experience_not_eligible: 'Experience level does not meet the event requirements',
  institution_not_eligible: 'Your institution is not eligible', department_not_eligible: 'Your department is not eligible',
  required_skills_missing: 'Missing a required skill', required_interests_missing: 'Missing a required interest',
  unsupported_eligibility_rule: 'Eligibility needs organizer review', invalid_eligibility_rule: 'Eligibility rule needs organizer correction',
}

function normalized(items: readonly string[] | null | undefined) {
  return new Set((items ?? []).map((item) => item.trim().toLowerCase()).filter(Boolean))
}

export function rankEvent(event: PublicEventDetail, profile: ParticipantProfile | null, facts: MatchFacts): EventMatch {
  const interests = normalized(profile?.interests)
  const skills = normalized(profile?.skills)
  const category = [event.category, event.subcategory].filter(Boolean).map((item) => item!.toLowerCase())
  const matchedInterest = [...interests].some((item) => category.some((cat) => cat.includes(item) || item.includes(cat)) || event.title.toLowerCase().includes(item))
  const eligibility = event.eligibility && typeof event.eligibility === 'object' && !Array.isArray(event.eligibility)
    ? event.eligibility as Record<string, unknown> : {}
  const requiredSkills = Array.isArray(eligibility.required_skills) ? eligibility.required_skills.filter((item): item is string => typeof item === 'string') : []
  const matchedSkills = requiredSkills.filter((item) => skills.has(item.toLowerCase()))
  const experienceMatch = !event.experienceLevels.length || Boolean(profile?.experience_level && event.experienceLevels.includes(profile.experience_level))
  const state = event.availability?.registrationState ?? 'closed'
  let score = 30
  const reasons: string[] = []
  const requirements: string[] = []
  if (matchedInterest) { score += 25; reasons.push('Matches your interests or preferred category') }
  else reasons.push('A chance to explore a new subject')
  if (requiredSkills.length) {
    score += Math.round(20 * matchedSkills.length / requiredSkills.length)
    if (matchedSkills.length) reasons.push(`${matchedSkills.length}/${requiredSkills.length} required skills match your profile`)
    requirements.push(`Skills: ${requiredSkills.join(', ')}`)
  } else { score += 10; reasons.push('No specific skills required') }
  if (experienceMatch) { score += 10; reasons.push('Fits your experience level') }
  if (state === 'open') { score += 10; reasons.push('Registration is open') }
  else if (state === 'waitlist') { score += 5; reasons.push('Waitlist is available') }
  else reasons.push(`Registration is ${state.replaceAll('_', ' ')}`)
  if (!facts.conflict_titles.length) { score += 10; reasons.push('No confirmed schedule overlap') }
  else reasons.push(`Overlaps ${facts.conflict_titles.join(', ')}`)
  if (facts.eligibility_error) requirements.push(eligibilityLabels[facts.eligibility_error] ?? facts.eligibility_error.replaceAll('_', ' '))
  if (Array.isArray(eligibility.allowed_institutions)) requirements.push(`Institutions: ${eligibility.allowed_institutions.join(', ')}`)
  if (Array.isArray(eligibility.allowed_departments)) requirements.push(`Departments: ${eligibility.allowed_departments.join(', ')}`)
  if (eligibility.minimum_experience_level) requirements.push(`Minimum experience: ${eligibility.minimum_experience_level}`)
  if (event.experienceLevels.length) requirements.push(`Experience: ${event.experienceLevels.join(', ')}`)
  if (event.registrationMode === 'team') requirements.push(`Team of ${event.teamMinSize}–${event.teamMaxSize} accepted members; every member is checked at submission`)
  const eligible = !facts.eligibility_error && !facts.has_blocking_conflict && !facts.already_registered
  if (facts.eligibility_error) score = Math.min(score, 35)
  if (facts.has_blocking_conflict) { score = Math.min(score, 45); requirements.push('Blocking schedule conflict must be resolved') }
  if (facts.conflict_titles.length && !facts.has_blocking_conflict) requirements.push('Explicit conflict acknowledgement required')
  const action = facts.already_registered ? 'Already registered' : facts.eligibility_error ? 'Review requirements' : facts.has_blocking_conflict ? 'Resolve conflict' : state === 'open' ? event.registrationMode === 'team' ? 'Create a team' : 'Register' : state === 'waitlist' ? 'Join waitlist' : 'View event'
  return { event, score: Math.max(0, Math.min(100, score)), reasons, requirements, action, eligible }
}
