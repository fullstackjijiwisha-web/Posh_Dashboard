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

  const evidence: FlowEvidenceItem[] = [
    {
      id: `${record.id}-ev1`,
      label: 'Complaint annexure — written account',
      note: 'Filed with the original complaint.',
      uploadedBy: 'u-emp',
      uploadedAt: ts(record.daysElapsed),
      supplementary: false,
      status: past('evidence_verified') ? 'Verified' : 'Pending verification',
    },
    {
      id: `${record.id}-ev2`,
      label: 'Message log export',
      note: 'Exported from the corporate messaging archive.',
      uploadedBy: 'u-emp',
      uploadedAt: ts(record.daysElapsed - 1),
      supplementary: false,
      status: past('evidence_verified') ? 'Verified' : 'Pending verification',
    },
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
  submitComplaint: (input: NewComplaintInput) => string
  markNotificationsRead: () => void
  resetWorkflow: () => void
}

const WorkflowContext = createContext<WorkflowState | null>(null)

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const { currentRole, currentUser } = useRole()
  const [state, setState] = useState<Persisted>(loadState)

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
