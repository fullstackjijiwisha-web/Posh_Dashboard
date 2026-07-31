import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { COMPLAINTS, type ComplaintStatus } from '../data/mock'
import { useRole } from '../context/RoleContext'
import { formatDate } from '../lib/format'

const ICON = { size: 16, strokeWidth: 1.5 } as const

const statusClass: Record<ComplaintStatus, string> = {
  Open: 'badge-open',
  'In Progress': 'badge-progress',
  Closed: 'badge-closed',
  Overdue: 'badge-overdue',
  Pending: 'badge-medium',
}

const COLUMNS = [
  { label: 'Complaint', width: 300, align: 'left' },
  { label: 'Status', width: 116, align: 'left' },
  { label: 'Complainant', width: 160, align: 'left' },
  { label: 'Respondent', width: 160, align: 'left' },
  { label: 'Assignee', width: 150, align: 'left' },
  { label: 'Filed', width: 116, align: 'right' },
  { label: 'Stage', width: 140, align: 'left' },
] as const

export function ComplaintsPage() {
  const [status, setStatus] = useState('All')
  const { maskParty } = useRole()

  const filtered = useMemo(
    () => (status === 'All' ? COMPLAINTS : COMPLAINTS.filter((c) => c.status === status)),
    [status],
  )

  const counts = {
    Open: COMPLAINTS.filter((c) => c.status === 'Open').length,
    'In Progress': COMPLAINTS.filter((c) => c.status === 'In Progress').length,
    Closed: COMPLAINTS.filter((c) => c.status === 'Closed').length,
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Complaints</h1>
          <p>
            {counts.Open} open · {counts['In Progress']} in progress · {counts.Closed} closed
          </p>
        </div>
        <button className="btn btn-primary" type="button">
          <Plus {...ICON} />
          Register complaint
        </button>
      </div>

      <div className="filters">
        {['All', 'Open', 'In Progress', 'Closed', 'Pending'].map((s) => (
          <button
            key={s}
            className={`btn ${status === s ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatus(s)}
            type="button"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="card table-wrap">
        <table className="data" style={{ minWidth: 1142 }}>
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
            {filtered.map((c) => {
              const complainant = maskParty(c.complainant, 'complainant')
              const respondent = maskParty(c.respondent, 'respondent')
              return (
                <tr key={c.id}>
                  <td title={c.title}>
                    <Link to={`/cases/${c.id}`} className="mono text-accent hover:underline">
                      {c.id}
                    </Link>
                    <div className="truncate-cell" style={{ color: 'var(--color-secondary-text)' }}>
                      {c.title}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${statusClass[c.status]}`}>{c.status}</span>
                  </td>
                  <td title={complainant}>{complainant}</td>
                  <td title={respondent}>{respondent}</td>
                  <td title={c.assignee}>{c.assignee}</td>
                  <td className="num">{formatDate(c.filed)}</td>
                  <td>{c.stage}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
