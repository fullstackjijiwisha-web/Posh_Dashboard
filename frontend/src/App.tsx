import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { ComplaintsPage } from './pages/Complaints'
import { CasesPage } from './pages/Cases'
import { ProceedingsPage } from './pages/Proceedings'
import { DocumentsPage } from './pages/Documents'
import { EvidencePage } from './pages/Evidence'
import { ActionsPage } from './pages/Actions'
import { ReportsPage } from './pages/Reports'
import { AuditPage } from './pages/Audit'
import { SettingsPage } from './pages/Settings'
import type { ReactNode } from 'react'

function Protected({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="complaints" element={<ComplaintsPage />} />
          <Route path="cases" element={<CasesPage />} />
          <Route path="proceedings" element={<ProceedingsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="evidence" element={<EvidencePage />} />
          <Route path="actions" element={<ActionsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}
