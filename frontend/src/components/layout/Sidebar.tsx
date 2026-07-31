import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileWarning,
  Briefcase,
  Gavel,
  FolderOpen,
  Fingerprint,
  ListChecks,
  FileBarChart2,
  ScrollText,
  Settings,
  Shield,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import './Sidebar.css'

const MAIN = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/complaints', label: 'Complaints', icon: FileWarning, badge: 3 },
  { to: '/cases', label: 'Case Workspace', icon: Briefcase },
]

const MANAGEMENT = [
  { to: '/proceedings', label: 'Proceedings', icon: Gavel, badge: 1 },
  { to: '/documents', label: 'Documents', icon: FolderOpen },
  { to: '/evidence', label: 'Evidence', icon: Fingerprint },
  { to: '/actions', label: 'Action Tracker', icon: ListChecks, badge: 5 },
]

const ADMIN = [
  { to: '/reports', label: 'Reports & Exports', icon: FileBarChart2 },
  { to: '/audit', label: 'Audit Log', icon: ScrollText },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">
          <Shield size={18} />
        </div>
        <div>
          <div className="brand-title">POSH</div>
          <div className="brand-sub">COMPLIANCE</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">MAIN</div>
        {MAIN.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <item.icon size={18} />
            <span>{item.label}</span>
            {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
          </NavLink>
        ))}

        <div className="nav-section">MANAGEMENT</div>
        {MANAGEMENT.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <item.icon size={18} />
            <span>{item.label}</span>
            {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
          </NavLink>
        ))}

        <div className="nav-section">ADMIN</div>
        {ADMIN.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="avatar">{user?.initials}</div>
          <div>
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.title?.toUpperCase()} · Online</div>
          </div>
        </div>
        <button className="logout-btn" onClick={logout} title="Sign out" aria-label="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}
