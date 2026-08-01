import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BellOff, CheckCheck } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { ROLE_LABEL } from '../lib/data/types'
import { formatTimestamp } from '../lib/format'
import '../components/workflow/Workflow.css'
import { EmptyState } from '../components/ui/EmptyState'

const ICON = { size: 14, strokeWidth: 1.5 } as const

/**
 * Role-addressed notices.
 *
 * Every notice carries an audience, and this screen shows only the ones addressed to the
 * signed-in role. That is the same rule the workflow uses when a transition fires: the
 * case moving from one custodian to the next is what generates the notice, so the feed
 * is a byproduct of the lifecycle rather than a separate messaging system.
 */
export function NotificationsPage() {
  const { myNotifications, markNotificationsRead, unreadCount } = useWorkflow()
  const { currentRole } = useRole()

  // Reading the page is what marks them read — on unmount, so the unread styling is
  // still visible while the reader is actually looking at it.
  useEffect(() => () => markNotificationsRead(), [markNotificationsRead])

  return (
    <div className="flex flex-col gap-6">
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>
            Notices addressed to {currentRole ? ROLE_LABEL[currentRole] : 'your role'}. Each one was
            raised by a case moving from one custodian to the next.
          </p>
        </div>
        {unreadCount > 0 && (
          <button type="button" className="btn btn-secondary" onClick={markNotificationsRead}>
            <CheckCheck {...ICON} />
            Mark all read
          </button>
        )}
      </div>

      {myNotifications.length === 0 ? (
        <EmptyState
          icon={BellOff}
          headline="Nothing addressed to your role"
          detail="Notices appear here as cases move between custodians — a board assigned, evidence requested, a decision recorded."
        />
      ) : (
        <div className="wf-list">
          {myNotifications.map((n) => (
            <div key={n.id} className="wf-notice">
              <span className={`wf-notice-dot ${n.read ? 'read' : ''}`} />
              <div style={{ minWidth: 0 }}>
                <div className="wf-notice-title">
                  {n.caseId ? (
                    <Link to={`/cases/${n.caseId}`} style={{ color: 'var(--color-accent)' }}>
                      {n.title}
                    </Link>
                  ) : (
                    n.title
                  )}
                </div>
                <div className="wf-notice-detail">{n.detail}</div>
              </div>
              <span className="wf-notice-time">{formatTimestamp(n.at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
