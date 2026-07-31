/**
 * Statutory timelines under the Sexual Harassment of Women at Workplace (Prevention,
 * Prohibition and Redressal) Act 2013 and its Rules.
 *
 * These numbers carry legal consequence — an inquiry that runs past 90 days is a
 * reportable default. They are defined once, here, and every screen derives from them
 * rather than hard-coding a date.
 *
 * Note the units differ between provisions: notice and reply run in WORKING days,
 * everything else in calendar days. Conflating the two is the classic way to compute a
 * deadline that is quietly wrong, so the two helpers are kept separate and named.
 */

import { addBusinessDays, addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

const ISO = 'yyyy-MM-dd'

/** The "as at" date the whole prototype is evaluated against. */
export const REPORTING_DATE = '2026-07-31'

export const STATUTORY = {
  /** Rule 7(1) — notice served on the respondent within 7 working days. */
  NOTICE_WORKING_DAYS: 7,
  /** Rule 7(4) — respondent's reply within 10 working days of receiving the notice. */
  REPLY_WORKING_DAYS: 10,
  /** Section 11(4) — inquiry completed within 90 days of the complaint. */
  INQUIRY_DAYS: 90,
  /** Section 13(1) — IC report to the employer within 10 days of completing the inquiry. */
  REPORT_DAYS: 10,
  /** Section 13(4) — employer acts on the recommendation within 60 days. */
  EMPLOYER_ACTION_DAYS: 60,
  /** Section 18(1) — appeal within 90 days of the recommendation. */
  APPEAL_DAYS: 90,
} as const

const iso = (d: Date) => format(d, ISO)
const toDate = (value: string | Date) => (typeof value === 'string' ? parseISO(value) : value)

/* ------------------------------------------------------------------ *
 * Deadline calculators
 * ------------------------------------------------------------------ */

/** Rule 7(1): notice to the respondent, 7 working days from the complaint. */
export function noticeDeadline(filedDate: string): string {
  return iso(addBusinessDays(toDate(filedDate), STATUTORY.NOTICE_WORKING_DAYS))
}

/** Rule 7(4): respondent's reply, 10 working days from service of the notice. */
export function replyDeadline(noticeServedOn: string): string {
  return iso(addBusinessDays(toDate(noticeServedOn), STATUTORY.REPLY_WORKING_DAYS))
}

/** Section 11(4): inquiry completed within 90 calendar days of the complaint. */
export function inquiryDeadline(filedDate: string): string {
  return iso(addDays(toDate(filedDate), STATUTORY.INQUIRY_DAYS))
}

/** Section 13(1): IC report to the employer, 10 calendar days after the inquiry ends. */
export function reportDeadline(inquiryCompletedOn: string): string {
  return iso(addDays(toDate(inquiryCompletedOn), STATUTORY.REPORT_DAYS))
}

/** Section 13(4): employer action within 60 calendar days of the recommendation. */
export function employerActionDeadline(reportSubmittedOn: string): string {
  return iso(addDays(toDate(reportSubmittedOn), STATUTORY.EMPLOYER_ACTION_DAYS))
}

/** Section 18(1): appeal window closes 90 calendar days after the recommendation. */
export function appealWindowEnd(reportSubmittedOn: string): string {
  return iso(addDays(toDate(reportSubmittedOn), STATUTORY.APPEAL_DAYS))
}

/* ------------------------------------------------------------------ *
 * Derived state
 * ------------------------------------------------------------------ */

/** Days between a date and the reporting date. Positive means in the past. */
export function daysSince(date: string, asAt: string = REPORTING_DATE): number {
  return differenceInCalendarDays(toDate(asAt), toDate(date))
}

/** Days left before a deadline. Negative means it has passed. */
export function daysUntil(deadline: string, asAt: string = REPORTING_DATE): number {
  return differenceInCalendarDays(toDate(deadline), toDate(asAt))
}

export type UrgencyBand = 'breached' | 'critical' | 'caution' | 'safe'

/** >30 safe · 8–30 caution · 0–7 critical · negative breached. */
export function urgencyOf(daysRemaining: number | null): UrgencyBand | null {
  if (daysRemaining === null) return null
  if (daysRemaining < 0) return 'breached'
  if (daysRemaining <= 7) return 'critical'
  if (daysRemaining <= 30) return 'caution'
  return 'safe'
}

/** Subtract n days from the reporting date — used to author cases by age. */
export function dateNDaysAgo(n: number, asAt: string = REPORTING_DATE): string {
  return iso(addDays(toDate(asAt), -n))
}
