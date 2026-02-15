export const START_OF_DAY = 8   // 8:00 AM
export const END_OF_DAY = 20    // 8:00 PM
export const TOTAL_HOURS = END_OF_DAY - START_OF_DAY  // 12 hours

// SVG canvas
export const WHEEL_SIZE = 560
export const WHEEL_CENTER = WHEEL_SIZE / 2

// Thick organic ring
export const RING_RADIUS = 180         // center-line of the ring
export const RING_THICKNESS = 80       // stroke width → thick donut
export const RING_HIT_PADDING = 30     // extra click tolerance beyond ring edges

// Small white handle dots at segment boundaries
export const HANDLE_RADIUS = 6

// Organic, warm color palette (matches the Ra1nbow AI aesthetic)
export const EVENT_COLORS = [
  '#E07B6C', // coral
  '#D4A574', // golden tan
  '#8B8FD8', // periwinkle
  '#8BA89A', // sage green
  '#5C4A6B', // deep plum
  '#F0849B', // soft pink
  '#7CC4D4', // sky blue
  '#C4A0D8', // lavender
]

// Default duration for new events (hours)
export const DEFAULT_EVENT_DURATION = 1

// Sample events
export const SAMPLE_EVENTS = [
  { id: '1', title: 'Morning Routine', startH: 8, endH: 9.5, color: '#E07B6C', type: 'fluid' as const },
  { id: '2', title: 'Work', startH: 9.5, endH: 12, color: '#8B8FD8', type: 'solid' as const },
  { id: '3', title: 'Lunch', startH: 12, endH: 13, color: '#D4A574', type: 'fluid' as const },
  { id: '4', title: 'Flow', startH: 14, endH: 16, color: '#5C4A6B', type: 'fluid' as const },
  { id: '5', title: 'Exercise', startH: 16, endH: 17.5, color: '#F0849B', type: 'solid' as const },
  { id: '6', title: 'Wind Down', startH: 18, endH: 20, color: '#8BA89A', type: 'fluid' as const },
]
