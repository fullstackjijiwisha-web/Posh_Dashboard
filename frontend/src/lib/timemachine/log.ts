/**
 * Build the ordered event log for a case from everything already on file.
 *
 * Sources, in order of authority:
 *   1. Workflow history (stage transitions) — the spine
 *   2. Statutory milestones on the Case record (notice, reply, …)
 *   3. Fixture hearings / evidence / documents
 *   4. In-session flow hearings, evidence, documents, recommendations
 *
 * Deduped by id. Sorted ascending by `at`.
 */

import type { Case } from '../data/types'
import { hearingsFor, documentsFor } from '../data/caseDetail'
import { evidenceForCase } from '../data/evidence'
import type { CaseFlow } from '../workflow/types'
import { STAGE_META } from '../workflow/types'
import { NOTCH_KINDS, type TimelineEvent } from './types'

export function buildEventLog(record: Case, flow: CaseFlow | undefined): TimelineEvent[] {
  const events: TimelineEvent[] = []

  events.push({
    id: `${record.id}-filed`,
    at: `${record.filedDate}T09:00:00`,
    kind: 'filed',
    label: 'Complaint filed',
    detail: 'Complaint registered.',
    significant: true,
    stage: 'complaint_submitted',
  })

  const m = record.milestones
  if (m.noticeServedOn) {
    events.push({
      id: `${record.id}-notice`,
      at: `${m.noticeServedOn}T10:00:00`,
      kind: 'notice',
      label: 'Notice served',
      detail: 'Rule 7(1) — notice served on the respondent.',
      significant: true,
    })
  }
  if (m.replyReceivedOn) {
    events.push({
      id: `${record.id}-reply`,
      at: `${m.replyReceivedOn}T09:45:00`,
      kind: 'reply',
      label: 'Reply received',
      detail: 'Rule 7(4) — respondent reply recorded.',
      significant: true,
    })
  }
  if (m.inquiryCompletedOn) {
    events.push({
      id: `${record.id}-inquiry-done`,
      at: `${m.inquiryCompletedOn}T16:00:00`,
      kind: 'stage',
      label: 'Inquiry completed',
      detail: 's.11(4) — inquiry concluded.',
      significant: true,
    })
  }
  if (m.reportSubmittedOn) {
    events.push({
      id: `${record.id}-report`,
      at: `${m.reportSubmittedOn}T11:00:00`,
      kind: 'recommendation',
      label: 'Report to employer',
      detail: 's.13(1) — committee report submitted.',
      significant: true,
    })
  }
  if (m.actionTakenOn) {
    events.push({
      id: `${record.id}-action`,
      at: `${m.actionTakenOn}T14:00:00`,
      kind: 'decision',
      label: 'Employer action',
      detail: 's.13(4) — employer acted on the recommendation.',
      significant: true,
    })
  }

  if (flow) {
    for (const h of flow.history) {
      events.push({
        id: h.id,
        at: h.at,
        kind: 'stage',
        label: STAGE_META[h.stage]?.label ?? h.stage,
        detail: h.remarks,
        significant: false,
        stage: h.stage,
      })
    }

    for (const e of flow.evidence) {
      events.push({
        id: `flow-ev-${e.id}`,
        at: e.uploadedAt,
        kind: 'evidence',
        label: e.label,
        detail: e.note,
        significant: true,
        refId: e.id,
      })
    }

    for (const h of flow.hearings) {
      events.push({
        id: `flow-hrg-${h.id}`,
        at: h.at,
        kind: 'sitting',
        label: h.agenda,
        detail: `${h.mode} · ${h.location}`,
        significant: true,
        refId: h.id,
      })
    }

    for (const d of flow.documents ?? []) {
      events.push({
        id: `flow-doc-${d.id}`,
        at: d.createdAt,
        kind: 'document',
        label: d.title,
        detail: d.audience,
        significant: false,
        refId: d.id,
      })
    }

    for (const r of flow.recommendations) {
      events.push({
        id: `flow-rec-${r.id}`,
        at: r.at,
        kind: 'recommendation',
        label: 'Recommendation submitted',
        detail: r.finding.slice(0, 120),
        significant: true,
        refId: r.id,
      })
    }
  }

  for (const h of hearingsFor(record.id)) {
    events.push({
      id: `fix-hrg-${h.id}`,
      at: h.at,
      kind: 'sitting',
      label: h.title,
      detail: h.location,
      significant: true,
      refId: h.id,
    })
  }

  for (const e of evidenceForCase(record.id)) {
    events.push({
      id: `fix-ev-${e.id}`,
      at: `${e.receivedOn}T10:00:00`,
      kind: 'evidence',
      label: e.exhibitNo ? `${e.exhibitNo} — ${e.description}` : e.description,
      detail: e.type,
      significant: true,
      refId: e.id,
    })
  }

  for (const d of documentsFor(record.id)) {
    events.push({
      id: `fix-doc-${d.id}`,
      at: d.uploadedAt,
      kind: 'document',
      label: d.name,
      detail: d.category,
      significant: false,
      refId: d.id,
    })
  }

  // Deduplicate by id (history may echo milestone labels).
  const seen = new Set<string>()
  const unique = events.filter((e) => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })

  unique.sort((a, b) => a.at.localeCompare(b.at))

  // Promote stage events that coincide with notch kinds already covered — keep
  // significant flags as declared. Ensure every NOTCH_KIND present is significant.
  for (const e of unique) {
    if (NOTCH_KINDS.includes(e.kind)) e.significant = true
  }

  return unique
}

export function significantEvents(log: TimelineEvent[]): TimelineEvent[] {
  return log.filter((e) => e.significant)
}
