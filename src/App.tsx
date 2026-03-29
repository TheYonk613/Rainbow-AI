import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { CalendarEvent, TimeFormat } from './types'
import { type CompletedTask, type JourneyBeat } from './data/journeyMockData'
import { useCurrentTime } from './hooks/useCurrentTime'
import { defaultEventTimes, findGapAtTime } from './utils'
import DayWheel from './components/DayWheel'
import DateStrip from './components/DateStrip'
import DeleteConfirm from './components/DeleteConfirm'
import EventActionMenu from './components/EventActionMenu'
import TetheredBubble from './components/TetheredBubble'
import EventCreator from './components/EventCreator'
import EventEditor from './components/EventEditor'
import Settings from './components/Settings'
import TasksPage from './components/TasksPage'
import { JourneyPage } from './components/JourneyPage'
import JourneyIcon from './components/JourneyIcon'
import VoiceButton from './components/VoiceButton'

const STORAGE_KEY = 'ra1nbow-settings'
const POP_DURATION_MS = 550

interface PersistedSettings {
  timeFormat: TimeFormat
  darkMode: boolean
  timeZone: string
  markerResolution: 'minimal' | 'standard' | 'chronograph' | 'technical'
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
        markerResolution: parsed.markerResolution ?? 'standard',
      }
    }
  } catch {
    // ignore corrupted storage
  }

  return {
    timeFormat: '24h',
    darkMode: false,
    timeZone: 'system',
    markerResolution: 'standard',
  }
}

