/**
 * The transition table.
 *
 * This is the single place that decides what may happen next and who may do it. No
 * screen decides on its own whether to show a button — every action panel in the app
 * asks `actionsFor(stage, role)` and renders whatever comes back. Add a transition here
 * and it appears in the workspace, the committee console and the complainant's tracker
 * at once; gate it here and it disappears from all three.
 *
 * Role gating is by list rather than by permission flag because these are not
 * capabilities, they are custodies: "the committee may verify evidence" is a statement
 * about whose hands the case is in at that moment, not about a privilege level. The
 * super administrator is the one exception — see SUPER_ROLE below.
 */

import type { Role } from '../data/types'
import type { WorkflowStage } from './types'

/** Everyone on the Internal Committee, whatever their seat. */
export const COMMITTEE_ROLES: Role[] = ['presiding_officer', 'ic_member', 'external_member']

/**
 * Owner and super administrator are the same panel. It may drive any transition —
 * not because that is good governance, but because a demo needs one persona that can
 * walk the whole ladder without four sign-ins. It is excluded from `primaryActor`
 * so the lane colouring still shows whose step it properly is.
 */
export const SUPER_ROLE: Role = 'super_admin'

export type ActionIntent = 'primary' | 'neutral' | 'danger'

export interface WorkflowTransition {
  id: string
  /** Button label. Written as the instruction, not the outcome. */
  label: string
  from: WorkflowStage
  to: WorkflowStage
  /** Roles that may drive this transition, excluding the super administrator. */
  roles: Role[]
  intent: ActionIntent
  /** Line written into the case history when the transition fires. */
  remark: string
  /** Prompts for a free-text note before firing. */
  requiresNote?: boolean
  noteLabel?: string
  /** Blocks the action until the named precondition is met. */
  requires?: 'committee' | 'acceptance' | 'evidence' | 'hearing' | 'minutes' | 'recommendation'
}

