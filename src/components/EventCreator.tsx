import { useState, useRef, useLayoutEffect } from 'react'
import type { CalendarEvent, EventType, TimeFormat } from '../types'
import { EVENT_COLORS } from '../constants'
import { generateId, formatTime } from '../utils'

interface EventCreatorProps {
  startH: number
  endH: number
  timeFormat: TimeFormat
  onConfirm: (event: CalendarEvent) => void
  onCancel: () => void
}

export default function EventCreator({
  startH,
  endH,
  timeFormat,
  onConfirm,
  onCancel,
}: EventCreatorProps) {
  const [title, setTitle] = useState('')
  const [localStartH, setLocalStartH] = useState(startH)
  const [localEndH, setLocalEndH] = useState(endH)
  const [type] = useState<EventType>('fluid')
  const [color, setColor] = useState(() => "g2-inferno")
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus the input on mount
  useLayoutEffect(() => {
    // Small delay so the pop-in animation starts first
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = () => {
    const finalTitle = title.trim() || 'New Event'
    onConfirm({
      id: generateId(),
      title: finalTitle,
      startH: localStartH,
      endH: localEndH,
      color,
      type,
      isNew: true,
      date: '' // This will be stamped by App.tsx
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Position color picker dots in an arc at bottom
  const archRadius = 95
  const colorCount = EVENT_COLORS.length
  const totalAngle = 110
  const startAngle = 90 - totalAngle / 2

  const timeOptions = Array.from({ length: 48 }, (_, i) => i * 0.5)

          {/* Title input */}
          <input
            ref={inputRef}
            type="text"
            placeholder="What's happening?"
            value={title}
            onChange={(e) => {
              const val = e.target.value
              setTitle(val.length === 1 ? val.toUpperCase() : val)
            }}
            onKeyDown={handleKeyDown}
            className="w-full text-lg font-semibold text-gray-800 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 bg-transparent border-none outline-none"
          />

      {/* 2) Middle: Title Input & Create Button */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 w-full gap-4 mt-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="New Event"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bubble-title-input w-full"
          style={{ fontSize: '1.4rem', borderBottomColor: 'rgba(255,255,255,0.2)' }}
        />
        
        <button
          onClick={handleSubmit}
          className="create-event-btn hover:bg-white/10 transition-colors"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            fontWeight: 700,
            padding: '10px 24px',
            borderRadius: '999px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            marginTop: '8px',
          }}
        >
          Create Event
        </button>
      </div>

      {/* 3) Bottom Arc: Color Picker */}
      {EVENT_COLORS.map((c, i) => {
        const angleDeg = startAngle + i * (totalAngle / (colorCount - 1))
        const angleRad = (angleDeg * Math.PI) / 180
        const x = Math.cos(angleRad) * archRadius
        const y = Math.sin(angleRad) * archRadius

        return (
          <div
            key={c}
            onClick={() => setColor(c)}
            className="bubble-color-arc absolute cursor-pointer"
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: `var(--${c}-mid)`,
              transform: `translate(${x}px, ${y}px)`,
              top: '50%',
              left: '50%',
              marginTop: '-8px',
              marginLeft: '-8px',
              boxShadow: color === c 
                ? '0 0 0 2px rgba(255,255,255,0.8), 0 0 8px rgba(0,0,0,0.3)' 
                : '0 2px 4px rgba(0,0,0,0.2)',
              opacity: color === c ? 1 : 0.6,
              transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)'
            }}
          />
        )
      })}
    </div>
  )
}
