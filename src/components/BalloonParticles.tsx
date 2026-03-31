import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

interface FragmentsProps {
    color: string
    startX: number
    startY: number
}

function sr(seed: number) {
    const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453
    return s - Math.floor(s)
}

const CONFETTI_COLORS = [
    '#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCB77',
    '#A855F7', '#F97316', '#3B82F6', '#EC4899', '#FFFFFF'
]

export default function BalloonParticles({ color, startX, startY }: FragmentsProps) {
    const [visible, setVisible] = useState(true)

    // Max particle lifetime is 3.0s + max delay 0.04s — hide after that
    useEffect(() => {
        const timer = setTimeout(() => setVisible(false), 3100)
        return () => clearTimeout(timer)
    }, [])

    // Stable per-mount particle data — no useEffect setState lag
    const fragments = useMemo(() => {
        const count = 36
        return Array.from({ length: count }).map((_, i) => {
            // Radial burst angle — full 360°
            const angle = (i / count) * Math.PI * 2 + sr(i * 3) * 0.4
            // Each piece gets a random launch speed
            const speed = 60 + sr(i * 7) * 110

            const vx = Math.cos(angle) * speed
            // Bias upward: sin gives -1 at top, so multiply upward bias
            const vy = Math.sin(angle) * speed - sr(i * 9) * 40

            // Color: mostly rainbow, occasionally original balloon color
            const pieceColor = sr(i * 22) > 0.25
                ? CONFETTI_COLORS[Math.floor(sr(i * 33) * CONFETTI_COLORS.length)]
                : color

            // Shape variety
            const shapeRoll = sr(i * 77)
            const baseSize = 6 + sr(i * 14) * 6
            const w = shapeRoll > 0.6 ? baseSize * 2 : baseSize
            const h = shapeRoll < 0.4 ? baseSize * 2 : baseSize

            // 2D spin only — GPU-composited, zero lag
            const spinDir = sr(i * 5) > 0.5 ? 1 : -1
            const spinAmount = (180 + sr(i * 18) * 360) * spinDir

            // Staggered per-particle fade — pieces disappear at different times
            const lifetime = 1.6 + sr(i * 15) * 1.4   // 1.6 → 3.0 s
            const fadeStart = 0.45 + sr(i * 31) * 0.3  // fade begins 45–75% through life

            return { vx, vy, pieceColor, w, h, spinAmount, lifetime, fadeStart, delay: sr(i) * 0.04 }
        })
    }, [color])

    if (!visible) return null

    return (
        <div
            className="fixed pointer-events-none"
            style={{ left: startX, top: startY - 60, zIndex: 9999 }}
        >
            {fragments.map((f, i) => {
                // Gravity: final Y = launch + gravity pull (positive = down)
                const gravity = 180 + sr(i * 8) * 100
                const x2 = f.vx
                const y2 = f.vy
                const x3 = f.vx + (sr(i * 2) - 0.5) * 30  // slight horizontal drift
                const y3 = f.vy + gravity

                return (
                    <motion.div
                        key={i}
                        style={{
                            position: 'absolute',
                            width: f.w,
                            height: f.h,
                            marginLeft: -f.w / 2,
                            marginTop: -f.h / 2,
                            background: f.pieceColor,
                            borderRadius: '2px',
                            willChange: 'transform, opacity',
                        }}
                        initial={{ x: 0, y: 0, rotate: 0, opacity: 0, scale: 0 }}
                        animate={{
                            x: [0, x2, x3],
                            y: [0, y2, y3],
                            rotate: [0, f.spinAmount],
                            // Per-particle fade: each piece has its own opacity curve
                            opacity: [0, 1, 1, f.fadeStart > 0.6 ? 0.6 : 0.3, 0],
                            scale: [0, 1.1, 1, 0.8, 0.4],
                        }}
                        transition={{
                            duration: f.lifetime,
                            delay: f.delay,
                            // x, y use a custom arc: quick burst, slow drift
                            ease: ['easeOut', 'linear'],
                            times: [0, 0.12, 1],
                            opacity: {
                                duration: f.lifetime,
                                delay: f.delay,
                                times: [0, 0.08, f.fadeStart, f.fadeStart + 0.2, 1],
                                ease: 'linear',
                            },
                            scale: {
                                duration: f.lifetime,
                                delay: f.delay,
                                times: [0, 0.08, 0.3, 0.7, 1],
                                ease: 'easeOut',
                            },
                            rotate: {
                                duration: f.lifetime,
                                delay: f.delay,
                                ease: 'linear',
                            },
                        }}
                    />
                )
            })}
        </div>
    )
}


