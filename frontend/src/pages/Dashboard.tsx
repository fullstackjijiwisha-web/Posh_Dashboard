import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FilePlus2,
  Users,
} from 'lucide-react'
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
import { useAuth } from '../context/AuthContext'
import { ACTIVITY, AGEING_DATA, ALERTS, DEPARTMENTS } from '../data/mock'
import { ANNUAL_REPORT } from '../data/annualReport'
import './Dashboard.css'

export function DashboardPage() {
  const { user } = useAuth()
  const r = ANNUAL_REPORT

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.title || 'Admin'} — compliance overview & annual PoSH report</p>
        </div>
        <div className="period-tabs">
          {['Today', 'Week', 'Month', 'Quarter'].map((p, i) => (
            <button key={p} className={`period-tab${i === 1 ? ' active' : ''}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="label">Open Cases</div>
          <div className="value">{r.reportedCases === 0 ? 0 : 24}</div>
          <div className="meta">Active investigations · +3 this week</div>
        </div>
        <div className="card stat-card">
          <div className="label">Reported Cases (Year)</div>
          <div className="value">{r.reportedCases}</div>
          <div className="meta">Annual report · {r.year}</div>
        </div>
        <div className="card stat-card">
          <div className="label">Employees Covered</div>
          <div className="value">{r.employees.total}</div>
          <div className="meta">
            {r.employees.male}M · {r.employees.female}F · {r.employees.others} Other
          </div>
        </div>
        <div className="card stat-card">
          <div className="label">Awareness Workshops</div>
          <div className="value">{r.awarenessWorkshops.count}</div>
          <div className="meta">{r.awarenessWorkshops.mode} · {r.awarenessWorkshops.audience}</div>
        </div>
      </div>

      {/* Annual Report Submission Format — PoSH Act 2013 */}
      <section className="card annual-panel">
        <div className="annual-head">
          <div>
            <div className="eyebrow">PoSH Act 2013 · Workplace Submission</div>
            <h2>Annual Report Submission Format</h2>
            <p>All statutory fields for district / workplace annual reporting · FY {r.year}</p>
          </div>
          <button className="btn btn-primary" type="button">
            <Download size={16} />
            Export Annual Report
          </button>
        </div>

        <div className="annual-grid">
          <div className="annual-block">
            <h3>1. Status of functional Internal Committee</h3>
            <div className={`ic-status ${r.functionalIc ? 'yes' : 'no'}`}>
              <CheckCircle2 size={18} />
              <div>
                <strong>{r.functionalIc ? 'Yes' : 'No'}</strong>
                <p>{r.functionalIcNote}</p>
              </div>
            </div>
          </div>

          <div className="annual-block span-2">
            <h3>2. Details of Internal Committee members</h3>
            <p className="hint">Name, designation, and mobile numbers of all members including external member</p>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>S. No.</th>
                    <th>Name</th>
                    <th>Designation</th>
                    <th>Contact Number</th>
                  </tr>
                </thead>
                <tbody>
                  {r.icMembers.map((m) => (
                    <tr key={m.sno}>
                      <td>{m.sno}.</td>
                      <td>{m.name}</td>
                      <td>{m.designation}</td>
                      <td>{m.contact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="annual-block span-2">
            <h3>3. Details of External member</h3>
            <p className="hint">Name, organization, work experience in the field of POSH Laws</p>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>S. No.</th>
                    <th>Name</th>
                    <th>Designation / Organization</th>
                    <th>Experience (Years)</th>
                    <th>Contact Number</th>
                  </tr>
                </thead>
                <tbody>
                  {r.externalMembers.map((m) => (
                    <tr key={m.sno}>
                      <td>{m.sno}.</td>
                      <td>{m.name}</td>
                      <td>{m.organization}</td>
                      <td>{m.experienceYears} years</td>
                      <td>{m.contact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="annual-block">
            <h3>4. Units where IC details are displayed</h3>
            <p className="answer">{r.displayLocations}</p>
          </div>

          <div className="annual-block">
            <h3>5. Awareness workshops (employees)</h3>
            <p className="answer">{r.awarenessWorkshops.notes}</p>
            <a className="link-out" href={r.awarenessWorkshops.url} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />
              {r.awarenessWorkshops.url}
            </a>
          </div>

          <div className="annual-block">
            <h3>6. Sensitization workshops (IC members)</h3>
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
              <Users size={18} />
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
                <span>Others</span>
                <strong>{r.employees.others}</strong>
              </div>
            </div>
          </div>

          <div className="annual-block">
            <h3>12. Total reported cases in a year</h3>
            <p className="answer big">{r.reportedCases === 0 ? 'None' : r.reportedCases}</p>
          </div>

          <div className="annual-block">
            <h3>13. Confidentiality & sensitivity measures</h3>
            <p className="answer">{r.confidentialityMeasures}</p>
          </div>

          <div className="annual-block">
            <h3>14. Status of reported cases (inquiry)</h3>
            <p className="answer">{r.inquiryStatus}</p>
          </div>

          <div className="annual-block">
            <h3>15. Pending cases / reasons of pendency</h3>
            <p className="answer">{r.pendingCases}</p>
          </div>

          <div className="annual-block span-2">
            <h3>16. Initiatives planned for the upcoming year</h3>
            <p className="answer">{r.upcomingInitiatives}</p>
          </div>

          <div className="annual-block span-2">
            <h3>17. Any other information regarding PoSH Act</h3>
            <p className="answer">{r.otherInfo}</p>
          </div>
        </div>

        <div className="annual-foot">{r.createdBy}</div>
      </section>

      <div className="dash-mid">
        <div className="card score-card">
          <div className="score-head">
            <div>
              <h3>Compliance Score</h3>
              <p>Organization-wide POSH compliance health</p>
            </div>
            <span className="badge badge-medium">Needs Attention</span>
          </div>
          <div className="score-ring">
            <div className="score-num">78%</div>
            <div className="score-label">Overall Score</div>
          </div>
          <div className="score-bars">
            {[
              ['Policy Adherence', 92],
              ['Training Coverage', 82],
              ['Case Timeliness', 91],
              ['Documentation', 68],
            ].map(([label, val]) => (
              <div key={label as string} className="score-row">
                <div className="score-row-top">
                  <span>{label}</span>
                  <strong>{val}%</strong>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card quick-card">
          <h3>Quick Actions</h3>
          <div className="quick-grid">
            <Link to="/complaints" className="quick-item">
              <FilePlus2 size={18} />
              New Complaint
            </Link>
            <Link to="/cases" className="quick-item">
              <ClipboardList size={18} />
              View Cases
            </Link>
            <Link to="/actions" className="quick-item">
              <AlertTriangle size={18} />
              Action Items
            </Link>
            <Link to="/settings" className="quick-item">
              <Users size={18} />
              Team Overview
            </Link>
          </div>

          <h3 className="mt">Training Coverage</h3>
          <div className="training">
            <div className="training-pct">78%</div>
            <div>
              <div className="bar-track lg">
                <div className="bar-fill" style={{ width: '78%' }} />
              </div>
              <p>78 of 100 employees trained</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-bottom">
        <div className="card chart-card">
          <div className="chart-head">
            <div>
              <h3>Case Ageing by Stage</h3>
              <p>Monthly distribution across workflow stages</p>
            </div>
            <span className="meta-pill">82 cases tracked</span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={AGEING_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4da" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Acknowledgement" fill="#5b8a80" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Committee" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Proceedings" fill="#c08b2c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Evidence" fill="#3a7ec0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Report" fill="#3d8b5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="side-stack">
          <div className="card">
            <h3>Recent Alerts</h3>
            <ul className="list">
              {ALERTS.map((a) => (
                <li key={a.text}>
                  <span>{a.text}</span>
                  <small>{a.time}</small>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3>Recent Activity</h3>
            <ul className="list">
              {ACTIVITY.map((a) => (
                <li key={a.text}>
                  <span>{a.text}</span>
                  <small>{a.time}</small>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3>Cases by Department</h3>
            <div className="dept-list">
              {DEPARTMENTS.map((d) => (
                <div key={d.name} className="dept-row">
                  <span>{d.name}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(d.count / 6) * 100}%` }} />
                  </div>
                  <strong>{d.count}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
