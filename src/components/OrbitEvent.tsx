import { memo } from 'react'
import { RING_THICKNESS, WHEEL_CENTER, RING_RADIUS } from '../constants'
import { arcPath, degToRad, formatTime, hourToAngle } from '../utils'
import type { CalendarEvent, TimeFormat } from '../types'

interface OrbitEventProps {
  event: CalendarEvent
  angleOffset: number
  orbitRotation: number
  isSelected: boolean
  isDimmed: boolean
  timeFormat: TimeFormat
  onSelect: (event: CalendarEvent) => void
}

function OrbitEventComponent({
  event,
  angleOffset,
  orbitRotation,
  isSelected,
  isDimmed,
  timeFormat,
  onSelect,
}: OrbitEventProps) {
  const startAngle = hourToAngle(event.startH, angleOffset)
  const endAngle = hourToAngle(event.endH, angleOffset)
  const d = arcPath(WHEEL_CENTER, WHEEL_CENTER, RING_RADIUS, startAngle, endAngle)
  const midAngle = (startAngle + endAngle) / 2
  const midRad = degToRad(midAngle)
  const midX = WHEEL_CENTER + RING_RADIUS * Math.cos(midRad)
  const midY = WHEEL_CENTER + RING_RADIUS * Math.sin(midRad)
  const duration = event.endH - event.startH

  return (
    <g onClick={() => onSelect(event)} className="cursor-pointer">
      <path
        d={d}
        fill="none"
        stroke={event.color}
        strokeWidth={isSelected ? RING_THICKNESS + 8 : RING_THICKNESS}
        strokeLinecap="round"
        opacity={isDimmed ? 0.68 : isSelected ? 1 : 0.86}
        style={{
          filter: isSelected ? `drop-shadow(0 0 12px ${event.color}88)` : 'none',
          transition: 'opacity 300ms ease, stroke-width 300ms ease, filter 300ms ease',
        }}
      />

      <text
        x={midX}
        y={duration > 1 ? midY - 4 : midY}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={duration > 2 ? 14 : 12}
        fontWeight="600"
        className="pointer-events-none select-none"
        transform={`rotate(${-orbitRotation} ${midX} ${midY})`}
      >
        {event.title}
      </text>

      {duration > 0.75 && (
        <text
          x={midX}
          y={midY + 10}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255,255,255,0.72)"
          fontSize="8"
          fontFamily="monospace"
          className="pointer-events-none select-none"
          transform={`rotate(${-orbitRotation} ${midX} ${midY})`}
        >
          {formatTime(event.startH, timeFormat)} – {formatTime(event.endH, timeFormat)}
        </text>
      )}
    </g>
  )
}

export const OrbitEvent = memo(OrbitEventComponent)
