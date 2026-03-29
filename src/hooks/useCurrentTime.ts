import { useState, useEffect, useRef } from 'react'
import { getZonedIsoDate } from '../utils'

/**
 * The "Heartbeat Service" for the entire application.
 * Returns both the current fractional hour and the current ISO date for the selected timezone.
 * Handles precision minute-syncing and visibility-change re-syncs (sleep/wake recovery).
 */
export function useCurrentTime(timeZone: string = 'system') {
  const getSnapshot = () => {
    const now = new Date()
    const todayDate = getZonedIsoDate(timeZone)
    
    let currentTime = now.getHours() + now.getMinutes() / 60
    
    if (timeZone !== 'system') {
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
            if (h === 24) h = 0
          }
          if (part.type === 'minute') {
            m = parseInt(part.value, 10)
          }
        }
        currentTime = h + m / 60
      } catch {
        // Fallback
      }
    }
    
    return { currentTime, todayDate }
  }

  const [state, setState] = useState(getSnapshot)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const sync = () => {
    const next = getSnapshot()
    setState(next)
    
    // Precision sync: schedule next update exactly at the start of the next minute
    const now = new Date()
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 100 // +100ms buffer
    
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(sync, msUntilNextMinute)
  }

  useEffect(() => {
    sync()

    // Resync immediately when the page becomes visible (wake from sleep)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') sync()
    }

    window.addEventListener('visibilitychange', handleVisibility)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      window.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [timeZone])

  return state
}
