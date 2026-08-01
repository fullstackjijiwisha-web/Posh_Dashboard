import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ScrollText, X, XCircle } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { STAGE_META, isWorkflowTerminal } from '../lib/workflow/types'
import { QuorumRing, QuorumList } from '../components/workflow/Dials'
import { sittingQuorumTests, allMet } from '../lib/workflow/quorum'
import { hearingsFor } from '../lib/data/caseDetail'
import { dateNDaysAgo } from '../lib/data/statutory'
import { formatDate, formatTimestamp } from '../lib/format'
import { actorName } from '../lib/data/users'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/workflow/Dials.css'
import { EmptyState } from '../components/ui/EmptyState'

type Scope = 'Ahead' | 'Held' | 'All'

/**
 * Sitting types, abbreviated deliberately rather than clipped.
 *
 * The 64px date cell used to render `type.slice(0, 10)`, which turned "Deliberation"
 * into "Deliberati" — the truncation the critique caught at 1488px. A hard character
 * slice cannot know where a word ends, so the type carries its own short form and the
 * cell keeps a `title` with the full text.
 */
const SITTING_SHORT: Record<string, string> = {
  Preliminary: 'Prelim.',
  Deposition: 'Deposit.',
  'Cross examination': 'Cross-ex.',
  Deliberation: 'Delib.',
  Final: 'Final',
  'In person': 'In person',
  'Video conference': 'Video',
}

const shortSittingType = (type: string) => SITTING_SHORT[type] ?? type

/**
 * The cause list.
 *
 * A court's cause list is the day's sittings in order, and that is exactly what a
 * Presiding Officer needs the morning of a hearing. Each entry carries its own bench
 * test, because "is this sitting properly constituted" is a question that has to be
 * answered before the sitting, not discovered afterwards.
 */
/**
 * Filters the bench KPI cards can hand over in the URL.
 *
 * URL-borne rather than component state so the cards compose with deep linking: a
 * Presiding Officer can send "the four sittings within 14 days of the limit" as a link,
 * and it survives a reload.
 */
const CAUSE_FILTERS = {
  breached: {
    label: 'Past the 90-day limit',
    test: (s: { breached: boolean }) => s.breached,
  },
  'near-limit': {
    label: 'Within 14 days of the limit',
    test: (s: { breached: boolean; daysRemaining: number }) => !s.breached && s.daysRemaining <= 14,
  },
  'bench-short': {
    label: 'Bench would sit short',
    test: (s: { attendees: string[] }) => !allMet(sittingQuorumTests(s.attendees)),
  },
} as const

export type CauseFilterKey = keyof typeof CAUSE_FILTERS

