import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, ChevronDown, Presentation, Search } from 'lucide-react'
import { useRole } from '../../lib/role-context'
import { useWorkflow } from '../../lib/workflow/store'
import { ROLES, ROLE_LABEL, type Role } from '../../lib/data/types'
import { USER_BY_ROLE } from '../../lib/data/users'
import { NotificationCentre } from '../notifications/NotificationCentre'
import './Topbar.css'

const ICON = { size: 16, strokeWidth: 1.5 } as const

export interface Crumb {
  label: string
  to?: string
}

export function RoleSwitcher({
  forceOpen,
  onOpenChange,
}: {
  forceOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const { currentRole, setRole } = useRole()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (forceOpen) setOpen(true)
  }, [forceOpen])

  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])

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

export function Topbar({
  crumbs,
  onOpenPalette,
  roleSwitchSignal,
}: {
  crumbs: Crumb[]
  onOpenPalette: () => void
  /** Increment to force-open the role switcher (command palette "Switch role"). */
  roleSwitchSignal?: number
}) {
  const { currentUser, presenterMode, setPresenterMode } = useRole()
  const { unreadCount } = useWorkflow()
  const [notifOpen, setNotifOpen] = useState(false)
  const [forceRole, setForceRole] = useState(false)
  const notifWrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (roleSwitchSignal && roleSwitchSignal > 0) setForceRole(true)
  }, [roleSwitchSignal])

  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

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

      <button
        type="button"
        className="search"
        onClick={onOpenPalette}
        aria-label="Open command palette"
      >
        <Search {...ICON} />
        <span className="search-placeholder">Search cases, evidence, people</span>
        <span className="kbd">{isMac ? '⌘K' : 'Ctrl K'}</span>
      </button>

      <div className="topbar-right">
        {presenterMode ? (
          <button
            type="button"
            className="presenter-pill"
            onClick={() => setPresenterMode(false)}
            title="Presenter Mode is on — identities are masked"
          >
            <Presentation size={12} strokeWidth={1.5} />
            Presenter
          </button>
        ) : null}
        <RoleSwitcher
          forceOpen={forceRole}
          onOpenChange={(o) => {
            if (!o) setForceRole(false)
          }}
        />
        <div className="notif-wrap" ref={notifWrap}>
          <button
            type="button"
            className="icon-btn"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : 'Notifications'
            }
            aria-expanded={notifOpen}
            onClick={() => setNotifOpen((p) => !p)}
          >
            <Bell {...ICON} />
            {unreadCount > 0 ? <span className="notif-dot">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
          </button>
          <NotificationCentre open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>
        <div className="top-user">
          <div className="avatar sm">{currentUser?.initials ?? '--'}</div>
        </div>
      </div>
    </header>
  )
}
