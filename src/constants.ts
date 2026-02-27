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

// Thick organic ring
export const RING_RADIUS = 180
export const RING_THICKNESS = 80
export const SLEEP_THICKNESS = RING_THICKNESS * 0.35
export const RING_HIT_PADDING = 30

// Handle dots at segment boundaries
export const HANDLE_RADIUS = 6
export const EDGE_HIT_RADIUS = 20
export const MIN_EVENT_DURATION = 0.25

// Color palette — neon signatures (Electric, Plasma, Volt, Blaze, UV, Coral, Aurora, Solar)
export const EVENT_COLORS = [
  '#00f5ff', // electric  — cyan
  '#ff00cc', // plasma    — magenta
  '#ccff00', // volt      — acid lime
  '#ff6600', // blaze     — fire orange
  '#bf00ff', // ultraviolet — deep violet
  '#f53010', // coral     — vivid red
  '#00ffb3', // aurora    — teal
  '#ffd700', // solar     — gold
]

export const DEFAULT_EVENT_DURATION = 1

export const SAMPLE_EVENTS = [
  { id: '1', title: 'Morning', startH: 7, endH: 8.5, color: '#f53010', type: 'fluid' as const },
  { id: '2', title: 'Work', startH: 9, endH: 12, color: '#00f5ff', type: 'solid' as const },
  { id: '3', title: 'Lunch', startH: 12, endH: 13, color: '#ffd700', type: 'fluid' as const },
  { id: '4', title: 'Flow', startH: 14, endH: 16.5, color: '#bf00ff', type: 'fluid' as const },
  { id: '5', title: 'Exercise', startH: 17, endH: 18.5, color: '#ff6600', type: 'solid' as const },
  { id: '6', title: 'Wind Down', startH: 20, endH: 22, color: '#00ffb3', type: 'fluid' as const },
]

