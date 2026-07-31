import { NavLink } from 'react-router-dom'
import {
  Archive,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileInput,
  Gauge,
  Star,
  TrendingUp,
  FolderOpen,
  FileBadge2,
  FileClock,
  FilePlus2,
  FolderLock,
  Gavel,
  LayoutList,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  LogOut,
  MessagesSquare,
  Route as RouteIcon,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  Fingerprint,
  FileBarChart2,
  UserRound,
  Users,
  UserCog,
} from 'lucide-react'
import { useRole } from '../../lib/role-context'
import { useWorkflow } from '../../lib/workflow/store'
import { ROLE_LABEL, type Permission } from '../../lib/data/types'
import { OPEN_CASES } from '../../lib/data/cases'
import { ACTIONS, HEARINGS } from '../../lib/data/caseDetail'
import './Sidebar.css'

const ICON = { size: 16, strokeWidth: 1.5 } as const

const openActions = ACTIONS.filter((a) => a.status !== 'Done').length
const scheduledHearings = HEARINGS.filter((h) => h.status === 'Scheduled').length

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  badge?: number
  /** Section heading this item sits under. */
  group:
    | 'Workspace'
    | 'Lifecycle'
    | 'Records'
    | 'Administration'
    | 'My case'
    | 'My oversight'
    | 'My inquiries'
    | 'The bench'
    | 'Intake'
    | 'Compliance'
    | 'Case record'
    | 'Console'
    | 'Caseload'
    | 'Establishment'
    | 'Analytics'
    | 'System'
    | 'Support'
  /** Shown only to roles holding this permission. Absent means shown to everyone. */
  needs?: Permission
  /** Shown only to roles holding at least one of these. */
  needsAny?: Permission[]
}

/**
 * The complainant's navigation.
 *
 * A separate list rather than a filtered one, because the difference is not a subset —
 * it is a different product. Every entry below is scoped to one person's own case; none
 * of the caseload-wide record screens appear, since those aggregate other people's
 * inquiries and a complainant has no business in them.
 */
const EMPLOYEE_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard, group: 'My case' },
  { to: '/my-complaints', label: 'Track my complaint', icon: FileClock, group: 'My case' },
  { to: '/complaint/new', label: 'Submit a complaint', icon: FilePlus2, group: 'My case' },
  { to: '/my-documents', label: 'My documents', icon: FolderOpen, group: 'My case' },
  { to: '/notifications', label: 'Notifications', icon: Bell, group: 'My case' },
  { to: '/help', label: 'Help centre', icon: LifeBuoy, group: 'Support' },
  { to: '/workflow', label: 'How the process works', icon: RouteIcon, group: 'Support' },
  { to: '/my-profile', label: 'My profile', icon: UserRound, group: 'Support' },
]

/**
 * The External Member's navigation.
 *
 * Also a separate list. This member sits on the panel but is not employed here, so the
 * organisation's own screens — employee administration, system settings, the annual
 * return, the whole caseload — are not theirs. Every entry below reads only the cases
 * they personally sit on.
 */
const EXTERNAL_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Oversight', icon: LayoutDashboard, group: 'My oversight' },
  { to: '/assigned-cases', label: 'Assigned cases', icon: Gavel, group: 'My oversight' },
  { to: '/summary-workspace', label: 'Summary workspace', icon: LayoutList, group: 'My oversight' },
  { to: '/hearing-calendar', label: 'Hearing calendar', icon: CalendarDays, group: 'My oversight' },
  { to: '/ic-recommendations', label: 'Recommendation centre', icon: Scale, group: 'Case record' },
  { to: '/evidence-register', label: 'Evidence register', icon: Fingerprint, group: 'Case record' },
  { to: '/documents-vault', label: 'Documents vault', icon: FolderLock, group: 'Case record' },
  { to: '/notifications', label: 'Notifications', icon: Bell, group: 'Support' },
  { to: '/workflow', label: 'How the process works', icon: RouteIcon, group: 'Support' },
  { to: '/my-profile', label: 'My profile', icon: UserRound, group: 'Support' },
]

/**
 * The Presiding Officer chairs. The cause list leads, because the question they open
 * the product with is "what is listed before me and can it sit".
 */
