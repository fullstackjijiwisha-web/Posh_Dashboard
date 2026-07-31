import { Plus } from 'lucide-react'
import { ACTIONS, type ActionStatus } from '../data/mock'
import { formatDate } from '../lib/format'

const ICON = { size: 16, strokeWidth: 1.5 } as const

const COLUMNS: ActionStatus[] = ['To do', 'In progress', 'Overdue', 'Done']

const PRIORITY_PILL = {
  High: 'bg-[rgba(239,68,68,0.14)] text-[#fca5a5]',
  Medium: 'bg-[rgba(245,158,11,0.14)] text-[#fcd34d]',
  Low: 'bg-[rgba(139,155,168,0.14)] text-[#a9b8c4]',
} as const

export function ActionsPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Action tracker</h1>
          <p>Owner, due date, priority, and status across cases</p>
        </div>
        <button className="btn btn-primary" type="button">
          <Plus {...ICON} />
          Add action
        </button>
      </div>

      <div className="grid gap-4 overflow-x-auto md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = ACTIONS.filter((a) => a.status === col)
          return (
            <section key={col} className="min-w-[240px] rounded-lg border border-line bg-surface p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-14 font-medium tracking-[-0.02em]">{col}</h3>
                <span className="meta-pill">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((a) => (
                  <article key={a.title} className="card-hover rounded-lg border border-line bg-raised p-3">
                    <div className="mb-3 text-13 font-medium text-ink">{a.title}</div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="avatar sm">{a.initials}</span>
                      <span className="truncate text-12 text-muted">{a.owner}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-12 text-muted">{a.caseId}</span>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-12 font-medium ${PRIORITY_PILL[a.priority]}`}
                      >
                        {a.priority}
                      </span>
                    </div>
                    <div className="mt-2 text-12 text-faint">Due {formatDate(a.due)}</div>
                  </article>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
