import { useRole } from '../lib/role-context'
import { ManagementPage } from './Management'
import { EmployeeDashboardPage } from './EmployeeDashboard'
import { ExternalDashboardPage } from './ExternalDashboard'
import { PresidingDashboardPage } from './PresidingDashboard'
import { ICMemberDashboardPage } from './ICMemberDashboard'
import { HRDashboardPage } from './HRDashboard'
import { AdminDashboardPage } from './AdminDashboard'
import { OwnerDashboardPage } from './OwnerDashboard'

/**
 * `/dashboard` means two different things depending on who asks.
 *
 * For everyone running the process it is the compliance command centre — caseload,
 * breaches, the annual return. For a complainant that screen is both useless and
 * disclosive: it is a view of other people's cases. They get their own case instead.
 *
 * The split is on the complainant capability rather than on the role name, so any
 * future role that files on its own behalf lands on the right screen without this
 * component being touched.
 */
export function DashboardHomePage() {
  const { can, currentRole } = useRole()

  // 'workflow:complainant' without 'view:all_cases' is precisely "a person with a case,
  // and no business seeing anyone else's".
  const isComplainantOnly = can('workflow:complainant') && !can('view:all_cases')
  if (isComplainantOnly) return <EmployeeDashboardPage />

  // Each remaining role gets the screen its own obligations are measured against. The
  // compliance command centre is the employer's view of its own exposure — right for the
  // administrator and for management, wrong for everyone whose duty is narrower.
  switch (currentRole) {
    // Outside the company; watches its own inquiries, not the employer's exposure.
    case 'external_member':
      return <ExternalDashboardPage />
    // Answerable for the clock and the quorum.
    case 'presiding_officer':
      return <PresidingDashboardPage />
    // Does the inquiry and signs the finding.
    case 'ic_member':
      return <ICMemberDashboardPage />
    // Administers the process and reads none of it.
    case 'hr_spoc':
      return <HRDashboardPage />
    // Owns the process end to end — the densest console in the product.
    case 'posh_admin':
      return <AdminDashboardPage />
    // The owner panel is the administrator's console plus a governance band, not a
    // different one — OwnerDashboardPage renders the whole admin console beneath it.
    case 'super_admin':
      return <OwnerDashboardPage />
    default:
      return <ManagementPage />
  }
}
