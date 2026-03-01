import { useEffect, useRef, useState } from 'react'
import type { CalendarEvent } from '../types'
import { EVENT_COLORS } from '../constants'
import { snapToQuarter } from '../utils'

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
    onDelete: (event: CalendarEvent) => void
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
    onDelete,
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
    if (top + menuH > vh - pad) top = vh - menuH - pad

    const duration = event.endH - event.startH
    const durationLabel = duration >= 1 ? `${duration}h` : `${Math.round(duration * 60)}m`

    const today = new Date()
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
    const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

    const handleTimeInput = (type: 'start' | 'end', val: string) => {
        const [h, m] = val.split(':').map(Number)
        let newTime = h + m / 60
        newTime = snapToQuarter(newTime)

        if (type === 'start') {
            onTimeChange(event.id, Math.min(newTime, event.endH - 0.25), event.endH)
        } else {
            onTimeChange(event.id, event.startH, Math.max(newTime, event.startH + 0.25))
        }
    }

    const toTimeInputValue = (hour: number) => {
        const h = Math.floor(hour) % 24
        const m = Math.round((hour - Math.floor(hour)) * 60)
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    }

    return (
        <div
            ref={menuRef}
            style={{ left, top, position: 'fixed', zIndex: 100, width: menuW, height: menuH }}
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

                {/* Editable Title Section */}
                <div className="apple-menu-title-row">
                    <div
                        className="apple-menu-indicator"
                        style={{ backgroundColor: event.color }}
                    />
                    {isEditingTitle ? (
                        <input
                            ref={inputRef}
                            type="text"
                            className="apple-menu-title-input editing"
                            value={event.title}
                            onChange={(e) => onTitleChange(event.id, e.target.value)}
                            onBlur={() => setIsEditingTitle(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') inputRef.current?.blur()
                            }}
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
                            step="900"
                            value={toTimeInputValue(event.startH)}
                            onChange={(e) => handleTimeInput('start', e.target.value)}
                        />
                    </div>
                    <div className="apple-time-field">
                        <label>End</label>
                        <input
                            type="time"
                            step="900"
                            value={toTimeInputValue(event.endH)}
                            onChange={(e) => handleTimeInput('end', e.target.value)}
                        />
                    </div>
                </div>

                <div className="apple-menu-duration-tag">
                    {durationLabel}
                </div>

                {/* Editable Notes Section */}
                <div className="apple-menu-notes-section">
                    <label className="apple-notes-label">Notes</label>
                    {isEditingNotes ? (
                        <textarea
                            ref={notesRef}
                            className="apple-menu-notes-input"
                            value={event.notes || ''}
                            onChange={(e) => onNotesChange(event.id, e.target.value)}
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
                            style={{ backgroundColor: color }}
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
