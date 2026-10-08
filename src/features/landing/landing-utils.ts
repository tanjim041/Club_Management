export function formatDateRange(startIso: string, endIso: string): string {
  try {
    const start = new Date(startIso)
    const end = new Date(endIso)

    const sameMonth = start.getMonth() === end.getMonth()
    const sameYear = start.getFullYear() === end.getFullYear()

    const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
    const startDay = start.getDate()
    const endDay = end.getDate()
    const year = start.getFullYear()

    if (sameMonth && sameYear) {
      if (startDay === endDay) {
        return `${startMonth} ${startDay}, ${year}`
      }
      return `${startMonth} ${startDay} – ${endDay}, ${year}`
    }

    if (sameYear) {
      return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`
    }

    return `${startMonth} ${startDay}, ${start.getFullYear()} – ${endMonth} ${endDay}, ${end.getFullYear()}`
  } catch {
    return 'Dates announced soon'
  }
}

export function formatEventSchedule(event: {
  registration_opens_at: string | null
  venue: string | null
  starts_at?: string
}): string {
  // If schedule has not been specifically confirmed by event organizers,
  // do not invent an exact time. Display standard announcement status.
  if (!event.registration_opens_at && !event.venue) {
    return 'Schedule to be announced.'
  }

  if (event.starts_at) {
    try {
      const date = new Date(event.starts_at)
      const dayStr = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      return `${dayStr} • ${timeStr}`
    } catch {
      return 'Schedule to be announced.'
    }
  }

  return 'Schedule to be announced.'
}

export function formatVenue(venue: string | null): string {
  return venue && venue.trim().length > 0 ? venue : 'Venue to be announced.'
}

export function getRegistrationStatus(
  regCloseIso: string | null,
  regOpenIso?: string | null,
): { label: string; canRegister: boolean; variant: 'open' | 'closing-soon' | 'closed' | 'pending' } {
  if (!regOpenIso && !regCloseIso) {
    return {
      label: 'Registration details coming soon.',
      canRegister: false,
      variant: 'pending',
    }
  }

  const now = new Date()

  if (regOpenIso) {
    const openDate = new Date(regOpenIso)
    if (now < openDate) {
      return {
        label: 'Registration opens soon',
        canRegister: false,
        variant: 'pending',
      }
    }
  }

  if (regCloseIso) {
    const cutoff = new Date(regCloseIso)
    if (now > cutoff) {
      return {
        label: 'Registration Closed',
        canRegister: false,
        variant: 'closed',
      }
    }

    const hoursRemaining = (cutoff.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (hoursRemaining <= 72) {
      return {
        label: 'Closing Soon',
        canRegister: true,
        variant: 'closing-soon',
      }
    }
  }

  return {
    label: 'Registration Open',
    canRegister: true,
    variant: 'open',
  }
}
