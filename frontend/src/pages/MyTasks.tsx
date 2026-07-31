import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, Clock, ListChecks } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { STAGE_META, isWorkflowTerminal } from '../lib/workflow/types'
import { FigureTile } from '../components/workflow/Dials'
import { actionsFor } from '../lib/data/caseDetail'
import { dateNDaysAgo } from '../lib/data/statutory'
import { formatDate } from '../lib/format'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/workflow/Dials.css'

type Scope = 'Open' | 'Overdue' | 'Done' | 'All'

/**
 * A member's own task list.
 *
 * The action tracker lists every task on every case. This lists the ones with the
 * signed-in member's name on them, which is the only version a member can act on — and
 * grouped by urgency rather than by case, because an overdue item on a quiet case still
 * outranks a comfortable one on a busy case.
 */
export function MyTasksPage() {
  const { myAssignedCases, flowFor } = useWorkflow()
  const { currentUser } = useRole()
  const [scope, setScope] = useState<Scope>('Open')

  const uid = currentUser?.id ?? ''
  const today = dateNDaysAgo(0)

  const all = myAssignedCases
    .map((record) => ({ record, flow: flowFor(record.id) }))
    .filter((r): r is { record: (typeof myAssignedCases)[number]; flow: NonNullable<ReturnType<typeof flowFor>> } => !!r.flow)
    .flatMap(({ record, flow }) =>
      actionsFor(record.id)
        .filter((a) => a.ownerId === uid)
        .map((a) => ({
          ...a,
          caseId: record.id,
          stage: flow.stage,
          terminal: isWorkflowTerminal(flow.stage),
          daysLate: a.status === 'Overdue' ? Math.max(0, Math.round((Date.parse(today) - Date.parse(a.dueOn)) / 86400000)) : 0,
        })),
    )
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))

  const overdue = all.filter((a) => a.status === 'Overdue')
  const open = all.filter((a) => a.status !== 'Done')
  const done = all.filter((a) => a.status === 'Done')

  const rows = scope === 'Open' ? open : scope === 'Overdue' ? overdue : scope === 'Done' ? done : all

  const dueThisWeek = open.filter((a) => {
    const days = (Date.parse(a.dueOn) - Date.parse(today)) / 86400000
    return days >= 0 && days <= 7
  }).length

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>My tasks</h1>
          <p>
            Items with your name on them, across every inquiry you sit on. Ordered by when they fall
            due, not by case.
          </p>
        </div>
        <div className="ep-segment">
          {(['Open', 'Overdue', 'Done', 'All'] as Scope[]).map((s) => (
            <button key={s} type="button" className={scope === s ? 'active' : ''} onClick={() => setScope(s)}>
              {s} (
              {s === 'Open' ? open.length : s === 'Overdue' ? overdue.length : s === 'Done' ? done.length : all.length})
            </button>
          ))}
        </div>
      </div>

      <div className="figure-grid">
        <FigureTile label="Open" value={open.length} meta="Assigned and not yet done" />
        <FigureTile
          label="Overdue"
          value={overdue.length}
          tone={overdue.length ? 'danger' : undefined}
          meta={overdue.length ? `Longest ${Math.max(...overdue.map((a) => a.daysLate))} days late` : 'Nothing late'}
        />
        <FigureTile label="Due within 7 days" value={dueThisWeek} tone={dueThisWeek ? 'warning' : undefined} meta="Plan the week around these" />
        <FigureTile label="Completed" value={done.length} meta="On the cases you sit on" />
      </div>

      {rows.length === 0 ? (
        <div className="wf-empty">Nothing in this view.</div>
      ) : (
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <ListChecks size={15} strokeWidth={1.5} />
              {scope} tasks
            </span>
            <span className="meta-pill">{rows.length}</span>
          </div>
          <div className="ep-card-body tight">
            {rows.map((a) => {
              const late = a.status === 'Overdue'
              return (
                <div
                  key={a.id}
                  className="ep-doc"
                  style={{
                    gridTemplateColumns: '20px 1fr auto',
                    ...(late ? { borderLeft: '2px solid var(--color-danger)', paddingLeft: 10 } : {}),
                  }}
                >
                  <span style={{ marginTop: 2 }}>
                    {a.status === 'Done' ? (
                      <CheckCircle2 size={16} strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} />
                    ) : late ? (
                      <Clock size={16} strokeWidth={1.5} style={{ color: 'var(--color-danger)' }} />
                    ) : (
                      <Circle size={16} strokeWidth={1.5} style={{ color: 'var(--color-tertiary-text)' }} />
                    )}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="ep-doc-name">{a.title}</div>
                    <div className="ep-doc-meta">
                      <Link to={`/cases/${a.caseId}`} className="mono" style={{ color: 'var(--color-accent)' }}>
                        {a.caseId}
                      </Link>{' '}
                      · {STAGE_META[a.stage].label} · due {formatDate(a.dueOn)}
                      {late ? ` · ${a.daysLate} day${a.daysLate === 1 ? '' : 's'} late` : ''}
                    </div>
                  </div>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span
                      className={`badge ${
                        a.priority === 'High' ? 'badge-high' : a.priority === 'Medium' ? 'badge-medium' : 'badge-low'
                      }`}
                    >
                      {a.priority}
                    </span>
                    <span
                      className={`badge ${
                        a.status === 'Done'
                          ? 'badge-completed'
                          : a.status === 'Overdue'
                            ? 'badge-overdue'
                            : a.status === 'In progress'
                              ? 'badge-progress'
                              : 'badge-open'
                      }`}
                    >
                      {a.status}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
