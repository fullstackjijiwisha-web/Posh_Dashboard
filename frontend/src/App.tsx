import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { RoleProvider, useRole } from './lib/role-context'
import { WorkflowProvider } from './lib/workflow/store'
import { AppLayout } from './components/layout/AppLayout'
import { SignInPage } from './pages/SignIn'
import { DashboardHomePage } from './pages/DashboardHome'
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
import { WorkflowMapPage } from './pages/WorkflowMap'
import { CommitteePage } from './pages/Committee'
import { EmployeesPage } from './pages/Employees'
import { TrackComplaintPage } from './pages/TrackComplaint'
import { RecommendationsPage } from './pages/Recommendations'
import { HearingsPage } from './pages/Hearings'
import { NotificationsPage } from './pages/Notifications'
import { ArchivePage } from './pages/Archive'
import { MyDocumentsPage } from './pages/MyDocuments'
import { HelpCentrePage } from './pages/HelpCentre'
import { MyProfilePage } from './pages/MyProfile'
import { AssignedCasesPage } from './pages/AssignedCases'
import { SummaryWorkspacePage } from './pages/SummaryWorkspace'
import { HearingCalendarPage } from './pages/HearingCalendar'
import { ICRecommendationsPage } from './pages/ICRecommendations'
import { EvidenceRegisterPage } from './pages/EvidenceRegister'
import { DocumentsVaultPage } from './pages/DocumentsVault'
import { CauseListPage } from './pages/CauseList'
import { MyTasksPage } from './pages/MyTasks'
import { IntakeDeskPage } from './pages/IntakeDesk'
import { CompliancePage } from './pages/Compliance'
import { FilingIngestPage } from './pages/FilingIngest'
import { StatutoryWorkspacePage } from './pages/StatutoryWorkspace'
import { HearingsAdminPage } from './pages/HearingsAdmin'
import { AnalyticsPage } from './pages/Analytics'
import { DecisionStatisticsPage } from './pages/DecisionStatistics'
import { FeedbackRatingsPage } from './pages/FeedbackRatings'
import { ResolutionAuditPage } from './pages/ResolutionAudit'
import { CompanySettingsPage } from './pages/CompanySettings'

/**
 * Keeps the organisation-wide screens to the people who run the organisation.
 *
 * Hiding a nav entry is presentation; this is the actual boundary. Two roles are turned
 * away, for different reasons:
 *
 *   A complainant has one case and no business in anyone else's.
 *
 *   The External Member sits on the panel but is not employed here. Employee
 *   administration, system settings and the employer's own statutory filing are not an
 *   outside adviser's to see, and the caseload-wide record screens would hand them every
 *   inquiry in the company rather than the ones they were nominated to. They have
 *   scoped equivalents of each: assigned cases, evidence register, documents vault.
 *
 * The per-case workspace is deliberately not behind this guard — it runs its own check.
 */
function OrgScreensOnly() {
  const { can, currentRole } = useRole()
  const isComplainantOnly = can('workflow:complainant') && !can('view:all_cases')
  const isExternal = currentRole === 'external_member'
  return isComplainantOnly || isExternal ? <Navigate to="/dashboard" replace /> : <Outlet />
}

/**
 * Inquiry content — depositions, evidence, hearings, findings.
 *
 * `view:inquiry` is the line the Act draws and the line this product enforces. HR SPOC
 * administers the whole process and does not hold it; nor does Legal, whose access is
 * read-only over closed cases and the audit trail. Neither should reach a live
 * deposition by typing a URL, so the boundary is a route guard and not a hidden link.
 */
function InquiryOnly() {
  const { can } = useRole()
  return can('view:inquiry') ? <Outlet /> : <Navigate to="/dashboard" replace />
}

/** Screens that belong to a member of the committee, in their capacity as one. */
function CommitteeOnly() {
  const { can } = useRole()
  return can('workflow:committee') ? <Outlet /> : <Navigate to="/dashboard" replace />
}

/**
 * The audit trail.
 *
 * It records who read what, which makes it more sensitive than most of what it indexes —
 * a reader who cannot open a case can still learn a great deal from watching who did.
 * HR SPOC administers the process and does not hold `view:audit`.
 */
