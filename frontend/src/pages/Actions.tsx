import { Plus } from 'lucide-react'
import { ACTIONS, type ActionStatus } from '../data/mock'

const COLUMNS: ActionStatus[] = ['To Do', 'In Progress', 'Overdue', 'Done']

export function ActionsPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Action Tracker</h1>
          <p>Owner, due date, priority, and status across cases</p>
        </div>
        <button className="btn btn-primary" type="button">
          <Plus size={16} />
          Add
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          overflowX: 'auto',
        }}
      >
        {COLUMNS.map((col) => {
          const items = ACTIONS.filter((a) => a.status === col)
          return (
            <div key={col} className="card" style={{ padding: 12, minWidth: 220 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <strong>{col}</strong>
                <span className="meta-pill">{items.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((a) => (
                  <div
                    key={a.title}
                    style={{
                      background: '#faf9f6',
                      border: '1px solid var(--color-border)',
                      borderRadius: 10,
                      padding: 10,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{a.title}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                      <div className="avatar sm">{a.initials}</div>
                      <span style={{ fontSize: 12 }}>{a.owner}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-secondary-text)' }}>
                      {a.due} · {a.caseId}
                    </div>
                    <span className={`badge badge-${a.priority.toLowerCase()}`} style={{ marginTop: 8 }}>
                      {a.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
