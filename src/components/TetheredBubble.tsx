import { motion } from 'framer-motion'
import { ReactNode, useEffect, useState } from 'react'

interface TetheredBubbleProps {
  anchorX: number
  anchorY: number
  color: string
  children: ReactNode
  onClickOutside: () => void
}

export default function TetheredBubble({
  anchorX,
  anchorY,
  color,
  children,
  onClickOutside,
}: TetheredBubbleProps) {
  // Use absolute fixed position for the bubble center
  const [windowPos, setWindowPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    // We want the bubble to be centered in the viewport or at some relation to the anchor
    // For now, let's center it near the wheel
    setWindowPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  }, [])

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <div className="absolute inset-0 bg-black/10 dark:bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={onClickOutside} />
      
      {/* SVG Tether Line */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        <motion.line
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "anticipate" }}
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
          initial={{ r: 0 }}
          animate={{ r: 6 }}
          transition={{ delay: 0.3 }}
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
          width: '320px',
          height: '320px',
        }}
        className="absolute pointer-events-auto"
      >
        <div className="bubble-shell" style={{ 
          '--bubble-color': color.startsWith('g') ? `var(--${color}-mid)` : color,
          '--bubble-gradient': color.startsWith('g') ? `linear-gradient(135deg, var(--${color}-start), var(--${color}-end))` : color
        } as any}>
          {children}
        </div>
      </motion.div>
    </div>
  )
}
