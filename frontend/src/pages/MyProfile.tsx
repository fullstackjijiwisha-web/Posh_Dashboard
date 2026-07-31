import { Link } from 'react-router-dom'
import { Eye, FileText, Lock, ShieldCheck } from 'lucide-react'
import { useRole } from '../lib/role-context'
import { useWorkflow } from '../lib/workflow/store'
import { ROLE_LABEL } from '../lib/data/types'
import { STAGE_META } from '../lib/workflow/types'
import { auditForCase } from '../lib/data/audit'
import { formatDate, formatAuditTimestamp } from '../lib/format'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'

/**
 * The complainant's own profile.
 *
 * The interesting half is the bottom: a person who has filed a harassment complaint is
 * entitled to know who has been reading their file. The audit trail already records
 * every access; this screen turns it around and shows it from the subject's point of
 * view rather than the compliance officer's.
 */
export function MyProfilePage() {
  const { currentUser, currentRole, can } = useRole()
  const { visibleCases, myAssignedCases, flowFor, committees } = useWorkflow()

  if (!currentUser) return null

  // A complainant asks "who has been reading my file"; a panel member asks "what am I
  // sitting on and what have I touched". Same screen, opposite direction of the log.
  const isComplainant = can('workflow:complainant') && !can('view:all_cases')
  const isCommittee = can('workflow:committee')

  const scope = isCommittee ? myAssignedCases : visibleCases
  const cases = scope.map((c) => ({ record: c, flow: flowFor(c.id) }))

  const myBoards = committees.filter((b) => b.memberIds.includes(currentUser.id))

  const trail = scope
    .flatMap((c) => auditForCase(c.id).map((e) => ({ ...e, caseId: c.id })))
    .filter((e) => ['VIEW', 'DOWNLOAD', 'EXPORT', 'SHARE'].includes(e.action))
    .sort((a, b) => b.at.localeCompare(a.at))

  // For a complainant: everyone except them. For a panel member: only them.
  const accesses = trail
    .filter((e) => (isComplainant ? e.actorId !== currentUser.id : e.actorId === currentUser.id))
    .slice(0, 12)

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>My profile</h1>
          <p>Your details, your cases, and a record of everyone who has opened your file.</p>
        </div>
      </div>

      {/* ── Identity ─────────────────────────────────────────────── */}
      <section className="ep-card">
        <div className="ep-profile-head">
          <span className="ep-avatar-lg">{currentUser.initials}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 500, letterSpacing: '-0.02em' }}>
              {currentUser.name}
            </div>
            <div className="text-13 text-muted" style={{ marginTop: 2 }}>
              {currentUser.designation}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-open">{currentRole ? ROLE_LABEL[currentRole] : ''}</span>
              <span className="meta-pill">{currentUser.location}</span>
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--color-border)', padding: 'var(--space-5)' }}>
          <div className="ep-field-list">
            <div>
              <div className="ep-field-label">Work email</div>
              <div className="ep-field-value">{currentUser.email}</div>
            </div>
            <div>
              <div className="ep-field-label">Employee ID</div>
              <div className="ep-field-value mono">{currentUser.id.toUpperCase()}</div>
            </div>
            <div>
              <div className="ep-field-label">Location</div>
              <div className="ep-field-value">{currentUser.location}</div>
            </div>
            <div>
              <div className="ep-field-label">Access level</div>
              <div className="ep-field-value">{currentRole ? ROLE_LABEL[currentRole] : '—'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Seat and declarations — committee members only ───────── */}
      {isCommittee && (
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <ShieldCheck size={15} strokeWidth={1.5} />
              Your seat and declarations
            </span>
          </div>
          <div className="ep-card-body">
            <div className="ep-field-list">
              <div>
                <div className="ep-field-label">Seat on the committee</div>
                <div className="ep-field-value">{currentRole ? ROLE_LABEL[currentRole] : '—'}</div>
                <div className="text-12 text-faint" style={{ marginTop: 2 }}>
                  {currentRole === 'external_member'
                    ? 'Required by s.4(2)(c) — a member from outside the workplace.'
                    : currentRole === 'presiding_officer'
                      ? 'Chairs the inquiry under s.4(2)(a).'
                      : 'Internal member under s.4(2)(b).'}
                </div>
              </div>
              <div>
                <div className="ep-field-label">Boards you sit on</div>
                <div className="ep-field-value">
                  {myBoards.length ? myBoards.map((b) => b.name).join(', ') : 'Panel as recorded per case'}
                </div>
              </div>
              <div>
                <div className="ep-field-label">Active inquiries</div>
                <div className="ep-field-value">{cases.length}</div>
              </div>
              <div>
                <div className="ep-field-label">Conflict of interest declaration</div>
                <div className="ep-field-value" style={{ color: 'var(--color-accent)' }}>
                  Filed and current
                </div>
                <div className="text-12 text-faint" style={{ marginTop: 2 }}>
                  On the file for every case you sit on. Update it before the next sitting if
                  anything changes.
                </div>
              </div>
              <div>
                <div className="ep-field-label">Independence</div>
                <div className="ep-field-value">
                  {currentRole === 'external_member' ? 'External to this company' : 'Employed by this company'}
                </div>
              </div>
              <div>
                <div className="ep-field-label">Confidentiality undertaking</div>
                <div className="ep-field-value" style={{ color: 'var(--color-accent)' }}>
                  Signed
                </div>
                <div className="text-12 text-faint" style={{ marginTop: 2 }}>
                  Section 16 binds you personally, not only the company.
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── How you appear to others — complainants only ─────────── */}
      {isComplainant && (
      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">
            <ShieldCheck size={15} strokeWidth={1.5} />
            How you appear to others
          </span>
        </div>
        <div className="ep-card-body">
          <div className="ep-field-list">
            <div>
              <div className="ep-field-label">To the Internal Committee</div>
              <div className="ep-field-value">{currentUser.name}</div>
              <div className="text-12 text-faint" style={{ marginTop: 2 }}>
                The panel must know who you are to run the inquiry.
              </div>
            </div>
            <div>
              <div className="ep-field-label">To management and reporting</div>
              <div className="ep-field-value" style={{ color: 'var(--color-accent)' }}>
                Complainant A
              </div>
              <div className="text-12 text-faint" style={{ marginTop: 2 }}>
                Section 16 — your name never reaches a dashboard or an annual return.
              </div>
            </div>
            <div>
              <div className="ep-field-label">To the respondent</div>
              <div className="ep-field-value">Statement of allegations only</div>
              <div className="text-12 text-faint" style={{ marginTop: 2 }}>
                They are told the case against them, not given your file.
              </div>
            </div>
            <div>
              <div className="ep-field-label">In the annual return</div>
              <div className="ep-field-value">Counted, never named</div>
              <div className="text-12 text-faint" style={{ marginTop: 2 }}>
                The District Officer filing carries numbers only.
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ── Your cases ───────────────────────────────────────────── */}
      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">
            <FileText size={15} strokeWidth={1.5} />
            {isCommittee ? 'Cases you sit on' : 'Your cases'}
          </span>
          <span className="meta-pill">{cases.length}</span>
        </div>
        <div className="ep-card-body">
          {cases.length === 0 ? (
            <p className="text-13 text-muted">You have no cases on record.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {cases.map(({ record, flow }) => (
                <div key={record.id} className="ep-past">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Link to={`/cases/${record.id}`} className="mono text-13" style={{ color: 'var(--color-accent)' }}>
                        {record.id}
                      </Link>
                      {flow ? <span className="badge badge-open">{STAGE_META[flow.stage].label}</span> : null}
                    </div>
                    <div className="text-12 text-muted" style={{ marginTop: 4 }}>
                      Filed {formatDate(record.filedDate)} · {record.department} · Day {record.daysElapsed}
                    </div>
                  </div>
                  <Link to={isCommittee ? `/cases/${record.id}` : '/my-complaints'} className="btn btn-secondary">
                    {isCommittee ? 'Open' : 'Track'}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Who has opened your file ─────────────────────────────── */}
      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">
            <Eye size={15} strokeWidth={1.5} />
            {isComplainant ? 'Who has opened your file' : 'Your access record'}
          </span>
          <span className="meta-pill">last {accesses.length}</span>
        </div>
        <div className="ep-card-body tight">
          {accesses.length === 0 ? (
            <p className="text-13 text-muted" style={{ padding: 'var(--space-4) 0' }}>
              No access recorded yet.
            </p>
          ) : (
            accesses.map((e) => (
              <div key={e.id} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                <div style={{ minWidth: 0 }}>
                  <div className="ep-doc-name">
                    {e.actorId === 'system' ? 'System' : e.actorId} — {e.action.toLowerCase()}
                  </div>
                  <div className="ep-doc-meta">{e.detail}</div>
                  <div className="ep-doc-meta mono">
                    {e.caseId} · {e.ip}
                  </div>
                </div>
                <span className="ep-doc-meta mono" style={{ whiteSpace: 'nowrap' }}>
                  {formatAuditTimestamp(e.at)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <p className="ep-confidential">
        <Lock size={12} strokeWidth={2} />
        {isComplainant
          ? 'This access log is append-only. Nobody — including an administrator — can delete an entry from it.'
          : 'Every file you open is recorded here under your name. The log is append-only and you cannot remove an entry from it, including your own.'}
      </p>
    </div>
  )
}
