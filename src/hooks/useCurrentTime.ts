import { useState, useEffect } from 'react'

/**
 * Returns the current time as a float hour (e.g. 14.5 = 2:30 PM) for the specified timezone.
 * 'system' means the user's local timezone.
 * Updates every minute.
 */
export function useCurrentTime(timeZone: string = 'system'): number {
  const getTimeFloat = () => {
    const now = new Date()
    if (timeZone === 'system') {
      return now.getHours() + now.getMinutes() / 60
    }

    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      }).formatToParts(now)

      let h = 0
      let m = 0
      for (const part of parts) {
        if (part.type === 'hour') {
          h = parseInt(part.value, 10)
          if (h === 24) h = 0 // Some runtimes map midnight to 24 when hour12: false
        }
        if (part.type === 'minute') {
          m = parseInt(part.value, 10)
        }
      }
      return h + m / 60
    } catch {
      // Fallback if timezone is invalid
      return now.getHours() + now.getMinutes() / 60
    }
  }

  const [time, setTime] = useState(getTimeFloat)

  useEffect(() => {
    // Re-evaluate immediately when timezone changes
    setTime(getTimeFloat())
    const interval = setInterval(() => {
      setTime(getTimeFloat())
    }, 60_000) // update every minute

    return () => clearInterval(interval)
  }, [timeZone])

  return time
}
