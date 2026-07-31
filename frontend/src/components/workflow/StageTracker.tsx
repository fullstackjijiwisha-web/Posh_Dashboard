import { Check } from 'lucide-react'
import { HAPPY_PATH, STAGE_META, TOTAL_STEPS, type WorkflowStage } from '../../lib/workflow/types'
import { primaryActor } from '../../lib/workflow/machine'
import { ROLE_LABEL } from '../../lib/data/types'
import './Workflow.css'

const LANE_CLASS: Record<string, string> = {
  employee: 'wf-lane-employee',
  admin: 'wf-lane-admin',
  committee: 'wf-lane-committee',
  system: 'wf-lane-system',
  terminal: 'wf-lane-terminal',
}

export function laneClass(stage: WorkflowStage): string {
  return LANE_CLASS[STAGE_META[stage].lane] ?? 'wf-lane-system'
}

/** Who is holding the case at this stage, as a readable label. */
export function custodian(stage: WorkflowStage): string {
  const roles = primaryActor(stage)
  if (!roles.length) return 'No further action'
  if (roles.length > 2) return 'Internal Committee'
  return roles.map((r) => ROLE_LABEL[r]).join(' or ')
}

/**
 * The 21-segment rail plus the current stage. Off-path stages (a rejection, a returned
 * report, an evidence request) share the step index of the stage they branch from, so
 * the rail never appears to go backwards while the case is genuinely in a side loop.
 */
export function StageTracker({ stage, compact = false }: { stage: WorkflowStage; compact?: boolean }) {
  const meta = STAGE_META[stage]
  const lane = laneClass(stage)

  return (
    <div className={`wf-tracker ${lane}`}>
      <div className="wf-tracker-head">
        <span className="wf-tracker-stage">
          <span className="wf-tracker-dot" />
          {meta.label}
        </span>
        <span className="wf-tracker-count">
          Step {meta.step} of {TOTAL_STEPS} · {custodian(stage)}
        </span>
      </div>

      <div className="wf-rail" aria-hidden="true">
        {HAPPY_PATH.map((s, i) => {
          const idx = i + 1
          const cls = idx < meta.step ? 'done' : idx === meta.step ? 'current' : ''
          return <span key={s} className={`wf-rail-seg ${cls}`} />
        })}
      </div>

      {!compact && <p className="wf-tracker-desc">{meta.description}</p>}
    </div>
  )
}

/** The vertical step list, used in the workspace and the complainant's tracker. */
export function StageSteps({ stage }: { stage: WorkflowStage }) {
  const current = STAGE_META[stage]

  return (
    <div className="wf-steps">
      {HAPPY_PATH.map((s, i) => {
        const meta = STAGE_META[s]
        const step = i + 1
        const done = step < current.step
        const isCurrent = step === current.step
        // While the case sits in a side loop, the rail still marks the branch point as
        // current but shows the branch's own label so the reader is not misled.
        const label = isCurrent ? current.label : meta.label
        const state = done ? 'done' : isCurrent ? 'current' : ''

        return (
          <div key={s} className={`wf-step ${state} ${isCurrent ? laneClass(stage) : ''}`}>
            <span className="wf-step-marker">
              {done ? <Check size={11} strokeWidth={2.5} /> : step}
            </span>
            <span className="wf-step-label">
              {label}
              {isCurrent && <span className="wf-step-sub">{current.description}</span>}
            </span>
            <span className="wf-step-owner">{custodian(s)}</span>
          </div>
        )
      })}
    </div>
  )
}
