import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarPlus, X } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { STAGE_META } from '../lib/workflow/types'
import { ActionPanel } from '../components/workflow/ActionPanel'
import { formatTimestamp } from '../lib/format'
import { ROLE_LABEL } from '../lib/data/types'
import '../components/workflow/Workflow.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

/** The stages at which a sitting is being arranged, held or minuted. */
const HEARING_STAGES = ['evidence_verified', 'hearing_scheduled', 'hearing_completed', 'minutes_recorded']

/**
 * Hearings console — listing a sitting, holding it, and minuting it.
 *
 * The workflow will not let a case past `evidence_verified` without a sitting on the
 * calendar, which is why scheduling lives on its own screen rather than as a modal
 * somewhere: it is a precondition, not a convenience.
 */
export function HearingsPage() {
  const { allCases, flowFor, scheduleHearing } = useWorkflow()
  const { can, currentRole } = useRole()
  // Set when the workspace sent us here to satisfy a precondition on one case.
  const [params, setParams] = useSearchParams()
  const focus = params.get('case')

  const isCommittee = can('workflow:committee')
  const [openFor, setOpenFor] = useState<string | null>(focus)
  const [form, setForm] = useState({
    date: '',
    time: '11:00',
    mode: 'In person' as 'In person' | 'Video conference',
    location: '',
    agenda: '',
  })

  const rows = allCases
    .filter((c) => {
      const f = flowFor(c.id)
      if (!f) return false
      if (focus) return c.id === focus
      return HEARING_STAGES.includes(f.stage) || f.hearings.length > 0
    })
    // A case with no sitting yet is the one that needs a person; put it first.
    .sort((a, b) => {
      const rank = (id: string) => {
        const f = flowFor(id)!
        if (f.stage === 'evidence_verified') return 0
        if (f.stage === 'hearing_scheduled') return 1
        if (f.stage === 'hearing_completed') return 2
        return 3
      }
      return rank(a.id) - rank(b.id)
    })

  const save = (caseId: string, fallbackLocation: string) => {
    if (!form.date) return
    scheduleHearing(caseId, {
      at: `${form.date}T${form.time}:00`,
      mode: form.mode,
      location: form.location.trim() || `${fallbackLocation} — Committee room`,
      agenda: form.agenda.trim() || 'Examination of the parties.',
    })
    setOpenFor(null)
    setForm({ date: '', time: '11:00', mode: 'In person', location: '', agenda: '' })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="page-header">
        <div>
          <h1>Hearings</h1>
          <p>
            Sittings listed by the committee, and the minutes taken at each. A case cannot move to
            recommendation until its sitting has been held and minuted.
          </p>
        </div>
        {focus ? (
          <button type="button" className="btn btn-secondary" onClick={() => setParams({})}>
            <X {...ICON} />
            Showing {focus} only — show all
          </button>
        ) : (
          <span className="meta-pill">{rows.length} cases</span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="wf-empty">
          No case is at the hearing phase. Cases arrive here once their evidence has been verified.
        </div>
      ) : (
        rows.map((c) => {
          const flow = flowFor(c.id)!
          const listing = openFor === c.id

          return (
            <section key={c.id} className="card" style={{ overflow: 'hidden' }}>
              <div
                style={{
                  padding: 'var(--space-4) var(--space-5)',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Link to={`/cases/${c.id}`} className="mono text-13" style={{ color: 'var(--color-accent)' }}>
                    {c.id}
                  </Link>
                  <span className="badge badge-open">{STAGE_META[flow.stage].label}</span>
                  <span className="text-12 text-muted">{c.location}</span>
                </div>
                {isCommittee && !listing && (
                  <button type="button" className="btn btn-secondary" onClick={() => setOpenFor(c.id)}>
                    <CalendarPlus {...ICON} />
                    List a sitting
                  </button>
                )}
              </div>

              <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                {listing && (
                  <div className="wf-form">
                    <div className="wf-form-row">
                      <label className="wf-field">
                        Date
                        <input
                          className="input"
                          type="date"
                          value={form.date}
                          onChange={(e) => setForm({ ...form, date: e.target.value })}
                        />
                      </label>
                      <label className="wf-field">
                        Time
                        <input
                          className="input"
                          type="time"
                          value={form.time}
                          onChange={(e) => setForm({ ...form, time: e.target.value })}
                        />
                      </label>
                      <label className="wf-field">
                        Mode
                        <select
                          className="select"
                          value={form.mode}
                          onChange={(e) => setForm({ ...form, mode: e.target.value as typeof form.mode })}
                        >
                          <option>In person</option>
                          <option>Video conference</option>
                        </select>
                      </label>
                    </div>
                    <label className="wf-field">
                      Venue
                      <input
                        className="input"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        placeholder={`${c.location} — Committee room`}
                      />
                    </label>
                    <label className="wf-field">
                      Agenda
                      <textarea
                        value={form.agenda}
                        onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                        placeholder="Examination of the complainant and the respondent."
                      />
                    </label>
                    <div className="wf-note-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => setOpenFor(null)}>
                        Cancel
                      </button>
                      <button type="button" className="btn btn-primary" onClick={() => save(c.id, c.location)} disabled={!form.date}>
                        List sitting
                      </button>
                    </div>
                  </div>
                )}

                {flow.hearings.length > 0 && (
                  <div className="wf-list">
                    {flow.hearings.map((h) => (
                      <div key={h.id} className="wf-list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div className="wf-list-title">
                            {formatTimestamp(h.at)}
                            <span className="meta-pill">{h.mode}</span>
                          </div>
                          <span className={`badge ${h.status === 'Completed' ? 'badge-completed' : 'badge-scheduled'}`}>
                            {h.status}
                          </span>
                        </div>
                        <div className="wf-list-meta">{h.location}</div>
                        <div className="wf-list-meta">{h.agenda}</div>
                        {h.minutes ? (
                          <div className="wf-list-meta">
                            <strong style={{ color: 'var(--color-primary)', fontWeight: 500 }}>Minutes: </strong>
                            {h.minutes}
                          </div>
                        ) : (
                          <div className="wf-list-meta" style={{ color: 'var(--color-warning)' }}>
                            Minutes not yet recorded.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <div className="cw-section-label" style={{ marginBottom: 12 }}>
                    Your actions
                  </div>
                  <ActionPanel caseId={c.id} />
                </div>
              </div>
            </section>
          )
        })
      )}

      {!isCommittee && (
        <p className="text-13 text-muted">
          Listing and minuting sittings is reserved to the Internal Committee. Your role
          ({currentRole ? ROLE_LABEL[currentRole] : '—'}) has read access to the calendar above.
        </p>
      )}
    </div>
  )
}
