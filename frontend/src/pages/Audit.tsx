import { AUDIT_LOG } from '../data/mock'

export function AuditPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Audit Log</h1>
          <p>User logs, approvals, activity history, and version history</p>
        </div>
      </div>

      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>Time</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {AUDIT_LOG.map((row) => (
              <tr key={row.action + row.time}>
                <td>{row.actor}</td>
                <td>{row.action}</td>
                <td>{row.target}</td>
                <td>{row.time}</td>
                <td>{row.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
