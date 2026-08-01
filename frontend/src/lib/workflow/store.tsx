/**
 * Workflow state.
 *
 * The statutory caseload in `data/cases.ts` is a fixed, computed fixture — it is the
 * demo's furniture and it does not move. This store sits on top of it and holds the
 * part that does move: where each case is on the lifecycle ladder, which board is
 * carrying it, what has been filed, heard, recommended and decided.
 *
 * Persistence is deliberately split from authentication. Signing in stays in memory,
 * so a refresh returns to the sign-in screen exactly as it did before. Workflow
 * progress persists to localStorage, because losing twenty steps of a walkthrough to a
 * stray refresh is a different and much worse kind of surprise. `resetWorkflow()`
 * puts everything back to the seed.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CASES } from '../data/cases'
import { USER_BY_ROLE, userById } from '../data/users'
import { ROLE_LABEL, type Case, type CaseStage, type Role } from '../data/types'
import { casesVisibleTo, useRole } from '../role-context'
import { dateNDaysAgo } from '../data/statutory'
import { actionsFor, transitionById, type WorkflowTransition } from './machine'
import {
  computeHash,
  verifyIntegrity,
  type CustodyEntry,
  type CustodyAction,
  type EvidenceState,
  type VerifyResult,
} from '../evidence/model'
import { hashOf } from '../defensibility/hash'
import {
  STAGE_META,
  isWorkflowTerminal,
  type AdminAccount,
  type CaseFlow,
  type Committee,
  type FinalDecision,
  type FlowEvent,
  type FlowEvidenceItem,
  type FlowHearing,
  type FlowNotification,
  type FlowRecommendation,
  type ProcessFeedback,
  type GeneratedDocument,
  type HearingMinutes,
  type WorkflowStage,
} from './types'

const STORAGE_KEY = 'sentinel.workflow.v1'

/* ------------------------------------------------------------------ *
 * Seeding
 * ------------------------------------------------------------------ */

/**
 * Where a seeded case sits on the workflow ladder, inferred from its statutory stage.
 * The mapping is intentionally spread out: it puts live work in front of every role on
 * the sign-in screen rather than parking the whole caseload on one step.
 */
const STAGE_SEED: Record<CaseStage, WorkflowStage> = {
  registered: 'case_created',
  notice_served: 'committee_assigned',
  awaiting_reply: 'committee_accepted',
  inquiry: 'evidence_review',
  report_pending: 'minutes_recorded',
  employer_action: 'recommendation_review',
  appeal_window: 'recommendation_approved',
  closed: 'case_closed',
  archived: 'case_archived',
}

const BOARD_A: Committee = {
  id: 'IC-BOARD-A',
  name: 'Internal Committee — Board A',
  memberIds: ['u-po', 'u-ic', 'u-ext'],
  presidingOfficerId: 'u-po',
  createdBy: 'u-admin',
  createdAt: `${dateNDaysAgo(240)}T09:00:00`,
  active: true,
}

const BOARD_B: Committee = {
  id: 'IC-BOARD-B',
  name: 'Internal Committee — Board B (with legal advisor)',
  memberIds: ['u-po', 'u-ic', 'u-ext', 'u-legal'],
  presidingOfficerId: 'u-po',
  createdBy: 'u-admin',
  createdAt: `${dateNDaysAgo(210)}T09:00:00`,
  active: true,
}

const SEED_COMMITTEES = [BOARD_A, BOARD_B]

const ts = (daysAgo: number, clock = '10:00') => `${dateNDaysAgo(Math.max(0, daysAgo))}T${clock}:00`

/** A short, plausible history for a seeded case, ending at its current stage. */
function seedHistory(record: Case, stage: WorkflowStage): FlowEvent[] {
  const path: Array<[WorkflowStage, string, string, number]> = [
    ['complaint_submitted', 'u-emp', 'Complaint filed by the complainant.', record.daysElapsed],
    ['complaint_under_review', 'u-padmin', 'Complaint taken up for screening.', record.daysElapsed - 1],
    ['complaint_accepted', 'u-padmin', 'Complaint admitted for formal inquiry.', record.daysElapsed - 2],
    ['case_created', 'u-padmin', 'Statutory case docket opened.', record.daysElapsed - 2],
    ['committee_assigned', 'u-padmin', 'Internal Committee nominated.', record.daysElapsed - 4],
    ['committee_accepted', 'u-po', 'Committee accepted carriage of the case.', record.daysElapsed - 5],
    ['investigation_started', 'u-po', 'Inquiry proceedings initiated.', record.daysElapsed - 6],
    ['evidence_review', 'u-ic', 'Evidence review opened.', record.daysElapsed - 10],
    ['evidence_verified', 'u-ic', 'Evidence admitted to the record.', record.daysElapsed - 20],
    ['hearing_scheduled', 'u-po', 'Hearing listed and notice issued.', record.daysElapsed - 24],
    ['hearing_completed', 'u-po', 'Hearing held; parties heard.', record.daysElapsed - 30],
    ['minutes_recorded', 'u-ic', 'Minutes of the sitting registered.', record.daysElapsed - 32],
    ['recommendation_submitted', 'u-ext', 'Committee report submitted.', record.daysElapsed - 36],
    ['recommendation_review', 'u-padmin', 'Recommendation audit opened.', record.daysElapsed - 38],
    ['recommendation_approved', 'u-padmin', 'Committee findings accepted.', record.daysElapsed - 42],
    ['final_decision_recorded', 'u-padmin', 'Employer action recorded under s.13(3).', record.daysElapsed - 46],
    ['case_closed', 'u-padmin', 'Case docket closed.', record.daysElapsed - 48],
    ['employee_notified', 'system', 'Outcome notice issued to the complainant.', record.daysElapsed - 48],
    ['decision_viewed', 'u-emp', 'Complainant read the outcome.', record.daysElapsed - 50],
    ['feedback_submitted', 'u-emp', 'Process feedback submitted.', record.daysElapsed - 52],
    ['case_archived', 'u-padmin', 'Case sealed under the retention policy.', record.daysElapsed - 56],
  ]

  const stop = path.findIndex(([s]) => s === stage)
  const upto = stop === -1 ? 0 : stop
  return path.slice(0, upto + 1).map(([s, actorId, remarks, daysAgo], i) => {
    const user = userById(actorId)
    return {
      id: `${record.id}-h${i}`,
      stage: s,
      actorId,
      actorName: user?.name ?? 'System',
      actorRole: user ? ROLE_LABEL[user.role] : 'System',
      at: ts(daysAgo, `${String(9 + (i % 8)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`),
      remarks,
    }
  })
}

