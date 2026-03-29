// Full 24-hour ring — events can live anywhere
export const START_OF_DAY = 0
export const END_OF_DAY = 24
export const TOTAL_HOURS = 24

// Default active window (waking hours)
export const DEFAULT_ACTIVE_START = 7   // 7:00 AM
export const DEFAULT_ACTIVE_END = 0     // midnight (wraps)

// SVG canvas
export const WHEEL_SIZE = 560
export const WHEEL_CENTER = WHEEL_SIZE / 2

// Timezones
export const TIMEZONES = [
  { id: 'system', group: 'Local', label: 'Local Time (System)' },

  // US Time Zones
  { id: 'America/New_York', group: 'US', label: 'Eastern Time (ET)' },
  { id: 'America/Chicago', group: 'US', label: 'Central Time (CT)' },
  { id: 'America/Denver', group: 'US', label: 'Mountain Time (MT)' },
  { id: 'America/Los_Angeles', group: 'US', label: 'Pacific Time (PT)' },

  // Europe
  { id: 'Europe/London', group: 'Europe', label: 'Western European Time (London)' },
  { id: 'Europe/Paris', group: 'Europe', label: 'Central European Time (Paris, Berlin)' },
  { id: 'Europe/Athens', group: 'Europe', label: 'Eastern European Time (Athens, Cairo)' },

  // Middle East
  { id: 'Asia/Riyadh', group: 'Middle East', label: 'Arabia Standard Time (Riyadh)' },
  { id: 'Asia/Dubai', group: 'Middle East', label: 'Gulf Standard Time (Dubai)' },
  { id: 'Asia/Jerusalem', group: 'Middle East', label: 'Israel Standard Time (Jerusalem)' },
]

// Thick organic ring
export const RING_RADIUS = 180
export const RING_THICKNESS = 80
export const SLEEP_THICKNESS = RING_THICKNESS * 0.35
export const RING_HIT_PADDING = 30

// Handle dots at segment boundaries
export const HANDLE_RADIUS = 6
export const EDGE_HIT_RADIUS = 20
export const MIN_EVENT_DURATION = 1 / 12

// Color palette — ROYGBIV spectrum
export const EVENT_COLORS = [
  'g2-inferno',   // Red / Orange
  'g7-solar',     // Yellow
  'g5-toxic',     // Green
  'g3-electric',  // Cyan / Light Blue
  'g6-uv',        // Blue / Indigo
  'g1-dusk',      // Purple
  'g4-laser',     // Pink
  'g8-chrome',    // Pink / White
]

export const DEFAULT_EVENT_DURATION = 1

function isoDate(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

export const SAMPLE_EVENTS = [
  // Yesterday
  { id: 'y1', title: 'Morning', startH: 7, endH: 8.5, color: 'g2-inferno', type: 'fluid' as const, date: isoDate(-1) },
  { id: 'y2', title: 'Deep Work', startH: 9, endH: 12, color: 'g3-electric', type: 'solid' as const, date: isoDate(-1) },
  { id: 'y3', title: 'Lunch', startH: 12, endH: 13, color: 'g7-solar', type: 'fluid' as const, date: isoDate(-1) },
  { id: 'y4', title: 'Review', startH: 15, endH: 17, color: 'g1-dusk', type: 'fluid' as const, date: isoDate(-1) },
  // Today
  { id: '1', title: 'Morning', startH: 7, endH: 8.5, color: 'g2-inferno', type: 'fluid' as const, date: isoDate(0) },
  { id: '2', title: 'Work', startH: 9, endH: 12, color: 'g3-electric', type: 'solid' as const, date: isoDate(0) },
  { id: '3', title: 'Lunch', startH: 12, endH: 13, color: 'g7-solar', type: 'fluid' as const, date: isoDate(0) },
  { id: '4', title: 'Flow', startH: 14, endH: 16.5, color: 'g6-uv', type: 'fluid' as const, date: isoDate(0) },
  { id: '5', title: 'Exercise', startH: 17, endH: 18.5, color: 'g4-laser', type: 'solid' as const, date: isoDate(0) },
  { id: '6', title: 'Wind Down', startH: 20, endH: 22, color: 'g5-toxic', type: 'fluid' as const, date: isoDate(0) },
  // Tomorrow
  { id: 't1', title: 'Morning', startH: 7, endH: 8, color: 'g2-inferno', type: 'fluid' as const, date: isoDate(1) },
  { id: 't2', title: 'Standup', startH: 9, endH: 9.5, color: 'g8-chrome', type: 'solid' as const, date: isoDate(1) },
  { id: 't3', title: 'Build', startH: 10, endH: 13, color: 'g3-electric', type: 'fluid' as const, date: isoDate(1) },
  { id: 't4', title: 'Lunch', startH: 13, endH: 14, color: 'g7-solar', type: 'fluid' as const, date: isoDate(1) },
  { id: 't5', title: 'Gym', startH: 17.5, endH: 19, color: 'g4-laser', type: 'solid' as const, date: isoDate(1) },
]

