import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface FragmentsProps {
    color: string
    startX: number
    startY: number
}

function seededRandom(seed: number) {
    const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453
    return s - Math.floor(s)
}

export default function BalloonParticles({ color, startX, startY }: FragmentsProps) {
    const [fragments, setFragments] = useState<{ x: number, y: number, r: number, s: number, d: number }[]>([])

    useEffect(() => {
        const count = 10 + Math.floor(Math.random() * 4) // 10-13 particles
        const frags = Array.from({ length: count }).map((_, i) => {
            const angle = seededRandom(i * 10) * Math.PI * 2
            // Most particles go outward/upward
            const distance = 40 + seededRandom(i * 11) * 60
            const x = Math.cos(angle) * distance
            const y = Math.sin(angle) * distance - 20 - seededRandom(i * 13) * 50
            return {
                x, y,
                r: (seededRandom(i * 12) - 0.5) * 360, // random rotation
                s: 0.4 + seededRandom(i * 14) * 0.8, // scale between 0.4 and 1.2
                d: 0.4 + seededRandom(i * 15) * 0.3 // duration 0.4-0.7s
            }
        })
        setFragments(frags)
    }, [])

    return (
        <div
            className="fixed pointer-events-none"
            style={{
                left: startX,
                // The balloon body center is roughly 70px above the knot (SVG_H - KNOT_Y_IN_SVG = 23, plus half balloon height ~ 50 -> approx 75px above)
                top: startY - 75,
                zIndex: 200 // Above cluster
            }}
        >
            {fragments.map((frag, i) => (
                <motion.div
                    key={i}
                    className="absolute"
                    style={{
                        marginLeft: -4, marginTop: -4,
                        width: 8 * frag.s,
                        height: 8 * frag.s,
                        background: color,
                        borderRadius: '2px', // Slightly jagged fragments
                        opacity: 0.85
                    }}
                    initial={{ x: 0, y: 0, rotate: 0, opacity: 0.85, scale: 0 }}
                    animate={{
                        x: frag.x,
                        y: frag.y,
                        rotate: frag.r,
                        opacity: 0,
                        scale: 1
                    }}
                    transition={{
                        duration: frag.d,
                        ease: [0.19, 1, 0.22, 1] // Fast out, slow drag
                    }}
                />
            ))}
        </div>
    )
}