export const TRANSITIONS: WorkflowTransition[] = [
  /* ---- Intake: the complainant files, the administrator screens ---- */
  {
    id: 'start-review',
    label: 'Start complaint review',
    from: 'complaint_submitted',
    to: 'complaint_under_review',
    roles: ['posh_admin'],
    intent: 'primary',
    remark: 'Complaint taken up for compliance screening.',
  },
  {
    id: 'accept-complaint',
    label: 'Accept complaint',
    from: 'complaint_under_review',
    to: 'complaint_accepted',
    roles: ['posh_admin'],
    intent: 'primary',
    remark: 'Complaint admitted for formal inquiry.',
  },
  {
    id: 'reject-complaint',
    label: 'Reject complaint',
    from: 'complaint_under_review',
    to: 'complaint_rejected',
    roles: ['posh_admin'],
    intent: 'danger',
    remark: 'Complaint not admitted.',
    requiresNote: true,
    noteLabel: 'Reason for rejection — recorded and disclosed to the complainant',
  },

  /* ---- Docket and board ---- */
  {
    id: 'create-case',
    label: 'Create case docket',
    from: 'complaint_accepted',
    to: 'case_created',
    roles: ['posh_admin'],
    intent: 'primary',
    remark: 'Statutory case docket opened.',
  },
  {
    id: 'assign-committee',
    label: 'Assign committee',
    from: 'case_created',
    to: 'committee_assigned',
    roles: ['posh_admin'],
    intent: 'primary',
    remark: 'Internal Committee nominated to the case.',
    requires: 'committee',
  },
  {
    id: 'accept-assignment',
    label: 'Accept assignment',
    from: 'committee_assigned',
    to: 'committee_accepted',
    roles: COMMITTEE_ROLES,
    intent: 'primary',
    remark: 'Committee accepted carriage of the case.',
  },
  {
    id: 'decline-assignment',
    label: 'Decline assignment',
    from: 'committee_assigned',
    to: 'case_created',
    roles: COMMITTEE_ROLES,
    intent: 'danger',
    remark: 'Assignment declined; the case returns for reassignment.',
    requiresNote: true,
    noteLabel: 'Grounds for declining — conflict of interest, availability, or other',
  },

  /* ---- Inquiry ---- */
  {
    id: 'start-investigation',
    label: 'Start investigation',
    from: 'committee_accepted',
    to: 'investigation_started',
    roles: COMMITTEE_ROLES,
    intent: 'primary',
    remark: 'Inquiry proceedings initiated.',
  },
  {
    id: 'start-evidence-review',
    label: 'Start evidence review',
    from: 'investigation_started',
    to: 'evidence_review',
    roles: COMMITTEE_ROLES,
    intent: 'primary',
    remark: 'Evidence review opened.',
  },
  {
    id: 'request-evidence',
    label: 'Request more evidence',
    from: 'evidence_review',
    to: 'evidence_more_requested',
    roles: COMMITTEE_ROLES,
    intent: 'neutral',
    remark: 'Further material sought from the complainant.',
    requiresNote: true,
    noteLabel: 'What the committee needs',
  },
  {
    id: 'upload-supplementary',
    label: 'Upload additional evidence',
    from: 'evidence_more_requested',
    to: 'evidence_resubmitted',
    roles: ['employee'],
    intent: 'primary',
    remark: 'Supplementary material filed by the complainant.',
    requiresNote: true,
    noteLabel: 'Describe what you are filing',
  },
  {
    id: 'resume-evidence-review',
    label: 'Resume evidence review',
    from: 'evidence_resubmitted',
    to: 'evidence_review',
    roles: COMMITTEE_ROLES,
    intent: 'primary',
    remark: 'Supplementary material taken on record.',
  },
  {
    id: 'verify-evidence',
    label: 'Approve and verify evidence',
    from: 'evidence_review',
    to: 'evidence_verified',
    roles: COMMITTEE_ROLES,
    intent: 'primary',
    remark: 'Evidence admitted to the record.',
    requires: 'evidence',
  },

  /* ---- Hearings ---- */
  {
    id: 'schedule-hearing',
    label: 'Schedule hearing',
    from: 'evidence_verified',
    to: 'hearing_scheduled',
    roles: COMMITTEE_ROLES,
    intent: 'primary',
    remark: 'Hearing listed and notice issued.',
    requires: 'hearing',
  },
  {
    id: 'conduct-hearing',
    label: 'Conduct hearing',
    from: 'hearing_scheduled',
    to: 'hearing_completed',
    roles: COMMITTEE_ROLES,
    intent: 'primary',
    remark: 'Hearing held; parties heard.',
  },
  {
    id: 'record-minutes',
    label: 'Record hearing minutes',
    from: 'hearing_completed',
    to: 'minutes_recorded',
    roles: COMMITTEE_ROLES,
    intent: 'primary',
    remark: 'Minutes of the sitting registered.',
    requiresNote: true,
    noteLabel: 'Minutes summary',
  },

  /* ---- Recommendation and audit ---- */
  {
    id: 'submit-recommendation',
    label: 'Submit recommendation',
    from: 'minutes_recorded',
    to: 'recommendation_submitted',
    roles: COMMITTEE_ROLES,
    intent: 'primary',
    remark: 'Committee report submitted to the POSH Admin.',
    requires: 'recommendation',
  },
  {
    id: 'start-recommendation-review',
    label: 'Start recommendation review',
    from: 'recommendation_submitted',
    to: 'recommendation_review',
    roles: ['posh_admin'],
    intent: 'primary',
    remark: 'Recommendation audit opened.',
  },
  {
    id: 'approve-recommendation',
    label: 'Approve recommendation',
    from: 'recommendation_review',
    to: 'recommendation_approved',
    roles: ['posh_admin'],
    intent: 'primary',
    remark: 'Committee findings accepted.',
  },
  {
    id: 'return-recommendation',
    label: 'Return for modification',
    from: 'recommendation_review',
    to: 'recommendation_returned',
    roles: ['posh_admin'],
    intent: 'neutral',
    remark: 'Report returned to the committee with observations.',
    requiresNote: true,
    noteLabel: 'Observations the committee must address',
  },
  {
    id: 'reject-recommendation',
    label: 'Reject recommendation',
    from: 'recommendation_review',
    to: 'recommendation_rejected',
    roles: ['posh_admin'],
    intent: 'danger',
    remark: 'Recommendation rejected.',
    requiresNote: true,
    noteLabel: 'Grounds for rejection',
  },
  {
    id: 'resubmit-recommendation',
    label: 'Resubmit revised recommendation',
    from: 'recommendation_returned',
    to: 'recommendation_resubmitted',
    roles: COMMITTEE_ROLES,
    intent: 'primary',
    remark: 'Revised report resubmitted for audit.',
    requiresNote: true,
    noteLabel: 'What changed in this revision',
  },
  {
    id: 'review-resubmission',
    label: 'Review resubmission',
    from: 'recommendation_resubmitted',
    to: 'recommendation_review',
    roles: ['posh_admin'],
    intent: 'primary',
    remark: 'Revised recommendation taken up for audit.',
  },

  /* ---- Decision, closure, archive ---- */
  {
    id: 'record-decision',
    label: 'Record final decision',
    from: 'recommendation_approved',
    to: 'final_decision_recorded',
    roles: ['posh_admin'],
    intent: 'primary',
    remark: 'Employer action recorded under s.13(3).',
    requiresNote: true,
    noteLabel: 'Action directed',
  },
  {
    id: 'close-case',
    label: 'Close case',
    from: 'final_decision_recorded',
    to: 'case_closed',
    roles: ['posh_admin'],
    intent: 'primary',
    remark: 'Case docket closed.',
  },
  {
    id: 'notify-employee',
    label: 'Notify complainant',
    from: 'case_closed',
    to: 'employee_notified',
    roles: ['posh_admin'],
    intent: 'primary',
    remark: 'Outcome notice issued to the complainant.',
  },
  {
    id: 'view-decision',
    label: 'View final decision',
    from: 'employee_notified',
    to: 'decision_viewed',
    roles: ['employee'],
    intent: 'primary',
    remark: 'Complainant read the outcome.',
  },
  {
    id: 'submit-feedback',
    label: 'Submit feedback',
    from: 'decision_viewed',
    to: 'feedback_submitted',
    roles: ['employee'],
    intent: 'primary',
    remark: 'Process feedback submitted.',
    requiresNote: true,
    noteLabel: 'How was the process handled?',
  },
  {
    id: 'archive-case',
    label: 'Archive case',
    from: 'feedback_submitted',
    to: 'case_archived',
    roles: ['posh_admin'],
    intent: 'primary',
    remark: 'Case sealed under the retention policy.',
  },
]

