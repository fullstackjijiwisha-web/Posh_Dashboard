import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Building2,
  Check,
  Gauge,
  Inbox,
  ShieldPlus,
  Siren,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { STAGE_META, isWorkflowTerminal } from '../lib/workflow/types'
import { CoverageRing, FigureTile, SparkBars } from '../components/workflow/Dials'
import { ResponseDensityChart } from '../components/workflow/Charts'
import { constitutionTests, allMet } from '../lib/workflow/quorum'
import { complianceIndex, complianceTrends, slaHealth, monthlyTrend, type FlowPair } from '../lib/workflow/analytics'
import { COMPLIANCE } from '../data/mock'
import { ANNUAL_REPORT } from '../data/annualReport'
import { DEPARTMENTS } from '../lib/data/cases'
import { formatNumber } from '../lib/format'
import { AdminDashboardPage } from './AdminDashboard'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/workflow/Dials.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

/**
 * The Company Owner's governance band.
 *
 * The owner is not a caseworker. They need four numbers, one judgement, the two powers
 * nobody else holds — provisioning a POSH Admin and setting company policy — and the
 * notices that would embarrass them if they learned of them from somewhere else.
 *
 * Everything the administrator sees is still here: the full console renders below this
 * band rather than being replaced by it, because the owner panel is the administrator's
 * plus governance, not instead of.
 */
