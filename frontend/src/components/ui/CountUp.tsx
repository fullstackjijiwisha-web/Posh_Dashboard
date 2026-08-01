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

    // Subsequent changes: pulse the cell and snap, rather than re-counting.
    if (prev.current !== null && prev.current !== value) {
      setDisplay(value)
      setPulsed(true)
      const t = window.setTimeout(() => setPulsed(false), 600)
      prev.current = value
      return () => window.clearTimeout(t)
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
