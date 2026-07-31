import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, FileText, Fingerprint, Gavel, History, Scale, ShieldCheck } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { STAGE_META } from '../lib/workflow/types'
import { StageTracker } from '../components/workflow/StageTracker'
import { AdvisoryPanel } from '../components/workflow/AdvisoryPanel'
import { MyCommittee } from '../components/workflow/MyCommittee'
import { hearingsFor } from '../lib/data/caseDetail'
import { evidenceForCase } from '../lib/data/evidence'
import { formatDate, formatTimestamp } from '../lib/format'
import { actorName } from '../lib/data/users'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'

/**
 * Summary workspace.
 *
 * One case, everything a panel member needs before a sitting, on a single scroll. The
 * full case workspace has nine tabs and is built for working *in* a case; this is built
 * for reading *into* one — the answer to "I sit tomorrow, remind me where this is".
 */
export function SummaryWorkspacePage() {
  const { myAssignedCases, flowFor } = useWorkflow()
  const { maskParty } = useRole()
  const [selected, setSelected] = useState(myAssignedCases[0]?.id ?? '')

  const record = myAssignedCases.find((c) => c.id === selected) ?? myAssignedCases[0]
  const flow = record ? flowFor(record.id) : undefined

  if (!record || !flow) {
    return (
      <div className="flex flex-col gap-5">
        <div className="page-header">
          <div>
            <h1>Summary workspace</h1>
            <p>A single-screen brief on any case you sit on.</p>
          </div>
        </div>
        <div className="wf-empty">You are not sitting on any case.</div>
      </div>
    )
  }

  const sittings = [
    ...hearingsFor(record.id).map((h) => ({
      id: h.id,
      at: h.at,
      title: h.title,
      where: h.location,
      status: h.status,
      minuted: h.minutesRecorded,
      note: null as string | null,
    })),
    ...flow.hearings.map((h) => ({
      id: h.id,
      at: h.at,
      title: h.agenda,
      where: h.location,
      status: h.status,
      minuted: !!h.minutes,
      note: h.minutes,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  const exhibits = evidenceForCase(record.id)
  const latestRec = flow.recommendations[flow.recommendations.length - 1]

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Summary workspace</h1>
          <p>Everything on one case, on one screen. Prepared for reading before a sitting.</p>
        </div>
        <select className="select" value={record.id} onChange={(e) => setSelected(e.target.value)} style={{ minWidth: 260 }}>
          {myAssignedCases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id} — {STAGE_META[flowFor(c.id)?.stage ?? 'complaint_submitted'].label}
            </option>
          ))}
        </select>
      </div>

      {/* Position */}
      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">
            <Gavel size={15} strokeWidth={1.5} />
            <Link to={`/cases/${record.id}`} className="mono" style={{ color: 'var(--color-accent)' }}>
              {record.id}
            </Link>
          </span>
          <span className="meta-pill">
            Day {record.daysElapsed} · {record.isBreached ? 'past 90 days' : `${record.daysRemaining} days left`}
          </span>
        </div>
        <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <StageTracker stage={flow.stage} />
          <p className="text-13" style={{ color: 'var(--color-primary)', lineHeight: 1.7, maxWidth: '84ch' }}>
            {record.summary}
          </p>
          <div className="ep-field-list">
            <div>
              <div className="ep-field-label">Complainant</div>
              <div className="ep-field-value">{maskParty(record.complainant)}</div>
              <div className="text-12 text-faint">{record.complainant.designation}</div>
            </div>
            <div>
              <div className="ep-field-label">Respondent</div>
              <div className="ep-field-value">{maskParty(record.respondent)}</div>
              <div className="text-12 text-faint">{record.respondent.designation}</div>
            </div>
            <div>
              <div className="ep-field-label">Incident / filed</div>
              <div className="ep-field-value">
                {formatDate(record.incidentDate)} → {formatDate(record.filedDate)}
              </div>
            </div>
            <div>
              <div className="ep-field-label">Conciliation (s.10)</div>
              <div className="ep-field-value">
                {record.conciliationRequested ? 'Requested by complainant' : 'Declined by complainant'}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="ep-grid">
        <div className="flex flex-col gap-5">
          {/* Evidence */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <Fingerprint size={15} strokeWidth={1.5} />
                Evidence on record
              </span>
              <span className="meta-pill">{exhibits.length + flow.evidence.length}</span>
            </div>
            <div className="ep-card-body tight">
              {exhibits.map((e) => (
                <div key={e.id} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="ep-doc-name">
                      <span className="mono" style={{ color: 'var(--color-accent)' }}>
                        {e.exhibitNo}
                      </span>{' '}
                      {e.description}
                    </div>
                    <div className="ep-doc-meta">
                      {e.type} · submitted by {actorName(e.submittedBy)} · {formatDate(e.receivedOn)}
                    </div>
                  </div>
                  <span className="badge badge-completed">{e.status}</span>
                </div>
              ))}
              {flow.evidence.map((e) => (
                <div key={e.id} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="ep-doc-name">{e.label}</div>
                    <div className="ep-doc-meta">
                      {e.note} · {formatTimestamp(e.uploadedAt)}
                    </div>
                  </div>
                  <span className={`badge ${e.status === 'Verified' ? 'badge-completed' : 'badge-medium'}`}>
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Sittings */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <CalendarDays size={15} strokeWidth={1.5} />
                Sittings
              </span>
              <span className="meta-pill">{sittings.length}</span>
            </div>
            <div className="ep-card-body tight">
              {sittings.length === 0 ? (
                <p className="text-13 text-muted" style={{ padding: 'var(--space-4) 0' }}>
                  No sitting listed yet.
                </p>
              ) : (
                sittings.map((h) => (
                  <div key={h.id} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="ep-doc-name">{h.title}</div>
                      <div className="ep-doc-meta">
                        {formatTimestamp(h.at)} · {h.where}
                      </div>
                      {h.note ? <div className="ep-doc-meta">Minutes: {h.note}</div> : null}
                    </div>
                    <span className={`badge ${h.status === 'Completed' ? 'badge-completed' : 'badge-scheduled'}`}>
                      {h.minuted ? 'Minuted' : h.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Recommendation */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <Scale size={15} strokeWidth={1.5} />
                Recommendation
              </span>
              {latestRec ? <span className="badge badge-progress">{latestRec.status}</span> : null}
            </div>
            <div className="ep-card-body">
              {!latestRec ? (
                <p className="text-13 text-muted">
                  The committee has not yet drafted its report on this case.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div>
                    <div className="ep-field-label">Finding</div>
                    <div className="ep-field-value" style={{ lineHeight: 1.6 }}>
                      {latestRec.finding}
                    </div>
                  </div>
                  <div>
                    <div className="ep-field-label">Action recommended</div>
                    <div className="ep-field-value" style={{ lineHeight: 1.6 }}>
                      {latestRec.recommendedAction}
                    </div>
                  </div>
                  <div className="text-12 text-faint">
                    {latestRec.provision} · {latestRec.author} · {formatTimestamp(latestRec.at)}
                  </div>
                  {latestRec.reviewNote ? (
                    <div className="wf-blocked">
                      <span>Reviewer’s observation: {latestRec.reviewNote}</span>
                    </div>
                  ) : null}
                </div>
              )}
              {flow.finalDecision ? (
                <div className="cw-summary-block" style={{ marginTop: 'var(--space-4)' }}>
                  <div className="ep-field-label">Final decision — {flow.finalDecision.outcome}</div>
                  <p className="text-13" style={{ marginTop: 6, lineHeight: 1.6 }}>
                    {flow.finalDecision.action}
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          {/* History */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <History size={15} strokeWidth={1.5} />
                Case history
              </span>
              <span className="meta-pill">{flow.history.length} events</span>
            </div>
            <div className="ep-card-body">
              <div className="wf-history">
                {[...flow.history].reverse().map((h) => (
                  <div key={h.id} className="wf-history-item">
                    <span className="wf-history-time">{formatTimestamp(h.at)}</span>
                    <span>
                      <span className="wf-history-stage">{STAGE_META[h.stage].label}</span>
                      <span className="wf-history-meta">
                        {h.actorName} · {h.actorRole} — {h.remarks}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <FileText size={15} strokeWidth={1.5} />
                The panel
              </span>
            </div>
            <div className="ep-card-body">
              <MyCommittee caseId={record.id} compact />
            </div>
          </section>

          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <ShieldCheck size={15} strokeWidth={1.5} />
                Advisory notes
              </span>
              <span className="meta-pill">{flow.advisoryNotes.length}</span>
            </div>
            <div className="ep-card-body">
              <AdvisoryPanel caseIds={[record.id]} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
