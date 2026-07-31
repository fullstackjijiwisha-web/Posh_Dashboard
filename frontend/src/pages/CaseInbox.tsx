import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { CASES, DEPARTMENTS, LOCATIONS, hasLiveInquiryClock } from '../lib/data/cases'
import { CASE_STAGES, STAGE_LABEL, type Case, type CaseStage, type Priority } from '../lib/data/types'
import { actorInitials, actorName } from '../lib/data/users'
import { useRole } from '../lib/role-context'
import { formatDate } from '../lib/format'
import { Dropdown } from '../components/ui/Dropdown'
import { StagePill } from '../components/ui/StagePill'

const ICON = { size: 16, strokeWidth: 1.5 } as const

/** >30 success · 8–30 warning · ≤7 danger · negative breached. */
function DaysLeft({ value, breached }: { value: number; breached: boolean }) {
  if (breached) return <span className="font-medium text-danger">Breached</span>
  if (value <= 7) return <span className="font-medium text-danger">{value}</span>
  if (value <= 30) return <span className="font-medium text-warning">{value}</span>
  return <span className="font-medium text-success">{value}</span>
}

const PRIORITY_PILL: Record<Priority, string> = {
  High: 'bg-danger/12 text-[#fca5a5]',
  Medium: 'bg-warning/12 text-[#fcd34d]',
  Low: 'bg-muted/12 text-muted',
}

