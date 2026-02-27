import {
  START_OF_DAY,
  END_OF_DAY,
  TOTAL_HOURS,
  WHEEL_CENTER,
  RING_RADIUS,
  RING_THICKNESS,
  RING_HIT_PADDING,
  DEFAULT_EVENT_DURATION,
  MIN_EVENT_DURATION,
} from './constants'
import type { CalendarEvent, Position, TimeGap, TimeFormat } from './types'

// ─── Dynamic rotation offset ─────────────────────────────────────

/**
 * Compute the angle offset that centers the active window on the ring.
 * The midpoint of the active hours maps to 90° (bottom / 6-o'clock).
 */
export function computeAngleOffset(activeStart: number, activeEnd: number): number {
  let activeMid: number
  if (activeEnd > activeStart) {
    activeMid = (activeStart + activeEnd) / 2
  } else {
    // Wraps through midnight (e.g. active 7 AM → midnight)
    const duration = (24 - activeStart) + activeEnd
    activeMid = (activeStart + duration / 2) % 24
  }
  return 180 - (activeMid / TOTAL_HOURS) * 360
}

// ─── Angle / position helpers ────────────────────────────────────

export function hourToAngle(hour: number, offset = 0): number {
  return (hour / TOTAL_HOURS) * 360 - 90 + offset
}

export function angleToHour(angleDeg: number, offset = 0): number {
  let norm = (angleDeg - offset + 90) % 360
  if (norm < 0) norm += 360
  return (norm / 360) * TOTAL_HOURS
}


export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360
}

export function getEventMidpointHour(startH: number, endH: number): number {
  const normalizedEnd = endH >= startH ? endH : endH + TOTAL_HOURS
  const midpoint = (startH + normalizedEnd) / 2
  return midpoint % TOTAL_HOURS
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function hourToPosition(hour: number, offset = 0): Position {
  const rad = degToRad(hourToAngle(hour, offset))
  return {
    x: WHEEL_CENTER + RING_RADIUS * Math.cos(rad),
    y: WHEEL_CENTER + RING_RADIUS * Math.sin(rad),
  }
}

// ─── SVG arc path ────────────────────────────────────────────────

export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polar(cx, cy, r, startAngle)
  const end = polar(cx, cy, r, endAngle)
  const sweep = endAngle - startAngle
  const large = sweep > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`
}

export function arcLength(startH: number, endH: number): number {
  const sweep = ((endH - startH) / TOTAL_HOURS) * 360
  return degToRad(sweep) * RING_RADIUS
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = degToRad(angleDeg)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

// ─── SVG coordinate conversion ───────────────────────────────────

export function clientToSVG(svg: SVGSVGElement, clientX: number, clientY: number): Position {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()?.inverse()
  if (!ctm) return { x: clientX, y: clientY }
  const svgPt = pt.matrixTransform(ctm)
  return { x: svgPt.x, y: svgPt.y }
}

// ─── Ring hit testing ────────────────────────────────────────────

export function isOnRing(pt: Position): boolean {
  const dx = pt.x - WHEEL_CENTER
  const dy = pt.y - WHEEL_CENTER
  const dist = Math.sqrt(dx * dx + dy * dy)
  const inner = RING_RADIUS - RING_THICKNESS / 2 - RING_HIT_PADDING
  const outer = RING_RADIUS + RING_THICKNESS / 2 + RING_HIT_PADDING
  return dist >= inner && dist <= outer
}

export function pointToHour(pt: Position, offset = 0): number {
  const dx = pt.x - WHEEL_CENTER
  const dy = pt.y - WHEEL_CENTER
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  return angleToHour(angleDeg, offset)
}

// ─── Gap detection ───────────────────────────────────────────────

export function findGapAtTime(events: CalendarEvent[], time: number): TimeGap | null {
  const existing = events.find((e) => !e.isPopping && time >= e.startH && time < e.endH)
  if (existing) return null

  const sorted = [...events].filter((e) => !e.isPopping).sort((a, b) => a.startH - b.startH)
  let gapStart = START_OF_DAY
  let gapEnd = END_OF_DAY

  for (const e of sorted) {
    if (e.endH <= time) {
      gapStart = Math.max(gapStart, e.endH)
    }
    if (e.startH > time) {
      gapEnd = Math.min(gapEnd, e.startH)
      break
    }
  }

  return { start: gapStart, end: gapEnd }
}

export function defaultEventTimes(
  clickedHour: number,
  gap: TimeGap
): { startH: number; endH: number } {
  const half = DEFAULT_EVENT_DURATION / 2

  let startH = Math.max(gap.start, clickedHour - half)
  let endH = startH + DEFAULT_EVENT_DURATION

  if (endH > gap.end) {
    endH = gap.end
    startH = Math.max(gap.start, endH - DEFAULT_EVENT_DURATION)
  }

  startH = Math.round(startH * 4) / 4
  endH = Math.round(endH * 4) / 4
  if (endH - startH < 0.25) endH = startH + 0.25

  return { startH, endH }
}

// ─── Formatting ──────────────────────────────────────────────────

export function formatTime(hour: number, format: TimeFormat = '24h'): string {
  const h = Math.floor(hour) % 24
  const m = Math.round((hour - Math.floor(hour)) * 60)

  if (format === '24h') {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
}

/** Compact format for ring hour markers */
export function formatMarker(hour: number, format: TimeFormat = '24h'): string {
  const h = Math.floor(hour) % 24
  if (format === '24h') {
    return h.toString().padStart(2, '0')
  }
  const period = h >= 12 ? 'p' : 'a'
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${displayH}${period}`
}

export function formatCountdown(minutes: number): string {
  if (minutes < 1) return '<1m'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

export function getActiveEvent(events: CalendarEvent[], currentTime: number): CalendarEvent | null {
  return events.find((e) => currentTime >= e.startH && currentTime < e.endH) ?? null
}

// ─── Drag helpers ────────────────────────────────────────────────

export function snapToQuarter(hour: number): number {
  return Math.round(hour * 4) / 4
}

export function getDragBounds(
  eventId: string,
  events: CalendarEvent[]
): { minStart: number; maxStart: number; duration: number } {
  const event = events.find((e) => e.id === eventId)!
  const duration = event.endH - event.startH
  const others = events
    .filter((e) => e.id !== eventId && !e.isPopping)
    .sort((a, b) => a.startH - b.startH)

  let minStart = START_OF_DAY
  for (const o of others) {
    if (o.endH <= event.startH) minStart = o.endH
  }

  let maxEnd = END_OF_DAY
  for (const o of others) {
    if (o.startH >= event.endH) {
      maxEnd = o.startH
      break
    }
  }

  return { minStart, maxStart: maxEnd - duration, duration }
}

export function getResizeBounds(
  eventId: string,
  edge: 'start' | 'end',
  events: CalendarEvent[]
): { fixedHour: number; minHour: number; maxHour: number } {
  const event = events.find((e) => e.id === eventId)!
  const others = events
    .filter((e) => e.id !== eventId && !e.isPopping)
    .sort((a, b) => a.startH - b.startH)

  if (edge === 'start') {
    let min = START_OF_DAY
    for (const o of others) {
      if (o.endH <= event.startH) min = o.endH
    }
    return {
      fixedHour: event.endH,
      minHour: min,
      maxHour: event.endH - MIN_EVENT_DURATION,
    }
  } else {
    let max = END_OF_DAY
    for (const o of others) {
      if (o.startH >= event.endH) {
        max = o.startH
        break
      }
    }
    return {
      fixedHour: event.startH,
      minHour: event.startH + MIN_EVENT_DURATION,
      maxHour: max,
    }
  }
}
