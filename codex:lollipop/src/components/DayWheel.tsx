import { useRef, useMemo, useCallback, useState } from 'react'
import type { CalendarEvent, Position, DragState, ResizeState, TimeFormat } from '../types'
import {
  WHEEL_SIZE,
  WHEEL_CENTER,
  RING_RADIUS,
  RING_THICKNESS,
  SLEEP_THICKNESS,
  EDGE_HIT_RADIUS,
  TOTAL_HOURS,
  MIN_EVENT_DURATION,
} from '../constants'
import {
  hourToAngle,
  hourToPosition,
  arcPath,
  arcLength,
  formatTime,
  formatMarker,
  degToRad,
  clientToSVG,
  isOnRing,
  pointToHour,
  findGapAtTime,
  snapToQuarter,
  getDragBounds,
  getResizeBounds,
  computeAngleOffset,
} from '../utils'

const DRAG_THRESHOLD = 6

interface DayWheelProps {
  events: CalendarEvent[]
  currentTime: number
  activeStart: number
  activeEnd: number
  timeFormat: TimeFormat
  allowOverlap: boolean
  onGapClick: (hour: number, clientX: number, clientY: number) => void
  onEventClick: (event: CalendarEvent, clientX: number, clientY: number) => void
  onEventTimeChange: (id: string, startH: number, endH: number) => void
}

interface EdgeRef {
  eventId: string
  edge: 'start' | 'end'
}

function findNearestEdge(
  pt: Position,
  hour: number,
  sortedEvents: CalendarEvent[], // pass visually sorted events so later = higher z-index
  offset: number
): (EdgeRef & { dist: number }) | null {
  let closest: (EdgeRef & { dist: number }) | null = null

  // Iterate backwards so we hit topmost (latest rendered) elements first
  for (let i = sortedEvents.length - 1; i >= 0; i--) {
    const ev = sortedEvents[i]
    if (ev.isPopping) continue
    const sp = hourToPosition(ev.startH, offset)
    const ep = hourToPosition(ev.endH, offset)
    const ds = Math.hypot(pt.x - sp.x, pt.y - sp.y)
    const de = Math.hypot(pt.x - ep.x, pt.y - ep.y)
    const isInside = hour >= ev.startH && hour < ev.endH

    if (ds < EDGE_HIT_RADIUS) {
      if (!closest || ds < closest.dist || (ds === closest.dist && isInside)) {
        closest = { eventId: ev.id, edge: 'start', dist: ds }
      }
    }
    if (de < EDGE_HIT_RADIUS) {
      if (!closest || de < closest.dist || (de === closest.dist && isInside)) {
        closest = { eventId: ev.id, edge: 'end', dist: de }
      }
    }
  }

  return closest
}

