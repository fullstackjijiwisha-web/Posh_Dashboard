import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Fingerprint, Lock, Search, X } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { evidenceForCase } from '../lib/data/evidence'
import { actorName, userById } from '../lib/data/users'
import { formatDate, formatTimestamp } from '../lib/format'
import type { EvidenceItem } from '../lib/data/types'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import { EmptyState } from '../components/ui/EmptyState'

/**
 * Evidence register, scoped to the cases this member sits on.
 *
 * The register is the thing a panel member is answerable for: an exhibit that cannot be
 * traced from receipt to the sitting it was used in is an exhibit the inquiry cannot
 * safely rely on. So chain of custody is not tucked behind a detail view here — every
 * row opens to the full custody trail, IP addresses and all.
 */
export function EvidenceRegisterPage() {
  const { myAssignedCases, flowFor } = useWorkflow()
  const { can } = useRole()
  const [query, setQuery] = useState('')
  const [caseFilter, setCaseFilter] = useState('All')
  const [open, setOpen] = useState<EvidenceItem | null>(null)

  const exhibits = useMemo(
    () =>
      myAssignedCases.flatMap((c) =>
        evidenceForCase(c.id).map((e) => ({ ...e, caseId: c.id })),
      ),
    [myAssignedCases],
  )

  // Material filed through the workflow, which has no exhibit number until the
  // committee admits it to the record.
  const filed = useMemo(
    () =>
      myAssignedCases.flatMap((c) =>
        (flowFor(c.id)?.evidence ?? []).map((e) => ({ ...e, caseId: c.id })),
      ),
    [myAssignedCases, flowFor],
  )

  const q = query.trim().toLowerCase()
  const matches = (hay: string) => !q || hay.toLowerCase().includes(q)

  const shownExhibits = exhibits.filter(
    (e) =>
      (caseFilter === 'All' || e.caseId === caseFilter) &&
      matches([e.exhibitNo, e.type, e.description, e.caseId].join(' ')),
  )
  const shownFiled = filed.filter(
    (e) => (caseFilter === 'All' || e.caseId === caseFilter) && matches([e.label, e.note, e.caseId].join(' ')),
  )

  const pending = shownFiled.filter((e) => e.status === 'Pending verification').length

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Evidence register</h1>
          <p>
            Every exhibit on the cases you sit on, with its chain of custody. Material filed but not
            yet admitted is listed separately.
          </p>
        </div>
        <span className="meta-pill">
          {shownExhibits.length} exhibits · {pending} awaiting verification
        </span>
      </div>

      <div className="ep-vault-toolbar">
        <div className="ep-vault-search">
          <Search size={15} strokeWidth={1.5} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exhibits by number, type or description"
            aria-label="Search evidence"
          />
        </div>
        <select className="select" value={caseFilter} onChange={(e) => setCaseFilter(e.target.value)}>
          <option value="All">All my cases</option>
          {myAssignedCases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id}
            </option>
          ))}
        </select>
      </div>

      {/* ── Admitted exhibits ────────────────────────────────────── */}
      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">
            <Fingerprint size={15} strokeWidth={1.5} />
            Exhibits on the record
          </span>
          <span className="meta-pill">{shownExhibits.length}</span>
        </div>
        <div className="table-wrap" style={{ maxHeight: 'none' }}>
          <table className="data" style={{ minWidth: 860 }}>
            <colgroup>
              <col style={{ width: 90 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 300 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 100 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Exhibit</th>
                <th>Case</th>
                <th>Type</th>
                <th>Description</th>
                <th>Submitted by</th>
                <th className="num">Received</th>
                <th>Custody</th>
              </tr>
            </thead>
            <tbody>
              {shownExhibits.map((e) => (
                <tr key={`${e.caseId}-${e.id}`} className="cw-evidence-row" onClick={() => setOpen(e)}>
                  <td className="mono" style={{ color: 'var(--color-accent)' }}>
                    {e.exhibitNo}
                  </td>
                  <td className="mono text-muted">{e.caseId}</td>
                  <td>{e.type}</td>
                  <td className="truncate-cell" title={e.description}>
                    {e.description}
                  </td>
                  <td>{actorName(e.submittedBy)}</td>
                  <td className="num">{formatDate(e.receivedOn)}</td>
                  <td>
                    <span className="badge badge-completed">{e.chainOfCustody.length} events</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 'var(--space-3) var(--space-5)', fontSize: 'var(--text-xs)', color: 'var(--color-secondary-text)' }}>
          Click any row for the full chain of custody.
        </div>
      </section>

      {/* ── Filed, not yet admitted ──────────────────────────────── */}
      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">Filed, awaiting the committee</span>
          <span className="meta-pill">{shownFiled.length}</span>
        </div>
        <div className="ep-card-body tight">
          {shownFiled.length === 0 ? (
            <EmptyState
              compact
              icon={Fingerprint}
              headline="Nothing awaiting admission"
              detail="Material filed by a party appears here until the committee admits it to the record or asks for more."
            />
          ) : (
            shownFiled.map((e) => (
              <div key={`${e.caseId}-${e.id}`} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                <div style={{ minWidth: 0 }}>
                  <div className="ep-doc-name">{e.label}</div>
                  <div className="ep-doc-meta">{e.note}</div>
                  <div className="ep-doc-meta">
                    <Link to={`/cases/${e.caseId}`} className="mono" style={{ color: 'var(--color-accent)' }}>
                      {e.caseId}
                    </Link>{' '}
                    · filed {formatTimestamp(e.uploadedAt)}
                    {e.supplementary ? ' · supplementary' : ''}
                  </div>
                </div>
                <span className={`badge ${e.status === 'Verified' ? 'badge-completed' : 'badge-medium'}`}>
                  {e.status}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {!can('view:inquiry') && (
        <p className="text-13 text-muted">Your role cannot open inquiry content.</p>
      )}

      {/* ── Chain of custody slide-over ──────────────────────────── */}
      {open && (
        <>
          <div className="cw-slide-overlay" onClick={() => setOpen(null)} />
          <div className="cw-slide-panel">
            <div className="cw-slide-head">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ fontSize: 'var(--text-lg)', color: 'var(--color-accent)' }}>
                    {open.exhibitNo}
                  </span>
                  <span className="badge badge-completed">{open.status}</span>
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-secondary-text)', marginTop: 4 }}>
                  {open.type} · submitted by {actorName(open.submittedBy)}
                </p>
              </div>
              <button type="button" className="cw-slide-close" onClick={() => setOpen(null)}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <div className="cw-slide-body">
              <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, marginBottom: 24 }}>{open.description}</p>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 500,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: 'var(--color-secondary-text)',
                  marginBottom: 12,
                }}
              >
                Chain of custody — {open.chainOfCustody.length} events
              </div>
              {open.chainOfCustody.map((ev) => (
                <div key={ev.id} className="cw-custody-event">
                  <div className="cw-custody-time">{formatTimestamp(ev.at)}</div>
                  <div className="cw-custody-action">
                    {actorName(ev.actorId)} — {ev.action}
                  </div>
                  <div className="cw-custody-meta">
                    {userById(ev.actorId)?.designation ?? ev.actorId} · {ev.note}
                  </div>
                  <div className="cw-custody-meta" style={{ fontFamily: 'var(--font-mono)' }}>
                    IP: {ev.ip}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <p className="ep-confidential">
        <Lock size={12} strokeWidth={2} />
        Opening an exhibit adds a custody event under your name. The trail cannot be edited.
      </p>
    </div>
  )
}
