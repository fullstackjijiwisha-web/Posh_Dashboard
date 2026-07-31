import { Link } from 'react-router-dom'
import { CalendarDays, FileText, History, Lock, Plus, Users } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { STAGE_META, isWorkflowTerminal } from '../lib/workflow/types'
import { StageTracker, StageSteps } from '../components/workflow/StageTracker'
import { ActionPanel } from '../components/workflow/ActionPanel'
import { MyCommittee } from '../components/workflow/MyCommittee'
import { hearingsFor } from '../lib/data/caseDetail'
import { dateNDaysAgo } from '../lib/data/statutory'
import { formatDate, formatTimestamp } from '../lib/format'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

/**
 * The complainant's view of their own case.
 *
 * This screen is under a stricter rule than the rest of the app: it shows progress, the
 * committee's requests and the final outcome, and it shows nothing about the respondent.
 * The masking is not done here — `maskParty` in role-context refuses to hand an employee
 * a respondent's name at all — but this page is written so it never has to ask.
 */
export function TrackComplaintPage() {
  const { visibleCases, flowFor } = useWorkflow()
  const { currentRole } = useRole()

  // Live cases first; a sealed case still belongs here, just further down.
  const mine = [...visibleCases].sort((a, b) => {
    const aDone = isWorkflowTerminal(flowFor(a.id)?.stage ?? 'complaint_submitted') ? 1 : 0
    const bDone = isWorkflowTerminal(flowFor(b.id)?.stage ?? 'complaint_submitted') ? 1 : 0
    return aDone - bDone || b.filedDate.localeCompare(a.filedDate)
  })

  const today = dateNDaysAgo(0)

  if (!mine.length) {
    return (
      <div className="flex flex-col gap-6">
        <div className="page-header">
          <div>
            <h1>Track your complaint</h1>
            <p>Progress on complaints you have filed.</p>
          </div>
        </div>
        <div className="wf-empty">
          You have no complaints on record.
          <div style={{ marginTop: 16 }}>
            <Link to="/complaint/new" className="btn btn-primary">
              <Plus {...ICON} />
              File a complaint
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="page-header">
        <div>
          <h1>Track your complaint</h1>
          <p>
            Where your complaint stands, what the committee has asked for, and what you can do next.
            Only the Internal Committee and the POSH Admin can see what you file here.
          </p>
        </div>
        <Link to="/complaint/new" className="btn btn-secondary">
          <Plus {...ICON} />
          File another complaint
        </Link>
      </div>

      {mine.map((c) => {
        const flow = flowFor(c.id)
        if (!flow) return null
        const openRequests = flow.evidenceRequests.filter((r) => !r.fulfilledAt)
        const closed = isWorkflowTerminal(flow.stage)

        // Fixture sittings and any listed through the workflow, merged and split around
        // today so the complainant sees what is coming as well as what has happened.
        const sittings = [
          ...hearingsFor(c.id).map((h) => ({
            id: h.id,
            at: h.at,
            title: h.title,
            where: h.location,
            kind: h.type,
            done: h.status === 'Completed',
            status: h.status,
          })),
          ...flow.hearings.map((h) => ({
            id: h.id,
            at: h.at,
            title: h.agenda,
            where: h.location,
            kind: h.mode,
            done: h.status === 'Completed',
            status: h.status,
          })),
        ].sort((a, b) => a.at.localeCompare(b.at))

        const upcoming = sittings.filter((h) => !h.done && h.at.slice(0, 10) >= today)
        const held = sittings.filter((h) => h.done || h.at.slice(0, 10) < today)

        return (
          <section key={c.id} className="card" style={{ overflow: 'hidden' }}>
            {/* Header */}
            <div
              style={{
                padding: 'var(--space-5)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 'var(--space-4)',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ fontSize: 'var(--text-lg)', color: 'var(--color-accent)' }}>
                    {c.id}
                  </span>
                  <span className="meta-pill">Filed {formatDate(c.filedDate)}</span>
                </div>
                <p className="text-13 text-muted" style={{ marginTop: 6, maxWidth: '70ch' }}>
                  {c.summary}
                </p>
              </div>
              <span
                className={`badge ${closed ? 'badge-closed' : 'badge-open'}`}
                style={{ whiteSpace: 'nowrap' }}
                title={STAGE_META[flow.stage].description}
              >
                {STAGE_META[flow.stage].label}
              </span>
            </div>

            <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <StageTracker stage={flow.stage} />

              {/* Outstanding request for material — the one thing that needs the
                  complainant to act, so it comes before everything else. */}
              {openRequests.map((r) => (
                <div key={r.id} className="wf-blocked" style={{ borderColor: 'var(--color-warning)' }}>
                  <FileText {...ICON} style={{ color: 'var(--color-warning)', marginTop: 1, flexShrink: 0 }} />
                  <span>
                    <strong style={{ fontWeight: 500, color: 'var(--color-primary)' }}>
                      The committee has asked you for more material.
                    </strong>{' '}
                    {r.detail} — requested {formatTimestamp(r.requestedAt)}.
                  </span>
                </div>
              ))}

              <div>
                <div className="cw-section-label" style={{ marginBottom: 12 }}>
                  What you can do now
                </div>
                <ActionPanel caseId={c.id} />
              </div>

              {/* The outcome, once it exists and the complainant has been notified. */}
              {flow.finalDecision &&
                ['employee_notified', 'decision_viewed', 'feedback_submitted', 'case_archived'].includes(flow.stage) && (
                  <div className="cw-summary-block">
                    <div className="cw-overview-label" style={{ marginBottom: 8 }}>
                      Final decision — {flow.finalDecision.outcome}
                    </div>
                    <p className="cw-summary-text">{flow.finalDecision.action}</p>
                    <p className="text-12 text-faint" style={{ marginTop: 8 }}>
                      Recorded {formatTimestamp(flow.finalDecision.at)}. You may appeal within 90 days
                      under Section 18.
                    </p>
                  </div>
                )}

              {flow.feedback && (
                <div className="wf-list-item">
                  <div>
                    <div className="wf-list-title">Your feedback</div>
                    <div className="wf-list-meta">
                      “{flow.feedback.comment}” — submitted {formatTimestamp(flow.feedback.at)}
                    </div>
                  </div>
                </div>
              )}

              {/* Evidence the complainant has filed. Nothing the respondent filed. */}
              <div>
                <div className="cw-section-label" style={{ marginBottom: 12 }}>
                  Material you have filed — {flow.evidence.length}
                </div>
                <div className="wf-list">
                  {flow.evidence.map((e) => (
                    <div key={e.id} className="wf-list-item">
                      <div style={{ minWidth: 0 }}>
                        <div className="wf-list-title">
                          {e.label}
                          {e.supplementary ? <span className="meta-pill">Supplementary</span> : null}
                        </div>
                        <div className="wf-list-meta">
                          {e.note} · filed {formatTimestamp(e.uploadedAt)}
                        </div>
                      </div>
                      <span
                        className={`badge ${e.status === 'Verified' ? 'badge-completed' : 'badge-medium'}`}
                        style={{ flexShrink: 0 }}
                      >
                        {e.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Who is hearing the case. */}
              <div>
                <div className="cw-section-label" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={13} strokeWidth={1.5} />
                  Your Internal Committee
                </div>
                <MyCommittee caseId={c.id} />
              </div>

              {/* Sittings — what is coming, then what has been held. */}
              <div>
                <div className="cw-section-label" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarDays size={13} strokeWidth={1.5} />
                  Hearings — {upcoming.length} upcoming, {held.length} held
                </div>

                {upcoming.length > 0 && (
                  <div style={{ marginBottom: held.length ? 'var(--space-4)' : 0 }}>
                    {upcoming.map((h) => {
                      const d = new Date(h.at)
                      return (
                        <div key={h.id} className="ep-hearing">
                          <div className="ep-hearing-date">
                            <div className="ep-hearing-day">{d.getDate()}</div>
                            <div className="ep-hearing-month">
                              {d.toLocaleString('en-IN', { month: 'short' })}
                            </div>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="ep-hearing-title">{h.title}</div>
                            <div className="ep-hearing-meta">
                              {formatTimestamp(h.at)} · {h.where}
                            </div>
                            <div className="ep-hearing-meta">
                              {h.kind} · you will be given notice if your attendance is required
                            </div>
                          </div>
                          <span className="badge badge-scheduled">{h.status}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {held.length > 0 && (
                  <details>
                    <summary
                      className="text-13"
                      style={{ cursor: 'pointer', color: 'var(--color-secondary-text)', padding: '4px 0' }}
                    >
                      {held.length} sitting{held.length === 1 ? '' : 's'} already held
                    </summary>
                    <div style={{ marginTop: 8 }}>
                      {held.map((h) => (
                        <div key={h.id} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                          <div style={{ minWidth: 0 }}>
                            <div className="ep-doc-name">{h.title}</div>
                            <div className="ep-doc-meta">
                              {formatTimestamp(h.at)} · {h.where}
                            </div>
                          </div>
                          <span className="badge badge-completed">{h.status}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {sittings.length === 0 && (
                  <p className="text-13 text-muted">
                    No sitting has been listed yet. Hearings begin once the committee has verified
                    the material on record.
                  </p>
                )}
              </div>

              <div>
                <div className="cw-section-label" style={{ marginBottom: 12 }}>
                  Progress
                </div>
                <StageSteps stage={flow.stage} />
              </div>

              {/* Full history — every transition on this case, newest first. */}
              <div>
                <div className="cw-section-label" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <History size={13} strokeWidth={1.5} />
                  Case history — {flow.history.length} events
                </div>
                <div className="wf-history">
                  {[...flow.history].reverse().map((h) => (
                    <div key={h.id} className="wf-history-item">
                      <span className="wf-history-time">{formatTimestamp(h.at)}</span>
                      <span>
                        <span className="wf-history-stage">{STAGE_META[h.stage].label}</span>
                        <span className="wf-history-meta">
                          {h.actorRole} — {h.remarks}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p
                className="text-12 text-faint"
                style={{ display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}
              >
                <Lock size={12} strokeWidth={2} />
                Identities of other parties are withheld from this view for every role that does not
                need them — including {currentRole === 'employee' ? 'yours' : 'the complainant’s'}.
              </p>
            </div>
          </section>
        )
      })}
    </div>
  )
}
