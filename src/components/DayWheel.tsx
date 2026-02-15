import { useRef, useMemo, useCallback, useState } from 'react'
import type { CalendarEvent, Position } from '../types'
import {
  WHEEL_SIZE,
  WHEEL_CENTER,
  RING_RADIUS,
  RING_THICKNESS,
  HANDLE_RADIUS,
  START_OF_DAY,
  TOTAL_HOURS,
} from '../constants'
import {
  hourToAngle,
  hourToPosition,
  arcPath,
  arcLength,
  formatTimeShort,
  degToRad,
  clientToSVG,
  isOnRing,
  pointToHour,
  findGapAtTime,
} from '../utils'

interface DayWheelProps {
  events: CalendarEvent[]
  currentTime: number
  onGapClick: (hour: number, clientX: number, clientY: number) => void
  onEventClick: (event: CalendarEvent) => void
}

export default function DayWheel({
  events,
  currentTime,
  onGapClick,
  onEventClick,
}: DayWheelProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverHour, setHoverHour] = useState<number | null>(null)

  const sorted = useMemo(
    () => [...events].sort((a, b) => a.startH - b.startH),
    [events]
  )

  // Hour markers (every 2 hours)
  const markers = useMemo(() => {
    const result = []
    for (let h = START_OF_DAY; h < START_OF_DAY + TOTAL_HOURS; h++) {
      const show = h % 2 === 0 || h === START_OF_DAY
      if (!show) continue
      const angle = hourToAngle(h)
      const rad = degToRad(angle)
      const labelR = RING_RADIUS + RING_THICKNESS / 2 + 22
      result.push({
        h,
        x: WHEEL_CENTER + labelR * Math.cos(rad),
        y: WHEEL_CENTER + labelR * Math.sin(rad),
      })
    }
    return result
  }, [])

  // Boundary handles (white dots at segment edges)
  const handles = useMemo(() => {
    const activeEvents = sorted.filter((e) => !e.isPopping)
    const points: Position[] = []
    for (const event of activeEvents) {
      points.push(hourToPosition(event.startH))
      points.push(hourToPosition(event.endH))
    }
    const unique: Position[] = []
    for (const p of points) {
      const tooClose = unique.some(
        (u) => Math.abs(u.x - p.x) < 4 && Math.abs(u.y - p.y) < 4
      )
      if (!tooClose) unique.push(p)
    }
    return unique
  }, [sorted])

  // Now indicator
  const nowPos = useMemo(() => hourToPosition(currentTime), [currentTime])

  // Hover state
  const hoverPos = useMemo(
    () => (hoverHour !== null ? hourToPosition(hoverHour) : null),
    [hoverHour]
  )
  const hoverInGap = useMemo(
    () => (hoverHour !== null ? findGapAtTime(events, hoverHour) !== null : false),
    [events, hoverHour]
  )

  // ─── Click: distinguish event click vs gap click ──────────────

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return
      const pt = clientToSVG(svgRef.current, e.clientX, e.clientY)
      if (!isOnRing(pt)) return

      const hour = pointToHour(pt)

      // Did we click on an existing event?
      const clickedEvent = events.find(
        (ev) => !ev.isPopping && hour >= ev.startH && hour < ev.endH
      )

      if (clickedEvent) {
        onEventClick(clickedEvent)
      } else {
        onGapClick(hour, e.clientX, e.clientY)
      }
    },
    [events, onEventClick, onGapClick]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return
      const pt = clientToSVG(svgRef.current, e.clientX, e.clientY)
      if (isOnRing(pt)) {
        setHoverHour(pointToHour(pt))
      } else {
        setHoverHour(null)
      }
    },
    []
  )

  const handleMouseLeave = useCallback(() => setHoverHour(null), [])

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
      className="w-full max-w-[560px] aspect-square cursor-pointer"
      style={{ touchAction: 'none' }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* ─── Background ring ─── */}
      <circle
        cx={WHEEL_CENTER}
        cy={WHEEL_CENTER}
        r={RING_RADIUS}
        fill="none"
        stroke="rgba(0,0,0,0.04)"
        strokeWidth={RING_THICKNESS}
      />

      {/* ─── Event segments ─── */}
      {sorted.map((event) => {
        const startAngle = hourToAngle(event.startH)
        const endAngle = hourToAngle(event.endH)
        const d = arcPath(WHEEL_CENTER, WHEEL_CENTER, RING_RADIUS, startAngle, endAngle)
        const len = arcLength(event.startH, event.endH)

        // Midpoint of the arc — used as transform origin for the pop
        const midAngle = (startAngle + endAngle) / 2
        const midRad = degToRad(midAngle)
        const midX = WHEEL_CENTER + RING_RADIUS * Math.cos(midRad)
        const midY = WHEEL_CENTER + RING_RADIUS * Math.sin(midRad)

        // Animation class: pop takes priority over spring-in
        const isPopping = event.isPopping
        const isNew = event.isNew && !isPopping

        return (
          <g
            key={event.id}
            className={isPopping ? 'animate-bubble-pop' : ''}
            style={
              isPopping
                ? { transformOrigin: `${midX}px ${midY}px` }
                : undefined
            }
          >
            {/* Arc segment */}
            <path
              d={d}
              fill="none"
              stroke={event.color}
              strokeWidth={RING_THICKNESS}
              strokeLinecap="round"
              opacity={0.85}
              className={isNew ? 'animate-ring-pop' : ''}
              style={
                isNew
                  ? ({
                      strokeDasharray: len,
                      strokeDashoffset: 0,
                      '--arc-length': len,
                    } as React.CSSProperties)
                  : undefined
              }
            />

            {/* Label — dissolves separately during pop */}
            <text
              x={midX}
              y={midY}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={event.endH - event.startH > 1.5 ? 14 : 11}
              fontWeight="600"
              opacity={0.9}
              className={`pointer-events-none select-none ${
                isPopping ? 'animate-text-dissolve' : ''
              }`}
              style={
                isPopping
                  ? { transformOrigin: `${midX}px ${midY}px` }
                  : undefined
              }
            >
              {event.title.length > 12
                ? event.title.slice(0, 10) + '…'
                : event.title}
            </text>
          </g>
        )
      })}

      {/* ─── Boundary handles ─── */}
      {handles.map((pos, i) => (
        <circle
          key={i}
          cx={pos.x}
          cy={pos.y}
          r={HANDLE_RADIUS}
          fill="white"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={1}
          className="pointer-events-none"
        />
      ))}

      {/* ─── Time markers ─── */}
      {markers.map(({ h, x, y }) => (
        <text
          key={h}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(0,0,0,0.2)"
          fontSize="11"
          fontFamily="monospace"
          className="pointer-events-none select-none"
        >
          {formatTimeShort(h)}
        </text>
      ))}

      {/* ─── Now indicator ─── */}
      <circle
        cx={nowPos.x}
        cy={nowPos.y}
        r={5}
        fill="#E07B6C"
        stroke="white"
        strokeWidth={2.5}
        className="pointer-events-none"
      />
      <circle
        cx={nowPos.x}
        cy={nowPos.y}
        r={12}
        fill="none"
        stroke="#E07B6C"
        strokeWidth={1.5}
        opacity={0.4}
        className="animate-soft-pulse pointer-events-none"
      />

      {/* ─── Hover preview ─── */}
      {hoverPos && hoverInGap && (
        <g className="pointer-events-none">
          <circle
            cx={hoverPos.x}
            cy={hoverPos.y}
            r={RING_THICKNESS / 2 - 4}
            fill="rgba(0,0,0,0.04)"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <text
            x={hoverPos.x}
            y={hoverPos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(0,0,0,0.25)"
            fontSize="10"
            fontWeight="600"
            fontFamily="monospace"
          >
            +
          </text>
        </g>
      )}
    </svg>
  )
}
