import { useState } from 'react'
import { Download, Inbox, Lock, Upload } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { documentsFor, communicationsFor } from '../lib/data/caseDetail'
import { formatDate, formatFileSize, formatTimestamp } from '../lib/format'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

type Tab = 'Received' | 'Submitted'

interface Row {
  id: string
  name: string
  detail: string
  at: string
  caseId: string
  kind: string
  ext: string
}

const extOf = (name: string) => {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : 'doc'
}

/**
 * The complainant's document wallet.
 *
 * Two rules decide what appears here, and they are not the same rule.
 *
 * SUBMITTED is everything they filed themselves — always theirs to see back.
 *
 * RECEIVED is narrower than "every document on the case". Committee working papers,
 * draft findings, the respondent's reply and the conflict declarations are all on the
 * file and none of them are the complainant's to read while the inquiry runs. So the
 * filter is by the document's own `access` field: only material marked for all members,
 * plus notices actually addressed to them, plus the final decision once it has been
 * served. Anything else is not merely hidden — it is not fetched into this component.
 */
export function MyDocumentsPage() {
  const { visibleCases, flowFor } = useWorkflow()
  const [tab, setTab] = useState<Tab>('Received')

  const submitted: Row[] = []
  const received: Row[] = []

  for (const record of visibleCases) {
    const flow = flowFor(record.id)
    if (!flow) continue

    // --- Submitted: their own evidence and annexures.
    for (const e of flow.evidence) {
      submitted.push({
        id: e.id,
        name: e.label,
        detail: `${e.note}${e.supplementary ? ' · filed after a committee request' : ''} — ${e.status}`,
        at: e.uploadedAt,
        caseId: record.id,
        kind: e.supplementary ? 'Supplementary evidence' : 'Evidence',
        ext: extOf(e.label),
      })
    }

    // --- Received: only what the complainant is entitled to hold a copy of.
    for (const d of documentsFor(record.id)) {
      if (d.access !== 'All members') continue
      received.push({
        id: d.id,
        name: d.name,
        detail: `${d.description} · ${formatFileSize(d.sizeKb)} · ${d.version}`,
        at: d.uploadedAt,
        caseId: record.id,
        kind: d.category,
        ext: extOf(d.name),
      })
    }

    // Notices addressed to the complainant, as served.
    for (const c of communicationsFor(record.id)) {
      if (c.direction !== 'Outbound' || !c.counterpartyId.includes('complainant')) continue
      received.push({
        id: c.id,
        name: c.subject,
        detail: `${c.channel} · ${c.template} · ${c.deliveryStatus}`,
        at: c.at,
        caseId: record.id,
        kind: 'Notice',
        ext: 'pdf',
      })
    }

    // The outcome, once it has actually been served on them.
    if (
      flow.finalDecision &&
      ['employee_notified', 'decision_viewed', 'feedback_submitted', 'case_archived'].includes(flow.stage)
    ) {
      received.push({
        id: `${record.id}-decision`,
        name: `Final_decision_${record.id}.pdf`,
        detail: `${flow.finalDecision.outcome} — ${flow.finalDecision.action}`,
        at: flow.finalDecision.at,
        caseId: record.id,
        kind: 'Decision',
        ext: 'pdf',
      })
    }
  }

  const sort = (rows: Row[]) => [...rows].sort((a, b) => b.at.localeCompare(a.at))
  const rows = sort(tab === 'Received' ? received : submitted)

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>My documents</h1>
          <p>
            Everything you have filed, and everything the committee has served on you. Committee
            working papers and the respondent’s material are not part of this list.
          </p>
        </div>
        <div className="ep-segment">
          {(['Received', 'Submitted'] as Tab[]).map((t) => (
            <button key={t} type="button" className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t} ({t === 'Received' ? received.length : submitted.length})
            </button>
          ))}
        </div>
      </div>

      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">
            {tab === 'Received' ? <Inbox size={15} strokeWidth={1.5} /> : <Upload size={15} strokeWidth={1.5} />}
            {tab === 'Received' ? 'Served on you' : 'Filed by you'}
          </span>
          <span className="meta-pill">{rows.length} items</span>
        </div>
        <div className="ep-card-body tight">
          {rows.length === 0 ? (
            <p className="text-13 text-muted" style={{ padding: 'var(--space-5) 0' }}>
              {tab === 'Received'
                ? 'Nothing has been served on you yet. Acknowledgements, hearing notices and the final decision appear here.'
                : 'You have not filed any material yet. Anything you attach to a complaint, or upload when the committee asks, appears here.'}
            </p>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="ep-doc">
                <span className={`ep-doc-icon ${tab === 'Submitted' ? 'sent' : r.ext === 'pdf' ? 'pdf' : 'docx'}`}>
                  {r.ext.toUpperCase().slice(0, 4)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="ep-doc-name">{r.name}</div>
                  <div className="ep-doc-meta">{r.detail}</div>
                  <div className="ep-doc-meta">
                    {r.kind} · {r.caseId} · {formatTimestamp(r.at)}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  title="Downloads are recorded against your name in the audit trail"
                >
                  <Download {...ICON} />
                  Download
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">Retention</span>
        </div>
        <div className="ep-card-body">
          <p className="text-13 text-muted" style={{ maxWidth: '76ch', lineHeight: 1.6 }}>
            Case records are retained for seven years from closure, after which the file is sealed
            and access requires an order. Your copies of anything served on you remain available for
            that whole period — including after the case is archived. The earliest case on your
            record was filed{' '}
            {visibleCases.length
              ? formatDate(
                  visibleCases.reduce((a, b) => (a.filedDate < b.filedDate ? a : b)).filedDate,
                )
              : '—'}
            .
          </p>
        </div>
      </section>

      <p className="ep-confidential">
        <Lock size={12} strokeWidth={2} />
        Every download from this page is logged with your name, the document and the time.
      </p>
    </div>
  )
}
