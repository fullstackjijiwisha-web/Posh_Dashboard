import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Download, FileSpreadsheet, FileText, ScrollText } from 'lucide-react'
import {
  BOARD_DISCLOSURE_YEARS,
  DEFAULT_BOARD_FY,
} from '../lib/data/boardDisclosure'
import { formatNumber, formatPercent } from '../lib/format'
import { useRole } from '../lib/role-context'
import './BoardDisclosure.css'

const ICON = { size: 16, strokeWidth: 1.5 } as const

export function BoardDisclosurePage() {
  const { can } = useRole()
  const [fyId, setFyId] = useState(DEFAULT_BOARD_FY)
  const [generated, setGenerated] = useState(true)

  const fy = useMemo(
    () => BOARD_DISCLOSURE_YEARS.find((y) => y.id === fyId) ?? BOARD_DISCLOSURE_YEARS[0],
    [fyId],
  )

  if (!can('view:analytics')) {
    return (
      <div className="card p-8">
        <h2 className="text-16">Disclosure restricted</h2>
        <p className="mt-2 text-13 text-muted">
          Board&apos;s Report disclosures are available to roles with analytics access
          (Presiding Officer, Legal, Management, Super Admin).
        </p>
        <Link to="/reports" className="mt-4 inline-flex items-center gap-2 text-13 text-accent">
          <ArrowLeft {...ICON} />
          Back to reports
        </Link>
      </div>
    )
  }

  const c = fy.complaints

  return (
    <div className="bd">
      <div className="bd-header">
        <div>
          <Link to="/reports" className="bd-back">
            <ArrowLeft {...ICON} />
            Reports
          </Link>
          <h1 className="bd-title">Board&apos;s Report disclosure</h1>
          <p className="bd-sub">
            Rule 8(5), Companies (Accounts) Rules 2014 — as amended, effective 14 July 2025
          </p>
        </div>
        <div className="bd-header-actions">
          <label className="bd-fy">
            <span>Financial year</span>
            <select
              value={fyId}
              onChange={(e) => {
                setFyId(e.target.value)
                setGenerated(true)
              }}
              aria-label="Financial year"
            >
              {BOARD_DISCLOSURE_YEARS.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setGenerated(true)}
          >
            <ScrollText {...ICON} />
            Generate disclosure
          </button>
        </div>
      </div>

      <div className="bd-ref">
        <FileText {...ICON} />
        <p>
          Since 14 July 2025, every company must disclose in its Board&apos;s Report: complaints
          received, complaints disposed of, complaints pending beyond 90 days, and the gender
          composition of its workforce.
        </p>
      </div>

      {generated && (
        <>
          <article className="bd-doc rise">
            <header className="bd-doc-head">
              <div className="bd-doc-mark">Statutory disclosure</div>
              <h2>Disclosure under Rule 8(5) of the Companies (Accounts) Rules, 2014</h2>
              <p>
                Prepared for inclusion in the Board&apos;s Report · {fy.label} · Workforce as at{' '}
                {fy.asAt}
              </p>
            </header>

            <section className="bd-section">
              <h3>Section 1 — Sexual harassment complaints, {fy.label}</h3>
              <table className="bd-def">
                <tbody>
                  <tr>
                    <th scope="row">Number of complaints of sexual harassment received during the year</th>
                    <td>{formatNumber(c.received)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Number of complaints disposed of during the year</th>
                    <td>{formatNumber(c.disposed)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Number of complaints pending for more than ninety days</th>
                    <td>{formatNumber(c.pendingBeyond90)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Number of complaints pending at year end</th>
                    <td>{formatNumber(c.pendingYearEnd)}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="bd-section">
              <h3>Section 2 — Gender composition of employees (as at {fy.asAt})</h3>
              <table className="bd-comp">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th className="num">Number</th>
                    <th className="num">% of workforce</th>
                  </tr>
                </thead>
                <tbody>
                  {fy.workforce.map((row) => (
                    <tr key={row.category} className={row.isTotal ? 'bd-total' : undefined}>
                      <td>{row.category}</td>
                      <td className="num">{formatNumber(row.number)}</td>
                      <td className="num">{formatPercent(row.pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="bd-section">
              <h3>Section 3 — Compliance confirmations</h3>
              <ul className="bd-checks">
                {fy.confirmations.map((item) => (
                  <li key={item}>
                    <Check size={14} strokeWidth={2} aria-hidden="true" />
                    <span>{item}</span>
                    <span className="bd-tick" aria-label="Confirmed">✓</span>
                  </li>
                ))}
              </ul>
            </section>

            <footer className="bd-doc-foot">
              <button type="button" className="btn btn-primary">
                <Download {...ICON} />
                Export as PDF
              </button>
              <button type="button" className="btn btn-secondary">
                <FileSpreadsheet {...ICON} />
                Export as Excel
              </button>
            </footer>
          </article>

          <p className="bd-fine">
            Generated {fy.generatedOn} · Source: {fy.sourceCaseCount} case records · This disclosure
            is prepared for review by the Company Secretary and is not legal advice.
          </p>
        </>
      )}
    </div>
  )
}
