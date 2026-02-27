import { useCallback, useEffect, useState } from 'react'
import type { CalendarEvent, TimeFormat } from './types'
import { SAMPLE_EVENTS, DEFAULT_ACTIVE_START, DEFAULT_ACTIVE_END } from './constants'
import { useCurrentTime } from './hooks/useCurrentTime'
import { defaultEventTimes, findGapAtTime } from './utils'
import DayWheel from './components/DayWheel'
import DeleteConfirm from './components/DeleteConfirm'
import EventActionMenu from './components/EventActionMenu'
import EventCreator from './components/EventCreator'
import EventEditor from './components/EventEditor'
import Settings from './components/Settings'
import TasksPage from './components/TasksPage'

const STORAGE_KEY = 'ra1nbow-settings'
const POP_DURATION_MS = 550

interface PersistedSettings {
  activeStart: number
  activeEnd: number
  timeFormat: TimeFormat
  allowOverlap: boolean
}

function loadSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        activeStart: parsed.activeStart ?? DEFAULT_ACTIVE_START,
        activeEnd: parsed.activeEnd ?? DEFAULT_ACTIVE_END,
        timeFormat: parsed.timeFormat ?? '24h',
        allowOverlap: parsed.allowOverlap ?? false,
      }
    }
  } catch {
    // ignore corrupted storage
  }

  return {
    activeStart: DEFAULT_ACTIVE_START,
    activeEnd: DEFAULT_ACTIVE_END,
    timeFormat: '24h',
    allowOverlap: false,
  }
}

