import { Download, FileSpreadsheet } from 'lucide-react'
import { REPORTS } from '../data/mock'

export function ReportsPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports & Exports</h1>
          <p>Generate, download, and manage your reports</p>
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Export Builder</h3>
        <div className="filters">
          {['Case Summary', 'Monthly Report', 'Compliance Report', 'Training Report', 'Annual PoSH Report'].map(
            (t, i) => (
              <button key={t} className={`btn ${i === 4 ? 'btn-primary' : 'btn-secondary'}`} type="button">
                {t}
              </button>
            ),
          )}
        </div>
        <div className="filters">
          <input className="input" type="date" aria-label="Date From" />
          <input className="input" type="date" aria-label="Date To" />
          <select className="select" defaultValue="pdf">
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="pdf">PDF (.pdf)</option>
          </select>
          <button className="btn btn-primary" type="button">
            <FileSpreadsheet size={16} />
            Generate Report
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 style={{ marginBottom: 12 }}>Recent Reports</h3>
        {REPORTS.map((r) => (
          <div
            key={r.name}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: '0.85rem 0',
              borderBottom: '1px solid var(--color-border)',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <strong>{r.name}</strong>
              <div style={{ fontSize: 12, color: 'var(--color-secondary-text)', marginTop: 4 }}>
                {r.format} · {r.type} · {r.date} · {r.size}
              </div>
            </div>
            <button className="btn btn-secondary" type="button">
              <Download size={14} />
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
