import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, FileBadge2, Minus, ShieldCheck } from 'lucide-react'
import { AnnualReportDossier } from '../components/ui/AnnualReportDossier'
import { ANNUAL_REPORT } from '../data/annualReport'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CASES,
  CLOSED_CASES,
  OPEN_CASES,
  averageDaysToClosure,
  hasLiveInquiryClock,
} from '../lib/data/cases'
import { CASE_STAGES, STAGE_LABEL, type Case, type CaseStage } from '../lib/data/types'
import { REPORTING_DATE, STATUTORY } from '../lib/data/statutory'
import { useRole } from '../lib/role-context'
import { formatDate, formatNumber } from '../lib/format'
import { StagePill } from '../components/ui/StagePill'

const ICON = { size: 16, strokeWidth: 1.5 } as const
const AXIS = { fontSize: 12, fill: '#5c6b77' }
const GRID = '#1e2d36'

const HUE = {
  accent: '#10b981',
  info: '#3b82f6',
  warning: '#f59e0b',
  danger: '#ef4444',
  violet: '#a78bfa',
  muted: '#5c6b77',
}

/* ------------------------------------------------------------------ *
 * KPI cards with inline sparklines
 * ------------------------------------------------------------------ */

interface Kpi {
  key: string
  label: string
  value: string
  spark: number[]
  hue: string
  delta: { direction: 'up' | 'down' | 'flat'; intent: 'positive' | 'negative' | 'neutral'; text: string }
  critical?: boolean
}

const DELTA_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus }
const DELTA_TONE = { positive: 'text-accent', negative: 'text-danger', neutral: 'text-faint' }

