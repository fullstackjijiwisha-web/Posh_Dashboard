import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Fingerprint, Lock, Search, ShieldCheck, X } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { useToast } from '../lib/toast'
import { evidenceForCase } from '../lib/data/evidence'
import { actorName, userById } from '../lib/data/users'
import { formatDate, formatTimestamp } from '../lib/format'
import type { EvidenceItem } from '../lib/data/types'
import type { FlowEvidenceItem } from '../lib/workflow/types'
import {
  EVIDENCE_STATES,
  STATE_PILL,
  mimeLabel,
  verifyIntegrity,
  type EvidenceState,
} from '../lib/evidence/model'
import { shortHash } from '../lib/defensibility/hash'
import { EvidencePanel } from '../components/evidence/EvidencePanel'
import { EvidenceDropZone } from '../components/evidence/EvidenceDropZone'
import { EmptyState } from '../components/ui/EmptyState'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/evidence/Evidence.css'

type Filed = FlowEvidenceItem & { caseId: string }

/**
 * Evidence register, scoped to the cases this member sits on.
 *
 * Two lists, because they answer different questions. "Filed" is the working queue —
 * material whose admission the committee still has to decide. "Exhibits" is the record
 * the inquiry may rely on. Mixing them would hide the decision that separates the two,
 * which is the decision s.11 makes the committee answerable for.
 */
