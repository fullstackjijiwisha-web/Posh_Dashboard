import { Navigate, Route, Routes } from 'react-router-dom'
import { RoleProvider } from './lib/role-context'
import { AppLayout } from './components/layout/AppLayout'
import { SignInPage } from './pages/SignIn'
import { ManagementPage } from './pages/Management'
import { CaseInboxPage } from './pages/CaseInbox'
import { CasesPage } from './pages/Cases'
import { ProceedingsPage } from './pages/Proceedings'
import { DocumentsPage } from './pages/Documents'
import { EvidencePage } from './pages/Evidence'
import { CommunicationsPage } from './pages/Communications'
import { ActionsPage } from './pages/Actions'
import { ReportsPage } from './pages/Reports'
import { AuditPage } from './pages/Audit'
import { SettingsPage } from './pages/Settings'
import { AnnualReportPage } from './pages/AnnualReport'
import { BoardDisclosurePage } from './pages/BoardDisclosure'
import { ComplaintNewPage } from './pages/ComplaintNew'

export default function App() {
  return (
    <RoleProvider>
      <Routes>
        <Route path="/" element={<SignInPage />} />
        <Route path="/complaint/new" element={<ComplaintNewPage />} />
        <Route element={<AppLayout />}>
          <Route path="dashboard" element={<ManagementPage />} />
          <Route path="annual-report" element={<AnnualReportPage />} />
          <Route path="cases" element={<CaseInboxPage />} />
          <Route path="cases/:caseId" element={<CasesPage />} />
          <Route path="proceedings" element={<ProceedingsPage />} />
          <Route path="evidence" element={<EvidencePage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="communications" element={<CommunicationsPage />} />
          <Route path="actions" element={<ActionsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/board-disclosure" element={<BoardDisclosurePage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </RoleProvider>
  )
}
