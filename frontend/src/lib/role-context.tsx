import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CASES } from './data/cases'
import { USER_BY_ROLE } from './data/users'
import type { Case, Permission, Role, User } from './data/types'

/**
 * Demo authentication.
 *
 * State is held in memory ONLY — deliberately not localStorage. Refreshing resets the
 * prototype to a clean signed-out state, which is the behaviour we want when handing
 * the laptop to someone mid-demo.
 *
 * The permission matrix below is the substance of the demo, not decoration. The two
 * rules that carry legal weight:
 *   - `management` never sees a real name. Not on any screen, in any state. This is
 *     s.16 of the PoSH Act, and it is enforced by `maskParty` returning the fixed
 *     label rather than by each screen remembering to check.
 *   - `employee` sees only their own case, and never the respondent's identity.
 */

const PERMISSIONS: Record<Role, Permission[]> = {
  // Sees only their own case; respondent identity withheld.
  employee: ['view:inquiry'],
  // Intake and administrative fields only — no inquiry content.
  hr_spoc: ['view:identities', 'view:all_cases', 'edit:intake'],
  // Full access to assigned cases.
  presiding_officer: [
    'view:identities',
    'view:all_cases',
    'view:inquiry',
    'view:audit',
    'view:analytics',
    'edit:intake',
    'edit:inquiry',
  ],
  ic_member: ['view:identities', 'view:all_cases', 'view:inquiry', 'view:audit', 'edit:inquiry'],
  external_member: ['view:identities', 'view:all_cases', 'view:inquiry', 'view:audit'],
  // Read-only: closed cases and audit trails.
  legal: ['view:identities', 'view:all_cases', 'view:audit', 'view:analytics'],
  // Aggregate statistics only. Note the absence of 'view:identities'.
  management: ['view:all_cases', 'view:analytics'],
  super_admin: [
    'view:identities',
    'view:all_cases',
    'view:inquiry',
    'view:audit',
    'view:analytics',
    'edit:intake',
    'edit:inquiry',
    'edit:settings',
  ],
}

/** The employee persona owns the flagship case as complainant. */
const EMPLOYEE_CASE_ID = 'POSH-2026-0142'

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

export function RoleProvider({ children }: { children: ReactNode }) {
  // In memory only. A refresh returns the demo to the sign-in screen by design.
  const [currentRole, setCurrentRole] = useState<Role | null>(null)

  const currentUser = currentRole ? USER_BY_ROLE[currentRole] : null

  const can = useCallback(
    (permission: Permission) =>
      currentRole ? PERMISSIONS[currentRole].includes(permission) : false,
    [currentRole],
  )

  const visibleCases = useMemo(() => {
    if (!currentRole) return []
    if (currentRole === 'employee') return CASES.filter((c) => c.id === EMPLOYEE_CASE_ID)
    // Legal is read-only over closed cases and audit trails.
    if (currentRole === 'legal') return CASES.filter((c) => c.stage === 'closed' || c.stage === 'archived')
    return CASES
  }, [currentRole])

  const value = useMemo<RoleState>(() => {
    const visibleIds = new Set(visibleCases.map((c) => c.id))
    const identities = can('view:identities')

    return {
      currentUser,
      currentRole,
      setRole: setCurrentRole,
      signOut: () => setCurrentRole(null),
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
  }, [currentUser, currentRole, can, visibleCases])

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used within RoleProvider')
  return ctx
}
