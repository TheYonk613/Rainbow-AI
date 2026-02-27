import { useEffect, useRef, useState } from 'react'
import type { CalendarEvent } from '../types'

interface EventEditorProps {
    event: CalendarEvent
    onSave: (id: string, newTitle: string) => void
    onCancel: () => void
}

export default function EventEditor({ event, onSave, onCancel }: EventEditorProps) {
    const [title, setTitle] = useState(event.title)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
    }, [])

    useEffect(() => {
        const handle = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel()
        }
        document.addEventListener('keydown', handle)
        return () => document.removeEventListener('keydown', handle)
    }, [onCancel])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = title.trim()
        if (trimmed) onSave(event.id, trimmed)
    }

    return (
        <div className="modal-backdrop" onClick={onCancel}>
            <div className="event-editor-sheet" onClick={(e) => e.stopPropagation()}>
                {/* Color swatch */}
                <div
                    className="event-editor-swatch"
                    style={{ background: event.color }}
                />

                <h2 className="event-editor-heading">Rename event</h2>

                <form onSubmit={handleSubmit} className="event-editor-form">
                    <input
                        ref={inputRef}
                        className="event-editor-input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Event name"
                        maxLength={40}
                    />

                    <div className="event-editor-actions">
                        <button type="button" className="btn-ghost" onClick={onCancel}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={!title.trim()}
                            style={{ background: event.color }}
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
