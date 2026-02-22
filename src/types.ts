export type EventType = 'solid' | 'fluid'

export type FluidBoundary = 'start' | 'end' | 'both'

export type TimeFormat = '12h' | '24h'

export interface Position {
  x: number
  y: number
}

export interface CalendarEvent {
  id: string
  title: string
  startH: number       // hour as float, e.g. 9.5 = 9:30 AM
  endH: number         // hour as float, e.g. 11.0 = 11:00 AM
  color: string        // hex color
  type: EventType
  fluidBoundary?: FluidBoundary
  isNew?: boolean      // triggers spring-in animation
  isPopping?: boolean  // triggers bubble-pop destruction animation
}

/** Describes a gap in the schedule where a new event can be placed */
export interface TimeGap {
  start: number
  end: number
}

/** Drag state tracked during whole-segment rescheduling */
export interface DragState {
  eventId: string
  duration: number
  grabOffset: number
  minStart: number
  maxStart: number
  previewStartH: number
  previewEndH: number
  hasMoved: boolean
}

/** Resize state tracked when pulling an edge to change event duration */
export interface ResizeState {
  eventId: string
  edge: 'start' | 'end'
  fixedHour: number
  minHour: number
  maxHour: number
  previewStartH: number
  previewEndH: number
  hasMoved: boolean
}
