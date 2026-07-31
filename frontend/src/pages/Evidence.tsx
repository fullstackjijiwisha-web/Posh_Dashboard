import { Plus } from 'lucide-react'
import { EVIDENCE } from '../data/mock'

export function EvidencePage() {
  const badge = (s: string) =>
    s === 'In Custody' ? 'badge-open' : s === 'Released' ? 'badge-medium' : 'badge-closed'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Evidence & Chain of Custody</h1>
          <p>Evidence index with source, date, and custody status</p>
        </div>
        <button className="btn btn-primary" type="button">
          <Plus size={16} />
          Add Evidence
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {EVIDENCE.map((e) => (
          <div key={e.id} className="card" style={{ padding: '1rem 1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong>{e.id}</strong>
                <p style={{ marginTop: 4 }}>{e.description}</p>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-secondary-text)' }}>
                  {e.source} | {e.date}
                </div>
              </div>
              <span className={`badge ${badge(e.status)}`}>{e.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
