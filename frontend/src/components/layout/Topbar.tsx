import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, ChevronDown, Search } from 'lucide-react'
import { useRole } from '../../lib/role-context'
import { ROLES, ROLE_LABEL, type Role } from '../../lib/data/types'
import { USER_BY_ROLE } from '../../lib/data/users'
import './Topbar.css'

const ICON = { size: 16, strokeWidth: 1.5 } as const

export interface Crumb {
  label: string
  to?: string
}

function RoleSwitcher() {
  const { currentRole, setRole } = useRole()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="role-switch" ref={ref}>
      <button
        type="button"
        className="role-trigger"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="role-eyebrow">Viewing as</span>
        <span className="role-value">{currentRole ? ROLE_LABEL[currentRole] : 'Select role'}</span>
        <ChevronDown size={14} strokeWidth={1.5} style={{ color: 'var(--color-tertiary-text)' }} />
      </button>

      {open ? (
        <div className="role-menu" role="listbox">
          <div className="role-menu-label">Demo control</div>
          {ROLES.map((role: Role) => {
            const user = USER_BY_ROLE[role]
            const active = role === currentRole
            return (
              <button
                key={role}
                type="button"
                role="option"
                aria-selected={active}
                className={`role-option${active ? ' active' : ''}`}
                onClick={() => {
                  setRole(role)
                  setOpen(false)
                }}
              >
                <span className="avatar sm">{user.initials}</span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span className="role-option-name" style={{ display: 'block' }}>
                    {ROLE_LABEL[role]}
                  </span>
                  <span className="role-option-sub" style={{ display: 'block' }}>
                    {user.name}
                  </span>
                </span>
                {active ? <Check size={14} strokeWidth={2} style={{ color: 'var(--color-accent)' }} /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function Topbar({ crumbs }: { crumbs: Crumb[] }) {
  const { currentUser } = useRole()

  return (
    <header className="topbar">
      <nav className="crumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1
          return (
            <span key={c.label} style={{ display: 'contents' }}>
              {i > 0 ? <span className="crumb-sep">/</span> : null}
              {c.to && !last ? (
                <Link to={c.to} className="crumb">
                  {c.label}
                </Link>
              ) : (
                <span className={`crumb${last ? ' current' : ''}`}>{c.label}</span>
              )}
            </span>
          )
        })}
      </nav>

      <div className="search">
        <Search {...ICON} />
        <input placeholder="Search cases, evidence, people" aria-label="Search" />
        <span className="kbd">⌘K</span>
      </div>

      <div className="topbar-right">
        <RoleSwitcher />
        <button className="icon-btn" aria-label="Notifications, 5 unread">
          <Bell {...ICON} />
          <span className="notif-dot">5</span>
        </button>
        <div className="top-user">
          <div className="avatar sm">{currentUser?.initials ?? '--'}</div>
        </div>
      </div>
    </header>
  )
}
