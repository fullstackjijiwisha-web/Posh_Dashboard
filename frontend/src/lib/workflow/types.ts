/**
 * Sentinel case lifecycle — the workflow layer.
 *
 * The statutory model in `lib/data/types.ts` describes where a case sits against the
 * PoSH Act's clocks. This file describes something different and complementary: who is
 * holding the case right now, and what they are allowed to do next.
 *
 * The two are deliberately separate. `CaseStage` answers "is the 90-day inquiry window
 * still running"; `WorkflowStage` answers "is the committee waiting on the complainant,
 * or is the administrator waiting on the committee". A case can sit at `inquiry` for
 * weeks while moving through six workflow stages inside it.
 *
 * The ladder below is the operational lifecycle, end to end:
 *
 *   Employee            submits, uploads evidence, reads the decision, gives feedback
 *   POSH Admin          screens intake, opens the docket, assigns the board,
 *                       audits the recommendation, records the decision, closes, archives
 *   Internal Committee  accepts assignment, investigates, reviews evidence,
 *                       hears the parties, recommends
 *   Company Owner       the `super_admin` role — owner and super administrator are one
 *                       panel here. It stands outside the case: it provisions POSH Admin
 *                       accounts and oversees, but does not adjudicate.
 */

import type { Role } from '../data/types'
import type { CustodyEntry, EvidenceState } from '../evidence/model'

/* ------------------------------------------------------------------ *
 * Stages
 * ------------------------------------------------------------------ */

export type WorkflowStage =
  | 'complaint_submitted'
  | 'complaint_under_review'
  | 'complaint_rejected'
  | 'complaint_accepted'
  | 'case_created'
  | 'committee_assigned'
  | 'committee_accepted'
  | 'investigation_started'
  | 'evidence_review'
  | 'evidence_more_requested'
  | 'evidence_resubmitted'
  | 'evidence_verified'
  | 'hearing_scheduled'
  | 'hearing_completed'
  | 'minutes_recorded'
  | 'recommendation_submitted'
  | 'recommendation_review'
  | 'recommendation_returned'
  | 'recommendation_resubmitted'
  | 'recommendation_approved'
  | 'recommendation_rejected'
  | 'final_decision_recorded'
  | 'case_closed'
  | 'employee_notified'
  | 'decision_viewed'
  | 'feedback_submitted'
  | 'case_archived'

/** Which party is holding the case at a given stage. Drives the lane colouring. */
export type Lane = 'employee' | 'admin' | 'committee' | 'system' | 'terminal'

export interface StageMeta {
  label: string
  /** One line, written for the person waiting on it — not for a developer. */
  description: string
  lane: Lane
  /** Position on the happy path, used by the tracker. Off-path stages reuse the
   *  index of the step they branch from so the tracker never jumps backwards. */
  step: number
}

