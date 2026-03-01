import { useState, useRef, useEffect } from 'react'
import type { CalendarEvent, EventType, TimeFormat } from '../types'
import { EVENT_COLORS } from '../constants'
import { generateId, formatTime } from '../utils'

interface EventCreatorProps {
  startH: number
  endH: number
  anchorX: number
  anchorY: number
  timeFormat: TimeFormat
  onConfirm: (event: CalendarEvent) => void
  onCancel: () => void
}

export default function EventCreator({
  startH,
  endH,
  anchorX,
  anchorY,
  timeFormat,
  onConfirm,
  onCancel,
}: EventCreatorProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<EventType>('fluid')
  const [color, setColor] = useState(() => {
    // Pick a random color from the palette
    return EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)]
  })
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus the input on mount
  useEffect(() => {
    // Small delay so the pop-in animation starts first
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  const handleSubmit = () => {
    const finalTitle = title.trim() || 'New Event'
    onConfirm({
      id: generateId(),
      title: finalTitle,
      startH,
      endH,
      color,
      type,
      isNew: true,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Position popover near the click, but keep it on-screen
  const popWidth = 280
  const popHeight = 280
  const margin = 16
  const left = Math.min(
    Math.max(margin, anchorX - popWidth / 2),
    window.innerWidth - popWidth - margin
  )
  const top = Math.min(
    Math.max(margin, anchorY + 24),
    window.innerHeight - popHeight - margin
  )

  return (
    <>
      {/* Backdrop — click to cancel */}
      <div
        className="fixed inset-0 z-40"
        onClick={onCancel}
      />

      {/* Popover */}
      <div
        className="fixed z-50 animate-pop-in"
        style={{ left, top, width: popWidth }}
      >
        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl shadow-black/8 dark:shadow-black/40 border border-gray-100 dark:border-white/10 p-5 space-y-4">
          {/* Time display */}
          <div className="text-xs font-mono text-gray-400 dark:text-gray-500 tracking-wide">
            {formatTime(startH, timeFormat)} — {formatTime(endH, timeFormat)}
          </div>

          {/* Title input */}
          <input
            ref={inputRef}
            type="text"
            placeholder="What's happening?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full text-lg font-semibold text-gray-800 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 bg-transparent border-none outline-none"
          />

          {/* Type toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setType('fluid')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${type === 'fluid'
                  ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30'
                  : 'bg-gray-50 text-gray-400 dark:bg-white/5 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
            >
              Fluid
            </button>
            <button
              onClick={() => setType('solid')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${type === 'solid'
                  ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/30'
                  : 'bg-gray-50 text-gray-400 dark:bg-white/5 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
            >
              Solid
            </button>
          </div>

          {/* Color picker */}
          <div className="flex gap-2 justify-center">
            {EVENT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-all ${color === c
                    ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-[#1e1e1e] dark:ring-white/50 scale-110'
                    : 'hover:scale-110 opacity-60 hover:opacity-100'
                  }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Create button */}
          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: color }}
          >
            Create Event
          </button>
        </div>
      </div>
    </>
  )
}
