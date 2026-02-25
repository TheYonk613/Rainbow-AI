import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TaskBalloon, { getBalloonPosition, KNOT_Y_IN_SVG, SVG_H } from './TaskBalloon'
import TaskCreatorModal from './TaskCreatorModal'

interface Task {
    id: string
    text: string
    color: string
    isNew: boolean
}

const BALLOON_COLORS = [
    '#E8A0BF', '#B5B8F0', '#A8D5BA', '#F2C69D', '#A0D2DB', '#F4B8C1',
]

// Deterministic pseudo-random (same seed as TaskBalloon)
function seeded(i: number) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453
    return s - Math.floor(s)
}

let nextId = 1

interface BalloonPos { x: number; y: number }

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [showCreator, setShowCreator] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const [containerH, setContainerH] = useState(600)

    // Measure container height for SVG coordinate space
    useEffect(() => {
        const measure = () => {
            if (containerRef.current) setContainerH(containerRef.current.clientHeight)
        }
        measure()
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
    }, [])

    // Live balloon positions (updated every frame during spring)
    const positionsRef = useRef<Map<string, BalloonPos>>(new Map())
    const [, forceUpdate] = useState(0)
    const rafRef = useRef<number | null>(null)

    const scheduleDraw = useCallback(() => {
        if (rafRef.current) return
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null
            forceUpdate((n) => n + 1)
        })
    }, [])

    const handlePositionUpdate = useCallback(
        (taskId: string) => (x: number, y: number) => {
            positionsRef.current.set(taskId, { x, y })
            scheduleDraw()
        },
        [scheduleDraw]
    )

    const handleDone = useCallback((text: string) => {
        const newTask: Task = {
            id: `task-${nextId++}`,
            text,
            color: BALLOON_COLORS[(nextId - 2) % BALLOON_COLORS.length],
            isNew: true,
        }
        setTasks((prev) => [...prev, newTask])
        setShowCreator(false)

        setTimeout(() => {
            setTasks((prev) =>
                prev.map((t) => (t.id === newTask.id ? { ...t, isNew: false } : t))
            )
        }, 1200)
    }, [])

    const centerX = 300

    return (
        <div className="flex-1 flex flex-col items-center justify-end relative overflow-hidden">
            {/* Empty state */}
            <AnimatePresence>
                {tasks.length === 0 && (
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                    >
                        <p className="text-gray-300 text-sm font-medium tracking-wide">
                            tap + to float a task
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Balloon area */}
            <div className="relative w-full flex-1 flex items-end justify-center">
                <div ref={containerRef} className="relative" style={{ width: '600px', height: '100%' }}>

                    {/* Strings — SVG overlay tracking live balloon positions */}
                    <svg
                        className="absolute top-0 left-0 pointer-events-none"
                        width="600"
                        height={containerH}
                        viewBox={`0 0 600 ${containerH}`}
                        style={{ overflow: 'visible' }}
                    >
                        {tasks.map((task, i) => {
                            const pos = positionsRef.current.get(task.id)
                            if (!pos) return null

                            const { scale } = getBalloonPosition(i, tasks.length)

                            // Knot position in the container's SVG coordinate space
                            const knotX = centerX + pos.x
                            const knotYFromBottom = -pos.y - (SVG_H - KNOT_Y_IN_SVG) * scale
                            const knotSvgY = containerH - knotYFromBottom

                            // Button at bottom center
                            const buttonSvgX = centerX
                            const buttonSvgY = containerH

                            if (knotYFromBottom <= 5) return null

                            // Gentle curve control point
                            const curveWobble = (seeded(i + 13) - 0.5) * 30
                            const cpX = (knotX + buttonSvgX) / 2 + curveWobble
                            const cpY = knotSvgY + (buttonSvgY - knotSvgY) * 0.65

                            return (
                                <path
                                    key={`string-${task.id}`}
                                    d={`M ${knotX} ${knotSvgY} Q ${cpX} ${cpY}, ${buttonSvgX} ${buttonSvgY}`}
                                    stroke="#999"
                                    strokeWidth="1.5"
                                    fill="none"
                                    opacity="0.7"
                                />
                            )
                        })}
                    </svg>

                    {/* Balloons */}
                    {tasks.map((task, i) => (
                        <TaskBalloon
                            key={task.id}
                            text={task.text}
                            color={task.color}
                            index={i}
                            isNew={task.isNew}
                            total={tasks.length}
                            onPositionUpdate={handlePositionUpdate(task.id)}
                        />
                    ))}
                </div>
            </div>

            {/* "+" Button — anchored bottom center */}
            <div className="pb-10 pt-2 relative z-20">
                <motion.button
                    onClick={() => {
                        setShowCreator(true)
                        console.log('User opened task creator')
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-16 h-16 rounded-full bg-white/80 backdrop-blur-xl shadow-2xl shadow-black/10 border border-white/60 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:shadow-purple-200/40 transition-shadow cursor-pointer group"
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
        </div>
    )
}
