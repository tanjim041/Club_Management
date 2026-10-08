import type { AnalyticsParticipant } from './analytics-api'

/** A leading apostrophe prevents Excel/Sheets from evaluating untrusted cells. */
export function safeCsvCell(value: unknown): string {
  const raw = value == null ? '' : String(value)
  const neutralized = /^[\s\uFEFF]*[=+\-@]/u.test(raw) ? `'${raw}` : raw
  return `"${neutralized.replaceAll('"', '""')}"`
}

export function participantCsv(rows: AnalyticsParticipant[]): string {
  const headers = ['Participant', 'Email', 'Event', 'Team', 'Status', 'Registered at', 'Checked in at', 'Registration ID']
  const lines = rows.map((row) => [row.name, row.email, row.eventTitle, row.teamName,
    row.status, row.registeredAt, row.checkedInAt, row.registrationId].map(safeCsvCell).join(','))
  return `\uFEFF${headers.map(safeCsvCell).join(',')}\r\n${lines.join('\r\n')}\r\n`
}

export function downloadParticipantCsv(rows: AnalyticsParticipant[]): void {
  const blob = new Blob([participantCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'festivo-participants.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
