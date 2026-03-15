import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { CalendarEvent, TimeFormat } from './types'
import { SAMPLE_EVENTS } from './constants'
import { useCurrentTime } from './hooks/useCurrentTime'
import { defaultEventTimes, findGapAtTime, getZonedIsoDate } from './utils'
import DayWheel from './components/DayWheel'
import DateStrip from './components/DateStrip'
import DeleteConfirm from './components/DeleteConfirm'
import EventActionMenu from './components/EventActionMenu'
import EventCreator from './components/EventCreator'
import EventEditor from './components/EventEditor'
import Settings from './components/Settings'
import TasksPage from './components/TasksPage'

const STORAGE_KEY = 'ra1nbow-settings'
const POP_DURATION_MS = 550

interface PersistedSettings {
  timeFormat: TimeFormat
  darkMode: boolean
  timeZone: string
}

function loadSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        timeFormat: parsed.timeFormat ?? '24h',
        darkMode: parsed.darkMode ?? false,
        timeZone: parsed.timeZone ?? 'system',
      }
    }
  } catch {
    // ignore corrupted storage
  }

  return {
    timeFormat: '24h',
    darkMode: false,
    timeZone: 'system',
  }
}

export default function App() {
  const [mode, setMode] = useState<'orbit' | 'rainbow' | 'balloon'>('orbit')
  const [settings, setSettings] = useState<PersistedSettings>(loadSettings)
  
  // Today's ISO date, computed using the correct timezone
  const todayDate = useMemo(() => getZonedIsoDate(settings.timeZone), [settings.timeZone])
  
  // We initialize selectedDate only once and don't automatically break view when changing timezones
  const [selectedDate, setSelectedDate] = useState<string>(todayDate)

  const [events, setEvents] = useState<CalendarEvent[]>(SAMPLE_EVENTS)
  const [showSettings, setShowSettings] = useState(false)
  const currentTime = useCurrentTime(settings.timeZone)
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
  const [lastMenuPos, setLastMenuPos] = useState<{ x: number, y: number } | null>(null)
  const [editTarget, setEditTarget] = useState<CalendarEvent | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const handleTimeFormatChange = useCallback((f: TimeFormat) => {
    setSettings((prev) => ({ ...prev, timeFormat: f }))
  }, [])

  const handleTimeZoneChange = useCallback((tz: string) => {
    setSettings((prev) => ({ ...prev, timeZone: tz }))
  }, [])

  const toggleDarkMode = useCallback(() => {
    setSettings((prev) => ({ ...prev, darkMode: !prev.darkMode }))
  }, [])

  const handleGapClick = useCallback(
    (hour: number, clientX: number, clientY: number) => {
      const dayEvents = events.filter((e) => e.date === selectedDate)
      const gap = findGapAtTime(dayEvents, hour)
      if (!gap) return
      const { startH, endH } = defaultEventTimes(hour, gap)
      setCreator({ startH, endH, anchorX: clientX, anchorY: clientY })
    },
    [events, selectedDate]
  )

  const handleCreateEvent = useCallback((event: CalendarEvent) => {
    // Stamp the event with the currently selected date
    const stamped = { ...event, date: selectedDate }
    setEvents((prev) => [...prev, stamped])
    setCreator(null)

    setTimeout(() => {
      setEvents((prev) => prev.map((e) => (e.id === stamped.id ? { ...e, isNew: false } : e)))
    }, 700)
  }, [selectedDate])

  const handleCancelCreate = useCallback(() => setCreator(null), [])

  const handleEventClick = useCallback((event: CalendarEvent, clientX: number, clientY: number) => {
    if (mode !== 'orbit') return
    setActionTarget({ event, anchorX: clientX, anchorY: clientY })
  }, [mode])

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return

    const targetId = deleteTarget.id
    setDeleteTarget(null)

    setEvents((prev) => prev.map((e) => (e.id === targetId ? { ...e, isPopping: true } : e)))

    setTimeout(() => {
      setEvents((prev) => prev.filter((e) => e.id !== targetId))
    }, POP_DURATION_MS)
  }, [deleteTarget])


  const handleEventTimeChange = useCallback((id: string, startH: number, endH: number) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, startH, endH } : e)))
  }, [])

  const handleRenameEvent = useCallback((id: string, newTitle: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, title: newTitle } : e)))
    setEditTarget(null)
    setActionTarget((prev) =>
      prev && prev.event.id === id ? { ...prev, event: { ...prev.event, title: newTitle } } : prev
    )
  }, [])

  const handleUpdateNotes = useCallback((id: string, notes: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, notes } : e)))
    setActionTarget((prev) =>
      prev && prev.event.id === id ? { ...prev, event: { ...prev.event, notes } } : prev
    )
  }, [])

  const handleColorChange = useCallback((id: string, color: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, color } : e)))
    // Also update the action menu's own event reference so wheel + header reflect new color live
    setActionTarget((prev) =>
      prev && prev.event.id === id ? { ...prev, event: { ...prev.event, color } } : prev
    )
  }, [])

  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setEditTarget(event)
    setActionTarget(null)
  }, [])

  const handleToggleImpassable = useCallback((id: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, isImpassable: !e.isImpassable } : e)))
    setActionTarget((prev) =>
      prev && prev.event.id === id ? { ...prev, event: { ...prev.event, isImpassable: !prev.event.isImpassable } } : prev
    )
  }, [])

  const handleTimeChange = useCallback((id: string, startH: number, endH: number) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, startH, endH } : e)))
    setActionTarget((prev) =>
      prev && prev.event.id === id ? { ...prev, event: { ...prev.event, startH, endH } } : prev
    )
  }, [])

  const handleDeleteEvent = useCallback((event: CalendarEvent) => {
    setDeleteTarget(event)
    // Save position to reopen if cancelled
    setActionTarget((prev) => {
      if (prev) setLastMenuPos({ x: prev.anchorX, y: prev.anchorY })
      return null
    })
  }, [])

  const handleCloseActionMenu = useCallback(() => {
    setActionTarget(null)
  }, [])

  const handleCancelDelete = useCallback(() => {
    if (deleteTarget && lastMenuPos) {
      setActionTarget({ event: deleteTarget, anchorX: lastMenuPos.x, anchorY: lastMenuPos.y })
    }
    setDeleteTarget(null)
  }, [deleteTarget, lastMenuPos])

  // Close ring-only overlays when leaving the orbit view
  useEffect(() => {
    if (mode !== 'orbit') {
      setCreator(null)
      setDeleteTarget(null)
      setActionTarget(null)
      setEditTarget(null)
    }
  }, [mode])

  return (
    <div className={`min-h-screen transition-colors duration-500 flex flex-col ${settings.darkMode ? 'dark bg-[#121212]' : 'bg-[#f7f6f3]'} bg-noise`}>
      <header className="flex items-center justify-center pt-8 pb-2 relative z-20">
        <button
          onClick={toggleDarkMode}
          className="absolute left-6 top-8 w-10 h-10 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur border border-black/5 dark:border-white/10 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:scale-110 transition-all active:scale-95 active:bg-black/5 dark:active:bg-white/10 z-30"
          aria-label="Toggle Dark Mode"
        >
          {settings.darkMode ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E07B6C] via-[#8B8FD8] to-[#8BA89A]" />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight transition-colors">Ra1nbow</h1>
        </div>
      </header>

      {/* Views Container */}
      <div className="flex-1 relative w-full h-full">
        {/* Rainbow View */}
        <div
          className={`absolute inset-0 transition-opacity duration-[400ms] flex flex-col items-center justify-center ${mode === 'rainbow' ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'
            }`}
        >
          <div className="text-gray-400 font-mono text-sm tracking-widest uppercase">
            Rainbow Mode Incoming
          </div>
        </div>

        {/* Orbit View */}
        <div
          className={`absolute inset-0 transition-opacity duration-[400ms] flex flex-col ${mode === 'orbit' ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'
            }`}
        >
          <main className="flex-1 flex flex-col items-center justify-center px-4 overflow-hidden relative">
            {/* Date label — moved even higher to clear the top of the ring */}
            <div className="absolute top-1 left-0 right-0 flex items-center justify-center z-10">
              <div className="date-label" key={selectedDate}>
                {selectedDate === todayDate && (
                  <span className="date-label-today-badge">Today</span>
                )}
                <span className="date-label-text">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Top Area: DayWheel Ring */}
            <div className="w-full max-w-[560px] flex flex-col items-center mb-2">
              <DayWheel
                events={events.filter((e) => e.date === selectedDate)}
                currentTime={selectedDate === todayDate ? currentTime : -1}
                timeFormat={settings.timeFormat}
                selectedEventId={actionTarget?.event.id}
                onGapClick={handleGapClick}
                onEventClick={handleEventClick}
                onEventTimeChange={handleEventTimeChange}
              />
            </div>

            {/* Middle Area: Date Wheel Selection */}
            <div className="w-full max-w-[560px] mb-12">
              <DateStrip
                selectedDate={selectedDate}
                todayDate={todayDate}
                events={events}
                onSelectDate={setSelectedDate}
              />
            </div>

            <footer className="w-full text-center pb-2 text-xs text-gray-300 font-mono opacity-50">
              click · drag · resize
            </footer>
          </main>
        </div>

        {/* Balloon View */}
        <div
          className={`absolute inset-0 transition-opacity duration-[400ms] flex flex-col ${mode === 'balloon' ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'
            }`}
        >
          <TasksPage />
        </div>
      </div>

      {/* Bottom Navigation Dock */}
      <div className="fixed bottom-6 left-6 z-40 flex items-center gap-2 p-1.5 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-2xl shadow-2xl shadow-black/15 border border-white/20 dark:border-white/10 transition-all duration-500">
        <a
          href="/mockup.html"
          className="h-10 px-4 rounded-full bg-white/40 dark:bg-white/5 border border-transparent hover:border-gray-100 dark:hover:border-white/10 flex items-center gap-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:scale-105 transition-all active:scale-95 no-underline text-xs font-semibold tracking-wide"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="18" rx="3" />
            <path d="M2 9h20" />
          </svg>
          Card Mode
        </a>

        <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1" />

        <button
          onClick={() => setMode('orbit')}
          className={`h-10 px-6 rounded-full text-sm tracking-wide font-semibold transition-all duration-200 active:scale-90 ${mode === 'orbit'
            ? 'bg-white dark:bg-white shadow-lg text-gray-900'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100'
            }`}
        >
          Orbit
        </button>
        <button
          onClick={() => setMode('rainbow')}
          className={`h-10 px-6 rounded-full text-sm tracking-wide font-semibold transition-all duration-200 active:scale-90 ${mode === 'rainbow'
            ? 'bg-gradient-to-r from-[#e58a7d] via-[#a3a6e6] to-[#9ebbb0] text-white shadow-lg shadow-purple-500/30'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100'
            }`}
        >
          Rainbow
        </button>
        <button
          onClick={() => setMode('balloon')}
          className={`h-10 px-6 rounded-full text-sm tracking-wide font-semibold transition-all duration-200 active:scale-90 ${mode === 'balloon'
            ? 'bg-gradient-to-r from-[#B5B8F0] to-[#E8A0BF] text-white shadow-lg shadow-pink-500/30'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100'
            }`}
        >
          Balloon
        </button>
      </div>

      <button
        onClick={() => setShowSettings(true)}
        className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-white/80 dark:bg-white/10 backdrop-blur shadow-lg shadow-black/5 dark:shadow-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-400 dark:text-gray-300 dark:hover:text-white hover:text-gray-600 hover:scale-110 transition-all active:scale-95 z-30"
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
          onColorChange={handleColorChange}
          onTitleChange={handleRenameEvent}
          onNotesChange={handleUpdateNotes}
          onTimeChange={handleTimeChange}
          onEdit={handleEditEvent}
          onToggleImpassable={handleToggleImpassable}
          onDelete={handleDeleteEvent}
          onClose={handleCloseActionMenu}
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
      <AnimatePresence mode="wait">
        {showSettings && (
          <Settings
            key="settings"
            timeFormat={settings.timeFormat}
            timeZone={settings.timeZone}
            onTimeFormatChange={handleTimeFormatChange}
            onTimeZoneChange={handleTimeZoneChange}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