function seedFlow(record: Case): CaseFlow {
  const stage = STAGE_SEED[record.stage]
  const history = seedHistory(record, stage)
  const past = (s: WorkflowStage) => history.some((h) => h.stage === s)

  const admitted = past('evidence_verified')
  const seedItem = (
    n: number,
    label: string,
    note: string,
    daysAgo: number,
    sizeKb: number,
    mimeType: string,
  ): FlowEvidenceItem => {
    const state: EvidenceState = admitted ? 'Admitted' : 'Submitted'
    const at = ts(daysAgo)
    return upgradeEvidence({
      id: `${record.id}-ev${n}`,
      label,
      note,
      uploadedBy: 'u-emp',
      uploadedAt: at,
      supplementary: false,
      status: statusFor(state, false),
      state,
      stateReason: null,
      hash: '',
      sizeKb,
      mimeType,
      exhibitNo: admitted ? `E-${String(n).padStart(2, '0')}` : null,
      custody: [
        {
          id: `${record.id}-ev${n}-c0`,
          at,
          actorId: 'u-emp',
          actorName: 'Ananya Pillai',
          actorRole: ROLE_LABEL.employee,
          action: 'Received' as CustodyAction,
          detail: 'Filed by the complainant.',
        },
        ...(admitted
          ? [
              {
                id: `${record.id}-ev${n}-c1`,
                at: ts(Math.max(0, daysAgo - 6)),
                actorId: 'u-ic',
                actorName: 'Vikram Mehta',
                actorRole: ROLE_LABEL.ic_member,
                action: 'State changed' as CustodyAction,
                detail: 'Admitted to the record after examination by the committee.',
              },
            ]
          : []),
      ],
      supersedes: null,
      superseded: false,
      version: 1,
      objectUrl: null,
    })
  }

  const evidence: FlowEvidenceItem[] = [
    seedItem(1, 'Complaint annexure — written account', 'Filed with the original complaint.', record.daysElapsed, 248, 'application/pdf'),
    seedItem(2, 'Message log export', 'Exported from the corporate messaging archive.', record.daysElapsed - 1, 1120, 'text/plain'),
  ]

  const hearings: FlowHearing[] = past('hearing_scheduled')
    ? [
        {
          id: `${record.id}-hr1`,
          at: ts(record.daysElapsed - 30, '11:00'),
          mode: 'In person',
          location: `${record.location} — Committee room`,
          agenda: 'Examination of the complainant and the respondent.',
          scheduledBy: 'u-po',
          status: past('hearing_completed') ? 'Completed' : 'Scheduled',
          minutes: past('minutes_recorded')
            ? 'Both parties examined. Documentary evidence taken on record. Committee reserved its findings.'
            : null,
        },
      ]
    : []

  const recommendations: FlowRecommendation[] = past('recommendation_submitted')
    ? [
        {
          id: `${record.id}-rec1`,
          author: 'Farah Qureshi',
          authorRole: ROLE_LABEL.external_member,
          at: ts(record.daysElapsed - 36, '16:30'),
          finding: 'Allegation substantiated on the documentary record and the depositions taken.',
          recommendedAction: 'Written warning, mandatory sensitisation training and reassignment of reporting line.',
          provision: 'Section 13(3)(i) — action as misconduct under the service rules',
          revisionOf: null,
          status: past('recommendation_approved') ? 'Approved' : 'Under review',
          reviewNote: past('recommendation_approved') ? 'Findings accepted in full.' : null,
        },
      ]
    : []

  const finalDecision: FinalDecision | null = past('final_decision_recorded')
    ? {
        at: ts(record.daysElapsed - 46, '11:00'),
        recordedBy: 'u-padmin',
        outcome: 'Upheld in part',
        action: 'Written warning issued; sensitisation training completed; reporting line reassigned.',
        note: 'Action taken within the 60-day window under s.13(4).',
      }
    : null

  const feedback: ProcessFeedback | null = past('feedback_submitted')
    ? { at: ts(record.daysElapsed - 52, '09:15'), rating: 4, comment: 'The process was handled confidentially and on time.' }
    : null

  // Seed an advisory note on cases far enough along for the External Member to have
  // formed a view, so the advisory panel is populated on first load.
  const advisoryNotes = past('evidence_review')
    ? [
        {
          id: `${record.id}-adv1`,
          author: 'Farah Qureshi',
          authorRole: ROLE_LABEL.external_member,
          authorId: 'u-ext',
          at: ts(record.daysElapsed - 12, '17:20'),
          text: past('hearing_completed')
            ? 'Both parties were heard separately at their own request. Procedure followed was fair and the record is complete.'
            : 'Recommend the complainant be offered a support person before the next sitting, and that the no-contact directive be restated in writing.',
          concern: false,
        },
      ]
    : []

  return {
    caseId: record.id,
    stage,
    history,
    committeeId: past('committee_assigned')
      ? record.assignedIC.length > 3
        ? BOARD_B.id
        : BOARD_A.id
      : null,
    acceptedBy: past('committee_accepted') ? record.assignedIC : [],
    declinedBy: [],
    evidence,
    evidenceRequests: [],
    hearings,
    recommendations,
    finalDecision,
    feedback,
    advisoryNotes,
    packExports: [],
    documents: [],
    minutes: [],
    raisedInSession: false,
  }
}

function seedNotifications(): FlowNotification[] {
  return [
    {
      id: 'n-seed-1',
      audience: ['posh_admin', 'super_admin'],
      caseId: 'POSH-2026-0158',
      title: 'Complaint awaiting screening',
      detail: 'POSH-2026-0158 has been registered and is waiting to be taken up.',
      at: ts(2, '09:12'),
      read: false,
    },
    {
      id: 'n-seed-2',
      audience: ['presiding_officer', 'ic_member', 'external_member'],
      caseId: 'POSH-2026-0142',
      title: 'Evidence review open',
      detail: 'POSH-2026-0142 is at Day 84 of 90. Evidence review is outstanding.',
      at: ts(1, '15:40'),
      read: false,
    },
    // The complainant's own feed. Written as notices a person would actually receive,
    // in the order they would have arrived — the notification centre is the main way
    // someone with one case learns anything, so it must not be a stub.
    {
      id: 'n-seed-3',
      audience: ['employee'],
      caseId: 'POSH-2026-0142',
      title: 'Your case is in inquiry',
      detail: 'The Internal Committee is reviewing the material on record.',
      at: ts(1, '15:41'),
      read: false,
    },
    {
      id: 'n-seed-4',
      audience: ['employee'],
      caseId: 'POSH-2026-0142',
      title: 'Deliberation sitting scheduled',
      detail: 'A sitting has been listed. You will be told separately if your attendance is required.',
      at: ts(6, '11:45'),
      read: true,
    },
    {
      id: 'n-seed-5',
      audience: ['employee'],
      caseId: 'POSH-2026-0142',
      title: 'Interim measure recorded',
      detail: 'A no-contact directive was issued under Section 12 at your request.',
      at: ts(66, '10:05'),
      read: true,
    },
    {
      id: 'n-seed-6',
      audience: ['employee'],
      caseId: 'POSH-2026-0142',
      title: 'Internal Committee assigned',
      detail: 'A board has taken carriage of your complaint. Their names are on your case.',
      at: ts(80, '09:30'),
      read: true,
    },
    {
      id: 'n-seed-7',
      audience: ['employee'],
      caseId: 'POSH-2026-0142',
      title: 'Complaint acknowledged',
      detail: 'Your complaint was received and registered as POSH-2026-0142.',
      at: ts(83, '10:02'),
      read: true,
    },
  ]
}

