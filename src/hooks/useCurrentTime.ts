import { useState, useEffect } from 'react'

/**
 * Returns the current time as a float hour (e.g. 14.5 = 2:30 PM).
 * Updates every minute.
 */
export function useCurrentTime(): number {
  const getTimeFloat = () => {
    const now = new Date()
    return now.getHours() + now.getMinutes() / 60
  }

  const [time, setTime] = useState(getTimeFloat)

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeFloat())
    }, 60_000) // update every minute

    return () => clearInterval(interval)
  }, [])

  return time
}
