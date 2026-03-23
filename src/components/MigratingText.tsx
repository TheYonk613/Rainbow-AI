import { motion } from 'framer-motion'

interface MigratingTextProps {
    text: string
    startX: number
    startY: number
    onComplete: () => void
}

export default function MigratingText({ text, startX, startY, onComplete }: MigratingTextProps) {
    // We want the token to always go to the bottom right corner of the window.
    // If targetX/Y are passed (from previous implementation), we can override them or use them if they match.
    // Let's explicitly calculate the bottom right corner here to be safe and precise.
    const finalX = window.innerWidth - 60
    const finalY = window.innerHeight - 60

    // The control point for the swoop (pulls the flight upward so it arcs)
    const midX = (startX + finalX) / 2
    // Make cpY significantly higher so it jumps up before falling
    const cpY = Math.min(startY, finalY) - 150

    // Flight duration
    const DURATION = 1.0

    const displayText = text.length > 20 ? text.slice(0, 18) + '…' : text

    return (
        <motion.div
            className="fixed pointer-events-none flex items-center justify-center font-bold text-[11px]"
            style={{
                left: 0,
                top: 0,
                // Center the token on the starting coordinates initially
                marginLeft: -50,
                marginTop: -15,
                width: 100, // Token width
                height: 30, // Token height
                backgroundColor: 'var(--text-color)', // Inverse color based on theme
                color: 'var(--bg-color)',
                borderRadius: '15px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 500,
            }}
            initial={{
                x: startX,
                y: startY,
                opacity: 0,
                scale: 0.5
            }}
            animate={{
                // Start at balloon, jump up, fall to corner
                x: [startX, midX, finalX],
                y: [startY, cpY, finalY],
                scale: [0.5, 1.2, 0.2], // Grow then shrink to tiny dot
                opacity: [0, 1, 0] // Fade in quickly, then fade out at end
            }}
            transition={{
                duration: DURATION,
                times: [0, 0.3, 1], // Hit the peak early
                ease: ["easeOut", "easeInOut"], // Fast jump, smooth fall
            }}
            onAnimationComplete={onComplete}
        >
            <span className="truncate px-3">{displayText}</span>
        </motion.div>
    )
}