interface Persisted {
  flows: Record<string, CaseFlow>
  committees: Committee[]
  admins: AdminAccount[]
  notifications: FlowNotification[]
  sessionCases: Case[]
}

function seedState(): Persisted {
  const flows: Record<string, CaseFlow> = {}
  for (const c of CASES) flows[c.id] = seedFlow(c)
  return {
    flows,
    committees: SEED_COMMITTEES,
    admins: [
      {
        id: 'u-padmin',
        name: 'Anita Sharma',
        email: 'anita.sharma@company.co.in',
        department: 'Human Resources',
        createdBy: 'u-admin',
        createdAt: ts(300, '09:00'),
      },
    ],
    notifications: seedNotifications(),
    sessionCases: [],
  }
}

/**
 * `status` is derived from `state`, in one place.
 *
 * Eleven screens read the old three-value `status`. Rather than edit all of them, the
 * store keeps it in step with the real state whenever the state changes — so the two
 * cannot drift, which is what would happen if each mutator set both by hand.
 */
function statusFor(state: EvidenceState, superseded: boolean): FlowEvidenceItem['status'] {
  if (superseded) return 'Superseded'
  return state === 'Admitted' ? 'Verified' : 'Pending verification'
}

/** Fills the Phase 5 fields on an item written before they existed. */
function upgradeEvidence(e: FlowEvidenceItem): FlowEvidenceItem {
  const state: EvidenceState =
    e.state ?? (e.status === 'Verified' ? 'Admitted' : e.status === 'Superseded' ? 'Submitted' : 'Submitted')
  return {
    ...e,
    state,
    stateReason: e.stateReason ?? null,
    // Left empty deliberately: the digest is hydrated once, on mount, so it is fixed
    // before anything can be compared against it.
    hash: e.hash ?? '',
    sizeKb: e.sizeKb ?? 0,
    mimeType: e.mimeType ?? 'application/pdf',
    uploadedByName: e.uploadedByName ?? userById(e.uploadedBy)?.name ?? 'Unknown',
    uploadedByRole: e.uploadedByRole ?? (userById(e.uploadedBy) ? ROLE_LABEL[userById(e.uploadedBy)!.role] : 'Unknown'),
    exhibitNo: e.exhibitNo ?? null,
    custody: e.custody ?? [],
    supersedes: e.supersedes ?? null,
    superseded: e.superseded ?? e.status === 'Superseded',
    version: e.version ?? 1,
    objectUrl: e.objectUrl ?? null,
  }
}

function loadState(): Persisted {
  if (typeof window === 'undefined') return seedState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedState()
    const parsed = JSON.parse(raw) as Persisted
    // A seeded case that has appeared since the snapshot was written would otherwise
    // have no flow at all, and every screen reading it would fall over.
    const seeded = seedState()
    for (const c of CASES) parsed.flows[c.id] ??= seeded.flows[c.id]
    // A snapshot written before a collection existed would leave it undefined, and the
    // screens that map over it would throw. Cheaper to normalise here than to guard at
    // every call site.
    for (const id of Object.keys(parsed.flows)) {
      const f = parsed.flows[id]
      f.advisoryNotes ??= []
      f.packExports ??= []
      // Evidence gained a state machine, a digest and a custody trail in Phase 5.
      // Snapshots written before that carry the old three-value `status` only, so the
      // richer fields are filled here rather than guarded at every call site.
      f.evidence = (f.evidence ?? []).map(upgradeEvidence)
      f.documents ??= []
      f.minutes ??= []
      f.evidence ??= []
      f.evidenceRequests ??= []
      f.hearings ??= []
      f.recommendations ??= []
      f.history ??= []
      f.acceptedBy ??= []
      f.declinedBy ??= []
    }
    return parsed
  } catch {
    return seedState()
  }
}

/* ------------------------------------------------------------------ *
 * Context
 * ------------------------------------------------------------------ */

export interface NewComplaintInput {
  narrative: string
  category: string
  incidentDate: string
  location: string
  department: string
  respondentName: string
  withholdNames: boolean
  conciliationRequested: boolean
  files: Array<{ name: string; sizeKb: number }>
}

export interface WorkflowState {
  /** Seeded caseload plus anything raised during the session. */
  allCases: Case[]
  /** `allCases` filtered by the current role's listing rule. */
  visibleCases: Case[]
  /**
   * Cases the signed-in user personally sits on — by committee board where one has been
   * assigned, otherwise by the panel recorded on the case. Empty for anyone who is not
   * a committee member.
   */
  myAssignedCases: Case[]
  caseById: (id: string | undefined) => Case | undefined
  flowFor: (caseId: string) => CaseFlow | undefined
  committees: Committee[]
  committeeById: (id: string | null) => Committee | undefined
  admins: AdminAccount[]
  notifications: FlowNotification[]
  /** Notices addressed to the signed-in role. */
  myNotifications: FlowNotification[]
  unreadCount: number

  /** Transitions the signed-in role may drive on this case, already precondition-checked. */
  availableActions: (caseId: string) => Array<WorkflowTransition & { blocked: string | null }>
  runAction: (caseId: string, transitionId: string, note?: string) => void

  createCommittee: (name: string, memberIds: string[], presidingOfficerId: string) => void
  assignCommittee: (caseId: string, committeeId: string) => void
  addEvidence: (caseId: string, label: string, note: string, supplementary: boolean) => void
  scheduleHearing: (caseId: string, input: Omit<FlowHearing, 'id' | 'status' | 'minutes' | 'scheduledBy'>) => void
  addRecommendation: (
    caseId: string,
    input: { finding: string; recommendedAction: string; provision: string },
  ) => void
  recordDecision: (caseId: string, input: Omit<FinalDecision, 'at' | 'recordedBy'>) => void
  createAdminAccount: (input: { name: string; email: string; department: string }) => void
  addAdvisoryNote: (caseId: string, text: string, concern: boolean) => void
  recordPackExport: (caseId: string, meta: { rootHash: string; redacted: boolean; pages: number; recipient: string }) => void

  /* --- Evidence (Phase 5) --- */
  /** Moves an item's admission state. A refusal requires a reason. */
  setEvidenceState: (caseId: string, evidenceId: string, state: EvidenceState, reason?: string) => void
  /** Appends to the append-only custody trail. Reads count. */
  logEvidenceAccess: (caseId: string, evidenceId: string, action: CustodyAction, detail: string) => void
  /** Recomputes the digest and compares it with the one fixed at intake. */
  checkEvidenceIntegrity: (caseId: string, evidenceId: string) => Promise<VerifyResult | null>
  /* --- Documents and minutes (Phase 6) --- */
  /** Files a generated document in the vault with custody metadata. */
  fileDocument: (
    caseId: string,
    doc: { templateId: string; title: string; audience: string; body: string; values: Record<string, string> },
  ) => Promise<string>
  /** Records that a document was actually issued, to whom and by what channel. */
  issueDocument: (
    caseId: string,
    documentId: string,
    to: string,
    channel: 'Email' | 'Letter' | 'Portal notice' | 'In person',
  ) => void
  /** Creates or updates a draft. Finalised minutes are never edited in place. */
  saveMinutes: (caseId: string, minutes: HearingMinutes) => void
  /** Locks a draft and hashes it. */
  finaliseMinutes: (caseId: string, minutesId: string) => Promise<void>
  /** Opens a new version from a finalised one, retaining the original. */
  reviseMinutes: (caseId: string, minutesId: string) => string | null
  /** Sends finalised minutes to the panel for sign-off. */
  circulateMinutes: (caseId: string, minutesId: string) => void
  /** A member confirms the minutes are an accurate record. */
  confirmMinutes: (caseId: string, minutesId: string, confirmed: boolean) => void

