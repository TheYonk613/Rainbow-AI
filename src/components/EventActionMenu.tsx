import { useEffect, useRef, useState } from 'react'
<<<<<<< Updated upstream
=======
import { Edit2, Trash2, Check } from 'lucide-react'
>>>>>>> Stashed changes
import type { CalendarEvent } from '../types'
import { EVENT_COLORS } from '../constants'
import { snapToFiveMinutes } from '../utils'

// ─── Main component ──────────────────────────────────────────────────────────

interface EventActionMenuProps {
    event: CalendarEvent
    anchorX: number
    anchorY: number
    onColorChange: (id: string, color: string) => void
    onTitleChange: (id: string, title: string) => void
    onNotesChange: (id: string, notes: string) => void
    onTimeChange: (id: string, startH: number, endH: number) => void
    onEdit: (event: CalendarEvent) => void
    onToggleImpassable: (id: string) => void
    onDelete: (event: CalendarEvent) => void
    onComplete?: (event: CalendarEvent) => void
    onClose: () => void
}

export default function EventActionMenu({
    event,
    anchorX,
    anchorY,
    onColorChange,
    onTitleChange,
    onNotesChange,
    onTimeChange,
    onEdit,
    onToggleImpassable,
    onDelete,
    onComplete,
    onClose,
}: EventActionMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const notesRef = useRef<HTMLTextAreaElement>(null)
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [isEditingNotes, setIsEditingNotes] = useState(false)

    // Close on outside click
    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        const id = setTimeout(() => document.addEventListener('mousedown', handle), 50)
        return () => {
            clearTimeout(id)
            document.removeEventListener('mousedown', handle)
        }
    }, [onClose])

    // Close on Escape
    useEffect(() => {
        const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handle)
        return () => document.removeEventListener('keydown', handle)
    }, [onClose])

    // Focus input when editing starts
    useEffect(() => {
        if (isEditingTitle) {
            inputRef.current?.focus()
            inputRef.current?.select()
        }
    }, [isEditingTitle])

    useEffect(() => {
        if (isEditingNotes) {
            notesRef.current?.focus()
        }
    }, [isEditingNotes])

    const vw = window.innerWidth
    const vh = window.innerHeight
    const menuW = 280 // Slightly wider for color dots
    const menuH = 360 // Increased for notes
    const pad = 12

    // Center on the bubble (bubble center is anchorX, anchorY)
    let left = anchorX - menuW / 2
    let top = anchorY - menuH / 2

    // Viewport safety
    if (left < pad) left = pad
    if (left + menuW > vw - pad) left = vw - menuW - pad
    if (top < pad) top = pad
    // We'll let the menu grow downwards, but check for bottom overflow
    if (top + menuH > vh - pad) top = vh - menuH - pad

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

    return (
        <div
            ref={menuRef}
            style={{ left, top, position: 'fixed', zIndex: 100, width: menuW, minHeight: 200 }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="apple-calendar-menu"
        >
            {/* ── Main Content Area ── */}
            <div className="apple-menu-content">
                {/* Clickable Date Section */}
                <div
                    className="apple-menu-date-row"
                    onClick={() => onEdit(event)}
                >
                    <span className="apple-menu-day">{dayName}</span>
                    <span className="apple-menu-date">{dateStr}</span>
                </div>

<<<<<<< Updated upstream
                {/* Editable Title Section */}
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
                            onChange={(e) => {
                                const val = e.target.value
                                onTitleChange(event.id, val.length === 1 ? val.toUpperCase() : val)
                            }}
                            onBlur={() => setIsEditingTitle(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') inputRef.current?.blur()
                            }}
=======
                {/* Middle: Action Hub (Edit / Delete) */}
                <div className="preview-action-hub">
                    <button
                        className="preview-action-btn"
                        onClick={(e) => { e.stopPropagation(); onEdit(event) }}
                        title="Edit event details"
                        aria-label="Edit event details"
                    >
                        <Edit2 size={16} strokeWidth={2.5} />
                    </button>
                    {onComplete && (
                        <button
                            className="preview-action-btn complete"
                            onClick={(e) => { e.stopPropagation(); onComplete(event) }}
                            title="Mark as completed"
                            aria-label="Mark as completed"
                        >
                            <Check size={16} strokeWidth={2.5} />
                        </button>
                    )}
                    <button
                        className="preview-action-btn delete"
                        onClick={(e) => { e.stopPropagation(); onDelete(event) }}
                        title="Delete event"
                        aria-label="Delete event"
                    >
                        <Trash2 size={16} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Bottom: Curved color arc following inner circle */}
                <div className="bubble-color-arc">
                    {EVENT_COLORS.map((c, i) => {
                        const total = EVENT_COLORS.length
                        const angleSpan = 90 // Total degrees the arc covers
                        const startAngle = -angleSpan / 2
                        const angleStep = angleSpan / Math.max(1, total - 1)
                        const angle = startAngle + i * angleStep
                        const radius = 106 // Distance from exact center

                        // Rotate out from center, move by radius, then rotate back to keep dropshadows upright
                        const transformStr = `rotate(${angle}deg) translateY(${radius}px) rotate(${-angle}deg)`
                        
                        return (
                            <button
                                key={c}
                                onClick={() => onColorChange(event.id, c)}
                                title={`Set color to ${c}`}
                                aria-label={`Set color to ${c}`}
                                className={`bubble-color-dot ${c === event.color ? 'is-active' : ''}`}
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
        )
    }

    // ── Full content for non-orbit mode ───────────────────────────────────────
    function renderFullContent() {
        const duration = event.endH - event.startH
        const durationLabel = duration >= 1 ? `${Number(duration.toFixed(2))}h` : `${Math.round(duration * 60)}m`
        const today = new Date()
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
        const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

        return (
            <>
                <div className="apple-menu-content">
                    {/* Date row */}
                    <div className="apple-menu-date-row">
                        <div className="flex flex-col">
                            <span className="apple-menu-day">{dayName}</span>
                            <span className="apple-menu-date">{dateStr}</span>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="apple-menu-title-row">
                        <div
                            className="apple-menu-indicator"
                            style={{ backgroundColor: `var(--${event.color}-mid)` }}
>>>>>>> Stashed changes
                        />
                    ) : (
                        <div
                            className="apple-menu-title-display"
                            onClick={() => setIsEditingTitle(true)}
                        >
                            {event.title || 'Untitled Event'}
                        </div>
                    )}
                </div>

                {/* Editable Time Section */}
                <div className="apple-menu-time-picker-row">
                    <div className="apple-time-field">
                        <label>Start</label>
                        <input
                            type="time"
                            step="300"
                            value={toTimeInputValue(event.startH)}
                            onChange={(e) => handleTimeInput('start', e.target.value)}
                        />
                    </div>
                    <div className="apple-time-field">
                        <label>End</label>
                        <input
                            type="time"
                            step="300"
                            value={toTimeInputValue(event.endH)}
                            onChange={(e) => handleTimeInput('end', e.target.value)}
                        />
                    </div>
                </div>

                <div className="apple-menu-duration-tag" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '16px' }}>
                    <span>{durationLabel}</span>
                    <div className="flex items-center gap-2" style={{ marginTop: '-4px' }}>
                        <label
                            className="apple-notes-label"
                            style={{ margin: 0, cursor: 'pointer', opacity: event.isImpassable ? 1 : 0.6 }}
                            onClick={() => onToggleImpassable(event.id)}
                        >
                            Impassable
                        </label>
                        <div
                            className={`relative w-8 h-4 rounded-full transition-colors duration-200 cursor-pointer ${event.isImpassable ? 'bg-gray-800 dark:bg-white/20' : 'bg-gray-200 dark:bg-white/10'}`}
                            onClick={() => onToggleImpassable(event.id)}
                        >
                            <div
                                className={`absolute top-[2px] left-[2px] w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${event.isImpassable ? 'translate-x-4' : 'translate-x-0'}`}
                            />
                        </div>
                    </div>
                </div>

                {/* Editable Notes Section */}
                <div className="apple-menu-notes-section">
                    <label className="apple-notes-label">Notes</label>
                    {isEditingNotes ? (
                        <textarea
                            ref={notesRef}
                            className="apple-menu-notes-input"
                            value={event.notes || ''}
                            onChange={(e) => {
                                const val = e.target.value
                                onNotesChange(event.id, val.length === 1 ? val.toUpperCase() : val)
                            }}
                            onBlur={() => setIsEditingNotes(false)}
                            placeholder="Add notes..."
                        />
                    ) : (
                        <div
                            className="apple-menu-notes-display"
                            onClick={() => setIsEditingNotes(true)}
                        >
                            {event.notes || 'Add notes...'}
                        </div>
                    )}
                </div>
            </div>

            <div className="apple-menu-divider" />

            {/* ── Color selection dots at the bottom ── */}
            <div className="apple-menu-footer">
                <div className="apple-menu-colors">
                    {EVENT_COLORS.map((color) => (
                        <button
                            key={color}
                            onClick={() => onColorChange(event.id, color)}
                            className={`apple-color-dot ${color === event.color ? 'is-active' : ''}`}
                            style={{ backgroundColor: `var(--${color}-mid)` }}
                        />
                    ))}
                </div>

                <button
                    className="apple-menu-delete-btn"
                    onClick={(e) => { e.stopPropagation(); onDelete(event) }}
                    title="Delete event"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
