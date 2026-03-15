import React, { useState } from 'react'

export interface CardEventData {
    id: string
    title: string
    startH: number
    endH: number
    color: string
    notes?: string
    labels?: string[]
}

interface CardEditorProps {
    event: CardEventData
    onSave: (data: CardEventData) => void
    onCancel: () => void
}

const COLORS = ['#E07B6C', '#8B8FD8', '#8BA89A', '#E8A0BF', '#F4D35E']

export default function CardEditor({ event, onSave, onCancel }: CardEditorProps) {
    const [title, setTitle] = useState(event.title || '')
    const [notes, setNotes] = useState(event.notes || '')
    const [labelsText, setLabelsText] = useState((event.labels || []).join(', '))

    // For simplicity using time strings like "09:30"
    const startStr = `${Math.floor(event.startH).toString().padStart(2, '0')}:${Math.floor((event.startH % 1) * 60).toString().padStart(2, '0')}`
    const endStr = `${Math.floor(event.endH).toString().padStart(2, '0')}:${Math.floor((event.endH % 1) * 60).toString().padStart(2, '0')}`

    const [startT, setStartT] = useState(startStr)
    const [endT, setEndT] = useState(endStr)
    const [color, setColor] = useState(event.color || COLORS[0])

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault()

        // Parse times back to floats
        const [sH, sM] = startT.split(':').map(Number)
        const [eH, eM] = endT.split(':').map(Number)

        onSave({
            ...event,
            title: title.trim() || 'New Event',
            startH: sH + sM / 60,
            endH: eH + eM / 60,
            notes: notes.trim(),
            labels: labelsText.split(',').map(l => l.trim()).filter(Boolean),
            color,
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-sheet-backdrop" onClick={onCancel}>
            <div
                className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 relative overflow-hidden flex flex-col gap-4 animate-editor-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: color }} />

                <h2 className="text-xl font-bold text-gray-800 mt-2">
                    {event.id.startsWith('new-') ? 'Create Event' : 'Edit Event'}
                </h2>

                <form onSubmit={handleSave} className="flex flex-col gap-4">

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</label>
                        <input
                            autoFocus
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Design Sync"
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-col gap-1 flex-1 flex">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Start Time</label>
                            <input
                                type="time"
                                required
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                value={startT}
                                onChange={e => setStartT(e.target.value)}
                            />
                        </div>
                        <div className="flex-col gap-1 flex-1 flex">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">End Time</label>
                            <input
                                type="time"
                                required
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                value={endT}
                                onChange={e => setEndT(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</label>
                        <textarea
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none h-20"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Any details..."
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Labels (comma separated)</label>
                        <input
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            value={labelsText}
                            onChange={e => setLabelsText(e.target.value)}
                            placeholder="Work, Important, Review"
                        />
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Color Style</label>
                        <div className="flex gap-3">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'scale-110 border-gray-800' : 'border-transparent scale-100'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 rounded-xl font-semibold text-white transition-opacity shadow-md hover:opacity-90 active:scale-[0.98]"
                            style={{ backgroundColor: color }}
                        >
                            Save Event
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
