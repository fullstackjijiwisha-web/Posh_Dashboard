import { useState } from 'react'
import { Check, Minus, Plus, Shield } from 'lucide-react'
import { WORKFLOW_STAGES } from '../data/mock'
import { ROLE_LABEL, ROLES, type Permission, type Role } from '../lib/data/types'
import { useRole } from '../lib/role-context'

const ICON = { size: 16, strokeWidth: 1.5 } as const
const TABS = ['Roles', 'Workflow', 'Retention', 'Audit'] as const

const PERM_LABEL: Record<Permission, string> = {
  'view:identities': 'See real party names',
  'view:all_cases': 'See all cases',
  'view:inquiry': 'Read inquiry content',
  'view:audit': 'Audit trail',
  'view:analytics': 'Dashboards & annual report',
  'edit:intake': 'Register / edit intake',
  'edit:inquiry': 'Record findings & stages',
  'edit:settings': 'System settings',
  'workflow:administer': 'Screen intake, assign boards, decide',
  'workflow:committee': 'Act for the Internal Committee',
  'workflow:complainant': 'Act as complainant on own case',
  'admin:provision': 'Provision POSH Admin accounts',
}

const MATRIX: Record<Role, Permission[]> = {
  employee: ['view:inquiry', 'workflow:complainant'],
  hr_spoc: ['view:identities', 'view:all_cases', 'edit:intake'],
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
    'workflow:administer',
    'workflow:committee',
    'admin:provision',
  ],
}

const NOTES: Record<Role, string> = {
  employee: 'Own case only. Never sees respondent identity.',
  hr_spoc: 'Intake fields only — cannot open inquiry content.',
  posh_admin: 'Custodian of the process. Never sits on the committee.',
  presiding_officer: 'Full access on assigned cases; drives the inquiry.',
  ic_member: 'Full inquiry access on assigned cases.',
  external_member: 'Inquiry access; conflict declarations required.',
  management: 'Aggregates only. Identities always masked (s.16).',
  super_admin: 'Owner panel. Full platform control; every action logged.',
}

export function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Roles')
  const { can } = useRole()

  if (!can('edit:settings') && !can('view:analytics')) {
    return (
      <div className="card p-8">
        <h2 className="text-16">Settings restricted</h2>
        <p className="mt-2 text-13 text-muted">Your role cannot change system configuration.</p>
      </div>
    )
  }

  const perms = Object.keys(PERM_LABEL) as Permission[]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-20 tracking-[-0.02em]">Settings</h1>
          <p className="mt-1 text-13 text-muted">Need-to-know access · PoSH Act s.16 confidentiality</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t)}
            type="button"
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Roles' && (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 grid h-9 w-9 place-items-center rounded-md"
                style={{ background: 'rgba(16,185,129,0.14)', color: '#6ee7b7' }}
              >
                <Shield {...ICON} />
              </div>
              <div>
                <h3 className="text-16 tracking-[-0.02em]">Who can see what</h3>
                <p className="mt-1 text-13 text-muted">
                  Live permission matrix — the demo switches these when you change role at sign-in
                </p>
              </div>
            </div>
            <button className="btn btn-primary" type="button">
              <Plus {...ICON} />
              Add role
            </button>
          </div>

          <div className="table-wrap" style={{ maxHeight: 'none' }}>
            <table className="data" style={{ minWidth: 980 }}>
              <thead>
                <tr>
                  <th>Role</th>
                  {perms.map((p) => (
                    <th key={p} className="text-center" style={{ fontSize: 10, whiteSpace: 'normal', maxWidth: 88 }}>
                      {PERM_LABEL[p]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLES.map((role) => (
                  <tr key={role}>
                    <td>
                      <div className="font-medium">{ROLE_LABEL[role]}</div>
                      <div className="text-12 text-faint" style={{ maxWidth: 220 }}>
                        {NOTES[role]}
                      </div>
                    </td>
                    {perms.map((p) => {
                      const on = MATRIX[role].includes(p)
                      return (
                        <td key={p} className="text-center">
                          {on ? (
                            <Check size={14} strokeWidth={2} className="inline text-accent" />
                          ) : (
                            <Minus size={14} strokeWidth={2} className="inline text-faint" />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'Workflow' && (
        <section className="card p-5">
          <h3 className="mb-2 text-16 tracking-[-0.02em]">Configurable lifecycle</h3>
          <p className="mb-4 text-13 text-muted">Stages a case moves through, from intake to archive.</p>
          <div className="flex flex-wrap gap-2">
            {WORKFLOW_STAGES.map((s) => (
              <span key={s} className="badge badge-open" style={{ padding: '6px 12px' }}>
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {tab === 'Retention' && (
        <section className="card p-5">
          <h3 className="text-16 tracking-[-0.02em]">Archive and retention</h3>
          <p className="mt-2 text-14 text-muted">
            Retention, secure deletion, retrieval, and handover policies for closed cases.
          </p>
          <ul className="mt-4 flex flex-col gap-2 text-14">
            <li>Closed cases retained for 7 years</li>
            <li>Secure deletion requires dual approval</li>
            <li>Retrieval is recorded in the audit trail</li>
            <li>Handover pack available for the district authority</li>
          </ul>
        </section>
      )}

      {tab === 'Audit' && (
        <section className="card p-5">
          <h3 className="text-16 tracking-[-0.02em]">Dual audit architecture</h3>
          <p className="mt-2 text-14 text-muted">
            <strong className="text-ink">PoSH audit</strong> records case and inquiry events
            (views of evidence, documents, hearings, stage changes).{' '}
            <strong className="text-ink">Technical audit</strong> records logins, MFA, exports,
            and access denials. Both are append-only — even administrators cannot edit or delete
            rows. No AI, transcription, or model training without written approval.
          </p>
        </section>
      )}
    </div>
  )
}
