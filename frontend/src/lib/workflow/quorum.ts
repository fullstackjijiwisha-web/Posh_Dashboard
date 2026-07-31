/**
 * Quorum and constitution tests under s.4.
 *
 * These are the tests the Presiding Officer is personally answerable for, so they live
 * in one place rather than being re-derived on each screen. Getting them wrong does not
 * produce a wrong number — it produces an inquiry that can be set aside.
 *
 * s.4(1)–(2) constitution:
 *   · a Presiding Officer who is a woman employed at a senior level
 *   · not less than TWO members from amongst employees
 *   · one member from an NGO or familiar with issues of sexual harassment (external)
 *   · at least one-half of the total members shall be women
 * Taken together that is a minimum of four, including the Presiding Officer.
 *
 * s.4(3) tenure: members hold office for not more than three years.
 *
 * Quorum for a sitting is treated here as: the Presiding Officer present, at least three
 * members present, and the external member present — the last because a sitting held
 * without the outside member is exactly the defect s.4(2)(c) exists to prevent.
 */

import { userById } from '../data/users'
import type { QuorumTest } from '../../components/workflow/Dials'

/** Gender of each seeded panelist, for the one-half-women test. */
const WOMAN: Record<string, boolean> = {
  'u-po': true,
  'u-ic': false,
  'u-ext': true,
  'u-legal': false,
  'u-hr': false,
  'u-padmin': true,
  'u-admin': true,
  'u-emp': true,
  'u-mgmt': true,
}

const isWoman = (id: string) => WOMAN[id] ?? false
const roleOf = (id: string) => userById(id)?.role

/** Composition of a constituted board, judged against s.4(1)–(2). */
export function constitutionTests(memberIds: string[]): QuorumTest[] {
  const employeeMembers = memberIds.filter((id) => roleOf(id) === 'ic_member').length
  const women = memberIds.filter(isWoman).length
  const hasPO = memberIds.some((id) => roleOf(id) === 'presiding_officer')
  const hasExternal = memberIds.some((id) => roleOf(id) === 'external_member')

  return [
    {
      label: 'Presiding Officer named',
      met: hasPO,
      detail: hasPO
        ? 'A woman employed at a senior level heads the board.'
        : 'No Presiding Officer on this board — s.4(2)(a) is not satisfied.',
    },
    {
      label: 'Two or more internal members',
      met: employeeMembers >= 2,
      detail:
        employeeMembers >= 2
          ? `${employeeMembers} members drawn from amongst employees.`
          : `Only ${employeeMembers} internal member — s.4(2)(b) requires not less than two.`,
    },
    {
      label: 'External member present',
      met: hasExternal,
      detail: hasExternal
        ? 'An outside member sits on the board, as s.4(2)(c) requires.'
        : 'No external member — the board is wholly internal.',
    },
    {
      label: 'At least one-half women',
      met: memberIds.length > 0 && women * 2 >= memberIds.length,
      detail: `${women} of ${memberIds.length} members are women.`,
    },
  ]
}

/** Whether a specific sitting may proceed. */
export function sittingQuorumTests(attendeeIds: string[]): QuorumTest[] {
  const hasPO = attendeeIds.some((id) => roleOf(id) === 'presiding_officer')
  const hasExternal = attendeeIds.some((id) => roleOf(id) === 'external_member')
  const women = attendeeIds.filter(isWoman).length

  return [
    {
      label: 'Presiding Officer sitting',
      met: hasPO,
      detail: hasPO ? 'The Presiding Officer is in attendance.' : 'The sitting cannot proceed without the chair.',
    },
    {
      label: 'Three or more present',
      met: attendeeIds.length >= 3,
      detail: `${attendeeIds.length} member${attendeeIds.length === 1 ? '' : 's'} in attendance.`,
    },
    {
      label: 'External member sitting',
      met: hasExternal,
      detail: hasExternal
        ? 'The outside member is present.'
        : 'Proceeding without the external member risks the finding being set aside.',
    },
    {
      label: 'At least one-half women',
      met: attendeeIds.length > 0 && women * 2 >= attendeeIds.length,
      detail: `${women} of ${attendeeIds.length} present are women.`,
    },
  ]
}

export const allMet = (tests: QuorumTest[]) => tests.every((t) => t.met)
