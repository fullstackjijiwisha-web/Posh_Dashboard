import { Upload } from 'lucide-react'
import { DOCUMENTS } from '../data/mock'
import { formatFileSize, formatTimestamp } from '../lib/format'

const ICON = { size: 16, strokeWidth: 1.5 } as const

const COLUMNS = [
  { label: 'Document', width: 320, align: 'left' },
  { label: 'Category', width: 132, align: 'left' },
  { label: 'Case', width: 148, align: 'left' },
  { label: 'Access', width: 176, align: 'left' },
  { label: 'Uploaded by', width: 140, align: 'left' },
  { label: 'Uploaded', width: 160, align: 'right' },
  { label: 'Size', width: 96, align: 'right' },
  { label: 'Version', width: 88, align: 'left' },
] as const

export function DocumentsPage() {
  const totalKb = DOCUMENTS.reduce((sum, d) => sum + d.sizeKb, 0)
  const cases = new Set(DOCUMENTS.map((d) => d.caseId)).size
  const versioned = DOCUMENTS.filter((d) => d.version !== 'v1').length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Documents</h1>
          <p>Encrypted repository with version control and access logging</p>
        </div>
        <button className="btn btn-primary" type="button">
          <Upload {...ICON} />
          Upload document
        </button>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="label">Total documents</div>
          <div className="value">{DOCUMENTS.length}</div>
        </div>
        <div className="card stat-card">
          <div className="label">Total size</div>
          <div className="value">{formatFileSize(totalKb)}</div>
        </div>
        <div className="card stat-card">
          <div className="label">Cases covered</div>
          <div className="value">{cases}</div>
        </div>
        <div className="card stat-card">
          <div className="label">Versioned files</div>
          <div className="value">{versioned}</div>
        </div>
      </div>

      <p className="mb-4 text-13 text-muted">
        All documents are encrypted at rest. Downloads are watermarked and access-logged.
      </p>

      <div className="card table-wrap">
        <table className="data" style={{ minWidth: 1260 }}>
          <colgroup>
            {COLUMNS.map((c) => (
              <col key={c.label} style={{ width: c.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.label} scope="col" className={c.align === 'right' ? 'num' : undefined}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DOCUMENTS.map((d) => (
              <tr key={d.name}>
                <td title={`${d.name} — ${d.description}`}>
                  <div className="truncate-cell font-medium">{d.name}</div>
                  <div className="truncate-cell text-12" style={{ color: 'var(--color-secondary-text)' }}>
                    {d.description}
                  </div>
                </td>
                <td>{d.category}</td>
                <td className="mono">{d.caseId}</td>
                <td title={d.access}>{d.access}</td>
                <td title={d.uploadedBy}>{d.uploadedBy}</td>
                <td className="num">{formatTimestamp(d.uploadedAt)}</td>
                <td className="num">{formatFileSize(d.sizeKb)}</td>
                <td>
                  <span className="badge badge-low">{d.version}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
