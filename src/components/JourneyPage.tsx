import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    TONIGHT_STORY,
    COMPLETED_TASKS,
    JOURNEY_BEATS,
    QUIET_DAY_STORY,
    type JourneyBeat,
    type PillColor,
} from '../data/journeyMockData'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Icon circle color per beat type
const BEAT_COLORS: Record<string, string> = {
    call: 'rgba(224, 123, 108, 0.85)',      // coral
    message: 'rgba(163, 166, 230, 0.85)',   // violet
    place: 'rgba(139, 184, 154, 0.85)',     // sage
    task: 'rgba(230, 185, 100, 0.85)',      // amber
    unresolved: 'rgba(251, 146, 60, 0.85)', // orange
}

const BEAT_GLOW: Record<string, string> = {
    call: 'rgba(224, 123, 108, 0.3)',
    message: 'rgba(163, 166, 230, 0.3)',
    place: 'rgba(139, 184, 154, 0.3)',
    task: 'rgba(230, 185, 100, 0.3)',
    unresolved: 'rgba(251, 146, 60, 0.3)',
}

const PILL_STYLES: Record<PillColor, { bg: string; text: string }> = {
    orange: { bg: 'rgba(251,146,60,0.18)', text: '#fb923c' },
    purple: { bg: 'rgba(163,166,230,0.18)', text: '#a3a6e6' },
    gold: { bg: 'rgba(230,185,100,0.18)', text: '#e6b964' },
    sage: { bg: 'rgba(139,184,154,0.18)', text: '#8bb89a' },
}

// Beat type SVG icons (inline, lightweight)
function BeatIcon({ type }: { type: string }) {
    const color = '#fff'
    if (type === 'call' || type === 'unresolved') {
        return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6.12 6.12l1.27-1.39a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
        )
    }
    if (type === 'message') {
        return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        )
    }
    if (type === 'place') {
        return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
            </svg>
        )
    }
    if (type === 'task') {
        return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
            </svg>
        )
    }
    return null
}

// ─── Beat Card ─────────────────────────────────────────────────────────────────