const PRESIDING_NAV: NavItem[] = [
  { to: '/dashboard', label: 'The bench', icon: LayoutDashboard, group: 'The bench' },
  { to: '/cause-list', label: 'Cause list', icon: ScrollText, group: 'The bench' },
  { to: '/assigned-cases', label: 'My inquiries', icon: Gavel, group: 'The bench' },
  { to: '/summary-workspace', label: 'Summary workspace', icon: LayoutList, group: 'The bench' },
  { to: '/hearing-calendar', label: 'Hearing calendar', icon: CalendarDays, group: 'The bench' },
  { to: '/ic-recommendations', label: 'Recommendation centre', icon: Scale, group: 'Case record' },
  { to: '/evidence-register', label: 'Evidence register', icon: Fingerprint, group: 'Case record' },
  { to: '/documents-vault', label: 'Documents vault', icon: FolderLock, group: 'Case record' },
  { to: '/committee', label: 'Committee', icon: Users, group: 'Case record' },
  { to: '/notifications', label: 'Notifications', icon: Bell, group: 'Support' },
  { to: '/workflow', label: 'Case lifecycle', icon: RouteIcon, group: 'Support' },
  { to: '/my-profile', label: 'My profile', icon: UserRound, group: 'Support' },
]

/**
 * An internal member does the inquiry. Their tasks and their reading queue lead; they
 * have no administrative screens at all.
 */
const IC_MEMBER_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Inquiry desk', icon: LayoutDashboard, group: 'My inquiries' },
  { to: '/assigned-cases', label: 'Assigned cases', icon: Gavel, group: 'My inquiries' },
  { to: '/my-tasks', label: 'My tasks', icon: ListChecks, group: 'My inquiries' },
  { to: '/summary-workspace', label: 'Summary workspace', icon: LayoutList, group: 'My inquiries' },
  { to: '/hearing-calendar', label: 'My sittings', icon: CalendarDays, group: 'My inquiries' },
  { to: '/evidence-register', label: 'Evidence register', icon: Fingerprint, group: 'Case record' },
  { to: '/ic-recommendations', label: 'Recommendation centre', icon: Scale, group: 'Case record' },
  { to: '/documents-vault', label: 'Documents vault', icon: FolderLock, group: 'Case record' },
  { to: '/notifications', label: 'Notifications', icon: Bell, group: 'Support' },
  { to: '/workflow', label: 'Case lifecycle', icon: RouteIcon, group: 'Support' },
  { to: '/my-profile', label: 'My profile', icon: UserRound, group: 'Support' },
]

/**
 * HR administers and does not adjudicate. Nothing in this list opens inquiry content —
 * no evidence register, no recommendations, no audit trail, no case workspace.
 */
const HR_NAV: NavItem[] = [
  { to: '/dashboard', label: 'HR desk', icon: LayoutDashboard, group: 'Intake' },
  { to: '/intake-desk', label: 'Intake desk', icon: Inbox, group: 'Intake' },
  { to: '/complaint/new', label: 'Register a complaint', icon: FilePlus2, group: 'Intake' },
  { to: '/communications', label: 'Notices & correspondence', icon: MessagesSquare, group: 'Intake' },
  { to: '/compliance', label: 'Employer duties', icon: ClipboardCheck, group: 'Compliance' },
  { to: '/committee', label: 'Committee constitution', icon: Users, group: 'Compliance' },
  { to: '/annual-report', label: 'Annual return', icon: FileBadge2, group: 'Compliance' },
  { to: '/reports', label: 'Reports', icon: FileBarChart2, group: 'Compliance' },
  { to: '/notifications', label: 'Notifications', icon: Bell, group: 'Support' },
  { to: '/workflow', label: 'Case lifecycle', icon: RouteIcon, group: 'Support' },
  { to: '/my-profile', label: 'My profile', icon: UserRound, group: 'Support' },
]

/**
 * Nav is grouped by what the item is for rather than by who can see it, and gated by
 * permission rather than by role name. Adding a role therefore does not require touching
 * this list — the role's permission set decides what appears.
 */
