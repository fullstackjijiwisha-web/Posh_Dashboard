/**
 * Shared formatters. Indian conventions throughout — this product ships to an Indian
 * corporate, so dates are never US format and large numbers use the Indian grouping.
 *
 * Nothing in the app should format a date, time or number inline. Import from here so
 * one change updates every screen.
 */

import { format, parseISO } from 'date-fns'

/**
 * `new Date('2026-04-25')` parses as UTC midnight, which renders as the previous day
 * anywhere west of Greenwich. parseISO treats a date-only string as local time, so a
 * filing date never drifts by a day.
 */
function toDate(value: string | Date): Date {
  return typeof value === 'string' ? parseISO(value) : value
}

/** `31 Mar 2026` — never US format. */
export function formatDate(value: string | Date): string {
  return format(toDate(value), 'dd MMM yyyy')
}

/** `31 Mar 2026, 14:32` — 24-hour clock. */
export function formatTimestamp(value: string | Date): string {
  return format(toDate(value), 'dd MMM yyyy, HH:mm')
}

/** `12 Mar 2026, 14:32:07` — full audit precision. */
export function formatAuditTimestamp(value: string | Date): string {
  return format(toDate(value), 'dd MMM yyyy, HH:mm:ss')
}

/** `Mar 2026` — for axis ticks and month groupings. */
export function formatMonthYear(value: string | Date): string {
  return format(toDate(value), 'MMM yyyy')
}

/** `Mar` — short axis ticks. */
export function formatMonth(value: string | Date): string {
  return format(toDate(value), 'MMM')
}

const INDIAN_NUMBER = new Intl.NumberFormat('en-IN')
const INDIAN_CURRENCY = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

/** Indian numbering system: `1,84,700` — not `184,700`. */
export function formatNumber(value: number): string {
  return INDIAN_NUMBER.format(value)
}

/** `₹2,00,000`. */
export function formatCurrency(value: number): string {
  return INDIAN_CURRENCY.format(value)
}

/** `94%` — kept here so percentage rendering stays consistent. */
export function formatPercent(value: number): string {
  return `${INDIAN_NUMBER.format(value)}%`
}

/** `245 KB` / `18.4 MB`. */
export function formatFileSize(kb: number): string {
  if (kb < 1024) return `${INDIAN_NUMBER.format(kb)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

/** Signed day counts for deltas: `+3`, `−7`. Uses a real minus sign, not a hyphen. */
export function formatSignedDays(value: number): string {
  if (value === 0) return '0'
  return value > 0 ? `+${value}` : `−${Math.abs(value)}`
}
