import { useEffect, useMemo } from 'react'
import type { TimeFormat } from '../types'
import { hourToAngle, arcPath, degToRad, formatMarker, computeAngleOffset } from '../utils'

interface SettingsProps {
  activeStart: number
  activeEnd: number
  timeFormat: TimeFormat
  onActiveStartChange: (h: number) => void
  onActiveEndChange: (h: number) => void
  onTimeFormatChange: (f: TimeFormat) => void
  onClose: () => void
}

// Mini ring constants
const MINI_SIZE = 140
const MINI_CX = MINI_SIZE / 2
const MINI_CY = MINI_SIZE / 2
const MINI_R = 50
const MINI_THICK = 14
const MINI_SLEEP = 6

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i)

export default function Settings({
  activeStart,
  activeEnd,
  timeFormat,
  onActiveStartChange,
  onActiveEndChange,
  onTimeFormatChange,
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

  // Mini ring markers at 0, 6, 12, 18
  const miniMarkers = useMemo(() => {
    return [0, 6, 12, 18].map((h) => {
      const angle = hourToAngle(h, miniOffset)
      const rad = degToRad(angle)
      const labelR = MINI_R + MINI_THICK / 2 + 12
      return {
        h,
        x: MINI_CX + labelR * Math.cos(rad),
        y: MINI_CY + labelR * Math.sin(rad),
      }
    })
  }, [miniOffset])

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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/8 settings-backdrop"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 settings-sheet">
        <div className="bg-white/95 backdrop-blur-xl rounded-t-3xl shadow-2xl shadow-black/10 border-t border-gray-100 max-w-lg mx-auto">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          <div className="px-6 pb-8 pt-2 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-700">Settings</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
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
                  stroke="rgba(0,0,0,0.04)"
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
                    fill="rgba(0,0,0,0.2)"
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
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Active Hours
              </label>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-gray-400">Wake</span>
                  <select
                    value={activeStart}
                    onChange={(e) => onActiveStartChange(Number(e.target.value))}
                    className="w-full py-2.5 px-3 bg-gray-50 rounded-xl border-none text-sm font-mono text-gray-700 outline-none focus:ring-2 focus:ring-gray-200 appearance-none cursor-pointer"
                  >
                    {HOUR_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {formatHour(h)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-gray-400">Sleep</span>
                  <select
                    value={activeEnd}
                    onChange={(e) => onActiveEndChange(Number(e.target.value))}
                    className="w-full py-2.5 px-3 bg-gray-50 rounded-xl border-none text-sm font-mono text-gray-700 outline-none focus:ring-2 focus:ring-gray-200 appearance-none cursor-pointer"
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

            {/* Time format toggle */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Time Format
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => onTimeFormatChange('24h')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium font-mono transition-all ${
                    timeFormat === '24h'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  24h
                </button>
                <button
                  onClick={() => onTimeFormatChange('12h')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium font-mono transition-all ${
                    timeFormat === '12h'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  12h
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
