import { useRef, useMemo, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import type { CalendarEvent, Position, DragState, ResizeState, TimeFormat } from '../types'
import {
  WHEEL_SIZE,
  WHEEL_CENTER,
  RING_RADIUS,
  RING_THICKNESS,
  EDGE_HIT_RADIUS,
  TOTAL_HOURS,
  EVENT_COLORS,
} from '../constants'
import {
  hourToAngle,
  hourToPosition,
  bubblePath,
  arcLength,
  formatTime,
  formatMarker,
  degToRad,
  clientToSVG,
  svgToClient,
  isOnRing,
  pointToHour,
  findGapAtTime,
  snapToFiveMinutes,
  getDragBounds,
  getResizeBounds,
} from '../utils'

const DRAG_THRESHOLD = 6

interface DayWheelProps {
  events: CalendarEvent[]
  currentTime: number
  todayDate: string
  selectedDate: string
  timeFormat: TimeFormat
  markerResolution?: 'minimal' | 'standard' | 'chronograph' | 'technical'
  dateLabel?: string
  selectedEventId?: string
  onGapClick: (hour: number, clientX: number, clientY: number) => void
  onEventClick: (event: CalendarEvent, clientX: number, clientY: number) => void
  onEventTimeChange: (id: string, startH: number, endH: number) => void
  onResetView: () => void
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
  todayDate,
  selectedDate,
  timeFormat,
  markerResolution = 'standard',
  dateLabel,
  selectedEventId,
  onGapClick,
  onEventClick,
  onEventTimeChange,
  onResetView,
}: DayWheelProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverHour, setHoverHour] = useState<number | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [resize, setResize] = useState<ResizeState | null>(null)
  const [settlingId, setSettlingId] = useState<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<EdgeRef | null>(null)

  const pointerStartRef = useRef<Position | null>(null)
  const hasInteractedRef = useRef(false)

  // ─── Dynamic rotation offset ──────────────────────────────────

  // Fixed offset — 00:00 always at top
  const angleOffset = 0

  const sorted = useMemo(
    () => [...events].sort((a, b) => a.startH - b.startH),
    [events]
  )

  const isInteracting = (drag?.hasMoved || resize?.hasMoved) ?? false


  // ─── Hour markers (Dynamic Resolution) ────────────────────────
  
  const markerConfig = useMemo(() => {
    const res = markerResolution
    const dots: { h: number; x: number; y: number; type: 'text' | 'tick' | 'subtick'; isMajor: boolean }[] = []
    
    // Sampling rules
    const step = res === 'technical' ? 0.5 : (res === 'minimal' ? 6 : 1)
    
    for (let h = 0; h < TOTAL_HOURS; h += step) {
      const angle = hourToAngle(h, angleOffset)
      const rad = degToRad(angle)
      const isCardinal = h % 6 === 0
      const isThreeH = h % 3 === 0
      const isInteger = h % 1 === 0

      let type: 'text' | 'tick' | 'subtick' = 'tick'
      let radiusOffset = 22

      if (res === 'minimal') {
        if (isCardinal) type = 'text'
        else continue
      } else if (res === 'standard') {
        if (isThreeH) type = 'text'
        else continue
      } else if (res === 'chronograph') {
        if (isThreeH) type = 'text'
        else type = 'tick'
      } else if (res === 'technical') {
        if (isInteger) type = 'text'
        else type = 'subtick'
      }

      if (type !== 'text') radiusOffset = 10

      const labelR = RING_RADIUS + RING_THICKNESS / 2 + radiusOffset
      
      dots.push({
        h,
        x: WHEEL_CENTER + labelR * Math.cos(rad),
        y: WHEEL_CENTER + labelR * Math.sin(rad),
        type,
        isMajor: isCardinal,
      })
    }
    return dots
  }, [markerResolution, angleOffset])

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
      hasInteractedRef.current = false

      // Priority 1: edge hit → resize
      const nearEdge = findNearestEdge(pt, hour, sorted, angleOffset)
      if (nearEdge) {
        ; (e.target as SVGElement).setPointerCapture(e.pointerId)
        pointerStartRef.current = pt

        const bounds = getResizeBounds(nearEdge.eventId, nearEdge.edge, events)
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

      const bounds = getDragBounds(clickedEvent.id, events)
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
    [events, angleOffset, sorted]
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

        hasInteractedRef.current = true
        const rawHour = pointToHour(pt, angleOffset)

        const currentHour = resize.edge === 'start' ? resize.previewStartH : resize.previewEndH
        let diff = rawHour - currentHour
        if (diff > 12) diff -= 24
        else if (diff < -12) diff += 24
        const hour = currentHour + diff

        if (resize.edge === 'start') {
          const newStart = snapToFiveMinutes(
            Math.max(resize.minHour, Math.min(resize.maxHour, hour))
          )
          setResize((prev) =>
            prev
              ? { ...prev, previewStartH: newStart, previewEndH: prev.fixedHour, hasMoved: true }
              : null
          )
        } else {
          const newEnd = snapToFiveMinutes(
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

        hasInteractedRef.current = true
        const rawHour = pointToHour(pt, angleOffset)

        const currentMouseHour = drag.previewStartH + drag.duration / 2 + drag.grabOffset
        let diff = rawHour - currentMouseHour
        if (diff > 12) diff -= 24
        else if (diff < -12) diff += 24
        const hour = currentMouseHour + diff

        const newMid = hour - drag.grabOffset
        let newStart = newMid - drag.duration / 2

        newStart = Math.max(drag.minStart, Math.min(drag.maxStart, newStart))
        newStart = snapToFiveMinutes(newStart)
        const newEnd = snapToFiveMinutes(newStart + drag.duration)

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
    [drag, resize, sorted, angleOffset]
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
      if (hasInteractedRef.current) {
        hasInteractedRef.current = false
        return
      }

      const pt = clientToSVG(svgRef.current, e.clientX, e.clientY)
      if (!isOnRing(pt)) return

      const hour = pointToHour(pt, angleOffset)
      const nearEdge = findNearestEdge(pt, hour, sorted, angleOffset)
      if (nearEdge) return

      const clickedEvent = [...sorted]
        .reverse()
        .find((ev) => !ev.isPopping && hour >= ev.startH && hour < ev.endH)

      if (clickedEvent) {
        // Calculate mid-point of the event segment in client coordinates
        const startAngle = hourToAngle(clickedEvent.startH, angleOffset)
        const endAngle = hourToAngle(clickedEvent.endH, angleOffset)
        const midAngle = (startAngle + endAngle) / 2
        const midRad = degToRad(midAngle)
        const midX = WHEEL_CENTER + RING_RADIUS * Math.cos(midRad)
        const midY = WHEEL_CENTER + RING_RADIUS * Math.sin(midRad)
        const clientMid = svgToClient(svgRef.current, midX, midY)

        onEventClick(clickedEvent, clientMid.x, clientMid.y)
      } else {
        onGapClick(hour, e.clientX, e.clientY)
      }
    },
    [events, onEventClick, onGapClick, sorted, angleOffset]
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

      {/* ─── Full ring track ─── */}
      <circle
        cx={WHEEL_CENTER}
        cy={WHEEL_CENTER}
        r={RING_RADIUS}
        fill="none"
        strokeWidth={RING_THICKNESS}
        strokeLinecap="round"
        className="active-arc transition-colors duration-500"
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
        const d = bubblePath(WHEEL_CENTER, WHEEL_CENTER, RING_RADIUS - RING_THICKNESS / 2, RING_RADIUS + RING_THICKNESS / 2, startAngle, endAngle)
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
            {/* Bubble segment */}
            <path
              d={d}
              fill={event.color.startsWith('g') ? `url(#grad-${event.color})` : event.color}
              stroke="none"
              opacity={0.88}
              className={segmentClass}
              filter={event.color.startsWith('g') ? `url(#glow-${event.color})` : undefined}
              style={{
                ...(isNew
                  ? ({
                    strokeDasharray: len,
                    strokeDashoffset: 0,
                    '--arc-length': len,
                  } as React.CSSProperties)
                  : {}),
                ...(isActive
                  ? ({ '--drag-color': event.color.startsWith('g') ? `var(--${event.color}-glow1)` : event.color + '60' } as React.CSSProperties)
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
        const isSelected = h.eventId === selectedEventId
        const event = events.find((e) => e.id === h.eventId)
        const color = event?.color ?? 'rgba(0,0,0,0.3)'

        return (
          <EdgeGrip
            key={i}
            cx={h.pos.x}
            cy={h.pos.y}
            angleDeg={h.angle}
            edge={h.edge}
            isActive={!!isActiveHandle}
            isHovered={isHovered}
            isSelected={isSelected}
            color={color}
          />
        )
      })}

      {/* ─── Hour markers ─── */}
      {markerConfig.map(({ h, x, y, type, isMajor }) => {
        if (type === 'text') {
          return (
            <text
              key={`text-${h}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={isMajor ? '12' : '10'}
              fontFamily="Outfit, system-ui, sans-serif"
              fontWeight={isMajor ? '700' : '500'}
              className={`pointer-events-none select-none transition-colors duration-500 ${
                isMajor ? 'hour-marker-major' : 'hour-marker'
              }`}
            >
              {formatMarker(h, timeFormat)}
            </text>
          )
        }

        // Ticks and Subticks
        const rad = degToRad(hourToAngle(h, angleOffset))
        const r1 = RING_RADIUS + RING_THICKNESS / 2 + 6
        const r2 = r1 + (type === 'tick' ? 8 : 4)
        
        return (
          <line
            key={`tick-${h}`}
            x1={WHEEL_CENTER + r1 * Math.cos(rad)}
            y1={WHEEL_CENTER + r1 * Math.sin(rad)}
            x2={WHEEL_CENTER + r2 * Math.cos(rad)}
            y2={WHEEL_CENTER + r2 * Math.sin(rad)}
            stroke="currentColor"
            strokeWidth={type === 'tick' ? 1.5 : 1}
            strokeLinecap="round"
            className="hour-marker transition-colors duration-500 opacity-60 dark:opacity-30"
          />
        )
      })}

      {/* ─── Now indicator ─── */}
      <CurrentTimeIndicator 
        currentTime={currentTime} 
        angleOffset={angleOffset} 
        visible={selectedDate === todayDate}
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
            className="dark:fill-white/5 dark:stroke-white/20"
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
            className="dark:fill-gray-400"
          >
            +
          </text>
        </g>
      )}
      {/* ─── Digital Clock Hub ─── */}
      <DigitalClock 
        currentTime={currentTime} 
        timeFormat={timeFormat}
        isLive={selectedDate === todayDate}
        dateLabel={dateLabel}
        onReset={onResetView}
      />

    </svg>
  )
}

function DigitalClock({ 
  currentTime, 
  timeFormat, 
  isLive, 
  dateLabel,
  onReset 
}: { 
  currentTime: number
  timeFormat: TimeFormat
  isLive: boolean
  dateLabel?: string
  onReset: () => void
}) {
  const h = Math.floor(currentTime)
  const m = Math.floor((currentTime % 1) * 60)
  const displayH = timeFormat === '12h' ? (h % 12 || 12) : h
  const timeStr = `${displayH}:${m.toString().padStart(2, '0')}`

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{ cursor: isLive ? 'default' : 'pointer' }}
      onClick={(e) => {
        if (!isLive) {
          e.stopPropagation()
          onReset()
        }
      }}
    >
      {/* Theme-aware filter definitions */}
      <defs>
        <filter id="hero-glow-dark" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feColorMatrix type="matrix" values="0 0 0 0 1   0 0 0 0 1   0 0 0 0 1  0 0 0 0.5 0" result="white-blur" />
          <feComposite in="SourceGraphic" in2="white-blur" operator="over" />
        </filter>
        <filter id="hero-glow-black" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.35 0" result="dark-blur" />
          <feComposite in="SourceGraphic" in2="dark-blur" operator="over" />
        </filter>
        <filter id="hero-lift-light" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.1" />
        </filter>
      </defs>

      {isLive ? (
        <text
          x={WHEEL_CENTER}
          y={WHEEL_CENTER - 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-black dark:fill-white select-none pointer-events-none transition-colors duration-500"
          style={{
            fontSize: '44px',
            fontWeight: '700',
            fontFamily: 'Outfit, sans-serif',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            filter: 'url(#hero-glow-dark)',
          }}
        >
          {timeStr}
        </text>
      ) : dateLabel ? (
        <g className="pointer-events-none">
          <text
            x={WHEEL_CENTER}
            y={WHEEL_CENTER - 16}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(0,0,0,0.3)"
            fontSize="14"
            fontWeight="700"
            fontFamily="Outfit, sans-serif"
            className="dark:fill-white/30 tracking-[0.2em] uppercase"
          >
            {dateLabel.split(', ')[0]}
          </text>
          <text
            x={WHEEL_CENTER}
            y={WHEEL_CENTER + 16}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(0,0,0,0.6)"
            fontSize="24"
            fontWeight="bold"
            fontFamily="Outfit, sans-serif"
            className="dark:fill-white/60 tracking-tight"
          >
            {dateLabel.split(', ').slice(1).join(', ')}
          </text>
        </g>
      ) : null}

      {/* Subtle Seconds Pulse Ring (purely decorative) */}
      {isLive && (
        <motion.circle
          cx={WHEEL_CENTER}
          cy={WHEEL_CENTER}
          r={66}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 200"
          strokeLinecap="round"
          className="text-gray-900/10 dark:text-white/10 pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
      )}
    </motion.g>
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
      <rect x={x - 26} y={y - 9} width={52} height={18} rx={9} fill="rgba(0,0,0,0.65)" className="dark:fill-white/20 dark:stroke-white/10" stroke="none" />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize="9"
        fontWeight="600"
        fontFamily="monospace"
        className="select-none dark:fill-gray-100"
      >
        {formatTime(hour, fmt)}
      </text>
    </g>
  )
}

// ─── Current Time Indicator ─────────────────────────────────────

function CurrentTimeIndicator({ currentTime, angleOffset, visible }: { currentTime: number; angleOffset: number; visible: boolean }) {
  if (!visible) return null
  const angle = hourToAngle(currentTime, angleOffset)
  const rad = degToRad(angle)

  // Precision needle: spanning the ring thickness + 4px overshoot on each side
  const r1 = RING_RADIUS - RING_THICKNESS / 2 - 4
  const r2 = RING_RADIUS + RING_THICKNESS / 2 + 4

  const x1 = WHEEL_CENTER + r1 * Math.cos(rad)
  const y1 = WHEEL_CENTER + r1 * Math.sin(rad)
  const x2 = WHEEL_CENTER + r2 * Math.cos(rad)
  const y2 = WHEEL_CENTER + r2 * Math.sin(rad)

  return (
    <motion.g initial={false} className="pointer-events-none">
      <motion.line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="rgba(0, 0, 0, 0.7)"
        strokeWidth={2}
        strokeLinecap="round"
        className="dark:stroke-white/80"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.g>
  )
}

// ─── Edge grip ──────────────────────────────────────────────────────────────
// Three short radial lines arranged along the arc tangent — like a ≡ grip

function EdgeGrip({
  cx, cy, angleDeg, edge, isActive, isHovered, isSelected, color,
}: {
  cx: number
  cy: number
  angleDeg: number
  edge: 'start' | 'end'
  isActive: boolean
  isHovered: boolean
  isSelected: boolean
  color: string
}) {
  const rad = degToRad(angleDeg)
  const tx = -Math.sin(rad)
  const ty = Math.cos(rad)
  const rx = Math.cos(rad)
  const ry = Math.sin(rad)

  const HALF_LEN = 11   // length across the ring

  const colorToken = color.startsWith('g') ? `var(--${color}-mid)` : color
  const stroke = isActive
    ? colorToken
    : isHovered
      ? 'rgba(255,255,255,1)'
      : 'rgba(255,255,255,0.75)'
  const strokeW = isActive ? 2.8 : isHovered ? 2.4 : 2.2

  // Only show handles if selected, hovered, or actively being used
  const isVisible = isSelected || isHovered || isActive

  // Shift INTO the bubble: if it's a start edge, we shift positive along tangent (clockwise)
  // if it's an end edge, we shift negative (counter-clockwise)
  const shiftAmount = 1.0 
  const dir = edge === 'start' ? 1 : -1
  const ox = cx + dir * shiftAmount * tx
  const oy = cy + dir * shiftAmount * ty

  return (
    <g 
      className="pointer-events-none" 
      style={{ 
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.25s ease'
      }}
    >
      {/* Visual Glow behind the line */}
      {(isHovered || isActive) && (
        <line
          x1={ox - (HALF_LEN + 2) * rx}
          y1={oy - (HALF_LEN + 2) * ry}
          x2={ox + (HALF_LEN + 2) * rx}
          y2={oy + (HALF_LEN + 2) * ry}
          stroke={colorToken}
          strokeWidth={strokeW + 4}
          strokeLinecap="round"
          opacity={0.2}
          style={{ filter: 'blur(4px)' }}
        />
      )}

      <line
        x1={ox - HALF_LEN * rx}
        y1={oy - HALF_LEN * ry}
        x2={ox + HALF_LEN * rx}
        y2={oy + HALF_LEN * ry}
        stroke={stroke}
        strokeWidth={strokeW}
        strokeLinecap="round"
        style={{ transition: 'stroke 0.15s ease, stroke-width 0.15s ease' }}
      />
    </g>
  )
}

