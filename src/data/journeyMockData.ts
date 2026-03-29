// Journey Mock Data
// All data for the Journey daily recap page lives here.
// Never hardcode beat content inside JourneyPage.tsx — add it here instead.

export type BeatType = 'call' | 'message' | 'place' | 'task' | 'unresolved' | 'deleted'
export type PillColor = 'orange' | 'purple' | 'gold' | 'sage' | 'red' | 'grey'

export interface JourneyBeat {
    id: string
    type: BeatType
    title: string
    summary: string
    time: string
    pill?: string
    pillColor?: PillColor
    ctaLabel?: string // for unresolved beats
}

export interface CompletedTask {
    id: string
    label: string
}

// The single opening story sentence — reads like a narrator who knows you.
// "You spoke to Elisha for the first time this week!" not "Summary: 3 tasks done"
export const TONIGHT_STORY = "You spoke to Elisha for the first time this week!"

// The three completed tasks shown as clickable chips
export const COMPLETED_TASKS: CompletedTask[] = [
    { id: 'ct1', label: 'Gym' },
    { id: 'ct2', label: 'Sent proposal' },
    { id: 'ct3', label: 'Called Mom' },
]

// The day's beats — ordered by priority (unresolved first, then reverse-chron)
export const JOURNEY_BEATS: JourneyBeat[] = [
    {
        id: 'b1',
        type: 'unresolved',
        title: 'Elisha · Call dropped',
        summary: "He texted you at 11:47 PM — he'd like to continue the call. You might've missed it.",
        time: '11:47 PM',
        pill: 'Unresolved',
        pillColor: 'orange',
        ctaLabel: 'Send quick reply',
    },
    {
        id: 'b2',
        type: 'call',
        title: 'Elisha · 22 min call',
        summary: 'You talked about his love life and plans for the summer.',
        time: '4:32 PM',
        pill: 'First time this week ✨',
        pillColor: 'purple',
    },
    {
        id: 'b3',
        type: 'place',
        title: 'Work → Home',
        summary: 'You were away for 9.5 hours.',
        time: '5:45 PM',
    },
    {
        id: 'b4',
        type: 'task',
        title: 'Gym · 45 min',
        summary: "Third time at the gym this week. You're building something.",
        time: '7:30 AM',
        pill: 'Milestone 🔥',
        pillColor: 'gold',
    },
    {
        id: 'b5',
        type: 'message',
        title: 'Noa · WhatsApp',
        summary: 'First conversation in 2 weeks. She asked about your project.',
        time: '1:12 PM',
        pill: 'First time ✨',
        pillColor: 'purple',
    },
]

// Fallback story for quiet days (no beats)
export const QUIET_DAY_STORY = "A quiet day. Sometimes that's exactly what you need."