export const STAGE_META: Record<WorkflowStage, StageMeta> = {
  complaint_submitted: {
    label: 'Complaint Submitted',
    description: 'The complainant has filed. Awaiting administrative screening.',
    lane: 'employee',
    step: 1,
  },
  complaint_under_review: {
    label: 'Complaint Under Review',
    description: 'The POSH Admin is screening the complaint for admissibility.',
    lane: 'admin',
    step: 2,
  },
  complaint_rejected: {
    label: 'Complaint Rejected',
    description: 'Not admitted for formal inquiry. The workflow ends here.',
    lane: 'terminal',
    step: 2,
  },
  complaint_accepted: {
    label: 'Complaint Accepted',
    description: 'Admitted. A statutory case docket will now be opened.',
    lane: 'admin',
    step: 3,
  },
  case_created: {
    label: 'Case Created',
    description: 'Docket opened. Awaiting assignment of an Internal Committee.',
    lane: 'admin',
    step: 4,
  },
  committee_assigned: {
    label: 'Committee Assigned',
    description: 'A board has been nominated. Awaiting acceptance by its members.',
    lane: 'admin',
    step: 5,
  },
  committee_accepted: {
    label: 'Committee Accepted',
    description: 'The committee has taken carriage of the case.',
    lane: 'committee',
    step: 6,
  },
  investigation_started: {
    label: 'Investigation Started',
    description: 'The inquiry is under way. The s.11(4) clock is running.',
    lane: 'committee',
    step: 7,
  },
  evidence_review: {
    label: 'Evidence Review',
    description: 'The committee is examining the material on record.',
    lane: 'committee',
    step: 8,
  },
  evidence_more_requested: {
    label: 'Additional Evidence Requested',
    description: 'The committee has asked the complainant for further material.',
    lane: 'employee',
    step: 8,
  },
  evidence_resubmitted: {
    label: 'Additional Evidence Uploaded',
    description: 'Further material received. Back with the committee for review.',
    lane: 'committee',
    step: 8,
  },
  evidence_verified: {
    label: 'Evidence Verified',
    description: 'Material admitted to the record. A hearing may now be listed.',
    lane: 'committee',
    step: 9,
  },
  hearing_scheduled: {
    label: 'Hearing Scheduled',
    description: 'A sitting has been listed and notice issued to the parties.',
    lane: 'committee',
    step: 10,
  },
  hearing_completed: {
    label: 'Hearing Completed',
    description: 'The sitting has concluded. Minutes are to be recorded.',
    lane: 'committee',
    step: 11,
  },
  minutes_recorded: {
    label: 'Minutes Recorded',
    description: 'Proceedings minuted. The committee may now recommend.',
    lane: 'committee',
    step: 12,
  },
  recommendation_submitted: {
    label: 'Recommendation Submitted',
    description: 'The committee report is with the POSH Admin for audit.',
    lane: 'committee',
    step: 13,
  },
  recommendation_review: {
    label: 'Recommendation Review',
    description: 'The POSH Admin is auditing the committee’s findings.',
    lane: 'admin',
    step: 14,
  },
  recommendation_returned: {
    label: 'Returned for Modification',
    description: 'Sent back to the committee with observations to address.',
    lane: 'committee',
    step: 14,
  },
  recommendation_resubmitted: {
    label: 'Recommendation Resubmitted',
    description: 'The revised report is back with the POSH Admin.',
    lane: 'admin',
    step: 14,
  },
  recommendation_rejected: {
    label: 'Recommendation Rejected',
    description: 'The recommendation was not accepted. The workflow ends here.',
    lane: 'terminal',
    step: 14,
  },
  recommendation_approved: {
    label: 'Recommendation Approved',
    description: 'Findings accepted. The employer decision is to be recorded.',
    lane: 'admin',
    step: 15,
  },
  final_decision_recorded: {
    label: 'Final Decision Recorded',
    description: 'Action under s.13(3) recorded against the case.',
    lane: 'admin',
    step: 16,
  },
  case_closed: {
    label: 'Case Closed',
    description: 'The docket is closed. The complainant is to be notified.',
    lane: 'admin',
    step: 17,
  },
  employee_notified: {
    label: 'Employee Notified',
    description: 'Outcome notice issued to the complainant.',
    lane: 'system',
    step: 18,
  },
  decision_viewed: {
    label: 'Final Decision Viewed',
    description: 'The complainant has read the outcome.',
    lane: 'employee',
    step: 19,
  },
  feedback_submitted: {
    label: 'Feedback Submitted',
    description: 'The complainant has given process feedback.',
    lane: 'employee',
    step: 20,
  },
  case_archived: {
    label: 'Case Archived',
    description: 'Sealed under the retention policy. No further action.',
    lane: 'terminal',
    step: 21,
  },
}

/** The happy path, in order. Branches are reachable but not listed here. */
export const HAPPY_PATH: WorkflowStage[] = [
  'complaint_submitted',
  'complaint_under_review',
  'complaint_accepted',
  'case_created',
  'committee_assigned',
  'committee_accepted',
  'investigation_started',
  'evidence_review',
  'evidence_verified',
  'hearing_scheduled',
  'hearing_completed',
  'minutes_recorded',
  'recommendation_submitted',
  'recommendation_review',
  'recommendation_approved',
  'final_decision_recorded',
  'case_closed',
  'employee_notified',
  'decision_viewed',
  'feedback_submitted',
  'case_archived',
]

export const TOTAL_STEPS = HAPPY_PATH.length

/** Stages from which nothing further can happen. */
export const TERMINAL_WORKFLOW_STAGES: WorkflowStage[] = [
  'complaint_rejected',
  'recommendation_rejected',
  'case_archived',
]

