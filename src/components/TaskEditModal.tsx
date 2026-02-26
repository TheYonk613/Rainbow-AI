import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'

export interface Task {
    id: string
    text: string
    color: string
    isNew: boolean
    subtasks: string[]
    completed: boolean
}

interface Props {
    task: Task
    onSave: (updated: Task) => void
    onComplete: () => void
    onCancel: () => void
    /** Balloon knot position in viewport coords (for transform-origin) */
    originX: number
    originY: number
}

export default function TaskEditModal({ task, onSave, onComplete, onCancel, originX, originY }: Props) {
    const [title, setTitle] = useState(task.text)
    const [subtasks, setSubtasks] = useState<string[]>(task.subtasks ?? [])
    const titleRef = useRef<HTMLInputElement>(null)

    useEffect(() => { titleRef.current?.focus() }, [])

    const addSubtask = () => setSubtasks(s => [...s, ''])
    const updateSubtask = (i: number, val: string) =>
        setSubtasks(s => s.map((x, idx) => idx === i ? val : x))
    const removeSubtask = (i: number) =>
        setSubtasks(s => s.filter((_, idx) => idx !== i))

    const handleSave = () => {
        onSave({
            ...task,
            text: title.trim() || task.text,
            subtasks: subtasks.filter(s => s.trim() !== ''),
        })
    }

    // Transform origin for the "unfold from balloon" effect
    const style = { transformOrigin: `${originX}px ${originY}px` }

    return (
        // Full-page backdrop
        <motion.div
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 200 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onCancel} // click-away
        >
            {/* Blur overlay */}
            <div
                className="absolute inset-0"
                style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.15)' }}
            />

            {/* Panel */}
            <motion.div
                className="relative rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4"
                style={{
                    background: `linear-gradient(135deg, ${task.color}22 0%, rgba(255,255,255,0.92) 60%)`,
                    backdropFilter: 'blur(20px)',
                    border: `1.5px solid ${task.color}44`,
                    opacity: 0.96,
                    ...style,
                }}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                onClick={e => e.stopPropagation()} // prevent backdrop dismiss
            >
                {/* Colour accent strip */}
                <div
                    className="absolute top-0 left-8 right-8 h-1 rounded-full"
                    style={{ background: task.color, opacity: 0.7 }}
                />

                {/* Title */}
                <input
                    ref={titleRef}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    className="w-full text-2xl font-bold bg-transparent border-none outline-none text-gray-800 placeholder-gray-300 mt-3"
                    placeholder="Task name…"
                />

                {/* Divider */}
                <div className="my-4 h-px bg-gray-200" />

                {/* Subtasks */}
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Subtasks</p>

                <AnimatePresence initial={false}>
                    {subtasks.map((sub, i) => (
                        <motion.div
                            key={i}
                            className="flex items-center gap-2 mb-2"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                        >
                            <span className="text-gray-300 flex-shrink-0">·</span>
                            <input
                                value={sub}
                                onChange={e => updateSubtask(i, e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') addSubtask()
                                    if (e.key === 'Backspace' && sub === '') removeSubtask(i)
                                }}
                                className="flex-1 bg-transparent border-b border-gray-200 focus:border-gray-400 outline-none text-sm text-gray-700 py-1 transition-colors"
                                placeholder="Subtask…"
                            />
                            <button
                                onClick={() => removeSubtask(i)}
                                className="text-gray-300 hover:text-red-400 transition-colors w-4 h-4 flex items-center justify-center text-xs flex-shrink-0"
                            >✕</button>
                        </motion.div>
                    ))}
                </AnimatePresence>

                <button
                    onClick={addSubtask}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1 flex items-center gap-1"
                >
                    <span className="text-lg leading-4">+</span> Add subtask
                </button>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-8">
                    <motion.button
                        onClick={handleSave}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white shadow-lg transition-shadow"
                        style={{ background: task.color }}
                    >
                        Save Changes
                    </motion.button>

                    <motion.button
                        onClick={onComplete}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                        ✓ Complete
                    </motion.button>

                    <motion.button
                        onClick={onCancel}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        className="py-3 px-4 rounded-2xl text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        Cancel
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    )
}
