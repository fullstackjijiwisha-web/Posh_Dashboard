import { NavLink } from 'react-router-dom'
import {
  FolderOpen,
  FileBadge2,
  FilePlus2,
  Gavel,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessagesSquare,
  ScrollText,
  Settings,
  ShieldCheck,
  Fingerprint,
  FileBarChart2,
} from 'lucide-react'
import { useRole } from '../../lib/role-context'
import { ROLE_LABEL } from '../../lib/data/types'
import { OPEN_CASES } from '../../lib/data/cases'
import { ACTIONS, HEARINGS } from '../../lib/data/caseDetail'
import './Sidebar.css'

const ICON = { size: 16, strokeWidth: 1.5 } as const

const openActions = ACTIONS.filter((a) => a.status !== 'Done').length
const scheduledHearings = HEARINGS.filter((h) => h.status === 'Scheduled').length

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/complaint/new', label: 'File complaint', icon: FilePlus2 },
  { to: '/annual-report', label: 'Annual report', icon: FileBadge2 },
  { to: '/cases', label: 'Cases', icon: Inbox, badge: OPEN_CASES.length },
  { to: '/proceedings', label: 'Proceedings', icon: Gavel, badge: scheduledHearings },
  { to: '/evidence', label: 'Evidence', icon: Fingerprint },
  { to: '/documents', label: 'Documents', icon: FolderOpen },
  { to: '/communications', label: 'Communications', icon: MessagesSquare },
  { to: '/actions', label: 'Actions', icon: ListChecks, badge: openActions },
  { to: '/reports', label: 'Reports', icon: FileBarChart2 },
  { to: '/audit', label: 'Audit trail', icon: ScrollText },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { currentUser, currentRole, signOut, can } = useRole()

  const nav = NAV.filter((item) => {
    if (item.to === '/audit') return can('view:audit')
    if (item.to === '/settings') return can('edit:settings') || can('view:analytics')
    if (item.to === '/annual-report') return can('view:analytics') || can('view:all_cases')
    return true
  })

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">
          <ShieldCheck size={15} strokeWidth={1.5} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="brand-title">Sentinel</div>
          <div className="brand-sub">POSH Case Management</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">Workspace</div>
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <item.icon {...ICON} />
            <span>{item.label}</span>
            {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="avatar">{currentUser?.initials ?? '--'}</div>
          <div style={{ minWidth: 0 }}>
            <div className="user-name">{currentUser?.name ?? 'Not signed in'}</div>
            <div className="user-role">{currentRole ? ROLE_LABEL[currentRole] : ''}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={signOut} title="Sign out" aria-label="Sign out">
          <LogOut {...ICON} />
        </button>
      </div>
    </aside>
  )
}
