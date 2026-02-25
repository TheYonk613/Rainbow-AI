import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect, useMemo } from 'react'

interface TaskBalloonProps {
    text: string
    color: string
    index: number
    isNew: boolean
    total: number
    /** Callback reporting (x, y) offset from button center every frame */
    onPositionUpdate?: (x: number, y: number) => void
}

// Deterministic pseudo-random from index for organic placement
function seeded(i: number) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453
    return s - Math.floor(s)
}

// Pastel balloon palette
const BALLOON_COLORS = [
    { fill: '#E8A0BF', stroke: '#D47FA6' },   // pink
    { fill: '#B5B8F0', stroke: '#9496D8' },   // lavender
    { fill: '#A8D5BA', stroke: '#82B898' },   // sage
    { fill: '#F2C69D', stroke: '#DBA46F' },   // apricot
    { fill: '#A0D2DB', stroke: '#73B5C2' },   // sky
    { fill: '#F4B8C1', stroke: '#E08E9D' },   // rose
]

/**
 * Calculates the balloon's final resting position (offsets from button center).
 */
export function getBalloonPosition(index: number, total: number) {
    const spread = Math.min(total, 8)
    const centerOffset = index - (spread - 1) / 2
    // Wide horizontal fan — ~110px per balloon (balloon is ~96px wide)
    const xShift = centerOffset * 110 + (seeded(index) - 0.5) * 16
    // Gentle vertical stagger — slight height variation, outer balloons a bit higher
    const yShift = -(180 + (seeded(index + 3) * 50) + Math.abs(centerOffset) * 20)
    const scale = 0.9 + seeded(index + 2) * 0.15
    return { xShift, yShift, scale }
}

// Balloon SVG dimensions
const SVG_W = 120
const SVG_H = 160
const KNOT_Y_IN_SVG = 137  // knot triangle tip in SVG coords

export default function TaskBalloon({
    text, color, index, isNew, total, onPositionUpdate,
}: TaskBalloonProps) {
    const { xShift, yShift, scale } = getBalloonPosition(index, total)
    const balloonColor = BALLOON_COLORS[index % BALLOON_COLORS.length]

    // ── Spring-driven rise ──────────────────────────────────
    // progress: 0 = at button, 1 = at final resting position
    const springProgress = useSpring(0, {
        stiffness: 120,
        damping: 14,
        mass: 0.8,
    })

    useEffect(() => {
        if (isNew) {
            springProgress.set(0)
            requestAnimationFrame(() => springProgress.set(1))
        } else {
            springProgress.jump(1)
        }
    }, [isNew, springProgress])

    // Map spring 0→1 to actual pixel offsets
    const translateX = useTransform(springProgress, [0, 1], [0, xShift])
    const translateY = useTransform(springProgress, [0, 1], [0, yShift])
    const scaleVal = useTransform(springProgress, [0, 1], [0.3, scale])
    const opacity = useTransform(springProgress, [0, 0.15, 1], [0, 1, 1])

    // Report position every frame for string drawing
    useEffect(() => {
        if (!onPositionUpdate) return
        const unsubX = translateX.on('change', () => {
            onPositionUpdate(translateX.get(), translateY.get())
        })
        const unsubY = translateY.on('change', () => {
            onPositionUpdate(translateX.get(), translateY.get())
        })
        return () => { unsubX(); unsubY() }
    }, [translateX, translateY, onPositionUpdate])

    // ── Idle sway ────────────────────────────────────────────
    const swayDuration = useMemo(() => 2.8 + seeded(index + 5) * 2.4, [index])
    const swayDelay = useMemo(() => seeded(index + 9) * -3, [index])

    const displayText = text.length > 28 ? text.slice(0, 26) + '…' : text

    return (
        <motion.div
            className="absolute"
            style={{
                left: '50%',
                bottom: '0px',
                marginLeft: -(SVG_W / 2),
                x: translateX,
                y: translateY,
                scale: scaleVal,
                opacity,
                zIndex: 10 + index,
            }}
        >
            {/* Sway wrapper — Framer Motion driven idle animation */}
            <motion.div
                animate={!isNew ? {
                    rotate: [-(2 + seeded(index) * 2), (2 + seeded(index) * 2), -(2 + seeded(index) * 2)],
                    x: [-(2 + seeded(index + 1) * 2), (2 + seeded(index + 1) * 2), -(2 + seeded(index + 1) * 2)],
                    y: [0, -(1 + seeded(index + 2) * 2), 0],
                } : undefined}
                transition={!isNew ? {
                    duration: swayDuration,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: swayDelay,
                } : undefined}
                style={{ transformOrigin: 'bottom center' }}
            >
                <svg
                    width={SVG_W}
                    height={SVG_H}
                    viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))' }}
                >
                    {/* Balloon body — transparent */}
                    <ellipse
                        cx="60" cy="68" rx="48" ry="60"
                        fill={color || balloonColor.fill}
                        fillOpacity="0.45"
                        stroke={balloonColor.stroke}
                        strokeOpacity="0.6"
                        strokeWidth="1.2"
                    />
                    {/* Inner glow */}
                    <ellipse
                        cx="60" cy="68" rx="40" ry="52"
                        fill={color || balloonColor.fill}
                        fillOpacity="0.15"
                    />
                    {/* Glossy highlight */}
                    <ellipse cx="42" cy="46" rx="18" ry="24" fill="white" opacity="0.35" />
                    {/* Specular dot */}
                    <circle cx="38" cy="38" r="5" fill="white" opacity="0.5" />
                    {/* Knot */}
                    <polygon
                        points="56,127 60,137 64,127"
                        fill={balloonColor.stroke}
                        fillOpacity="0.7"
                    />
                    {/* Text */}
                    <foreignObject x="16" y="34" width="88" height="68">
                        <div
                            style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#3a3a3a',
                                lineHeight: '1.3',
                                padding: '4px',
                                overflow: 'hidden',
                                wordBreak: 'break-word',
                            }}
                        >
                            {displayText}
                        </div>
                    </foreignObject>
                </svg>
            </motion.div>
        </motion.div>
    )
}

export { KNOT_Y_IN_SVG, SVG_W, SVG_H }