export const isWorkflowTerminal = (s: WorkflowStage) => TERMINAL_WORKFLOW_STAGES.includes(s)

/* ------------------------------------------------------------------ *
 * Records attached to a flow
 * ------------------------------------------------------------------ */

export interface FlowEvent {
  id: string
  stage: WorkflowStage
  /** Role that performed the transition, as a label. */
  actorRole: string
  actorName: string
  actorId: string
  at: string
  remarks: string
}

export interface FlowEvidenceItem {
  id: string
  label: string
  note: string
  uploadedBy: string
  uploadedAt: string
  /** Supplementary items are those filed after a committee request for more. */
  supplementary: boolean
  /**
   * Legacy display status, kept so the eleven screens that read it keep working.
   * `state` below is the source of truth; the store keeps this in sync whenever the
   * state changes, in one place, so the two cannot drift.
   */
  status: 'Pending verification' | 'Verified' | 'Superseded'

  /* --- Added in Phase 5. Optional so snapshots written before it still load; the
     store's normaliser fills them on read, so components can rely on them. --- */

  /** Admission state under s.11. The real one. */
  state?: EvidenceState
  /** Required whenever the state is 'Not admitted'. */
  stateReason?: string | null
  /**
   * SHA-256 fixed at intake and never recomputed. Verification compares against it —
   * a digest derived from the record at the moment you check it proves nothing.
   */
  hash?: string
  sizeKb?: number
  mimeType?: string
  uploadedByName?: string
  uploadedByRole?: string
  /** Exhibit number, assigned only on admission to the record. */
  exhibitNo?: string | null
  /** Append-only. Nothing in the store edits or removes an entry. */
  custody?: CustodyEntry[]
  /** Id of the item this replaces. The superseded item stays on file. */
  supersedes?: string | null
  superseded?: boolean
  version?: number
  /** Object URL for a file uploaded this session, so it can be previewed. */
  objectUrl?: string | null
}

export interface EvidenceRequest {
  id: string
  requestedBy: string
  requestedAt: string
  detail: string
  fulfilledAt: string | null
}

export interface FlowHearing {
  id: string
  at: string
  mode: 'In person' | 'Video conference'
  location: string
  agenda: string
  scheduledBy: string
  status: 'Scheduled' | 'Completed'
  minutes: string | null
}

export interface FlowRecommendation {
  id: string
  author: string
  authorRole: string
  at: string
  finding: string
  recommendedAction: string
  provision: string
  /** Set when an earlier version was returned and this one supersedes it. */
  revisionOf: string | null
  status: 'Under review' | 'Approved' | 'Returned' | 'Rejected'
  reviewNote: string | null
}

export interface FinalDecision {
  at: string
  recordedBy: string
  outcome: 'Upheld' | 'Upheld in part' | 'Not substantiated'
  action: string
  note: string
}

export interface ProcessFeedback {
  at: string
  rating: number
  comment: string
}

/**
 * An independent observation recorded against a case by a committee member — in
 * practice almost always the External Member.
 *
 * It is deliberately not a recommendation. s.4(2)(c) puts an outsider on the panel so
 * that the inquiry is not wholly internal, and the value of that seat is lost if the
 * only thing the outsider can do is co-sign the majority. An advisory note is on the
 * record, is visible to the panel and the administrator, and does not move the case.
 */
export interface AdvisoryNote {
  id: string
  author: string
  authorRole: string
  authorId: string
  at: string
  text: string
  /** Set when the member is flagging a concern rather than offering guidance. */
  concern: boolean
}

export interface Committee {
  id: string
  name: string
  /** User ids from the IC roster. */
  memberIds: string[]
  presidingOfficerId: string
  createdBy: string
  createdAt: string
  active: boolean
}

/** A POSH Admin account provisioned by the Company Owner. */
export interface AdminAccount {
  id: string
  name: string
  email: string
  department: string
  createdBy: string
  createdAt: string
}

/**
 * A notice addressed to one or more roles.
 *
 * `type` and `severity` drive the notification centre's filters and styling.
 * `href` deep-links to the exact thing concerned — a case tab, a sitting, a queue —
 * rather than dumping the reader on a list to hunt through.
 */
