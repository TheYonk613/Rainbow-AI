import { useEffect, useRef, useState } from 'react'
import { Edit2, Trash2, Check } from 'lucide-react'
import type { CalendarEvent } from '../types'
import { EVENT_COLORS } from '../constants'
import { snapToFiveMinutes } from '../utils'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EventActionMenuProps {
    event: CalendarEvent
    anchorX: number
    anchorY: number
    isOrbitMode?: boolean
    onColorChange: (id: string, color: string) => void
    onTitleChange: (id: string, title: string) => void
    onNotesChange: (id: string, notes: string) => void
    onTimeChange: (id: string, startH: number, endH: number) => void
    onEdit: (event: CalendarEvent) => void
    onToggleImpassable: (id: string) => void
    onDelete: (event: CalendarEvent) => void
    onComplete?: (event: CalendarEvent) => void
    onClose: () => void
    isOrbitMode?: boolean
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EventActionMenu({
    event,
    anchorX,
    anchorY,
    isOrbitMode,
    onColorChange,
    onTitleChange,
    onNotesChange,
    onTimeChange,
    onEdit,
    onToggleImpassable,
    onDelete,
    onComplete,
    onClose,
    isOrbitMode,
}: EventActionMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const notesRef = useRef<HTMLTextAreaElement>(null)
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [isEditingNotes, setIsEditingNotes] = useState(false)

    // In orbit mode, outside-click and escape are handled by TetheredBubble.
    useEffect(() => {
        if (isOrbitMode) return
        const handle = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        const id = setTimeout(() => document.addEventListener('mousedown', handle), 50)
        return () => { clearTimeout(id); document.removeEventListener('mousedown', handle) }
    }, [onClose, isOrbitMode])

    useEffect(() => {
        if (isOrbitMode) return
        const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handle)
        return () => document.removeEventListener('keydown', handle)
    }, [onClose, isOrbitMode])

    useEffect(() => {
        if (isEditingTitle) {
            inputRef.current?.focus()
            inputRef.current?.select()
        }
    }, [isEditingTitle])

    useEffect(() => {
        if (isEditingNotes) notesRef.current?.focus()
    }, [isEditingNotes])

    const vw = window.innerWidth
    const vh = window.innerHeight
    const menuW = isOrbitMode ? 280 : 280
    const menuH = isOrbitMode ? 260 : 360
    const pad = 12

    // Positioning
    let left = anchorX - menuW / 2
    let top = anchorY - menuH / 2
    if (!isOrbitMode) {
        // Standard modal-like positioning logic
        if (left < pad) left = pad
        if (left + menuW > vw - pad) left = vw - menuW - pad
        if (top < pad) top = pad
        if (top + menuH > vh - pad) top = vh - menuH - pad
    } else {
        // When in orbit mode, the TetheredBubble handles its own centering
        left = 0
        top = 0
    }

    const duration = event.endH - event.startH
    const durationLabel = duration >= 1 ? `${Number(duration.toFixed(2))}h` : `${Math.round(duration * 60)}m`

    const today = new Date()
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
    const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

    const handleTimeInput = (type: 'start' | 'end', val: string) => {
        const [h, m] = val.split(':').map(Number)
        let newTime = h + m / 60
        newTime = snapToFiveMinutes(newTime)
        if (type === 'start') {
            onTimeChange(event.id, Math.min(newTime, event.endH - (1 / 12)), event.endH)
        } else {
            onTimeChange(event.id, event.startH, Math.max(newTime, event.startH + (1 / 12)))
        }
    }

    const toTimeInputValue = (hour: number) => {
        if (hour < 0) return '00:00'
        const h = Math.floor(hour) % 24
        const m = Math.round((hour - Math.floor(hour)) * 60)
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    }

    if (isOrbitMode) {
        return (
            <div className="bubble-orbit-layout pointer-events-auto">
                <div className="preview-title-display">{event.title || 'Untitled Event'}</div>
                <div className="preview-time-display">
                    {formatTime(event.startH, '12h')} – {formatTime(event.endH, '12h')}
                </div>

                <div className="preview-action-hub">
                    <button className="preview-action-btn" onClick={(e) => { e.stopPropagation(); onEdit(event) }}>
                        <Edit2 size={16} strokeWidth={2.5} />
                    </button>
                    {onComplete && (
                        <button className="preview-action-btn complete" onClick={(e) => { e.stopPropagation(); onComplete(event) }}>
                            <Check size={16} strokeWidth={2.5} />
                        </button>
                    )}
                    <button className="preview-action-btn delete" onClick={(e) => { e.stopPropagation(); onDelete(event) }}>
                        <Trash2 size={16} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="bubble-color-arc">
                    {EVENT_COLORS.map((c, i) => {
                        const total = EVENT_COLORS.length
                        const angleSpan = 120
                        const startAngle = -angleSpan / 2
                        const angleStep = angleSpan / Math.max(1, total - 1)
                        const angle = startAngle + i * angleStep
                        const radius = 95
                        const transformStr = `rotate(${angle}deg) translateY(${radius}px) rotate(${-angle}deg)`
                        return (
                            <button
                                key={c}
                                onClick={() => onColorChange(event.id, c)}
                                className={`bubble-color-dot ${c === event.color ? 'is-active' : ''}`}
                                style={{
                                    backgroundColor: `var(--${c}-mid)`,
                                    transform: transformStr,
                                    '--arc-transform': transformStr,
                                } as any}
                            />
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div
            ref={menuRef}
            style={{ left, top, position: 'fixed', zIndex: 100, width: menuW }}
            className="apple-calendar-menu"
        >
            <div className="apple-menu-content">
                <div className="apple-menu-date-row" onClick={() => onEdit(event)}>
                    <span className="apple-menu-day">{dayName}</span>
                    <span className="apple-menu-date">{dateStr}</span>
                </div>

                <div className="apple-menu-title-row">
                    <div
                        className="apple-menu-indicator"
                        style={{ backgroundColor: `var(--${event.color}-mid)` }}
                    />
                    {isEditingTitle ? (
                        <input
                            ref={inputRef}
                            type="text"
                            className="apple-menu-title-input editing"
                            value={event.title}
                            onChange={(e) => onTitleChange(event.id, e.target.value)}
                            onBlur={() => setIsEditingTitle(false)}
                            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.blur()}
                        />
                    ) : (
                        <div className="apple-menu-title-display" onClick={() => setIsEditingTitle(true)}>
                            {event.title || 'Untitled Event'}
                        </div>
                    )}
                </div>

                <div className="apple-menu-time-picker-row">
                    <div className="apple-time-field">
                        <label>Start</label>
                        <input type="time" step="300" value={toTimeInputValue(event.startH)} onChange={(e) => handleTimeInput('start', e.target.value)} />
                    </div>
                    <div className="apple-time-field">
                        <label>End</label>
                        <input type="time" step="300" value={toTimeInputValue(event.endH)} onChange={(e) => handleTimeInput('end', e.target.value)} />
                    </div>
                </div>
            </div>
        )
    }

                <div className="apple-menu-duration-tag" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '16px' }}>
                    <span>{durationLabel}</span>
                    <div className="flex items-center gap-2">
                        <label className="apple-notes-label" style={{ margin: 0, cursor: 'pointer', opacity: event.isImpassable ? 1 : 0.6 }} onClick={() => onToggleImpassable(event.id)}>
                            Impassable
                        </label>
                        <div className={`relative w-8 h-4 rounded-full transition-colors duration-200 cursor-pointer ${event.isImpassable ? 'bg-gray-800 dark:bg-white/20' : 'bg-gray-200 dark:bg-white/10'}`} onClick={() => onToggleImpassable(event.id)}>
                            <div className={`absolute top-[2px] left-[2px] w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${event.isImpassable ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                    </div>

                <div className="apple-menu-notes-section">
                    <label className="apple-notes-label">Notes</label>
                    {isEditingNotes ? (
                        <textarea ref={notesRef} className="apple-menu-notes-input" value={event.notes || ''} onChange={(e) => onNotesChange(event.id, e.target.value)} onBlur={() => setIsEditingNotes(false)} placeholder="Add notes..." />
                    ) : (
                        <div className="apple-menu-notes-display" onClick={() => setIsEditingNotes(true)}>{event.notes || 'Add notes...'}</div>
                    )}
                </div>

                <div className="apple-menu-divider" />

            <div className="apple-menu-footer">
                <div className="apple-menu-colors">
                    {EVENT_COLORS.map((c) => (
                        <button key={c} onClick={() => onColorChange(event.id, c)} className={`apple-color-dot ${c === event.color ? 'is-active' : ''}`} style={{ backgroundColor: `var(--${c}-mid)` }} />
                    ))}
                </div>
                <button className="apple-menu-delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(event) }}>
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    )
}

function formatTime(hour: number, format: '12h' | '24h' = '12h') {
  const h = Math.floor(hour) % 24
  const m = Math.floor((hour % 1) * 60)
  if (format === '12h') {
    const displayH = h % 12 || 12
    const ampm = h < 12 ? 'AM' : 'PM'
    return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`
  }
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}
