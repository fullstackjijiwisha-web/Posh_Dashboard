import { Upload } from 'lucide-react'
import { DOCUMENTS } from '../data/mock'

export function DocumentsPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Document Repository</h1>
          <p>Secure storage with version control and access logging</p>
        </div>
        <button className="btn btn-primary" type="button">
          <Upload size={16} />
          Upload Document
        </button>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="label">Total Documents</div>
          <div className="value">{DOCUMENTS.length}</div>
        </div>
        <div className="card stat-card">
          <div className="label">Total Size</div>
          <div className="value">23.1 MB</div>
        </div>
        <div className="card stat-card">
          <div className="label">Cases Covered</div>
          <div className="value">5</div>
        </div>
        <div className="card stat-card">
          <div className="label">Versioned Files</div>
          <div className="value">3</div>
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--color-secondary-text)', marginBottom: 16 }}>
        All documents are encrypted at rest. Downloads are watermarked and access-logged.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {DOCUMENTS.map((d) => (
          <div key={d.name} className="card" style={{ padding: '1rem 1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong>{d.name}</strong>
                <p style={{ color: 'var(--color-secondary-text)', marginTop: 4 }}>{d.description}</p>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-secondary-text)' }}>
                  {d.category} · {d.caseId} · {d.access} · {d.meta}
                </div>
              </div>
              <span className="badge badge-open">{d.version}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
