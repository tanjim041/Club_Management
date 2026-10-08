import { Link } from 'react-router-dom'
import type { EventConflict, ScheduleAlternative } from './team-api'

function durationLabel(seconds: number): string {
  const minutes = Math.ceil(seconds / 60)
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`
}

export function ConflictSummary({ conflicts, alternatives }: {
  conflicts: EventConflict[]
  alternatives: ScheduleAlternative[]
}) {
  if (conflicts.length === 0) return <p className="text-xs text-[var(--color-text-muted)]">No conflicts with your confirmed schedule.</p>

  return (
    <div className="space-y-3" aria-label="Schedule conflicts">
      <p className="text-xs font-semibold text-amber-200">Schedule overlap detected</p>
      {conflicts.map((conflict) => (
        <div key={`${conflict.person_id}-${conflict.other_event_id}`} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-[var(--color-text-body)]">
          <p className="font-semibold text-[var(--color-text-primary)]">{conflict.person_name || 'Team member'} · {conflict.other_title}</p>
          <p>Overlap: {new Date(conflict.overlap_starts_at).toLocaleString()} – {new Date(conflict.overlap_ends_at).toLocaleTimeString()} ({durationLabel(conflict.overlap_seconds)})</p>
          <p className="mt-1 text-amber-200">{conflict.blocks_conflict ? 'Registration is blocked by an event policy.' : 'This person must explicitly acknowledge the overlap.'}</p>
        </div>
      ))}
      {alternatives.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--color-text-primary)]">Other events to consider</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {alternatives.map((alternative) => (
              <Link key={alternative.event_id} to={`/fests/${alternative.club_slug}/${alternative.fest_slug}/events/${alternative.event_slug}`}
                className="inline-flex min-h-11 items-center rounded-lg border border-[var(--color-border-subtle)] px-3 text-xs text-[var(--color-accent)] hover:bg-[var(--color-surface-raised)]">
                {alternative.event_title} · {new Date(alternative.starts_at).toLocaleString()}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
