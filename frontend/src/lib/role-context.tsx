import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CASES } from './data/cases'
import { USER_BY_ROLE } from './data/users'
import { ROLES, type Case, type Permission, type Role, type User } from './data/types'

/**
 * Demo authentication.
 *
 * The signed-in role persists to localStorage so a direct URL survives a reload. It used
 * to be memory-only, which reset the prototype on refresh — pleasant when handing over a
 * laptop, but it made every deep link bounce to the sign-in screen, and "send me that
 * case" is the commonest action in an enterprise tool. Signing out clears it.
 *
 * The permission matrix below is the substance of the demo, not decoration. The two
 * rules that carry legal weight:
 *   - `management` never sees a real name. Not on any screen, in any state. This is
 *     s.16 of the PoSH Act, and it is enforced by `maskParty` returning the fixed
 *     label rather than by each screen remembering to check.
 *   - `employee` sees only their own case, and never the respondent's identity.
 */

const PERMISSIONS: Record<Role, Permission[]> = {
  // Sees only their own case; respondent identity withheld. Acts as complainant:
  // files, uploads evidence when asked, reads the outcome, gives feedback.
  employee: ['view:inquiry', 'workflow:complainant'],
  // Intake and administrative fields only — no inquiry content.
  hr_spoc: ['view:identities', 'view:all_cases', 'edit:intake'],
  // Custodian of the process end to end, but never a member of the committee: screens
  // intake, opens the docket, assigns the board, audits the recommendation, records
  // the employer decision, closes and archives.
  posh_admin: [
    'view:identities',
    'view:all_cases',
    'view:inquiry',
    'view:audit',
    'view:analytics',
    'edit:intake',
    'edit:inquiry',
    'workflow:administer',
  ],
  // Full access to assigned cases.
  presiding_officer: [
    'view:identities',
    'view:all_cases',
    'view:inquiry',
    'view:audit',
    'view:analytics',
    'edit:intake',
    'edit:inquiry',
    'workflow:committee',
  ],
  ic_member: [
    'view:identities',
    'view:all_cases',
    'view:inquiry',
    'view:audit',
    'edit:inquiry',
    'workflow:committee',
  ],
  external_member: [
    'view:identities',
    'view:all_cases',
    'view:inquiry',
    'view:audit',
    'workflow:committee',
  ],
  // Aggregate statistics only. Note the absence of 'view:identities'.
  management: ['view:all_cases', 'view:analytics'],
  // Owner and super administrator are one panel. It provisions POSH Admin accounts —
  // the only capability nobody else holds — and can drive any workflow step so a
  // single sign-in can walk the whole lifecycle during a demo.
  super_admin: [
    'view:identities',
    'view:all_cases',
    'view:inquiry',
    'view:audit',
    'view:analytics',
    'edit:intake',
    'edit:inquiry',
    'edit:settings',
    'workflow:administer',
    'workflow:committee',
    'admin:provision',
  ],
}

/** The employee persona owns the flagship case as complainant. */
const EMPLOYEE_CASE_ID = 'POSH-2026-0142'

/**
 * The one listing rule, exported so the workflow store applies exactly the same test to
 * cases raised during the session. Two copies of this rule would eventually disagree,
 * and the disagreement would be a confidentiality bug rather than a display bug.
 */
export function casesVisibleTo(role: Role | null, cases: Case[]): Case[] {
  if (!role) return []
  if (role === 'employee') return cases.filter((c) => c.id === EMPLOYEE_CASE_ID || c.raisedBy === 'employee')
  return cases
}

export interface RoleState {
  currentUser: User | null
  currentRole: Role | null
  setRole: (role: Role) => void
  signOut: () => void
  can: (permission: Permission) => boolean
  /** Cases the current role is allowed to list. */
  visibleCases: Case[]
  /** True when the role may open this specific case. */
  canOpenCase: (caseId: string) => boolean
  /**
   * The only way a party name should ever reach the screen. Returns the masked label
   * unless the role holds 'view:identities' — and always masks the respondent for an
   * employee, who may see their own case but not who it names.
   */
  maskParty: (
    party: { maskedName: string; actualName: string; role: 'complainant' | 'respondent' | 'witness' },
  ) => string
}

const RoleContext = createContext<RoleState | null>(null)

/** Where the signed-in role is kept between reloads. */
const SESSION_KEY = 'sentinel.session.role'

/**
 * Reads the persisted role synchronously, as a `useState` initialiser.
 *
 * It has to be synchronous. Restoring in an effect leaves one frame where the role is
 * null, and `AppLayout` redirects to the sign-in screen on exactly that condition — so a
 * deep link would bounce to `/` and lose the route before the effect ever ran.
 */
function readStoredRole(): Role | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    return raw && ROLES.includes(raw as Role) ? (raw as Role) : null
  } catch {
    return null
  }
}

export function RoleProvider({ children }: { children: ReactNode }) {
  /**
   * Persisted, not in memory.
   *
   * This reverses the original design, which deliberately kept sign-in in memory so a
   * refresh returned to a clean sign-out state. That behaviour made deep linking
   * impossible — every direct URL bounced to sign-in — and sharing a case link is the
   * commonest action in an enterprise tool. Signing out still clears it.
   */
  const [currentRole, setCurrentRole] = useState<Role | null>(readStoredRole)

  const setRole = useCallback((role: Role) => {
    setCurrentRole(role)
    try {
      window.localStorage.setItem(SESSION_KEY, role)
    } catch {
      // Private browsing or a full quota. The session still works, it just will not
      // survive a reload — which is the old behaviour, so nothing is worse than before.
    }
  }, [])

  const signOut = useCallback(() => {
    setCurrentRole(null)
    try {
      window.localStorage.removeItem(SESSION_KEY)
    } catch {
      /* nothing to clean up */
    }
  }, [])

  const currentUser = currentRole ? USER_BY_ROLE[currentRole] : null

  const can = useCallback(
    (permission: Permission) =>
      currentRole ? PERMISSIONS[currentRole].includes(permission) : false,
    [currentRole],
  )

  // Legal is read-only over closed cases and audit trails; the employee sees only
  // their own. Both rules live in casesVisibleTo so the workflow store shares them.
  const visibleCases = useMemo(() => casesVisibleTo(currentRole, CASES), [currentRole])

  const value = useMemo<RoleState>(() => {
    const visibleIds = new Set(visibleCases.map((c) => c.id))
    const identities = can('view:identities')

    return {
      currentUser,
      currentRole,
      setRole,
      signOut,
      can,
      visibleCases,
      canOpenCase: (caseId) => visibleIds.has(caseId),
      maskParty: (party) => {
        if (!identities) return party.maskedName
        // An employee may see their own case but never the respondent's identity.
        if (currentRole === 'employee' && party.role !== 'complainant') return party.maskedName
        return party.actualName
      },
    }
  }, [currentUser, currentRole, can, visibleCases, setRole, signOut])

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used within RoleProvider')
  return ctx
}
