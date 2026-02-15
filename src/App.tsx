import { useState, useCallback } from 'react'
import type { CalendarEvent } from './types'
import { SAMPLE_EVENTS } from './constants'
import { useCurrentTime } from './hooks/useCurrentTime'
import { findGapAtTime, defaultEventTimes } from './utils'
import DayWheel from './components/DayWheel'
import EventCreator from './components/EventCreator'
import DeleteConfirm from './components/DeleteConfirm'

interface CreatorState {
  startH: number
  endH: number
  anchorX: number
  anchorY: number
}

// Duration of the bubble-pop animation — must match CSS
const POP_DURATION_MS = 560

export default function App() {
  const [events, setEvents] = useState<CalendarEvent[]>(SAMPLE_EVENTS)
  const [creator, setCreator] = useState<CreatorState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null)
  const currentTime = useCurrentTime()

  // ─── Gap click → create ──────────────────────────────────────

  const handleGapClick = useCallback(
    (hour: number, clientX: number, clientY: number) => {
      const gap = findGapAtTime(events, hour)
      if (!gap) return

      const { startH, endH } = defaultEventTimes(hour, gap)
      setCreator({ startH, endH, anchorX: clientX, anchorY: clientY })
    },
    [events]
  )

  const handleCreateEvent = useCallback((event: CalendarEvent) => {
    setEvents((prev) => [...prev, event])
    setCreator(null)

    // Clear isNew flag after spring-in plays
    setTimeout(() => {
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, isNew: false } : e))
      )
    }, 700)
  }, [])

  const handleCancelCreate = useCallback(() => setCreator(null), [])

  // ─── Event click → delete confirmation ───────────────────────

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setDeleteTarget(event)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return

    const targetId = deleteTarget.id
    setDeleteTarget(null)

    // 1. Optimistic: immediately flag the event as popping (triggers animation)
    setEvents((prev) =>
      prev.map((e) => (e.id === targetId ? { ...e, isPopping: true } : e))
    )

    // 2. After animation completes, actually remove from state
    setTimeout(() => {
      setEvents((prev) => prev.filter((e) => e.id !== targetId))
    }, POP_DURATION_MS)
  }, [deleteTarget])

  const handleCancelDelete = useCallback(() => setDeleteTarget(null), [])

  return (
    <div className="min-h-screen bg-[#f7f6f3] bg-noise flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-center pt-8 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E07B6C] via-[#8B8FD8] to-[#8BA89A]" />
          <h1 className="text-lg font-semibold text-gray-700 tracking-tight">
            Ra1nbow
          </h1>
        </div>
      </header>

      {/* Ring */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-[560px]">
          <DayWheel
            events={events}
            currentTime={currentTime}
            onGapClick={handleGapClick}
            onEventClick={handleEventClick}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center pb-6 text-xs text-gray-300 font-mono">
        click the ring to create · click an event to remove
      </footer>

      {/* ─── Modals ─── */}

      {creator && (
        <EventCreator
          startH={creator.startH}
          endH={creator.endH}
          anchorX={creator.anchorX}
          anchorY={creator.anchorY}
          onConfirm={handleCreateEvent}
          onCancel={handleCancelCreate}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          event={deleteTarget}
          onDelete={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  )
}
