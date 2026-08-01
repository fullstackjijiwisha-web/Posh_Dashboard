import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * A horizontally scrollable tab strip that shows where it can still scroll.
 *
 * Overflow on its own is invisible: the case record's tab bar already scrolled, and the
 * result was that "Communications" looked truncated rather than reachable. This tracks
 * whether either edge has more content and exposes it as `data-at-start` /
 * `data-at-end`, which the stylesheet turns into a fade.
 *
 * It also keeps the active tab in view, so opening a deep link to `?tab=communications`
 * scrolls to that tab rather than landing on a strip that looks like it starts at
 * "Workflow".
 */
export function ScrollTabs({
  children,
  activeIndex,
  ariaLabel,
}: {
  children: ReactNode
  /** Index of the selected tab, so it can be scrolled into view. */
  activeIndex: number
  ariaLabel: string
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const strip = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  const measure = useCallback(() => {
    const el = strip.current
    if (!el) return
    // 1px of slack: sub-pixel layout means scrollLeft rarely lands exactly on the bound.
    const atStart = el.scrollLeft <= 1
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
    setEdges((prev) => (prev.start === atStart && prev.end === atEnd ? prev : { start: atStart, end: atEnd }))
  }, [])

  useEffect(() => {
    const el = strip.current
    if (!el) return
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', measure)
      ro.disconnect()
    }
  }, [measure])

  // Bring the selected tab into view when it changes — including on first paint from a
  // deep link, where the active tab may be off-screen to the right.
  useEffect(() => {
    const el = strip.current
    const tab = el?.children[activeIndex] as HTMLElement | undefined
    tab?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [activeIndex])

  return (
    <div
      ref={wrap}
      className="cw-tabs-wrap"
      data-at-start={edges.start}
      data-at-end={edges.end}
    >
      <div ref={strip} className="cw-tabs" role="tablist" aria-label={ariaLabel}>
        {children}
      </div>
    </div>
  )
}
