import { motion } from 'framer-motion'

interface JourneyIconProps {
    onClick: () => void
    isActive: boolean
}

// Detects if it's evening (7PM or later) — triggers the rainbow glow
function useIsEvening(): boolean {
    const hour = new Date().getHours()
    return hour >= 19
}

export const JourneyIcon = ({ onClick, isActive }: JourneyIconProps) => {
    const isEvening = useIsEvening()
    const shouldGlow = isEvening && !isActive

    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            title="Journey — your day in review"
            aria-label="Open Journey daily recap"
            className="relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer focus:outline-none"
            style={{
                background: isActive
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
            }}
        >
            {/* Evening glow ring */}
            {shouldGlow && (
                <span
                    className="absolute inset-0 rounded-full journey-glow-ring"
                    style={{ pointerEvents: 'none' }}
                />
            )}

            {/* ✦ Star icon */}
            <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    opacity: isActive ? 1 : 0.75,
                    transition: 'opacity 0.2s ease',
                }}
            >
                {/* Four-pointed star (✦ shape) */}
                <path
                    d="M8 1 C8 1 8.6 5 11 8 C8.6 11 8 15 8 15 C8 15 7.4 11 5 8 C7.4 5 8 1 8 1Z"
                    fill={isActive ? '#ffffff' : isEvening ? '#c4b5fd' : '#9ca3af'}
                    style={{ transition: 'fill 0.3s ease' }}
                />
                <path
                    d="M1 8 C1 8 5 8.6 8 11 C11 8.6 15 8 15 8 C15 8 11 7.4 8 5 C5 7.4 1 8 1 8Z"
                    fill={isActive ? '#ffffff' : isEvening ? '#c4b5fd' : '#9ca3af'}
                    style={{ transition: 'fill 0.3s ease' }}
                />
            </svg>

            {/* Evening indicator dot */}
            {shouldGlow && (
                <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1 right-1 w-2 h-2 rounded-full"
                    style={{
                        background: 'linear-gradient(135deg, #e58a7d, #a3a6e6)',
                        boxShadow: '0 0 6px rgba(163,166,230,0.8)',
                    }}
                />
            )}
        </motion.button>
    )
}
