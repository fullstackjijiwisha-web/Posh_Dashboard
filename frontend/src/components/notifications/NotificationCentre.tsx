import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  Clock,
  Info,
  Settings2,
  Siren,
} from 'lucide-react'
import { useWorkflow } from '../../lib/workflow/store'
import { formatTimestamp } from '../../lib/format'
import {
  ALL_TYPES,
  NOTIFICATION_TYPE_LABEL,
  SEVERITY_LABEL,
  defaultPrefs,
  loadPrefs,
  savePrefs,
  type NotificationPrefs,
  type NotificationType,
} from '../../lib/notifications/prefs'
import type { FlowNotification, FlowNotificationSeverity } from '../../lib/workflow/types'
import './NotificationCentre.css'

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
  })
}

function SeverityIcon({ severity }: { severity: FlowNotificationSeverity }) {
  if (severity === 'critical') return <Siren {...ICON} />
  if (severity === 'warning') return <AlertTriangle {...ICON} />
  return <Info {...ICON} />
}

function hrefOf(n: FlowNotification): string | null {
  return n.href ?? (n.caseId ? `/cases/${n.caseId}` : null)
}

/**
 * Bell dropdown — grouped by day, filterable by type, with mark-all-read and a
 * preferences drawer for in-app / email / digest per type.
 */
export function NotificationCentre({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { myNotifications, markNotificationsRead, markNotificationRead, unreadCount } = useWorkflow()
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState<'all' | NotificationType | 'unread'>('all')
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => loadPrefs())

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const visible = useMemo(() => {
    let list = myNotifications
    if (filter === 'unread') list = list.filter((n) => !n.read)
    else if (filter !== 'all') list = list.filter((n) => n.type === filter)
    // Honour in-app preference — a type switched off disappears from the centre.
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

  const persistPrefs = (next: NotificationPrefs) => {
    setPrefs(next)
    savePrefs(next)
  }

  if (!open) return null

  return (
    <div className="nc-panel" ref={ref} role="dialog" aria-modal="true" aria-label="Notifications">
      <div className="nc-head">
        <div>
          <div className="nc-title">
            <Bell {...ICON} />
            Notifications
          </div>
          <div className="nc-sub">
            {unreadCount} unread · escalation after {prefs.escalationHours}h
          </div>
        </div>
        <div className="nc-head-actions">
          <button
            type="button"
            className="icon-btn"
            aria-label="Notification preferences"
            aria-pressed={prefsOpen}
            onClick={() => setPrefsOpen((p) => !p)}
          >
            <Settings2 {...ICON} />
          </button>
          {unreadCount > 0 ? (
            <button type="button" className="btn btn-secondary" onClick={markNotificationsRead}>
              <CheckCheck {...ICON} />
              Mark all read
            </button>
          ) : null}
        </div>
      </div>

      {prefsOpen ? (
        <div className="nc-prefs">
          <div className="nc-prefs-intro">
            Choose how each kind of notice reaches you. A breached statutory clock always
            stays visible in-app.
          </div>
          <label className="nc-escalation">
            Escalation interval (hours)
            <input
              className="input"
              type="number"
              min={1}
              max={168}
              value={prefs.escalationHours}
              onChange={(e) =>
                persistPrefs({
                  ...prefs,
                  escalationHours: Math.max(1, Number(e.target.value) || 24),
                })
              }
            />
          </label>
          <div className="nc-prefs-table">
            <div className="nc-prefs-row head">
              <span>Type</span>
              <span>In-app</span>
              <span>Email</span>
              <span>Digest</span>
            </div>
            {ALL_TYPES.map((t) => {
              const row = prefs.byType[t] ?? defaultPrefs().byType[t]
              const locked = t === 'clock_breached' || t === 'escalation'
              return (
                <div key={t} className="nc-prefs-row">
                  <span>{NOTIFICATION_TYPE_LABEL[t]}</span>
                  {(['inApp', 'email', 'digest'] as const).map((ch) => (
                    <label key={ch} className="nc-check">
                      <input
                        type="checkbox"
                        checked={row[ch]}
                        disabled={locked && ch === 'inApp'}
                        onChange={(e) =>
                          persistPrefs({
                            ...prefs,
                            byType: {
                              ...prefs.byType,
                              [t]: { ...row, [ch]: e.target.checked },
                            },
                          })
                        }
                      />
                      <span className="sr-only">{ch}</span>
                    </label>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="nc-filters" role="tablist" aria-label="Filter notifications">
        {(
          [
            ['all', 'All'],
            ['unread', 'Unread'],
            ['clock_breached', 'Breached'],
            ['sitting_at_risk', 'At risk'],
            ['recommendation_awaiting', 'Awaiting'],
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

      <div className="nc-list">
        {byDay.length === 0 ? (
          <div className="nc-empty">
            <Clock {...ICON} />
            Nothing in this view.
          </div>
        ) : (
          byDay.map(([day, items]) => (
            <div key={day} className="nc-day">
              <div className="nc-day-label">{day}</div>
              {items.map((n) => {
                const href = hrefOf(n)
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`nc-item severity-${n.severity}${n.read ? ' read' : ''}`}
                    onClick={() => {
                      markNotificationRead(n.id)
                      if (href) {
                        navigate(href)
                        onClose()
                      }
                    }}
                  >
                    <span className={`nc-sev severity-${n.severity}`} title={SEVERITY_LABEL[n.severity]}>
                      <SeverityIcon severity={n.severity} />
                    </span>
                    <span className="nc-body">
                      <span className="nc-item-title">{n.title}</span>
                      <span className="nc-item-detail">{n.detail}</span>
                      <span className="nc-item-meta">
                        {NOTIFICATION_TYPE_LABEL[n.type]} · {formatTimestamp(n.at)}
                        {n.escalatedFrom ? ' · Escalated' : ''}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          ))
        )}
      </div>

      <div className="nc-foot">
        <Link to="/notifications" onClick={onClose}>
          Open notification centre
        </Link>
      </div>
    </div>
  )
}
