import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, ArrowUpRight, Hourglass, Lock } from 'lucide-react'
import { useWorkflow } from '../../lib/workflow/store'
import { useRole } from '../../lib/role-context'
import { REQUIREMENT_REMEDY } from '../../lib/workflow/machine'
import { STAGE_META, isWorkflowTerminal } from '../../lib/workflow/types'
import { custodian } from './StageTracker'
import './Workflow.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

/**
 * The only place in the app that renders workflow buttons.
 *
 * It never decides for itself what to show — `availableActions` returns the transitions
 * the signed-in role may drive from the case's current stage, already checked against
 * their preconditions. When that list is empty the panel says who the case is waiting
 * on instead of going blank, because "nothing here" and "not your turn" are different
 * things and a demo audience will ask which one they are looking at.
 */
export function ActionPanel({
  caseId,
  historical = false,
}: {
  caseId: string
  /** Time Machine — actions are locked while viewing a past date. */
  historical?: boolean
}) {
  const { availableActions, runAction, flowFor } = useWorkflow()
  const { currentRole } = useRole()
  const [pending, setPending] = useState<{ id: string; label: string; noteLabel: string } | null>(null)
  const [note, setNote] = useState('')

  const flow = flowFor(caseId)
  if (!flow) return null

  if (historical) {
    return (
      <div className="wf-waiting" title="Historical view — actions are disabled.">
        <Lock {...ICON} className="mt-0.5 shrink-0 text-faint" />
        <div>
          <div className="wf-waiting-title">Historical view</div>
          <div className="wf-waiting-detail">
            Actions are disabled while the Time Machine is not at today. Return to today to act on
            this case.
          </div>
        </div>
      </div>
    )
  }

  const actions = availableActions(caseId)
  const meta = STAGE_META[flow.stage]

  if (isWorkflowTerminal(flow.stage)) {
    return (
      <div className="wf-waiting">
        <Lock {...ICON} className="mt-0.5 shrink-0 text-faint" />
        <div>
          <div className="wf-waiting-title">{meta.label}</div>
          <div className="wf-waiting-detail">{meta.description}</div>
        </div>
      </div>
    )
  }

  if (!actions.length) {
    return (
      <div className="wf-waiting">
        <Hourglass {...ICON} className="mt-0.5 shrink-0 text-faint" />
        <div>
          <div className="wf-waiting-title">Waiting on {custodian(flow.stage)}</div>
          <div className="wf-waiting-detail">
            {meta.description}
            {currentRole ? ' Your role has no action at this stage.' : ''}
          </div>
        </div>
      </div>
    )
  }

  const submit = () => {
    if (!pending) return
    runAction(caseId, pending.id, note)
    setPending(null)
    setNote('')
  }

  return (
    <div className="wf-actions">
      {pending ? (
        <div className="wf-note">
          <span className="wf-note-label">{pending.noteLabel}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="This is written into the case history and the audit trail."
            autoFocus
          />
          <div className="wf-note-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setPending(null)
                setNote('')
              }}
            >
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={submit} disabled={!note.trim()}>
              {pending.label}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="wf-action-row">
            {actions.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={!!a.blocked}
                title={a.blocked ?? undefined}
                className={`btn ${
                  a.intent === 'primary' ? 'btn-primary' : a.intent === 'danger' ? 'btn wf-btn-danger' : 'btn-secondary'
                }`}
                style={a.blocked ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                onClick={() => {
                  if (a.blocked) return
                  if (a.requiresNote) {
                    setPending({ id: a.id, label: a.label, noteLabel: a.noteLabel ?? 'Add a note' })
                    setNote('')
                    return
                  }
                  runAction(caseId, a.id)
                }}
              >
                {a.label}
                {a.intent === 'primary' && !a.blocked ? <ArrowRight size={14} strokeWidth={1.5} /> : null}
              </button>
            ))}
          </div>

          {actions
            .filter((a) => a.blocked)
            .map((a) => {
              const remedy = a.requires ? REQUIREMENT_REMEDY[a.requires] : null
              return (
                <div key={`b-${a.id}`} className="wf-blocked">
                  <AlertCircle {...ICON} className="mt-px shrink-0" style={{ color: 'var(--color-warning)' }} />
                  <span>
                    <strong style={{ fontWeight: 500, color: 'var(--color-primary)' }}>{a.label}</strong> — {a.blocked}
                    {remedy ? (
                      <>
                        {' '}
                        <Link
                          // Carry the case through so the remedy screen opens on it
                          // rather than on whatever happens to sort first.
                          to={`${remedy.to}?case=${encodeURIComponent(caseId)}`}
                          style={{
                            color: 'var(--color-accent)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 2,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {remedy.label}
                          <ArrowUpRight size={12} strokeWidth={1.5} />
                        </Link>
                      </>
                    ) : null}
                  </span>
                </div>
              )
            })}
        </>
      )}
    </div>
  )
}
