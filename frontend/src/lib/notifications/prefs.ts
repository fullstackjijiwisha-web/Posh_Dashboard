/**
 * Notification preferences and severity vocabulary.
 *
 * Preferences live outside the workflow snapshot so resetting the demo workflow does not
 * wipe how a person wants to be reached. Types mirror what the critique asked for.
 */

import type { Role } from '../data/types'

export type NotificationType =
  | 'clock_approaching'
  | 'clock_breached'
  | 'sitting_listed'
  | 'sitting_at_risk'
  | 'evidence_submitted'
  | 'recommendation_awaiting'
  | 'report_owed'
  | 'escalation'
  | 'lifecycle'

export type NotificationSeverity = 'critical' | 'warning' | 'info'

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  clock_approaching: 'Clock approaching',
  clock_breached: 'Clock breached',
  sitting_listed: 'Sitting listed',
  sitting_at_risk: 'Sitting at risk',
  evidence_submitted: 'Evidence submitted',
  recommendation_awaiting: 'Recommendation awaiting you',
  report_owed: 'Report owed',
  escalation: 'Escalation',
  lifecycle: 'Lifecycle',
}

export const SEVERITY_LABEL: Record<NotificationSeverity, string> = {
  critical: 'Requires action',
  warning: 'Attention',
  info: 'For information',
}

/** Default severity when a type is raised without an explicit one. */
export const TYPE_SEVERITY: Record<NotificationType, NotificationSeverity> = {
  clock_approaching: 'warning',
  clock_breached: 'critical',
  sitting_listed: 'info',
  sitting_at_risk: 'warning',
  evidence_submitted: 'info',
  recommendation_awaiting: 'warning',
  report_owed: 'warning',
  escalation: 'critical',
  lifecycle: 'info',
}

export type NotifyChannel = 'inApp' | 'email' | 'digest'

export interface TypePreference {
  inApp: boolean
  email: boolean
  digest: boolean
}

export interface NotificationPrefs {
  /** Hours after a breached clock before the next role up is told. */
  escalationHours: number
  byType: Record<NotificationType, TypePreference>
}

const PREFS_KEY = 'sentinel.notification.prefs.v1'

const ALL_TYPES: NotificationType[] = [
  'clock_approaching',
  'clock_breached',
  'sitting_listed',
  'sitting_at_risk',
  'evidence_submitted',
  'recommendation_awaiting',
  'report_owed',
  'escalation',
  'lifecycle',
]

function defaultTypePref(t: NotificationType): TypePreference {
  // Breaches and escalations always land in-app; digests are opt-in for FYIs.
  const critical = t === 'clock_breached' || t === 'escalation'
  return {
    inApp: true,
    email: critical || t === 'sitting_at_risk' || t === 'recommendation_awaiting',
    digest: !critical,
  }
}

export function defaultPrefs(): NotificationPrefs {
  const byType = {} as Record<NotificationType, TypePreference>
  for (const t of ALL_TYPES) byType[t] = defaultTypePref(t)
  return { escalationHours: 24, byType }
}

export function loadPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return defaultPrefs()
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    if (!raw) return defaultPrefs()
    const parsed = JSON.parse(raw) as NotificationPrefs
    const base = defaultPrefs()
    return {
      escalationHours: parsed.escalationHours ?? base.escalationHours,
      byType: { ...base.byType, ...(parsed.byType ?? {}) },
    }
  } catch {
    return defaultPrefs()
  }
}

export function savePrefs(prefs: NotificationPrefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}

/**
 * Who is told when a clock passes without action.
 * Escalation climbs the custodial chain — not the org chart.
 */
export function escalationAudience(from: Role): Role[] {
  switch (from) {
    case 'employee':
      return ['posh_admin']
    case 'hr_spoc':
      return ['posh_admin']
    case 'ic_member':
    case 'external_member':
      return ['presiding_officer']
    case 'presiding_officer':
      return ['posh_admin']
    case 'posh_admin':
      return ['super_admin']
    case 'management':
      return ['super_admin']
    case 'super_admin':
      return ['super_admin']
    default:
      return ['posh_admin']
  }
}

export { ALL_TYPES }