export function OwnerDashboardPage() {
  const { allCases, flowFor, committees, admins, notifications, createAdminAccount } = useWorkflow()
  const { currentUser } = useRole()

  const [provisioning, setProvisioning] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', department: 'Human Resources' })

  const pairs = useMemo<FlowPair[]>(
    () => allCases.map((record) => ({ record, flow: flowFor(record.id) })).filter((p): p is FlowPair => !!p.flow),
    [allCases, flowFor],
  )

  const open = pairs.filter((p) => !isWorkflowTerminal(p.flow.stage))
  const pending = open.filter((p) => !['case_closed', 'employee_notified', 'decision_viewed'].includes(p.flow.stage))
  const breached = allCases.filter((c) => c.isBreached)
  const boardsValid = committees.length > 0 && committees.every((b) => allMet(constitutionTests(b.memberIds)))

  const sla = useMemo(() => slaHealth(allCases), [allCases])
  const trend = useMemo(() => monthlyTrend(allCases), [allCases])
  const audits = useMemo(
    () => complianceTrends(allCases, COMPLIANCE.totalEmployees, 7),
    [allCases],
  )

  // s.19 duty evidence — the same seven-of-ten the duty register reports.
  const dutiesEvidenced = 7
  const dutiesTotal = 10

  const index = useMemo(
    () =>
      complianceIndex({
        boardsValid,
        boardCount: committees.length,
        slaOverall: sla.overall,
        breachedCount: breached.length,
        openCount: open.length,
        dutiesEvidenced,
        dutiesTotal,
        trainingCoveragePct: COMPLIANCE.trainingCoveragePct,
        annualReturnReady: ANNUAL_REPORT.functionalIc,
      }),
    [boardsValid, committees.length, sla.overall, breached.length, open.length],
  )

  /**
   * Important notices are derived, not filtered from the feed. An owner should be shown
   * the things that carry consequence — a breach, a flagged concern, an unlawful board —
   * and not made to find them among routine stage changes.
   */
  const important = useMemo(() => {
    const items: Array<{ id: string; title: string; detail: string; at: string; severity: 'high' | 'medium'; to: string }> = []

    for (const c of breached) {
      items.push({
        id: `brk-${c.id}`,
        title: `${c.id} has run past ninety days`,
        detail: c.breachReason
          ? `A reason is on file. Reportable in the annual return under Rule 8(5).`
          : 'No reason is recorded. That omission, not the overrun, is the reportable failure.',
        at: c.filedDate,
        severity: c.breachReason ? 'medium' : 'high',
        to: `/cases/${c.id}`,
      })
    }

    for (const { record, flow } of pairs) {
      for (const n of flow.advisoryNotes.filter((x) => x.concern)) {
        items.push({
          id: n.id,
          title: `Concern raised on ${record.id}`,
          detail: `${n.author} — ${n.text}`,
          at: n.at,
          severity: 'high',
          to: `/cases/${record.id}`,
        })
      }
    }

    if (!boardsValid && committees.length) {
      const bad = committees.find((b) => !allMet(constitutionTests(b.memberIds)))
      if (bad) {
        items.push({
          id: `board-${bad.id}`,
          title: `${bad.name} does not satisfy s.4`,
          detail: constitutionTests(bad.memberIds)
            .filter((t) => !t.met)
            .map((t) => t.detail)
            .join(' '),
          at: bad.createdAt,
          severity: 'high',
          to: '/committee',
        })
      }
    }

    for (const n of notifications.filter((x) => x.title.includes('POSH Admin account'))) {
      items.push({ id: n.id, title: n.title, detail: n.detail, at: n.at, severity: 'medium', to: '/employees' })
    }

    return items.sort((a, b) => (a.severity === b.severity ? b.at.localeCompare(a.at) : a.severity === 'high' ? -1 : 1))
  }, [breached, pairs, boardsValid, committees, notifications])

  const submitAdmin = () => {
    if (!form.name.trim() || !form.email.trim()) return
    createAdminAccount({ name: form.name.trim(), email: form.email.trim(), department: form.department })
    setForm({ name: '', email: '', department: 'Human Resources' })
    setProvisioning(false)
  }

  const densityNow = audits[audits.length - 1]?.density ?? 0
  const densityPrev = audits[audits.length - 2]?.density ?? 0
  const rateNow = audits.filter((a) => a.responseRate !== null).slice(-1)[0]?.responseRate ?? null

  return (
    <div className="flex flex-col gap-5">
      {/* ══ Governance band ══ */}
      <div className="ep-hero sweep-line">
        <div style={{ minWidth: 0 }}>
          <div className="ep-hero-greeting">
            {currentUser?.name}
            <span
              className="badge"
              style={{ marginLeft: 12, background: 'rgba(167,139,250,0.16)', color: '#c4b5fd', verticalAlign: 'middle' }}
            >
              Company Owner
            </span>
          </div>
          <p className="ep-hero-sub">
            Governance view. You hold the two powers nobody else does — provisioning the POSH Admin
            who runs this process, and setting the policy it runs under. The full administrator
            console is below.
          </p>
        </div>
        <div className="ep-hero-actions">
          {!provisioning && (
            <button type="button" className="btn btn-primary" onClick={() => setProvisioning(true)}>
              <ShieldPlus {...ICON} />
              Create POSH Admin
            </button>
          )}
          <Link to="/company-settings" className="btn btn-secondary">
            <Building2 {...ICON} />
            Company settings
          </Link>
        </div>
      </div>

      {/* ── The four figures ─────────────────────────────────────── */}
      <div className="figure-grid">
        <FigureTile
          label="Total employees"
          value={formatNumber(COMPLIANCE.totalEmployees)}
          meta={`${DEPARTMENTS.length} departments · ${formatNumber(COMPLIANCE.trainedEmployees)} trained`}
          aside={<CoverageRing value={COMPLIANCE.trainingCoveragePct} caption="covered" size={72} />}
        />
        <FigureTile
          label="Total complaints"
          value={allCases.length}
          meta={`${trend.reduce((s, t) => s + t.filed, 0)} filed in the last 12 months`}
          aside={<SparkBars values={trend.slice(-6).map((t) => t.filed)} />}
        />
        <FigureTile
          label="Pending cases"
          value={pending.length}
          tone={breached.length ? 'warning' : undefined}
          meta={breached.length ? `${breached.length} past the 90-day window` : 'All inside the statutory window'}
          aside={<SparkBars values={trend.slice(-6).map((t) => Math.max(0, t.filed - t.resolved))} tone="violet" />}
        />
        <FigureTile
          label="Compliance index"
          value={`${Math.round(index.score)}`}
          tone={index.grade === 'A' ? 'accent' : index.grade === 'D' ? 'danger' : 'warning'}
          meta={`Grade ${index.grade} · weighted across six measures`}
          aside={
            <CoverageRing
              value={index.score}
              caption={`grade ${index.grade}`}
              size={72}
              tone={index.grade === 'A' ? 'accent' : 'warning'}
            />
          }
        />
      </div>

      {/* ── Provisioning ─────────────────────────────────────────── */}
      {provisioning && (
        <section className="ep-card rise">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <UserPlus size={15} strokeWidth={1.5} />
              Provision a POSH Admin
            </span>
            <span className="meta-pill">owner only</span>
          </div>
          <div className="ep-card-body">
            <div className="wf-form">
              <div className="wf-form-row">
                <label className="wf-field">
                  Full name
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Devika Menon"
                    autoFocus
                  />
                </label>
                <label className="wf-field">
                  Work email
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@company.co.in"
                  />
                </label>
                <label className="wf-field">
                  Department
                  <select
                    className="select"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  >
                    {['Human Resources', ...DEPARTMENTS.filter((d) => d !== 'Human Resources')].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="text-12 text-muted" style={{ lineHeight: 1.6, maxWidth: '80ch' }}>
                A POSH Admin screens complaints, opens dockets, assigns committee boards, audits
                recommendations and records the employer’s decision. They never sit on the committee
                — keeping the administrator off the bench is what stops the employer marking its own
                homework.
              </p>
              <div className="wf-note-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setProvisioning(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={submitAdmin}
                  disabled={!form.name.trim() || !form.email.trim()}
                >
                  <Check {...ICON} />
                  Provision account
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="ep-grid">
        {/* ── Compliance index breakdown ───────────────────────── */}
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <Gauge size={15} strokeWidth={1.5} />
              Compliance index
            </span>
            <span className={`badge ${index.grade === 'A' ? 'badge-completed' : 'badge-medium'}`}>
              Grade {index.grade}
            </span>
          </div>
          <div className="ep-card-body">
            {index.weakest && (
              <div className="wf-blocked" style={{ marginBottom: 'var(--space-4)' }}>
                <Sparkles {...ICON} style={{ color: 'var(--color-warning)', marginTop: 1, flexShrink: 0 }} />
                <span>
                  <strong style={{ fontWeight: 500, color: 'var(--color-primary)' }}>Fix this first: </strong>
                  {index.weakest.label} — {index.weakest.detail}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {index.components.map((c) => (
                <div key={c.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)' }}>{c.label}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-secondary-text)', whiteSpace: 'nowrap' }}>
                      {Math.round(c.score)} · weight {Math.round(c.weight * 100)}%
                    </span>
                  </div>
                  <div className="bar-track" style={{ background: 'var(--color-border)', marginTop: 5 }}>
                    <div
                      className="bar-fill"
                      style={{
                        width: `${c.score}%`,
                        background:
                          c.score >= 90 ? 'var(--color-accent)' : c.score >= 65 ? 'var(--color-warning)' : 'var(--color-danger)',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--color-tertiary-text)', lineHeight: 1.5 }}>{c.detail}</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>
                      {c.cite}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Important notifications ──────────────────────────── */}
        <section className="ep-card" style={important.some((i) => i.severity === 'high') ? { borderColor: 'rgba(239,68,68,0.35)' } : undefined}>
          <div className="ep-card-head">
            <span className="ep-card-title">
              <Siren size={15} strokeWidth={1.5} style={{ color: 'var(--color-danger)' }} />
              Important notifications
            </span>
            <span className={`badge ${important.length ? 'badge-overdue' : 'badge-completed'}`}>
              {important.length}
            </span>
          </div>
          <div className="ep-card-body tight">
            {important.length === 0 ? (
              <p className="text-13 text-muted" style={{ padding: 'var(--space-5) 0' }}>
                Nothing requires your attention. Breaches, flagged concerns and unlawful board
                composition would appear here.
              </p>
            ) : (
              important.map((n) => (
                <div key={n.id} className="ep-doc" style={{ gridTemplateColumns: '18px 1fr auto' }}>
                  <span style={{ marginTop: 3 }}>
                    {n.severity === 'high' ? (
                      <AlertTriangle size={14} strokeWidth={2} style={{ color: 'var(--color-danger)' }} />
                    ) : (
                      <Inbox size={14} strokeWidth={1.5} style={{ color: 'var(--color-warning)' }} />
                    )}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="ep-doc-name">
                      <Link to={n.to} style={{ color: 'var(--color-accent)' }}>
                        {n.title}
                      </Link>
                    </div>
                    <div className="ep-doc-meta">{n.detail}</div>
                  </div>
                  <span
                    className={`badge ${n.severity === 'high' ? 'badge-overdue' : 'badge-medium'}`}
                    style={{ flexShrink: 0 }}
                  >
                    {n.severity === 'high' ? 'Act now' : 'Note'}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ── Compliance audits and trends ─────────────────────────── */}
      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">
            <TrendingUp size={15} strokeWidth={1.5} />
            Compliance audits &amp; trends
          </span>
          <span className="meta-pill">response rate vs incident density · last 7 months</span>
        </div>
        <div className="ep-card-body">
          <ResponseDensityChart data={audits} height={272} />
          <div className="figure-grid" style={{ marginTop: 'var(--space-5)' }}>
            <div>
              <div className="ep-field-label">Incident density now</div>
              <div className="ep-field-value">
                {densityNow.toFixed(2)} per 1,000
                <span
                  className="text-12"
                  style={{ marginLeft: 8, color: densityNow > densityPrev ? 'var(--color-warning)' : 'var(--color-accent)' }}
                >
                  {densityNow === densityPrev ? 'unchanged' : densityNow > densityPrev ? 'up' : 'down'} on last month
                </span>
              </div>
            </div>
            <div>
              <div className="ep-field-label">Latest response rate</div>
              <div className="ep-field-value">
                {rateNow === null ? '—' : `${rateNow}%`} within Rule 7(1)
              </div>
            </div>
            <div>
              <div className="ep-field-label">Mean days to serve notice</div>
              <div className="ep-field-value">
                {audits.filter((a) => a.responseDays !== null).slice(-1)[0]?.responseDays ?? '—'} days
              </div>
            </div>
          </div>
          <p className="text-12 text-muted" style={{ marginTop: 'var(--space-4)', lineHeight: 1.7, maxWidth: '84ch' }}>
            Read the two together. Rising density on its own is usually a good sign — it means people
            have started trusting the process, which is what the awareness programme is for. The
            shape to worry about is the green line sagging while the bars climb: that is volume
            outrunning the organisation’s ability to answer it.
          </p>
        </div>
      </section>

      {/* ── Establishment ────────────────────────────────────────── */}
      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">
            <Users size={15} strokeWidth={1.5} />
            Establishment
          </span>
          <Link to="/employees" className="text-13" style={{ color: 'var(--color-accent)' }}>
            Employee roster
          </Link>
        </div>
        <div className="ep-card-body">
          <div className="ep-field-list">
            <div>
              <div className="ep-field-label">POSH Admins provisioned</div>
              <div className="ep-field-value">{admins.length}</div>
              <div className="text-12 text-faint" style={{ marginTop: 2 }}>
                {admins.map((a) => a.name).join(', ')}
              </div>
            </div>
            <div>
              <div className="ep-field-label">Committee boards</div>
              <div className="ep-field-value">
                {committees.length} · {boardsValid ? 'all satisfy s.4' : 'one falls short of s.4'}
              </div>
            </div>
            <div>
              <div className="ep-field-label">Open / total cases</div>
              <div className="ep-field-value">
                {open.length} of {allCases.length}
              </div>
            </div>
            <div>
              <div className="ep-field-label">Stage holding most cases</div>
              <div className="ep-field-value">
                {(() => {
                  const counts = pairs.reduce<Record<string, number>>((acc, p) => {
                    acc[p.flow.stage] = (acc[p.flow.stage] ?? 0) + 1
                    return acc
                  }, {})
                  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
                  return top ? `${STAGE_META[top[0] as keyof typeof STAGE_META].label} (${top[1]})` : '—'
                })()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ Everything the administrator sees ══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          marginTop: 'var(--space-3)',
          color: 'var(--color-secondary-text)',
          fontSize: 'var(--text-xs)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        <span style={{ height: 1, flex: 1, background: 'var(--color-border)' }} />
        Administrator console
        <span style={{ height: 1, flex: 1, background: 'var(--color-border)' }} />
      </div>

      <AdminDashboardPage />
    </div>
  )
}
