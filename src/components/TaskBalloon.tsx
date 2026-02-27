import { motion, useSpring, useTransform, useMotionValue, animate as fmAnimate } from 'framer-motion'
import { useEffect, useMemo } from 'react'

interface TaskBalloonProps {
    text: string
    color: string
    index: number
    isNew: boolean
    total: number
    hoveredIndex: number | null
    onHoverStart: () => void
    onHoverEnd: () => void
    onClick: () => void
    isEditing: boolean
    isBlurred: boolean
    onPositionUpdate?: (x: number, y: number) => void
}

function seeded(i: number) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453
    return s - Math.floor(s)
}

const BALLOON_COLORS = [
    { fill: '#FF6B6B', stroke: '#E85555' },
    { fill: '#4ECDC4', stroke: '#3AB3AB' },
    { fill: '#FFD93D', stroke: '#E5C235' },
    { fill: '#6BCB77', stroke: '#52B35E' },
    { fill: '#A855F7', stroke: '#9333E9' },
    { fill: '#F97316', stroke: '#EA6A0A' },
    { fill: '#3B82F6', stroke: '#2569D8' },
    { fill: '#EC4899', stroke: '#D4307F' },
]

export const SVG_W = 120
export const SVG_H = 160
export const KNOT_Y_IN_SVG = 137

/** Arc/fan bouquet: x evenly spaced, y = –√(R²–x²) */
export function getBalloonPosition(index: number, total: number) {
    const STEP = 78, R1 = 250, R2 = 365, LAYER_CAP = 5
    const layer = index < LAYER_CAP ? 0 : 1
    const posInLayer = index < LAYER_CAP ? index : index - LAYER_CAP
    const countInLayer = layer === 0 ? Math.min(LAYER_CAP, total) : Math.min(LAYER_CAP, total - LAYER_CAP)
    const R = (layer === 0 ? R1 : R2) + (seeded(index + 7) - 0.5) * 40
    const xBase = (posInLayer - (countInLayer - 1) / 2) * STEP
    const yBase = -Math.sqrt(Math.max(0, R * R - xBase * xBase))
    const xShift = xBase + (seeded(index) - 0.5) * 8
    const yShift = yBase + (seeded(index + 4) - 0.5) * 8
    const scale = 0.92 + seeded(index + 2) * 0.06
    const tiltDeg = Math.atan2(xBase, Math.abs(yBase)) * (180 / Math.PI)
    return { xShift, yShift, scale, tiltDeg }
}

const WIND_EASE = [0.23, 1, 0.32, 1] as [number, number, number, number]
const WIND_DUR = 0.5

