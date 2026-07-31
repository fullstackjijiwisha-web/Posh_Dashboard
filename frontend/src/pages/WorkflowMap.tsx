import { ArrowDown, GitBranch, RotateCcw } from 'lucide-react'
import { HAPPY_PATH, STAGE_META, type WorkflowStage } from '../lib/workflow/types'
import { TRANSITIONS, COMMITTEE_ROLES, transitionsFrom } from '../lib/workflow/machine'
import { ROLES, ROLE_LABEL, type Role } from '../lib/data/types'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { laneClass, custodian } from '../components/workflow/StageTracker'
import '../components/workflow/Workflow.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

/** Branches hang off the happy path rather than sitting on it. */
const BRANCHES: Partial<Record<WorkflowStage, WorkflowStage[]>> = {
  complaint_under_review: ['complaint_rejected'],
  committee_assigned: ['case_created'],
  evidence_review: ['evidence_more_requested', 'evidence_resubmitted'],
  recommendation_review: ['recommendation_returned', 'recommendation_resubmitted', 'recommendation_rejected'],
}

/**
 * Roles that hold no workflow transition at all. They read the case — some of them read
 * a great deal of it — but the lifecycle never waits on them, and saying so plainly is
 * more useful than leaving their row empty.
 */
const OBSERVER_NOTE: Partial<Record<Role, string>> = {
  hr_spoc: 'Intake fields only. Never drives a workflow step.',
  management: 'Aggregate statistics only — never sees a party name.',
}

export function WorkflowMapPage() {
  const { resetWorkflow, allCases, flowFor } = useWorkflow()
  const { currentRole, can } = useRole()

  // A complainant may read this page — it explains the process they are inside — but the
  // per-stage counts are an organisation-wide statistic, so they are withheld from a
  // role that cannot see the caseload they are drawn from.
  const isComplainantOnly = can('workflow:complainant') && !can('view:all_cases')

  // Live distribution across the ladder, so the map doubles as a caseload view.
  const distribution = isComplainantOnly
    ? {}
    : allCases.reduce<Record<string, number>>((acc, c) => {
        const flow = flowFor(c.id)
        if (flow) acc[flow.stage] = (acc[flow.stage] ?? 0) + 1
        return acc
      }, {})

  return (
    <div className="flex flex-col gap-6">
      <div className="page-header">
        <div>
          <h1>Case lifecycle</h1>
          <p>
            Every step from the complaint being filed to the case being sealed, and which role
            holds the case at each one. The buttons in the workspace are generated from this
            table — nothing else decides what a role may do.
          </p>
        </div>
        {/* Resetting rewinds every case in the demo, so it is not a complainant's button. */}
        {!isComplainantOnly && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={resetWorkflow}
            title="Return every case to its seeded position"
          >
            <RotateCcw {...ICON} />
            Reset workflow demo
          </button>
        )}
      </div>

      {/* ── Access matrix ─────────────────────────────────────────── */}
      <section className="card">
        <div className="cw-panel-head" style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="cw-panel-title">Who may do what</h2>
          <span className="meta-pill">{ROLES.length} roles</span>
        </div>
        <div className="wf-matrix-wrap">
          <table className="wf-matrix">
            <thead>
              <tr>
                <th style={{ width: 220 }}>Role</th>
                <th>Workflow actions this role may drive</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((role) => {
                const owned = TRANSITIONS.filter((t) => t.roles.includes(role))
                const isSuper = role === 'super_admin'
                return (
                  <tr key={role} style={role === currentRole ? { background: 'var(--color-raised)' } : undefined}>
                    <td className="role-cell">
                      {ROLE_LABEL[role]}
                      {role === currentRole ? (
                        <span className="badge badge-completed" style={{ marginLeft: 8 }}>
                          You
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <div className="wf-cap-list">
                        {isSuper ? (
                          <span className="wf-cap own">
                            Every step, plus provisioning POSH Admin accounts — owner and super
                            administrator are one panel
                          </span>
                        ) : owned.length ? (
                          owned.map((t) => (
                            <span key={t.id} className="wf-cap own">
                              {t.label}
                            </span>
                          ))
                        ) : (
                          <span className="wf-cap none">
                            {OBSERVER_NOTE[role] ?? 'Observer — no workflow actions.'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── The ladder ────────────────────────────────────────────── */}
      <section className="card">
        <div className="cw-panel-head" style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="cw-panel-title">The path</h2>
          <span className="meta-pill">{HAPPY_PATH.length} steps · {TRANSITIONS.length} transitions</span>
        </div>

        <div style={{ padding: 'var(--space-5)' }}>
          <div className="wf-map">
            {HAPPY_PATH.map((stage, i) => {
              const meta = STAGE_META[stage]
              const branches = BRANCHES[stage] ?? []
              const count = distribution[stage] ?? 0

              return (
                <div key={stage}>
                  <div className={`wf-map-row ${laneClass(stage)}`}>
                    <span className="wf-map-index">{i + 1}</span>
                    <div className="wf-map-node">
                      <div className="wf-map-node-head">
                        <span className="wf-map-node-title">{meta.label}</span>
                        <span className="wf-map-node-owner">
                          {custodian(stage)}
                          {count ? ` · ${count} case${count === 1 ? '' : 's'} here` : ''}
                        </span>
                      </div>
                      <p className="wf-map-node-desc">{meta.description}</p>
                    </div>
                  </div>

                  {branches.length > 0 && (
                    <div className="wf-map-row">
                      <span />
                      <div className="wf-branch-group" style={{ marginTop: 8 }}>
                        {branches.map((b) => {
                          const bm = STAGE_META[b]
                          const via = transitionsFrom(stage).find((t) => t.to === b)
                          return (
                            <div key={b} className={`wf-map-node branch ${laneClass(b)}`}>
                              <div className="wf-map-node-head">
                                <span className="wf-map-node-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <GitBranch size={12} strokeWidth={1.5} />
                                  {bm.label}
                                </span>
                              </div>
                              <p className="wf-map-node-desc">
                                {via ? `“${via.label}” — ` : ''}
                                {bm.description}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {i < HAPPY_PATH.length - 1 && (
                    <div className="wf-map-arrow">
                      <ArrowDown size={12} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Footnote on the committee seats ───────────────────────── */}
      <p className="text-13 text-muted" style={{ maxWidth: '80ch' }}>
        The Presiding Officer, Internal Committee member and External Member share every committee
        action — {COMMITTEE_ROLES.map((r) => ROLE_LABEL[r]).join(', ')} — because the Act treats the
        committee as one body. Quorum is enforced on the sitting, not on the button.
      </p>
    </div>
  )
}