export default function App() {
  const [mode, setMode] = useState<'orbit' | 'rainbow' | 'balloon' | 'journey'>('orbit')
  const wheelRef = useRef<HTMLDivElement>(null)
  
  const [settings, setSettings] = useState<PersistedSettings>(loadSettings)
  const { currentTime, todayDate } = useCurrentTime(settings.timeZone)
  
  // We initialize selectedDate once. It stays on its selected day unless the user interacts.
  const [selectedDate, setSelectedDate] = useState<string>(todayDate)

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([])
  const [beats, setBeats] = useState<JourneyBeat[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const prevModeRef = useRef<'orbit' | 'rainbow' | 'balloon' | null>(null)
  const [creator, setCreator] = useState<{
    startH: number
    endH: number
    anchorX: number
    anchorY: number
    centerX?: number
    centerY?: number
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null)
  const [aiResponse, setAiResponse] = useState<{ message: string; sub?: string } | null>(null)
  
  const fetchJourney = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`http://localhost:3001/api/calendar/journey?date=${today}`);
      if (res.ok) {
        const data = await res.json();
        setCompletedTasks(data.completedTasks || []);
        setBeats(data.beats || []);
      }
    } catch (err) {
      console.error('Journey Fetch Pipeline Offline:', err);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/calendar/events');
      if (res.ok) {
          const data = await res.json();
          setEvents(data || []);
          setIsAuthenticated(true);
      }
    } catch (err) {
      console.error('Backend Integration Pipeline Offline:', err);
    }
  }, []);

  const handleAiAction = useCallback((transcript?: string, aiData?: any) => {
    if (aiData?.message) {
      setAiResponse({ message: aiData.message, sub: aiData.mockTranscript || transcript })
      setTimeout(() => setAiResponse(null), 8000)
      // REFRESH DAYWHEEL WITH NATIVE SQLITE CHANGES INSTANTLY!
      fetchEvents();
      fetchJourney();
    } else if (aiData?.error) {
      setAiResponse({ message: 'Execution Blocked', sub: aiData.error })
      setTimeout(() => setAiResponse(null), 8000)
    }
  }, [fetchEvents, fetchJourney])

  const [actionTarget, setActionTarget] = useState<{
    event: CalendarEvent
    anchorX: number
    anchorY: number
    centerX: number
    centerY: number
  } | null>(null)
  const [lastMenuPos, setLastMenuPos] = useState<{ x: number, y: number } | null>(null)
  const [editTarget, setEditTarget] = useState<CalendarEvent | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  // OAuth Ingress Hook
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const loginStatus = params.get('login')
    if (loginStatus === 'success') {
      setIsAuthenticated(true)
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl)
    }
  }, [])

  // Phase 2: Autonomous SQLite Local Database Data Overrides
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await fetch('http://localhost:3001/api/calendar/sync', { method: 'POST' });
        if (isMounted) {
          await fetchEvents();
          await fetchJourney();
        }
      } catch (err) {
        console.error('Initial sync failed', err);
      }
    })();
    return () => { isMounted = false; };
  }, [fetchEvents, fetchJourney]);

  const handleTimeFormatChange = useCallback((f: TimeFormat) => {
    setSettings((prev) => ({ ...prev, timeFormat: f }))
  }, [])

  const handleTimeZoneChange = useCallback((tz: string) => {
    setSettings((prev) => ({ ...prev, timeZone: tz }))
  }, [])

  const toggleDarkMode = useCallback(() => {
    setSettings((prev) => ({ ...prev, darkMode: !prev.darkMode }))
  }, [])

  const handleMarkerResolutionChange = useCallback((res: PersistedSettings['markerResolution']) => {
    setSettings((prev) => ({ ...prev, markerResolution: res }))
  }, [])

  const handleGapClick = useCallback(
    (hour: number, clientX: number, clientY: number, centerX?: number, centerY?: number) => {
      const dayEvents = events.filter((e) => e.date === selectedDate)
      const gap = findGapAtTime(dayEvents, hour)
      if (!gap) return
      const { startH, endH } = defaultEventTimes(hour, gap)
      setCreator({ startH, endH, anchorX: clientX, anchorY: clientY, centerX: centerX ?? clientX, centerY: centerY ?? clientY })
    },
    [events, selectedDate]
  )

  const handleCreateEvent = useCallback((event: CalendarEvent) => {
    // Stamp the event with the currently selected date
    const stamped = { ...event, date: selectedDate }
    setEvents((prev) => [...prev, stamped])
    setCreator(null)

    // Persist to SQLite + Google Calendar
    fetch('http://localhost:3001/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: stamped.id, title: stamped.title, date: stamped.date, startH: stamped.startH, endH: stamped.endH, color: stamped.color })
    }).catch(err => console.error('Create sync failed:', err));

    setTimeout(() => {
      setEvents((prev) => prev.map((e) => (e.id === stamped.id ? { ...e, isNew: false } : e)))
    }, 700)
  }, [selectedDate])

  const handleCancelCreate = useCallback(() => setCreator(null), [])

  const handleEventClick = useCallback(
    (event: CalendarEvent, clientX: number, clientY: number) => {
      if (mode !== 'orbit') return
      // Find the center of the wheel container in the viewport
      const wheelRect = wheelRef.current?.getBoundingClientRect()
      const centerX = wheelRect ? wheelRect.left + wheelRect.width / 2 : window.innerWidth / 2
      const centerY = wheelRect ? wheelRect.top + wheelRect.height / 2 : window.innerHeight / 2

      setActionTarget({
        event,
        anchorX: clientX,
        anchorY: clientY,
        centerX,
        centerY,
      })
    },
    [mode]
  )

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return

    const targetId = deleteTarget.id
    setDeleteTarget(null)

    // Optimistic UI Google Deletion Bridge
    fetch(`http://localhost:3001/api/calendar/events/${targetId}`, { method: 'DELETE' })
      .catch(err => console.error('Remote deletion failed', err))

    setEvents((prev) => prev.map((e) => (e.id === targetId ? { ...e, isPopping: true } : e)))

    setTimeout(() => {
      setEvents((prev) => prev.filter((e) => e.id !== targetId))
      fetchJourney()
    }, POP_DURATION_MS)
  }, [deleteTarget, fetchJourney])


  const handleEventTimeChange = useCallback((id: string, startH: number, endH: number) => {
    setEvents((prev) => prev.map((e) => {
      if (e.id === id) {
        // Optimistic UI Update Backend Call - Never pauses React rendering
        fetch(`http://localhost:3001/api/calendar/events/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: e.date, startH, endH, title: e.title })
        }).catch(err => console.error('Sync failed:', err));
        return { ...e, startH, endH };
      }
      return e;
    }))
  }, [])

  const handleRenameEvent = useCallback((id: string, newTitle: string) => {
    setEvents((prev) => prev.map((e) => {
      if (e.id === id) {
        fetch(`http://localhost:3001/api/calendar/events/${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: e.date, startH: e.startH, endH: e.endH, title: newTitle })
        }).catch(err => console.error('Sync failed:', err));
        return { ...e, title: newTitle };
      }
      return e;
    }))
    setEditTarget(null)
    setActionTarget((prev) =>
      prev && prev.event.id === id ? { ...prev, event: { ...prev.event, title: newTitle } } : prev
    )
  }, [])

  const handleUpdateNotes = useCallback((id: string, notes: string) => {
    setEvents((prev) => prev.map((e) => {
      if (e.id === id) {
        // Persist notes to SQLite + Google Calendar description
        fetch(`http://localhost:3001/api/calendar/events/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: e.date, startH: e.startH, endH: e.endH, title: e.title, notes })
        }).catch(err => console.error('Notes sync failed:', err));
        return { ...e, notes };
      }
      return e;
    }))
    setActionTarget((prev) =>
      prev && prev.event.id === id ? { ...prev, event: { ...prev.event, notes } } : prev
    )
  }, [])

  const handleColorChange = useCallback((id: string, color: string) => {
    setEvents((prev) => prev.map((e) => {
      if (e.id === id) {
        // Persist color to SQLite
        fetch(`http://localhost:3001/api/calendar/events/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: e.date, startH: e.startH, endH: e.endH, title: e.title, color })
        }).catch(err => console.error('Color sync failed:', err));
        return { ...e, color };
      }
      return e;
    }))
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
    setEvents((prev) => prev.map((e) => {
      if (e.id === id) {
        fetch(`http://localhost:3001/api/calendar/events/${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: e.date, startH, endH, title: e.title })
        }).catch(err => console.error('Sync failed:', err));
        return { ...e, startH, endH };
      }
      return e;
    }))
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

  const handleCompleteEvent = useCallback((event: CalendarEvent) => {
    setActionTarget(null)
    const targetId = event.id

    // Optimistic UI Backend Bridge for Completion
    fetch(`http://localhost:3001/api/calendar/events/${targetId}/complete`, { method: 'POST' })
      .catch(err => console.error('Remote completion failed', err))

    setEvents((prev) => prev.map((e) => (e.id === targetId ? { ...e, isPopping: true } : e)))

    setTimeout(() => {
      setEvents((prev) => prev.filter((e) => e.id !== targetId))
      fetchJourney()
    }, POP_DURATION_MS)
  }, [fetchJourney])

  const handleCloseActionMenu = useCallback(() => {
    setActionTarget(null)
  }, [])

  const handleCancelDelete = useCallback(() => {
    if (deleteTarget && lastMenuPos) {
      // We need to re-calculate centerX and centerY if we restore the action target
      const wheelRect = wheelRef.current?.getBoundingClientRect()
      const centerX = wheelRect ? wheelRect.left + wheelRect.width / 2 : window.innerWidth / 2
      const centerY = wheelRect ? wheelRect.top + wheelRect.height / 2 : window.innerHeight / 2
      setActionTarget({ event: deleteTarget, anchorX: lastMenuPos.x, anchorY: lastMenuPos.y, centerX, centerY })
    }
    setDeleteTarget(null)
  }, [deleteTarget, lastMenuPos])

  // Close ring-only overlays when leaving the orbit view
  const handleRestoreEvent = useCallback(async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/calendar/events/${id}/restore`, { method: 'POST' });
      if (res.ok) {
        // Refresh both views to keep state consistent across Orbit and Journey
        await fetchEvents();
        await fetchJourney();
      }
    } catch (err) {
      console.error('Restoration failed', err);
    }
  }, [fetchEvents, fetchJourney]);

  useEffect(() => {
    if (mode !== 'orbit') {
      setCreator(null)
      setDeleteTarget(null)
      setActionTarget(null)
      setEditTarget(null)
    }
  }, [mode])

  const handleToggleJourney = useCallback(() => {
    if (mode === 'journey') {
      setMode(prevModeRef.current ?? 'orbit')
    } else {
      setMode('journey')
    }
  }, [mode])

  const handleCloseJourney = useCallback(() => {
    setMode(prevModeRef.current ?? 'orbit')
  }, [])
  return (
    <div className={`min-h-screen transition-colors duration-500 flex flex-col ${settings.darkMode ? 'dark bg-[#121212]' : 'bg-[#f7f6f3]'} bg-noise`}>
      <header className="flex items-center justify-center pt-8 pb-2 relative z-20">
        <button
          onClick={toggleDarkMode}
          className="absolute left-6 top-8 w-11 h-11 rounded-full bg-slate-200/50 dark:bg-white/5 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-black/10 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:scale-105 transition-all active:scale-95 active:bg-slate-300/50 dark:active:bg-white/10 z-30"
          aria-label="Toggle Dark Mode"
        >
          {settings.darkMode ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E07B6C] via-[#8B8FD8] to-[#8BA89A]" />
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight transition-colors">Ra1nbow</h1>
            {isAuthenticated && settings.timeZone && (
              <span className="text-[10px] font-bold bg-[#E07B6C]/10 text-[#E07B6C] border border-[#E07B6C]/20 px-2 py-0.5 rounded-full tracking-widest uppercase ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Local-Only
              </span>
            )}
          </div>
        </div>
        {/* Journey icon — top right, glows at 7PM */}
        <div className="absolute right-6 top-8 z-30">
          <JourneyIcon
            onClick={handleToggleJourney}
            isActive={mode === 'journey'}
          />
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
            <AnimatePresence>
              {aiResponse && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 30 }}
                  className="absolute bottom-[20%] left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 dark:bg-white/95 text-white dark:text-gray-900 py-3 px-6 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] backdrop-blur-xl border border-white/10 dark:border-black/5 max-w-sm text-center"
                >
                  <p className="font-bold text-[13px] tracking-wide">{aiResponse.message}</p>
                  {aiResponse.sub && <p className="text-[11px] opacity-70 mt-1.5 font-mono bg-black/20 dark:bg-black/5 px-2 py-1 rounded-md line-clamp-2">"{aiResponse.sub}"</p>}
                </motion.div>
              )}
            </AnimatePresence>

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
            <div className="w-full max-w-[560px] flex flex-col items-center mb-2 relative group" ref={wheelRef}>
              <DayWheel
                events={events.filter((e) => e.date === selectedDate)}
                currentTime={currentTime}
                selectedDate={selectedDate}
                todayDate={todayDate}
                timeFormat={settings.timeFormat}
                markerResolution={settings.markerResolution}
                dateLabel={new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
                selectedEventId={actionTarget?.event.id}
                onGapClick={handleGapClick}
                onEventClick={handleEventClick}
                onEventTimeChange={handleEventTimeChange}
                onResetView={() => setSelectedDate(todayDate)}
              />
              <VoiceButton onAiAction={handleAiAction} />
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
        {/* Journey View */}
        <AnimatePresence>
          {mode === 'journey' && (
            <div className="absolute inset-0 z-20">
              <JourneyPage 
                onBack={handleCloseJourney} 
                completedTasks={completedTasks} 
                beats={beats} 
                onRestore={handleRestoreEvent}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation Dock */}
      <div className="fixed bottom-6 left-6 z-40 flex items-center gap-2 p-1.5 rounded-full bg-slate-200/60 dark:bg-black/40 backdrop-blur-3xl shadow-2xl shadow-black/10 dark:shadow-black/25 border border-white/50 dark:border-white/10 transition-all duration-500">
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
          className={`h-10 px-6 rounded-full text-xs tracking-widest uppercase font-bold transition-all duration-200 active:scale-90 ${mode === 'orbit'
            ? 'bg-slate-900 border border-white/20 text-white shadow-lg'
            : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-100'
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
        className="fixed bottom-6 right-6 w-11 h-11 rounded-full bg-slate-200/50 dark:bg-white/5 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-black/10 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:scale-105 transition-all active:scale-95 active:bg-slate-300/50 dark:active:bg-white/10 z-30"
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
        <TetheredBubble
          anchorX={creator.anchorX}
          anchorY={creator.anchorY}
          centerX={creator.centerX!}
          centerY={creator.centerY!}
          color="rainbow"
          onClickOutside={handleCancelCreate}
        >
          <EventCreator
            startH={creator.startH}
            endH={creator.endH}
            timeFormat={settings.timeFormat}
            onConfirm={handleCreateEvent}
            onCancel={handleCancelCreate}
          />
        </TetheredBubble>
      )}

      <AnimatePresence>
        {actionTarget && mode === 'orbit' ? (
          <TetheredBubble
            key={actionTarget.event.id}
            anchorX={actionTarget.anchorX}
            anchorY={actionTarget.anchorY}
            centerX={actionTarget.centerX!}
            centerY={actionTarget.centerY!}
            color={actionTarget.event.color}
            onClickOutside={handleCloseActionMenu}
          >
            <EventActionMenu
              event={actionTarget.event}
              anchorX={actionTarget.anchorX}
              anchorY={actionTarget.anchorY}
              isOrbitMode
              onColorChange={handleColorChange}
              onTitleChange={handleRenameEvent}
              onNotesChange={handleUpdateNotes}
              onTimeChange={handleTimeChange}
              onEdit={handleEditEvent}
              onToggleImpassable={handleToggleImpassable}
              onDelete={handleDeleteEvent}
              onComplete={handleCompleteEvent}
              onClose={handleCloseActionMenu}
            />
          </TetheredBubble>
        ) : actionTarget ? (
          <EventActionMenu
            key={actionTarget.event.id}
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
            onComplete={handleCompleteEvent}
            onClose={handleCloseActionMenu}
          />
        ) : null}
      </AnimatePresence>

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
            markerResolution={settings.markerResolution}
            onTimeFormatChange={handleTimeFormatChange}
            onTimeZoneChange={handleTimeZoneChange}
            onMarkerResolutionChange={handleMarkerResolutionChange}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
