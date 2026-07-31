import { Link } from 'react-router-dom'
import { Download, FileSpreadsheet, ScrollText } from 'lucide-react'
import { REPORTS } from '../data/mock'
import { formatDate, formatFileSize } from '../lib/format'

const ICON = { size: 16, strokeWidth: 1.5 } as const

const TYPES = ['Case summary', 'Monthly report', 'Compliance report', 'Training report', 'Annual PoSH report']

const COLUMNS = [
  { label: 'Report', width: 360, align: 'left' },
  { label: 'Type', width: 180, align: 'left' },
  { label: 'Format', width: 100, align: 'left' },
  { label: 'Generated', width: 132, align: 'right' },
  { label: 'Size', width: 100, align: 'right' },
  { label: '', width: 132, align: 'left' },
] as const

export function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-20 tracking-[-0.02em]">Reports and exports</h1>
        <p className="mt-1 text-13 text-muted">Generate, download, and manage statutory reports</p>
      </div>

      {/* Featured statutory disclosure */}
      <Link
        to="/reports/board-disclosure"
        className="card card-hover flex flex-wrap items-start justify-between gap-4 p-5"
        style={{ textDecoration: 'none' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 grid h-9 w-9 place-items-center rounded-md"
            style={{ background: 'rgba(16,185,129,0.14)', color: '#6ee7b7' }}
          >
            <ScrollText {...ICON} />
          </div>
          <div>
            <h3 className="text-16 tracking-[-0.02em]">Board&apos;s Report disclosure</h3>
            <p className="mt-1 max-w-[60ch] text-13 text-muted">
              Rule 8(5), Companies (Accounts) Rules 2014 — as amended, effective 14 July 2025.
              Complaints received, disposed, pending beyond 90 days, and gender composition.
            </p>
          </div>
        </div>
        <span className="btn btn-primary" style={{ pointerEvents: 'none' }}>
          Open disclosure
        </span>
      </Link>

      <section className="rounded-lg border border-line bg-surface p-5">
        <h3 className="mb-4 text-16 tracking-[-0.02em]">Export builder</h3>
        <div className="filters">
          {TYPES.map((t, i) => (
            <button key={t} className={`btn ${i === 4 ? 'btn-primary' : 'btn-secondary'}`} type="button">
              {t}
            </button>
          ))}
        </div>
        <div className="filters" style={{ marginBottom: 0 }}>
          <input className="input" type="date" aria-label="Date from" />
          <input className="input" type="date" aria-label="Date to" />
          <select className="select" defaultValue="pdf" aria-label="Export format">
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="pdf">PDF (.pdf)</option>
          </select>
          <button className="btn btn-primary" type="button">
            <FileSpreadsheet {...ICON} />
            Generate report
          </button>
        </div>
      </section>

      <div className="card table-wrap">
        <table className="data" style={{ minWidth: 1004 }}>
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
            {REPORTS.map((r) => (
              <tr key={r.name}>
                <td className="font-medium" title={r.name}>
                  {r.name}
                </td>
                <td>{r.type}</td>
                <td>{r.format}</td>
                <td className="num">{formatDate(r.generated)}</td>
                <td className="num">{formatFileSize(r.sizeKb)}</td>
                <td>
                  <button className="btn btn-secondary" type="button" style={{ height: 28 }}>
                    <Download {...ICON} />
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
