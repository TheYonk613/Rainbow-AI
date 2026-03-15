import React, { useState, useEffect } from 'react'
import type { CalendarEvent } from '../types'
import { defaultEventTimes } from '../utils'

interface CardModeProps {
    events: CalendarEvent[]
    currentTime: number
    onCreateEventClick: (startH: number, endH: number) => void
    onEditClick: (event: CalendarEvent) => void
}

export default function CardMode({
    events,
    currentTime,
    onCreateEventClick,
    onEditClick,
}: CardModeProps) {
    const [timeStr, setTimeStr] = useState('')

    useEffect(() => {
        const updateTime = () => {
            // Israel time formatted
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Jerusalem',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            })
            setTimeStr(formatter.format(new Date()))
        }

        updateTime()
        const interval = setInterval(updateTime, 1000)
        return () => clearInterval(interval)
    }, [])

    // Simple active/past/future split
    const sortedEvents = [...events].sort((a, b) => a.startH - b.startH)
    const currentHourDecimal = currentTime

    return (
        <div className="w-full h-full flex flex-col pt-20 px-6 pb-24 overflow-y-auto items-center">
            <div className="w-full max-w-xs flex flex-col gap-6 items-center">

                {/* Clock */}
                <div className="text-center mb-2">
                    <div className="text-sm font-semibold tracking-wider text-gray-400 uppercase mb-1">
                        Israel Time
                    </div>
                    <div className="text-6xl font-bold tracking-tighter text-gray-800">
                        {timeStr}
                    </div>
                </div>

                {/* Fixed Create Event Button Placeholder (Soft outlined card) */}
                <button
                    onClick={() => onCreateEventClick(12, 13)} // Default initial times
                    className="w-full h-32 rounded-3xl border-2 border-dashed border-gray-300 bg-white/40 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white/60 hover:border-gray-400 transition-all cursor-pointer shadow-sm group"
                >
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </div>
                </button>

                {/* Timeline Event Cards & Free Time Gaps */}
                {sortedEvents.map((ev, i) => {
                    const isActive = currentHourDecimal >= ev.startH && currentHourDecimal < ev.endH

                    let gapElement = null
                    if (i > 0) {
                        const prevEv = sortedEvents[i - 1]
                        const gapHours = ev.startH - prevEv.endH
                        if (gapHours > 0) {
                            const h = Math.floor(gapHours)
                            const m = Math.round((gapHours - h) * 60)
                            const gapText = h > 0 ? (m > 0 ? `${h}h ${m}m free` : `${h}h free`) : `${m}m free`

                            gapElement = (
                                <div key={`gap-${i}`} className="my-1 py-1.5 px-4 rounded-full bg-indigo-50/60 border border-indigo-100 text-indigo-500 font-semibold text-xs tracking-wide shadow-sm flex items-center justify-center z-10 -my-4 relative backdrop-filter backdrop-blur-md">
                                    {gapText}
                                </div>
                            )
                        }
                    }

                    return (
                        <React.Fragment key={ev.id}>
                            {gapElement}
                            <div
                                onClick={() => onEditClick(ev)}
                                className={`w-full p-6 rounded-[2rem] flex flex-col shadow-md border-2 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lg relative overflow-hidden ${isActive
                                    ? 'bg-gradient-to-br from-[#E07B6C] via-[#8B8FD8] to-[#8BA89A] text-white border-transparent shadow-purple-500/20 shadow-xl scale-[1.02]'
                                    : 'bg-white border-gray-100 text-gray-800'
                                    }`}
                                style={{ height: '220px' }} // playing card proportion
                            >
                                {/* Visual styling dot for non-active cards */}
                                {ev.color && !isActive && (
                                    <div className="absolute top-6 right-6 w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: ev.color }} />
                                )}

                                <div className="text-sm font-semibold opacity-70 mb-2 tracking-wide font-mono">
                                    {Math.floor(ev.startH).toString().padStart(2, '0')}:
                                    {((ev.startH % 1) * 60).toString().padStart(2, '0')} -
                                    {Math.floor(ev.endH).toString().padStart(2, '0')}:
                                    {((ev.endH % 1) * 60).toString().padStart(2, '0')}
                                </div>
                                <div className="text-2xl font-bold mb-2 leading-tight pr-4">{ev.title}</div>
                                {isActive && (
                                    <div className="mt-auto inline-flex items-center gap-2 bg-white/20 backdrop-blur w-fit px-3 py-1.5 rounded-full text-xs font-semibold">
                                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                        Happening Now
                                    </div>
                                )}
                            </div>
                        </React.Fragment>
                    )
                })}

            </div>
        </div>
    )
}
