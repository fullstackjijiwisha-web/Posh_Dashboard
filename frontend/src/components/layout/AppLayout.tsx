import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import './AppLayout.css'

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/complaints': 'Complaints',
  '/cases': 'Case Workspace',
  '/proceedings': 'Proceedings',
  '/documents': 'Documents',
  '/evidence': 'Evidence',
  '/actions': 'Action Tracker',
  '/reports': 'Reports & Exports',
  '/audit': 'Audit Log',
  '/settings': 'Settings',
}

export function AppLayout() {
  const { pathname } = useLocation()
  const title = TITLES[pathname] || 'POSH'

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar title={title} />
        <main className="app-content slide-up">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
