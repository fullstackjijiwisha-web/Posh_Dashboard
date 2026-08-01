import { useCallback, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eye,
  Lock,
  PenLine,
  Plus,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import { CASES, FLAGSHIP_CASE_ID, caseById } from '../lib/data/cases'
import {
  actionsFor,
  communicationsFor,
  documentsFor,
  hearingsFor,
} from '../lib/data/caseDetail'
import { evidenceForCase } from '../lib/data/evidence'
import { auditForCase } from '../lib/data/audit'
import { actorName, actorInitials, userById } from '../lib/data/users'
import { dateNDaysAgo } from '../lib/data/statutory'
import { useRole } from '../lib/role-context'
import { useWorkflow } from '../lib/workflow/store'
import { useToast } from '../lib/toast'
import { STAGE_META } from '../lib/workflow/types'
import { StageTracker, StageSteps, custodian } from '../components/workflow/StageTracker'
import { ActionPanel } from '../components/workflow/ActionPanel'
import { formatDate, formatTimestamp } from '../lib/format'
import { StagePill } from '../components/ui/StagePill'
import { ScrollTabs } from '../components/ui/ScrollTabs'
import { ComplianceClock } from '../components/ui/ComplianceClock'
import './CaseWorkspace.css'

const ICON = { size: 16, strokeWidth: 1.5 } as const
const ICON_SM = { size: 14, strokeWidth: 1.5 } as const

// 'Workflow' leads because it is the only tab that can change the case; the rest are
// records of what already happened.
const TABS = ['Workflow', 'Overview', 'Parties', 'Timeline', 'Proceedings', 'Evidence', 'Documents', 'Communications', 'Actions'] as const
type Tab = (typeof TABS)[number]

const PRIORITY_PILL = {
  High: 'badge-high',
  Medium: 'badge-medium',
  Low: 'badge-low',
} as const

/* ──────────────────────────────────────────────────────────────────
   Relative time formatter
   ────────────────────────────────────────────────────────────────── */
function relativeTime(isoDate: string): string {
  const now = new Date(dateNDaysAgo(0) + 'T23:59')
  const then = new Date(isoDate)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return 'yesterday'
  if (diffDay < 7) return `${diffDay} days ago`
  const diffWeek = Math.floor(diffDay / 7)
  return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`
}

/* ──────────────────────────────────────────────────────────────────
   Audit action to natural language
   ────────────────────────────────────────────────────────────────── */
function naturalAction(action: string, entity: string): string {
  const entityShort = entity.replace(/^(Case|Document: |Evidence |Communication: |Hearing |Milestone: |Order: |Aggregate )/, '')
  switch (action) {
    case 'VIEW': return `viewed ${entityShort}`
    case 'DOWNLOAD': return `downloaded ${entityShort}`
    case 'CREATE': return `created ${entityShort}`
    case 'UPDATE': return `updated ${entityShort}`
    case 'DELETE': return `deleted ${entityShort}`
    case 'EXPORT': return `exported ${entityShort}`
    case 'STAGE_CHANGE': return `changed stage of ${entityShort}`
    case 'ACCESS_DENIED': return `denied access to ${entityShort}`
    case 'LOGIN': return `logged in`
    case 'SHARE': return `shared ${entityShort}`
    default: return `${action.toLowerCase()} ${entityShort}`
  }
}

/* ──────────────────────────────────────────────────────────────────
   Audit action icon mapper
   ────────────────────────────────────────────────────────────────── */
function actionIconClass(action: string): string {
  switch (action) {
    case 'CREATE': return 'create'
    case 'VIEW': return 'view'
    case 'UPDATE': return 'update'
    case 'DOWNLOAD': return 'download'
    case 'ACCESS_DENIED': return 'denied'
    case 'STAGE_CHANGE': return 'stage'
    case 'EXPORT': return 'export'
    default: return 'view'
  }
}

function ActionIcon({ action }: { action: string }) {
  switch (action) {
    case 'CREATE': return <Plus {...ICON_SM} />
    case 'VIEW': return <Eye {...ICON_SM} />
    case 'UPDATE': return <PenLine {...ICON_SM} />
    case 'DOWNLOAD': return <Download {...ICON_SM} />
    case 'ACCESS_DENIED': return <XCircle {...ICON_SM} />
    case 'STAGE_CHANGE': return <ChevronRight {...ICON_SM} />
    case 'EXPORT': return <Upload {...ICON_SM} />
    default: return <Eye {...ICON_SM} />
  }
}

/* ──────────────────────────────────────────────────────────────────
   File extension helper
   ────────────────────────────────────────────────────────────────── */
function fileExt(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

function fileIconClass(name: string): string {
  const ext = fileExt(name)
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx' || ext === 'doc') return 'docx'
  return 'other'
}

function fileIconLabel(name: string): string {
  const ext = fileExt(name)
  return ext.toUpperCase().slice(0, 4)
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */

/** URL slug ⇄ tab label. The slug is what a shared link carries. */
const TAB_SLUG: Record<Tab, string> = {
  Workflow: 'workflow',
  Overview: 'overview',
  Parties: 'parties',
  Timeline: 'timeline',
  Proceedings: 'proceedings',
  Evidence: 'evidence',
  Documents: 'documents',
  Communications: 'communications',
  Actions: 'actions',
}
const TAB_BY_SLUG = Object.fromEntries(
  (Object.entries(TAB_SLUG) as Array<[Tab, string]>).map(([tab, slug]) => [slug, tab]),
) as Record<string, Tab>

export function CasesPage() {
  const { caseId } = useParams()
  const { maskParty, canOpenCase } = useRole()
  const { caseById: caseFromStore, flowFor, committeeById, visibleCases } = useWorkflow()
  const { push } = useToast()

  /**
   * The open tab lives in the URL, not in component state, so `?tab=evidence` opens the
   * evidence register directly and "Copy link" reproduces exactly what the sender was
   * looking at. Tab changes `replace` rather than push, so Back leaves the case instead
   * of walking back through every tab the reader happened to open.
   */
  const [params, setParams] = useSearchParams()
  const activeTab: Tab = TAB_BY_SLUG[params.get('tab') ?? ''] ?? 'Workflow'
  const setActiveTab = useCallback(
    (tab: Tab) => {
      const next = new URLSearchParams(params)
      next.set('tab', TAB_SLUG[tab])
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null)

  // The store's list covers both the seeded caseload and anything raised in-session,
  // so a complaint filed a moment ago opens in the same workspace as a fixture case.
  const record = caseFromStore(caseId) ?? caseById(caseId) ?? caseById(FLAGSHIP_CASE_ID) ?? CASES[0]
  // Session-raised cases are not in the role provider's fixed list, so fall back to the
  // store's role-filtered list before refusing access.
  const allowed = canOpenCase(record.id) || visibleCases.some((c) => c.id === record.id)
  const flow = flowFor(record.id)

  /**
   * Copies the deep link, not the case number.
   *
   * "Send me that case" is the action this whole phase exists to make possible, and a
   * bare `POSH-2026-0142` pasted into chat is not a link. The URL carries the open tab
   * so the recipient lands where the sender was.
   */
  const handleCopy = useCallback(() => {
    const url = `${window.location.origin}/cases/${encodeURIComponent(record.id)}?tab=${TAB_SLUG[activeTab]}`
    navigator.clipboard
      .writeText(url)
      .then(() => push(`Link to ${record.id} copied`, 'success'))
      .catch(() => push('Could not copy — your browser blocked clipboard access', 'error'))
  }, [record.id, activeTab, push])

  if (!allowed) {
    return (
      <div className="rounded-lg border border-line bg-surface p-8">
        <div className="flex items-start gap-3">
          <Lock {...ICON} className="mt-0.5 text-warning" />
          <div>
            <h2 className="text-16 tracking-[-0.02em]">Case not available to your role</h2>
            <p className="mt-2 max-w-[60ch] text-13 leading-relaxed text-muted">
              Your role does not have access to {record.id}. The attempt has been recorded in the
              audit trail.
            </p>
            <Link to="/cases" className="mt-4 inline-flex items-center gap-2 text-13 text-accent hover:underline">
              <ArrowLeft {...ICON} />
              Back to cases
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const evidence = evidenceForCase(record.id)
  const hearings = hearingsFor(record.id)
  const documents = documentsFor(record.id)
  const comms = communicationsFor(record.id)
  const actions = actionsFor(record.id)
  const audit = auditForCase(record.id)

  // IC members assigned to this case
  const icMembers = record.assignedIC.map(id => userById(id)).filter(Boolean) as NonNullable<ReturnType<typeof userById>>[]

  // IC role labels
  const IC_ROLE_LABEL: Record<string, string> = {
    'u-po': 'Presiding Officer',
    'u-ic': 'Member',
    'u-ext': 'External Member',
    'u-legal': 'Member (legal knowledge)',
  }

  // Selected evidence for slide-over
  const selectedEv = evidence.find(e => e.id === selectedEvidence)

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb */}
      <Link
        to="/cases"
        className="inline-flex items-center gap-2 text-13 text-muted transition-colors duration-150 ease-out hover:text-ink"
      >
        <ArrowLeft {...ICON} aria-hidden="true" />
        Back to cases
      </Link>

      {/* Three-column layout */}
      <div className="cw-shell">

        {/* ═══════════════════ LEFT RAIL ═══════════════════ */}
        <aside className="cw-left">

          {/* Case ID + copy */}
          <div>
            <div className="cw-case-id-row">
              <span className="cw-case-id">{record.id}</span>
              <button
                type="button"
                className="cw-copy-btn"
                title="Copy a link to this case"
                aria-label={`Copy a link to case ${record.id}`}
                onClick={handleCopy}
              >
                <Copy {...ICON_SM} />
              </button>
            </div>
            <div className="cw-meta-row">
              <StagePill stage={record.stage} />
              <span className={`badge ${PRIORITY_PILL[record.priority]}`}>
                {record.priority}
              </span>
            </div>
          </div>

          {/* ═══ Workflow position ═══ */}
          {flow && (
            <div>
              <div className="cw-section-label">Workflow</div>
              <div className="card card-pad" style={{ padding: 'var(--space-4)' }}>
                <StageTracker stage={flow.stage} compact />
              </div>
            </div>
          )}

          {/* ═══ Compliance Clock ═══ */}
          <ComplianceClock record={record} />

          {/* ═══ Parties ═══ */}
          <div>
            <div className="cw-section-label">Parties</div>
            <div className="cw-party-card">
              <div className="cw-party-avatar complainant">
                {record.complainant.actualName.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div className="cw-party-info">
                <div className="cw-party-role">Complainant</div>
                <div className="cw-party-name">{maskParty(record.complainant)}</div>
                <div className="cw-party-detail">{record.complainant.designation}</div>
                <div className="cw-party-detail">{record.complainant.department} · {record.complainant.location}</div>
              </div>
            </div>
            <div className="cw-party-card">
              <div className="cw-party-avatar respondent">
                {record.respondent.actualName.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div className="cw-party-info">
                <div className="cw-party-role">Respondent</div>
                <div className="cw-party-name">{maskParty(record.respondent)}</div>
                <div className="cw-party-detail">{record.respondent.designation}</div>
                <div className="cw-party-detail">{record.respondent.department} · {record.respondent.location}</div>
              </div>
            </div>
          </div>

          {/* ═══ Internal Committee ═══ */}
          <div>
            <div className="cw-section-label">Internal Committee</div>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
              {icMembers.map(member => (
                <div key={member.id} className="cw-ic-member">
                  <div className="cw-ic-avatar">{member.initials}</div>
                  <div className="cw-ic-info">
                    <div className="cw-ic-name">{member.name}</div>
                    <div className="cw-ic-role">{IC_ROLE_LABEL[member.id] ?? member.designation}</div>
                  </div>
                  <CheckCircle2 size={14} strokeWidth={1.5} className="cw-ic-check" />
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ═══════════════════ MAIN PANEL ═══════════════════ */}
        <main className="cw-main">

          {/* Tab bar (underline style). Scrolls, and says so at narrow widths. */}
          <ScrollTabs activeIndex={TABS.indexOf(activeTab)} ariaLabel={`Case ${record.id} sections`}>
            {TABS.map(t => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={activeTab === t}
                className={`cw-tab ${activeTab === t ? 'active' : ''}`}
                onClick={() => setActiveTab(t)}
              >
                {t}
              </button>
            ))}
          </ScrollTabs>

          {/* ──── Workflow Tab ──── */}
          {activeTab === 'Workflow' && flow && (
            <div className="cw-panel rise">
              <div className="cw-panel-head">
                <h2 className="cw-panel-title">Case workflow</h2>
                <span className="meta-pill">{flow.history.length} transitions</span>
              </div>

              <div className="cw-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <StageTracker stage={flow.stage} />

                <div>
                  <div className="cw-overview-label" style={{ marginBottom: 12 }}>
                    Your actions
                  </div>
                  <ActionPanel caseId={record.id} />
                </div>

                {/* Standing state that the buttons act on. */}
                <div className="cw-overview-grid">
                  <div className="cw-overview-item">
                    <span className="cw-overview-label">Assigned board</span>
                    <span className="cw-overview-value">
                      {committeeById(flow.committeeId)?.name ?? 'Not yet assigned'}
                    </span>
                  </div>
                  <div className="cw-overview-item">
                    <span className="cw-overview-label">Acceptances on record</span>
                    <span className="cw-overview-value">
                      {flow.acceptedBy.length
                        ? flow.acceptedBy.map(actorName).join(', ')
                        : flow.declinedBy.length
                          ? `Declined by ${flow.declinedBy.map(actorName).join(', ')}`
                          : 'None yet'}
                    </span>
                  </div>
                  <div className="cw-overview-item">
                    <span className="cw-overview-label">Evidence on record</span>
                    <span className="cw-overview-value">
                      {flow.evidence.length} item{flow.evidence.length === 1 ? '' : 's'}
                      {flow.evidence.some((e) => e.status === 'Pending verification')
                        ? ` · ${flow.evidence.filter((e) => e.status === 'Pending verification').length} pending`
                        : ' · all verified'}
                    </span>
                  </div>
                  <div className="cw-overview-item">
                    <span className="cw-overview-label">Sittings listed</span>
                    <span className="cw-overview-value">
                      {flow.hearings.length
                        ? `${flow.hearings.length} · ${flow.hearings.filter((h) => h.minutes).length} minuted`
                        : 'None listed'}
                    </span>
                  </div>
                  <div className="cw-overview-item">
                    <span className="cw-overview-label">Recommendation</span>
                    <span className="cw-overview-value">
                      {flow.recommendations.length
                        ? flow.recommendations[flow.recommendations.length - 1].status
                        : 'Not yet drafted'}
                    </span>
                  </div>
                  <div className="cw-overview-item">
                    <span className="cw-overview-label">Currently with</span>
                    <span className="cw-overview-value">{custodian(flow.stage)}</span>
                  </div>
                </div>

                {/* Outstanding request for more material, if any. */}
                {flow.evidenceRequests.filter((r) => !r.fulfilledAt).map((r) => (
                  <div key={r.id} className="wf-blocked">
                    <Clock {...ICON_SM} style={{ color: 'var(--color-warning)', marginTop: 1, flexShrink: 0 }} />
                    <span>
                      <strong style={{ fontWeight: 500, color: 'var(--color-primary)' }}>
                        Further evidence requested
                      </strong>{' '}
                      by {r.requestedBy} on {formatTimestamp(r.requestedAt)} — {r.detail}
                    </span>
                  </div>
                ))}

                {/* Final decision, once recorded. */}
                {flow.finalDecision && (
                  <div className="cw-summary-block">
                    <div className="cw-overview-label" style={{ marginBottom: 8 }}>
                      Final decision — {flow.finalDecision.outcome}
                    </div>
                    <p className="cw-summary-text">
                      {flow.finalDecision.action} Recorded by {actorName(flow.finalDecision.recordedBy)} on{' '}
                      {formatTimestamp(flow.finalDecision.at)}. {flow.finalDecision.note}
                    </p>
                  </div>
                )}

                <div>
                  <div className="cw-overview-label" style={{ marginBottom: 12 }}>
                    Lifecycle
                  </div>
                  <StageSteps stage={flow.stage} />
                </div>

                <div>
                  <div className="cw-overview-label" style={{ marginBottom: 8 }}>
                    Workflow history
                  </div>
                  <div className="wf-history">
                    {[...flow.history].reverse().map((h) => (
                      <div key={h.id} className="wf-history-item">
                        <span className="wf-history-time">{formatTimestamp(h.at)}</span>
                        <span>
                          <span className="wf-history-stage">{STAGE_META[h.stage].label}</span>
                          <span className="wf-history-meta">
                            {h.actorName} · {h.actorRole} — {h.remarks}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──── Overview Tab ──── */}
          {activeTab === 'Overview' && (
            <div className="cw-panel rise">
              <div className="cw-panel-head">
                <h2 className="cw-panel-title">Case overview</h2>
                <span className="meta-pill">Day {record.daysElapsed}</span>
              </div>
              <div className="cw-panel-body">
                <div className="cw-overview-grid">
                  <div className="cw-overview-item">
                    <span className="cw-overview-label">Incident date</span>
                    <span className="cw-overview-value">{formatDate(record.incidentDate)}</span>
                  </div>
                  <div className="cw-overview-item">
                    <span className="cw-overview-label">Filed date</span>
                    <span className="cw-overview-value">{formatDate(record.filedDate)}</span>
                  </div>
                  <div className="cw-overview-item">
                    <span className="cw-overview-label">Location</span>
                    <span className="cw-overview-value">{record.location}</span>
                  </div>
                  <div className="cw-overview-item">
                    <span className="cw-overview-label">Department</span>
                    <span className="cw-overview-value">{record.department}</span>
                  </div>
                  <div className="cw-overview-item">
                    <span className="cw-overview-label">Category</span>
                    <span className="cw-overview-value">Workplace sexual harassment</span>
                  </div>
                  <div className="cw-overview-item">
                    <span className="cw-overview-label">Conciliation under Section 10</span>
                    <span className="cw-overview-value" style={{ color: record.conciliationRequested ? 'var(--color-accent)' : 'var(--color-warning)' }}>
                      {record.conciliationRequested ? 'Requested by complainant' : 'Declined by complainant'}
                    </span>
                  </div>
                </div>
                <div className="cw-summary-block">
                  <div className="cw-overview-label" style={{ marginBottom: 8 }}>Case summary</div>
                  <p className="cw-summary-text">
                    {record.summary}
                    {record.id === FLAGSHIP_CASE_ID && (
                      <> The complainant reported sustained unwelcome conduct by the respondent, a principal engineer in the same team, beginning in late March 2026. The conduct escalated following the complainant's explicit refusal, with the complainant alleging retaliatory behaviour that affected performance appraisal outcomes. A no-contact directive was issued under Section 12 as an interim measure. The inquiry has progressed through depositions, witness examinations, and cross-examination, and the committee is now preparing to deliberate on its findings.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ──── Parties Tab ──── */}
          {activeTab === 'Parties' && (
            <div className="cw-panel rise">
              <div className="cw-panel-head">
                <h2 className="cw-panel-title">Parties</h2>
              </div>
              <div className="cw-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card card-pad" style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div className="cw-party-avatar complainant" style={{ width: 40, height: 40, fontSize: 14 }}>
                    {record.complainant.actualName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-secondary-text)' }}>Complainant</div>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 500, marginTop: 4 }}>{maskParty(record.complainant)}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-secondary-text)', marginTop: 4 }}>{record.complainant.designation}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-secondary-text)' }}>{record.complainant.department} · {record.complainant.location}</div>
                  </div>
                </div>
                <div className="card card-pad" style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div className="cw-party-avatar respondent" style={{ width: 40, height: 40, fontSize: 14 }}>
                    {record.respondent.actualName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-secondary-text)' }}>Respondent</div>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 500, marginTop: 4 }}>{maskParty(record.respondent)}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-secondary-text)', marginTop: 4 }}>{record.respondent.designation}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-secondary-text)' }}>{record.respondent.department} · {record.respondent.location}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──── Timeline Tab ──── */}
          {activeTab === 'Timeline' && (
            <div className="cw-panel rise">
              <div className="cw-panel-head">
                <h2 className="cw-panel-title">Timeline</h2>
                <span className="meta-pill">{audit.length} events</span>
              </div>
              <div className="cw-timeline">
                {audit.map(event => (
                  <div key={event.id} className="cw-timeline-event">
                    <div className="cw-timeline-date">
                      {formatTimestamp(event.at)}
                    </div>
                    <div className={`cw-timeline-icon ${actionIconClass(event.action)}`}>
                      <ActionIcon action={event.action} />
                    </div>
                    <div className="cw-timeline-body">
                      <div className="cw-timeline-actor">{actorName(event.actorId)}</div>
                      <div className="cw-timeline-detail">{event.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ──── Proceedings Tab ──── */}
          {activeTab === 'Proceedings' && (
            <div className="cw-panel rise">
              <div className="cw-panel-head">
                <h2 className="cw-panel-title">Proceedings</h2>
                <button type="button" className="btn btn-secondary">
                  <Plus {...ICON_SM} />
                  Schedule hearing
                </button>
              </div>
              <div className="table-wrap" style={{ maxHeight: 'none' }}>
                <table className="data" style={{ minWidth: 780 }}>
                  <colgroup>
                    <col style={{ width: 120 }} />
                    <col style={{ width: 130 }} />
                    <col style={{ width: 160 }} />
                    <col style={{ width: 200 }} />
                    <col style={{ width: 100 }} />
                    <col style={{ width: 90 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="num">Date</th>
                      <th>Type</th>
                      <th>Title</th>
                      <th>Attendees / Quorum</th>
                      <th>Minutes</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hearings.map(h => {
                      const attendeeCount = h.attendeeIds.length
                      const hasPO = h.attendeeIds.includes('u-po')
                      // Quorum: minimum 3, PO present, majority women (in real life)
                      const quorumMet = attendeeCount >= 3 && hasPO

                      return (
                        <tr key={h.id}>
                          <td className="num">{formatTimestamp(h.at)}</td>
                          <td className="text-muted">{h.type}</td>
                          <td title={h.title}>{h.title}</td>
                          <td>
                            {quorumMet ? (
                              <div>
                                <span className="cw-quorum-pill">
                                  <Check size={12} strokeWidth={2} />
                                  Quorum met
                                </span>
                                <div className="cw-quorum-detail">
                                  {attendeeCount} of {attendeeCount} present · Presiding Officer present · Majority women ✓
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                                {attendeeCount} attendee{attendeeCount !== 1 ? 's' : ''} · {hasPO ? 'PO present' : 'PO absent'}
                              </span>
                            )}
                          </td>
                          <td>
                            {h.minutesRecorded ? (
                              <span className="badge badge-completed">Recorded</span>
                            ) : (
                              <span className="badge badge-low">Pending</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${h.status === 'Completed' ? 'badge-completed' : h.status === 'Scheduled' ? 'badge-scheduled' : 'badge-adjourned'}`}>
                              {h.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ──── Evidence Tab ──── */}
          {activeTab === 'Evidence' && (
            <div className="cw-panel rise">
              <div className="cw-panel-head">
                <h2 className="cw-panel-title">Evidence register</h2>
                <span className="meta-pill">{evidence.length} exhibits</span>
              </div>
              <div className="table-wrap" style={{ maxHeight: 'none' }}>
                <table className="data" style={{ minWidth: 700 }}>
                  <colgroup>
                    <col style={{ width: 80 }} />
                    <col style={{ width: 100 }} />
                    <col style={{ width: 150 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 130 }} />
                    <col style={{ width: 90 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Evidence No.</th>
                      <th>Type</th>
                      <th>Submitted by</th>
                      <th className="num">Received on</th>
                      <th>Shared with</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidence.map(e => (
                      <tr
                        key={e.id}
                        className="cw-evidence-row"
                        onClick={() => setSelectedEvidence(e.id)}
                      >
                        <td className="mono" style={{ color: 'var(--color-accent)' }}>{e.exhibitNo}</td>
                        <td>{e.type}</td>
                        <td>{actorName(e.submittedBy)}</td>
                        <td className="num">{formatDate(e.receivedOn)}</td>
                        <td className="text-muted">Internal Committee</td>
                        <td>
                          <span className={`badge ${e.status === 'In custody' ? 'badge-completed' : e.status === 'Released' ? 'badge-medium' : 'badge-low'}`}>
                            {e.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: 'var(--space-3) var(--space-5)', fontSize: 'var(--text-xs)', color: 'var(--color-secondary-text)' }}>
                Click any row to view the full chain of custody
              </div>
            </div>
          )}

          {/* ──── Documents Tab ──── */}
          {activeTab === 'Documents' && (
            <div className="cw-panel rise">
              <div className="cw-panel-head">
                <h2 className="cw-panel-title">Documents</h2>
                <span className="meta-pill">{documents.length} filed</span>
              </div>
              <div className="table-wrap" style={{ maxHeight: 'none' }}>
                <table className="data" style={{ minWidth: 700 }}>
                  <colgroup>
                    <col style={{ width: 40 }} />
                    <col style={{ width: 260 }} />
                    <col style={{ width: 60 }} />
                    <col style={{ width: 130 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 90 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th></th>
                      <th>Document</th>
                      <th>Version</th>
                      <th>Uploaded by</th>
                      <th className="num">Date</th>
                      <th>Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map(d => (
                      <tr key={d.id}>
                        <td>
                          <div className={`cw-file-icon ${fileIconClass(d.name)}`}>
                            {fileIconLabel(d.name)}
                          </div>
                        </td>
                        <td>
                          <div className="truncate-cell" title={d.name}>{d.name}</div>
                          <div className="truncate-cell text-12 text-faint">{d.description}</div>
                        </td>
                        <td>
                          <span className="cw-version-badge">{d.version}</span>
                        </td>
                        <td>{actorName(d.uploadedById)}</td>
                        <td className="num">{formatTimestamp(d.uploadedAt)}</td>
                        <td>
                          {d.access === 'Administrators only' || d.access === 'Legal and administrators' ? (
                            <span className="cw-restricted">
                              <Lock size={10} strokeWidth={2} />
                              {d.access === 'Administrators only' ? 'Restricted' : 'Legal'}
                            </span>
                          ) : (
                            <span style={{ fontSize: '10px', color: 'var(--color-secondary-text)' }}>{d.access}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ──── Communications Tab ──── */}
          {activeTab === 'Communications' && (
            <div className="cw-panel rise">
              <div className="cw-panel-head">
                <h2 className="cw-panel-title">Communications</h2>
                <span className="meta-pill">{comms.length} on record</span>
              </div>
              <div className="table-wrap" style={{ maxHeight: 'none' }}>
                <table className="data" style={{ minWidth: 700 }}>
                  <colgroup>
                    <col style={{ width: 100 }} />
                    <col style={{ width: 300 }} />
                    <col style={{ width: 120 }} />
                    <col style={{ width: 130 }} />
                    <col style={{ width: 100 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th>Template</th>
                      <th>Subject</th>
                      <th>Recipient</th>
                      <th className="num">Sent date</th>
                      <th>Delivery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comms.map(c => {
                      const isComplainant = c.counterpartyId.includes('complainant')
                      const recipientLabel = isComplainant ? 'Complainant' : 'Respondent'

                      return (
                        <tr key={c.id}>
                          <td>
                            <span className="badge badge-low">{c.channel}</span>
                          </td>
                          <td className="text-muted" title={c.template}>{c.template}</td>
                          <td title={c.subject}>{c.subject}</td>
                          <td className="text-muted">{recipientLabel}</td>
                          <td className="num">{formatTimestamp(c.at)}</td>
                          <td>
                            {c.deliveryStatus === 'Acknowledged' || c.acknowledged ? (
                              <span className="cw-delivery-delivered" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', fontWeight: 500 }}>
                                <Check size={12} strokeWidth={2} />
                                {c.deliveryStatus}
                              </span>
                            ) : c.deliveryStatus === 'Pending' ? (
                              <span className="cw-delivery-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', fontWeight: 500 }}>
                                <Clock size={12} strokeWidth={2} />
                                Pending
                              </span>
                            ) : (
                              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>{c.deliveryStatus}</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ──── Actions Tab ──── */}
          {activeTab === 'Actions' && (
            <div className="cw-panel rise">
              <div className="cw-panel-head">
                <h2 className="cw-panel-title">Actions</h2>
                <span className="meta-pill">{actions.length} items</span>
              </div>
              <div className="table-wrap" style={{ maxHeight: 'none' }}>
                <table className="data" style={{ minWidth: 700 }}>
                  <colgroup>
                    <col style={{ width: 320 }} />
                    <col style={{ width: 140 }} />
                    <col style={{ width: 100 }} />
                    <col style={{ width: 80 }} />
                    <col style={{ width: 100 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Owner</th>
                      <th className="num">Due date</th>
                      <th>Priority</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actions.map(a => (
                      <tr key={a.id} className={a.status === 'Overdue' ? 'cw-overdue' : ''}>
                        <td title={a.title}>{a.title}</td>
                        <td>{actorName(a.ownerId)}</td>
                        <td className="num">{formatDate(a.dueOn)}</td>
                        <td>
                          <span className={`badge ${a.priority === 'High' ? 'badge-high' : a.priority === 'Medium' ? 'badge-medium' : 'badge-low'}`}>
                            {a.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${a.status === 'Done' ? 'badge-completed' : a.status === 'Overdue' ? 'badge-overdue' : a.status === 'In progress' ? 'badge-progress' : 'badge-open'}`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>

        {/* ═══════════════════ RIGHT RAIL ═══════════════════ */}
        <aside className="cw-right">
          {/* Confidentiality notice */}
          <div className="cw-confidentiality">
            <Lock size={12} strokeWidth={2} />
            <span>Restricted — access logged</span>
          </div>

          {/* Activity feed */}
          <div className="cw-activity-feed">
            <div className="cw-activity-title">Activity feed</div>
            {audit.slice(0, 12).map(event => (
              <div key={event.id} className="cw-activity-item">
                <div className="cw-activity-avatar">
                  {actorInitials(event.actorId)}
                </div>
                <div className="cw-activity-body">
                  <div className="cw-activity-text">
                    <strong>{actorName(event.actorId)}</strong>{' '}
                    {naturalAction(event.action, event.entity)}
                  </div>
                  <div className="cw-activity-time">{relativeTime(event.at)}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* ═══════════════════ Evidence Slide-Over ═══════════════════ */}
      {selectedEvidence && selectedEv && (
        <>
          <div className="cw-slide-overlay" onClick={() => setSelectedEvidence(null)} />
          <div className="cw-slide-panel">
            <div className="cw-slide-head">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ fontSize: 'var(--text-lg)', color: 'var(--color-accent)' }}>
                    {selectedEv.exhibitNo}
                  </span>
                  <span className={`badge ${selectedEv.status === 'In custody' ? 'badge-completed' : selectedEv.status === 'Released' ? 'badge-medium' : 'badge-low'}`}>
                    {selectedEv.status}
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-secondary-text)', marginTop: 4 }}>
                  {selectedEv.type} · Submitted by {actorName(selectedEv.submittedBy)}
                </p>
              </div>
              <button
                type="button"
                className="cw-slide-close"
                onClick={() => setSelectedEvidence(null)}
              >
                <X {...ICON} />
              </button>
            </div>

            <div className="cw-slide-body">
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', lineHeight: 1.6, marginBottom: 24 }}>
                {selectedEv.description}
              </p>

              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-secondary-text)', marginBottom: 12 }}>
                Chain of Custody — {selectedEv.chainOfCustody.length} events
              </div>

              {selectedEv.chainOfCustody.map(event => {
                const actor = userById(event.actorId)
                return (
                  <div key={event.id} className="cw-custody-event">
                    <div className="cw-custody-time">{formatTimestamp(event.at)}</div>
                    <div className="cw-custody-action">
                      {actorName(event.actorId)} — {event.action}
                    </div>
                    <div className="cw-custody-meta">
                      {actor?.designation ?? event.actorId} · {event.note}
                    </div>
                    <div className="cw-custody-meta" style={{ fontFamily: 'var(--font-mono)' }}>
                      IP: {event.ip}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
