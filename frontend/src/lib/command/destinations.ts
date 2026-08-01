/**
 * Destinations the command palette can jump to, keyed by role.
 *
 * Mirrors the sidebar lists rather than importing them — the palette must stay usable
 * even if the sidebar grouping changes, and Management only ever sees one destination.
 */

import type { Role } from '../data/types'

export interface NavDestination {
  to: string
  label: string
  keywords?: string
}

const DEST: Record<Role, NavDestination[]> = {
  employee: [
    { to: '/dashboard', label: 'Home' },
    { to: '/my-complaints', label: 'Track my complaint', keywords: 'case tracker' },
    { to: '/complaint/new', label: 'Submit a complaint', keywords: 'file' },
    { to: '/my-documents', label: 'My documents' },
    { to: '/notifications', label: 'Notifications' },
    { to: '/help', label: 'Help centre' },
    { to: '/workflow', label: 'How the process works', keywords: 'lifecycle' },
    { to: '/my-profile', label: 'My profile' },
  ],
  hr_spoc: [
    { to: '/dashboard', label: 'HR desk' },
    { to: '/intake-desk', label: 'Intake desk' },
    { to: '/complaint/new', label: 'Register a complaint' },
    { to: '/communications', label: 'Notices & correspondence' },
    { to: '/compliance', label: 'Employer duties', keywords: 's.19' },
    { to: '/committee', label: 'Committee constitution' },
    { to: '/annual-report', label: 'Annual return' },
    { to: '/reports', label: 'Reports' },
    { to: '/notifications', label: 'Notifications' },
    { to: '/workflow', label: 'Case lifecycle' },
  ],
  posh_admin: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/filing-ingest', label: 'Filing ingest centre' },
    { to: '/statutory-workspace', label: 'Statutory cases' },
    { to: '/hearings-calendar', label: 'Hearings calendar', keywords: 'sitting schedule' },
    { to: '/recommendations', label: 'Recommendations' },
    { to: '/cases', label: 'All cases' },
    { to: '/evidence', label: 'Evidence' },
    { to: '/documents', label: 'Documents' },
    { to: '/analytics', label: 'Reports & analytics' },
    { to: '/annual-report', label: 'Annual return' },
    { to: '/notifications', label: 'Notifications' },
    { to: '/audit', label: 'Audit logs' },
    { to: '/settings', label: 'System settings' },
  ],
  presiding_officer: [
    { to: '/dashboard', label: 'The bench' },
    { to: '/cause-list', label: 'Cause list', keywords: 'sittings' },
    { to: '/assigned-cases', label: 'My inquiries' },
    { to: '/hearing-calendar', label: 'Hearing calendar' },
    { to: '/evidence-register', label: 'Evidence register' },
    { to: '/ic-recommendations', label: 'Recommendation centre' },
    { to: '/documents-vault', label: 'Documents vault' },
    { to: '/committee', label: 'Committee' },
    { to: '/notifications', label: 'Notifications' },
  ],
  ic_member: [
    { to: '/dashboard', label: 'Inquiry desk' },
    { to: '/assigned-cases', label: 'Assigned cases' },
    { to: '/my-tasks', label: 'My tasks' },
    { to: '/hearing-calendar', label: 'My sittings' },
    { to: '/evidence-register', label: 'Evidence register' },
    { to: '/ic-recommendations', label: 'Recommendation centre' },
    { to: '/documents-vault', label: 'Documents vault' },
    { to: '/notifications', label: 'Notifications' },
  ],
  external_member: [
    { to: '/dashboard', label: 'Oversight' },
    { to: '/assigned-cases', label: 'Assigned cases' },
    { to: '/hearing-calendar', label: 'Hearing calendar' },
    { to: '/ic-recommendations', label: 'Recommendation centre' },
    { to: '/evidence-register', label: 'Evidence register' },
    { to: '/documents-vault', label: 'Documents vault' },
    { to: '/notifications', label: 'Notifications' },
  ],
  management: [{ to: '/dashboard', label: 'Compliance command centre' }],
  super_admin: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/filing-ingest', label: 'Filing ingest centre' },
    { to: '/statutory-workspace', label: 'Statutory cases' },
    { to: '/hearings-calendar', label: 'Hearings calendar' },
    { to: '/cases', label: 'All cases' },
    { to: '/command-centre', label: 'Compliance command centre' },
    { to: '/company-settings', label: 'Company settings' },
    { to: '/annual-report', label: 'Annual return' },
    { to: '/notifications', label: 'Notifications' },
    { to: '/settings', label: 'System settings' },
  ],
}

export function destinationsFor(role: Role | null): NavDestination[] {
  if (!role) return []
  return DEST[role] ?? []
}