function BeatCard({ beat, index }: { beat: JourneyBeat; index: number }) {
    const isUnresolved = beat.type === 'unresolved'
    const iconBg = BEAT_COLORS[beat.type]
    const iconGlow = BEAT_GLOW[beat.type]
    const pillStyle = beat.pillColor ? PILL_STYLES[beat.pillColor] : null

    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                delay: 0.55 + index * 0.09,
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
            }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
            className="flex gap-4 items-start cursor-pointer"
            style={{
                padding: '16px 18px',
                borderRadius: '18px',
                background: isUnresolved
                    ? 'rgba(251,146,60,0.06)'
                    : 'rgba(255,255,255,0.04)',
                border: isUnresolved
                    ? '1px solid rgba(251,146,60,0.28)'
                    : '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(12px)',
                boxShadow: isUnresolved
                    ? '0 0 20px rgba(251,146,60,0.08), inset 0 0 0 0.5px rgba(251,146,60,0.1)'
                    : 'none',
                animation: isUnresolved ? 'unresolved-pulse 3s ease-in-out infinite' : 'none',
            }}
            onClick={() => console.log(`User opened beat: ${beat.title}`)}
        >
            {/* Icon circle */}
            <div
                className="flex-shrink-0 flex items-center justify-center rounded-full"
                style={{
                    width: 40,
                    height: 40,
                    background: iconBg,
                    boxShadow: `0 0 16px ${iconGlow}`,
                    marginTop: 2,
                }}
            >
                <BeatIcon type={beat.type} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <span
                        className="font-semibold truncate"
                        style={{ fontSize: 15, color: '#edeef2', lineHeight: 1.3 }}
                    >
                        {beat.title}
                    </span>
                    <span
                        className="flex-shrink-0 text-xs"
                        style={{ color: 'rgba(255,255,255,0.3)', marginTop: 2 }}
                    >
                        {beat.time}
                    </span>
                </div>

                <p
                    className="leading-relaxed"
                    style={{ fontSize: 13, color: 'rgba(160,168,192,0.9)', marginBottom: beat.pill ? 10 : 0 }}
                >
                    {beat.summary}
                </p>

                {/* Pill + CTA row */}
                {(beat.pill || beat.ctaLabel) && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {beat.pill && pillStyle && (
                            <span
                                className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                                style={{
                                    background: pillStyle.bg,
                                    color: pillStyle.text,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    letterSpacing: '0.01em',
                                }}
                            >
                                {beat.pill}
                            </span>
                        )}

                        {beat.ctaLabel && (
                            <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                className="text-xs font-semibold rounded-full cursor-pointer"
                                style={{
                                    padding: '3px 12px',
                                    background: 'rgba(251,146,60,0.2)',
                                    color: '#fb923c',
                                    border: '1px solid rgba(251,146,60,0.3)',
                                    fontSize: 11,
                                }}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    console.log(`User would open WhatsApp to reply to: ${beat.title}`)
                                }}
                            >
                                {beat.ctaLabel} →
                            </motion.button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface JourneyPageProps {
    onBack: () => void
}

export const JourneyPage = ({ onBack }: JourneyPageProps) => {
    const [expandedTask, setExpandedTask] = useState<string | null>(null)
    const beats = JOURNEY_BEATS
    const hasBeats = beats.length > 0

    // Format today's date
    const today = new Date()
    const dateLabel = today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    })

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 overflow-y-auto"
            style={{ background: '#0d0f1a' }}
        >
            {/* Ambient radial glow behind content */}
            <div
                className="pointer-events-none fixed inset-0"
                style={{
                    background:
                        'radial-gradient(ellipse 70% 50% at 50% 20%, rgba(163,166,230,0.07) 0%, transparent 70%), ' +
                        'radial-gradient(ellipse 50% 40% at 80% 80%, rgba(224,123,108,0.05) 0%, transparent 60%)',
                }}
            />

            <div className="relative z-10 max-w-lg mx-auto px-5 pt-12 pb-24">

                {/* ── Header ─────────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center justify-between mb-8"
                >
                    <motion.button
                        whileHover={{ scale: 1.1, x: -2 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={onBack}
                        className="cursor-pointer flex items-center gap-1.5"
                        style={{ color: 'rgba(160,168,192,0.7)', background: 'none', border: 'none', padding: 0 }}
                        aria-label="Back"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>Back</span>
                    </motion.button>

                    <div className="text-center">
                        <h1
                            className="font-bold tracking-tight"
                            style={{
                                fontSize: 26,
                                color: '#ffffff',
                                letterSpacing: '-0.02em',
                                background: 'linear-gradient(135deg, #ffffff 40%, rgba(163,166,230,0.9) 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Journey
                        </h1>
                    </div>

                    {/* Spacer to keep title centered */}
                    <div style={{ width: 60 }} />
                </motion.div>

                {/* Date subtitle */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="text-center mb-8"
                    style={{ color: 'rgba(160,168,192,0.5)', fontSize: 13, fontWeight: 500 }}
                >
                    {dateLabel}
                </motion.p>

                {/* ── Opening Story Line ──────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-8"
                    style={{
                        padding: '22px 24px',
                        borderRadius: '20px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                    }}
                >
                    <p
                        style={{
                            fontSize: 20,
                            fontStyle: 'italic',
                            color: '#a0a8c0',
                            lineHeight: 1.55,
                            fontWeight: 400,
                            letterSpacing: '-0.01em',
                        }}
                    >
                        {hasBeats ? TONIGHT_STORY : QUIET_DAY_STORY}
                    </p>
                </motion.div>

                {/* ── Completed Task Chips ───────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28, duration: 0.45 }}
                    className="mb-2"
                >
                    <p
                        className="mb-3"
                        style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(160,168,192,0.4)' }}
                    >
                        Today you completed {COMPLETED_TASKS.length} things
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {COMPLETED_TASKS.map((task) => (
                            <motion.button
                                key={task.id}
                                whileHover={{ scale: 1.05, y: -1 }}
                                whileTap={{ scale: 0.94 }}
                                onClick={() => {
                                    setExpandedTask(expandedTask === task.id ? null : task.id)
                                    console.log(`User opened completed task: ${task.label}`)
                                }}
                                className="cursor-pointer rounded-full text-sm font-semibold flex items-center gap-1.5"
                                style={{
                                    padding: '6px 14px',
                                    background: expandedTask === task.id
                                        ? 'rgba(139,184,154,0.25)'
                                        : 'rgba(139,184,154,0.1)',
                                    border: '1px solid rgba(139,184,154, 0.25)',
                                    color: '#8bb89a',
                                    fontSize: 13,
                                    transition: 'background 0.2s ease',
                                }}
                            >
                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                    <polyline points="2 6 5 9 10 3" stroke="#8bb89a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {task.label}
                            </motion.button>
                        ))}
                    </div>

                    {/* Expanded task detail */}
                    <AnimatePresence>
                        {expandedTask && (
                            <motion.div
                                key={expandedTask}
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                style={{
                                    overflow: 'hidden',
                                    borderRadius: 12,
                                    background: 'rgba(139,184,154,0.08)',
                                    border: '1px solid rgba(139,184,154,0.15)',
                                    padding: '10px 14px',
                                }}
                            >
                                <p style={{ fontSize: 13, color: 'rgba(139,184,154,0.85)' }}>
                                    ✓ Completed today — great work.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ── Divider ────────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    className="flex items-center gap-3 my-6"
                >
                    <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(160,168,192,0.35)', textTransform: 'uppercase' }}>
                        Your Day
                    </span>
                    <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
                </motion.div>

                {/* ── Beat Feed ──────────────────────────────────────────── */}
                {hasBeats ? (
                    <div className="flex flex-col gap-3">
                        {beats.map((beat, i) => (
                            <BeatCard key={beat.id} beat={beat} index={i} />
                        ))}
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.55 }}
                        className="text-center py-12"
                        style={{ color: 'rgba(160,168,192,0.4)', fontSize: 14 }}
                    >
                        Nothing logged yet — your day is still ahead. ✦
                    </motion.div>
                )}

                {/* ── Footer ─────────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.5 }}
                    className="text-center mt-10"
                >
                    <p style={{ fontSize: 11, color: 'rgba(160,168,192,0.2)', letterSpacing: '0.05em' }}>
                        JOURNEY · MARCH 2026
                    </p>
                </motion.div>
            </div>
        </motion.div>
    )
}
