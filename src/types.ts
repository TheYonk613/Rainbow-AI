export type EventType = 'solid' | 'fluid'

export type FluidBoundary = 'start' | 'end' | 'both'

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

export type BubblePositions = Record<string, Position>

export type AppMode = 'view' | 'build'

/** Describes a gap in the schedule where a new event can be placed */
export interface TimeGap {
  start: number
  end: number
}
