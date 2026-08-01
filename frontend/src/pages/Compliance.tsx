import { Link } from 'react-router-dom'
import { AlertTriangle, Check, ClipboardCheck, Minus, Scale } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { CoverageRing, FigureTile } from '../components/workflow/Dials'
import { constitutionTests } from '../lib/workflow/quorum'
import { ANNUAL_REPORT } from '../data/annualReport'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/workflow/Dials.css'

type State = 'done' | 'partial' | 'todo'

interface Duty {
  title: string
  detail: string
  cite: string
  state: State
  evidence: string
}

/**
 * The employer's duties under s.19, as a register rather than a policy page.
 *
 * Section 19 is the part of the Act an employer is actually inspected against, and it is
 * a list of nine concrete things — not a principle. Each row here names the duty, what
 * currently evidences it, and whether that evidence would survive being asked for. A duty
 * marked partial is not a failure; it is the honest state of it, which is more useful to
 * the person who has to close the gap.
 */
export function CompliancePage() {
  const { committees, allCases, flowFor } = useWorkflow()

  const boards = committees.map((b) => ({ board: b, tests: constitutionTests(b.memberIds) }))
  const icCompliant = boards.every((b) => b.tests.every((t) => t.met))
  const defective = boards.filter((b) => b.tests.some((t) => !t.met))

  const breached = allCases.filter((c) => c.isBreached).length
  const reportsLate = allCases.filter((c) => {
    const f = flowFor(c.id)
    return f && ['minutes_recorded', 'recommendation_submitted'].includes(f.stage) && c.isBreached
  }).length

  const DUTIES: Duty[] = [
    {
      title: 'Provide a safe working environment',
      detail:
        'Safety extends to every person the employee comes into contact with at the workplace, not only colleagues — contractors, clients and visitors included.',
      cite: 's.19(a)',
      state: 'done',
      evidence: 'Workplace safety policy in force; interim relief available under s.12 on request.',
    },
    {
      title: 'Display the penal consequences and the committee’s constitution',
      detail:
        'The consequences of sexual harassment and the order constituting the Internal Committee must be displayed at a conspicuous place in the workplace.',
      cite: 's.19(b)',
      state: 'done',
      evidence: `Displayed at ${ANNUAL_REPORT.displayLocations || 'all sites'}.`,
    },
    {
      title: 'Organise awareness workshops for employees',
      detail:
        'Regular workshops and awareness programmes to sensitise employees to the provisions of the Act.',
      cite: 's.19(c)',
      state: ANNUAL_REPORT.awarenessWorkshops.count >= 2 ? 'done' : 'partial',
      evidence: `${ANNUAL_REPORT.awarenessWorkshops.count} workshops this year · ${ANNUAL_REPORT.awarenessWorkshops.mode} · ${ANNUAL_REPORT.awarenessWorkshops.audience}.`,
    },
    {
      title: 'Orientation programmes for Internal Committee members',
      detail:
        'Members must be oriented to their role and the skills the inquiry demands. An untrained committee is the commonest reason findings are set aside.',
      cite: 's.19(c)',
      state: ANNUAL_REPORT.sensitizationWorkshops.count >= 1 ? 'done' : 'todo',
      evidence: `${ANNUAL_REPORT.sensitizationWorkshops.count} sessions · ${ANNUAL_REPORT.icMembers.length} members · resource person ${ANNUAL_REPORT.resourcePerson.name}.`,
    },
    {
      title: 'Provide facilities to the Internal Committee',
      detail:
        'The committee must have what it needs to hold sittings and deal with the complaint — a private room, secretarial support, and the means to keep the record.',
      cite: 's.19(d)',
      state: 'done',
      evidence: 'Committee rooms reserved at each site; case management platform provided.',
    },
    {
      title: 'Assist in securing attendance of respondent and witnesses',
      detail:
        'The committee has civil court powers under s.11(3), and the employer must make those powers effective in practice.',
      cite: 's.19(e)',
      state: 'done',
      evidence: 'Attendance directions routed through HR; refusals recorded against the case.',
    },
    {
      title: 'Make information available to the committee',
      detail:
        'Records the committee requires under Rule 8 must be produced — personnel files, access logs, correspondence.',
      cite: 's.19(f)',
      state: 'partial',
      evidence: 'Produced on written request. Standing access is deliberately not granted.',
    },
    {
      title: 'Assist the complainant if she chooses to file a criminal complaint',
      detail:
        'Where the conduct is also an offence, the employer must help the complainant initiate action, including against a person who is not an employee.',
      cite: 's.19(g)',
      state: 'done',
      evidence: 'Referral pathway documented in the Help centre; no requirement to choose one route.',
    },
    {
      title: 'Treat sexual harassment as misconduct under the service rules',
      detail:
        'The service rules must name it as misconduct, otherwise a recommendation under s.13(3)(i) has nothing to bite on.',
      cite: 's.19(h)',
      state: 'done',
      evidence: 'Standing orders amended; s.13(3)(i) recommendations enforceable.',
    },
    {
      title: 'Monitor timely submission of reports by the committee',
      detail:
        'The inquiry must finish within 90 days and the report reach the employer within 10 days of that. Monitoring is the employer’s duty, not the committee’s courtesy.',
      cite: 's.19(i)',
      state: breached > 0 ? 'partial' : 'done',
      evidence:
        breached > 0
          ? `${breached} inquiry/inquiries have run past 90 days with a recorded reason. Reportable under Rule 8(5).`
          : 'Every inquiry concluded within the statutory window.',
    },
  ]

  const done = DUTIES.filter((d) => d.state === 'done').length
  const partial = DUTIES.filter((d) => d.state === 'partial').length
  const score = Math.round((done / DUTIES.length) * 100)

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Employer duties</h1>
          <p>
            The nine obligations under Section 19, each with the evidence that currently supports
            it. This is the register an inspection asks for.
          </p>
        </div>
        <span className="meta-pill">{ANNUAL_REPORT.year}</span>
      </div>

      <div className="figure-grid">
        <FigureTile
          label="Duties fully evidenced"
          value={`${done}/${DUTIES.length}`}
          tone={done === DUTIES.length ? 'accent' : undefined}
          meta={partial ? `${partial} partially evidenced` : 'All evidenced'}
        />
        <FigureTile
          label="Committee constitution"
          value={icCompliant ? 'Valid' : 'Defective'}
          tone={icCompliant ? 'accent' : 'warning'}
          meta={icCompliant ? `${committees.length} boards, all satisfying s.4` : `${defective.length} board(s) short of s.4`}
        />
        <FigureTile
          label="Inquiries past 90 days"
          value={breached}
          tone={breached ? 'danger' : undefined}
          meta="Reportable under Rule 8(5) with a recorded reason"
        />
        <FigureTile
          label="Reports overdue to employer"
          value={reportsLate}
          tone={reportsLate ? 'warning' : undefined}
          meta="s.13(1) — within 10 days of the inquiry concluding"
        />
      </div>

      <div className="ep-grid">
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <ClipboardCheck size={15} strokeWidth={1.5} />
              Section 19 duty register
            </span>
            <span className="meta-pill">{DUTIES.length} duties</span>
          </div>
          <div className="ep-card-body tight">
            {DUTIES.map((d) => (
              <div key={d.cite + d.title} className={`duty ${d.state}`}>
                <span className="duty-mark">
                  {d.state === 'done' ? (
                    <Check size={11} strokeWidth={2.5} />
                  ) : d.state === 'partial' ? (
                    <Minus size={11} strokeWidth={2.5} />
                  ) : (
                    <AlertTriangle size={10} strokeWidth={2.5} />
                  )}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="duty-title">{d.title}</div>
                  <div className="duty-detail">{d.detail}</div>
                  <div className="duty-detail" style={{ color: 'var(--color-primary)' }}>
                    <strong style={{ fontWeight: 500 }}>Evidence: </strong>
                    {d.evidence}
                  </div>
                  <div className="duty-cite">{d.cite}</div>
                </div>
                <span
                  className={`badge ${
                    d.state === 'done' ? 'badge-completed' : d.state === 'partial' ? 'badge-medium' : 'badge-overdue'
                  }`}
                >
                  {d.state === 'done' ? 'Evidenced' : d.state === 'partial' ? 'Partial' : 'Gap'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-5">
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">Duty coverage</span>
            </div>
            <div
              className="ep-card-body"
              style={{ display: 'flex', gap: 'var(--space-5)', alignItems: 'center', flexWrap: 'wrap' }}
            >
              <CoverageRing
                value={score}
                caption="Fully evidenced"
                tone={score === 100 ? 'accent' : 'warning'}
              />
              <div style={{ minWidth: 140, flex: 1 }}>
                <p className="text-12 text-muted" style={{ lineHeight: 1.7 }}>
                  A partial duty is not a breach — it is a duty whose evidence would not survive
                  being asked for. Closing those is cheaper before an inspection than during one.
                </p>
              </div>
            </div>
          </section>

          {defective.length > 0 && (
            <section className="ep-card" style={{ borderColor: 'rgba(245,158,11,0.4)' }}>
              <div className="ep-card-head">
                <span className="ep-card-title">
                  <AlertTriangle size={15} strokeWidth={1.5} style={{ color: 'var(--color-warning)' }} />
                  Constitution gaps
                </span>
              </div>
              <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {defective.map(({ board, tests }) => (
                  <div key={board.id} className="wf-blocked">
                    <span>
                      <strong style={{ fontWeight: 500, color: 'var(--color-primary)' }}>{board.name}</strong> —{' '}
                      {tests
                        .filter((t) => !t.met)
                        .map((t) => t.detail)
                        .join(' ')}
                    </span>
                  </div>
                ))}
                <Link to="/committee" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
                  Open committee console
                </Link>
              </div>
            </section>
          )}

          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <Scale size={15} strokeWidth={1.5} />
                Where this goes
              </span>
            </div>
            <div className="ep-card-body">
              <p className="text-12 text-muted" style={{ lineHeight: 1.7 }}>
                Section 21 requires the committee’s annual report to the employer and the District
                Officer; Section 22 requires the number of cases to appear in the Board’s Report.
                Both draw on this register.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <Link to="/annual-report" className="btn btn-secondary">
                  Annual return
                </Link>
                <Link to="/reports/board-disclosure" className="btn btn-secondary">
                  Board’s Report
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
