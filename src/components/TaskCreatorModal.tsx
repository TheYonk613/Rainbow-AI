import { useState, useRef, useEffect } from 'react'

interface TaskCreatorModalProps {
    onDone: (text: string) => void
    onCancel: () => void
}

export default function TaskCreatorModal({ onDone, onCancel }: TaskCreatorModalProps) {
    const [text, setText] = useState('')
    const [saving, setSaving] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        // Auto-focus the input
        setTimeout(() => inputRef.current?.focus(), 100)
    }, [])

    const handleDone = () => {
        if (!text.trim() || saving) return
        setSaving(true)
        console.log(`User would have saved task: "${text.trim()}"`)

        // Wizard of Oz: 500ms fake latency
        setTimeout(() => {
            onDone(text.trim())
        }, 500)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleDone()
        if (e.key === 'Escape') onCancel()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm settings-backdrop"
                onClick={onCancel}
            />

            {/* Round modal */}
            <div className="relative animate-modal-circle-in w-72 h-72 rounded-full bg-white/90 backdrop-blur-xl shadow-2xl shadow-black/10 border border-white/60 flex flex-col items-center justify-center gap-4 p-8">
                {/* Title */}
                <span className="text-sm font-semibold text-gray-500 tracking-wide">
                    New Task
                </span>

                {/* Input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="What needs doing?"
                    disabled={saving}
                    className="w-full text-center text-base font-medium text-gray-700 bg-transparent border-b-2 border-gray-200 focus:border-purple-300 outline-none py-2 placeholder:text-gray-300 transition-colors disabled:opacity-50"
                    maxLength={60}
                />

                {/* Done button */}
                <button
                    onClick={handleDone}
                    disabled={!text.trim() || saving}
                    className="mt-2 h-10 px-6 rounded-full bg-gradient-to-r from-[#B5B8F0] to-[#E8A0BF] text-white text-sm font-semibold shadow-md shadow-purple-200/50 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 cursor-pointer flex items-center gap-2"
                >
                    {saving ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            Saving…
                        </>
                    ) : (
                        'Done'
                    )}
                </button>
            </div>
        </div>
    )
}
