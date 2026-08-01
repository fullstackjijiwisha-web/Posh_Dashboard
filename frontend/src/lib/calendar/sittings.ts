/**
 * Calendar sitting model, conflict detection, attendance and .ics export.
 *
 * Kept outside the workflow store so a sitting's RSVP and a drag-reschedule do not have
 * to round-trip through case flow mutations. Fixture sittings still get overrides; flow
 * sittings are also mirrored here so the calendar can move either kind.
 */

import { hearingsFor } from '../data/caseDetail'
import { dateNDaysAgo } from '../data/statutory'
import type { Case } from '../data/types'
import { actorName, userById } from '../data/users'
import { allMet, sittingQuorumTests } from '../workflow/quorum'
import type { CaseFlow } from '../workflow/types'

export type AttendanceStatus = 'confirmed' | 'declined' | 'awaiting'

export interface CalendarSitting {
  id: string
  caseId: string
  at: string
  /** Assumed duration when the fixture does not carry one — used for overlap tests. */
  durationMinutes: number
  title: string
  where: string
  attendees: string[]
  done: boolean
  /** True when the s.4 sitting test fails on the listed bench. */
  short: boolean
  source: 'fixture' | 'flow'
}

export interface MemberConflict {
  memberId: string
  memberName: string
  sittingA: string
  sittingB: string
  caseA: string
  caseB: string
}

const STORAGE_KEY = 'sentinel.calendar.v1'

interface Persisted {
  /** sittingId → memberId → confirmed | declined. Missing = awaiting. */
  attendance: Record<string, Record<string, 'confirmed' | 'declined'>>
  /** sittingId → reschedule overlay. */
  overrides: Record<string, { at: string; reason: string; movedAt: string }>
}

function empty(): Persisted {
  return { attendance: {}, overrides: {} }
}

function load(): Persisted {
  if (typeof window === 'undefined') return empty()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as Persisted
    return {
      attendance: parsed.attendance ?? {},
      overrides: parsed.overrides ?? {},
    }
  } catch {
    return empty()
  }
}

function save(state: Persisted) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota — RSVPs still work for the session via the in-memory callers */
  }
}

let cache = load()

export function dayKey(d: Date | string): string {
  if (typeof d === 'string') return d.slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function collectSittings(
  cases: Case[],
  flowFor: (id: string) => CaseFlow | undefined,
): CalendarSitting[] {
  const out: CalendarSitting[] = []
  for (const record of cases) {
    const flow = flowFor(record.id)
    for (const h of hearingsFor(record.id)) {
      const override = cache.overrides[h.id]
      out.push({
        id: h.id,
        caseId: record.id,
        at: override?.at ?? h.at,
        durationMinutes: h.durationMinutes || 90,
        title: h.title,
        where: h.location,
        attendees: h.attendeeIds,
        done: h.status === 'Completed' || h.status === 'Adjourned',
        short: !allMet(sittingQuorumTests(h.attendeeIds)),
        source: 'fixture',
      })
    }
    for (const h of flow?.hearings ?? []) {
      const override = cache.overrides[h.id]
      const attendees = record.assignedIC.length ? record.assignedIC : h.scheduledBy ? [h.scheduledBy] : []
      out.push({
        id: h.id,
        caseId: record.id,
        at: override?.at ?? h.at,
        durationMinutes: 90,
        title: h.agenda,
        where: h.location,
        attendees,
        done: h.status === 'Completed',
        short: !allMet(sittingQuorumTests(attendees)),
        source: 'flow',
      })
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at))
}

/** Two sittings overlap when a member is listed at both in intersecting windows. */
export function findConflicts(sittings: CalendarSitting[]): MemberConflict[] {
  const active = sittings.filter((s) => !s.done)
  const conflicts: MemberConflict[] = []
  const seen = new Set<string>()

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]!
      const b = active[j]!
      const aStart = Date.parse(a.at)
      const bStart = Date.parse(b.at)
      if (Number.isNaN(aStart) || Number.isNaN(bStart)) continue
      const aEnd = aStart + a.durationMinutes * 60_000
      const bEnd = bStart + b.durationMinutes * 60_000
      if (aEnd <= bStart || bEnd <= aStart) continue

      for (const mid of a.attendees) {
        if (!b.attendees.includes(mid)) continue
        const key = [mid, a.id, b.id].sort().join('|')
        if (seen.has(key)) continue
        seen.add(key)
        conflicts.push({
          memberId: mid,
          memberName: actorName(mid),
          sittingA: a.id,
          sittingB: b.id,
          caseA: a.caseId,
          caseB: b.caseId,
        })
      }
    }
  }
  return conflicts
}

