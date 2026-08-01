/**
 * Time Machine hook — as-of date, derived view, scrub throttle, and 12s replay.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { Case } from '../data/types'
import { REPORTING_DATE } from '../data/statutory'
import type { CaseFlow } from '../workflow/types'
import { deriveAt, type AsOfView } from './derive'

const REPLAY_MS = 12_000

export interface TimeMachineApi {
  view: AsOfView
  asOf: string
  today: string
  /** True when the scrubber is not at today. */
  isHistorical: boolean
  replaying: boolean
  paused: boolean
  /** Scrub to a calendar day (yyyy-MM-dd). Throttled to one paint. */
  scrubTo: (day: string) => void
  /** Jump precisely — no throttle. */
  jumpTo: (day: string) => void
  returnToToday: () => void
  startReplay: () => void
  pauseReplay: () => void
  resumeReplay: () => void
  stopReplay: () => void
}

export function useTimeMachine(record: Case, flow: CaseFlow | undefined): TimeMachineApi {
  const today = REPORTING_DATE
  const [asOf, setAsOf] = useState(today)
  const [replaying, setReplaying] = useState(false)
  const [paused, setPaused] = useState(false)

  const pending = useRef<string | null>(null)
  const scrubRaf = useRef(0)
  const replayRaf = useRef(0)
  const pausedRef = useRef(false)
  const pauseStarted = useRef(0)
  const pausedAccum = useRef(0)
  const replayOrigin = useRef(0)

  // New case → reset to today.
  useEffect(() => {
    setAsOf(today)
    setReplaying(false)
    setPaused(false)
    pausedRef.current = false
    pausedAccum.current = 0
    if (replayRaf.current) cancelAnimationFrame(replayRaf.current)
    replayRaf.current = 0
  }, [record.id, today])

  useEffect(() => {
    return () => {
      if (scrubRaf.current) cancelAnimationFrame(scrubRaf.current)
      if (replayRaf.current) cancelAnimationFrame(replayRaf.current)
    }
  }, [])

  const view = useMemo(() => deriveAt(record, flow, asOf, today), [record, flow, asOf, today])

  const scrubTo = useCallback((day: string) => {
    pending.current = day
    if (scrubRaf.current) return
    scrubRaf.current = requestAnimationFrame(() => {
      scrubRaf.current = 0
      if (pending.current) setAsOf(pending.current)
      pending.current = null
    })
  }, [])

  const jumpTo = useCallback((day: string) => {
    setAsOf(day)
  }, [])

  const stopReplay = useCallback(() => {
    if (replayRaf.current) cancelAnimationFrame(replayRaf.current)
    replayRaf.current = 0
    setReplaying(false)
    setPaused(false)
    pausedRef.current = false
    pausedAccum.current = 0
  }, [])

  const returnToToday = useCallback(() => {
    stopReplay()
    setAsOf(today)
  }, [stopReplay, today])

  const startReplay = useCallback(() => {
    if (replayRaf.current) cancelAnimationFrame(replayRaf.current)
    pausedRef.current = false
    pausedAccum.current = 0
    setPaused(false)
    setReplaying(true)

    const totalDays = Math.max(
      1,
      differenceInCalendarDays(parseISO(today), parseISO(record.filedDate)),
    )
    replayOrigin.current = performance.now()

    const tick = (now: number) => {
      if (pausedRef.current) {
        replayRaf.current = requestAnimationFrame(tick)
        return
      }
      const elapsed = now - replayOrigin.current - pausedAccum.current
      const t = Math.min(1, elapsed / REPLAY_MS)
      const dayOffset = Math.round(t * totalDays)
      setAsOf(format(addDays(parseISO(record.filedDate), dayOffset), 'yyyy-MM-dd'))
      if (t < 1) {
        replayRaf.current = requestAnimationFrame(tick)
      } else {
        replayRaf.current = 0
        setReplaying(false)
        setAsOf(today)
      }
    }

    setAsOf(record.filedDate)
    replayRaf.current = requestAnimationFrame(tick)
  }, [record.filedDate, today])

  const pauseReplay = useCallback(() => {
    if (!replaying || pausedRef.current) return
    pausedRef.current = true
    pauseStarted.current = performance.now()
    setPaused(true)
  }, [replaying])

  const resumeReplay = useCallback(() => {
    if (!replaying || !pausedRef.current) return
    pausedAccum.current += performance.now() - pauseStarted.current
    pausedRef.current = false
    setPaused(false)
  }, [replaying])

  return {
    view,
    asOf: view.asOf,
    today,
    isHistorical: !view.isToday,
    replaying,
    paused,
    scrubTo,
    jumpTo,
    returnToToday,
    startReplay,
    pauseReplay,
    resumeReplay,
    stopReplay,
  }
}