export default function TaskBalloon({
    text, color, index, isNew, total,
    hoveredIndex, onHoverStart, onHoverEnd,
    onClick, isEditing, isBlurred,
    onPositionUpdate,
}: TaskBalloonProps) {
    const { xShift, yShift, scale, tiltDeg } = getBalloonPosition(index, total)
    const balloonColor = BALLOON_COLORS[index % BALLOON_COLORS.length]

    // ── Spring-driven entry ────────────────────────────────────────────────
    const sp = useSpring(0, { stiffness: 120, damping: 14, mass: 0.8 })
    useEffect(() => {
        if (isNew) { sp.set(0); requestAnimationFrame(() => sp.set(1)) }
        else { sp.jump(1) }
    }, [isNew, sp])

    const translateX = useTransform(sp, [0, 1], [0, xShift])
    const translateY = useTransform(sp, [0, 1], [0, yShift])
    const scaleVal = useTransform(sp, [0, 1], [0.25, scale])
    const tilt = useTransform(sp, [0, 1], [0, tiltDeg])

    // ── Repulsion MotionValues ─────────────────────────────────────────────
    const repXMV = useMotionValue(0)
    const repYMV = useMotionValue(0)

    const iAmHovered = hoveredIndex === index
    const repelled = hoveredIndex !== null && !iAmHovered

    const repX = useMemo(() => {
        if (!repelled) return 0
        const myX = getBalloonPosition(index, total).xShift
        const hisX = getBalloonPosition(hoveredIndex!, total).xShift
        return (myX < hisX ? -1 : 1) * 30
    }, [repelled, hoveredIndex, index, total])

    const repY = repelled ? (seeded(index + 77) - 0.5) * 20 : 0

    useEffect(() => {
        const c = fmAnimate(repXMV, repX, { duration: WIND_DUR, ease: WIND_EASE })
        return () => c.stop()
    }, [repX, repXMV])

    useEffect(() => {
        const c = fmAnimate(repYMV, repY, { duration: WIND_DUR, ease: WIND_EASE })
        return () => c.stop()
    }, [repY, repYMV])

    // ── Report TOTAL position (spring + repulsion) so strings stay attached ─
    useEffect(() => {
        if (!onPositionUpdate) return
        const report = () => onPositionUpdate(
            translateX.get() + repXMV.get(),
            translateY.get() + repYMV.get(),
        )
        const u1 = translateX.on('change', report)
        const u2 = translateY.on('change', report)
        const u3 = repXMV.on('change', report)
        const u4 = repYMV.on('change', report)
        return () => { u1(); u2(); u3(); u4() }
    }, [translateX, translateY, repXMV, repYMV, onPositionUpdate])

    // ── Idle sway ──────────────────────────────────────────────────────────
    const swayDuration = useMemo(() => 2.6 + seeded(index + 5) * 2.8, [index])
    const swayDelay = useMemo(() => seeded(index + 9) * -4, [index])

    const displayText = text.length > 26 ? text.slice(0, 24) + '…' : text

    return (
        // Layer 1 — spring position + blur/dim when another task is being edited
        <motion.div
            className="absolute"
            animate={{
                filter: isBlurred ? 'blur(2px)' : 'blur(0px)',
                opacity: isBlurred ? 0.4 : 1,
            }}
            transition={{ duration: 0.35 }}
            style={{
                left: '50%', bottom: '0px', marginLeft: -(SVG_W / 2),
                x: translateX, y: translateY, scale: scaleVal,
                rotate: tilt, transformOrigin: 'bottom center',
                zIndex: isEditing ? 150 : iAmHovered ? 100 : 10 + index,
            }}
        >
            {/* Layer 2 — repulsion + hover scale + click target */}
            <motion.div
                style={{ transformOrigin: 'bottom center', x: repXMV, y: repYMV }}
                animate={{ scale: iAmHovered ? 1.15 : 1 }}
                transition={{ duration: WIND_DUR, ease: WIND_EASE }}
                onHoverStart={onHoverStart}
                onHoverEnd={onHoverEnd}
                onClick={onClick}
            >
                {/* Layer 3 — idle sway (frozen while editing for readability) */}
                <motion.div
                    animate={!isNew && !isEditing ? {
                        rotate: [-(1.5 + seeded(index) * 2), (1.5 + seeded(index) * 2), -(1.5 + seeded(index) * 2)],
                        y: [0, -(2 + seeded(index + 2) * 3), 0],
                    } : { rotate: 0, y: 0 }}
                    transition={!isNew && !isEditing ? {
                        duration: swayDuration, repeat: Infinity, ease: 'easeInOut', delay: swayDelay,
                    } : { duration: 0.4 }}
                    style={{ transformOrigin: 'bottom center', cursor: 'pointer' }}
                >
                    <svg
                        width={SVG_W} height={SVG_H}
                        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                        fill="none" xmlns="http://www.w3.org/2000/svg"
                        style={{
                            filter: isEditing
                                ? 'drop-shadow(0 12px 32px rgba(0,0,0,0.25))'
                                : iAmHovered
                                    ? 'drop-shadow(0 8px 24px rgba(0,0,0,0.20))'
                                    : 'drop-shadow(0 4px 12px rgba(0,0,0,0.10))',
                            mixBlendMode: 'multiply',
                            transition: `filter ${WIND_DUR}s`,
                        }}
                    >
                        <ellipse cx="60" cy="68" rx="48" ry="60"
                            fill={color || balloonColor.fill} fillOpacity="0.80"
                            stroke={balloonColor.stroke} strokeOpacity="0.4" strokeWidth="1"
                        />
                        <ellipse cx="42" cy="46" rx="16" ry="20" fill="white" opacity="0.28" />
                        <circle cx="38" cy="38" r="5" fill="white" opacity="0.42" />
                        <polygon points="56,127 60,137 64,127"
                            fill={balloonColor.stroke} fillOpacity="0.9"
                        />
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
                </motion.div>
            </motion.div>
        </motion.div>
    )
}
