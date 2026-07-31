import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Download, Gauge, Search } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { CoverageRing, FigureTile } from '../components/workflow/Dials'
import { resolutionAudit, slaHealth, medianDaysToClosure, type FlowPair } from '../lib/workflow/analytics'
import { formatDate } from '../lib/format'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/workflow/Dials.css'

type Filter = 'All' | 'Within window' | 'Past 90 days' | 'Still running'

/**
 * Case resolution audit.
 *
 * Adherence, case by case, rather than in aggregate. The aggregate figure on the
 * analytics page tells an administrator whether there is a problem; this tells them
 * which case it is. Every inquiry that ran past ninety days shows its recorded reason
 * alongside it, because a breach without a reason is the actual reportable failure —
 * the overrun on its own is not.
 */
export function ResolutionAuditPage() {
  const { allCases, flowFor } = useWorkflow()
  const [filter, setFilter] = useState<Filter>('All')
  const [query, setQuery] = useState('')

  const pairs = useMemo<FlowPair[]>(
    () => allCases.map((record) => ({ record, flow: flowFor(record.id) })).filter((p): p is FlowPair => !!p.flow),
    [allCases, flowFor],
  )

  const rowsAll = useMemo(() => resolutionAudit(pairs), [pairs])
  const sla = useMemo(() => slaHealth(allCases), [allCases])
  const median = useMemo(() => medianDaysToClosure(allCases), [allCases])

  const concluded = rowsAll.filter((r) => !r.running)
  const within = concluded.filter((r) => r.withinWindow)
  const running = rowsAll.filter((r) => r.running)
  // Both kinds of overrun: concluded late, and still running past the window.
  const over = rowsAll.filter((r) => r.exceeded)
  const overWithoutReason = over.filter((r) => !r.breachReason)

  const q = query.trim().toLowerCase()
  const rows = rowsAll
    .filter((r) => {
      if (filter === 'Within window') return r.withinWindow === true
      if (filter === 'Past 90 days') return r.exceeded
      if (filter === 'Still running') return r.running
      return true
    })
    .filter((r) => !q || [r.caseId, r.department, r.stageLabel].join(' ').toLowerCase().includes(q))

  const adherence = concluded.length ? (within.length / concluded.length) * 100 : 100

  /** A CSV of exactly what a District Officer would ask to see. */
  const exportCsv = () => {
    const header = ['Case', 'Filed', 'Days to conclude', 'Within 90 days', 'Stage', 'Department', 'Outcome', 'Recorded reason']
    const body = rows.map((r) =>
      [
        r.caseId,
        r.filedDate,
        r.daysToClose ?? r.daysElapsed,
        r.exceeded ? 'No — exceeded' : r.running ? 'Still running' : 'Yes',
        r.stageLabel,
        r.department,
        r.outcome ?? '',
        (r.breachReason ?? '').replace(/[\r\n]+/g, ' '),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    )
    const blob = new Blob([[header.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'case-resolution-audit.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Case resolution audit</h1>
          <p>
            Adherence to the ninety-day inquiry window, case by case, with the recorded reason
            wherever it was exceeded.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={exportCsv}>
            <Download size={14} strokeWidth={1.5} />
            Export CSV
          </button>
          <Link to="/analytics" className="btn btn-secondary">
            Back to analytics
          </Link>
        </div>
      </div>

      <div className="figure-grid">
        <FigureTile
          label="Concluded within 90 days"
          value={`${within.length}/${concluded.length}`}
          tone={adherence >= 90 ? 'accent' : 'warning'}
          meta={`${Math.round(adherence)}% adherence · s.11(4)`}
        />
        <FigureTile
          label="Exceeded the window"
          value={over.length}
          tone={over.length ? 'danger' : undefined}
          meta={`Reportable under Rule 8(5) · ${over.filter((r) => r.running).length} still running`}
        />
        <FigureTile
          label="Exceeded without a reason"
          value={overWithoutReason.length}
          tone={overWithoutReason.length ? 'danger' : undefined}
          meta={overWithoutReason.length ? 'This is the actual failure' : 'Every overrun is explained'}
        />
        <FigureTile label="Median days to conclude" value={median} meta={`${running.length} inquiries still running`} />
      </div>

      <div className="ep-grid">
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <Gauge size={15} strokeWidth={1.5} />
              Adherence by provision
            </span>
          </div>
          <div className="ep-card-body" style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center', flexWrap: 'wrap' }}>
            <CoverageRing value={sla.overall} caption="within time" tone={sla.overall >= 90 ? 'accent' : 'warning'} size={128} />
            <div style={{ minWidth: 240, flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {sla.bands.map((b) => (
                <div key={b.label} style={{ display: 'grid', gridTemplateColumns: '16px 1fr auto', gap: 10, alignItems: 'center' }}>
                  {b.pct >= 90 ? (
                    <CheckCircle2 size={14} strokeWidth={2} style={{ color: 'var(--color-accent)' }} />
                  ) : (
                    <AlertTriangle size={13} strokeWidth={2} style={{ color: 'var(--color-warning)' }} />
                  )}
                  <span>
                    <span style={{ fontSize: 'var(--text-sm)', display: 'block' }}>{b.label}</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--color-tertiary-text)' }}>
                      {b.provision}
                    </span>
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-secondary-text)', whiteSpace: 'nowrap' }}>
                    {b.met}/{b.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">Overruns and their reasons</span>
            <span className={`badge ${over.length ? 'badge-medium' : 'badge-completed'}`}>{over.length}</span>
          </div>
          <div className="ep-card-body tight">
            {over.length === 0 ? (
              <p className="text-13 text-muted" style={{ padding: 'var(--space-4) 0' }}>
                No inquiry has exceeded the ninety-day window.
              </p>
            ) : (
              over.map((r) => (
                <div key={r.caseId} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="ep-doc-name">
                      <Link to={`/cases/${r.caseId}`} className="mono" style={{ color: 'var(--color-accent)' }}>
                        {r.caseId}
                      </Link>{' '}
                      — {r.running ? `day ${r.daysElapsed}, still running` : `${r.daysToClose} days`}
                    </div>
                    <div className="ep-doc-meta" style={{ color: r.breachReason ? undefined : 'var(--color-danger)' }}>
                      {r.breachReason ?? 'No reason recorded. This is the reportable failure, not the overrun.'}
                    </div>
                  </div>
                  <span className={`badge ${r.breachReason ? 'badge-medium' : 'badge-overdue'}`}>
                    {r.breachReason ? 'Explained' : 'Unexplained'}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ── Register ─────────────────────────────────────────────── */}
      <div className="ep-vault-toolbar">
        <div className="ep-vault-search">
          <Search size={15} strokeWidth={1.5} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by case, department or stage"
            aria-label="Search resolution audit"
          />
        </div>
        <div className="ep-segment">
          {(['All', 'Within window', 'Past 90 days', 'Still running'] as Filter[]).map((f) => (
            <button key={f} type="button" className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">Resolution register</span>
          <span className="meta-pill">{rows.length} cases</span>
        </div>
        <div className="table-wrap" style={{ maxHeight: 'none' }}>
          <table className="data" style={{ minWidth: 960 }}>
            <colgroup>
              <col style={{ width: 140 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 80 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Case</th>
                <th className="num">Filed</th>
                <th className="num">Days</th>
                <th>Window</th>
                <th>Stage</th>
                <th>Department</th>
                <th>Outcome</th>
                <th className="num">Events</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.caseId}>
                  <td className="mono" style={{ color: 'var(--color-accent)' }}>
                    <Link to={`/cases/${r.caseId}`}>{r.caseId}</Link>
                  </td>
                  <td className="num">{formatDate(r.filedDate)}</td>
                  <td className="num">{r.daysToClose ?? r.daysElapsed}</td>
                  <td>
                    {r.exceeded ? (
                      <span className="badge badge-overdue">Exceeded</span>
                    ) : r.running ? (
                      <span className="badge badge-open">Running</span>
                    ) : (
                      <span className="badge badge-completed">Within</span>
                    )}
                  </td>
                  <td className="truncate-cell">{r.stageLabel}</td>
                  <td className="text-muted truncate-cell">{r.department}</td>
                  <td className="text-muted truncate-cell">{r.outcome ?? '—'}</td>
                  <td className="num text-muted">{r.transitions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