function PriorityPill({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-12 font-medium ${PRIORITY_PILL[priority]}`}>
      {priority}
    </span>
  )
}

/** Overlapping initial avatars, capped at 3 with a +N counter. */
function IcStack({ ids }: { ids: string[] }) {
  const shown = ids.slice(0, 3)
  const overflow = ids.length - shown.length
  return (
    <span className="flex items-center" title={ids.map(actorName).join(', ')}>
      <span className="flex -space-x-1">
        {shown.map((id) => (
          <span
            key={id}
            className="inline-grid h-6 w-6 place-items-center rounded-full border border-surface bg-raised text-12 font-medium text-muted"
          >
            {actorInitials(id)}
          </span>
        ))}
      </span>
      {overflow > 0 ? <span className="ml-2 text-12 text-faint">+{overflow}</span> : null}
    </span>
  )
}

/* ------------------------------------------------------------------ *
 * Saved views
 * ------------------------------------------------------------------ */

interface SavedView {
  key: string
  label: string
  urgent?: boolean
  predicate: (c: Case) => boolean
  /** Counts the badge when it differs from what the view lists. */
  badgePredicate?: (c: Case) => boolean
}

const isOpen = (c: Case) => c.stage !== 'closed' && c.stage !== 'archived'

const SAVED_VIEWS: SavedView[] = [
  { key: 'open', label: 'All open', predicate: isOpen },
  {
    key: 'breaching',
    label: 'Breaching soon',
    urgent: true,
    // The view lists everything needing urgent attention, including cases already in
    // breach. The badge counts only those still approaching one — a breached inquiry
    // is no longer "soon".
    predicate: (c) => isOpen(c) && (c.isBreached || c.daysRemaining <= 7),
    badgePredicate: (c) => isOpen(c) && !c.isBreached && c.daysRemaining <= 7,
  },
  { key: 'awaiting', label: 'Awaiting respondent reply', predicate: (c) => c.stage === 'awaiting_reply' },
  { key: 'inquiry', label: 'In inquiry', predicate: (c) => c.stage === 'inquiry' && !c.isBreached && c.daysRemaining > 7 },
  { key: 'report', label: 'Ready for report', predicate: (c) => c.stage === 'report_pending' },
  { key: 'breached', label: 'Breached', urgent: true, predicate: (c) => c.isBreached },
  { key: 'closed', label: 'Closed', predicate: (c) => c.stage === 'closed' || c.stage === 'archived' },
  { key: 'archived', label: 'Archived', predicate: (c) => c.stage === 'archived' },
]

/** Fixed widths — columns must not shift when a filter is applied. */
const COLUMNS = [
  { label: 'Case ID', width: 152, align: 'left' },
  { label: 'Stage', width: 134, align: 'left' },
  { label: 'Complainant', width: 122, align: 'left' },
  { label: 'Respondent', width: 122, align: 'left' },
  { label: 'Filed', width: 110, align: 'right' },
  { label: 'Day', width: 62, align: 'right' },
  { label: 'Deadline', width: 110, align: 'right' },
  { label: 'Days left', width: 82, align: 'right' },
  { label: 'Assigned IC', width: 96, align: 'left' },
  { label: 'Priority', width: 80, align: 'left' },
] as const

const TABLE_MIN_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0)

export function CaseInboxPage() {
  const navigate = useNavigate()
  const { can, maskParty, visibleCases } = useRole()
  const canViewIdentities = can('view:identities')

  const [viewKey, setViewKey] = useState('open')
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState('All')
  const [location, setLocation] = useState('All')
  const [department, setDepartment] = useState('All')

  const view = SAVED_VIEWS.find((v) => v.key === viewKey) ?? SAVED_VIEWS[0]

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return visibleCases
      .filter(view.predicate)
      .filter((c) => (stage === 'All' ? true : STAGE_LABEL[c.stage] === stage))
      .filter((c) => (location === 'All' ? true : c.location === location))
      .filter((c) => (department === 'All' ? true : c.department === department))
      .filter((c) => {
        if (!q) return true
        // Party names are searchable only by roles allowed to see them — otherwise the
        // search box becomes an oracle for probing identities the table masks.
        const hay = [c.id, c.department, c.location, STAGE_LABEL[c.stage], c.priority]
        if (canViewIdentities) hay.push(c.complainant.actualName, c.respondent.actualName)
        return hay.join(' ').toLowerCase().includes(q)
      })
      .sort((a, b) => {
        const at = isOpen(a) ? 0 : 1
        const bt = isOpen(b) ? 0 : 1
        if (at !== bt) return at - bt
        return a.daysRemaining - b.daysRemaining
      })
  }, [visibleCases, view, query, stage, location, department, canViewIdentities])

  const countFor = (v: SavedView) => visibleCases.filter(v.badgePredicate ?? v.predicate).length

  return (
    <div className="flex gap-6">
      <aside className="w-[200px] shrink-0">
        <div className="mb-2 px-2 text-12 uppercase tracking-wider text-faint">Views</div>
        <nav className="flex flex-col gap-px">
          {SAVED_VIEWS.map((v) => {
            const active = v.key === viewKey
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => setViewKey(v.key)}
                aria-current={active ? 'page' : undefined}
                className={`flex h-8 items-center justify-between gap-2 rounded-md px-2 text-left text-13 transition-colors duration-150 ease-out ${
                  active ? 'bg-raised font-medium text-ink' : 'text-muted hover:bg-raised/60'
                }`}
              >
                <span className="truncate">{v.label}</span>
                <span
                  className={`shrink-0 rounded-sm px-1 text-12 ${
                    v.urgent ? 'bg-[rgba(239,68,68,0.14)] font-medium text-[#fca5a5]' : 'text-muted'
                  }`}
                >
                  {countFor(v)}
                </span>
              </button>
            )
          })}
        </nav>

        {!canViewIdentities ? (
          <p className="mt-4 rounded-md border border-line bg-surface p-3 text-12 leading-relaxed text-muted">
            Identities are masked for your role.
          </p>
        ) : null}
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search
              {...ICON}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={canViewIdentities ? 'Search cases, parties, departments' : 'Search cases and departments'}
              aria-label="Search cases"
              className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-13 text-ink outline-none transition-colors duration-150 ease-out placeholder:text-faint focus:border-accent"
            />
          </div>

          <Dropdown
            label="Stage"
            value={stage}
            options={['All', ...CASE_STAGES.map((s: CaseStage) => STAGE_LABEL[s])]}
            onChange={setStage}
          />
          <Dropdown label="Location" value={location} options={['All', ...LOCATIONS]} onChange={setLocation} />
          <Dropdown label="Department" value={department} options={['All', ...DEPARTMENTS]} onChange={setDepartment} />

          <Link
            to="/complaint/new"
            className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg bg-accent px-3 text-13 font-medium text-[#06231a] transition-colors duration-150 ease-out hover:bg-accent-hover"
          >
            <Plus {...ICON} aria-hidden="true" />
            Register complaint
          </Link>
        </div>

        <div className="rounded-lg border border-line bg-surface">
          <div className="max-h-[calc(100vh-248px)] min-h-[280px] overflow-auto rounded-t-lg">
            <table className="w-full table-fixed border-collapse" style={{ minWidth: TABLE_MIN_WIDTH }}>
              <colgroup>
                {COLUMNS.map((col) => (
                  <col key={col.label} style={{ width: col.width }} />
                ))}
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.label}
                      scope="col"
                      className={`whitespace-nowrap border-b border-line bg-raised px-3 py-2 text-12 font-medium uppercase tracking-wider text-muted ${
                        col.align === 'right' ? 'text-right' : 'text-left'
                      } ${col.label === 'Case ID' ? 'pl-5' : ''} ${col.label === 'Priority' ? 'pr-5' : ''}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <CaseRow key={c.id} c={c} onOpen={() => navigate(`/cases/${c.id}`)} mask={maskParty} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-line px-5 py-3 text-13 text-muted">
            Showing {rows.length} of {CASES.length} cases
          </div>
        </div>
      </div>
    </div>
  )
}

