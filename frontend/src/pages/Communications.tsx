import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { COMMUNICATIONS } from '../lib/data/caseDetail'
import { caseById } from '../lib/data/cases'
import { useRole } from '../lib/role-context'
import { formatTimestamp } from '../lib/format'

const ICON = { size: 16, strokeWidth: 1.5 } as const

const COLUMNS = [
  { label: 'Sent', width: 160, align: 'right' },
  { label: 'Case', width: 148, align: 'left' },
  { label: 'Direction', width: 108, align: 'left' },
  { label: 'Channel', width: 120, align: 'left' },
  { label: 'Subject', width: 360, align: 'left' },
  { label: 'Counterparty', width: 160, align: 'left' },
  { label: 'Acknowledged', width: 128, align: 'left' },
] as const

export function CommunicationsPage() {
  const { maskParty } = useRole()

  const rows = [...COMMUNICATIONS].sort((a, b) => b.at.localeCompare(a.at))

  /** Counterparty ids are `${caseId}-complainant|respondent`; resolve through the mask. */
  const counterparty = (id: string) => {
    const [, party] = id.match(/-(complainant|respondent)$/) ?? []
    const c = caseById(id.replace(/-(complainant|respondent)$/, ''))
    if (!c || !party) return 'Unknown'
    return maskParty(party === 'complainant' ? c.complainant : c.respondent)
  }

  const outbound = rows.filter((r) => r.direction === 'Outbound').length
  const pending = rows.filter((r) => !r.acknowledged).length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Communications</h1>
          <p>
            {rows.length} on record · {outbound} outbound · {pending} awaiting acknowledgement
          </p>
        </div>
      </div>

      <div className="card table-wrap">
        <table className="data" style={{ minWidth: 1184 }}>
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
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="num">{formatTimestamp(r.at)}</td>
                <td className="mono">{r.caseId}</td>
                <td>
                  <span className="inline-flex items-center gap-2 text-13">
                    {r.direction === 'Outbound' ? (
                      <ArrowUpRight {...ICON} style={{ color: 'var(--color-info)' }} />
                    ) : (
                      <ArrowDownLeft {...ICON} style={{ color: 'var(--color-accent)' }} />
                    )}
                    {r.direction}
                  </span>
                </td>
                <td>{r.channel}</td>
                <td title={r.subject}>{r.subject}</td>
                <td>{counterparty(r.counterpartyId)}</td>
                <td>
                  <span className={`badge ${r.acknowledged ? 'badge-completed' : 'badge-medium'}`}>
                    {r.acknowledged ? 'Acknowledged' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
