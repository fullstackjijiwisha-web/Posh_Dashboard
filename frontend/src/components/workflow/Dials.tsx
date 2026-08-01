import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import './Dials.css'

/**
 * The portal visual vocabulary.
 *
 * Hand-rolled SVG rather than a chart library, for two reasons. These are not charts —
 * a quorum ring is a compliance test with four discrete conditions, not a distribution —
 * and Recharts would fight the design system on stroke weights and type sizes at this
 * scale. Everything here draws with the existing tokens and nothing casts a shadow.
 */

const TAU = Math.PI * 2

/** Box sizing plus the size variable the stylesheet scales its type against. */
const dialBox = (size: number): CSSProperties =>
  ({ width: size, height: size, '--dial': `${size}px` }) as CSSProperties

/**
 * Below this the inner circle is too narrow to hold a caption at a legible size, so the
 * caption is dropped rather than shrunk into illegibility or run under the ring. Small
 * dials are always used inside a tile that already names the figure.
 */
const CAPTION_MIN_SIZE = 96

/* ------------------------------------------------------------------ *
 * Statutory clock — the 90-day inquiry window as a dial
 * ------------------------------------------------------------------ */

export function ClockDial({
  elapsed,
  total = 90,
  breached = false,
  size = 132,
  label = 'days left',
}: {
  elapsed: number
  total?: number
  breached?: boolean
  size?: number
  label?: string
}) {
  const remaining = total - elapsed
  const pct = Math.max(0, Math.min(1, elapsed / total))
  const r = size / 2 - 10
  const c = TAU * r
  const stroke = breached
    ? 'var(--color-danger)'
    : remaining <= 7
      ? 'var(--color-danger)'
      : remaining <= 30
        ? 'var(--color-warning)'
        : 'var(--color-accent)'

  return (
    <div className="dial" style={dialBox(size)} title={`${remaining} ${label}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth="6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="dial-arc"
        />
        {/* Day markers at each 30-day statutory third. */}
        {[30, 60].map((d) => {
          const a = (d / total) * TAU - Math.PI / 2
          const x1 = size / 2 + Math.cos(a) * (r - 6)
          const y1 = size / 2 + Math.sin(a) * (r - 6)
          const x2 = size / 2 + Math.cos(a) * (r + 6)
          const y2 = size / 2 + Math.sin(a) * (r + 6)
          return <line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-border-strong)" strokeWidth="1" />
        })}
      </svg>
      <div className="dial-centre">
        <div className="dial-value" style={{ color: breached ? 'var(--color-danger)' : undefined }}>
          {breached ? '!' : remaining}
        </div>
        {size >= CAPTION_MIN_SIZE && (
          <div className="dial-label">{breached ? 'past 90 days' : label}</div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Quorum ring — s.4 composition, tested rather than counted
 * ------------------------------------------------------------------ */

export interface QuorumTest {
  label: string
  met: boolean
  detail: string
}

/**
 * Four arcs, one per condition. A ring rather than a checklist because the question
 * "may this sitting proceed" is answered by all four together, and a list of ticks
 * invites the reader to skim the one that failed.
 */
export function QuorumRing({ tests, size = 132 }: { tests: QuorumTest[]; size?: number }) {
  const r = size / 2 - 10
  const gap = 0.06
  const seg = TAU / tests.length
  const met = tests.filter((t) => t.met).length
  const all = met === tests.length

  const arc = (i: number) => {
    const start = i * seg - Math.PI / 2 + gap / 2
    const end = start + seg - gap
    const x1 = size / 2 + Math.cos(start) * r
    const y1 = size / 2 + Math.sin(start) * r
    const x2 = size / 2 + Math.cos(end) * r
    const y2 = size / 2 + Math.sin(end) * r
    return `M ${x1} ${y1} A ${r} ${r} 0 ${seg - gap > Math.PI ? 1 : 0} 1 ${x2} ${y2}`
  }

  return (
    <div className="dial" style={dialBox(size)} title={tests.map((t) => `${t.met ? '✓' : '✗'} ${t.label}`).join(' · ')}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {tests.map((t, i) => (
          <path
            key={t.label}
            d={arc(i)}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            stroke={t.met ? 'var(--color-accent)' : 'var(--color-danger)'}
            opacity={t.met ? 1 : 0.85}
            className="dial-arc"
          />
        ))}
      </svg>
      <div className="dial-centre">
        <div className="dial-value" style={{ color: all ? 'var(--color-accent)' : 'var(--color-warning)' }}>
          {met}/{tests.length}
        </div>
        {size >= CAPTION_MIN_SIZE && (
          <div className="dial-label">{all ? 'quorum met' : 'conditions'}</div>
        )}
      </div>
    </div>
  )
}

/** The written form of the same tests, shown beside the ring. */
export function QuorumList({ tests }: { tests: QuorumTest[] }) {
  return (
    <ul className="quorum-list">
      {tests.map((t) => (
        <li key={t.label} className={t.met ? 'met' : 'unmet'}>
          <span className="quorum-mark" aria-hidden="true" />
          <span>
            <span className="quorum-label">{t.label}</span>
            <span className="quorum-detail">{t.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ *
 * Coverage ring — a single proportion, for training and completion rates
 * ------------------------------------------------------------------ */

export function CoverageRing({
  value,
  size = 116,
  caption,
  tone = 'accent',
}: {
  value: number
  size?: number
  caption: string
  tone?: 'accent' | 'warning' | 'info' | 'violet'
}) {
  const r = size / 2 - 9
  const c = TAU * r
  const pct = Math.max(0, Math.min(100, value)) / 100
  const stroke = {
    accent: 'var(--color-accent)',
    warning: 'var(--color-warning)',
    info: 'var(--color-info)',
    violet: 'var(--color-violet)',
  }[tone]

  return (
    <div className="dial" style={dialBox(size)} title={`${Math.round(value)}% ${caption}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth="5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="dial-arc"
        />
      </svg>
      <div className="dial-centre">
        <div className="dial-value">{Math.round(value)}%</div>
        {size >= CAPTION_MIN_SIZE && <div className="dial-label">{caption}</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Deadline strip — statutory milestones on one horizontal run
 * ------------------------------------------------------------------ */

export interface StripMark {
  label: string
  /** 0–1 along the run. */
  at: number
  state: 'complete' | 'due' | 'overdue' | 'upcoming'
}

export function DeadlineStrip({ marks, position }: { marks: StripMark[]; position: number }) {
  return (
    <div className="strip">
      <div className="strip-rail">
        <div
          className="strip-fill"
          style={{ width: `${Math.max(0, Math.min(1, position)) * 100}%` }}
        />
        {marks.map((m) => (
          <span
            key={m.label}
            className={`strip-mark ${m.state}`}
            style={{ left: `${Math.max(0, Math.min(1, m.at)) * 100}%` }}
            title={m.label}
          />
        ))}
      </div>
      <div className="strip-legend">
        {marks.map((m) => (
          <span key={m.label} className={`strip-legend-item ${m.state}`}>
            {m.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Sparkbars — a small distribution beside a figure
 * ------------------------------------------------------------------ */

export function SparkBars({ values, tone = 'accent' }: { values: number[]; tone?: 'accent' | 'violet' | 'info' }) {
  const max = Math.max(1, ...values)
  const colour = {
    accent: 'var(--color-accent)',
    violet: 'var(--color-violet)',
    info: 'var(--color-info)',
  }[tone]
  return (
    <div className="spark" aria-hidden="true">
      {values.map((v, i) => (
        <span
          key={i}
          className="spark-bar"
          style={{ height: `${Math.max(6, (v / max) * 100)}%`, background: colour, opacity: 0.35 + (v / max) * 0.65 }}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Figure tile — a headline number with a dial or spark beside it
 * ------------------------------------------------------------------ */

/**
 * A headline figure.
 *
 * Pass `to` and it becomes a link into the list it counts. The critique's complaint about
 * these was fair — "Past 90 days: 1" is a poster unless clicking it shows you the one.
 * The call to action is spelled out in text rather than implied by a hover state, because
 * a tile that only reveals itself on hover is invisible on a touch screen and to anyone
 * navigating by keyboard.
 */
export function FigureTile({
  label,
  value,
  meta,
  aside,
  tone,
  to,
  cta,
}: {
  label: string
  value: ReactNode
  meta?: ReactNode
  aside?: ReactNode
  tone?: 'accent' | 'warning' | 'danger'
  /** Makes the whole tile a link. */
  to?: string
  /** Text for the call to action. Defaults to "View". */
  cta?: string
}) {
  const body = (
    <>
      <div style={{ minWidth: 0 }}>
        <div className="figure-label">{label}</div>
        <div
          className="figure-value"
          style={
            tone === 'warning'
              ? { color: 'var(--color-warning)' }
              : tone === 'danger'
                ? { color: 'var(--color-danger)' }
                : tone === 'accent'
                  ? { color: 'var(--color-accent)' }
                  : undefined
          }
        >
          {value}
        </div>
        {meta ? <div className="figure-meta">{meta}</div> : null}
        {to ? (
          <span className="figure-cta">
            {cta ?? 'View'}
            <ArrowRight size={12} strokeWidth={1.5} />
          </span>
        ) : null}
      </div>
      {aside ? <div className="figure-aside">{aside}</div> : null}
    </>
  )

  return to ? (
    <Link to={to} className="figure-tile">
      {body}
    </Link>
  ) : (
    <div className="figure-tile">{body}</div>
  )
}
