import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import type { CalendarEvent } from '../types'

interface DateStripProps {
  selectedDate: string
  todayDate: string
  events: CalendarEvent[]
  onSelectDate: (date: string) => void
}

const ITEM_W = 52
const DAYS_BEFORE = 365
const DAYS_AFTER = 365

function buildDateRange(today: string): string[] {
  const base = new Date(today + 'T00:00:00')
  const result: string[] = []
  for (let i = -DAYS_BEFORE; i <= DAYS_AFTER; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    result.push(d.toISOString().slice(0, 10))
  }
  return result
}

function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function DateStrip({ selectedDate, todayDate, events, onSelectDate }: DateStripProps) {
  const dates = useMemo(() => buildDateRange(todayDate), [todayDate])
  const scrollRef = useRef<HTMLDivElement>(null)
  const isUserScrollingRef = useRef(false)
  const settleTmRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  
  // Mouse drag & click state
  const isMouseDownRef = useRef(false)
  const hasMovedRef = useRef(false)
  const startXRef = useRef(0)
  const scrollLeftStartRef = useRef(0)

  // Track current virtual index for windowing
  const [windowCenterIdx, setWindowCenterIdx] = useState(() => {
    const idx = dates.indexOf(selectedDate)
    return idx >= 0 ? idx : DAYS_BEFORE
  })

  // Window size: render 30 items for smoother edge transitions
  const WINDOW_SIZE = 30
  const visibleDates = useMemo(() => {
    const start = Math.max(0, windowCenterIdx - WINDOW_SIZE)
    const end = Math.min(dates.length, windowCenterIdx + WINDOW_SIZE + 1)
    return dates.slice(start, end).map((iso, i) => ({
      iso,
      globalIdx: start + i
    }))
  }, [dates, windowCenterIdx])

  const centerIdxRef = useRef(windowCenterIdx)

  // Update CSS custom property for drum wheel effect
  const updateVisuals = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const scrollX = el.scrollLeft
    // Pass as a unitless number for CSS math
    el.style.setProperty('--scroll-x', String(scrollX))
    
    const newIdx = Math.max(0, Math.min(dates.length - 1, Math.round(scrollX / ITEM_W)))
    if (newIdx !== centerIdxRef.current) {
       centerIdxRef.current = newIdx
       // Update window less frequently to avoid React churn
       if (Math.abs(newIdx - windowCenterIdx) > 5) {
         setWindowCenterIdx(newIdx)
       }
    }
  }, [dates.length, windowCenterIdx])

  const handleScroll = useCallback(() => {
    updateVisuals()
    
    clearTimeout(settleTmRef.current)
    settleTmRef.current = setTimeout(() => {
      if (!isMouseDownRef.current) {
        isUserScrollingRef.current = false
        const finalIdx = centerIdxRef.current
        setWindowCenterIdx(finalIdx)
        onSelectDate(dates[finalIdx])
      }
    }, 150)
  }, [dates, onSelectDate, updateVisuals])

  const handleDateClick = useCallback((globalIdx: number) => {
    // If the user was dragging, don't trigger a jump
    if (hasMovedRef.current) return
    
    isUserScrollingRef.current = true
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: globalIdx * ITEM_W,
        behavior: 'smooth'
      })
    }
  }, [])

  // Drag logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    isMouseDownRef.current = true
    hasMovedRef.current = false
    isUserScrollingRef.current = true
    startXRef.current = e.pageX - scrollRef.current.offsetLeft
    scrollLeftStartRef.current = scrollRef.current.scrollLeft
    scrollRef.current.style.scrollSnapType = 'none'
    scrollRef.current.style.cursor = 'grabbing'
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || !scrollRef.current) return
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startXRef.current) * 2.2 
    
    if (Math.abs(walk) > 5) {
      hasMovedRef.current = true
    }

    if (hasMovedRef.current) {
      e.preventDefault()
      scrollRef.current.scrollLeft = scrollLeftStartRef.current - walk
      updateVisuals()
    }
  }

  const handleMouseUp = () => {
    if (!isMouseDownRef.current) return
    isMouseDownRef.current = false
    if (scrollRef.current) {
      scrollRef.current.style.scrollSnapType = 'x mandatory'
      scrollRef.current.style.cursor = 'grab'
      handleScroll() 
    }
  }

  const handleMouseLeave = () => {
    if (!isMouseDownRef.current) return
    isMouseDownRef.current = false
    if (scrollRef.current) {
      scrollRef.current.style.scrollSnapType = 'x mandatory'
      scrollRef.current.style.cursor = 'grab'
    }
  }

  const handleTouchStart = () => {
    isUserScrollingRef.current = true
    hasMovedRef.current = false
    clearTimeout(settleTmRef.current)
  }

  // Effect to sync scroll to external selectedDate changes
  useEffect(() => {
    if (isUserScrollingRef.current) return
    const idx = dates.indexOf(selectedDate)
    if (idx < 0) return
    
    setWindowCenterIdx(idx)
    centerIdxRef.current = idx
    
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: idx * ITEM_W,
        behavior: 'smooth'
      })
      requestAnimationFrame(updateVisuals)
    }
  }, [selectedDate, dates, updateVisuals])

  // Initial jump
  useEffect(() => {
    const idx = dates.indexOf(selectedDate)
    if (idx >= 0 && scrollRef.current) {
      scrollRef.current.scrollLeft = idx * ITEM_W
      updateVisuals()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const datesWithEvents = useMemo(() => new Set(events.map(e => e.date)), [events])

  return (
    <div className="date-wheel-wrapper">
      <div
        className="date-wheel-scroll"
        ref={scrollRef}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        style={{ touchAction: 'none' }}
      >
        <div style={{ 
          width: `calc(100% - ${ITEM_W}px + ${dates.length * ITEM_W}px)`, 
          height: 1, 
          position: 'absolute', 
          pointerEvents: 'none' 
        }} />
        
        {visibleDates.map(({ iso, globalIdx }) => {
          const d = parseDate(iso)
          const dayOfWeek = d.getDay()
          const dayNum = d.getDate()
          const month = d.getMonth()
          const isToday = iso === todayDate
          const isCentered = globalIdx === centerIdxRef.current
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
          const hasEvents = datesWithEvents.has(iso)
          
          const prevDateIso = dates[globalIdx - 1]
          const showMonth = !prevDateIso || parseDate(prevDateIso).getMonth() !== month

          return (
            <div
              key={iso}
              className="date-wheel-col"
              onClick={() => handleDateClick(globalIdx)}
              style={{
                '--i': globalIdx,
                position: 'absolute',
                left: `calc(50% - ${ITEM_W / 2}px + ${globalIdx * ITEM_W}px)`,
                cursor: 'pointer'
              } as any}
            >
              <span className={`date-wheel-month ${showMonth ? '' : 'invisible'}`}>
                {MONTH_SHORT[month]}
              </span>

              <div
                data-text={dayNum}
                className={[
                  'date-wheel-day',
                  isCentered ? 'date-wheel-day--centered' : '',
                  isToday && !isCentered ? 'date-wheel-day--today' : '',
                  isWeekend && !isCentered ? 'date-wheel-day--weekend' : '',
                ].filter(Boolean).join(' ')}
              >
                <span className="date-wheel-dow">{DAY_LABELS[dayOfWeek]}</span>
                <span className="date-wheel-num">{dayNum}</span>
                <span className={`date-wheel-dot ${hasEvents ? 'date-wheel-dot--active' : ''}`} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
