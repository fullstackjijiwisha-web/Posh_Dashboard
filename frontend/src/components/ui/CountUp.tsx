import { useEffect, useRef, useState } from 'react'

/**
 * Counts a figure up from zero on first mount — 800ms, eased.
 * Respects prefers-reduced-motion by jumping straight to the value.
 */
export function CountUp({
  value,
  duration = 800,
  className,
}: {
  value: number
  duration?: number
  className?: string
}) {
  const [display, setDisplay] = useState(0)
  const [pulsed, setPulsed] = useState(false)
  const prev = useRef<number | null>(null)
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }

    // Subsequent changes: roll from the previous figure, then pulse.
    if (prev.current !== null && prev.current !== value) {
      const from = prev.current
      const to = value
      prev.current = value
      setPulsed(true)
      const pulseTimer = window.setTimeout(() => setPulsed(false), 600)
      const start = performance.now()
      const rollMs = Math.min(duration, 280)
      let frame = 0
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / rollMs)
        const eased = 1 - Math.pow(1 - t, 3)
        setDisplay(Math.round(from + (to - from) * eased))
        if (t < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
      return () => {
        cancelAnimationFrame(frame)
        window.clearTimeout(pulseTimer)
      }
    }

    prev.current = value
    const start = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // Same ease-out curve as the motion language.
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(value * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration, reduced])

  return (
    <span className={`${className ?? ''}${pulsed ? ' value-changed' : ''}`.trim()}>
      {display}
    </span>
  )
}
