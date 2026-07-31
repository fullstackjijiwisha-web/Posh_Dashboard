import { Plus } from 'lucide-react'
import { HEARINGS, type Hearing } from '../data/mock'
import { formatTimestamp } from '../lib/format'

const ICON = { size: 16, strokeWidth: 1.5 } as const

const badgeFor = (s: Hearing['status']) =>
  s === 'Scheduled' ? 'badge-scheduled' : s === 'Completed' ? 'badge-completed' : 'badge-adjourned'

export function ProceedingsPage() {
  const upcoming = HEARINGS.filter((h) => h.status === 'Scheduled')
  const past = HEARINGS.filter((h) => h.status !== 'Scheduled')

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Proceedings</h1>
          <p>Hearing schedule, attendance records, and minutes</p>
        </div>
        <button className="btn btn-primary" type="button">
          <Plus {...ICON} />
          Schedule hearing
        </button>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="label">Total hearings</div>
          <div className="value">{HEARINGS.length}</div>
        </div>
        <div className="card stat-card">
          <div className="label">Scheduled</div>
          <div className="value">{upcoming.length}</div>
        </div>
        <div className="card stat-card">
          <div className="label">Completed</div>
          <div className="value">{HEARINGS.filter((h) => h.status === 'Completed').length}</div>
        </div>
        <div className="card stat-card">
          <div className="label">Adjourned</div>
          <div className="value">{HEARINGS.filter((h) => h.status === 'Adjourned').length}</div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <HearingList title="Upcoming hearings" items={upcoming} />
        <HearingList title="Past hearings" items={past} />
      </div>
    </div>
  )
}

function HearingList({ title, items }: { title: string; items: Hearing[] }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-16 tracking-[-0.02em]">{title}</h3>
        <span className="meta-pill">{items.length}</span>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((h) => (
          <div key={h.id} className="rounded-lg border border-line bg-raised p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="mb-1 font-mono text-12 text-muted">
                  {h.id} · {h.caseId}
                </div>
                <div className="truncate text-14 font-medium text-ink" title={h.title}>
                  {h.title}
                </div>
              </div>
              <span className={`badge ${badgeFor(h.status)}`}>{h.status}</span>
            </div>
            <div className="mt-2 text-13 text-muted">
              {h.type} · {formatTimestamp(h.at)} · {h.duration} · {h.location}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
