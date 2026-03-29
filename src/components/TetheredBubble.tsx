import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface TetheredBubbleProps {
  anchorX: number
  anchorY: number
  centerX: number
  centerY: number
  color: string
  children: ReactNode
  onClickOutside: () => void
}

export default function TetheredBubble({
  anchorX,
  anchorY,
  centerX,
  centerY,
  color,
  children,
  onClickOutside,
}: TetheredBubbleProps) {
  // Use the passed center coordinates for exact alignment
  const windowPos = { x: centerX, y: centerY }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <motion.div 
        className="absolute inset-0 bg-black/10 dark:bg-black/40 backdrop-blur-sm pointer-events-auto" 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClickOutside} 
      />
      
      {/* SVG Tether Line */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        <motion.line
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          exit={{ pathLength: 0, opacity: 0 }}
          transition={{ duration: 0.45, ease: "anticipate" }}
          x1={anchorX}
          y1={anchorY}
          x2={windowPos.x}
          y2={windowPos.y}
          stroke={color.startsWith('g') ? `var(--${color}-mid)` : color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="5 10"
        />
        <motion.circle
          initial={{ r: 0, opacity: 0 }}
          animate={{ r: 6, opacity: 1 }}
          exit={{ r: 0, opacity: 0 }}
          transition={{ delay: 0.1 }}
          cx={anchorX}
          cy={anchorY}
          fill={color.startsWith('g') ? `var(--${color}-mid)` : color}
        />
      </svg>

      <motion.div
        initial={{ scale: 0, x: '-50%', y: '-50%', opacity: 0 }}
        animate={{ scale: 1, x: '-50%', y: '-50%', opacity: 1 }}
        exit={{ scale: 0, x: '-50%', y: '-50%', opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
        style={{
          left: windowPos.x,
          top: windowPos.y,
          width: '260px',
          height: '260px',
        }}
        className="absolute pointer-events-auto"
      >
        <div className="bubble-shell w-full h-full rounded-full flex flex-col items-center justify-center p-4 relative" style={{ 
          '--bubble-color': color.startsWith('g') ? `var(--${color}-mid)` : color,
          border: `2px solid ${color.startsWith('g') ? `var(--${color}-mid)` : color}`,
          boxShadow: `inset 0 0 20px ${color.startsWith('g') ? `var(--${color}-mid)` : color}30, 0 20px 60px rgba(0, 0, 0, 0.15)`
        } as any}>
          {children}
        </div>
      </motion.div>
    </div>
  )
}
