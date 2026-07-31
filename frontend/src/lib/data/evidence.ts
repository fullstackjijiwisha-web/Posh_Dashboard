/**
 * Evidence register for the flagship case, with chain of custody.
 *
 * Chain of custody is the point of this file. Every exhibit records who received it,
 * when it was sealed, and every subsequent access — an inquiry whose evidence handling
 * cannot be reconstructed is challengeable on appeal under s.18.
 */

import { FLAGSHIP_CASE_ID } from './cases'
import { dateNDaysAgo } from './statutory'
import { seedEvidence } from './caseWorkspaceSeed'
import type { CustodyEvent, EvidenceItem } from './types'

/** Stable actor → IP map (mirrors audit.ts). */
const IP: Record<string, string> = {
  'u-emp': '10.24.6.118',
  'u-hr': '10.24.1.42',
  'u-po': '10.31.2.11',
  'u-ic': '10.28.4.77',
  'u-ext': '203.0.113.24',
  'u-legal': '10.19.8.55',
  'u-mgmt': '10.12.3.9',
  'u-admin': '10.24.1.7',
  system: '—',
}

/** Case was filed 84 days ago; exhibits arrive through the inquiry. */
const at = (daysAgo: number, time: string) => `${dateNDaysAgo(daysAgo)}T${time}`

let custodySeq = 0
function custody(
  daysAgo: number,
  time: string,
  actorId: string,
  action: CustodyEvent['action'],
  note: string,
): CustodyEvent {
  custodySeq += 1
  return {
    id: `coc-${custodySeq}`,
    at: at(daysAgo, time),
    actorId,
    action,
    note,
    ip: IP[actorId] ?? '10.0.0.1',
  }
}

