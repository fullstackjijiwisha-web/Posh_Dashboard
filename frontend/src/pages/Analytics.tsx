import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Building2, Gauge, PieChart as PieIcon, Scale, Star, TrendingUp } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { CoverageRing, FigureTile } from '../components/workflow/Dials'
import { TrendChart, StatusDonut, SliceLegend, DepartmentChart, HBarChart } from '../components/workflow/Charts'
import {
  monthlyTrend,
  statusBreakdown,
  slaHealth,
  byDepartment,
  medianDaysToClosure,
  decisionStatistics,
  feedbackSummary,
  type FlowPair,
} from '../lib/workflow/analytics'
import { STAGE_META } from '../lib/workflow/types'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/workflow/Dials.css'

/**
 * Reports and analytics.
 *
 * The hub. Three questions an administrator is asked at board level — is the volume
 * moving, is the process holding its timelines, and where is it concentrated — and links
 * out to the three narrower registers that answer for outcomes, complainant experience
 * and case-by-case adherence.
 */
export function AnalyticsPage() {
  const { allCases, flowFor } = useWorkflow()

  const pairs = useMemo<FlowPair[]>(
    () => allCases.map((record) => ({ record, flow: flowFor(record.id) })).filter((p): p is FlowPair => !!p.flow),
    [allCases, flowFor],
  )

  const trend = useMemo(() => monthlyTrend(allCases), [allCases])
  const breakdown = useMemo(() => statusBreakdown(pairs), [pairs])
  const sla = useMemo(() => slaHealth(allCases), [allCases])
  const departments = useMemo(() => byDepartment(pairs), [pairs])
  const median = useMemo(() => medianDaysToClosure(allCases), [allCases])
  const decisions = useMemo(() => decisionStatistics(pairs), [pairs])
  const feedback = useMemo(() => feedbackSummary(pairs), [pairs])

  const filedThisYear = trend.reduce((s, t) => s + t.filed, 0)
  const resolvedThisYear = trend.reduce((s, t) => s + t.resolved, 0)
  const onTimeThisYear = trend.reduce((s, t) => s + t.onTime, 0)

  // Stage bottleneck — the position holding the most cases right now.
  const busiest = [...breakdown].sort((a, b) => b.value - a.value)[0]
  const stageCounts = pairs.reduce<Record<string, number>>((acc, p) => {
    acc[p.flow.stage] = (acc[p.flow.stage] ?? 0) + 1
    return acc
  }, {})
  const bottleneck = Object.entries(stageCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Reports and analytics</h1>
          <p>
            Volume, timeliness and concentration across the caseload. Figures are drawn from the
            same source the annual return is built from.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/decision-statistics" className="btn btn-secondary">
            <Scale size={14} strokeWidth={1.5} />
            Decision statistics
          </Link>
          <Link to="/feedback-ratings" className="btn btn-secondary">
            <Star size={14} strokeWidth={1.5} />
            Feedback
          </Link>
          <Link to="/resolution-audit" className="btn btn-secondary">
            <Gauge size={14} strokeWidth={1.5} />
            Resolution audit
          </Link>
        </div>
      </div>

      <div className="figure-grid">
        <FigureTile label="Filed — 12 months" value={filedThisYear} meta={`${resolvedThisYear} concluded in the same period`} />
        <FigureTile
          label="Concluded within 90 days"
          value={resolvedThisYear ? `${Math.round((onTimeThisYear / resolvedThisYear) * 100)}%` : '—'}
          tone={resolvedThisYear && onTimeThisYear / resolvedThisYear >= 0.9 ? 'accent' : 'warning'}
          meta={`${onTimeThisYear} of ${resolvedThisYear} · s.11(4)`}
        />
        <FigureTile label="Median days to conclude" value={median} meta="Statutory limit 90" />
        <FigureTile
          label="Busiest position"
          value={bottleneck ? bottleneck[1] : 0}
          meta={bottleneck ? STAGE_META[bottleneck[0] as keyof typeof STAGE_META].label : '—'}
        />
      </div>

      {/* Trend */}
      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">
            <TrendingUp size={15} strokeWidth={1.5} />
            Monthly complaint trend
          </span>
          <span className="meta-pill">filed · concluded · within 90 days</span>
        </div>
        <div className="ep-card-body">
          <TrendChart data={trend} height={280} />
        </div>
      </section>

      <div className="ep-grid">
        {/* Status */}
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <PieIcon size={15} strokeWidth={1.5} />
              Where the caseload sits
            </span>
            <span className="meta-pill">{busiest ? `${busiest.name} leads` : ''}</span>
          </div>
          <div className="ep-card-body">
            <StatusDonut data={breakdown} height={220} />
            <div style={{ marginTop: 'var(--space-4)' }}>
              <SliceLegend data={breakdown} />
            </div>
          </div>
        </section>

        {/* SLA */}
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <Gauge size={15} strokeWidth={1.5} />
              Timeliness by provision
            </span>
            <Link to="/resolution-audit" className="text-13" style={{ color: 'var(--color-accent)' }}>
              Case by case
            </Link>
          </div>
          <div className="ep-card-body" style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center', flexWrap: 'wrap' }}>
            <CoverageRing value={sla.overall} caption="within time" tone={sla.overall >= 90 ? 'accent' : 'warning'} size={128} />
            <div style={{ minWidth: 230, flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {sla.bands.map((b) => (
                <div key={b.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 'var(--text-sm)' }}>{b.label}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-secondary-text)' }}>
                      {Math.round(b.pct)}%
                    </span>
                  </div>
                  <div className="bar-track" style={{ background: 'var(--color-border)', marginTop: 5 }}>
                    <div
                      className="bar-fill"
                      style={{
                        width: `${b.pct}%`,
                        background: b.pct >= 90 ? 'var(--color-accent)' : b.pct >= 70 ? 'var(--color-warning)' : 'var(--color-danger)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="ep-grid">
        {/* Departments */}
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <Building2 size={15} strokeWidth={1.5} />
              Concentration by department
            </span>
            <span className="meta-pill">{departments.length} departments</span>
          </div>
          <div className="ep-card-body">
            <DepartmentChart data={departments} height={280} />
            <p className="text-12 text-muted" style={{ marginTop: 'var(--space-3)', lineHeight: 1.6, maxWidth: '74ch' }}>
              Concentration is a signal about a workplace, not about a department’s people. Read it
              alongside headcount before drawing a conclusion from it.
            </p>
          </div>
        </section>

        {/* Provisions */}
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <BarChart3 size={15} strokeWidth={1.5} />
              Provisions relied on
            </span>
            <Link to="/decision-statistics" className="text-13" style={{ color: 'var(--color-accent)' }}>
              Decisions
            </Link>
          </div>
          <div className="ep-card-body">
            {decisions.provisions.length ? (
              <HBarChart data={decisions.provisions} height={200} hue="#a78bfa" />
            ) : (
              <p className="text-13 text-muted">No recommendation has been issued yet.</p>
            )}
            <div className="ep-field-list" style={{ marginTop: 'var(--space-4)' }}>
              <div>
                <div className="ep-field-label">Decisions recorded</div>
                <div className="ep-field-value">{decisions.decided}</div>
              </div>
              <div>
                <div className="ep-field-label">Feedback average</div>
                <div className="ep-field-value">
                  {feedback.count ? `${feedback.average.toFixed(1)} / 5` : 'No responses yet'}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
