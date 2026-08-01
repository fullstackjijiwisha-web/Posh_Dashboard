import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Download, FileText, Loader2, Lock, ShieldCheck, X } from 'lucide-react'
import type { Case } from '../../lib/data/types'
import type { CaseFlow } from '../../lib/workflow/types'
import { buildPack, PACK_STEPS, type DefensibilityPack, type PackOptions } from '../../lib/defensibility/pack'
import { renderPack } from '../../lib/defensibility/render'
import { groupHash, shortHash } from '../../lib/defensibility/hash'
import { useToast } from '../../lib/toast'
import './PackDialog.css'

type Phase = 'options' | 'assembling' | 'ready' | 'failed'

interface StepState {
  label: string
  done: boolean
  active: boolean
}

/**
 * The Defensibility Pack dialog.
 *
 * Three states in one modal: choose, assemble, review. The assembly sequence is the part
 * worth getting right — it names each section as it is genuinely built and hashed, rather
 * than animating a fake progress bar for four seconds. The pacing comes from real work
 * plus a small floor per step, because assembling 24 sections of a fixture is faster than
 * a reader can follow and a sequence that finishes instantly reads as if nothing happened.
 */
export function PackDialog({
  record,
  flow,
  committee,
  actor,
  onClose,
  onGenerated,
}: {
  record: Case
  flow: CaseFlow
  committee: { name: string; memberIds: string[]; createdAt: string } | undefined
  actor: { name: string; role: string }
  onClose: () => void
  onGenerated: (meta: { rootHash: string; redacted: boolean; pages: number }) => void
}) {
  const { push } = useToast()
  const [phase, setPhase] = useState<Phase>('options')
  const [options, setOptions] = useState<PackOptions>({
    redact: false,
    includeAccessLog: true,
    recipient: '',
  })
  const [steps, setSteps] = useState<StepState[]>(
    PACK_STEPS.map((label) => ({ label, done: false, active: false })),
  )
  const [pack, setPack] = useState<DefensibilityPack | null>(null)
  const [preview, setPreview] = useState<{ url: string; pages: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const objectUrl = useRef<string | null>(null)

  // A blob URL is a live handle into memory; dropping the dialog without revoking it
  // leaks the whole PDF for the life of the tab.
  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    },
    [],
  )

  // Escape closes, but never mid-assembly — abandoning a half-built pack would leave the
  // export record ambiguous about whether one was produced.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'assembling') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, onClose])

  const generate = useCallback(async () => {
    setPhase('assembling')
    setError(null)
    setSteps(PACK_STEPS.map((label) => ({ label, done: false, active: false })))

    try {
      const built = await buildPack(record, flow, committee, options, actor, async (index) => {
        setSteps((prev) =>
          prev.map((s, i) => ({ ...s, active: i === index, done: i < index })),
        )
        // Floor of ~330ms per step: ten steps lands the sequence near four seconds, which
        // is long enough to read and short enough not to feel padded.
        await new Promise((r) => setTimeout(r, 330))
      })
      setSteps((prev) => prev.map((s) => ({ ...s, done: true, active: false })))

      const rendered = await renderPack(built)
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
      objectUrl.current = rendered.url

      setPack(built)
      setPreview({ url: rendered.url, pages: rendered.pageCount })
      setPhase('ready')
      onGenerated({ rootHash: built.rootHash, redacted: options.redact, pages: rendered.pageCount })
    } catch (e) {
      // A failed export must say so. Swallowing it would leave a reader believing a pack
      // exists when it does not.
      setError(e instanceof Error ? e.message : 'The pack could not be assembled.')
      setPhase('failed')
      push('Defensibility Pack could not be generated', 'error')
    }
  }, [record, flow, committee, options, actor, onGenerated, push])

  const download = () => {
    if (!preview || !pack) return
    const a = document.createElement('a')
    a.href = preview.url
    a.download = `${pack.caseId}-defensibility-pack${pack.options.redact ? '-redacted' : ''}.pdf`
    a.click()
    push(`${pack.caseId} pack downloaded — ${preview.pages} pages`, 'success')
  }

  return (
    <>
      <div className="pack-overlay" onClick={phase === 'assembling' ? undefined : onClose} />
      <div className="pack-dialog" role="dialog" aria-modal="true" aria-label="Generate Defensibility Pack">
        <div className="pack-head">
          <div>
            <h2>Defensibility Pack</h2>
            <p>
              A complete, court-ready record of {record.id} — chronology, clocks, constitution,
              sittings, evidence, documents, findings and access log.
            </p>
          </div>
          {phase !== 'assembling' && (
            <button type="button" className="pack-close" onClick={onClose} aria-label="Close">
              <X size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* ── Options ─────────────────────────────────────────────── */}
        {phase === 'options' && (
          <div className="pack-body">
            <div className="pack-option">
              <label className="pack-check">
                <input
                  type="checkbox"
                  checked={options.redact}
                  onChange={(e) => setOptions({ ...options, redact: e.target.checked })}
                />
                <span>
                  <span className="pack-option-title">Redact identities</span>
                  <span className="pack-option-detail">
                    Names become role aliases — Complainant A, Internal Member 1, External Member.
                    Contact details are masked at the same character width. Findings and minutes are
                    withheld rather than dotted out, because their content identifies.
                  </span>
                </span>
              </label>
            </div>

            <div className="pack-option">
              <label className="pack-check">
                <input
                  type="checkbox"
                  checked={options.includeAccessLog}
                  onChange={(e) => setOptions({ ...options, includeAccessLog: e.target.checked })}
                />
                <span>
                  <span className="pack-option-title">Include the access log</span>
                  <span className="pack-option-detail">
                    Every read and write against the case. If excluded, the pack states how many
                    records were withheld so their absence cannot be read as their non-existence.
                  </span>
                </span>
              </label>
            </div>

            <label className="wf-field pack-recipient">
              Prepared for
              <input
                className="input"
                value={options.recipient}
                onChange={(e) => setOptions({ ...options, recipient: e.target.value })}
                placeholder="Name of the person or body receiving this pack"
              />
              <span className="pack-option-detail">
                Printed into the watermark on every page, so a forwarded copy names its intended
                recipient.
              </span>
            </label>

            <div className="pack-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={generate}>
                <ShieldCheck size={14} strokeWidth={1.5} />
                Generate the pack
              </button>
            </div>
          </div>
        )}

        {/* ── Assembling ──────────────────────────────────────────── */}
        {phase === 'assembling' && (
          <div className="pack-body">
            <ol className="pack-steps" aria-live="polite">
              {steps.map((s) => (
                <li key={s.label} className={s.done ? 'done' : s.active ? 'active' : ''}>
                  <span className="pack-step-mark">
                    {s.done ? (
                      <Check size={12} strokeWidth={2.5} />
                    ) : s.active ? (
                      <Loader2 size={12} strokeWidth={2} className="pack-spin" />
                    ) : null}
                  </span>
                  {s.label}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ── Failed ──────────────────────────────────────────────── */}
        {phase === 'failed' && (
          <div className="pack-body">
            <div className="wf-blocked">
              <span>
                <strong style={{ fontWeight: 500, color: 'var(--color-primary)' }}>
                  The pack could not be assembled.
                </strong>{' '}
                {error} No export has been recorded against this case.
              </span>
            </div>
            <div className="pack-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
              <button type="button" className="btn btn-primary" onClick={generate}>
                Try again
              </button>
            </div>
          </div>
        )}

        {/* ── Ready ───────────────────────────────────────────────── */}
        {phase === 'ready' && pack && preview && (
          <div className="pack-body">
            <div className="pack-ready">
              {/*
                Section thumbnails, drawn from the pack model rather than rasterised from
                the PDF. Rasterising real pages would mean pdf.js — about a megabyte — to
                show what the reader is one click away from opening properly. These are
                page-shaped, carry each section's title and digest, and are honest about
                being a contents preview rather than a rendering. "Open the PDF" hands the
                actual document to the browser's own viewer.
              */}
              <div className="pack-preview">
                <div className="pack-thumbs">
                  <div className="pack-thumb cover">
                    <span className="pack-thumb-n">Cover</span>
                    <span className="pack-thumb-title">{pack.caseId}</span>
                    <span className="pack-thumb-sub">Defensibility Pack</span>
                    <span className="pack-thumb-rule" />
                    <span className="pack-thumb-hash">{shortHash(pack.rootHash, 6)}</span>
                  </div>
                  {pack.sections.map((s, i) => (
                    <div key={s.id} className="pack-thumb">
                      <span className="pack-thumb-n">{String(i + 1).padStart(2, '0')}</span>
                      <span className="pack-thumb-title">{s.title}</span>
                      <span className="pack-thumb-sub">
                        {s.rows.length} entr{s.rows.length === 1 ? 'y' : 'ies'}
                      </span>
                      <span className="pack-thumb-rule" />
                      <span className="pack-thumb-hash">{shortHash(s.hash, 6)}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary pack-open"
                  onClick={() => window.open(preview.url, '_blank', 'noopener')}
                >
                  <FileText size={14} strokeWidth={1.5} />
                  Open the PDF — {preview.pages} pages
                </button>
              </div>

              <div className="pack-summary">
                <div className="pack-summary-row">
                  <span>Pages</span>
                  <strong>{preview.pages}</strong>
                </div>
                <div className="pack-summary-row">
                  <span>Sections</span>
                  <strong>{pack.sections.length}</strong>
                </div>
                <div className="pack-summary-row">
                  <span>Redaction</span>
                  <strong>{pack.options.redact ? 'Redacted' : 'Unredacted'}</strong>
                </div>
                <div className="pack-summary-row">
                  <span>Access log</span>
                  <strong>{pack.options.includeAccessLog ? 'Included' : 'Excluded'}</strong>
                </div>

                <div className="pack-hash">
                  <span className="pack-hash-label">Root SHA-256</span>
                  <code>{groupHash(pack.rootHash)}</code>
                </div>

                <ul className="pack-section-list">
                  {pack.sections.map((s) => (
                    <li key={s.id}>
                      <span>{s.title}</span>
                      <code>{shortHash(s.hash, 6)}</code>
                    </li>
                  ))}
                </ul>

                <p className="pack-note">
                  <Lock size={11} strokeWidth={2} />
                  Generating this pack is recorded against the case.
                </p>
              </div>
            </div>

            <div className="pack-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setPhase('options')}>
                <FileText size={14} strokeWidth={1.5} />
                Change options
              </button>
              <button type="button" className="btn btn-primary" onClick={download}>
                <Download size={14} strokeWidth={1.5} />
                Download PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
