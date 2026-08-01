/**
 * Watermarked download.
 *
 * The commonest real leak in a PoSH case is not a hacked database — it is a forwarded
 * PDF. A watermark does not prevent that, but it does mean any copy in circulation names
 * the person it was released to, which changes the calculation for whoever is thinking
 * about forwarding it.
 *
 * The fixture holds no file bytes, so what downloads is a cover sheet: the item's
 * identity, its provenance, its intake digest, and the watermark. That is honest — it
 * downloads something real and says what it is, rather than pretending to hand over a
 * document that does not exist. When Phase 6 puts actual files behind these records, the
 * same watermark applies to their pages instead.
 */

import type { FlowEvidenceItem } from '../workflow/types'
import { ROLE_LABEL, type Role } from '../data/types'
import { groupHash } from '../defensibility/hash'
import { mimeLabel } from './model'

export interface WatermarkTarget {
  item: FlowEvidenceItem
  caseId: string
  by: string
  role: Role | null
}

export async function watermarkedDownload({ item, caseId, by, role }: WatermarkTarget): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const M = 20
  const at = new Date()
  const stamp = at.toISOString().replace('T', ' ').slice(0, 19)
  const roleLabel = role ? ROLE_LABEL[role] : 'Unknown role'

  const mark = `${by}  ·  ${roleLabel}  ·  ${stamp}  ·  Confidential — s.16 PoSH Act 2013`

  // Diagonal, low opacity, repeated down the page so a cropped screenshot still carries it.
  doc.saveGraphicsState()
  // @ts-expect-error — GState exists at runtime; the bundled types omit it.
  doc.setGState(new doc.GState({ opacity: 0.08 }))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  for (const y of [55, 105, 155, 205, 255]) {
    doc.text(mark, W / 2, y, { align: 'center', angle: 30 })
  }
  doc.restoreGraphicsState()

  doc.setFont('times', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(110)
  doc.text('EVIDENCE ITEM — RELEASED COPY', M, 18)
  doc.text(caseId, W - M, 18, { align: 'right' })
  doc.setDrawColor(200)
  doc.line(M, 21, W - M, 21)

  doc.setFont('times', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(20)
  doc.text(doc.splitTextToSize(item.label, W - M * 2) as string[], M, 38)

  let y = 60
  const row = (label: string, value: string, mono = false) => {
    doc.setFont('times', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(120)
    doc.text(label.toUpperCase(), M, y)
    doc.setFont(mono ? 'courier' : 'times', 'normal')
    doc.setFontSize(mono ? 8.5 : 11)
    doc.setTextColor(25)
    const lines = doc.splitTextToSize(value, W - M * 2) as string[]
    lines.forEach((l, i) => doc.text(l, M, y + 5.5 + i * 4.6))
    y += 5.5 + lines.length * 4.6 + 7
  }

  row('Exhibit', item.exhibitNo ?? 'Not yet admitted to the record')
  row('State', item.state ?? 'Submitted')
  row('Description', item.note)
  row('Filed by', `${item.uploadedByName} (${item.uploadedByRole}) on ${item.uploadedAt.replace('T', ' ').slice(0, 19)}`)
  row('File', `${item.sizeKb} KB · ${mimeLabel(item.mimeType ?? '')}`)
  row('SHA-256 fixed at intake', item.hash ? groupHash(item.hash) : 'Not computed', true)
  row('Released to', `${by} (${roleLabel})`)
  row('Released at', stamp)

  doc.setFont('times', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(110)
  doc.text(
    doc.splitTextToSize(
      'This copy is watermarked to the person named above and its release is recorded in the chain of custody for this item. Onward disclosure is restricted by s.16 of the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013.',
      W - M * 2,
    ) as string[],
    M,
    250,
  )

  const blob = doc.output('blob') as Blob
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${caseId}-${(item.exhibitNo ?? 'item').replace(/\s+/g, '')}-${item.label.replace(/[^\w.-]+/g, '_').slice(0, 40)}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
