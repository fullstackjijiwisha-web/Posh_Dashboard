import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar, type Crumb } from './Topbar'
import { useRole } from '../../lib/role-context'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { caseById } from '../../lib/data/cases'
import './AppLayout.css'

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/cases': 'Cases',
  '/proceedings': 'Proceedings',
  '/evidence': 'Evidence',
  '/documents': 'Documents',
  '/communications': 'Communications',
  '/actions': 'Actions',
  '/reports': 'Reports',
  '/reports/board-disclosure': "Board's Report disclosure",
  '/audit': 'Audit trail',
  '/settings': 'Settings',
  '/annual-report': 'Annual report',
}

/** 200ms placeholder on route change, so navigation reads as fetching real data. */
function RouteSkeleton() {
  return (
    <div className="skeleton-page" aria-hidden="true">
      <div className="sk-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="sk" style={{ height: 96 }} />
        ))}
      </div>
      <div className="sk-row" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="sk" style={{ height: 300 }} />
        <div className="sk" style={{ height: 300 }} />
      </div>
      <div className="sk" style={{ height: 320 }} />
    </div>
  )
}

export function AppLayout() {
  const { pathname } = useLocation()
  const { currentRole } = useRole()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 200)
    return () => clearTimeout(t)
  }, [pathname])

  const caseId = pathname.startsWith('/cases/')
    ? decodeURIComponent(pathname.slice('/cases/'.length))
    : null
  const record = caseId ? caseById(caseId) : undefined

  const section =
    TITLES[pathname] ??
    (pathname.startsWith('/reports/') ? "Board's Report disclosure" : 'Sentinel')
  const heading = caseId ? caseId : section

  const crumbs: Crumb[] = caseId
    ? [{ label: 'Cases', to: '/cases' }, { label: record?.id ?? caseId }]
    : pathname.startsWith('/reports/')
      ? [
          { label: 'Sentinel', to: '/dashboard' },
          { label: 'Reports', to: '/reports' },
          { label: section },
        ]
      : [{ label: 'Sentinel', to: '/dashboard' }, { label: section }]

  useDocumentTitle(caseId ? `Case ${caseId}` : heading)

  // Signing out clears the in-memory role; there is nothing to return to.
  if (!currentRole) return <Navigate to="/" replace />

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar crumbs={crumbs} />
        <main className="app-content">{loading ? <RouteSkeleton /> : <Outlet />}</main>
      </div>
    </div>
  )
}