export default function App() {
  const [page, setPage] = useState<'day' | 'tasks'>('day')
  const [events, setEvents] = useState<CalendarEvent[]>(SAMPLE_EVENTS)
  const [showSettings, setShowSettings] = useState(false)
  const currentTime = useCurrentTime()
  const [settings, setSettings] = useState<PersistedSettings>(loadSettings)
  const [creator, setCreator] = useState<{
    startH: number
    endH: number
    anchorX: number
    anchorY: number
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null)
  const [actionTarget, setActionTarget] = useState<{
    event: CalendarEvent
    anchorX: number
    anchorY: number
  } | null>(null)
  const [editTarget, setEditTarget] = useState<CalendarEvent | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const handleActiveStartChange = useCallback((h: number) => {
    setSettings((prev) => ({ ...prev, activeStart: h }))
  }, [])

  const handleActiveEndChange = useCallback((h: number) => {
    setSettings((prev) => ({ ...prev, activeEnd: h }))
  }, [])

  const handleTimeFormatChange = useCallback((f: TimeFormat) => {
    setSettings((prev) => ({ ...prev, timeFormat: f }))
  }, [])

  const handleAllowOverlapChange = useCallback((v: boolean) => {
    setSettings((prev) => ({ ...prev, allowOverlap: v }))
  }, [])

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

    setTimeout(() => {
      setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, isNew: false } : e)))
    }, 700)
  }, [])

  const handleCancelCreate = useCallback(() => setCreator(null), [])

  const handleEventClick = useCallback((event: CalendarEvent, clientX: number, clientY: number) => {
    if (page !== 'day') return
    setActionTarget({ event, anchorX: clientX, anchorY: clientY })
  }, [page])

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return

    const targetId = deleteTarget.id
    setDeleteTarget(null)

    setEvents((prev) => prev.map((e) => (e.id === targetId ? { ...e, isPopping: true } : e)))

    setTimeout(() => {
      setEvents((prev) => prev.filter((e) => e.id !== targetId))
    }, POP_DURATION_MS)
  }, [deleteTarget])

  const handleCancelDelete = useCallback(() => setDeleteTarget(null), [])

  const handleEventTimeChange = useCallback((id: string, startH: number, endH: number) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, startH, endH } : e)))
  }, [])

  const handleRenameEvent = useCallback((id: string, newTitle: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, title: newTitle } : e)))
    setEditTarget(null)
  }, [])

  const handleColorChange = useCallback((id: string, color: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, color } : e)))
    // Also update the action menu's own event reference so wheel + header reflect new color live
    setActionTarget((prev) =>
      prev && prev.event.id === id ? { ...prev, event: { ...prev.event, color } } : prev
    )
  }, [])

  // Close ring-only overlays when leaving the day view
  useEffect(() => {
    if (page !== 'day') {
      setCreator(null)
      setDeleteTarget(null)
      setActionTarget(null)
      setEditTarget(null)
    }
  }, [page])

  return (
    <div className="min-h-screen bg-[#f7f6f3] bg-noise flex flex-col">
      <header className="flex items-center justify-center pt-8 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E07B6C] via-[#8B8FD8] to-[#8BA89A]" />
          <h1 className="text-lg font-semibold text-gray-700 tracking-tight">Ra1nbow</h1>
        </div>
      </header>

      {page === 'day' ? (
        <>
          <main className="flex-1 flex items-center justify-center px-4">
            <div className="w-full max-w-[560px]">
              <DayWheel
                events={events}
                currentTime={currentTime}
                activeStart={settings.activeStart}
                activeEnd={settings.activeEnd}
                timeFormat={settings.timeFormat}
                allowOverlap={settings.allowOverlap}
                onGapClick={handleGapClick}
                onEventClick={handleEventClick}
                onEventTimeChange={handleEventTimeChange}
              />
            </div>
          </main>

          <footer className="text-center pb-6 text-xs text-gray-300 font-mono">
            drag events to move • pull edges to resize • click gaps to add
          </footer>
        </>
      ) : (
        <TasksPage />
      )}

      <div className="fixed bottom-6 left-6 z-30 flex items-center gap-2">
        <a
          href="/mockup.html"
          className="h-10 px-4 rounded-full bg-white/80 backdrop-blur shadow-lg shadow-black/5 border border-gray-100 flex items-center gap-2 text-gray-400 hover:text-gray-600 hover:scale-105 transition-all active:scale-95 no-underline text-xs font-semibold tracking-wide"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="18" rx="3" />
            <path d="M2 9h20" />
          </svg>
          Card Mode
        </a>

        <button
          onClick={() => setPage(page === 'day' ? 'tasks' : 'day')}
          className={`h-10 px-4 rounded-full backdrop-blur shadow-lg shadow-black/5 border flex items-center gap-2 hover:scale-105 transition-all active:scale-95 text-xs font-semibold tracking-wide cursor-pointer ${
            page === 'tasks'
              ? 'bg-gradient-to-r from-[#B5B8F0] to-[#E8A0BF] text-white border-white/30'
              : 'bg-white/80 text-gray-400 hover:text-gray-600 border-gray-100'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="6" r="4" />
            <path d="M12 10 Q11 16, 12 22" />
          </svg>
          {page === 'tasks' ? 'Day View' : 'Tasks'}
        </button>
      </div>

      <button
        onClick={() => setShowSettings(true)}
        className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-white/80 backdrop-blur shadow-lg shadow-black/5 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:scale-110 transition-all active:scale-95 z-30"
        aria-label="Settings"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {creator && (
        <EventCreator
          startH={creator.startH}
          endH={creator.endH}
          anchorX={creator.anchorX}
          anchorY={creator.anchorY}
          timeFormat={settings.timeFormat}
          onConfirm={handleCreateEvent}
          onCancel={handleCancelCreate}
        />
      )}

      {actionTarget && (
        <EventActionMenu
          event={actionTarget.event}
          anchorX={actionTarget.anchorX}
          anchorY={actionTarget.anchorY}
          timeFormat={settings.timeFormat}
          onColorChange={handleColorChange}
          onEdit={(event) => setEditTarget(event)}
          onDelete={(event) => setDeleteTarget(event)}
          onClose={() => setActionTarget(null)}
        />
      )}

      {editTarget && (
        <EventEditor
          event={editTarget}
          onSave={handleRenameEvent}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          event={deleteTarget}
          timeFormat={settings.timeFormat}
          onDelete={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
      {showSettings && (
        <Settings
          activeStart={settings.activeStart}
          activeEnd={settings.activeEnd}
          timeFormat={settings.timeFormat}
          allowOverlap={settings.allowOverlap}
          onActiveStartChange={handleActiveStartChange}
          onActiveEndChange={handleActiveEndChange}
          onTimeFormatChange={handleTimeFormatChange}
          onAllowOverlapChange={handleAllowOverlapChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