function AuditOnly() {
  const { can } = useRole()
  return can('view:audit') ? <Outlet /> : <Navigate to="/dashboard" replace />
}

/**
 * Company policy — the owner's surface.
 *
 * Rendering it read-only to everyone else would be defensible, but it is the employer's
 * own governance position and not a reference page. `edit:settings` is held by the owner
 * panel alone, so that is the test.
 */
function OwnerOnly() {
  const { can } = useRole()
  return can('edit:settings') ? <Outlet /> : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <RoleProvider>
      {/* Workflow state sits inside the role provider because every transition is gated
          on who is signed in. */}
      <WorkflowProvider>
        <Routes>
          <Route path="/" element={<SignInPage />} />
          <Route path="/complaint/new" element={<ComplaintNewPage />} />
          <Route element={<AppLayout />}>
            {/* Open to every signed-in role. */}
            <Route path="dashboard" element={<DashboardHomePage />} />
            <Route path="workflow" element={<WorkflowMapPage />} />
            <Route path="notifications" element={<NotificationsPage />} />

            {/* The case workspace is inquiry content. */}
            <Route element={<InquiryOnly />}>
              <Route path="cases/:caseId" element={<CasesPage />} />
            </Route>

            {/* The complainant's own portal. */}
            <Route path="my-complaints" element={<TrackComplaintPage />} />
            <Route path="my-documents" element={<MyDocumentsPage />} />
            <Route path="my-profile" element={<MyProfilePage />} />
            <Route path="help" element={<HelpCentrePage />} />

            {/* Committee members' own scope — every one of these reads only the cases
                the signed-in member personally sits on. */}
            <Route element={<CommitteeOnly />}>
              <Route path="assigned-cases" element={<AssignedCasesPage />} />
              <Route path="summary-workspace" element={<SummaryWorkspacePage />} />
              <Route path="hearing-calendar" element={<HearingCalendarPage />} />
              <Route path="ic-recommendations" element={<ICRecommendationsPage />} />
              <Route path="evidence-register" element={<EvidenceRegisterPage />} />
              <Route path="documents-vault" element={<DocumentsVaultPage />} />
              <Route path="cause-list" element={<CauseListPage />} />
              <Route path="my-tasks" element={<MyTasksPage />} />
            </Route>

            {/* HR's own desk — intake and compliance, never inquiry content. */}
            <Route path="intake-desk" element={<IntakeDeskPage />} />
            <Route path="compliance" element={<CompliancePage />} />

            {/* Organisation-wide screens. */}
            <Route element={<OrgScreensOnly />}>
              <Route path="annual-report" element={<AnnualReportPage />} />
              <Route path="cases" element={<CaseInboxPage />} />
              <Route path="committee" element={<CommitteePage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="hearings" element={<HearingsPage />} />
              <Route path="recommendations" element={<RecommendationsPage />} />
              <Route path="archive" element={<ArchivePage />} />
              <Route element={<InquiryOnly />}>
                <Route path="proceedings" element={<ProceedingsPage />} />
                <Route path="evidence" element={<EvidencePage />} />
              </Route>
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="communications" element={<CommunicationsPage />} />
              <Route path="actions" element={<ActionsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="reports/board-disclosure" element={<BoardDisclosurePage />} />

              {/* The administrator's console. Every one of these reads the whole
                  caseload, so they sit inside the organisation-wide guard. */}
              <Route path="filing-ingest" element={<FilingIngestPage />} />
              <Route path="statutory-workspace" element={<StatutoryWorkspacePage />} />
              <Route path="hearings-calendar" element={<HearingsAdminPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="decision-statistics" element={<DecisionStatisticsPage />} />
              <Route path="feedback-ratings" element={<FeedbackRatingsPage />} />
              <Route path="resolution-audit" element={<ResolutionAuditPage />} />
              <Route element={<OwnerOnly />}>
                <Route path="company-settings" element={<CompanySettingsPage />} />
                {/* The same compliance command centre Management lands on. The owner
                    governs the organisation as well as the process, so they get the
                    aggregate posture view alongside their own console. */}
                <Route path="command-centre" element={<ManagementPage />} />
              </Route>
              <Route element={<AuditOnly />}>
                <Route path="audit" element={<AuditPage />} />
              </Route>
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </WorkflowProvider>
    </RoleProvider>
  )
}
