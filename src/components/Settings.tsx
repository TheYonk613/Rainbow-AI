import { useEffect, useMemo } from 'react'
import { motion, type PanInfo } from 'framer-motion'
import type { TimeFormat } from '../types'
import { hourToAngle, arcPath, degToRad, formatMarker, computeAngleOffset } from '../utils'

interface SettingsProps {
  activeStart: number
  activeEnd: number
  timeFormat: TimeFormat
  allowOverlap: boolean
  onActiveStartChange: (h: number) => void
  onActiveEndChange: (h: number) => void
  onTimeFormatChange: (f: TimeFormat) => void
  onAllowOverlapChange: (v: boolean) => void
  onClose: () => void
}

// Mini ring constants
const MINI_SIZE = 180 // Increased to prevent clipping
const MINI_CX = MINI_SIZE / 2
const MINI_CY = MINI_SIZE / 2
const MINI_R = 55
const MINI_THICK = 16
const MINI_SLEEP = 8

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i)

export default function Settings({
  activeStart,
  activeEnd,
  timeFormat,
  allowOverlap,
  onActiveStartChange,
  onActiveEndChange,
  onTimeFormatChange,
  onAllowOverlapChange,
  onClose,
}: SettingsProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const miniOffset = useMemo(
    () => computeAngleOffset(activeStart, activeEnd),
    [activeStart, activeEnd]
  )

  // Mini ring arcs
  const { miniActiveArc, miniSleepArc } = useMemo(() => {
    const aStart = hourToAngle(activeStart, miniOffset)
    let aEnd = hourToAngle(activeEnd === 0 ? 24 : activeEnd, miniOffset)
    if (aEnd <= aStart) aEnd += 360

    const sStart = aEnd
    const sEnd = aStart + 360

    return {
      miniActiveArc: arcPath(MINI_CX, MINI_CY, MINI_R, aStart, aEnd),
      miniSleepArc: arcPath(MINI_CX, MINI_CY, MINI_R, sStart, sEnd),
    }
  }, [activeStart, activeEnd, miniOffset])

  // Mini ring markers at 0, 3, 6, 9, 12, 15, 18, 21
  const miniMarkers = useMemo(() => {
    return [0, 3, 6, 9, 12, 15, 18, 21].map((h) => {
      const angle = hourToAngle(h, miniOffset)
      const rad = degToRad(angle)
      const labelR = MINI_R + MINI_THICK / 2 + 18
      return {
        h,
        x: MINI_CX + labelR * Math.cos(rad),
        y: MINI_CY + labelR * Math.sin(rad),
      }
    })
  }, [miniOffset, timeFormat])

  // Boundary dots on mini ring
  const startDot = useMemo(() => {
    const angle = hourToAngle(activeStart, miniOffset)
    const rad = degToRad(angle)
    return { x: MINI_CX + MINI_R * Math.cos(rad), y: MINI_CY + MINI_R * Math.sin(rad) }
  }, [activeStart, miniOffset])

  const endDot = useMemo(() => {
    const angle = hourToAngle(activeEnd === 0 ? 24 : activeEnd, miniOffset)
    const rad = degToRad(angle)
    return { x: MINI_CX + MINI_R * Math.cos(rad), y: MINI_CY + MINI_R * Math.sin(rad) }
  }, [activeEnd, miniOffset])

  const formatHour = (h: number) => {
    if (timeFormat === '24h') {
      return `${h.toString().padStart(2, '0')}:00`
    }
    if (h === 0) return '12:00 AM'
    if (h === 12) return '12:00 PM'
    return h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`
  }

  const handleDragEnd = (_: any, info: PanInfo) => {
    // Slightly more intentional threshold for buttery feel
    if (info.offset.y > 60 || info.velocity.y > 350) {
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-40 bg-black/8 dark:bg-black/40 backdrop-blur-[2px] settings-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 settings-sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{
          y: "100%",
          opacity: 0.9,
          transition: {
            type: "spring",
            damping: 40,
            stiffness: 260,
            mass: 1.2,
            velocity: 2
          }
        }}
        transition={{
          type: "spring",
          damping: 35,
          stiffness: 280,
          mass: 1.2,
          restDelta: 0.1
        }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }} // "Heavy" high-quality resistance
        onDragEnd={handleDragEnd}
      >
        <div
          className="bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-xl rounded-t-[32px] shadow-2xl shadow-black/20 border-t border-gray-100 dark:border-white/5 max-w-lg mx-auto overflow-hidden pb-safe"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-5">
            <div className="w-12 h-1.5 rounded-full bg-black/10 dark:bg-white/10" />
          </div>

          <div className="px-6 pb-8 pt-2 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-700 dark:text-white">Settings</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 1l12 12M13 1L1 13" />
                </svg>
              </button>
            </div>

            {/* Mini ring preview */}
            <div className="flex justify-center">
              <svg viewBox={`0 0 ${MINI_SIZE} ${MINI_SIZE}`} width={MINI_SIZE} height={MINI_SIZE}>
                {/* Sleep arc */}
                <path
                  d={miniSleepArc}
                  fill="none"
                  stroke="currentColor"
                  className="text-black/5 dark:text-white/5"
                  strokeWidth={MINI_SLEEP}
                  strokeLinecap="round"
                />
                {/* Active arc */}
                <path
                  d={miniActiveArc}
                  fill="none"
                  stroke="url(#miniGrad)"
                  strokeWidth={MINI_THICK}
                  strokeLinecap="round"
                  opacity={0.7}
                />
                {/* Gradient */}
                <defs>
                  <linearGradient id="miniGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#E07B6C" />
                    <stop offset="50%" stopColor="#8B8FD8" />
                    <stop offset="100%" stopColor="#8BA89A" />
                  </linearGradient>
                </defs>
                {/* Boundary dots */}
                <circle cx={startDot.x} cy={startDot.y} r={4} fill="white" stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
                <circle cx={endDot.x} cy={endDot.y} r={4} fill="white" stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
                {/* Markers */}
                {miniMarkers.map(({ h, x, y }) => (
                  <text
                    key={h}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="currentColor"
                    className="text-black/20 dark:text-white/30"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    {formatMarker(h, timeFormat)}
                  </text>
                ))}
              </svg>
            </div>

            {/* Active hours pickers */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Active Hours
              </label>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-gray-400 dark:text-gray-500">Wake</span>
                  <select
                    value={activeStart}
                    onChange={(e) => onActiveStartChange(Number(e.target.value))}
                    className="w-full py-2.5 px-3 bg-gray-50 dark:bg-white/5 rounded-xl border-none text-sm font-mono text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-white/10 appearance-none cursor-pointer"
                  >
                    {HOUR_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {formatHour(h)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-gray-400 dark:text-gray-500">Sleep</span>
                  <select
                    value={activeEnd}
                    onChange={(e) => onActiveEndChange(Number(e.target.value))}
                    className="w-full py-2.5 px-3 bg-gray-50 dark:bg-white/5 rounded-xl border-none text-sm font-mono text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-white/10 appearance-none cursor-pointer"
                  >
                    {HOUR_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {formatHour(h)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bubble overlap toggle */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Bubble Behaviour
              </label>
              <div
                className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-white/5 rounded-xl cursor-pointer"
                onClick={() => onAllowOverlapChange(!allowOverlap)}
              >
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Allow overlap</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {allowOverlap ? 'Bubbles can freely cross each other' : 'Bubbles snap to their neighbours'}
                  </div>
                </div>
                {/* Toggle pill */}
                <div
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${allowOverlap ? 'bg-gray-800 dark:bg-white/20' : 'bg-gray-200 dark:bg-white/10'
                    }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${allowOverlap ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </div>
              </div>
            </div>

            {/* Time format toggle */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Time Format
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => onTimeFormatChange('24h')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium font-mono transition-all ${timeFormat === '24h'
                    ? 'bg-gray-800 dark:bg-white/20 text-white'
                    : 'bg-gray-50 dark:bg-white/5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                >
                  24h
                </button>
                <button
                  onClick={() => onTimeFormatChange('12h')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium font-mono transition-all ${timeFormat === '12h'
                    ? 'bg-gray-800 dark:bg-white/20 text-white'
                    : 'bg-gray-50 dark:bg-white/5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                >
                  12h
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}
