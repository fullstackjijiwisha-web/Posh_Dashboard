import { useState } from 'react'
import { ShieldPlus, UserPlus } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { USERS } from '../lib/data/users'
import { ROLE_LABEL } from '../lib/data/types'
import { DEPARTMENTS } from '../lib/data/cases'
import { formatDate } from '../lib/format'
import '../components/workflow/Workflow.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

/**
 * Employee and access administration.
 *
 * The first step of the lifecycle is not a complaint — it is the Company Owner creating
 * a POSH Admin, because until somebody holds that role there is nobody to screen an
 * intake. That step lives here. `admin:provision` is the only capability in the whole
 * permission matrix that exactly one role holds.
 */
export function EmployeesPage() {
  const { admins, createAdminAccount } = useWorkflow()
  const { can, currentRole } = useRole()

  const canProvision = can('admin:provision')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', department: 'Human Resources' })

  const submit = () => {
    if (!form.name.trim() || !form.email.trim()) return
    createAdminAccount({ name: form.name.trim(), email: form.email.trim(), department: form.department })
    setForm({ name: '', email: '', department: 'Human Resources' })
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="page-header">
        <div>
          <h1>Employees and access</h1>
          <p>
            The directory of people who hold a role on this platform. Provisioning a POSH Admin is
            reserved to the Company Owner — it is the step that starts everything else.
          </p>
        </div>
        {canProvision && !open && (
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            <ShieldPlus {...ICON} />
            Create POSH Admin
          </button>
        )}
      </div>

      {/* ── Provision a POSH Admin ───────────────────────────────── */}
      {canProvision && open && (
        <section className="card card-pad">
          <div className="wf-form">
            <div className="wf-form-row">
              <label className="wf-field">
                Full name
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Anita Sharma"
                />
              </label>
              <label className="wf-field">
                Work email
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@company.co.in"
                />
              </label>
              <label className="wf-field">
                Department
                <select
                  className="select"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                >
                  {['Human Resources', ...DEPARTMENTS.filter((d) => d !== 'Human Resources')].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-12 text-muted">
              A POSH Admin can screen complaints, open dockets, assign committee boards, audit
              recommendations and record the employer's decision. They never sit on the committee.
            </p>
            <div className="wf-note-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={submit}
                disabled={!form.name.trim() || !form.email.trim()}
              >
                <UserPlus {...ICON} />
                Provision account
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── POSH Admin accounts ──────────────────────────────────── */}
      <section>
        <div className="cw-section-label" style={{ marginBottom: 12 }}>
          POSH Admin accounts — {admins.length}
        </div>
        <div className="wf-list">
          {admins.map((a) => (
            <div key={a.id} className="wf-list-item">
              <div style={{ minWidth: 0 }}>
                <div className="wf-list-title">
                  {a.name}
                  <span className="badge badge-completed">POSH Admin</span>
                </div>
                <div className="wf-list-meta">
                  {a.email} · {a.department}
                </div>
              </div>
              <span className="wf-list-meta" style={{ marginTop: 0, flexShrink: 0 }}>
                Provisioned {formatDate(a.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Full directory ───────────────────────────────────────── */}
      <section className="card">
        <div
          className="cw-panel-head"
          style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)' }}
        >
          <h2 className="cw-panel-title">Role directory</h2>
          <span className="meta-pill">{USERS.length} accounts</span>
        </div>
        <div className="table-wrap" style={{ maxHeight: 'none' }}>
          <table className="data" style={{ minWidth: 760 }}>
            <colgroup>
              <col style={{ width: 180 }} />
              <col style={{ width: 200 }} />
              <col style={{ width: 240 }} />
              <col style={{ width: 200 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Designation</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {USERS.map((u) => (
                <tr key={u.id} style={u.role === currentRole ? { background: 'var(--color-raised)' } : undefined}>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span className="avatar sm">{u.initials}</span>
                      {u.name}
                    </span>
                  </td>
                  <td className="text-muted">{ROLE_LABEL[u.role]}</td>
                  <td className="truncate-cell" title={u.designation}>
                    {u.designation}
                  </td>
                  <td className="text-muted">{u.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!canProvision && (
        <p className="text-13 text-muted">
          Creating a POSH Admin requires the Company Owner / Super Admin panel. Your role
          ({currentRole ? ROLE_LABEL[currentRole] : '—'}) can read this directory but not change it.
        </p>
      )}
    </div>
  )
}