function CaseRow({
  c,
  onOpen,
  mask,
}: {
  c: Case
  onOpen: () => void
  mask: (p: Case['complainant']) => string
}) {
  // The inquiry clock only runs through the inquiry stage; past that there is no
  // deadline left to count down, so the cell shows an em dash rather than a stale number.
  const liveClock = hasLiveInquiryClock(c)
  const urgent = liveClock && (c.isBreached || c.daysRemaining <= 7)
  const complainant = mask(c.complainant)
  const respondent = mask(c.respondent)

  return (
    <tr
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onOpen()
        }
      }}
      tabIndex={0}
      aria-label={`Open case ${c.id}`}
      className="h-11 cursor-pointer border-b border-line transition-colors duration-150 ease-out hover:bg-raised"
    >
      {/* Urgency marker drawn as an inset shadow so it cannot alter the 44px row height
          or nudge the fixed column widths. */}
      <td
        className="truncate px-3 py-0 pl-5"
        style={urgent ? { boxShadow: 'inset 2px 0 0 0 var(--color-danger)' } : undefined}
      >
        <Link
          to={`/cases/${c.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-mono text-13 text-accent hover:underline"
        >
          {c.id}
        </Link>
      </td>
      <td className="px-3 py-0">
        <StagePill stage={c.stage} />
      </td>
      <td className="truncate px-3 py-0 text-13 text-ink" title={complainant}>
        {complainant}
      </td>
      <td className="truncate px-3 py-0 text-13 text-ink" title={respondent}>
        {respondent}
      </td>
      <td className="whitespace-nowrap px-3 py-0 text-right text-13 text-muted">{formatDate(c.filedDate)}</td>
      <td className="px-3 py-0 text-right text-13 text-ink">{c.daysElapsed}</td>
      <td className="whitespace-nowrap px-3 py-0 text-right text-13 text-muted">
        {formatDate(c.milestones.inquiryDue)}
      </td>
      <td className="px-3 py-0 text-right text-13">
        {liveClock ? (
          <DaysLeft value={c.daysRemaining} breached={c.isBreached} />
        ) : (
          <span className="text-faint">—</span>
        )}
      </td>
      <td className="px-3 py-0">
        <IcStack ids={c.assignedIC} />
      </td>
      <td className="px-3 py-0 pr-5">
        <PriorityPill priority={c.priority} />
      </td>
    </tr>
  )
}