export function conflictsForSitting(
  sittingId: string,
  conflicts: MemberConflict[],
): MemberConflict[] {
  return conflicts.filter((c) => c.sittingA === sittingId || c.sittingB === sittingId)
}

export function attendanceFor(sittingId: string, memberId: string): AttendanceStatus {
  return cache.attendance[sittingId]?.[memberId] ?? 'awaiting'
}

export function setAttendance(
  sittingId: string,
  memberId: string,
  status: 'confirmed' | 'declined',
): void {
  cache = {
    ...cache,
    attendance: {
      ...cache.attendance,
      [sittingId]: {
        ...(cache.attendance[sittingId] ?? {}),
        [memberId]: status,
      },
    },
  }
  save(cache)
}

export function attendanceSummary(sitting: CalendarSitting): {
  confirmed: number
  declined: number
  awaiting: number
  /** Predicted short: after declines, would the remaining confirmations + awaitings fail quorum? */
  predictedShort: boolean
} {
  let confirmed = 0
  let declined = 0
  let awaiting = 0
  const remaining: string[] = []
  for (const mid of sitting.attendees) {
    const s = attendanceFor(sitting.id, mid)
    if (s === 'confirmed') {
      confirmed += 1
      remaining.push(mid)
    } else if (s === 'declined') {
      declined += 1
    } else {
      awaiting += 1
      remaining.push(mid)
    }
  }
  return {
    confirmed,
    declined,
    awaiting,
    predictedShort: !allMet(sittingQuorumTests(remaining)),
  }
}

export function rescheduleSitting(sittingId: string, at: string, reason: string): void {
  cache = {
    ...cache,
    overrides: {
      ...cache.overrides,
      [sittingId]: { at, reason: reason.trim(), movedAt: new Date().toISOString() },
    },
  }
  save(cache)
}

export function overrideFor(sittingId: string) {
  return cache.overrides[sittingId] ?? null
}

/** Build a VEVENT block for one sitting. */
function vevent(s: CalendarSitting): string {
  const start = s.at.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const endMs = Date.parse(s.at) + s.durationMinutes * 60_000
  const end = new Date(endMs).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const uid = `${s.id}@sentinel.posh`
  const summary = `${s.caseId} — ${s.title}`.replace(/[,;\\]/g, ' ')
  const location = s.where.replace(/[,;\\]/g, ' ')
  const desc = `Bench: ${s.attendees.map(actorName).join(', ')}`.replace(/[,;\\]/g, ' ')
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${desc}`,
    'END:VEVENT',
  ].join('\r\n')
}

export function buildIcs(sittings: CalendarSitting[], calendarName: string): string {
  const body = sittings.filter((s) => !s.done).map(vevent).join('\r\n')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sentinel//PoSH Hearings//EN',
    `X-WR-CALNAME:${calendarName}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    body,
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadIcs(sittings: CalendarSitting[], filename: string, calendarName: string) {
  const blob = new Blob([buildIcs(sittings, calendarName)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Demo feed URL — clicking copies it; the same content is what .ics download produces. */
export function feedUrlFor(userId: string): string {
  const user = userById(userId)
  const slug = (user?.email.split('@')[0] ?? userId).replace(/[^a-z0-9.-]/gi, '-')
  return `webcal://sentinel.local/feeds/${slug}/hearings.ics`
}

export function todayDate(): Date {
  return new Date(dateNDaysAgo(0) + 'T00:00:00')
}
