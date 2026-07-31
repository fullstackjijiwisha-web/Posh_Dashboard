import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Star } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { CoverageRing, FigureTile } from '../components/workflow/Dials'
import { RatingChart } from '../components/workflow/Charts'
import { feedbackSummary, type FlowPair } from '../lib/workflow/analytics'
import { formatTimestamp } from '../lib/format'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/workflow/Dials.css'

function Stars({ n }: { n: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }} aria-label={`${n} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          strokeWidth={1.5}
          style={{
            color: i <= n ? 'var(--color-warning)' : 'var(--color-border-strong)',
            fill: i <= n ? 'var(--color-warning)' : 'none',
          }}
        />
      ))}
    </span>
  )
}

/**
 * Feedback ratings.
 *
 * Process feedback from complainants, after the outcome has been served. It measures how
 * the inquiry was conducted — not whether the complainant got the result they wanted, and
 * the two must not be read as the same thing. A case decided against a complainant who
 * still rates the process well is the strongest signal in this whole product.
 */
export function FeedbackRatingsPage() {
  const { allCases, flowFor } = useWorkflow()

  const pairs = useMemo<FlowPair[]>(
    () => allCases.map((record) => ({ record, flow: flowFor(record.id) })).filter((p): p is FlowPair => !!p.flow),
    [allCases, flowFor],
  )

  const summary = useMemo(() => feedbackSummary(pairs), [pairs])

  // The signal worth surfacing: satisfaction among complainants whose allegation was not
  // substantiated. If that holds up, the process is being experienced as fair.
  const notUpheld = pairs.filter(
    (p) => p.flow.feedback && p.flow.finalDecision?.outcome === 'Not substantiated',
  )
  const notUpheldAvg = notUpheld.length
    ? notUpheld.reduce((s, p) => s + p.flow.feedback!.rating, 0) / notUpheld.length
    : null

  const promoters = summary.responses.filter((r) => r.rating >= 4).length
  const detractors = summary.responses.filter((r) => r.rating <= 2).length

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Feedback ratings</h1>
          <p>
            How complainants rated the way their inquiry was handled, collected after the outcome
            was served. This measures conduct of the process, not its result.
          </p>
        </div>
        <Link to="/analytics" className="btn btn-secondary">
          Back to analytics
        </Link>
      </div>

      <div className="figure-grid">
        <FigureTile
          label="Average rating"
          value={summary.count ? summary.average.toFixed(1) : '—'}
          tone={summary.average >= 4 ? 'accent' : summary.average >= 3 ? 'warning' : 'danger'}
          meta={summary.count ? `from ${summary.count} response${summary.count === 1 ? '' : 's'}` : 'No responses yet'}
        />
        <FigureTile
          label="Response rate"
          value={`${Math.round(summary.responseRate)}%`}
          meta="Of complainants invited to respond"
        />
        <FigureTile label="Rated 4 or 5" value={promoters} tone={promoters ? 'accent' : undefined} meta="Process handled well" />
        <FigureTile
          label="Rated 1 or 2"
          value={detractors}
          tone={detractors ? 'danger' : undefined}
          meta={detractors ? 'Read these first' : 'None'}
        />
      </div>

      <div className="ep-grid">
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <Star size={15} strokeWidth={1.5} />
              Rating distribution
            </span>
            <span className="meta-pill">1 to 5</span>
          </div>
          <div className="ep-card-body">
            {summary.count ? (
              <RatingChart data={summary.distribution} height={220} />
            ) : (
              <p className="text-13 text-muted">
                No feedback has been submitted yet. Complainants are invited to respond once the
                outcome has been served on them.
              </p>
            )}
          </div>
        </section>

        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">Response rate</span>
          </div>
          <div className="ep-card-body" style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center', flexWrap: 'wrap' }}>
            <CoverageRing
              value={summary.responseRate}
              caption="responded"
              tone={summary.responseRate >= 60 ? 'accent' : 'warning'}
            />
            <div style={{ minWidth: 240, flex: 1 }}>
              <p className="text-13 text-muted" style={{ lineHeight: 1.7 }}>
                Feedback is voluntary and never a condition of closing a case. A low response rate
                is not itself a problem — but a rate that falls after a change to the process is
                worth asking about.
              </p>
              {notUpheldAvg !== null && (
                <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
                  <div className="ep-field-label">Where the allegation was not substantiated</div>
                  <div className="ep-field-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {notUpheldAvg.toFixed(1)} / 5
                    <Stars n={Math.round(notUpheldAvg)} />
                  </div>
                  <div className="text-12 text-faint" style={{ marginTop: 4, lineHeight: 1.5 }}>
                    Complainants who did not get the result they sought, rating the process anyway.
                    This is the number that says whether the inquiry felt fair.
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">
            <MessageSquare size={15} strokeWidth={1.5} />
            Responses
          </span>
          <span className="meta-pill">{summary.responses.length}</span>
        </div>
        <div className="ep-card-body tight">
          {summary.responses.length === 0 ? (
            <p className="text-13 text-muted" style={{ padding: 'var(--space-4) 0' }}>
              Nothing submitted yet.
            </p>
          ) : (
            [...summary.responses]
              .sort((a, b) => a.rating - b.rating)
              .map((r) => (
                <div key={r.caseId} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="ep-doc-name">“{r.comment}”</div>
                    <div className="ep-doc-meta">
                      <Link to={`/cases/${r.caseId}`} className="mono" style={{ color: 'var(--color-accent)' }}>
                        {r.caseId}
                      </Link>{' '}
                      · {formatTimestamp(r.at)}
                    </div>
                  </div>
                  <Stars n={r.rating} />
                </div>
              ))
          )}
        </div>
      </section>

      <p className="ep-confidential">
        <MessageSquare size={12} strokeWidth={2} />
        Feedback is attributed to a case, never to a named complainant, and is excluded from the
        annual return.
      </p>
    </div>
  )
}
