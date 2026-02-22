import { useEffect } from 'react'
import type { CalendarEvent, TimeFormat } from '../types'
import { formatTime } from '../utils'

interface DeleteConfirmProps {
  event: CalendarEvent
  timeFormat: TimeFormat
  onDelete: () => void
  onCancel: () => void
}

export default function DeleteConfirm({
  event,
  timeFormat,
  onDelete,
  onCancel,
}: DeleteConfirmProps) {
  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <>
      {/* Backdrop — soft frosted overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[2px]"
        onClick={onCancel}
      />

      {/* Centered dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="animate-pop-in bg-white rounded-2xl shadow-2xl shadow-black/8 border border-gray-100 w-full max-w-xs overflow-hidden">
          {/* Color accent bar — identifies the event visually */}
          <div
            className="h-2 w-full"
            style={{ backgroundColor: event.color }}
          />

          <div className="p-6 space-y-4">
            {/* Event info */}
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold text-gray-800">
                {event.title}
              </h3>
              <p className="text-sm text-gray-400 font-mono">
                {formatTime(event.startH, timeFormat)} — {formatTime(event.endH, timeFormat)}
              </p>
            </div>

            {/* Question */}
            <p className="text-center text-sm text-gray-500">
              Remove this event from your day?
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 transition-all active:scale-[0.97]"
              >
                Keep
              </button>
              <button
                onClick={onDelete}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.97]"
                style={{ backgroundColor: event.color }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
