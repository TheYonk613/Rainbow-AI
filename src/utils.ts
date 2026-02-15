import {
  START_OF_DAY,
  END_OF_DAY,
  TOTAL_HOURS,
  WHEEL_CENTER,
  RING_RADIUS,
  RING_THICKNESS,
  RING_HIT_PADDING,
  DEFAULT_EVENT_DURATION,
} from './constants'
import type { CalendarEvent, Position, TimeGap } from './types'

// ─── Angle / position helpers ────────────────────────────────────

/**
 * Hour → angle in degrees. 12 o'clock (top) = -90° in SVG.
 */
export function hourToAngle(hour: number): number {
  const fraction = (hour - START_OF_DAY) / TOTAL_HOURS
  return fraction * 360 - 90
}

/**
 * Angle (degrees, SVG convention) → hour float.
 */
export function angleToHour(angleDeg: number): number {
  // Normalize: SVG 0° is 3 o'clock, we offset by +90 so top = 0
  let norm = (angleDeg + 90) % 360
  if (norm < 0) norm += 360
  const hour = START_OF_DAY + (norm / 360) * TOTAL_HOURS
  return Math.max(START_OF_DAY, Math.min(END_OF_DAY, hour))
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Hour → {x,y} on the ring center-line.
 */
export function hourToPosition(hour: number): Position {
  const rad = degToRad(hourToAngle(hour))
  return {
    x: WHEEL_CENTER + RING_RADIUS * Math.cos(rad),
    y: WHEEL_CENTER + RING_RADIUS * Math.sin(rad),
  }
}

// ─── SVG arc path (single-line arc for thick strokes) ────────────

/**
 * Arc path along a circle — used with thick strokeWidth for ring segments.
 */
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

/**
 * Compute the visual arc length (in SVG units) for an event.
 */
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

/**
 * Check if a point (in SVG coords) is within the clickable ring area.
 */
export function isOnRing(pt: Position): boolean {
  const dx = pt.x - WHEEL_CENTER
  const dy = pt.y - WHEEL_CENTER
  const dist = Math.sqrt(dx * dx + dy * dy)
  const inner = RING_RADIUS - RING_THICKNESS / 2 - RING_HIT_PADDING
  const outer = RING_RADIUS + RING_THICKNESS / 2 + RING_HIT_PADDING
  return dist >= inner && dist <= outer
}

/**
 * Convert a point on/near the ring to an hour.
 */
export function pointToHour(pt: Position): number {
  const dx = pt.x - WHEEL_CENTER
  const dy = pt.y - WHEEL_CENTER
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  return angleToHour(angleDeg)
}

// ─── Gap detection ───────────────────────────────────────────────

/**
 * Find the open time gap at the given hour, or null if an event is there.
 */
export function findGapAtTime(events: CalendarEvent[], time: number): TimeGap | null {
  // Is there already an event here?
  const existing = events.find((e) => time >= e.startH && time < e.endH)
  if (existing) return null

  const sorted = [...events].sort((a, b) => a.startH - b.startH)
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

/**
 * Compute a sensible default start/end for a new event at the clicked time,
 * clamped within the available gap.
 */
export function defaultEventTimes(
  clickedHour: number,
  gap: TimeGap
): { startH: number; endH: number } {
  const half = DEFAULT_EVENT_DURATION / 2

  // Try to center around click, clamped to gap
  let startH = Math.max(gap.start, clickedHour - half)
  let endH = startH + DEFAULT_EVENT_DURATION

  if (endH > gap.end) {
    endH = gap.end
    startH = Math.max(gap.start, endH - DEFAULT_EVENT_DURATION)
  }

  // Round to nearest 15 min
  startH = Math.round(startH * 4) / 4
  endH = Math.round(endH * 4) / 4

  if (endH - startH < 0.25) endH = startH + 0.25

  return { startH, endH }
}

// ─── Formatting ──────────────────────────────────────────────────

export function formatTime(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
}

export function formatTimeShort(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
  if (m === 0) return `${displayH}`
  return `${displayH}:${m.toString().padStart(2, '0')}`
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
