import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ROLES, WORKFLOW_STAGES } from '../data/mock'

const TABS = ['Roles', 'Workflow', 'Retention', 'Audit'] as const

export function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Roles')

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Admin Settings</h1>
          <p>Configure system-wide settings, permissions, and compliance rules</p>
        </div>
      </div>

      <div className="filters">
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
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3>Roles & Permissions</h3>
              <p style={{ color: 'var(--color-secondary-text)', fontSize: 13 }}>
                Manage role-based access control across the platform
              </p>
            </div>
            <button className="btn btn-primary" type="button">
              <Plus size={16} />
              Add Role
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {ROLES.map((r) => (
              <div key={r.name} style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong>{r.name}</strong>
                  <span className="meta-pill">{r.users} users</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {r.perms.map((p) => (
                    <span key={p} className="badge badge-low">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Workflow' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ marginBottom: 12 }}>Configurable Lifecycle</h3>
          <p style={{ color: 'var(--color-secondary-text)', marginBottom: 16, fontSize: 13 }}>
            Complaint → Acknowledgement → Committee → Proceedings → Evidence → Report → Management Action → Closure →
            Archive
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {WORKFLOW_STAGES.map((s) => (
              <span key={s} className="badge badge-open" style={{ padding: '0.45rem 0.75rem' }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {tab === 'Retention' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3>Archive & Retention</h3>
          <p style={{ color: 'var(--color-secondary-text)', marginTop: 8, fontSize: 14 }}>
            Retention, secure deletion, retrieval, and handover policies for closed cases.
          </p>
          <ul style={{ marginTop: 16, paddingLeft: 18, lineHeight: 1.8, fontSize: 14 }}>
            <li>Closed cases retained for 7 years</li>
            <li>Secure deletion with dual approval</li>
            <li>Retrieval logged in audit trail</li>
            <li>Handover pack for legal / district authority</li>
          </ul>
        </div>
      )}

      {tab === 'Audit' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3>Audit Settings</h3>
          <p style={{ color: 'var(--color-secondary-text)', marginTop: 8, fontSize: 14 }}>
            All access is logged. MFA required for admin roles. No AI / transcription / model training without written
            approval.
          </p>
        </div>
      )}
    </div>
  )
}
