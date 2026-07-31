import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import type { Role } from '../data/mock'
import { PARTY_LABELS } from '../data/management'

/**
 * Role-derived permissions, in one place.
 *
 * Identity visibility is the important one. Under PoSH Act 2013 s.16 the identity of
 * the complainant, respondent and witnesses may not be published or circulated; the
 * Management role sees aggregate reporting only (see the "Anonymised Dashboard Only"
 * permission on the Management role in data/mock.ts). Every screen that renders a
 * party name must route it through `maskParty` rather than reading the record field
 * directly, so a single flag governs the whole app.
 *
 * IC member names are deliberately NOT masked: they are statutorily published in the
 * annual report (submission format field 2), so they are not confidential.
 */

export interface RolePermissions {
  role: Role
  /** May see complainant / respondent identities. False for Management. */
  canViewIdentities: boolean
  /** Returns the name, or its anonymised stand-in when identities are withheld. */
  maskParty: (name: string, party: 'complainant' | 'respondent') => string
}

const RoleContext = createContext<RolePermissions | null>(null)

const IDENTITY_BLIND: Role[] = ['management']

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const role: Role = user?.role ?? 'management'

  const value = useMemo<RolePermissions>(() => {
    const canViewIdentities = !IDENTITY_BLIND.includes(role)
    return {
      role,
      canViewIdentities,
      maskParty: (name, party) => (canViewIdentities ? name : PARTY_LABELS[party]),
    }
  }, [role])

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used within RoleProvider')
  return ctx
}
