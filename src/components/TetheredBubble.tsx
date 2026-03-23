import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TetheredBubbleProps {
    anchorX: number      // event midpoint on ring rim (client coords)
    anchorY: number
    centerX: number      // ring center (client coords)
    centerY: number
    color: string        // e.g. 'g2-inferno' or 'rainbow'
    onClickOutside: () => void
    children: React.ReactNode
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function computeGeometry(
    anchorX: number, anchorY: number,
    centerX: number, centerY: number,
    bubbleR: number // radius of bubble = 140
) {
    const dx = anchorX - centerX
    const dy = anchorY - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const nx = dx / dist  // unit vector: center → anchor
    const ny = dy / dist

    // Rim point: where the tether meets the bubble edge
    // Very slightly inside the bubble (0.98 * radius) to overlap the glass edge
    const rimX = centerX + nx * bubbleR * 0.98
    const rimY = centerY + ny * bubbleR * 0.98

    // Perpendicular unit vector (for funnel width)
    const px = -ny
    const py = nx

    // transform-origin for the bubble (in px from top-left of the box)
    // Points toward the anchor — the bubble inflates FROM here
    // Match the 0.98 offset for the tip
    const originX = bubbleR + nx * bubbleR * 0.98
    const originY = bubbleR + ny * bubbleR * 0.98

    return { rimX, rimY, px, py, nx, ny, originX, originY }
}

function buildFunnelPath(
    anchorX: number, anchorY: number,
    rimX: number, rimY: number,
    px: number, py: number,
    phase: 'lance' | 'tab'
) {
    // Tapered funnel: wide at ring (splays into segment), narrow at bubble edge
    const halfWidthAtAnchor = phase === 'lance' ? 3 : 14
    const halfWidthAtRim    = phase === 'lance' ? 1 :  4

    const ax1 = anchorX + px * halfWidthAtAnchor
    const ay1 = anchorY + py * halfWidthAtAnchor
    const ax2 = anchorX - px * halfWidthAtAnchor
    const ay2 = anchorY - py * halfWidthAtAnchor

    const rx1 = rimX + px * halfWidthAtRim
    const ry1 = rimY + py * halfWidthAtRim
    const rx2 = rimX - px * halfWidthAtRim
    const ry2 = rimY - py * halfWidthAtRim

    // Cubic bezier control points: pull toward center for slight curve
    const mx = (anchorX + rimX) / 2
    const my = (anchorY + rimY) / 2

    return [
        `M ${ax1} ${ay1}`,
        `Q ${mx + px * halfWidthAtAnchor * 0.5} ${my + py * halfWidthAtAnchor * 0.5} ${rx1} ${ry1}`,
        `L ${rx2} ${ry2}`,
        `Q ${mx - px * halfWidthAtAnchor * 0.5} ${my - py * halfWidthAtAnchor * 0.5} ${ax2} ${ay2}`,
        'Z',
    ].join(' ')
}

// ─── SVG Tether ───────────────────────────────────────────────────────────────

function SvgTether({
    anchorX, anchorY, rimX, rimY, px, py, colorVar, visible
}: {
    anchorX: number; anchorY: number
    rimX: number; rimY: number
    px: number; py: number
    colorVar: string; visible: boolean
}) {
    const [phase, setPhase] = useState<'lance' | 'tab'>('lance')
    const [drawn, setDrawn] = useState(false)

    useEffect(() => {
        if (!visible) {
            setPhase('lance')
            setDrawn(false)
            return
        }
        // Phase 1: lance appears
        const t1 = setTimeout(() => setDrawn(true), 10)
        // Phase 3: widen to anchor tab after bubble has inflated
        const t2 = setTimeout(() => setPhase('tab'), 220)
        return () => { clearTimeout(t1); clearTimeout(t2) }
    }, [visible])

    const path = buildFunnelPath(anchorX, anchorY, rimX, rimY, px, py, phase)
    const filterId = 'tether-glow'

    return (
        <svg
            className="tether-svg"
            viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
            preserveAspectRatio="none"
        >
            <defs>
                <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <motion.path
                d={path}
                fill={colorVar}
                filter={`url(#${filterId})`}
                opacity={colorVar ? 1 : 0}
                initial={{ opacity: 0, pathLength: 0 }}
                animate={drawn ? {
                    opacity: 0.85,
                    pathLength: 1,
                } : { opacity: 0, pathLength: 0 }}
                exit={{ opacity: 0, pathLength: 0 }}
                transition={{ duration: 0.04, ease: 'easeOut' }}
            />
        </svg>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TetheredBubble({
    anchorX, anchorY, centerX, centerY, color, onClickOutside, children
}: TetheredBubbleProps) {
    const bubbleR = 138  // radius of the 276px bubble (2px gap from 140 ring hole)
    const shellRef = useRef<HTMLDivElement>(null)
    const [showTether, setShowTether] = useState(false)
    const [showBubble, setShowBubble] = useState(false)

    const geo = computeGeometry(anchorX, anchorY, centerX, centerY, bubbleR)

    // Sequence: lance first (10ms), then bubble inflates
    useEffect(() => {
        const t1 = setTimeout(() => setShowTether(true), 10)
        const t2 = setTimeout(() => setShowBubble(true), 50)
        return () => { clearTimeout(t1); clearTimeout(t2) }
    }, [])

    // Outside click detection
    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (shellRef.current && !shellRef.current.contains(e.target as Node)) {
                onClickOutside()
            }
        }
        const id = setTimeout(() => document.addEventListener('mousedown', handle), 100)
        return () => { clearTimeout(id); document.removeEventListener('mousedown', handle) }
    }, [onClickOutside])

    // Escape key
    useEffect(() => {
        const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClickOutside() }
        document.addEventListener('keydown', handle)
        return () => document.removeEventListener('keydown', handle)
    }, [onClickOutside])

    // CSS custom property for color — read from the document CSS variables
    // Map our color key to a CSS variable color value
    const isRainbow = color === 'rainbow'
    const colorVar = isRainbow ? 'transparent' : `var(--${color}-mid)`
    const svgTetherColor = isRainbow ? 'rgba(255, 255, 255, 0.4)' : `url(#grad-${color})`
    const bubbleGradient = isRainbow 
        ? 'conic-gradient(from 0deg, var(--g2-inferno-mid), var(--g7-solar-mid), var(--g5-toxic-mid), var(--g3-electric-mid), var(--g6-uv-mid), var(--g1-dusk-mid), var(--g4-laser-mid), var(--g8-chrome-mid), var(--g2-inferno-mid))'
        : `linear-gradient(135deg, var(--${color}-start), var(--${color}-end))`

    const bubbleLeft = centerX - bubbleR
    const bubbleTop = centerY - bubbleR

    return (
        <>
            {/* Layer 1: SVG tether overlay */}
            {!isRainbow && (
                <SvgTether
                    anchorX={anchorX}
                    anchorY={anchorY}
                    rimX={geo.rimX}
                    rimY={geo.rimY}
                    px={geo.px}
                    py={geo.py}
                    colorVar={svgTetherColor}
                    visible={showTether}
                />
            )}

            {/* Layer 2: Bubble shell */}
            <AnimatePresence>
                {showBubble && (
                    <motion.div
                        ref={shellRef}
                        className="bubble-shell"
                        initial={{ scale: 0.04, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.04, opacity: 0 }}
                        transition={{
                            scale: {
                                type: 'spring',
                                stiffness: 500,
                                damping: 28,
                                mass: 0.5,
                            },
                            opacity: { duration: 0.06 },
                        }}
                        style={{
                            position: 'fixed',
                            left: bubbleLeft,
                            top: bubbleTop,
                            width: bubbleR * 2,
                            height: bubbleR * 2,
                            zIndex: 100,
                            transformOrigin: `${geo.originX}px ${geo.originY}px`,
                            '--bubble-color': colorVar,
                            '--bubble-gradient': bubbleGradient,
                        } as React.CSSProperties}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
