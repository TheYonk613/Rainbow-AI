import { useEffect, useRef } from 'react'
import type { CalendarEvent, TimeFormat } from '../types'
import { EVENT_COLORS } from '../constants'
import { formatTime } from '../utils'

// Palette names matching the neon colors order in EVENT_COLORS
const PALETTE_NAMES = [
    'Electric', 'Plasma', 'Volt', 'Blaze',
    'UV', 'Coral', 'Aurora', 'Solar',
]

// ─── Mini radial color wheel ────────────────────────────────────────────────

function ColorWheel({
    currentColor,
    onChange,
}: {
    currentColor: string
    onChange: (color: string) => void
}) {
    const SIZE = 150
    const CENTER = SIZE / 2
    const RING_R = 50
    const SWATCH_R = 12
    const PREVIEW_R = 17

    return (
        <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="color-wheel-svg"
        >
            {/* Dark backdrop disc so neons pop */}
            <circle cx={CENTER} cy={CENTER} r={RING_R + SWATCH_R + 6} fill="#111" opacity={0.88} />

            {EVENT_COLORS.map((color, i) => {
                const angle = (i / EVENT_COLORS.length) * 2 * Math.PI - Math.PI / 2
                const x = CENTER + RING_R * Math.cos(angle)
                const y = CENTER + RING_R * Math.sin(angle)
                const isSelected = color === currentColor

                return (
                    <g
                        key={color}
                        onClick={() => onChange(color)}
                        className="color-wheel-swatch"
                    >
                        {/* Neon glow for selected */}
                        {isSelected && (
                            <circle
                                cx={x} cy={y}
                                r={SWATCH_R + 6}
                                fill={color}
                                opacity={0.25}
                                style={{ filter: `blur(4px)` }}
                            />
                        )}
                        {/* Outer ring border */}
                        <circle
                            cx={x} cy={y}
                            r={SWATCH_R + (isSelected ? 3 : 1.5)}
                            fill={isSelected ? color : 'rgba(255,255,255,0.12)'}
                            opacity={isSelected ? 0.4 : 1}
                        />
                        {/* Color fill */}
                        <circle
                            cx={x} cy={y}
                            r={SWATCH_R}
                            fill={color}
                            style={{ transition: 'opacity 0.15s ease' }}
                        />
                        {/* Selected checkmark */}
                        {isSelected && (
                            <text
                                x={x} y={y}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="white"
                                fontSize="10"
                                fontWeight="800"
                                className="pointer-events-none select-none"
                                style={{ filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.8))' }}
                            >
                                ✓
                            </text>
                        )}
                    </g>
                )
            })}

            {/* Center preview — current event color */}
            <circle cx={CENTER} cy={CENTER} r={PREVIEW_R + 2.5} fill="#111" />
            <circle
                cx={CENTER} cy={CENTER}
                r={PREVIEW_R}
                fill={currentColor}
                style={{
                    filter: `drop-shadow(0 0 6px ${currentColor}99)`,
                    transition: 'fill 0.2s ease, filter 0.2s ease',
                }}
            />
        </svg>
    )
}

// ─── Palette name label ──────────────────────────────────────────────────────

function paletteName(color: string): string {
    const idx = EVENT_COLORS.indexOf(color)
    return idx >= 0 ? PALETTE_NAMES[idx] : ''
}

// ─── Main component ──────────────────────────────────────────────────────────

interface EventActionMenuProps {
    event: CalendarEvent
    anchorX: number
    anchorY: number
    timeFormat: TimeFormat
    onColorChange: (id: string, color: string) => void
    onEdit: (event: CalendarEvent) => void
    onDelete: (event: CalendarEvent) => void
    onClose: () => void
}

export default function EventActionMenu({
    event,
    anchorX,
    anchorY,
    timeFormat,
    onColorChange,
    onEdit,
    onDelete,
    onClose,
}: EventActionMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)

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

    // Smart position — keep in viewport
    const vw = window.innerWidth
    const vh = window.innerHeight
    const menuW = 210
    const menuH = 340
    const pad = 12

    let left = anchorX + 14
    let top = anchorY - menuH / 2

    if (left + menuW > vw - pad) left = anchorX - menuW - 14
    if (top < pad) top = pad
    if (top + menuH > vh - pad) top = vh - menuH - pad

    const duration = event.endH - event.startH
    const durationLabel = duration >= 1 ? `${duration}h` : `${Math.round(duration * 60)}m`
    const pName = paletteName(event.color)

    return (
        <div
            ref={menuRef}
            style={{ left, top, position: 'fixed', zIndex: 50, width: menuW }}
            className="event-action-menu"
        >
            {/* ── Header ── */}
            <div className="event-action-header">
                <span
                    className="event-action-dot"
                    style={{
                        background: event.color,
                        boxShadow: `0 0 8px ${event.color}88`,
                    }}
                />
                <div className="event-action-title-block">
                    <span className="event-action-name">{event.title}</span>
                    <span className="event-action-time">
                        {formatTime(event.startH, timeFormat)} – {formatTime(event.endH, timeFormat)}{' '}
                        <span className="event-action-dur">({durationLabel})</span>
                    </span>
                </div>
            </div>

            {/* ── Color wheel section ── */}
            <div className="event-action-wheel-wrap">
                <ColorWheel
                    currentColor={event.color}
                    onChange={(color) => onColorChange(event.id, color)}
                />
                {/* Vibe label below wheel */}
                <div className="event-action-vibe">
                    {pName ? (
                        <>
                            <span
                                className="event-action-vibe-dot"
                                style={{ background: event.color, boxShadow: `0 0 6px ${event.color}` }}
                            />
                            <span style={{ color: event.color }}>{pName}</span>
                        </>
                    ) : (
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>custom</span>
                    )}
                </div>
            </div>

            <div className="event-action-divider" style={{ margin: '6px 0' }} />

            {/* ── Actions ── */}
            <button
                className="event-action-btn"
                onClick={() => { onEdit(event); onClose() }}
            >
                <span className="event-action-icon">✏️</span>
                Edit title
            </button>

            <button
                className="event-action-btn event-action-btn--danger"
                onClick={() => { onDelete(event); onClose() }}
            >
                <span className="event-action-icon">🗑️</span>
                Delete event
            </button>
        </div>
    )
}
