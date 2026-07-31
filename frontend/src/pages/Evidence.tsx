import { Plus } from 'lucide-react'
import { EVIDENCE, type EvidenceItem } from '../data/mock'
import { formatDate } from '../lib/format'

const ICON = { size: 16, strokeWidth: 1.5 } as const

const badgeFor = (s: EvidenceItem['status']) =>
  s === 'In custody' ? 'badge-open' : s === 'Released' ? 'badge-medium' : 'badge-closed'

const COLUMNS = [
  { label: 'Exhibit', width: 116, align: 'left' },
  { label: 'Description', width: 420, align: 'left' },
  { label: 'Source', width: 180, align: 'left' },
  { label: 'Received', width: 132, align: 'right' },
  { label: 'Custody status', width: 140, align: 'left' },
] as const

export function EvidencePage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Evidence and chain of custody</h1>
          <p>Exhibit index with source, receipt date, and custody status</p>
        </div>
        <button className="btn btn-primary" type="button">
          <Plus {...ICON} />
          Add evidence
        </button>
      </div>

      <div className="card table-wrap">
        <table className="data" style={{ minWidth: 988 }}>
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
            {EVIDENCE.map((e) => (
              <tr key={e.id}>
                <td className="mono">{e.id}</td>
                <td title={e.description}>{e.description}</td>
                <td>{e.source}</td>
                <td className="num">{formatDate(e.received)}</td>
                <td>
                  <span className={`badge ${badgeFor(e.status)}`}>{e.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
