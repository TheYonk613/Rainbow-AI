import { useCallback, useMemo, useState } from 'react'
import type { CalendarEvent, TimeFormat } from '../types'
import {
  RING_RADIUS,
  RING_THICKNESS,
  SLEEP_THICKNESS,
  TOTAL_HOURS,
  WHEEL_CENTER,
  WHEEL_SIZE,
  EVENT_COLORS,
} from '../constants'
import {
  arcPath,
  computeAngleOffset,
  degToRad,
  formatMarker,
  getEventMidpointHour,
  hourToAngle,
  normalizeAngle,
} from '../utils'
import { OrbitEvent } from './OrbitEvent'

const TOP_ANCHOR_DEG = -90

interface OrbitCalendarProps {
  events: CalendarEvent[]
  activeStart: number
  activeEnd: number
  timeFormat: TimeFormat
}

export default function OrbitCalendar({
  events,
  activeStart,
  activeEnd,
  timeFormat,
}: OrbitCalendarProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)

  const angleOffset = useMemo(
    () => computeAngleOffset(activeStart, activeEnd),
    [activeStart, activeEnd]
  )

  const sortedEvents = useMemo(
    () => [...events].filter((event) => !event.isPopping).sort((a, b) => a.startH - b.startH),
    [events]
  )

  const markers = useMemo(() => {
    const result = []
    for (let h = 0; h < TOTAL_HOURS; h += 2) {
      const angle = hourToAngle(h, angleOffset)
      const rad = degToRad(angle)
      const labelR = RING_RADIUS + RING_THICKNESS / 2 + 28
      result.push({
        h,
        x: WHEEL_CENTER + labelR * Math.cos(rad),
        y: WHEEL_CENTER + labelR * Math.sin(rad),
      })
    }
    return result
  }, [angleOffset])

  const { activeArc, sleepArc } = useMemo(() => {
    const aStart = hourToAngle(activeStart, angleOffset)
    let aEnd = hourToAngle(activeEnd === 0 ? 24 : activeEnd, angleOffset)
    if (aEnd <= aStart) aEnd += 360

    return {
      activeArc: arcPath(WHEEL_CENTER, WHEEL_CENTER, RING_RADIUS, aStart, aEnd),
      sleepArc: arcPath(WHEEL_CENTER, WHEEL_CENTER, RING_RADIUS, aEnd, aStart + 360),
    }
  }, [activeStart, activeEnd, angleOffset])

  const handleSelect = useCallback(
    (event: CalendarEvent) => {
      const eventMidHour = getEventMidpointHour(event.startH, event.endH)
      const eventAngleInOrbit = hourToAngle(eventMidHour, angleOffset)
      const currentRotationNormalized = normalizeAngle(rotation)
      const eventAngleInViewport = normalizeAngle(eventAngleInOrbit + currentRotationNormalized)

      const targetAngleOffset = normalizeAngle(TOP_ANCHOR_DEG - eventAngleInViewport)
      const finalRotation = rotation + 360 + targetAngleOffset

      setSelectedId(event.id)
      setRotation(finalRotation)
    },
    [angleOffset, rotation]
  )

  return (
    <svg viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`} className="w-full max-w-[560px] aspect-square">
      <defs>
        {EVENT_COLORS.map((colorId) => (
          <g key={colorId}>
            <linearGradient id={`grad-${colorId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={`var(--${colorId}-start)`} />
              <stop offset="50%" stopColor={`var(--${colorId}-mid)`} />
              <stop offset="100%" stopColor={`var(--${colorId}-end)`} />
            </linearGradient>
            <filter id={`glow-${colorId}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={`var(--${colorId}-glow1)`} />
              <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor={`var(--${colorId}-glow2)`} />
            </filter>
          </g>
        ))}
      </defs>

      {markers.map((marker) => (
        <text
          key={marker.h}
          x={marker.x}
          y={marker.y}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(0,0,0,0.22)"
          fontSize="10"
          fontFamily="monospace"
          className="pointer-events-none select-none"
        >
          {formatMarker(marker.h, timeFormat)}
        </text>
      ))}

      <g
        style={{
          transformOrigin: '50% 50%',
          transformBox: 'fill-box',
          willChange: 'transform',
          transform: `rotate(${rotation}deg) scale(${selectedId ? 1.34 : 1})`,
          transition: 'transform 1000ms cubic-bezier(0.65, 0, 0.35, 1)',
        }}
      >
        <path
          d={sleepArc}
          fill="none"
          stroke="rgba(0,0,0,0.025)"
          strokeWidth={SLEEP_THICKNESS}
          strokeLinecap="round"
        />

        <path
          d={activeArc}
          fill="none"
          stroke="rgba(0,0,0,0.04)"
          strokeWidth={RING_THICKNESS}
          strokeLinecap="round"
        />

        {sortedEvents.map((event) => (
          <OrbitEvent
            key={event.id}
            event={event}
            angleOffset={angleOffset}
            orbitRotation={rotation}
            isSelected={selectedId === event.id}
            isDimmed={selectedId !== null && selectedId !== event.id}
            timeFormat={timeFormat}
            onSelect={handleSelect}
          />
        ))}
      </g>
    </svg>
  )
}
