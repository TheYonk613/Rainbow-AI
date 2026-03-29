import { useState, useRef, useLayoutEffect } from 'react'
import type { CalendarEvent, EventType, TimeFormat } from '../types'
import { EVENT_COLORS } from '../constants'
import { generateId, formatTime } from '../utils'

interface EventCreatorProps {
  startH: number
  endH: number
  timeFormat: TimeFormat
  onConfirm: (event: CalendarEvent) => void
  onCancel?: () => void
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

  const toTimeInputValue = (hours: number): string => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  const timeInputToDecimal = (val: string): number => {
    if (!val) return 0
    const [hh, mm] = val.split(':').map(Number)
    return hh + mm / 60
  }

  return (
    <div className="bubble-orbit-layout w-full h-full flex flex-col pt-4 pb-8 relative z-10" onClick={(e) => e.stopPropagation()}>
      
      <div className="flex flex-col items-center w-full px-6 z-10 my-auto mb-10">
        
        {/* Title Input */}
        <div className="flex justify-center w-full px-2 mt-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="New Event"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-transparent text-center text-white/90 font-bold outline-none border-b border-transparent focus:border-white/40 transition-colors w-full pb-1"
            style={{ fontSize: '1.4rem', borderBottomColor: 'rgba(255,255,255,0.2)' }}
          />
        </div>

        {/* Time pickers */}
        <div className="flex justify-center items-end mt-4 gap-2 w-full px-2">
            <div className="flex flex-col gap-1 w-full bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                <label className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Start</label>
                <input
                    type="time" step="900" 
                    title="Start Time" aria-label="Start Time"
                    value={toTimeInputValue(localStartH)}
                    onChange={(e) => setLocalStartH(timeInputToDecimal(e.target.value))}
                    className="bg-transparent border-none text-white text-[15px] font-medium outline-none cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                />
            </div>
            
            <div className="flex justify-center items-center opacity-50 px-1 pb-3 text-lg">
                —
            </div>

            <div className="flex flex-col gap-1 w-full bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                <label className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">End</label>
                <input
                    type="time" step="900" 
                    title="End Time" aria-label="End Time"
                    value={toTimeInputValue(localEndH)}
                    onChange={(e) => setLocalEndH(timeInputToDecimal(e.target.value))}
                    className="bg-transparent border-none text-white text-[15px] font-medium outline-none cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                />
            </div>
        </div>

        {/* Create Button */}
        <div className="flex justify-center w-full mt-5">
            <button
              onClick={handleSubmit}
              className="create-event-btn hover:bg-white/10 transition-colors z-20"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                color: '#fff',
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 600,
                fontSize: '15px',
                padding: '8px 20px',
                borderRadius: '999px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              Create Event
            </button>
        </div>

        {/* Bottom: Curved color arc following inner circle */}
        <div className="bubble-color-arc">
          {EVENT_COLORS.map((c, i) => {
            const total = EVENT_COLORS.length
            const angleSpan = 140 // Total degrees the arc covers
            const startAngle = -angleSpan / 2
            const angleStep = angleSpan / Math.max(1, total - 1)
            const angle = startAngle + i * angleStep
            const radius = 80 // Distance from exact center

            // Rotate out from center, move by radius, then rotate back to keep dropshadows upright
            const transformStr = `rotate(${angle}deg) translateY(${radius}px) rotate(${-angle}deg)`
            
            return (
              <button
                key={c}
                onClick={(e) => {
                  e.stopPropagation()
                  setColor(c)
                }}
                title={`Color: ${c}`}
                className={`bubble-color-dot ${c === color ? 'is-active' : ''}`}
                style={{
                  backgroundColor: `var(--${c}-mid)`,
                  transform: transformStr,
                  '--arc-transform': transformStr,
                } as React.CSSProperties}
              />
            )
          })}
        </div>

      </div>
    </div>
  )
}
