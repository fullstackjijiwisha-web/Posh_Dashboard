/**
 * Rendering the pack to PDF.
 *
 * jsPDF, dynamically imported so it never enters the main bundle — a reader who does not
 * generate a pack should not download a PDF engine.
 *
 * Typesetting matters here more than it would elsewhere. This document is meant to be
 * handed to a lawyer, and a court-ready bundle that looks like a screenshot of a web page
 * undermines its own argument. So: serif body, a running header carrying the case number
 * on every page, "Page x of y" resolved at the end once the count is known, section
 * dividers, and a watermark that names the recipient.
 *
 * The page is A4 in millimetres because that is what it will be printed on in India.
 */

import type { DefensibilityPack, PackRow } from './pack'
import { groupHash } from './hash'

const PAGE = { w: 210, h: 297 }
const M = { top: 24, bottom: 22, left: 20, right: 20 }
const CONTENT_W = PAGE.w - M.left - M.right

/** jsPDF's built-in serif. Bundling a font file would add far more weight than it earns. */
const SERIF = 'times'
const MONO = 'courier'

export interface RenderResult {
  blob: Blob
  url: string
  pageCount: number
}

export async function renderPack(pack: DefensibilityPack): Promise<RenderResult> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })

  const watermarkText = [
    pack.options.recipient || 'Confidential',
    pack.generatedAt.slice(0, 10),
    'Confidential — s.16 PoSH Act 2013',
  ].join('   ·   ')

  let y = M.top

  /* --- page furniture ------------------------------------------------ */

  const watermark = () => {
    doc.saveGraphicsState()
    // @ts-expect-error — GState is present at runtime; the bundled types omit it.
    doc.setGState(new doc.GState({ opacity: 0.06 }))
    doc.setFont(SERIF, 'bold')
    doc.setFontSize(15)
    doc.setTextColor(0, 0, 0)
    // Three passes up the page so the diagonal covers it without becoming a texture.
    for (const yPos of [70, 150, 230]) {
      doc.text(watermarkText, PAGE.w / 2, yPos, { align: 'center', angle: 32 })
    }
    doc.restoreGraphicsState()
  }

  const header = () => {
    doc.setFont(SERIF, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(110)
    doc.text('DEFENSIBILITY PACK', M.left, 14)
    doc.text(pack.caseId, PAGE.w - M.right, 14, { align: 'right' })
    doc.setDrawColor(200)
    doc.setLineWidth(0.2)
    doc.line(M.left, 16.5, PAGE.w - M.right, 16.5)
  }

  const newPage = () => {
    doc.addPage()
    watermark()
    header()
    y = M.top
  }

  /** Reserves vertical space, breaking the page when it will not fit. */
  const need = (mm: number) => {
    if (y + mm > PAGE.h - M.bottom) newPage()
  }

  const write = (
    text: string,
    opts: { size?: number; font?: string; style?: string; colour?: number; indent?: number; gap?: number } = {},
  ) => {
    const { size = 10, font = SERIF, style = 'normal', colour = 30, indent = 0, gap = 1.2 } = opts
    doc.setFont(font, style)
    doc.setFontSize(size)
    doc.setTextColor(colour)
    const lines = doc.splitTextToSize(text, CONTENT_W - indent) as string[]
    const lineH = size * 0.42
    for (const line of lines) {
      need(lineH + gap)
      doc.text(line, M.left + indent, y)
      y += lineH + gap
    }
  }

  /* --- cover --------------------------------------------------------- */

  watermark()
  doc.setFont(SERIF, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(110)
  doc.text(pack.organisation.toUpperCase(), M.left, 40)

  doc.setFont(SERIF, 'bold')
  doc.setFontSize(28)
  doc.setTextColor(20)
  doc.text('Defensibility Pack', M.left, 60)

  doc.setFont(SERIF, 'normal')
  doc.setFontSize(12)
  doc.setTextColor(70)
  doc.text('Complete record of a complaint under the', M.left, 72)
  doc.text('Sexual Harassment of Women at Workplace', M.left, 79)
  doc.text('(Prevention, Prohibition and Redressal) Act, 2013', M.left, 86)

  doc.setDrawColor(180)
  doc.line(M.left, 96, PAGE.w - M.right, 96)

  y = 108
  const coverRow = (label: string, value: string, mono = false) => {
    doc.setFont(SERIF, 'normal')
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(label.toUpperCase(), M.left, y)
    doc.setFont(mono ? MONO : SERIF, mono ? 'normal' : 'bold')
    doc.setFontSize(mono ? 9 : 12)
    doc.setTextColor(20)
    const lines = doc.splitTextToSize(value, CONTENT_W) as string[]
    lines.forEach((l, i) => doc.text(l, M.left, y + 6 + i * 5))
    y += 6 + lines.length * 5 + 7
  }

  coverRow('Case number', pack.caseId, true)
  coverRow('Subject', pack.subject)
  coverRow('Status at generation', pack.status)
  coverRow('Generated', `${pack.generatedAt.replace('T', ' ').slice(0, 19)} by ${pack.generatedBy} (${pack.generatedByRole})`)
  coverRow('Prepared for', pack.options.recipient || 'Not stated')
  coverRow('Redaction', pack.options.redact ? 'Redacted — identities replaced with role aliases' : 'Unredacted — contains identifying information')
  coverRow('Root SHA-256', groupHash(pack.rootHash), true)

  doc.setFont(SERIF, 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(110)
  doc.text(
    doc.splitTextToSize(
      'This pack was assembled from the case record and each section hashed independently. The root digest above commits to every section in the order printed. Confidential — disclosure is restricted by s.16 of the Act.',
      CONTENT_W,
    ) as string[],
    M.left,
    PAGE.h - 38,
  )

  /* --- contents ------------------------------------------------------- */

  newPage()
  write('Contents', { size: 18, style: 'bold', colour: 20, gap: 4 })
  y += 2
  pack.sections.forEach((s, i) => {
    write(`${String(i + 1).padStart(2, '0')}   ${s.title}`, { size: 11, gap: 2.4 })
  })

  /* --- sections ------------------------------------------------------- */

  const rowLine = (r: PackRow) => {
    const labelIndent = r.label.startsWith('   ') ? 6 : 0
    need(9)
    doc.setFont(SERIF, labelIndent ? 'italic' : 'bold')
    doc.setFontSize(9)
    doc.setTextColor(labelIndent ? 110 : 40)
    const label = doc.splitTextToSize(r.label.trim(), 52) as string[]
    label.forEach((l, i) => doc.text(l, M.left + labelIndent, y + i * 3.8))

    doc.setFont(r.mono ? MONO : SERIF, 'normal')
    doc.setFontSize(r.mono ? 7.6 : 9.5)
    // Breach and met are set in weight and wording too — colour never carries meaning
    // alone, which matters both for accessibility and for a pack printed in black.
    doc.setTextColor(r.emphasis === 'breach' ? 150 : 30)
    if (r.emphasis === 'breach') doc.setFont(r.mono ? MONO : SERIF, 'bold')

    const valueX = M.left + 56 + labelIndent
    const valueW = PAGE.w - M.right - valueX
    const value = doc.splitTextToSize(r.value, valueW) as string[]
    value.forEach((l, i) => doc.text(l, valueX, y + i * (r.mono ? 3.4 : 3.9)))

    y += Math.max(label.length * 3.8, value.length * (r.mono ? 3.4 : 3.9)) + 2.6
  }

  pack.sections.forEach((section, i) => {
    newPage()
    doc.setFont(SERIF, 'normal')
    doc.setFontSize(9)
    doc.setTextColor(140)
    doc.text(`SECTION ${String(i + 1).padStart(2, '0')}`, M.left, y)
    y += 8
    write(section.title, { size: 19, style: 'bold', colour: 20, gap: 3 })
    write(section.blurb, { size: 9.5, style: 'italic', colour: 100, gap: 2 })
    y += 4
    doc.setDrawColor(210)
    doc.line(M.left, y, PAGE.w - M.right, y)
    y += 7

    section.rows.forEach(rowLine)

    if (section.prose?.length) {
      y += 3
      section.prose.forEach((p) => {
        if (p.heading) {
          y += 3
          write(p.heading, { size: 10.5, style: 'bold', colour: 40, gap: 2 })
        }
        write(p.body, { size: 9.5, colour: 45, gap: 1.6 })
      })
    }

    y += 4
    need(10)
    doc.setFont(MONO, 'normal')
    doc.setFontSize(7)
    doc.setTextColor(130)
    doc.text(`Section digest  ${section.hash}`, M.left, y)
  })

  /* --- page numbers, once the total is known -------------------------- */

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont(SERIF, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(`Page ${i} of ${pageCount}`, PAGE.w / 2, PAGE.h - 12, { align: 'center' })
    if (i > 1) {
      doc.setFontSize(7)
      doc.text(pack.rootHash.slice(0, 16), PAGE.w - M.right, PAGE.h - 12, { align: 'right' })
    }
  }

  const blob = doc.output('blob') as Blob
  return { blob, url: URL.createObjectURL(blob), pageCount }
}
