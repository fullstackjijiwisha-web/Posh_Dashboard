import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Scale, Undo2 } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { CoverageRing, FigureTile } from '../components/workflow/Dials'
import { StatusDonut, SliceLegend, HBarChart } from '../components/workflow/Charts'
import { decisionStatistics, type FlowPair } from '../lib/workflow/analytics'
import { formatTimestamp } from '../lib/format'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/workflow/Dials.css'

/**
 * Decision statistics.
 *
 * What the committee actually decided, and what the employer actually did about it. The
 * figure worth watching is not the upheld rate — a high one is not proof of a working
 * process and a low one is not proof of a broken one — but the return rate, which says
 * how often a report went back for modification before it could be accepted.
 */
export function DecisionStatisticsPage() {
  const { allCases, flowFor } = useWorkflow()

  const pairs = useMemo<FlowPair[]>(
    () => allCases.map((record) => ({ record, flow: flowFor(record.id) })).filter((p): p is FlowPair => !!p.flow),
    [allCases, flowFor],
  )

  const stats = useMemo(() => decisionStatistics(pairs), [pairs])

  const decided = pairs.filter((p) => p.flow.finalDecision)
  const withRec = pairs.filter((p) => p.flow.recommendations.length > 0)
  const returnedCases = withRec.filter((p) => p.flow.recommendations.length > 1)

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Decision statistics</h1>
          <p>
            Outcomes recorded, the provisions relied on, and the action directed. Drawn from cases
            where a final decision is on the record.
          </p>
        </div>
        <Link to="/analytics" className="btn btn-secondary">
          Back to analytics
        </Link>
      </div>

      <div className="figure-grid">
        <FigureTile label="Decisions recorded" value={stats.decided} meta={`${withRec.length} recommendations issued`} />
        <FigureTile
          label="Allegation upheld"
          value={stats.decided ? `${Math.round(stats.upheldRate)}%` : '—'}
          meta="Wholly or in part"
        />
        <FigureTile
          label="Reports returned once or more"
          value={withRec.length ? `${Math.round(stats.returnedRate)}%` : '—'}
          tone={stats.returnedRate > 30 ? 'warning' : undefined}
          meta="Sent back for modification before acceptance"
        />
        <FigureTile
          label="Average versions per report"
          value={stats.averageVersions ? stats.averageVersions.toFixed(1) : '—'}
          meta="1.0 means nothing was returned"
        />
      </div>

      <div className="ep-grid">
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <Scale size={15} strokeWidth={1.5} />
              Outcomes
            </span>
            <span className="meta-pill">{stats.decided} decided</span>
          </div>
          <div className="ep-card-body">
            {stats.outcomes.length ? (
              <>
                <StatusDonut data={stats.outcomes} height={210} centreLabel="decided" />
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <SliceLegend data={stats.outcomes} />
                </div>
              </>
            ) : (
              <p className="text-13 text-muted">No final decision has been recorded yet.</p>
            )}
          </div>
        </section>

        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">Action directed</span>
            <span className="meta-pill">s.13(3)</span>
          </div>
          <div className="ep-card-body">
            {stats.actions.length ? (
              <HBarChart data={stats.actions} height={200} hue="#10b981" />
            ) : (
              <p className="text-13 text-muted">No action recorded yet.</p>
            )}
            <p className="text-12 text-muted" style={{ marginTop: 'var(--space-3)', lineHeight: 1.6, maxWidth: '70ch' }}>
              A single decision can direct more than one action — a warning together with training
              and a change of reporting line is one decision and three entries here.
            </p>
          </div>
        </section>
      </div>

      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">Provisions relied on</span>
          <span className="meta-pill">{stats.provisions.length} distinct</span>
        </div>
        <div className="ep-card-body">
          {stats.provisions.length ? (
            <HBarChart data={stats.provisions} height={190} hue="#a78bfa" />
          ) : (
            <p className="text-13 text-muted">No recommendation has cited a provision yet.</p>
          )}
        </div>
      </section>

      {/* Return loop */}
      {returnedCases.length > 0 && (
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <Undo2 size={15} strokeWidth={1.5} />
              Reports returned for modification
            </span>
            <span className="badge badge-medium">{returnedCases.length}</span>
          </div>
          <div className="ep-card-body tight">
            {returnedCases.map(({ record, flow }) => {
              const first = flow.recommendations[0]
              const last = flow.recommendations[flow.recommendations.length - 1]
              return (
                <div key={record.id} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="ep-doc-name">
                      <Link to={`/cases/${record.id}`} className="mono" style={{ color: 'var(--color-accent)' }}>
                        {record.id}
                      </Link>{' '}
                      — {flow.recommendations.length} versions
                    </div>
                    {first.reviewNote ? (
                      <div className="ep-doc-meta">Returned: {first.reviewNote}</div>
                    ) : null}
                    <div className="ep-doc-meta">
                      Latest {formatTimestamp(last.at)} · {last.author}
                    </div>
                  </div>
                  <span className={`badge ${last.status === 'Approved' ? 'badge-completed' : 'badge-progress'}`}>
                    {last.status}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Decision register */}
      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">Decision register</span>
          <span className="meta-pill">{decided.length}</span>
        </div>
        <div className="ep-card-body tight">
          {decided.length === 0 ? (
            <p className="text-13 text-muted" style={{ padding: 'var(--space-4) 0' }}>
              No decision recorded yet.
            </p>
          ) : (
            decided.map(({ record, flow }) => (
              <div key={record.id} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                <div style={{ minWidth: 0 }}>
                  <div className="ep-doc-name">
                    <Link to={`/cases/${record.id}`} className="mono" style={{ color: 'var(--color-accent)' }}>
                      {record.id}
                    </Link>{' '}
                    — {flow.finalDecision!.action}
                  </div>
                  <div className="ep-doc-meta">
                    {record.department} · {formatTimestamp(flow.finalDecision!.at)} · {flow.finalDecision!.note}
                  </div>
                </div>
                <span
                  className={`badge ${
                    flow.finalDecision!.outcome === 'Upheld'
                      ? 'badge-overdue'
                      : flow.finalDecision!.outcome === 'Upheld in part'
                        ? 'badge-medium'
                        : 'badge-low'
                  }`}
                >
                  {flow.finalDecision!.outcome}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">Reading these figures</span>
        </div>
        <div className="ep-card-body" style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center', flexWrap: 'wrap' }}>
          <CoverageRing
            value={100 - stats.returnedRate}
            caption="accepted first time"
            tone={stats.returnedRate > 30 ? 'warning' : 'accent'}
          />
          <p className="text-13 text-muted" style={{ minWidth: 260, flex: 1, lineHeight: 1.7, maxWidth: '70ch' }}>
            A high upheld rate is not evidence that the process works, and a low one is not evidence
            that it does not — both depend on what was filed. The figure that does say something
            about the process is how often a report had to go back before it could be accepted.
            Reports returned repeatedly usually point at the committee needing orientation, not at
            the cases being harder.
          </p>
        </div>
      </section>
    </div>
  )
}
