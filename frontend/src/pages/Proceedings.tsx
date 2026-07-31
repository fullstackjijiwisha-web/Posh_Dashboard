import { Plus } from 'lucide-react'
import { HEARINGS } from '../data/mock'

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
          <Plus size={16} />
          Schedule Hearing
        </button>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="label">Total Hearings</div>
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

      <HearingList title="Upcoming Hearings" items={upcoming} />
      <div style={{ height: 16 }} />
      <HearingList title="Past Hearings" items={past} />
    </div>
  )
}

function HearingList({ title, items }: { title: string; items: typeof HEARINGS }) {
  const badge = (s: string) =>
    s === 'Scheduled' ? 'badge-scheduled' : s === 'Completed' ? 'badge-completed' : 'badge-adjourned'

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <h3 style={{ marginBottom: '1rem' }}>
        {title} <span className="meta-pill">{items.length}</span>
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {items.map((h) => (
          <div
            key={h.id}
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              padding: '1rem',
              background: '#faf9f6',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-secondary-text)', marginBottom: 4 }}>
                  {h.id} | {h.caseId}
                </div>
                <strong>{h.title}</strong>
              </div>
              <span className={`badge ${badge(h.status)}`}>{h.status}</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--color-secondary-text)' }}>
              {h.type} · {h.when} · {h.duration} · {h.location}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