export function CauseListPage() {
  const { myAssignedCases, flowFor } = useWorkflow()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState<string | null>(null)

  const filterKey = params.get('filter') as CauseFilterKey | null
  const activeFilter = filterKey && filterKey in CAUSE_FILTERS ? CAUSE_FILTERS[filterKey] : null

  // Arriving with a filter means the reader came from a KPI card about something at
  // risk, which is never limited to sittings still ahead.
  const scope: Scope = (params.get('scope') as Scope) ?? (activeFilter ? 'All' : 'Ahead')
  const setScope = (s: Scope) => {
    const next = new URLSearchParams(params)
    next.set('scope', s)
    setParams(next, { replace: true })
  }
  const clearFilter = () => {
    const next = new URLSearchParams(params)
    next.delete('filter')
    setParams(next, { replace: true })
  }

  const today = dateNDaysAgo(0)

  const all = myAssignedCases
    .map((record) => ({ record, flow: flowFor(record.id) }))
    .filter((r): r is { record: (typeof myAssignedCases)[number]; flow: NonNullable<ReturnType<typeof flowFor>> } => !!r.flow)
    .flatMap(({ record, flow }) => [
      ...hearingsFor(record.id).map((h) => ({
        id: h.id,
        caseId: record.id,
        at: h.at,
        title: h.title,
        type: h.type as string,
        where: h.location,
        attendees: h.attendeeIds,
        status: h.status,
        minuted: h.minutesRecorded,
        stage: flow.stage,
        daysRemaining: record.daysRemaining,
        breached: record.isBreached,
        terminal: isWorkflowTerminal(flow.stage),
      })),
      ...flow.hearings.map((h) => ({
        id: h.id,
        caseId: record.id,
        at: h.at,
        title: h.agenda,
        type: h.mode as string,
        where: h.location,
        attendees: record.assignedIC,
        status: h.status as string,
        minuted: !!h.minutes,
        stage: flow.stage,
        daysRemaining: record.daysRemaining,
        breached: record.isBreached,
        terminal: isWorkflowTerminal(flow.stage),
      })),
    ])
    .sort((a, b) => a.at.localeCompare(b.at))

  const ahead = all.filter((s) => s.status === 'Scheduled' && s.at.slice(0, 10) >= today)
  const held = all.filter((s) => !(s.status === 'Scheduled' && s.at.slice(0, 10) >= today))
  const inScope = scope === 'Ahead' ? ahead : scope === 'Held' ? held : all
  const rows = activeFilter ? inScope.filter(activeFilter.test) : inScope

  // Grouped by date, the way a cause list is actually posted.
  const byDate = rows.reduce<Record<string, typeof rows>>((acc, s) => {
    ;(acc[s.at.slice(0, 10)] ??= []).push(s)
    return acc
  }, {})

  const defective = ahead.filter((s) => !allMet(sittingQuorumTests(s.attendees))).length

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Cause list</h1>
          <p>
            Sittings before you, in order, each with its bench tested against s.4. A sitting that is
            short cannot safely proceed — the finding can be set aside however sound it is.
          </p>
        </div>
        <div className="ep-segment">
          {(['Ahead', 'Held', 'All'] as Scope[]).map((s) => (
            <button key={s} type="button" className={scope === s ? 'active' : ''} onClick={() => setScope(s)}>
              {s} ({s === 'Ahead' ? ahead.length : s === 'Held' ? held.length : all.length})
            </button>
          ))}
        </div>
      </div>

      {/* The filter a KPI card handed over, shown as a chip that can be removed. */}
      {activeFilter && (
        <div className="filter-chip-row">
          <span className="filter-chip">
            {activeFilter.label}
            <span className="filter-chip-count">{rows.length}</span>
            <button type="button" onClick={clearFilter} aria-label={`Remove filter: ${activeFilter.label}`}>
              <X size={12} strokeWidth={2} />
            </button>
          </span>
        </div>
      )}

      {defective > 0 && scope !== 'Held' && !activeFilter && (
        <div className="wf-blocked" style={{ borderColor: 'rgba(245,158,11,0.4)' }}>
          <XCircle size={14} strokeWidth={1.5} style={{ color: 'var(--color-warning)', marginTop: 1, flexShrink: 0 }} />
          <span>
            <strong style={{ fontWeight: 500, color: 'var(--color-primary)' }}>
              {defective} listed sitting{defective === 1 ? '' : 's'} would sit short.
            </strong>{' '}
            Open the entry to see which condition fails, and adjourn or reconstitute before the day.
          </span>
        </div>
      )}

      {Object.keys(byDate).length === 0 ? (
        <EmptyState
          icon={ScrollText}
          headline={activeFilter ? `No sitting matches “${activeFilter.label}”` : scope === 'Ahead' ? 'No sitting is listed before you' : 'Nothing in this view'}
          detail={
            activeFilter
              ? 'Nothing on your cause list meets that condition — which is the answer you wanted.'
              : scope === 'Ahead'
                ? 'Sittings appear here once a case reaches the hearing stage and a date is listed.'
                : 'Change the scope above to see sittings already held, or the full list.'
          }
          action={
            activeFilter
              ? { label: 'Clear the filter', onClick: clearFilter }
              : scope === 'Ahead'
                ? undefined
                : { label: 'Show all sittings', onClick: () => setScope('All') }
          }
        />
      ) : (
        Object.entries(byDate).map(([date, sittings]) => (
          <section key={date} className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <ScrollText size={15} strokeWidth={1.5} />
                {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <span className="meta-pill">
                {sittings.length} sitting{sittings.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {sittings.map((s) => {
                const tests = sittingQuorumTests(s.attendees)
                const ok = allMet(tests)
                const expanded = open === s.id
                const urgent = !s.terminal && (s.breached || s.daysRemaining <= 14)

                return (
                  <div key={s.id}>
                    <button
                      type="button"
                      className={`bench-row${urgent ? ' urgent' : ''}`}
                      style={{ width: '100%', textAlign: 'left' }}
                      onClick={() => setOpen(expanded ? null : s.id)}
                      aria-expanded={expanded}
                    >
                      <div className="bench-time">
                        <div className="bench-hour">{s.at.slice(11, 16)}</div>
                        <div className="bench-date" title={s.type}>
                          {shortSittingType(s.type)}
                        </div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="ep-hearing-title">{s.title}</div>
                        <div className="ep-hearing-meta">
                          <span className="mono" style={{ color: 'var(--color-accent)' }}>
                            {s.caseId}
                          </span>{' '}
                          · {STAGE_META[s.stage].label} · {s.where}
                        </div>
                        <div className="ep-hearing-meta">{s.attendees.map(actorName).join(', ')}</div>
                      </div>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                        <span className={`badge ${ok ? 'badge-completed' : 'badge-medium'}`}>
                          {ok ? (
                            <>
                              <CheckCircle2 size={11} strokeWidth={2} style={{ marginRight: 4 }} />
                              Bench valid
                            </>
                          ) : (
                            <>
                              <XCircle size={11} strokeWidth={2} style={{ marginRight: 4 }} />
                              Bench short
                            </>
                          )}
                        </span>
                        {urgent ? (
                          <span className="badge badge-overdue">
                            {s.breached ? 'Past 90 days' : `${s.daysRemaining}d left`}
                          </span>
                        ) : null}
                        {s.minuted ? <span className="badge badge-low">Minuted</span> : null}
                      </span>
                    </button>

                    {expanded && (
                      <div
                        className="rise"
                        style={{
                          display: 'flex',
                          gap: 'var(--space-6)',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          padding: 'var(--space-5)',
                          margin: '2px 0 var(--space-2)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--color-raised)',
                        }}
                      >
                        <QuorumRing tests={tests} size={116} />
                        <div style={{ minWidth: 240, flex: 1 }}>
                          <QuorumList tests={tests} />
                        </div>
                        <div style={{ minWidth: 180 }}>
                          <div className="ep-field-label">Sitting</div>
                          <div className="text-12 text-muted" style={{ marginTop: 4 }}>
                            {formatTimestamp(s.at)}
                          </div>
                          <div className="text-12 text-muted">{s.where}</div>
                          <Link
                            to={`/cases/${s.caseId}`}
                            className="btn btn-secondary"
                            style={{ marginTop: 12 }}
                          >
                            Open case
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}

      <p className="ep-confidential">
        <ScrollText size={12} strokeWidth={2} />
        Listing as at {formatDate(today)}. Adjournments and reconstitutions are recorded against the
        case and appear in the annual return.
      </p>
    </div>
  )
}
