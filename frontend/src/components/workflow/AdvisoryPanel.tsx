import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, MessageSquarePlus, Quote } from 'lucide-react'
import { useWorkflow } from '../../lib/workflow/store'
import { useRole } from '../../lib/role-context'
import { STAGE_META } from '../../lib/workflow/types'
import { formatTimestamp } from '../../lib/format'
import './Workflow.css'
import './EmployeePortal.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

/**
 * The Case Advisory Panel.
 *
 * An external member's contribution is not another vote — it is an independent
 * observation on the record, which the panel and the administrator both see and neither
 * can quietly drop. Flagging a note as a concern raises it to the Presiding Officer and
 * the POSH Admin immediately; an ordinary note simply sits on the case.
 *
 * Nothing here moves a case. That is the point: oversight that could advance the
 * inquiry would not be oversight.
 */
export function AdvisoryPanel({ caseIds, limit }: { caseIds: string[]; limit?: number }) {
  const { flowFor, addAdvisoryNote } = useWorkflow()
  const { can } = useRole()
  const [openFor, setOpenFor] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [concern, setConcern] = useState(false)

  const mayAdvise = can('workflow:committee')

  const notes = caseIds
    .flatMap((id) => (flowFor(id)?.advisoryNotes ?? []).map((n) => ({ ...n, caseId: id })))
    .sort((a, b) => b.at.localeCompare(a.at))

  const shown = limit ? notes.slice(0, limit) : notes

  const save = (caseId: string) => {
    if (!text.trim()) return
    addAdvisoryNote(caseId, text.trim(), concern)
    setText('')
    setConcern(false)
    setOpenFor(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Compose */}
      {mayAdvise && caseIds.length > 0 && (
        openFor ? (
          <div className="wf-note">
            <span className="wf-note-label">Advisory observation</span>
            <select
              className="select"
              value={openFor}
              onChange={(e) => setOpenFor(e.target.value)}
              style={{ marginBottom: 4 }}
            >
              {caseIds.map((id) => (
                <option key={id} value={id}>
                  {id} — {STAGE_META[flowFor(id)?.stage ?? 'complaint_submitted'].label}
                </option>
              ))}
            </select>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Your observation on procedure, fairness, or the treatment of the parties. Recorded against the case and visible to the panel."
              autoFocus
            />
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 'var(--text-xs)',
                color: 'var(--color-secondary-text)',
              }}
            >
              <input type="checkbox" checked={concern} onChange={(e) => setConcern(e.target.checked)} />
              Flag as a concern — notifies the Presiding Officer and the POSH Admin at once
            </label>
            <div className="wf-note-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setOpenFor(null)
                  setText('')
                  setConcern(false)
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={concern ? 'btn wf-btn-danger' : 'btn btn-primary'}
                onClick={() => save(openFor)}
                disabled={!text.trim()}
              >
                {concern ? 'Record concern' : 'Record observation'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => setOpenFor(caseIds[0])}
          >
            <MessageSquarePlus {...ICON} />
            Record an observation
          </button>
        )
      )}

      {/* Notes on record */}
      {shown.length === 0 ? (
        <div className="wf-empty">
          No advisory observations on record. Anything you note here stays on the case file and
          cannot be removed by the panel or an administrator.
        </div>
      ) : (
        <div className="wf-list">
          {shown.map((n) => (
            <div
              key={n.id}
              className="wf-list-item"
              style={{
                flexDirection: 'column',
                alignItems: 'stretch',
                borderLeft: `2px solid ${n.concern ? 'var(--color-warning)' : 'var(--color-violet)'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div className="wf-list-title">
                  {n.concern ? (
                    <AlertTriangle size={14} strokeWidth={1.5} style={{ color: 'var(--color-warning)' }} />
                  ) : (
                    <Quote size={14} strokeWidth={1.5} style={{ color: 'var(--color-violet)' }} />
                  )}
                  <Link to={`/cases/${n.caseId}`} className="mono" style={{ color: 'var(--color-accent)' }}>
                    {n.caseId}
                  </Link>
                  {n.concern ? <span className="badge badge-medium">Concern</span> : null}
                </div>
                <span className="text-12 text-faint" style={{ whiteSpace: 'nowrap' }}>
                  {formatTimestamp(n.at)}
                </span>
              </div>
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-primary)',
                  lineHeight: 1.6,
                  marginTop: 8,
                  maxWidth: '80ch',
                }}
              >
                {n.text}
              </p>
              <div className="wf-list-meta">
                {n.author} · {n.authorRole}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