export default function DayWheel({
  events,
  currentTime,
  activeStart,
  activeEnd,
  timeFormat,
  allowOverlap,
  onGapClick,
  onEventClick,
  onEventTimeChange,
}: DayWheelProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverHour, setHoverHour] = useState<number | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [resize, setResize] = useState<ResizeState | null>(null)
  const [settlingId, setSettlingId] = useState<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<EdgeRef | null>(null)

  const pointerStartRef = useRef<Position | null>(null)

  // ─── Dynamic rotation offset ──────────────────────────────────

  const angleOffset = useMemo(
    () => computeAngleOffset(activeStart, activeEnd),
    [activeStart, activeEnd]
  )

  const sorted = useMemo(
    () => [...events].sort((a, b) => a.startH - b.startH),
    [events]
  )

  const isInteracting = (drag?.hasMoved || resize?.hasMoved) ?? false

  // ─── Sleep / active arc geometry ──────────────────────────────

  const { activeArc, sleepArc } = useMemo(() => {
    const aStart = hourToAngle(activeStart, angleOffset)
    let aEnd = hourToAngle(activeEnd === 0 ? 24 : activeEnd, angleOffset)
    if (aEnd <= aStart) aEnd += 360

    // Sleep fills the remainder
    const sStart = aEnd
    const sEnd = aStart + 360

    return {
      activeArc: arcPath(WHEEL_CENTER, WHEEL_CENTER, RING_RADIUS, aStart, aEnd),
      sleepArc: arcPath(WHEEL_CENTER, WHEEL_CENTER, RING_RADIUS, sStart, sEnd),
    }
  }, [activeStart, activeEnd, angleOffset])

  // ─── Hour markers (every 3 hours = 8 markers) ────────────────

  const markers = useMemo(() => {
    const result = []
    for (let h = 0; h < TOTAL_HOURS; h += 3) {
      const angle = hourToAngle(h, angleOffset)
      const rad = degToRad(angle)
      const labelR = RING_RADIUS + RING_THICKNESS / 2 + 22
      const isMajor = h % 6 === 0 // 0, 6, 12, 18 are major
      result.push({
        h,
        x: WHEEL_CENTER + labelR * Math.cos(rad),
        y: WHEEL_CENTER + labelR * Math.sin(rad),
        isMajor,
      })
    }
    return result
  }, [angleOffset])

  // ─── Boundary handles ─────────────────────────────────────────

  const handles = useMemo(() => {
    const activeEvents = sorted.filter((e) => !e.isPopping)
    const points: { pos: Position; angle: number; eventId: string; edge: 'start' | 'end' }[] = []

    for (const event of activeEvents) {
      let sH = event.startH
      let eH = event.endH

      if (drag && event.id === drag.eventId) {
        sH = drag.previewStartH
        eH = drag.previewEndH
      } else if (resize && event.id === resize.eventId) {
        sH = resize.previewStartH
        eH = resize.previewEndH
      }

      const sAngle = hourToAngle(sH, angleOffset)
      const eAngle = hourToAngle(eH, angleOffset)
      points.push({ pos: hourToPosition(sH, angleOffset), angle: sAngle, eventId: event.id, edge: 'start' })
      points.push({ pos: hourToPosition(eH, angleOffset), angle: eAngle, eventId: event.id, edge: 'end' })
    }

    const unique: typeof points = []
    for (const p of points) {
      const tooClose = unique.some(
        (u) => Math.abs(u.pos.x - p.pos.x) < 4 && Math.abs(u.pos.y - p.pos.y) < 4
      )
      if (!tooClose) unique.push(p)
    }
    return unique
  }, [sorted, drag, resize, angleOffset])

  const nowPos = useMemo(
    () => hourToPosition(currentTime, angleOffset),
    [currentTime, angleOffset]
  )

  const hoverPos = useMemo(
    () => (hoverHour !== null ? hourToPosition(hoverHour, angleOffset) : null),
    [hoverHour, angleOffset]
  )
  const hoverInGap = useMemo(
    () =>
      hoverHour !== null ? findGapAtTime(events, hoverHour) !== null : false,
    [events, hoverHour]
  )

  const hoverEventId = useMemo(() => {
    if (hoverHour === null) return null
    // Find the visually topmost event
    const rev = [...sorted].reverse()
    const ev = rev.find(
      (e) => !e.isPopping && hoverHour >= e.startH && hoverHour < e.endH
    )
    return ev?.id ?? null
  }, [sorted, hoverHour])

  // ─── Pointer handlers ─────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!svgRef.current) return
      const pt = clientToSVG(svgRef.current, e.clientX, e.clientY)
      if (!isOnRing(pt)) return

      const hour = pointToHour(pt, angleOffset)

      // Priority 1: edge hit → resize
      const nearEdge = findNearestEdge(pt, hour, sorted, angleOffset)
      if (nearEdge) {
        ; (e.target as SVGElement).setPointerCapture(e.pointerId)
        pointerStartRef.current = pt

        let bounds = getResizeBounds(nearEdge.eventId, nearEdge.edge, events)
        if (allowOverlap) {
          // Wide-open bounds but enforce minimum duration so it doesn't flip direction
          bounds = {
            fixedHour: bounds.fixedHour,
            minHour: nearEdge.edge === 'start' ? 0 : bounds.fixedHour + MIN_EVENT_DURATION,
            maxHour: nearEdge.edge === 'start' ? bounds.fixedHour - MIN_EVENT_DURATION : 24,
          }
        }
        const ev = events.find((x) => x.id === nearEdge.eventId)!

        setResize({
          eventId: nearEdge.eventId,
          edge: nearEdge.edge,
          fixedHour: bounds.fixedHour,
          minHour: bounds.minHour,
          maxHour: bounds.maxHour,
          previewStartH: ev.startH,
          previewEndH: ev.endH,
          hasMoved: false,
        })

        setHoverHour(null)
        setHoveredEdge(null)
        e.preventDefault()
        return
      }

      // Priority 2: interior → drag
      // Find the topmost rendered event (reverse order of sorted)
      const clickedEvent = [...sorted]
        .reverse()
        .find((ev) => !ev.isPopping && hour >= ev.startH && hour < ev.endH)
      if (!clickedEvent) return

        ; (e.target as SVGElement).setPointerCapture(e.pointerId)
      pointerStartRef.current = pt

      let bounds = getDragBounds(clickedEvent.id, events)
      if (allowOverlap) {
        // Allow free drag across the full ring
        bounds = { duration: bounds.duration, minStart: 0, maxStart: 24 - bounds.duration }
      }
      const eventMid = (clickedEvent.startH + clickedEvent.endH) / 2
      const grabOffset = hour - eventMid

      setDrag({
        eventId: clickedEvent.id,
        duration: bounds.duration,
        grabOffset,
        minStart: bounds.minStart,
        maxStart: bounds.maxStart,
        previewStartH: clickedEvent.startH,
        previewEndH: clickedEvent.endH,
        hasMoved: false,
      })

      setHoverHour(null)
      setHoveredEdge(null)
      e.preventDefault()
    },
    [events, angleOffset, allowOverlap]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!svgRef.current) return
      const pt = clientToSVG(svgRef.current, e.clientX, e.clientY)

      // ─── Resize ───
      if (resize) {
        if (!resize.hasMoved && pointerStartRef.current) {
          const dx = pt.x - pointerStartRef.current.x
          const dy = pt.y - pointerStartRef.current.y
          if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return
        }

        const hour = pointToHour(pt, angleOffset)

        if (resize.edge === 'start') {
          const newStart = snapToQuarter(
            Math.max(resize.minHour, Math.min(resize.maxHour, hour))
          )
          setResize((prev) =>
            prev
              ? { ...prev, previewStartH: newStart, previewEndH: prev.fixedHour, hasMoved: true }
              : null
          )
        } else {
          const newEnd = snapToQuarter(
            Math.max(resize.minHour, Math.min(resize.maxHour, hour))
          )
          setResize((prev) =>
            prev
              ? { ...prev, previewStartH: prev.fixedHour, previewEndH: newEnd, hasMoved: true }
              : null
          )
        }
        return
      }

      // ─── Drag ───
      if (drag) {
        if (!drag.hasMoved && pointerStartRef.current) {
          const dx = pt.x - pointerStartRef.current.x
          const dy = pt.y - pointerStartRef.current.y
          if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return
        }

        const hour = pointToHour(pt, angleOffset)
        const newMid = hour - drag.grabOffset
        let newStart = newMid - drag.duration / 2

        newStart = Math.max(drag.minStart, Math.min(drag.maxStart, newStart))
        newStart = snapToQuarter(newStart)
        const newEnd = snapToQuarter(newStart + drag.duration)

        setDrag((prev) =>
          prev
            ? { ...prev, previewStartH: newStart, previewEndH: newEnd, hasMoved: true }
            : null
        )
        return
      }

      // ─── Hover ───
      if (isOnRing(pt)) {
        const hour = pointToHour(pt, angleOffset)
        setHoverHour(hour)

        const nearEdge = findNearestEdge(pt, hour, sorted, angleOffset)
        setHoveredEdge(
          nearEdge ? { eventId: nearEdge.eventId, edge: nearEdge.edge } : null
        )
      } else {
        setHoverHour(null)
        setHoveredEdge(null)
      }
    },
    [drag, resize, events, angleOffset]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (resize) {
        if (resize.hasMoved) {
          onEventTimeChange(resize.eventId, resize.previewStartH, resize.previewEndH)
          setSettlingId(resize.eventId)
          setTimeout(() => setSettlingId(null), 400)
        }
        setResize(null)
        pointerStartRef.current = null
        try { ; (e.target as SVGElement).releasePointerCapture(e.pointerId) } catch { /* */ }
        return
      }

      if (drag) {
        if (drag.hasMoved) {
          onEventTimeChange(drag.eventId, drag.previewStartH, drag.previewEndH)
          setSettlingId(drag.eventId)
          setTimeout(() => setSettlingId(null), 400)
        }
        setDrag(null)
        pointerStartRef.current = null
        try { ; (e.target as SVGElement).releasePointerCapture(e.pointerId) } catch { /* */ }
      }
    },
    [drag, resize, onEventTimeChange]
  )

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return
      if (drag?.hasMoved || resize?.hasMoved) return

      const pt = clientToSVG(svgRef.current, e.clientX, e.clientY)
      if (!isOnRing(pt)) return

      const hour = pointToHour(pt, angleOffset)
      const nearEdge = findNearestEdge(pt, hour, sorted, angleOffset)
      if (nearEdge) return

      const clickedEvent = [...sorted]
        .reverse()
        .find((ev) => !ev.isPopping && hour >= ev.startH && hour < ev.endH)

      if (clickedEvent) {
        onEventClick(clickedEvent, e.clientX, e.clientY)
      } else {
        onGapClick(hour, e.clientX, e.clientY)
      }
    },
    [events, onEventClick, onGapClick, drag, resize, angleOffset]
  )

  const handleMouseLeave = useCallback(() => {
    if (!drag && !resize) {
      setHoverHour(null)
      setHoveredEdge(null)
    }
  }, [drag, resize])

  // ─── Cursor ──────────────────────────────────────────────────

  let cursorClass = 'cursor-pointer'
  if (isInteracting) cursorClass = 'cursor-grabbing'
  else if (hoveredEdge) cursorClass = 'cursor-grab'

  // ─── Render ──────────────────────────────────────────────────

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
      className={`w-full max-w-[560px] aspect-square ${cursorClass}`}
      style={{ touchAction: 'none' }}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* ─── Sleep arc (dimmer, thinner) ─── */}
      <path
        d={sleepArc}
        fill="none"
        stroke="rgba(0,0,0,0.025)"
        strokeWidth={SLEEP_THICKNESS}
        strokeLinecap="round"
      />

      {/* ─── Active arc (full thickness) ─── */}
      <path
        d={activeArc}
        fill="none"
        stroke="rgba(0,0,0,0.04)"
        strokeWidth={RING_THICKNESS}
        strokeLinecap="round"
      />

      {/* ─── Event segments ─── */}
      {sorted.map((event) => {
        const isThisDragging = drag?.eventId === event.id && drag.hasMoved
        const isThisResizing = resize?.eventId === event.id && resize.hasMoved
        const isActive = isThisDragging || isThisResizing
        const isSettling = settlingId === event.id

        let startH = event.startH
        let endH = event.endH
        if (drag?.eventId === event.id) {
          startH = drag.previewStartH
          endH = drag.previewEndH
        } else if (resize?.eventId === event.id) {
          startH = resize.previewStartH
          endH = resize.previewEndH
        }

        const startAngle = hourToAngle(startH, angleOffset)
        const endAngle = hourToAngle(endH, angleOffset)
        const d = arcPath(WHEEL_CENTER, WHEEL_CENTER, RING_RADIUS, startAngle, endAngle)
        const len = arcLength(startH, endH)

        const midAngle = (startAngle + endAngle) / 2
        const midRad = degToRad(midAngle)
        const midX = WHEEL_CENTER + RING_RADIUS * Math.cos(midRad)
        const midY = WHEEL_CENTER + RING_RADIUS * Math.sin(midRad)

        const isPopping = event.isPopping
        const isNew = event.isNew && !isPopping
        const isReceded = isInteracting && !isActive && !isPopping
        const isHovered = hoverEventId === event.id

        // Duration-aware text sizing
        const duration = endH - startH
        const titleSize = duration > 2 ? 14 : duration > 1 ? 12 : 10
        const showInlineTime = duration > 0.75

        let segmentClass = ''
        if (isThisDragging) segmentClass = 'segment-dragging'
        else if (isThisResizing) segmentClass = 'segment-resizing'
        else if (isSettling) segmentClass = 'segment-settling'
        else if (isReceded) segmentClass = 'segment-receded'
        else if (isNew) segmentClass = 'animate-ring-pop'

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
              className={segmentClass}
              style={{
                ...(isNew
                  ? ({
                    strokeDasharray: len,
                    strokeDashoffset: 0,
                    '--arc-length': len,
                  } as React.CSSProperties)
                  : {}),
                ...(isActive
                  ? ({ '--drag-color': event.color + '40' } as React.CSSProperties)
                  : {}),
              }}
            />

            {/* Title — always visible */}
            <text
              x={midX}
              y={showInlineTime ? midY - 5 : midY}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={titleSize}
              fontWeight="600"
              opacity={isReceded ? 0.5 : 0.9}
              className={`pointer-events-none select-none ${isPopping ? 'animate-text-dissolve' : ''
                }`}
              style={
                isPopping
                  ? { transformOrigin: `${midX}px ${midY}px` }
                  : { transition: 'opacity 0.2s ease' }
              }
            >
              {event.title.length > (duration > 1.5 ? 14 : 8)
                ? event.title.slice(0, duration > 1.5 ? 12 : 6) + '…'
                : event.title}
            </text>

            {/* Time range — always visible for segments > 45 min */}
            {showInlineTime && !isPopping && (
              <text
                x={midX}
                y={midY + (duration > 1.5 ? 10 : 7)}
                textAnchor="middle"
                dominantBaseline="central"
                fill="rgba(255,255,255,0.55)"
                fontSize={isActive || isHovered ? 9 : 8}
                fontFamily="monospace"
                fontWeight="500"
                opacity={isReceded ? 0.4 : isActive || isHovered ? 0.85 : 0.6}
                className="pointer-events-none select-none"
                style={{ transition: 'opacity 0.2s ease, font-size 0.15s ease' }}
              >
                {formatTime(startH, timeFormat)} – {formatTime(endH, timeFormat)}
              </text>
            )}

            {/* Time pills at edges during drag */}
            {isThisDragging && (
              <>
                <TimePill hour={startH} angle={startAngle} fmt={timeFormat} />
                <TimePill hour={endH} angle={endAngle} fmt={timeFormat} />
              </>
            )}

            {/* Moving-edge pill during resize */}
            {isThisResizing && resize && (
              <TimePill
                hour={resize.edge === 'start' ? startH : endH}
                angle={resize.edge === 'start' ? startAngle : endAngle}
                fmt={timeFormat}
              />
            )}
          </g>
        )
      })}

      {/* ─── Boundary grip handles ─── */}
      {handles.map((h, i) => {
        const isActiveHandle =
          resize?.hasMoved && h.eventId === resize.eventId && h.edge === resize.edge
        const isHovered =
          !isInteracting && hoveredEdge?.eventId === h.eventId && hoveredEdge?.edge === h.edge
        const event = events.find((e) => e.id === h.eventId)
        const color = event?.color ?? 'rgba(0,0,0,0.3)'

        return (
          <EdgeGrip
            key={i}
            cx={h.pos.x}
            cy={h.pos.y}
            angleDeg={h.angle}
            isActive={!!isActiveHandle}
            isHovered={isHovered}
            color={color}
          />
        )
      })}

      {/* ─── Hour markers ─── */}
      {markers.map(({ h, x, y, isMajor }) => (
        <text
          key={h}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fill={isMajor ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.15)'}
          fontSize={isMajor ? '11' : '9'}
          fontFamily="monospace"
          fontWeight={isMajor ? '500' : '400'}
          className="pointer-events-none select-none"
        >
          {formatMarker(h, timeFormat)}
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

      {/* ─── Hover preview (gap click) ─── */}
      {!isInteracting && !hoveredEdge && hoverPos && hoverInGap && (
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

// ─── Time pill ──────────────────────────────────────────────────

function TimePill({ hour, angle, fmt }: { hour: number; angle: number; fmt: TimeFormat }) {
  const r = RING_RADIUS - RING_THICKNESS / 2 - 22
  const rad = degToRad(angle)
  const x = WHEEL_CENTER + r * Math.cos(rad)
  const y = WHEEL_CENTER + r * Math.sin(rad)

  return (
    <g
      className="time-label-pill pointer-events-none"
      style={{ transformOrigin: `${x}px ${y}px` }}
    >
      <rect x={x - 26} y={y - 9} width={52} height={18} rx={9} fill="rgba(0,0,0,0.65)" />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize="9"
        fontWeight="600"
        fontFamily="monospace"
        className="select-none"
      >
        {formatTime(hour, fmt)}
      </text>
    </g>
  )
}

// ─── Edge grip ──────────────────────────────────────────────────────────────
// Three short radial lines arranged along the arc tangent — like a ≡ grip

function EdgeGrip({
  cx, cy, angleDeg, isActive, isHovered, color,
}: {
  cx: number
  cy: number
  angleDeg: number
  isActive: boolean
  isHovered: boolean
  color: string
}) {
  const rad = degToRad(angleDeg)
  // Tangent direction (along the ring arc)
  const tx = -Math.sin(rad)
  const ty = Math.cos(rad)
  // Radial direction (across the ring)
  const rx = Math.cos(rad)
  const ry = Math.sin(rad)

  const SPACING = 3.5   // gap between lines along the tangent
  const HALF_LEN = 7    // half-length of each line across the ring

  const stroke = isActive
    ? color
    : isHovered
      ? 'rgba(255,255,255,0.9)'
      : 'rgba(255,255,255,0.55)'
  const strokeW = isActive ? 2.5 : isHovered ? 2 : 1.8

  return (
    <g className="pointer-events-none">
      {[-1, 0, 1].map((i) => {
        const ox = cx + i * SPACING * tx
        const oy = cy + i * SPACING * ty
        return (
          <line
            key={i}
            x1={ox - HALF_LEN * rx}
            y1={oy - HALF_LEN * ry}
            x2={ox + HALF_LEN * rx}
            y2={oy + HALF_LEN * ry}
            stroke={stroke}
            strokeWidth={strokeW}
            strokeLinecap="round"
            style={{ transition: 'stroke 0.15s ease, stroke-width 0.15s ease' }}
          />
        )
      })}
      {/* Active glow */}
      {isActive && (
        <circle
          cx={cx}
          cy={cy}
          r={12}
          fill={color}
          opacity={0.15}
        />
      )}
    </g>
  )
}