/**
 * Where to go to satisfy an unmet precondition.
 *
 * A blocked button that only says "do something else first" makes the reader hunt for
 * the screen that unblocks it. Each requirement therefore names its own remedy, and the
 * action panel renders it as a link.
 */
export const REQUIREMENT_REMEDY: Record<
  NonNullable<WorkflowTransition['requires']>,
  { label: string; to: string }
> = {
  committee: { label: 'Assign a board', to: '/committee' },
  acceptance: { label: 'Open the committee console', to: '/committee' },
  evidence: { label: 'Open the evidence register', to: '/evidence' },
  hearing: { label: 'List a sitting', to: '/hearings' },
  minutes: { label: 'Record the minutes', to: '/hearings' },
  recommendation: { label: 'Draft the report', to: '/recommendations' },
}

const BY_FROM = TRANSITIONS.reduce<Record<string, WorkflowTransition[]>>((acc, t) => {
  ;(acc[t.from] ??= []).push(t)
  return acc
}, {})

/** Every transition leaving a stage, regardless of who may drive it. */
export function transitionsFrom(stage: WorkflowStage): WorkflowTransition[] {
  return BY_FROM[stage] ?? []
}

/**
 * The transitions a given role may drive from a given stage. This is the function the
 * UI calls; an empty result means "you are not holding this case right now", which the
 * action panels render as a waiting-on notice rather than an error.
 */
export function actionsFor(stage: WorkflowStage, role: Role | null): WorkflowTransition[] {
  if (!role) return []
  return transitionsFrom(stage).filter((t) => t.roles.includes(role) || role === SUPER_ROLE)
}

/** Whose step this properly is, ignoring the super administrator's override. */
export function primaryActor(stage: WorkflowStage): Role[] {
  const next = transitionsFrom(stage)
  return [...new Set(next.flatMap((t) => t.roles))]
}

export function transitionById(id: string): WorkflowTransition | undefined {
  return TRANSITIONS.find((t) => t.id === id)
}
