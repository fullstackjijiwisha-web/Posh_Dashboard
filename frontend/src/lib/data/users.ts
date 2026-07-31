import type { Role, User } from './types'

/** One user per role. Avatars are initials — never photographs. */
export const USERS: User[] = [
  {
    id: 'u-emp',
    name: 'Ananya Pillai',
    initials: 'AP',
    email: 'ananya.pillai@company.co.in',
    role: 'employee',
    designation: 'Senior Engineer',
    location: 'Bengaluru — Whitefield',
  },
  {
    id: 'u-hr',
    name: 'Rajesh Kumar',
    initials: 'RK',
    email: 'rajesh.kumar@company.co.in',
    role: 'hr_spoc',
    designation: 'HR Business Partner',
    location: 'Bengaluru — Whitefield',
  },
  {
    id: 'u-padmin',
    name: 'Anita Sharma',
    initials: 'AS',
    email: 'anita.sharma@company.co.in',
    role: 'posh_admin',
    designation: 'HR Lead & POSH Administrator',
    location: 'Mumbai — Andheri East',
  },
  {
    id: 'u-po',
    name: 'Priya Sharma',
    initials: 'PS',
    email: 'priya.sharma@company.co.in',
    role: 'presiding_officer',
    designation: 'Presiding Officer, Internal Committee',
    location: 'Mumbai — Andheri East',
  },
  {
    id: 'u-ic',
    name: 'Vikram Mehta',
    initials: 'VM',
    email: 'vikram.mehta@company.co.in',
    role: 'ic_member',
    designation: 'Internal Committee member',
    location: 'Pune — Hinjawadi',
  },
  {
    id: 'u-ext',
    name: 'Farah Qureshi',
    initials: 'FQ',
    email: 'farah.qureshi@sakhi-legal.org',
    role: 'external_member',
    designation: 'External Member, Sakhi Legal Trust',
    location: 'Delhi',
  },
  {
    id: 'u-legal',
    name: 'Deepak Rao',
    initials: 'DR',
    email: 'deepak.rao@company.co.in',
    // Sits as an internal member. s.4(2)(b) asks for members drawn from employees
    // "preferably committed to the cause of women or who have had experience in social
    // work or have legal knowledge" — counsel on the panel is the third of those, not a
    // separate seat.
    role: 'ic_member',
    designation: 'Associate General Counsel · Internal Committee member',
    location: 'Chennai — Taramani',
  },
  {
    id: 'u-mgmt',
    name: 'Neha Iyer',
    initials: 'NI',
    email: 'neha.iyer@company.co.in',
    role: 'management',
    designation: 'Chief People Officer',
    location: 'Gurugram — Cyber City',
  },
  {
    id: 'u-admin',
    name: 'Saanya Kapoor',
    initials: 'SK',
    email: 'saanya.kapoor@company.co.in',
    role: 'super_admin',
    designation: 'Company Owner & Compliance Systems Administrator',
    location: 'Bengaluru — Whitefield',
  },
]

/**
 * The demo persona for each role — the account the sign-in chips assume.
 *
 * First match wins, not last. More than one user can hold a role (the committee has two
 * internal members), and taking the last would silently hand the persona to whichever
 * entry happened to be added most recently.
 */
export const USER_BY_ROLE: Record<Role, User> = USERS.reduce(
  (acc, u) => (acc[u.role] ? acc : { ...acc, [u.role]: u }),
  {} as Record<Role, User>,
)

const USER_BY_ID = new Map(USERS.map((u) => [u.id, u]))

export function userById(id: string): User | undefined {
  return USER_BY_ID.get(id)
}

/** Display name for an actor id, falling back to the id so nothing renders blank. */
export function actorName(id: string): string {
  if (id === 'system') return 'System'
  return USER_BY_ID.get(id)?.name ?? id
}

export function actorInitials(id: string): string {
  if (id === 'system') return 'SY'
  return USER_BY_ID.get(id)?.initials ?? '??'
}

/** Internal Committee roster — the panel assigned to cases. */
export const IC_ROSTER = USERS.filter((u) =>
  ['presiding_officer', 'ic_member', 'external_member'].includes(u.role),
)
