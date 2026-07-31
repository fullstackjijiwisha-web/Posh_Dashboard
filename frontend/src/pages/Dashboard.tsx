import { CheckCircle2, Download, ExternalLink, Users } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ACTIVITY, AGEING_DATA, ALERTS, COMPLIANCE, DEPARTMENTS } from '../data/mock'
import { ANNUAL_REPORT } from '../data/annualReport'
import { formatNumber, formatPercent, formatTimestamp } from '../lib/format'
import './Dashboard.css'

const ICON = { size: 16, strokeWidth: 1.5 } as const

/** Severity ramp drawn from the product palette — no second accent colour. */
const STAGE_FILL = {
  Acknowledgement: '#94A3B8',
  Committee: '#1E40AF',
  Proceedings: '#64748B',
  Evidence: '#B45309',
  Report: '#047857',
}

const AXIS_TICK = { fontSize: 12, fill: '#64748B' }
const GRID_STROKE = '#E2E8F0'

export function DashboardPage() {
  const r = ANNUAL_REPORT
  const maxDept = Math.max(...DEPARTMENTS.map((d) => d.count))

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Annual report</h1>
          <p>Statutory submission format under the PoSH Act 2013 · FY {r.year}</p>
        </div>
        <button className="btn btn-primary" type="button">
          <Download {...ICON} />
          Export annual report
        </button>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="label">Reported cases</div>
          <div className="value">{r.reportedCases}</div>
          <div className="meta">FY {r.year}</div>
        </div>
        <div className="card stat-card">
          <div className="label">Employees covered</div>
          <div className="value">{formatNumber(COMPLIANCE.totalEmployees)}</div>
          <div className="meta">
            {r.employees.male} male · {r.employees.female} female · {r.employees.others} other declared
          </div>
        </div>
        <div className="card stat-card">
          <div className="label">Awareness workshops</div>
          <div className="value">{r.awarenessWorkshops.count}</div>
          <div className="meta">
            {r.awarenessWorkshops.mode} · {r.awarenessWorkshops.audience}
          </div>
        </div>
        <div className="card stat-card">
          <div className="label">Training coverage</div>
          <div className="value">{formatPercent(COMPLIANCE.trainingCoveragePct)}</div>
          <div className="meta">
            {formatNumber(COMPLIANCE.trainedEmployees)} of {formatNumber(COMPLIANCE.totalEmployees)} trained
          </div>
        </div>
      </div>

      {/* Annual Report Submission Format — PoSH Act 2013 */}
      <section className="card annual-panel">
        <div className="annual-head">
          <div>
            <div className="eyebrow">PoSH Act 2013 · workplace submission</div>
            <h2>Annual report submission format</h2>
            <p>All statutory fields for district and workplace annual reporting</p>
          </div>
        </div>

        <div className="annual-grid">
          <div className="annual-block">
            <h3>1. Status of functional Internal Committee</h3>
            <div className="ic-status">
              <CheckCircle2 {...ICON} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong>{r.functionalIc ? 'Yes' : 'No'}</strong>
                <p>{r.functionalIcNote}</p>
              </div>
            </div>
          </div>

          <div className="annual-block">
            <h3>4. Units where Internal Committee details are displayed</h3>
            <p className="answer">{r.displayLocations}</p>
          </div>

          <div className="annual-block span-2">
            <h3>2. Details of Internal Committee members</h3>
            <p className="hint">Name, designation, and contact number of every member</p>
            <div className="table-wrap">
              <table className="data">
                <colgroup>
                  <col style={{ width: 72 }} />
                  <col style={{ width: 240 }} />
                  <col style={{ width: 200 }} />
                  <col style={{ width: 180 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="num">S. no.</th>
                    <th>Name</th>
                    <th>Designation</th>
                    <th className="num">Contact number</th>
                  </tr>
                </thead>
                <tbody>
                  {r.icMembers.map((m) => (
                    <tr key={m.sno}>
                      <td className="num">{m.sno}</td>
                      <td title={m.name}>{m.name}</td>
                      <td>{m.designation}</td>
                      <td className="num mono">{m.contact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="annual-block span-2">
            <h3>3. Details of External Member</h3>
            <p className="hint">Name, organisation, and experience in the field of PoSH law</p>
            <div className="table-wrap">
              <table className="data">
                <colgroup>
                  <col style={{ width: 72 }} />
                  <col style={{ width: 220 }} />
                  <col style={{ width: 220 }} />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 180 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="num">S. no.</th>
                    <th>Name</th>
                    <th>Organisation</th>
                    <th className="num">Experience</th>
                    <th className="num">Contact number</th>
                  </tr>
                </thead>
                <tbody>
                  {r.externalMembers.map((m) => (
                    <tr key={m.sno}>
                      <td className="num">{m.sno}</td>
                      <td title={m.name}>{m.name}</td>
                      <td>{m.organization}</td>
                      <td className="num">{m.experienceYears} years</td>
                      <td className="num mono">{m.contact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="annual-block">
            <h3>5. Awareness workshops for employees</h3>
            <p className="answer">{r.awarenessWorkshops.notes}</p>
            <a className="link-out" href={r.awarenessWorkshops.url} target="_blank" rel="noreferrer">
              <ExternalLink {...ICON} />
              {r.awarenessWorkshops.url}
            </a>
          </div>

          <div className="annual-block">
            <h3>6. Sensitisation workshops for Internal Committee members</h3>
            <p className="answer">{r.sensitizationWorkshops.notes}</p>
            <div className="mini-stat">{r.sensitizationWorkshops.count} sessions this year</div>
          </div>

          <div className="annual-block">
            <h3>7. Challenges implementing PoSH policies</h3>
            <p className="answer">{r.challenges}</p>
          </div>

          <div className="annual-block">
            <h3>8. Feedback on PoSH initiatives</h3>
            <p className="answer">{r.feedback}</p>
          </div>

          <div className="annual-block span-2">
            <h3>9. Resource person for PoSH awareness workshops</h3>
            <div className="resource-card">
              <Users {...ICON} style={{ marginTop: 2, flexShrink: 0, color: 'var(--color-secondary-text)' }} />
              <div>
                <strong>{r.resourcePerson.name}</strong>
                <p>{r.resourcePerson.credentials}</p>
              </div>
            </div>
          </div>

          <div className="annual-block">
            <h3>10. Other preventive measures</h3>
            <p className="answer">{r.preventiveMeasures}</p>
          </div>

          <div className="annual-block">
            <h3>11. Total number of employees</h3>
            <div className="emp-grid">
              <div>
                <span>Total</span>
                <strong>{r.employees.total}</strong>
              </div>
              <div>
                <span>Male</span>
                <strong>{r.employees.male}</strong>
              </div>
              <div>
                <span>Female</span>
                <strong>{r.employees.female}</strong>
              </div>
              <div>
                <span>Other</span>
                <strong>{r.employees.others}</strong>
              </div>
            </div>
          </div>

          <div className="annual-block">
            <h3>12. Total reported cases in the year</h3>
            <p className="answer big">{r.reportedCases}</p>
          </div>

          <div className="annual-block">
            <h3>13. Confidentiality and sensitivity measures</h3>
            <p className="answer">{r.confidentialityMeasures}</p>
          </div>

          <div className="annual-block">
            <h3>14. Status of reported cases</h3>
            <p className="answer">{r.inquiryStatus}</p>
          </div>

          <div className="annual-block">
            <h3>15. Pending cases and reasons for pendency</h3>
            <p className="answer">{r.pendingCases}</p>
          </div>

          <div className="annual-block span-2">
            <h3>16. Initiatives planned for the coming year</h3>
            <p className="answer">{r.upcomingInitiatives}</p>
          </div>

          <div className="annual-block span-2">
            <h3>17. Any other information</h3>
            <p className="answer">{r.otherInfo}</p>
          </div>
        </div>

        <div className="annual-foot">{r.createdBy}</div>
      </section>

      <div className="dash-mid">
        <div className="card score-card">
          <div className="score-head">
            <div>
              <h3>Compliance score</h3>
              <p>Organisation-wide PoSH compliance health</p>
            </div>
            <span className="badge badge-medium">Needs attention</span>
          </div>
          <div className="score-figure">{formatPercent(COMPLIANCE.score)}</div>
          <div>
            {COMPLIANCE.breakdown.map(({ label, value }) => (
              <div key={label} className="score-row">
                <div className="score-row-top">
                  <span>{label}</span>
                  <strong>{formatPercent(value)}</strong>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card side-stack-card">
          <div style={{ padding: 0 }}>
            <h3 style={{ marginBottom: 12 }}>Cases by department</h3>
            <div className="dept-list">
              {DEPARTMENTS.map((d) => (
                <div key={d.name} className="dept-row">
                  <span>{d.name}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(d.count / maxDept) * 100}%` }} />
                  </div>
                  <strong>{d.count}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="dash-bottom">
        <div className="card chart-card">
          <div className="chart-head">
            <div>
              <h3>Case ageing by stage</h3>
              <p>Monthly distribution across workflow stages</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={264}>
            <BarChart data={AGEING_DATA} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {Object.entries(STAGE_FILL).map(([key, fill]) => (
                <Bar key={key} dataKey={key} stackId="stage" fill={fill} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="side-stack">
          <div className="card">
            <h3>Alerts</h3>
            <ul className="list">
              {ALERTS.map((a) => (
                <li key={a.text}>
                  <span>{a.text}</span>
                  <small>{formatTimestamp(a.at)}</small>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3>Recent activity</h3>
            <ul className="list">
              {ACTIVITY.map((a) => (
                <li key={a.text}>
                  <span>{a.text}</span>
                  <small>{formatTimestamp(a.at)}</small>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