  /** Files new material, hashing it before it lands. */
  uploadEvidence: (
    caseId: string,
    files: Array<{ name: string; sizeKb: number; mimeType: string; objectUrl?: string | null }>,
    opts?: { supplementary?: boolean; supersedesId?: string },
  ) => Promise<void>
  submitComplaint: (input: NewComplaintInput) => string
  markNotificationsRead: () => void
  resetWorkflow: () => void
}

const WorkflowContext = createContext<WorkflowState | null>(null)

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const { currentRole, currentUser } = useRole()
  const [state, setState] = useState<Persisted>(loadState)

  /**
   * Fixes the intake digest for any item that does not have one.
   *
   * Seeded evidence cannot be hashed while the fixture is built, because Web Crypto is
   * async and seeding is not. So it happens once, here, on first mount — and only for
   * items with no digest. After that the value is stored and never recomputed, which is
   * the whole point: a digest that is refreshed every load would always match, and would
   * prove nothing.
   */
  useEffect(() => {
    const missing = Object.values(state.flows).flatMap((f) =>
      (f.evidence ?? []).filter((e) => !e.hash).map((e) => ({ caseId: f.caseId, e })),
    )
    if (!missing.length) return
    let cancelled = false
    void (async () => {
      const hashed = await Promise.all(
        missing.map(async ({ caseId, e }) => ({ caseId, id: e.id, hash: await computeHash(e as never) })),
      )
      if (cancelled) return
      setState((prev) => {
        const flows = { ...prev.flows }
        for (const { caseId, id, hash } of hashed) {
          const flow = flows[caseId]
          if (!flow) continue
          flows[caseId] = {
            ...flow,
            evidence: flow.evidence.map((e) => (e.id === id && !e.hash ? { ...e, hash } : e)),
          }
        }
        return { ...prev, flows }
      })
    })()
    return () => {
      cancelled = true
    }
    // Runs whenever items without a digest appear — on load, and after an upload that
    // somehow landed without one.
  }, [state.flows])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Quota or private-browsing failures are not worth interrupting a demo for.
    }
  }, [state])

  const actorId = currentUser?.id ?? 'system'
  const actorName = currentUser?.name ?? 'System'
  const actorRole = currentRole ? ROLE_LABEL[currentRole] : 'System'

  const allCases = useMemo(() => [...state.sessionCases, ...CASES], [state.sessionCases])

  const caseIndex = useMemo(() => new Map(allCases.map((c) => [c.id, c])), [allCases])

  const visibleCases = useMemo(
    () => casesVisibleTo(currentRole, allCases),
    [currentRole, allCases],
  )

  const myAssignedCases = useMemo(() => {
    const uid = currentUser?.id
    if (!uid) return []
    return allCases.filter((c) => {
      const flow = state.flows[c.id]
      const board = flow?.committeeId
        ? state.committees.find((b) => b.id === flow.committeeId)
        : undefined
      // Once a board is carrying the case its membership is authoritative; before that
      // the panel recorded on the case is the only thing that says who will sit.
      return board ? board.memberIds.includes(uid) : c.assignedIC.includes(uid)
    })
  }, [allCases, state.flows, state.committees, currentUser?.id])

  /** Appends a history entry and moves the flow. Every mutation funnels through here. */
  const advance = useCallback(
    (caseId: string, stage: WorkflowStage, remarks: string, patch?: Partial<CaseFlow>) => {
      setState((prev) => {
        const flow = prev.flows[caseId]
        if (!flow) return prev
        const event: FlowEvent = {
          id: `${caseId}-h-${Date.now()}`,
          stage,
          actorId,
          actorName,
          actorRole,
          at: new Date().toISOString(),
          remarks,
        }
        return {
          ...prev,
          flows: {
            ...prev.flows,
            [caseId]: { ...flow, ...patch, stage, history: [...flow.history, event] },
          },
        }
      })
    },
    [actorId, actorName, actorRole],
  )

  const notify = useCallback(
    (audience: Role[], caseId: string | null, title: string, detail: string) => {
      setState((prev) => ({
        ...prev,
        notifications: [
          {
            id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            audience,
            caseId,
            title,
            detail,
            at: new Date().toISOString(),
            read: false,
          },
          ...prev.notifications,
        ],
      }))
    },
    [],
  )

  /**
   * Preconditions. A transition can be permitted by role and still be premature —
   * a board cannot be assigned before one is chosen, and evidence cannot be verified
   * before any is filed. Returning the reason rather than hiding the button keeps the
   * next step discoverable.
   */
  const blockedReason = useCallback(
    (flow: CaseFlow, t: WorkflowTransition): string | null => {
      switch (t.requires) {
        case 'committee':
          return flow.committeeId ? null : 'Assign a committee board to this case first.'
        case 'evidence':
          return flow.evidence.length ? null : 'No evidence has been filed on this case yet.'
        case 'hearing':
          return flow.hearings.length ? null : 'Schedule a hearing sitting first.'
        case 'minutes':
          return flow.hearings.some((h) => h.minutes) ? null : 'Record the minutes of the sitting first.'
        case 'recommendation':
          return flow.recommendations.length ? null : 'Draft the committee recommendation first.'
        default:
          return null
      }
    },
    [],
  )

  const availableActions = useCallback(
    (caseId: string) => {
      const flow = state.flows[caseId]
      if (!flow || isWorkflowTerminal(flow.stage)) return []
      return actionsFor(flow.stage, currentRole).map((t) => ({
        ...t,
        blocked: blockedReason(flow, t),
      }))
    },
    [state.flows, currentRole, blockedReason],
  )

  const runAction = useCallback(
    (caseId: string, transitionId: string, note?: string) => {
      const t = transitionById(transitionId)
      const flow = state.flows[caseId]
      if (!t || !flow || flow.stage !== t.from) return

      const remarks = note?.trim() ? `${t.remark} — ${note.trim()}` : t.remark
      const patch: Partial<CaseFlow> = {}

      // A handful of transitions carry a record with them, not just a stage change.
      if (t.id === 'accept-assignment') {
        patch.acceptedBy = [...new Set([...flow.acceptedBy, actorId])]
      }
      if (t.id === 'decline-assignment') {
        patch.declinedBy = [...new Set([...flow.declinedBy, actorId])]
        patch.committeeId = null
        patch.acceptedBy = []
      }
      if (t.id === 'request-evidence') {
        patch.evidenceRequests = [
          ...flow.evidenceRequests,
          {
            id: `${caseId}-req-${Date.now()}`,
            requestedBy: actorName,
            requestedAt: new Date().toISOString(),
            detail: note?.trim() || 'Further material required.',
            fulfilledAt: null,
          },
        ]
      }
      if (t.id === 'upload-supplementary') {
        patch.evidence = [
          ...flow.evidence,
          {
            id: `${caseId}-ev-${Date.now()}`,
            label: note?.trim() || 'Supplementary material',
            note: 'Filed in response to a committee request.',
            uploadedBy: actorId,
            uploadedAt: new Date().toISOString(),
            supplementary: true,
            status: 'Pending verification',
          },
        ]
        patch.evidenceRequests = flow.evidenceRequests.map((r) =>
          r.fulfilledAt ? r : { ...r, fulfilledAt: new Date().toISOString() },
        )
      }
      if (t.id === 'verify-evidence') {
        patch.evidence = flow.evidence.map((e) =>
          e.status === 'Pending verification' ? { ...e, status: 'Verified' as const } : e,
        )
      }
      if (t.id === 'conduct-hearing') {
        patch.hearings = flow.hearings.map((h, i) =>
          i === flow.hearings.length - 1 ? { ...h, status: 'Completed' as const } : h,
        )
      }
      if (t.id === 'record-minutes') {
        patch.hearings = flow.hearings.map((h, i) =>
          i === flow.hearings.length - 1
            ? { ...h, minutes: note?.trim() || 'Minutes registered.', status: 'Completed' as const }
            : h,
        )
      }
      if (t.id === 'approve-recommendation' || t.id === 'reject-recommendation' || t.id === 'return-recommendation') {
        const status =
          t.id === 'approve-recommendation' ? 'Approved' : t.id === 'reject-recommendation' ? 'Rejected' : 'Returned'
        patch.recommendations = flow.recommendations.map((r, i) =>
          i === flow.recommendations.length - 1
            ? { ...r, status: status as FlowRecommendation['status'], reviewNote: note?.trim() || null }
            : r,
        )
      }
      if (t.id === 'resubmit-recommendation') {
        const last = flow.recommendations[flow.recommendations.length - 1]
        patch.recommendations = [
          ...flow.recommendations,
          {
            id: `${caseId}-rec-${Date.now()}`,
            author: actorName,
            authorRole: actorRole,
            at: new Date().toISOString(),
            finding: last?.finding ?? 'Findings as previously recorded.',
            recommendedAction: last?.recommendedAction ?? 'Action as previously recommended.',
            provision: last?.provision ?? 'Section 13(3)',
            revisionOf: last?.id ?? null,
            status: 'Under review',
            reviewNote: note?.trim() ? `Revision: ${note.trim()}` : null,
          },
        ]
      }
      if (t.id === 'record-decision') {
        patch.finalDecision = {
          at: new Date().toISOString(),
          recordedBy: actorId,
          outcome: 'Upheld in part',
          action: note?.trim() || 'Action recorded.',
          note: 'Recorded within the 60-day window under s.13(4).',
        }
      }
      if (t.id === 'submit-feedback') {
        patch.feedback = { at: new Date().toISOString(), rating: 5, comment: note?.trim() || 'No comment.' }
      }

      advance(caseId, t.to, remarks, patch)

      // Tell whoever the case has just landed on.
      const audienceMap: Partial<Record<WorkflowStage, Role[]>> = {
        complaint_under_review: ['posh_admin', 'super_admin'],
        complaint_accepted: ['posh_admin', 'super_admin'],
        complaint_rejected: ['employee'],
        case_created: ['posh_admin', 'super_admin'],
        committee_assigned: ['presiding_officer', 'ic_member', 'external_member'],
        committee_accepted: ['posh_admin', 'super_admin'],
        investigation_started: ['employee', 'posh_admin'],
        evidence_more_requested: ['employee'],
        evidence_resubmitted: ['presiding_officer', 'ic_member', 'external_member'],
        recommendation_submitted: ['posh_admin', 'super_admin'],
        recommendation_returned: ['presiding_officer', 'ic_member', 'external_member'],
        recommendation_resubmitted: ['posh_admin', 'super_admin'],
        recommendation_approved: ['posh_admin', 'super_admin'],
        case_closed: ['posh_admin', 'super_admin'],
        employee_notified: ['employee'],
        feedback_submitted: ['posh_admin', 'super_admin'],
        case_archived: ['posh_admin', 'super_admin'],
      }
      const audience = audienceMap[t.to]
      if (audience) {
        notify(audience, caseId, `${caseId} — ${STAGE_META[t.to].label}`, STAGE_META[t.to].description)
      }
    },
    [state.flows, advance, notify, actorId, actorName, actorRole],
  )

  const createCommittee = useCallback(
    (name: string, memberIds: string[], presidingOfficerId: string) => {
      setState((prev) => ({
        ...prev,
        committees: [
          ...prev.committees,
          {
            id: `IC-BOARD-${String.fromCharCode(65 + prev.committees.length)}`,
            name,
            memberIds,
            presidingOfficerId,
            createdBy: actorId,
            createdAt: new Date().toISOString(),
            active: true,
          },
        ],
      }))
      notify(
        ['presiding_officer', 'ic_member', 'external_member'],
        null,
        'New committee board constituted',
        `${name} has been constituted and is available for assignment.`,
      )
    },
    [actorId, notify],
  )

  const assignCommittee = useCallback(
    (caseId: string, committeeId: string) => {
      setState((prev) => {
        const flow = prev.flows[caseId]
        if (!flow) return prev
        return { ...prev, flows: { ...prev.flows, [caseId]: { ...flow, committeeId, acceptedBy: [] } } }
      })
    },
    [],
  )

  const addEvidence = useCallback(
    (caseId: string, label: string, note: string, supplementary: boolean) => {
      setState((prev) => {
        const flow = prev.flows[caseId]
        if (!flow) return prev
        const item: FlowEvidenceItem = {
          id: `${caseId}-ev-${Date.now()}`,
          label,
          note,
          uploadedBy: actorId,
          uploadedAt: new Date().toISOString(),
          supplementary,
          status: 'Pending verification',
        }
        return { ...prev, flows: { ...prev.flows, [caseId]: { ...flow, evidence: [...flow.evidence, item] } } }
      })
    },
    [actorId],
  )

  const scheduleHearing = useCallback(
    (caseId: string, input: Omit<FlowHearing, 'id' | 'status' | 'minutes' | 'scheduledBy'>) => {
      setState((prev) => {
        const flow = prev.flows[caseId]
        if (!flow) return prev
        const hearing: FlowHearing = {
          ...input,
          id: `${caseId}-hr-${Date.now()}`,
          scheduledBy: actorId,
          status: 'Scheduled',
          minutes: null,
        }
        return { ...prev, flows: { ...prev.flows, [caseId]: { ...flow, hearings: [...flow.hearings, hearing] } } }
      })
    },
    [actorId],
  )

  const addRecommendation = useCallback(
    (caseId: string, input: { finding: string; recommendedAction: string; provision: string }) => {
      setState((prev) => {
        const flow = prev.flows[caseId]
        if (!flow) return prev
        const rec: FlowRecommendation = {
          ...input,
          id: `${caseId}-rec-${Date.now()}`,
          author: actorName,
          authorRole: actorRole,
          at: new Date().toISOString(),
          revisionOf: null,
          status: 'Under review',
          reviewNote: null,
        }
        return {
          ...prev,
          flows: { ...prev.flows, [caseId]: { ...flow, recommendations: [...flow.recommendations, rec] } },
        }
      })
    },
    [actorName, actorRole],
  )

  const recordDecision = useCallback(
    (caseId: string, input: Omit<FinalDecision, 'at' | 'recordedBy'>) => {
      setState((prev) => {
        const flow = prev.flows[caseId]
        if (!flow) return prev
        return {
          ...prev,
          flows: {
            ...prev.flows,
            [caseId]: { ...flow, finalDecision: { ...input, at: new Date().toISOString(), recordedBy: actorId } },
          },
        }
      })
    },
    [actorId],
  )

  const createAdminAccount = useCallback(
    (input: { name: string; email: string; department: string }) => {
      setState((prev) => ({
        ...prev,
        admins: [
          ...prev.admins,
          { ...input, id: `u-padmin-${Date.now()}`, createdBy: actorId, createdAt: new Date().toISOString() },
        ],
      }))
      notify(
        ['posh_admin', 'super_admin'],
        null,
        'POSH Admin account provisioned',
        `${input.name} has been granted POSH Admin access by the Company Owner.`,
      )
    },
    [actorId, notify],
  )

  /**
   * Files a complaint and opens the corresponding flow at step one. The case object is
   * shaped exactly like a seeded one so every existing screen renders it without
   * knowing it was created five seconds ago.
   */
  const submitComplaint = useCallback(
    (input: NewComplaintInput): string => {
      const id = `POSH-2026-${String(200 + state.sessionCases.length).padStart(4, '0')}`
      const today = dateNDaysAgo(0)
      const complainantUser = USER_BY_ROLE.employee

      const record: Case = {
        id,
        stage: 'registered',
        filedDate: today,
        incidentDate: input.incidentDate || today,
        complainant: {
          id: `${id}-complainant`,
          maskedName: 'Complainant A',
          actualName: input.withholdNames ? 'Identity withheld' : complainantUser.name,
          gender: 'undisclosed',
          department: input.department || 'Not stated',
          location: input.location,
          role: 'complainant',
          designation: complainantUser.designation,
        },
        respondent: {
          id: `${id}-respondent`,
          maskedName: 'Respondent B',
          actualName: input.withholdNames ? 'Identity withheld' : input.respondentName || 'Not named',
          gender: 'undisclosed',
          department: input.department || 'Not stated',
          location: input.location,
          role: 'respondent',
          designation: 'Not stated',
        },
        assignedIC: [],
        location: input.location,
        department: input.department || 'Not stated',
        priority: 'High',
        milestones: {
          noticeDue: today,
          noticeServedOn: null,
          replyDue: today,
          replyReceivedOn: null,
          inquiryDue: today,
          inquiryCompletedOn: null,
          reportDue: null,
          reportSubmittedOn: null,
          actionDue: null,
          actionTakenOn: null,
          appealWindowEnds: null,
        },
        daysElapsed: 0,
        daysRemaining: 90,
        isBreached: false,
        breachReason: null,
        conciliationRequested: input.conciliationRequested,
        summary: input.narrative.slice(0, 240),
        raisedBy: 'employee',
      }

      const flow: CaseFlow = {
        caseId: id,
        stage: 'complaint_submitted',
        history: [
          {
            id: `${id}-h0`,
            stage: 'complaint_submitted',
            actorId,
            actorName,
            actorRole,
            at: new Date().toISOString(),
            remarks: 'Complaint filed through the in-app form.',
          },
        ],
        committeeId: null,
        acceptedBy: [],
        declinedBy: [],
        evidence: input.files.map((f, i) => ({
          id: `${id}-ev${i}`,
          label: f.name,
          note: `Attached at filing · ${f.sizeKb} KB`,
          uploadedBy: actorId,
          uploadedAt: new Date().toISOString(),
          supplementary: false,
          status: 'Pending verification' as const,
        })),
        evidenceRequests: [],
        hearings: [],
        recommendations: [],
        finalDecision: null,
        feedback: null,
        advisoryNotes: [],
        packExports: [],
        documents: [],
        minutes: [],
        raisedInSession: true,
      }

      setState((prev) => ({
        ...prev,
        sessionCases: [record, ...prev.sessionCases],
        flows: { ...prev.flows, [id]: flow },
        notifications: [
          {
            id: `n-${Date.now()}`,
            audience: ['posh_admin', 'super_admin'],
            caseId: id,
            title: `${id} — complaint submitted`,
            detail: 'A new complaint has been filed and is awaiting screening.',
            at: new Date().toISOString(),
            read: false,
          },
          ...prev.notifications,
        ],
      }))

      return id
    },
    [state.sessionCases.length, actorId, actorName, actorRole],
  )

  const addAdvisoryNote = useCallback(
    (caseId: string, text: string, concern: boolean) => {
      setState((prev) => {
        const flow = prev.flows[caseId]
        if (!flow) return prev
        const note = {
          id: `${caseId}-adv-${Date.now()}`,
          author: actorName,
          authorRole: actorRole,
          authorId: actorId,
          at: new Date().toISOString(),
          text,
          concern,
        }
        return {
          ...prev,
          flows: { ...prev.flows, [caseId]: { ...flow, advisoryNotes: [...flow.advisoryNotes, note] } },
        }
      })
      // A flagged concern is the one thing on this screen the panel must not miss.
      if (concern) {
        notify(
          ['posh_admin', 'super_admin', 'presiding_officer'],
          caseId,
          `${caseId} — concern raised by the External Member`,
          text.slice(0, 160),
        )
      }
    },
    [actorId, actorName, actorRole, notify],
  )

  /**
   * Records that a Defensibility Pack was generated.
   *
   * Not a notification — an entry on the case. A pack is a complete copy of a
   * confidential file leaving the system, and the record of who took one has to outlive
   * whoever was watching at the time.
   */
  const recordPackExport = useCallback(
    (caseId: string, meta: { rootHash: string; redacted: boolean; pages: number; recipient: string }) => {
      setState((prev) => {
        const flow = prev.flows[caseId]
        if (!flow) return prev
        const entry = {
          id: `${caseId}-pack-${Date.now()}`,
          at: new Date().toISOString(),
          actorId,
          actorName,
          actorRole,
          ...meta,
        }
        return {
          ...prev,
          flows: { ...prev.flows, [caseId]: { ...flow, packExports: [...(flow.packExports ?? []), entry] } },
        }
      })
    },
    [actorId, actorName, actorRole],
  )

  /* ------------------------------------------------------------------ *
   * Evidence
   * ------------------------------------------------------------------ */

  /** Appends a custody entry. Nothing in this store removes or edits one. */
  const appendCustody = useCallback(
    (caseId: string, evidenceId: string, action: CustodyAction, detail: string) => {
      setState((prev) => {
        const flow = prev.flows[caseId]
        if (!flow) return prev
        const entry: CustodyEntry = {
          id: `${evidenceId}-c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          at: new Date().toISOString(),
          actorId,
          actorName,
          actorRole,
          action,
          detail,
        }
        return {
          ...prev,
          flows: {
            ...prev.flows,
            [caseId]: {
              ...flow,
              evidence: flow.evidence.map((e) =>
                e.id === evidenceId ? { ...e, custody: [...(e.custody ?? []), entry] } : e,
              ),
            },
          },
        }
      })
    },
    [actorId, actorName, actorRole],
  )

  const logEvidenceAccess = appendCustody

  const setEvidenceState = useCallback(
    (caseId: string, evidenceId: string, nextState: EvidenceState, reason?: string) => {
      // A refusal without a recorded reason is the defect that gets an inquiry set
      // aside, so it is refused here rather than in a form somebody can bypass.
      const refusalReason = reason?.trim() ?? ''
      if (nextState === 'Not admitted' && !refusalReason) return
      setState((prev) => {
        const flow = prev.flows[caseId]
        if (!flow) return prev
        const admittedCount = flow.evidence.filter((e) => e.state === 'Admitted').length
        return {
          ...prev,
          flows: {
            ...prev.flows,
            [caseId]: {
              ...flow,
              evidence: flow.evidence.map((e) => {
                if (e.id !== evidenceId) return e
                // An exhibit number is the record's own citation, so it is issued once,
                // on admission, and not reissued if the item is later refused.
                const exhibitNo =
                  nextState === 'Admitted' && !e.exhibitNo
                    ? `E-${String(admittedCount + 1).padStart(2, '0')}`
                    : (e.exhibitNo ?? null)
                const entry: CustodyEntry = {
                  id: `${e.id}-c-${Date.now()}`,
                  at: new Date().toISOString(),
                  actorId,
                  actorName,
                  actorRole,
                  action: 'State changed',
                  detail:
                    nextState === 'Not admitted'
                      ? `Not admitted to the record. Reason: ${refusalReason}`
                      : `State set to ${nextState}.`,
                }
                return {
                  ...e,
                  state: nextState,
                  stateReason: nextState === 'Not admitted' ? refusalReason : null,
                  exhibitNo,
                  status: statusFor(nextState, e.superseded ?? false),
                  custody: [...(e.custody ?? []), entry],
                }
              }),
            },
          },
        }
      })
    },
    [actorId, actorName, actorRole],
  )

  const checkEvidenceIntegrity = useCallback(
    async (caseId: string, evidenceId: string) => {
      const item = state.flows[caseId]?.evidence.find((e) => e.id === evidenceId)
      if (!item) return null
      const result = await verifyIntegrity(item as never)
      appendCustody(
        caseId,
        evidenceId,
        'Integrity verified',
        result.ok
          ? 'Digest recomputed and matched the value recorded at intake.'
          : 'DIGEST MISMATCH - the item differs from the value recorded at intake.',
      )
      return result
    },
    [state.flows, appendCustody],
  )

  const uploadEvidence = useCallback(
    async (
      caseId: string,
      files: Array<{ name: string; sizeKb: number; mimeType: string; objectUrl?: string | null }>,
      opts?: { supplementary?: boolean; supersedesId?: string },
    ) => {
      const now = new Date().toISOString()
      // Hashed before it lands. A digest computed later is derived from the stored
      // record and therefore proves nothing about what actually arrived.
      const built = await Promise.all(
        files.map(async (f, i) => {
          const base = {
            id: `${caseId}-ev-${Date.now()}-${i}`,
            label: f.name,
            note: opts?.supersedesId
              ? 'Filed as a replacement for an earlier item.'
              : opts?.supplementary
                ? 'Filed in response to a committee request.'
                : 'Filed on the case.',
            uploadedBy: actorId,
            uploadedAt: now,
            supplementary: !!opts?.supplementary,
            sizeKb: f.sizeKb,
            mimeType: f.mimeType,
          }
          const hash = await computeHash(base as never)
          return upgradeEvidence({
            ...base,
            status: statusFor('Submitted', false),
            state: 'Submitted',
            stateReason: null,
            hash,
            uploadedByName: actorName,
            uploadedByRole: actorRole,
            exhibitNo: null,
            supersedes: opts?.supersedesId ?? null,
            superseded: false,
            version: 1,
            objectUrl: f.objectUrl ?? null,
            custody: [
              {
                id: `${base.id}-c0`,
                at: now,
                actorId,
                actorName,
                actorRole,
                action: 'Received' as CustodyAction,
                detail: `Received - ${f.sizeKb} KB. Digest fixed at intake.`,
              },
            ],
          })
        }),
      )

      setState((prev) => {
        const flow = prev.flows[caseId]
        if (!flow) return prev
        // A superseded item is never deleted; it stays, marked, with its own trail.
        const existing = flow.evidence.map((e) =>
          opts?.supersedesId && e.id === opts.supersedesId
            ? {
                ...e,
                superseded: true,
                status: 'Superseded' as const,
                custody: [
                  ...(e.custody ?? []),
                  {
                    id: `${e.id}-c-${Date.now()}`,
                    at: now,
                    actorId,
                    actorName,
                    actorRole,
                    action: 'Superseded' as CustodyAction,
                    detail: 'Replaced by a newer version. Retained on file.',
                  },
                ],
              }
            : e,
        )
        return { ...prev, flows: { ...prev.flows, [caseId]: { ...flow, evidence: [...existing, ...built] } } }
      })
    },
    [actorId, actorName, actorRole],
  )

  /* ------------------------------------------------------------------ *
   * Documents and minutes
   * ------------------------------------------------------------------ */

  const fileDocument = useCallback(
    async (
      caseId: string,
      doc: { templateId: string; title: string; audience: string; body: string; values: Record<string, string> },
    ) => {
      const now = new Date().toISOString()
      const id = `${caseId}-doc-${Date.now()}`
      // Hashed on filing, like evidence, so an issued notice can be shown to be the one
      // that was actually sent rather than a later reconstruction of it.
      const hash = await hashOf({ templateId: doc.templateId, body: doc.body, createdAt: now, createdBy: actorId })
      const entry: GeneratedDocument = {
        id,
        ...doc,
        hash,
        createdAt: now,
        createdBy: actorId,
        createdByName: actorName,
        createdByRole: actorRole,
        issuedAt: null,
        issuedTo: null,
        channel: null,
        acknowledged: false,
        custody: [
          {
            id: `${id}-c0`,
            at: now,
            actorId,
            actorName,
            actorRole,
            action: 'Received',
            detail: `Generated from the ${doc.title} template and filed in the vault.`,
          },
        ],
      }
      setState((prev) => {
        const flow = prev.flows[caseId]
        if (!flow) return prev
        return {
          ...prev,
          flows: { ...prev.flows, [caseId]: { ...flow, documents: [...(flow.documents ?? []), entry] } },
        }
      })
      return id
    },
    [actorId, actorName, actorRole],
  )

  const issueDocument = useCallback(
    (caseId: string, documentId: string, to: string, channel: 'Email' | 'Letter' | 'Portal notice' | 'In person') => {
      const now = new Date().toISOString()
      setState((prev) => {
        const flow = prev.flows[caseId]
        if (!flow) return prev
        return {
          ...prev,
          flows: {
            ...prev.flows,
            [caseId]: {
              ...flow,
              documents: (flow.documents ?? []).map((d) =>
                d.id === documentId
                  ? {
                      ...d,
                      issuedAt: now,
                      issuedTo: to,
                      channel,
                      custody: [
                        ...d.custody,
                        {
                          id: `${d.id}-c-${Date.now()}`,
                          at: now,
                          actorId,
                          actorName,
                          actorRole,
                          action: 'State changed' as CustodyAction,
                          detail: `Issued to ${to} by ${channel.toLowerCase()}.`,
                        },
                      ],
                    }
                  : d,
              ),
            },
          },
        }
      })
    },
    [actorId, actorName, actorRole],
  )

  const saveMinutes = useCallback((caseId: string, minutes: HearingMinutes) => {
    setState((prev) => {
      const flow = prev.flows[caseId]
      if (!flow) return prev
      const list = flow.minutes ?? []
      const existing = list.find((m) => m.id === minutes.id)
      // Finalised minutes are immutable. A save against one is dropped rather than
      // silently rewriting a record the committee has already signed off.
      if (existing?.status === 'Final') return prev
      const next = { ...minutes, updatedAt: new Date().toISOString() }
      return {
        ...prev,
        flows: {
          ...prev.flows,
          [caseId]: {
            ...flow,
            minutes: existing ? list.map((m) => (m.id === next.id ? next : m)) : [...list, next],
          },
        },
      }
    })
  }, [])

  const finaliseMinutes = useCallback(
    async (caseId: string, minutesId: string) => {
      const target = state.flows[caseId]?.minutes?.find((m) => m.id === minutesId)
      if (!target || target.status === 'Final') return
      const now = new Date().toISOString()
      const hash = await hashOf({
        sections: target.sections,
        present: target.present,
        hearingId: target.hearingId,
        version: target.version,
      })
      setState((prev) => {
        const flow = prev.flows[caseId]
        if (!flow) return prev
        return {
          ...prev,
          flows: {
            ...prev.flows,
            [caseId]: {
              ...flow,
              minutes: (flow.minutes ?? []).map((m) =>
                m.id === minutesId
                  ? { ...m, status: 'Final' as const, finalisedAt: now, finalisedBy: actorName, hash }
                  : m,
              ),
            },
          },
        }
      })
    },
    [state.flows, actorName],
  )

  const reviseMinutes = useCallback(
    (caseId: string, minutesId: string) => {
      const source = state.flows[caseId]?.minutes?.find((m) => m.id === minutesId)
      if (!source) return null
      const id = `${caseId}-min-${Date.now()}`
      const now = new Date().toISOString()
      // The finalised version is kept. This is a new draft that supersedes it.
      const next: HearingMinutes = {
        ...source,
        id,
        version: source.version + 1,
        status: 'Draft',
        createdAt: now,
        updatedAt: now,
        finalisedAt: null,
        finalisedBy: null,
        hash: null,
        confirmations: [],
        circulatedAt: null,
        supersedes: source.id,
      }
      setState((prev) => {
        const flow = prev.flows[caseId]
        if (!flow) return prev
        return { ...prev, flows: { ...prev.flows, [caseId]: { ...flow, minutes: [...(flow.minutes ?? []), next] } } }
      })
      return id
    },
    [state.flows],
  )

  const circulateMinutes = useCallback(
    (caseId: string, minutesId: string) => {
      const now = new Date().toISOString()
      setState((prev) => {
        const flow = prev.flows[caseId]
        if (!flow) return prev
        return {
          ...prev,
          flows: {
            ...prev.flows,
            [caseId]: {
              ...flow,
              minutes: (flow.minutes ?? []).map((m) => (m.id === minutesId ? { ...m, circulatedAt: now } : m)),
            },
          },
        }
      })
      notify(
        ['presiding_officer', 'ic_member', 'external_member'],
        caseId,
        `${caseId} - minutes circulated for confirmation`,
        'Minutes of a sitting have been circulated. Confirm they are an accurate record.',
      )
    },
    [notify],
  )

  const confirmMinutes = useCallback(
    (caseId: string, minutesId: string, confirmed: boolean) => {
      const now = new Date().toISOString()
      setState((prev) => {
        const flow = prev.flows[caseId]
        if (!flow) return prev
        return {
          ...prev,
          flows: {
            ...prev.flows,
            [caseId]: {
              ...flow,
              minutes: (flow.minutes ?? []).map((m) =>
                m.id === minutesId
                  ? {
                      ...m,
                      confirmations: [
                        ...m.confirmations.filter((c) => c.memberId !== actorId),
                        { memberId: actorId, at: now, confirmed },
                      ],
                    }
                  : m,
              ),
            },
          },
        }
      })
    },
    [actorId],
  )

  const markNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        currentRole && n.audience.includes(currentRole) ? { ...n, read: true } : n,
      ),
    }))
  }, [currentRole])

  const resetWorkflow = useCallback(() => {
    setState(seedState())
  }, [])

  const myNotifications = useMemo(
    () => (currentRole ? state.notifications.filter((n) => n.audience.includes(currentRole)) : []),
    [state.notifications, currentRole],
  )

  const value = useMemo<WorkflowState>(
    () => ({
      allCases,
      visibleCases,
      myAssignedCases,
      caseById: (id) => (id ? caseIndex.get(id) : undefined),
      flowFor: (caseId) => state.flows[caseId],
      committees: state.committees,
      committeeById: (id) => (id ? state.committees.find((c) => c.id === id) : undefined),
      admins: state.admins,
      notifications: state.notifications,
      myNotifications,
      unreadCount: myNotifications.filter((n) => !n.read).length,
      availableActions,
      runAction,
      createCommittee,
      assignCommittee,
      addEvidence,
      scheduleHearing,
      addRecommendation,
      recordDecision,
      createAdminAccount,
      addAdvisoryNote,
      recordPackExport,
      setEvidenceState,
      logEvidenceAccess,
      checkEvidenceIntegrity,
      uploadEvidence,
      fileDocument,
      issueDocument,
      saveMinutes,
      finaliseMinutes,
      reviseMinutes,
      circulateMinutes,
      confirmMinutes,
      submitComplaint,
      markNotificationsRead,
      resetWorkflow,
    }),
    [
      allCases,
      visibleCases,
      myAssignedCases,
      caseIndex,
      state.flows,
      state.committees,
      state.admins,
      state.notifications,
      myNotifications,
      availableActions,
      runAction,
      createCommittee,
      assignCommittee,
      addEvidence,
      scheduleHearing,
      addRecommendation,
      recordDecision,
      createAdminAccount,
      addAdvisoryNote,
      recordPackExport,
      setEvidenceState,
      logEvidenceAccess,
      checkEvidenceIntegrity,
      uploadEvidence,
      fileDocument,
      issueDocument,
      saveMinutes,
      finaliseMinutes,
      reviseMinutes,
      circulateMinutes,
      confirmMinutes,
      submitComplaint,
      markNotificationsRead,
      resetWorkflow,
    ],
  )

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>
}

export function useWorkflow() {
  const ctx = useContext(WorkflowContext)
  if (!ctx) throw new Error('useWorkflow must be used within WorkflowProvider')
  return ctx
}
