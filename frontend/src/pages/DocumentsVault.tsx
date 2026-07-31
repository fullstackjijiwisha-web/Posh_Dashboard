import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, EyeOff, FolderLock, Search } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { documentsFor } from '../lib/data/caseDetail'
import { actorName } from '../lib/data/users'
import { formatFileSize, formatTimestamp } from '../lib/format'
import type { DocumentRecord } from '../lib/data/types'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

const CATEGORIES = ['All', 'Complaint', 'Order', 'Evidence', 'Report', 'Communication', 'Compliance'] as const

/**
 * Documents vault, scoped to the cases this member sits on.
 *
 * The access rule is the document's own `access` field, not the member's seniority. A
 * committee member reads committee material and material circulated to all members;
 * anything marked administrators-only stays shut, and — importantly — the vault says so
 * rather than pretending it does not exist. A panel member who cannot tell the
 * difference between "no such document" and "a document I may not open" cannot ask for
 * it, and asking for it is the whole check.
 */
const READABLE: DocumentRecord['access'][] = ['All members', 'Internal Committee']

export function DocumentsVaultPage() {
  const { myAssignedCases } = useWorkflow()
  const { can } = useRole()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All')
  const [caseFilter, setCaseFilter] = useState('All')

  const all = useMemo(
    () => myAssignedCases.flatMap((c) => documentsFor(c.id).map((d) => ({ ...d, caseId: c.id }))),
    [myAssignedCases],
  )

  const readable = all.filter((d) => READABLE.includes(d.access))
  const sealed = all.filter((d) => !READABLE.includes(d.access))

  const q = query.trim().toLowerCase()
  const shown = readable
    .filter((d) => caseFilter === 'All' || d.caseId === caseFilter)
    .filter((d) => category === 'All' || d.category === category)
    .filter((d) => !q || [d.name, d.description, d.caseId, d.category].join(' ').toLowerCase().includes(q))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))

  // Grouped by case so the vault reads as a set of files, not one long list.
  const grouped = shown.reduce<Record<string, typeof shown>>((acc, d) => {
    ;(acc[d.caseId] ??= []).push(d)
    return acc
  }, {})

  const sealedInScope = sealed.filter((d) => caseFilter === 'All' || d.caseId === caseFilter)

  const ext = (n: string) => {
    const dot = n.lastIndexOf('.')
    return dot > 0 ? n.slice(dot + 1).toLowerCase() : 'doc'
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Documents vault</h1>
          <p>
            Case files for the inquiries you sit on. Orders, notices, minutes, reports and
            compliance records, grouped by case.
          </p>
        </div>
        <span className="meta-pill">
          {readable.length} available · {sealed.length} restricted
        </span>
      </div>

      <div className="ep-vault-toolbar">
        <div className="ep-vault-search">
          <Search size={15} strokeWidth={1.5} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, description or case"
            aria-label="Search documents"
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
        <select
          className="select"
          value={category}
          onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === 'All' ? 'All categories' : c}
            </option>
          ))}
        </select>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="wf-empty">No document matches those filters.</div>
      ) : (
        Object.entries(grouped).map(([caseId, docs]) => (
          <section key={caseId} className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <FolderLock size={15} strokeWidth={1.5} />
                <Link to={`/cases/${caseId}`} className="mono" style={{ color: 'var(--color-accent)' }}>
                  {caseId}
                </Link>
              </span>
              <span className="meta-pill">{docs.length} files</span>
            </div>
            <div className="ep-card-body tight">
              {docs.map((d) => (
                <div key={d.id} className="ep-doc">
                  <span className={`ep-doc-icon ${ext(d.name) === 'pdf' ? 'pdf' : 'docx'}`}>
                    {ext(d.name).toUpperCase().slice(0, 4)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="ep-doc-name">{d.name}</div>
                    <div className="ep-doc-meta">{d.description}</div>
                    <div className="ep-doc-meta">
                      {d.category} · {d.version} · {formatFileSize(d.sizeKb)} · uploaded by{' '}
                      {actorName(d.uploadedById)} · {formatTimestamp(d.uploadedAt)}
                    </div>
                  </div>
                  <button type="button" className="btn btn-secondary" title="Downloads are logged against your name">
                    <Download {...ICON} />
                    Download
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {/* Restricted material — declared, never rendered. */}
      {sealedInScope.length > 0 && (
        <div className="ep-sealed">
          <EyeOff size={13} strokeWidth={1.5} />
          {sealedInScope.length} further document{sealedInScope.length === 1 ? ' is' : 's are'} on these
          case files and marked administrators-only. Their contents are not loaded into this screen.
          If you need one for the inquiry, ask the POSH Admin — the request and the answer both go on
          the record.
        </div>
      )}

      {!can('view:inquiry') && (
        <p className="text-13 text-muted">Your role cannot open inquiry documents.</p>
      )}
    </div>
  )
}
