import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TaskBalloon, { getBalloonPosition, KNOT_Y_IN_SVG, SVG_H } from './TaskBalloon'
import TaskCreatorModal from './TaskCreatorModal'
import TaskEditModal, { type Task } from './TaskEditModal'

const BALLOON_COLORS = [
    '#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCB77',
    '#A855F7', '#F97316', '#3B82F6', '#EC4899',
]

function seeded(i: number) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453
    return s - Math.floor(s)
}

const LS_KEY = 'ra1nbow-tasks-v2'

function loadTasks(): Task[] {
    try {
        const raw = localStorage.getItem(LS_KEY)
        if (!raw) return []
        const parsed: Task[] = JSON.parse(raw)
        // Strip isNew flag on hydration — these are returning tasks
        return parsed.map(t => ({ ...t, isNew: false }))
    } catch {
        return []
    }
}

function saveTasks(tasks: Task[]) {
    try {
        // Don't persist the isNew flag
        localStorage.setItem(LS_KEY, JSON.stringify(
            tasks.map(t => ({ ...t, isNew: false }))
        ))
    } catch { /* quota exceeded etc */ }
}

let nextId = Date.now()

interface BalloonPos { x: number; y: number }
interface Layout {
    pageH: number
    areaBottomY: number
    areaCenterX: number
    buttonX: number
    buttonY: number
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>(loadTasks)
    const [showCreator, setShowCreator] = useState(false)
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null)

    // Persist on every task change
    useEffect(() => { saveTasks(tasks) }, [tasks])

    // The task to edit
    const editingTask = tasks.find(t => t.id === editingTaskId) ?? null

    // Refs for layout measurement
    const pageRef = useRef<HTMLDivElement>(null)
    const balloonAreaRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

    const [layout, setLayout] = useState<Layout>({
        pageH: 800, areaBottomY: 700, areaCenterX: 300, buttonX: 300, buttonY: 760,
    })

    const measure = useCallback(() => {
        if (!pageRef.current || !balloonAreaRef.current || !buttonRef.current) return
        const pR = pageRef.current.getBoundingClientRect()
        const aR = balloonAreaRef.current.getBoundingClientRect()
        const bR = buttonRef.current.getBoundingClientRect()
        setLayout({
            pageH: pR.height,
            areaBottomY: aR.bottom - pR.top,
            areaCenterX: aR.left - pR.left + aR.width / 2,
            buttonX: bR.left - pR.left + bR.width / 2,
            buttonY: bR.top - pR.top + bR.height / 2,
        })
    }, [])

    useEffect(() => {
        measure()
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
    }, [measure])

    useEffect(() => { setTimeout(measure, 50) }, [tasks.length, measure])

    // Live balloon positions for string drawing
    const positionsRef = useRef<Map<string, BalloonPos>>(new Map())
    const [, forceUpdate] = useState(0)
    const rafRef = useRef<number | null>(null)

    const scheduleDraw = useCallback(() => {
        if (rafRef.current) return
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null
            forceUpdate(n => n + 1)
        })
    }, [])

    const handlePositionUpdate = useCallback(
        (taskId: string) => (x: number, y: number) => {
            positionsRef.current.set(taskId, { x, y })
            scheduleDraw()
        },
        [scheduleDraw]
    )

    // New task
    const handleDone = useCallback((text: string) => {
        const id = `task-${nextId++}`
        const newTask: Task = {
            id,
            text,
            color: BALLOON_COLORS[tasks.length % BALLOON_COLORS.length],
            isNew: true,
            subtasks: [],
            completed: false,
        }
        setTasks(prev => [...prev, newTask])
        setShowCreator(false)
        setTimeout(() => {
            setTasks(prev => prev.map(t => t.id === id ? { ...t, isNew: false } : t))
        }, 1400)
    }, [tasks.length])

    // Edit actions
    const handleSave = useCallback((updated: Task) => {
        setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
        setEditingTaskId(null)
    }, [])

    const handleComplete = useCallback(() => {
        setTasks(prev => prev.filter(t => t.id !== editingTaskId))
        setEditingTaskId(null)
    }, [editingTaskId])

    // Compute the viewport coords of the balloon knot so the modal
    // can unfold from the right spot
    const getEditOrigin = () => {
        if (!editingTask || !pageRef.current) return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
        const idx = tasks.findIndex(t => t.id === editingTaskId)
        const pos = positionsRef.current.get(editingTask.id)
        if (!pos || idx < 0) return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
        const pR = pageRef.current.getBoundingClientRect()
        const { scale } = getBalloonPosition(idx, tasks.length)
        const knotX = layout.areaCenterX + pos.x + pR.left
        const knotY = layout.areaBottomY + pos.y - (SVG_H - KNOT_Y_IN_SVG) * scale + pR.top
        return { x: knotX, y: knotY }
    }

    const editOrigin = getEditOrigin()

    return (
        <div ref={pageRef} className="flex-1 flex flex-col items-center justify-end relative">

            {/* Full-page SVG string overlay */}
            <svg
                className="absolute top-0 left-0 pointer-events-none"
                width="100%" height="100%"
                style={{ overflow: 'visible', zIndex: 5 }}
            >
                {tasks.map((task, i) => {
                    const pos = positionsRef.current.get(task.id)
                    if (!pos) return null
                    const { scale } = getBalloonPosition(i, tasks.length)
                    const knotX = layout.areaCenterX + pos.x
                    const knotY = layout.areaBottomY + pos.y - (SVG_H - KNOT_Y_IN_SVG) * scale
                    if (knotY >= layout.areaBottomY) return null

                    const wobble = (seeded(i + 13) - 0.5) * 10
                    const cpX = knotX + (layout.buttonX - knotX) * 0.45 + wobble
                    const cpY = knotY + (layout.buttonY - knotY) * 0.60

                    return (
                        <path
                            key={`string-${task.id}`}
                            d={`M ${knotX} ${knotY} Q ${cpX} ${cpY}, ${layout.buttonX} ${layout.buttonY}`}
                            stroke="#888" strokeWidth="1" fill="none" opacity="0.55"
                        />
                    )
                })}
            </svg>

            {/* Empty state */}
            <AnimatePresence>
                {tasks.length === 0 && (
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{ zIndex: 1 }}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                    >
                        <p className="text-gray-300 dark:text-gray-600 text-sm font-medium tracking-wide">
                            tap + to float a task
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Balloon area */}
            <div className="relative w-full flex-1 flex items-end justify-center" style={{ zIndex: 10 }}>
                <div
                    ref={balloonAreaRef}
                    className="relative"
                    style={{ width: '600px', height: '100%' }}
                >
                    {tasks.map((task, i) => (
                        <TaskBalloon
                            key={task.id}
                            text={task.text}
                            color={task.color}
                            index={i}
                            isNew={task.isNew}
                            total={tasks.length}
                            hoveredIndex={hoveredIndex}
                            onHoverStart={() => setHoveredIndex(i)}
                            onHoverEnd={() => setHoveredIndex(null)}
                            onClick={() => setEditingTaskId(task.id)}
                            isEditing={editingTaskId === task.id}
                            isBlurred={editingTaskId !== null && editingTaskId !== task.id}
                            onPositionUpdate={handlePositionUpdate(task.id)}
                        />
                    ))}
                </div>
            </div>

            {/* "+" Button */}
            <div className="pb-10 pt-2 relative" style={{ zIndex: 20 }}>
                <motion.button
                    ref={buttonRef}
                    onClick={() => setShowCreator(true)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-16 h-16 rounded-full bg-white/80 dark:bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/10 border border-white/60 dark:border-white/10 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 transition-shadow cursor-pointer group"
                    aria-label="Add new task"
                >
                    <svg
                        width="28" height="28" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="transition-transform group-hover:rotate-90"
                    >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </motion.button>
            </div>

            {/* Creator modal */}
            <AnimatePresence>
                {showCreator && (
                    <TaskCreatorModal
                        onDone={handleDone}
                        onCancel={() => setShowCreator(false)}
                    />
                )}
            </AnimatePresence>

            {/* Edit modal */}
            <AnimatePresence>
                {editingTask && (
                    <TaskEditModal
                        key={editingTask.id}
                        task={editingTask}
                        onSave={handleSave}
                        onComplete={handleComplete}
                        onCancel={() => setEditingTaskId(null)}
                        originX={editOrigin.x - (window.innerWidth / 2)}
                        originY={editOrigin.y - (window.innerHeight / 2)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
