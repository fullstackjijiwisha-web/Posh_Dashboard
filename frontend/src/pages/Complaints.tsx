import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { COMPLAINTS, type ComplaintStatus } from '../data/mock'

const statusClass: Record<ComplaintStatus, string> = {
  Open: 'badge-open',
  'In Progress': 'badge-progress',
  Closed: 'badge-closed',
  Overdue: 'badge-overdue',
  Pending: 'badge-medium',
}

export function ComplaintsPage() {
  const [status, setStatus] = useState('All')
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
            {counts.Open} Open · {counts['In Progress']} In Progress · {counts.Closed} Closed
          </p>
        </div>
        <button className="btn btn-primary" type="button">
          <Plus size={16} />
          New Complaint
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
        <table className="data">
          <thead>
            <tr>
              <th>Complaint</th>
              <th>Status</th>
              <th>Complainant</th>
              <th>Assignee</th>
              <th>Filed</th>
              <th>Stage</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to="/cases">
                    <strong>{c.id}</strong>
                    <div style={{ color: 'var(--color-secondary-text)', marginTop: 2 }}>{c.title}</div>
                  </Link>
                </td>
                <td>
                  <span className={`badge ${statusClass[c.status]}`}>{c.status}</span>
                </td>
                <td>{c.complainant}</td>
                <td>{c.assignee}</td>
                <td>{c.filed}</td>
                <td>{c.stage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
