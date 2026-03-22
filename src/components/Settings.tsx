import { useEffect } from 'react'
import { motion, type PanInfo } from 'framer-motion'
import type { TimeFormat } from '../types'
import { TIMEZONES } from '../constants'

interface SettingsProps {
  timeFormat: TimeFormat
  timeZone: string
  markerResolution: 'minimal' | 'standard' | 'chronograph' | 'technical'
  onTimeFormatChange: (f: TimeFormat) => void
  onTimeZoneChange: (tz: string) => void
  onMarkerResolutionChange: (res: 'minimal' | 'standard' | 'chronograph' | 'technical') => void
  onClose: () => void
}

export default function Settings({
  timeFormat,
  timeZone,
  markerResolution,
  onTimeFormatChange,
  onTimeZoneChange,
  onMarkerResolutionChange,
  onClose,
}: SettingsProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleDragEnd = (_: any, info: PanInfo) => {
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
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={handleDragEnd}
        onClick={onClose}
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

            {/* Time format toggle */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Time Format
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => onTimeFormatChange('24h')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium font-mono transition-all ${timeFormat === '24h'
                    ? 'bg-slate-900 dark:bg-white/20 text-white shadow-md'
                    : 'bg-gray-200 dark:bg-white/5 text-gray-500 hover:bg-gray-300 dark:hover:bg-white/10'
                    }`}
                >
                  24h
                </button>
                <button
                  onClick={() => onTimeFormatChange('12h')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium font-mono transition-all ${timeFormat === '12h'
                    ? 'bg-slate-900 dark:bg-white/20 text-white shadow-md'
                    : 'bg-gray-200 dark:bg-white/5 text-gray-500 hover:bg-gray-300 dark:hover:bg-white/10'
                    }`}
                >
                  12h
                </button>
              </div>
            </div>

            {/* Time zone picker */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Time Zone
              </label>
              <div className="relative">
                <select
                  value={timeZone}
                  onChange={(e) => onTimeZoneChange(e.target.value)}
                  className="w-full appearance-none py-2.5 px-4 rounded-xl text-sm font-medium transition-all bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 outline-none border border-transparent focus:border-gray-200 dark:focus:border-white/10"
                >
                  {Array.from(new Set(TIMEZONES.map(t => t.group))).map(group => (
                    <optgroup key={group} label={group} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold">
                      {TIMEZONES.filter(t => t.group === group).map(tz => (
                        <option key={tz.id} value={tz.id} className="font-medium text-gray-800 dark:text-gray-200">
                          {tz.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 5l4 4 4-4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Wheel Detail (Resolution) */}
            <div className="space-y-3 pb-4">
              <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Wheel Detail
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['minimal', 'standard', 'chronograph', 'technical'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onMarkerResolutionChange(mode)}
                    className={`py-2 px-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${
                      markerResolution === mode
                        ? 'bg-slate-900 dark:bg-white/20 text-white shadow-md'
                        : 'bg-gray-200 dark:bg-white/5 text-gray-500 hover:bg-gray-300 dark:hover:bg-white/10'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}
