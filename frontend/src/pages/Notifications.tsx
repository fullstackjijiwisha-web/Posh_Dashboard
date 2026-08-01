import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BellOff,
  CheckCheck,
  Info,
  Siren,
} from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { ROLE_LABEL } from '../lib/data/types'
import { formatTimestamp } from '../lib/format'
import {
  NOTIFICATION_TYPE_LABEL,
  SEVERITY_LABEL,
  loadPrefs,
} from '../lib/notifications/prefs'
import type { FlowNotification, FlowNotificationSeverity } from '../lib/workflow/types'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/notifications/NotificationCentre.css'
import { EmptyState } from '../components/ui/EmptyState'

const ICON = { size: 14, strokeWidth: 1.5 } as const

function dayGroup(iso: string): string {
  const d = iso.slice(0, 10)
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const y = new Date(today)
  y.setDate(y.getDate() - 1)
  const yKey = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
  if (d === todayKey) return 'Today'
  if (d === yKey) return 'Yesterday'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function SeverityIcon({ severity }: { severity: FlowNotificationSeverity }) {
  if (severity === 'critical') return <Siren {...ICON} />
  if (severity === 'warning') return <AlertTriangle {...ICON} />
  return <Info {...ICON} />
}

/**
 * Full-page notification centre — same vocabulary as the bell dropdown, with day
 * grouping, type filters, severity styling and deep links.
 */
export function NotificationsPage() {
  const { myNotifications, markNotificationsRead, markNotificationRead, unreadCount } =
    useWorkflow()
  const { currentRole } = useRole()
  const [filter, setFilter] = useState<'all' | 'unread' | FlowNotification['type']>('all')
  const prefs = loadPrefs()

  const visible = useMemo(() => {
    let list = myNotifications
    if (filter === 'unread') list = list.filter((n) => !n.read)
    else if (filter !== 'all') list = list.filter((n) => n.type === filter)
    list = list.filter((n) => prefs.byType[n.type]?.inApp !== false)
    return [...list].sort((a, b) => b.at.localeCompare(a.at))
  }, [myNotifications, filter, prefs])

  const byDay = useMemo(() => {
    const map = new Map<string, FlowNotification[]>()
    for (const n of visible) {
      const g = dayGroup(n.at)
      map.set(g, [...(map.get(g) ?? []), n])
    }
    return [...map.entries()]
  }, [visible])

  return (
    <div className="flex flex-col gap-6">
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>
            Notices addressed to {currentRole ? ROLE_LABEL[currentRole] : 'your role'}. A breached
            statutory clock is styled differently from an FYI, and every notice opens the thing it
            concerns. Escalation fires after {prefs.escalationHours} hours without action.
          </p>
        </div>
        {unreadCount > 0 && (
          <button type="button" className="btn btn-secondary" onClick={markNotificationsRead}>
            <CheckCheck {...ICON} />
            Mark all read
          </button>
        )}
      </div>

      <div className="nc-filters" role="tablist" aria-label="Filter notifications" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
        {(
          [
            ['all', 'All'],
            ['unread', 'Unread'],
            ['clock_breached', 'Clock breached'],
            ['clock_approaching', 'Clock approaching'],
            ['sitting_at_risk', 'Sitting at risk'],
            ['sitting_listed', 'Sitting listed'],
            ['evidence_submitted', 'Evidence'],
            ['recommendation_awaiting', 'Recommendation'],
            ['report_owed', 'Report owed'],
            ['escalation', 'Escalation'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            className={`nc-filter${filter === id ? ' active' : ''}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {byDay.length === 0 ? (
        <EmptyState
          icon={BellOff}
          headline="Nothing in this view"
          detail="Notices appear as cases move between custodians, clocks approach their limits, and sittings are listed or put at risk."
        />
      ) : (
        byDay.map(([day, items]) => (
          <section key={day} className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">{day}</span>
              <span className="meta-pill">{items.length}</span>
            </div>
            <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.map((n) => {
                const href = n.href ?? (n.caseId ? `/cases/${n.caseId}` : null)
                const body = (
                  <>
                    <span className={`nc-sev severity-${n.severity}`} title={SEVERITY_LABEL[n.severity]}>
                      <SeverityIcon severity={n.severity} />
                    </span>
                    <span className="nc-body">
                      <span className="nc-item-title">{n.title}</span>
                      <span className="nc-item-detail">{n.detail}</span>
                      <span className="nc-item-meta">
                        {NOTIFICATION_TYPE_LABEL[n.type]} · {formatTimestamp(n.at)}
                        {n.escalatedFrom ? ' · Escalated from an unanswered notice' : ''}
                      </span>
                    </span>
                  </>
                )
                return href ? (
                  <Link
                    key={n.id}
                    to={href}
                    className={`nc-item severity-${n.severity}${n.read ? ' read' : ''}`}
                    onClick={() => markNotificationRead(n.id)}
                    style={{ textDecoration: 'none' }}
                  >
                    {body}
                  </Link>
                ) : (
                  <div
                    key={n.id}
                    className={`nc-item severity-${n.severity}${n.read ? ' read' : ''}`}
                    onClick={() => markNotificationRead(n.id)}
                  >
                    {body}
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