export const EVIDENCE: EvidenceItem[] = [
  {
    id: 'ev-0142-01',
    caseId: FLAGSHIP_CASE_ID,
    exhibitNo: 'E-01',
    type: 'Email',
    description: 'Email thread between the parties, 14 messages, spanning six weeks before the complaint.',
    submittedBy: 'u-emp',
    receivedOn: dateNDaysAgo(80),
    status: 'In custody',
    chainOfCustody: [
      custody(80, '10:05', 'u-hr', 'Received', 'Received from the complainant in printed and native .eml form.'),
      custody(80, '10:40', 'u-hr', 'Sealed', 'Hashed and sealed into the case vault. SHA-256 recorded.'),
      custody(76, '14:20', 'u-po', 'Viewed', 'Reviewed for admissibility at the preliminary sitting.'),
      custody(58, '11:15', 'u-ic', 'Viewed', 'Referenced during complainant deposition.'),
      custody(34, '10:05', 'u-ic', 'Shared', 'Redacted extract prepared for the respondent under Rule 7(4).'),
      custody(22, '16:30', 'u-ext', 'Downloaded', 'Downloaded ahead of closing submissions.'),
      custody(8, '11:00', 'u-legal', 'Viewed', 'Procedural compliance review.'),
    ],
  },
  {
    id: 'ev-0142-02',
    caseId: FLAGSHIP_CASE_ID,
    exhibitNo: 'E-02',
    type: 'Message log',
    description: 'Internal messaging platform export, direct messages, 22 March to 5 May 2026.',
    submittedBy: 'u-emp',
    receivedOn: dateNDaysAgo(78),
    status: 'In custody',
    chainOfCustody: [
      custody(78, '09:30', 'u-hr', 'Received', 'Export produced by IT under a preservation request.'),
      custody(78, '09:55', 'u-hr', 'Sealed', 'Sealed unmodified; export manifest attached.'),
      custody(70, '15:10', 'u-po', 'Viewed', 'Reviewed against the complaint narrative.'),
      custody(34, '10:05', 'u-ic', 'Shared', 'Redacted extract prepared for the respondent under Rule 7(4).'),
      custody(15, '09:40', 'u-ext', 'Downloaded', 'Downloaded for External Member binder.'),
    ],
  },
  {
    id: 'ev-0142-03',
    caseId: FLAGSHIP_CASE_ID,
    exhibitNo: 'E-03',
    type: 'Statement',
    description: 'Signed witness statement, colleague present at the 2 May incident.',
    submittedBy: 'u-po',
    receivedOn: dateNDaysAgo(46),
    status: 'In custody',
    chainOfCustody: [
      custody(46, '15:40', 'u-po', 'Received', 'Recorded and signed in the presence of two committee members.'),
      custody(46, '16:10', 'u-po', 'Sealed', 'Sealed with the witness declaration under Rule 7(6).'),
      custody(30, '11:25', 'u-ext', 'Viewed', 'Reviewed for corroboration.'),
      custody(14, '16:00', 'u-ic', 'Viewed', 'Cross-checked ahead of deliberation.'),
    ],
  },
  {
    id: 'ev-0142-04',
    caseId: FLAGSHIP_CASE_ID,
    exhibitNo: 'E-04',
    type: 'Access log',
    description: 'Building access records, third floor, 28 April to 6 May 2026.',
    submittedBy: 'u-admin',
    receivedOn: dateNDaysAgo(52),
    status: 'Released',
    chainOfCustody: [
      custody(52, '12:00', 'u-admin', 'Received', 'Extracted from the facilities system under a documented request.'),
      custody(52, '12:30', 'u-admin', 'Sealed', 'Sealed with the extraction query recorded.'),
      custody(40, '09:45', 'u-po', 'Viewed', 'Cross-checked against the timeline in the complaint.'),
      custody(28, '14:10', 'u-ic', 'Downloaded', 'Downloaded for hearing binder.'),
      custody(20, '11:05', 'u-ext', 'Viewed', 'Reviewed proximity evidence.'),
      custody(18, '17:00', 'u-admin', 'Released', 'Released back to facilities; retention no longer required.'),
    ],
  },
  {
    id: 'ev-0142-05',
    caseId: FLAGSHIP_CASE_ID,
    exhibitNo: 'E-05',
    type: 'Policy',
    description: 'Sexual harassment prevention policy, version 3.2, with the complainant’s acknowledgement record.',
    submittedBy: 'u-hr',
    receivedOn: dateNDaysAgo(74),
    status: 'In custody',
    chainOfCustody: [
      custody(74, '11:00', 'u-hr', 'Received', 'Produced from the policy register with the acknowledgement audit row.'),
      custody(74, '11:20', 'u-hr', 'Sealed', 'Sealed as a reference exhibit.'),
      custody(26, '14:05', 'u-legal', 'Viewed', 'Reviewed for the standard applicable at the time of the incident.'),
    ],
  },
  {
    id: 'ev-0142-06',
    caseId: FLAGSHIP_CASE_ID,
    exhibitNo: 'E-06',
    type: 'Document',
    description: 'Appraisal and rating history for the complainant, four cycles.',
    submittedBy: 'u-hr',
    receivedOn: dateNDaysAgo(38),
    status: 'In custody',
    chainOfCustody: [
      custody(38, '13:15', 'u-hr', 'Received', 'Produced to test the retaliation allegation.'),
      custody(38, '13:35', 'u-hr', 'Sealed', 'Sealed; access restricted to the committee.'),
      custody(24, '10:50', 'u-po', 'Viewed', 'Compared against the timeline of the refusal.'),
      custody(12, '15:20', 'u-ext', 'Downloaded', 'Downloaded ahead of the deliberation sitting.'),
    ],
  },
  {
    id: 'ev-0142-07',
    caseId: FLAGSHIP_CASE_ID,
    exhibitNo: 'E-07',
    type: 'Medical',
    description: 'Occupational health assessment submitted by the complainant in support of interim relief.',
    submittedBy: 'u-emp',
    receivedOn: dateNDaysAgo(64),
    status: 'Archived',
    chainOfCustody: [
      custody(64, '16:45', 'u-po', 'Received', 'Received directly by the Presiding Officer in a sealed cover.'),
      custody(64, '17:00', 'u-po', 'Sealed', 'Sealed; access restricted to the Presiding Officer and External Member.'),
      custody(50, '10:15', 'u-ext', 'Viewed', 'Reviewed in support of the interim relief request under s.12.'),
      custody(8, '09:00', 'u-po', 'Returned', 'Returned to sealed archive after the interim order was recorded.'),
    ],
  },
]

export function evidenceForCase(caseId: string): EvidenceItem[] {
  const rows = EVIDENCE.filter((e) => e.caseId === caseId)
  return rows.length ? rows : seedEvidence(caseId)
}