export function EvidenceRegisterPage() {
  const { myAssignedCases, flowFor, setEvidenceState } = useWorkflow()
  const { can } = useRole()
  const { push } = useToast()

  const [query, setQuery] = useState('')
  const [caseFilter, setCaseFilter] = useState('All')
  const [stateFilter, setStateFilter] = useState<EvidenceState | 'All'>('All')
  const [partyFilter, setPartyFilter] = useState('All')
  const [open, setOpen] = useState<{ id: string; caseId: string } | null>(null)
  const [exhibitOpen, setExhibitOpen] = useState<EvidenceItem | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkRefusing, setBulkRefusing] = useState(false)
  const [bulkReason, setBulkReason] = useState('')

  const mayDecide = can('workflow:committee') || can('workflow:administer')

  const exhibits = useMemo(
    () => myAssignedCases.flatMap((c) => evidenceForCase(c.id).map((e) => ({ ...e, caseId: c.id }))),
    [myAssignedCases],
  )

  const filed = useMemo<Filed[]>(
    () => myAssignedCases.flatMap((c) => (flowFor(c.id)?.evidence ?? []).map((e) => ({ ...e, caseId: c.id }))),
    [myAssignedCases, flowFor],
  )

  const parties = useMemo(
    () => [...new Set(filed.map((e) => e.uploadedBy))].map((id) => ({ id, name: userById(id)?.name ?? id })),
    [filed],
  )

  const q = query.trim().toLowerCase()
  const matches = (hay: string) => !q || hay.toLowerCase().includes(q)

  const shownFiled = filed.filter(
    (e) =>
      (caseFilter === 'All' || e.caseId === caseFilter) &&
      (stateFilter === 'All' || (e.state ?? 'Submitted') === stateFilter) &&
      (partyFilter === 'All' || e.uploadedBy === partyFilter) &&
      matches([e.label, e.note, e.caseId, e.exhibitNo ?? ''].join(' ')),
  )

  const shownExhibits = exhibits.filter(
    (e) =>
      (caseFilter === 'All' || e.caseId === caseFilter) &&
      matches([e.exhibitNo, e.type, e.description, e.caseId].join(' ')),
  )

  const undecided = filed.filter((e) => ['Submitted', 'Under review'].includes(e.state ?? 'Submitted')).length

  /* --- Bulk ------------------------------------------------------------- */

  const selectable = shownFiled.filter((e) => !e.superseded)
  const allSelected = selectable.length > 0 && selectable.every((e) => selected.has(e.id))

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const chosen = () => shownFiled.filter((e) => selected.has(e.id))

  const bulkAdmit = () => {
    const items = chosen()
    // Each item is logged individually — a bulk action is a convenience for the person
    // doing it, never a shortcut in the record.
    items.forEach((e) => setEvidenceState(e.caseId, e.id, 'Admitted'))
    setSelected(new Set())
    push(`${items.length} item${items.length === 1 ? '' : 's'} admitted to the record`, 'success')
  }

  const bulkRefuse = () => {
    if (!bulkReason.trim()) return
    const items = chosen()
    items.forEach((e) => setEvidenceState(e.caseId, e.id, 'Not admitted', bulkReason))
    setSelected(new Set())
    setBulkRefusing(false)
    setBulkReason('')
    push(`${items.length} item${items.length === 1 ? '' : 's'} not admitted — reason recorded on each`, 'warning')
  }

  const bulkVerify = async () => {
    const items = chosen()
    const results = await Promise.all(items.map((e) => verifyIntegrity(e as never)))
    const bad = results.filter((r) => !r.ok).length
    push(
      bad === 0
        ? `${items.length} item${items.length === 1 ? '' : 's'} verified — all unaltered`
        : `${bad} of ${items.length} FAILED verification`,
      bad === 0 ? 'success' : 'error',
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Evidence register</h1>
          <p>
            Every item on the cases you sit on, with the digest fixed when it arrived and an
            append-only chain of custody. Material awaiting a decision is listed separately from
            the record itself.
          </p>
        </div>
        <span className="meta-pill">
          {shownExhibits.length} exhibits · {undecided} awaiting a decision
        </span>
      </div>

      {/* --- Filters ------------------------------------------------------ */}
      <div className="ep-vault-toolbar">
        <div className="ep-vault-search">
          <Search size={15} strokeWidth={1.5} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by exhibit, description or case"
            aria-label="Search evidence"
          />
        </div>
        <select className="select" value={caseFilter} onChange={(e) => setCaseFilter(e.target.value)} aria-label="Filter by case">
          <option value="All">All my cases</option>
          {myAssignedCases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value as EvidenceState | 'All')}
          aria-label="Filter by admission state"
        >
          <option value="All">Any state</option>
          {EVIDENCE_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="select" value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)} aria-label="Filter by who filed it">
          <option value="All">Any party</option>
          {parties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* --- Bulk bar ----------------------------------------------------- */}
      {selected.size > 0 && (
        <div className="ev-bulk">
          <span className="ev-bulk-count">
            {selected.size} selected
          </span>
          {bulkRefusing ? (
            <>
              <input
                className="input"
                style={{ minWidth: 280, flex: 1 }}
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                placeholder="Reason — recorded against every item"
                autoFocus
              />
              <button type="button" className="btn btn-secondary" onClick={() => setBulkRefusing(false)}>
                Cancel
              </button>
              <button type="button" className="btn wf-btn-danger" onClick={bulkRefuse} disabled={!bulkReason.trim()}>
                Not admitted
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={bulkVerify}>
                <Fingerprint size={14} strokeWidth={1.5} />
                Verify
              </button>
              {mayDecide && (
                <>
                  <button type="button" className="btn btn-primary" onClick={bulkAdmit}>
                    <Check size={14} strokeWidth={1.5} />
                    Admit
                  </button>
                  <button type="button" className="btn wf-btn-danger" onClick={() => setBulkRefusing(true)}>
                    Not admitted
                  </button>
                </>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setSelected(new Set())}>
                <X size={14} strokeWidth={1.5} />
                Clear
              </button>
            </>
          )}
        </div>
      )}

      {/* --- Filed, awaiting a decision ----------------------------------- */}
      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">
            <Fingerprint size={15} strokeWidth={1.5} />
            Filed material
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {selectable.length > 0 && (
              <label className="text-12 text-muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(selectable.map((e) => e.id)))}
                />
                Select all
              </label>
            )}
            <span className="meta-pill">{shownFiled.length}</span>
          </span>
        </div>
        <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {shownFiled.length === 0 ? (
            <EmptyState
              compact
              icon={Fingerprint}
              headline={query || stateFilter !== 'All' ? 'No item matches those filters' : 'Nothing awaiting a decision'}
              detail={
                query || stateFilter !== 'All'
                  ? 'Clear the search or widen the state filter to see the rest of the register.'
                  : 'Material filed by a party appears here until the committee admits it or refuses it with a reason.'
              }
            />
          ) : (
            shownFiled.map((e) => {
              const state = e.state ?? 'Submitted'
              return (
                <div key={`${e.caseId}-${e.id}`} className={`ev-row${selected.has(e.id) ? ' selected' : ''}${e.superseded ? ' superseded' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    disabled={e.superseded}
                    onChange={() => toggle(e.id)}
                    aria-label={`Select ${e.label}`}
                  />
                  <button
                    type="button"
                    style={{ textAlign: 'left', minWidth: 0, background: 'none' }}
                    onClick={() => setOpen({ id: e.id, caseId: e.caseId })}
                  >
                    <span className="ev-row-name">
                      {e.exhibitNo ? <span className="ev-exhibit">{e.exhibitNo}</span> : null}
                      {e.label}
                      {e.superseded ? <span className="meta-pill">Superseded</span> : null}
                      {e.supplementary ? <span className="meta-pill">Supplementary</span> : null}
                    </span>
                    <span className="ev-row-meta">
                      {e.caseId} · {e.uploadedByName} · {formatTimestamp(e.uploadedAt)} · {e.sizeKb} KB ·{' '}
                      {mimeLabel(e.mimeType ?? '')}
                    </span>
                    <span className="ev-row-hash">{e.hash ? shortHash(e.hash, 10) : 'digest pending'}</span>
                  </button>
                  <span className={`badge ${STATE_PILL[state]}`}>{state}</span>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* --- Upload ------------------------------------------------------- */}
      {caseFilter !== 'All' && (
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">File further material on {caseFilter}</span>
          </div>
          <div className="ep-card-body">
            <EvidenceDropZone caseId={caseFilter} />
          </div>
        </section>
      )}

      {/* --- Exhibits on the record --------------------------------------- */}
      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">
            <ShieldCheck size={15} strokeWidth={1.5} />
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
                <tr key={`${e.caseId}-${e.id}`} className="cw-evidence-row" onClick={() => setExhibitOpen(e)}>
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
      </section>

      {!can('view:inquiry') && (
        <p className="ep-confidential">
          <Lock size={12} strokeWidth={2} />
          Evidence is inquiry content. Your role can see this register but not open an item.
        </p>
      )}

      {/* --- Slide-overs --------------------------------------------------- */}
      {open && <EvidencePanel evidenceId={open.id} caseId={open.caseId} onClose={() => setOpen(null)} />}

      {exhibitOpen && (
        <>
          <div className="ev-overlay" onClick={() => setExhibitOpen(null)} />
          <aside className="ev-panel" role="dialog" aria-modal="true" aria-label={`Exhibit ${exhibitOpen.exhibitNo}`}>
            <header className="ev-panel-head">
              <div style={{ minWidth: 0 }}>
                <div className="ev-panel-title">
                  <span className="ev-exhibit">{exhibitOpen.exhibitNo}</span>
                  <span className="badge badge-completed">{exhibitOpen.status}</span>
                </div>
                <h2>{exhibitOpen.type}</h2>
                <p>{exhibitOpen.description}</p>
              </div>
              <button type="button" className="ev-close" onClick={() => setExhibitOpen(null)} aria-label="Close">
                <X size={16} strokeWidth={1.5} />
              </button>
            </header>
            <div className="ev-panel-body">
              <section>
                <div className="cw-section-label">Chain of custody — {exhibitOpen.chainOfCustody.length} events</div>
                <div className="ev-custody">
                  {[...exhibitOpen.chainOfCustody].reverse().map((c) => (
                    <div key={c.id} className="ev-custody-row">
                      <span className="ev-custody-time">{formatTimestamp(c.at)}</span>
                      <span>
                        <span className="ev-custody-action">{c.action}</span>
                        <span className="ev-custody-detail">
                          {actorName(c.actorId)} — {c.note} · {c.ip}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <p className="ev-append-only">
                  <Lock size={11} strokeWidth={2} />
                  Append-only.
                </p>
              </section>
              <Link to={`/cases/${exhibitOpen.caseId}?tab=evidence`} className="btn btn-secondary">
                Open the case
              </Link>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