export type FlowNotificationType =
  | 'clock_approaching'
  | 'clock_breached'
  | 'sitting_listed'
  | 'sitting_at_risk'
  | 'evidence_submitted'
  | 'recommendation_awaiting'
  | 'report_owed'
  | 'escalation'
  | 'lifecycle'

export type FlowNotificationSeverity = 'critical' | 'warning' | 'info'

export interface FlowNotification {
  id: string
  /** Role the notice is addressed to. */
  audience: Role[]
  caseId: string | null
  title: string
  detail: string
  at: string
  read: boolean
  type: FlowNotificationType
  severity: FlowNotificationSeverity
  /** Deep link. Falls back to `/cases/{caseId}` when null and a case is present. */
  href: string | null
  /**
   * Set when this notice was raised because an earlier one went unanswered past the
   * escalation interval. Points at the originating notice.
   */
  escalatedFrom?: string | null
}

/**
 * A Defensibility Pack that was generated.
 *
 * Recorded because generating a complete copy of a confidential case file is itself a
 * disclosure event — arguably the most significant one in the product. A later pack's
 * access log shows the earlier export, which is what makes "who has seen this case"
 * answerable rather than merely claimed.
 */
export interface PackExport {
  id: string
  at: string
  actorId: string
  actorName: string
  actorRole: string
  /** Root digest of the pack that was produced. */
  rootHash: string
  redacted: boolean
  pages: number
  recipient: string
}


/**
 * A document generated from a template and filed on the case.
 *
 * Carries the same custody metadata as evidence, and for the same reason: a notice is
 * the thing a party will later say they never received, so who issued it, when, and to
 * whom has to survive the argument.
 */
export interface GeneratedDocument {
  id: string
  templateId: string
  title: string
  audience: string
  /** The rendered letter, as issued. */
  body: string
  /** Merge values the sender supplied, kept so the document can be explained. */
  values: Record<string, string>
  hash: string
  createdAt: string
  createdBy: string
  createdByName: string
  createdByRole: string
  /** Set once the document has actually been sent, not merely drafted. */
  issuedAt: string | null
  issuedTo: string | null
  channel: 'Email' | 'Letter' | 'Portal notice' | 'In person' | null
  acknowledged: boolean
  custody: CustodyEntry[]
}

/** A single attributed line in the minutes. */
export interface MinuteLine {
  id: string
  /** Who spoke. A minute without attribution is not evidence of who said what. */
  speaker: string
  speakerRole: string
  text: string
  /** True when captured by the transcription stub and not yet confirmed by a human. */
  machineCaptured?: boolean
}

export interface MinutesSection {
  id: string
  heading: string
  /** Free prose for narrative sections. */
  body: string
  /** Attributed lines for submissions and questions. */
  lines: MinuteLine[]
}

/**
 * Minutes of a sitting.
 *
 * Finalising locks them. A later change does not edit the locked version — it creates a
 * new one and keeps the old, because the version the committee signed off is the version
 * that matters if the finding is challenged.
 */
export interface HearingMinutes {
  id: string
  caseId: string
  hearingId: string
  version: number
  status: 'Draft' | 'Final'
  sections: MinutesSection[]
  present: string[]
  apologies: string[]
  quorumMet: boolean
  createdAt: string
  updatedAt: string
  finalisedAt: string | null
  finalisedBy: string | null
  hash: string | null
  /** Sign-off per member once circulated. */
  confirmations: Array<{ memberId: string; at: string; confirmed: boolean }>
  circulatedAt: string | null
  /** Id of the version this supersedes. */
  supersedes: string | null
}

/** Everything the workflow layer knows about one case. */
export interface CaseFlow {
  caseId: string
  stage: WorkflowStage
  history: FlowEvent[]
  committeeId: string | null
  acceptedBy: string[]
  declinedBy: string[]
  evidence: FlowEvidenceItem[]
  evidenceRequests: EvidenceRequest[]
  hearings: FlowHearing[]
  recommendations: FlowRecommendation[]
  finalDecision: FinalDecision | null
  feedback: ProcessFeedback | null
  advisoryNotes: AdvisoryNote[]
  packExports: PackExport[]
  documents: GeneratedDocument[]
  minutes: HearingMinutes[]
  /** True for cases raised through the in-app complaint form during this session. */
  raisedInSession: boolean
}