const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Workspace' },
  { to: '/notifications', label: 'Notifications', icon: Bell, group: 'Workspace' },
  { to: '/workflow', label: 'Case lifecycle', icon: RouteIcon, group: 'Workspace' },

  { to: '/complaint/new', label: 'File complaint', icon: FilePlus2, group: 'Lifecycle' },
  // The complainant's own tracker. Everyone else reaches the same case through /cases.
  { to: '/my-complaints', label: 'Track my complaint', icon: Inbox, group: 'Lifecycle', needs: 'workflow:complainant' },
  { to: '/cases', label: 'Cases', icon: Inbox, badge: OPEN_CASES.length, group: 'Lifecycle' },
  {
    to: '/committee',
    label: 'Committee',
    icon: Users,
    group: 'Lifecycle',
    needsAny: ['workflow:administer', 'workflow:committee'],
  },
  {
    to: '/hearings',
    label: 'Hearings',
    icon: CalendarDays,
    badge: scheduledHearings,
    group: 'Lifecycle',
    needsAny: ['workflow:administer', 'workflow:committee'],
  },
  {
    to: '/recommendations',
    label: 'Recommendations',
    icon: Scale,
    group: 'Lifecycle',
    needsAny: ['workflow:administer', 'workflow:committee'],
  },

  // These five were ungated before the workflow layer and stay ungated: the pages
  // already filter their own contents by role, and hiding the nav entry as well would
  // take something away from roles that could previously reach them.
  { to: '/proceedings', label: 'Proceedings', icon: Gavel, group: 'Records' },
  { to: '/evidence', label: 'Evidence', icon: Fingerprint, group: 'Records' },
  { to: '/documents', label: 'Documents', icon: FolderOpen, group: 'Records' },
  { to: '/communications', label: 'Communications', icon: MessagesSquare, group: 'Records' },
  { to: '/actions', label: 'Actions', icon: ListChecks, badge: openActions, group: 'Records' },
  { to: '/archive', label: 'Archive', icon: Archive, group: 'Records' },

  { to: '/annual-report', label: 'Annual report', icon: FileBadge2, group: 'Administration', needsAny: ['view:analytics', 'view:all_cases'] },
  { to: '/reports', label: 'Reports', icon: FileBarChart2, group: 'Administration' },
  { to: '/employees', label: 'Employees & access', icon: UserCog, group: 'Administration', needsAny: ['workflow:administer', 'admin:provision'] },
  { to: '/audit', label: 'Audit trail', icon: ScrollText, group: 'Administration', needs: 'view:audit' },
  { to: '/settings', label: 'Settings', icon: Settings, group: 'Administration', needsAny: ['edit:settings', 'view:analytics'] },
]

/**
 * The POSH Administrator's console.
 *
 * The one role that owns the process end to end, so it gets the longest list — but still
 * an ordered one: the queues that need a person, then the caseload, then the
 * establishment it is run by, then the analytics, then the system underneath.
 */
const ADMIN_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Console' },
  { to: '/filing-ingest', label: 'Filing ingest centre', icon: FileInput, group: 'Console' },
  { to: '/statutory-workspace', label: 'Statutory cases', icon: Gavel, group: 'Console' },
  { to: '/hearings-calendar', label: 'Hearings calendar', icon: CalendarDays, group: 'Console' },
  { to: '/recommendations', label: 'Recommendations', icon: Scale, group: 'Console' },

  { to: '/cases', label: 'All cases', icon: Inbox, badge: OPEN_CASES.length, group: 'Caseload' },
  { to: '/proceedings', label: 'Proceedings', icon: Gavel, group: 'Caseload' },
  { to: '/evidence', label: 'Evidence', icon: Fingerprint, group: 'Caseload' },
  { to: '/documents', label: 'Documents', icon: FolderOpen, group: 'Caseload' },
  { to: '/communications', label: 'Communications', icon: MessagesSquare, group: 'Caseload' },
  { to: '/actions', label: 'Actions', icon: ListChecks, badge: openActions, group: 'Caseload' },
  { to: '/archive', label: 'Archive', icon: Archive, group: 'Caseload' },

  { to: '/employees', label: 'Employee roster', icon: UserCog, group: 'Establishment' },
  { to: '/committee', label: 'Internal Committee', icon: Users, group: 'Establishment' },
  { to: '/compliance', label: 'Employer duties', icon: ClipboardCheck, group: 'Establishment' },

  { to: '/analytics', label: 'Reports & analytics', icon: TrendingUp, group: 'Analytics' },
  { to: '/decision-statistics', label: 'Decision statistics', icon: BarChart3, group: 'Analytics' },
  { to: '/feedback-ratings', label: 'Feedback ratings', icon: Star, group: 'Analytics' },
  { to: '/resolution-audit', label: 'Case resolution audit', icon: Gauge, group: 'Analytics' },
  { to: '/annual-report', label: 'Annual return', icon: FileBadge2, group: 'Analytics' },
  { to: '/reports', label: 'Exports', icon: FileBarChart2, group: 'Analytics' },

  { to: '/notifications', label: 'Notifications', icon: Bell, group: 'System' },
  { to: '/workflow', label: 'Case lifecycle', icon: RouteIcon, group: 'System' },
  { to: '/audit', label: 'Audit logs', icon: ScrollText, group: 'System', needs: 'view:audit' },
  { to: '/settings', label: 'System settings', icon: Settings, group: 'System' },
]

