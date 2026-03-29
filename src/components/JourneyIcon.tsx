import { motion } from 'framer-motion'

interface JourneyIconProps {
  onClick: () => void
  isActive: boolean
}

export default function JourneyIcon({ onClick, isActive }: JourneyIconProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg ${
        isActive 
          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white ring-4 ring-purple-500/20' 
          : 'bg-white/80 dark:bg-white/5 backdrop-blur-md text-indigo-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-gray-100 border border-black/5 dark:border-white/10'
      }`}
      aria-label="Journey View"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
      {/* Dynamic Glow Pulse when near "Review Time" (e.g. 7PM) */}
      <motion.div 
        className="absolute inset-0 rounded-full bg-indigo-500/20 -z-10"
        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.button>
  )
}
