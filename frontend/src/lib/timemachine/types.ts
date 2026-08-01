/**
 * Time Machine — event log model.
 *
 * The case is stored as an ordered log of facts. State at any date is derived by
 * replaying every event whose timestamp is ≤ that date. There are no snapshots —
 * "what did the committee know on 3 June" is answered by filtering the log, not by
 * looking up a frozen copy.
 *
 * Event kinds that matter for the scrubber notches are marked `significant`. Everything
 * else still participates in derivation (activity feed, stage position) but does not
 * draw a notch.
 */

import type { WorkflowStage } from '../workflow/types'

export type TimelineKind =
  | 'filed'
  | 'stage'
  | 'notice'
  | 'reply'
  | 'evidence'
  | 'document'
  | 'sitting'
  | 'recommendation'
  | 'decision'
  | 'other'

export interface TimelineEvent {
  id: string
  /** ISO datetime — the moment this fact entered the record. */
  at: string
  kind: TimelineKind
  /** Short label for the scrubber notch tooltip. */
  label: string
  detail?: string
  /** Drawn as a notch on the scrubber when true. */
  significant: boolean
  /** Workflow stage this event moved the case to, if any. */
  stage?: WorkflowStage
  /** Optional link back to the source record. */
  refId?: string
}

/** Kinds that get a notch on the scrubber track. */
export const NOTCH_KINDS: TimelineKind[] = [
  'filed',
  'notice',
  'reply',
  'evidence',
  'sitting',
  'recommendation',
  'decision',
]