/**
 * The Company Owner sees the administrator's console in full, plus the two things only
 * they hold: provisioning POSH Admins, and setting company policy. Building it by
 * extension rather than by hand means a page added to the admin console cannot go
 * missing from the owner's.
 */
const OWNER_NAV: NavItem[] = [
  ...ADMIN_NAV.filter((i) => i.to !== '/settings'),
  // The aggregate posture view Management lands on, reachable by the owner as well.
  { to: '/command-centre', label: 'Compliance command centre', icon: Gauge, group: 'Analytics' },
  { to: '/company-settings', label: 'Company settings', icon: Building2, group: 'System' },
  { to: '/settings', label: 'System settings', icon: Settings, group: 'System' },
]

/**
 * Management's navigation is one item.
 *
 * They hold `view:analytics` and not `view:identities` — the whole point of the role is
 * that it watches the organisation's posture without ever seeing a party. A caseload
 * link would be an invitation to a screen they should not be on, so there isn't one.
 */
const MANAGEMENT_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Compliance command centre', icon: Gauge, group: 'Console' },
]

const GROUPS = [
  'My case',
  'Console',
  'Caseload',
  'Establishment',
  'Analytics',
  'System',
  'The bench',
  'My inquiries',
  'My oversight',
  'Intake',
  'Case record',
  'Compliance',
  'Support',
  'Workspace',
  'Lifecycle',
  'Records',
  'Administration',
] as const

export function Sidebar() {
  const { currentUser, currentRole, signOut, can } = useRole()
  const { unreadCount } = useWorkflow()

  // Same test the dashboard uses: a person with a case of their own and no sight of
  // anyone else's gets the complainant's product, not the caseload one.
  const isComplainantOnly = can('workflow:complainant') && !can('view:all_cases')

  // One list per role that has obligations of its own shape. Everything else — POSH
  // Admin, Legal, Management, the owner panel — keeps the full caseload navigation.
  const BY_ROLE: Partial<Record<NonNullable<typeof currentRole>, NavItem[]>> = {
    external_member: EXTERNAL_NAV,
    presiding_officer: PRESIDING_NAV,
    ic_member: IC_MEMBER_NAV,
    hr_spoc: HR_NAV,
    posh_admin: ADMIN_NAV,
    super_admin: OWNER_NAV,
    management: MANAGEMENT_NAV,
  }

  const list = isComplainantOnly ? EMPLOYEE_NAV : (currentRole && BY_ROLE[currentRole]) || NAV

  const visible = list.filter((item) => {
    if (item.needs) return can(item.needs)
    if (item.needsAny) return item.needsAny.some(can)
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
        {GROUPS.map((group) => {
          const items = visible.filter((i) => i.group === group)
          if (!items.length) return null
          return (
            <div key={group}>
              <div className="nav-section">{group}</div>
              {items.map((item) => {
                const badge = item.to === '/notifications' ? unreadCount : item.badge
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  >
                    <item.icon {...ICON} />
                    <span>{item.label}</span>
                    {badge ? <span className="nav-badge">{badge}</span> : null}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
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