function Sparkline({ data, hue }: { data: number[]; hue: string }) {
  const series = data.map((v, i) => ({ i, v }))
  const id = `sp-${hue.replace('#', '')}`
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hue} stopOpacity={0.28} />
            <stop offset="100%" stopColor={hue} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={hue}
          strokeWidth={1.5}
          fill={`url(#${id})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function KpiCard({ kpi, index }: { kpi: Kpi; index: number }) {
  const Arrow = DELTA_ICON[kpi.delta.direction]
  return (
    <div
      className="card card-hover rise flex flex-col p-5"
      style={{ '--i': index } as React.CSSProperties}
    >
      <div className="flex min-h-8 items-start text-12 uppercase leading-[1.35] tracking-wider text-muted">
        {kpi.label}
      </div>
      <div className="mt-2 flex h-8 items-center">
        <span className={`text-30 leading-none tracking-[-0.02em] ${kpi.critical ? 'text-danger' : 'text-ink'}`}>
          {kpi.value}
        </span>
      </div>
      <div className="mt-3 -mx-1">
        <Sparkline data={kpi.spark} hue={kpi.hue} />
      </div>
      <div className={`mt-auto flex min-h-8 items-start gap-2 pt-2 text-12 ${DELTA_TONE[kpi.delta.intent]}`}>
        <Arrow size={14} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
        <span className="leading-[1.35]">{kpi.delta.text}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Page
 * ------------------------------------------------------------------ */

const AGEING_BUCKETS = [
  { key: 'b0', label: '0–30 days', color: HUE.muted, match: (d: number) => d <= 30 },
  { key: 'b31', label: '31–60 days', color: HUE.info, match: (d: number) => d > 30 && d <= 60 },
  { key: 'b61', label: '61–90 days', color: HUE.warning, match: (d: number) => d > 60 && d <= 90 },
  { key: 'b90', label: '90+ days', color: HUE.danger, match: (d: number) => d > 90 },
]

const INTAKE = [
  { m: 'Jun 25', n: 1 }, { m: 'Jul', n: 2 }, { m: 'Aug', n: 1 }, { m: 'Sep', n: 2 },
  { m: 'Oct', n: 1 }, { m: 'Nov', n: 2 }, { m: 'Dec', n: 1 }, { m: 'Jan 26', n: 2 },
  { m: 'Feb', n: 1 }, { m: 'Mar', n: 2 }, { m: 'Apr', n: 3 }, { m: 'May', n: 4 },
  { m: 'Jun', n: 1 }, { m: 'Jul', n: 1 },
]

export function ManagementPage() {
  const navigate = useNavigate()
  const { maskParty, can } = useRole()

  const breached = CASES.filter((c) => c.isBreached)
  // Only cases whose inquiry clock is still running can be "due" — a case at the
  // employer-action stage has already concluded its inquiry.
  const live = OPEN_CASES.filter(hasLiveInquiryClock)
  const critical = live.filter((c) => !c.isBreached && c.daysRemaining <= 7)
  const avgClosure = averageDaysToClosure()

  const KPIS: Kpi[] = [
    { key: 'open', label: 'Open cases', value: String(OPEN_CASES.length), spark: [12, 14, 15, 17, 18, 19, 19], hue: HUE.accent, delta: { direction: 'up', intent: 'neutral', text: '4 more vs last quarter' } },
    { key: 'breach', label: 'Breached', value: String(breached.length), critical: true, spark: [3, 3, 2, 2, 2, 1, 1], hue: HUE.danger, delta: { direction: 'down', intent: 'positive', text: '2 fewer vs last quarter' } },
    { key: 'critical', label: 'Due within 7 days', value: String(critical.length), spark: [1, 2, 1, 3, 2, 2, 2], hue: HUE.warning, delta: { direction: 'flat', intent: 'neutral', text: 'Unchanged vs last quarter' } },
    { key: 'avg', label: 'Average days to closure', value: String(avgClosure), spark: [79, 76, 74, 71, 69, 68, 67], hue: HUE.info, delta: { direction: 'down', intent: 'positive', text: '12 days faster' } },
    { key: 'closed', label: 'Closed', value: String(CLOSED_CASES.length), spark: [1, 2, 2, 3, 4, 4, 5], hue: HUE.violet, delta: { direction: 'up', intent: 'positive', text: '2 more vs last quarter' } },
    { key: 'coverage', label: 'Training coverage', value: '94%', spark: [82, 85, 87, 89, 91, 93, 94], hue: HUE.accent, delta: { direction: 'up', intent: 'positive', text: '5 points' } },
  ]

  const ageing = useMemo(
    () =>
      CASE_STAGES.filter((s: CaseStage) => s !== 'closed' && s !== 'archived')
        .map((stage) => {
          const inStage = OPEN_CASES.filter((c) => c.stage === stage)
          const row: Record<string, number | string> = { stage: STAGE_LABEL[stage], total: inStage.length }
          for (const b of AGEING_BUCKETS) row[b.key] = inStage.filter((c) => b.match(c.daysElapsed)).length
          return row
        })
        .filter((r) => (r.total as number) > 0),
    [],
  )

  const mix = useMemo(() => {
    const groups = [
      { name: 'On track', value: live.filter((c) => !c.isBreached && c.daysRemaining > 30).length, color: HUE.accent },
      { name: 'Watch', value: live.filter((c) => !c.isBreached && c.daysRemaining <= 30 && c.daysRemaining > 7).length, color: HUE.info },
      { name: 'Critical', value: critical.length, color: HUE.warning },
      { name: 'Breached', value: breached.filter(hasLiveInquiryClock).length, color: HUE.danger },
    ]
    return groups.filter((g) => g.value > 0)
  }, [live, breached, critical.length])

  const urgent = [...live].sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 8)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-20 tracking-[-0.02em]">Compliance command centre</h1>
          <p className="mt-1 flex items-center gap-2 text-13 text-muted">
            <span className="live-dot" aria-hidden="true" />
            Live · as at {formatDate(REPORTING_DATE)}
          </p>
        </div>
        {!can('view:identities') ? (
          <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-12 text-muted">
            <ShieldCheck {...ICON} className="text-accent" />
            Anonymised view — identities are never rendered
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {KPIS.map((k, i) => (
          <KpiCard key={k.key} kpi={k} index={i} />
        ))}
      </div>

      {/* Annual Report Submission Format — interactive dossier */}
      <section className="card rise overflow-hidden" style={{ '--i': 5 } as React.CSSProperties}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 grid h-9 w-9 place-items-center rounded-md"
              style={{ background: 'rgba(16,185,129,0.14)', color: '#6ee7b7' }}
            >
              <FileBadge2 {...ICON} />
            </div>
            <div>
              <h3 className="text-16 tracking-[-0.02em]">Annual report submission format</h3>
              <p className="mt-1 text-13 text-muted">
                PoSH Act 2013 workplace filing · FY {ANNUAL_REPORT.year} · District Officer ready
              </p>
            </div>
          </div>
          <Link to="/annual-report" className="btn btn-secondary">
            Open full dossier
          </Link>
        </div>
        <div className="p-5">
          <AnnualReportDossier variant="embedded" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section className="card sweep-line rise p-5" style={{ '--i': 6 } as React.CSSProperties}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-16 tracking-[-0.02em]">Case ageing by stage</h3>
              <p className="mt-1 text-13 text-muted">{OPEN_CASES.length} open · days since filing</p>
            </div>
            <div className="flex flex-wrap justify-end gap-x-4 gap-y-2">
              {AGEING_BUCKETS.map((b) => (
                <span key={b.key} className="flex items-center gap-2 text-12 text-muted">
                  <span className="h-2 w-2 rounded-sm" style={{ background: b.color }} />
                  {b.label}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ageing} layout="vertical" barSize={12} margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" allowDecimals={false} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
              <YAxis type="category" dataKey="stage" width={124} tick={AXIS} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ background: '#111b21', border: '1px solid #1e2d36', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e6edf3' }}
              />
              {AGEING_BUCKETS.map((b) => (
                <Bar key={b.key} dataKey={b.key} name={b.label} stackId="a" fill={b.color} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="card rise p-5" style={{ '--i': 7 } as React.CSSProperties}>
          <h3 className="text-16 tracking-[-0.02em]">Statutory risk mix</h3>
          <p className="mt-1 text-13 text-muted">Cases inside a running inquiry window</p>
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={mix}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {mix.map((m) => (
                    <Cell key={m.name} fill={m.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#111b21', border: '1px solid #1e2d36', borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-30 leading-none tracking-[-0.02em]">{live.length}</span>
              <span className="mt-1 text-12 text-faint">in inquiry</span>
            </div>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {mix.map((m) => (
              <div key={m.name} className="flex items-center gap-2 text-13">
                <span className="h-2 w-2 rounded-sm" style={{ background: m.color }} />
                <span className="text-muted">{m.name}</span>
                <span className="ml-auto text-ink">{m.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card rise p-5" style={{ '--i': 8 } as React.CSSProperties}>
        <div className="mb-4">
          <h3 className="text-16 tracking-[-0.02em]">Complaints received</h3>
          <p className="mt-1 text-13 text-muted">
            {formatNumber(INTAKE.reduce((s, i) => s + i.n, 0))} over the trailing 14 months
          </p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={INTAKE} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="m" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
            <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={32} />
            <Tooltip
              cursor={{ stroke: GRID }}
              contentStyle={{ background: '#111b21', border: '1px solid #1e2d36', borderRadius: 8, fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="n"
              stroke={HUE.accent}
              strokeWidth={1.5}
              dot={{ r: 2, fill: HUE.accent, strokeWidth: 0 }}
              activeDot={{ r: 4, fill: HUE.accent, stroke: '#0a1014', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="card rise" style={{ '--i': 9 } as React.CSSProperties}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 className="text-16 tracking-[-0.02em]">Requires attention</h3>
            <p className="mt-1 text-13 text-muted">
              {breached.length} breached · {critical.length} due within 7 days
            </p>
          </div>
        </div>
        <div className="table-wrap" style={{ maxHeight: 'none' }}>
          <table className="data" style={{ minWidth: 980 }}>
            <colgroup>
              <col style={{ width: 148 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 160 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Case</th>
                <th>Stage</th>
                <th>Complainant</th>
                <th>Respondent</th>
                <th className="num">Day</th>
                <th className="num">Days left</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {urgent.map((c: Case) => (
                <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)} style={{ cursor: 'pointer' }}>
                  <td className="mono" style={{ color: 'var(--color-accent)' }}>
                    {c.id}
                  </td>
                  <td>
                    <StagePill stage={c.stage} />
                  </td>
                  <td>{maskParty(c.complainant)}</td>
                  <td>{maskParty(c.respondent)}</td>
                  <td className="num">{c.daysElapsed}</td>
                  <td className="num">
                    {c.isBreached ? (
                      <span className="font-medium text-danger">Breached</span>
                    ) : (
                      <span
                        className={
                          c.daysRemaining <= 7
                            ? 'font-medium text-danger'
                            : c.daysRemaining <= 30
                              ? 'font-medium text-warning'
                              : 'font-medium text-success'
                        }
                      >
                        {c.daysRemaining}
                      </span>
                    )}
                  </td>
                  <td className="text-muted">{c.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-5 py-3 text-12 text-faint">
          Statutory window: {STATUTORY.INQUIRY_DAYS} days from filing · PoSH Act 2013, s.11(4)
        </div>
      </section>
    </div>
  )
}
