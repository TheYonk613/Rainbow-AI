import { motion } from 'framer-motion'
import { SVG_W, SVG_H } from './TaskBalloon'

interface MigratingTextProps {
    text: string
    startX: number
    startY: number
    targetX: number
    targetY: number
    onComplete: () => void
}

export default function MigratingText({ text, startX, startY, targetX, targetY, onComplete }: MigratingTextProps) {
    // Using a custom framer-motion path animation (cubic bezier)
    // To avoid needing SVG paths or complex useAnimationFrame, we can use 
    // framer-motion's keyframes for x/y to simulate a bezier curve.

    // The control point for the swoop (pulls the flight upward so it arcs)
    // Distance between start and target
    const midX = (startX + targetX) / 2
    // Make cpY significantly higher than both (unless target is already much higher)
    const cpY = Math.min(startY, targetY) - 200

    // Flight duration
    const DURATION = 1.2
    // We want to ease out strongly at the end to simulate air resistance
    const EASE_OUT = [0.15, 0.85, 0.3, 1] as const

    const displayText = text.length > 26 ? text.slice(0, 24) + '…' : text

    return (
        <motion.div
            className="fixed pointer-events-none"
            style={{
                left: 0,
                top: 0,
                width: SVG_W,
                height: SVG_H,
                zIndex: 500, // Highest layer
            }}
            initial={{
                x: startX,
                y: startY,
                opacity: 0.95,
                scale: 1
            }}
            animate={{
                // We simulate the curve by passing a 3-step array. 
                // Spring keyframes aren't well supported for paths, so we use specific times.
                x: [startX, midX, targetX],
                y: [startY, cpY, targetY],
                scale: [1, 1.1, 0.6],
                opacity: [0.95, 0.85, 0]
            }}
            transition={{
                duration: DURATION,
                times: [0, 0.4, 1], // The control point is hit early in the flight
                ease: EASE_OUT,
            }}
            onAnimationComplete={onComplete}
        >
            {/* Box mirroring the original balloon's text box */}
            <div
                style={{
                    marginLeft: -(SVG_W / 2),
                    position: 'absolute',
                    left: '50%',
                    bottom: '0px',
                    width: '100%',
                    height: '100%',
                }}
            >
                <svg
                    width={SVG_W} height={SVG_H}
                    viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                    fill="none" xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Only the text, NO balloon shapes */}
                    <foreignObject x="14" y="32" width="92" height="72">
                        <div style={{
                            width: '100%', height: '100%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            textAlign: 'center', fontSize: '11px', fontWeight: 700,
                            color: 'rgba(255,255,255,0.95)', lineHeight: '1.3',
                            padding: '4px', overflow: 'hidden', wordBreak: 'break-word',
                            textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        }}>
                            {displayText}
                        </div>
                    </foreignObject>
                </svg>
            </div>
        </motion.div>
    )
}
