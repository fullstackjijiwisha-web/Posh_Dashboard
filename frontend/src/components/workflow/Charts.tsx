import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AuditTrendPoint, Slice, TrendPoint } from '../../lib/workflow/analytics'
import './Dials.css'

/**
 * Chart wrappers for the administrator's console.
 *
 * Recharts is already the app's charting library, so these are thin — their whole job is
 * to hold the dark-theme axis and grid conventions in one place. Every chart here uses
 * the same tick colour, the same hairline grid and the same tooltip surface, because
 * five charts on one screen that each style themselves is how a dashboard starts to look
 * assembled rather than designed.
 */

const AXIS = { fontSize: 11, fill: '#5c6b77' }
const GRID = '#1e2d36'

const TOOLTIP_STYLE = {
  background: '#16232a',
  border: '1px solid #2a3c47',
  borderRadius: 6,
  fontSize: 12,
  color: '#e6edf3',
  padding: '8px 10px',
} as const

const tooltipProps = {
  contentStyle: TOOLTIP_STYLE,
  itemStyle: { color: '#e6edf3' },
  labelStyle: { color: '#8b9ba8', marginBottom: 4 },
  cursor: { fill: 'rgba(139,155,168,0.06)' },
} as const

/* ------------------------------------------------------------------ *
 * Monthly complaint trend
 * ------------------------------------------------------------------ */

export function TrendChart({ data, height = 240 }: { data: TrendPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="gradFiled" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.34} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradResolved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.26} />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
        <XAxis dataKey="month" tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
        <Tooltip {...tooltipProps} />
        <Legend
          verticalAlign="top"
          align="right"
          height={28}
          iconType="plainline"
          wrapperStyle={{ fontSize: 12, color: '#8b9ba8' }}
        />
        <Area
          type="monotone"
          dataKey="filed"
          name="Filed"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#gradFiled)"
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="resolved"
          name="Concluded"
          stroke="#a78bfa"
          strokeWidth={2}
          fill="url(#gradResolved)"
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
        <Line
          type="monotone"
          dataKey="onTime"
          name="Within 90 days"
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ------------------------------------------------------------------ *
 * Status breakdown — a donut, not a pie
 * ------------------------------------------------------------------ */

/**
 * Donut rather than pie: the centre is where the total goes, and a reader comparing two
 * adjacent bands judges arc length more reliably than wedge area.
 */
export function StatusDonut({
  data,
  height = 240,
  centreLabel = 'cases',
}: {
  data: Slice[]
  height?: number
  centreLabel?: string
}) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="86%"
            paddingAngle={2}
            stroke="none"
            startAngle={90}
            endAngle={-270}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.hue} />
            ))}
          </Pie>
          <Tooltip {...tooltipProps} cursor={false} />
        </PieChart>
      </ResponsiveContainer>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeContent: 'center',
          pointerEvents: 'none',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1 }}>
          {total}
        </div>
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-secondary-text)',
            marginTop: 4,
          }}
        >
          {centreLabel}
        </div>
      </div>
    </div>
  )
}

/** Legend for the donut, as a list so long band names do not get clipped. */
export function SliceLegend({ data }: { data: Slice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {data.map((d) => (
        <div key={d.name} style={{ display: 'grid', gridTemplateColumns: '10px 1fr auto', gap: 10, alignItems: 'center' }}>
          <span
            style={{ width: 8, height: 8, borderRadius: 2, background: d.hue, display: 'inline-block' }}
            aria-hidden="true"
          />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)' }}>{d.name}</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-secondary-text)', whiteSpace: 'nowrap' }}>
            {d.value} · {Math.round((d.value / total) * 100)}%
          </span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Horizontal bars — departments, provisions, actions
 * ------------------------------------------------------------------ */

export function HBarChart({
  data,
  height = 240,
  hue = '#10b981',
  nameKey = 'name',
  valueKey = 'value',
}: {
  data: Array<Record<string, string | number>>
  height?: number
  hue?: string
  nameKey?: string
  valueKey?: string
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey={nameKey}
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          width={132}
        />
        <Tooltip {...tooltipProps} />
        <Bar dataKey={valueKey} fill={hue} radius={[0, 3, 3, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Stacked open/closed by department. */
export function DepartmentChart({
  data,
  height = 260,
}: {
  data: Array<{ name: string; open: number; closed: number; breached: number }>
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="name" tick={{ ...AXIS, fontSize: 10 }} axisLine={{ stroke: GRID }} tickLine={false} interval={0} angle={-18} textAnchor="end" height={54} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
        <Tooltip {...tooltipProps} />
        <Legend verticalAlign="top" align="right" height={28} wrapperStyle={{ fontSize: 12, color: '#8b9ba8' }} />
        <Bar dataKey="open" name="Open" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={20} />
        <Bar dataKey="closed" name="Closed" stackId="a" fill="#3b5561" radius={[3, 3, 0, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ------------------------------------------------------------------ *
 * Response rate against incident density
 * ------------------------------------------------------------------ */

/**
 * Two series on two axes, deliberately.
 *
 * Density is a rate per thousand and response is a percentage — forcing them onto one
 * axis would either flatten the density bars to nothing or blow the response line off
 * the top. The 90% reference line is what the eye should actually be checking the line
 * against.
 */
export function ResponseDensityChart({ data, height = 260 }: { data: AuditTrendPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="gradDensity" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.16} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis
          yAxisId="density"
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          width={44}
          label={undefined}
        />
        <YAxis
          yAxisId="rate"
          orientation="right"
          domain={[0, 100]}
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          width={40}
          unit="%"
        />
        {/* The two series carry different units, so the tooltip has to say which is which. */}
        <Tooltip
          {...tooltipProps}
          formatter={(value, name) => [name === 'Response rate' ? `${value}%` : String(value), String(name)]}
        />
        <Legend verticalAlign="top" align="right" height={28} wrapperStyle={{ fontSize: 12, color: '#8b9ba8' }} />
        <ReferenceLine
          yAxisId="rate"
          y={90}
          stroke="#2a3c47"
          strokeDasharray="4 4"
          label={{ value: 'target 90%', position: 'right', fill: '#5c6b77', fontSize: 10 }}
        />
        <Bar
          yAxisId="density"
          dataKey="density"
          name="Incidents per 1,000"
          fill="url(#gradDensity)"
          radius={[3, 3, 0, 0]}
          barSize={26}
        />
        <Line
          yAxisId="rate"
          type="monotone"
          dataKey="responseRate"
          name="Response rate"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 2.5, strokeWidth: 0, fill: '#10b981' }}
          activeDot={{ r: 4, strokeWidth: 0 }}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

/** Feedback rating distribution, 1–5. */
export function RatingChart({
  data,
  height = 200,
}: {
  data: Array<{ rating: number; count: number }>
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="rating" tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
        <Tooltip {...tooltipProps} />
        <Bar dataKey="count" name="Responses" radius={[3, 3, 0, 0]} barSize={34}>
          {data.map((d) => (
            <Cell key={d.rating} fill={d.rating >= 4 ? '#10b981' : d.rating === 3 ? '#f59e0b' : '#ef4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
