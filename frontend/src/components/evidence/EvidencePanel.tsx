import { useEffect, useRef, useState } from 'react'
import {
  Check,
  Download,
  FileText,
  Fingerprint,
  Image as ImageIcon,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  STATE_MEANING,
  STATE_PILL,
  isPreviewable,
  mimeLabel,
  type EvidenceState,
  type VerifyResult,
} from '../../lib/evidence/model'
import { shortHash, groupHash } from '../../lib/defensibility/hash'
import { useWorkflow } from '../../lib/workflow/store'
import { useRole } from '../../lib/role-context'
import { useToast } from '../../lib/toast'
import { formatTimestamp } from '../../lib/format'
import { watermarkedDownload } from '../../lib/evidence/download'
import './Evidence.css'

/**
 * The evidence slide-over: preview, custody, integrity.
 *
 * Opening this panel is itself a read of the item, and a read is recorded — under s.16
 * the question that gets asked afterwards is who *saw* the file, not who edited it. So
 * the custody entry is written on open, not on some later explicit action.
 */
export function EvidencePanel({
  evidenceId,
  caseId,
  onClose,
}: {
  /**
   * The id, not the item.
   *
   * Passing the object captures it at click time, so admitting an item or appending a
   * custody entry updated the store while this panel went on rendering the copy it was
   * handed. The panel selects it live instead.
   */
  evidenceId: string
  caseId: string
  onClose: () => void
}) {
  const { setEvidenceState, logEvidenceAccess, checkEvidenceIntegrity, flowFor } = useWorkflow()
  const { can, currentUser, currentRole } = useRole()
  const { push } = useToast()

  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState<VerifyResult | null>(null)
  const [refusing, setRefusing] = useState(false)
  const [reason, setReason] = useState('')
  const logged = useRef(false)

  const item = flowFor(caseId)?.evidence.find((e) => e.id === evidenceId)

  const mayDecide = can('workflow:committee') || can('workflow:administer')
  const state: EvidenceState = item?.state ?? 'Submitted'

  // Once per open, not once per render — StrictMode double-invokes effects in dev and
  // would otherwise write two custody entries for a single read.
  useEffect(() => {
    if (logged.current || !item) return
    logged.current = true
    logEvidenceAccess(caseId, evidenceId, 'Previewed', `Opened ${item.label} in the preview panel.`)
  }, [caseId, evidenceId, item, logEvidenceAccess])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // After every hook, so the hook order cannot depend on whether the item resolved.
  if (!item) return null

  const verify = async () => {
    setVerifying(true)
    const result = await checkEvidenceIntegrity(caseId, evidenceId)
    setVerifying(false)
    setVerified(result)
    push(
      result?.ok ? `${item.label} — unaltered since upload` : `${item.label} — DIGEST MISMATCH`,
      result?.ok ? 'success' : 'error',
    )
  }

  const download = () => {
    watermarkedDownload({
      item,
      caseId,
      by: currentUser?.name ?? 'Unknown',
      role: currentRole ?? null,
    })
    logEvidenceAccess(caseId, evidenceId, 'Downloaded', `Downloaded ${item.label}. Copy watermarked to the downloader.`)
    push(`${item.label} downloaded — watermarked to you`, 'success')
  }

  const decide = (next: EvidenceState) => {
    if (next === 'Not admitted') {
      setRefusing(true)
      return
    }
    setEvidenceState(caseId, evidenceId, next)
    push(`${item.label} — ${next.toLowerCase()}`, 'success')
  }

  const confirmRefusal = () => {
    if (!reason.trim()) return
    setEvidenceState(caseId, evidenceId, 'Not admitted', reason)
    setRefusing(false)
    setReason('')
    push(`${item.label} not admitted — reason recorded`, 'warning')
  }

  const custody = [...(item.custody ?? [])].reverse()

  return (
    <>
      <div className="ev-overlay" onClick={onClose} />
      <aside className="ev-panel" role="dialog" aria-modal="true" aria-label={`Evidence ${item.label}`}>
        <header className="ev-panel-head">
          <div style={{ minWidth: 0 }}>
            <div className="ev-panel-title">
              {item.exhibitNo ? <span className="ev-exhibit">{item.exhibitNo}</span> : null}
              <span className={`badge ${STATE_PILL[state]}`}>{state}</span>
              <span className="meta-pill">{mimeLabel(item.mimeType ?? '')}</span>
            </div>
            <h2>{item.label}</h2>
            <p>{item.note}</p>
          </div>
          <button type="button" className="ev-close" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={1.5} />
          </button>
        </header>

        <div className="ev-panel-body">
          {/* --- Preview ------------------------------------------------ */}
          <section>
            <div className="cw-section-label">Preview</div>
            {item.objectUrl && isPreviewable(item.mimeType ?? '') ? (
              item.mimeType?.startsWith('image/') ? (
                <img className="ev-preview-img" src={item.objectUrl} alt={item.label} />
              ) : (
                <iframe className="ev-preview-frame" src={item.objectUrl} title={item.label} />
              )
            ) : (
              <div className="ev-preview-none">
                {item.mimeType?.startsWith('image/') ? (
                  <ImageIcon size={20} strokeWidth={1.5} />
                ) : (
                  <FileText size={20} strokeWidth={1.5} />
                )}
                <span>
                  {item.objectUrl
                    ? 'This file type cannot be previewed in the browser.'
                    : 'No file is attached to this fixture item. Material uploaded in this session previews here.'}
                </span>
              </div>
            )}
          </section>

          {/* --- Integrity --------------------------------------------- */}
          <section>
            <div className="cw-section-label">Integrity</div>
            <div className="ev-hash">
              <span className="ev-hash-label">SHA-256, fixed at intake</span>
              <code>{item.hash ? groupHash(item.hash) : 'Digest not yet computed'}</code>
            </div>
            <div className="ev-verify-row">
              <button type="button" className="btn btn-secondary" onClick={verify} disabled={verifying || !item.hash}>
                {verifying ? (
                  <Loader2 size={14} strokeWidth={2} className="ev-spin" />
                ) : (
                  <Fingerprint size={14} strokeWidth={1.5} />
                )}
                {verifying ? 'Recomputing…' : 'Verify integrity'}
              </button>
              {verified ? (
                <span className={`ev-verdict ${verified.ok ? 'ok' : 'bad'}`}>
                  {verified.ok ? <ShieldCheck size={14} strokeWidth={1.5} /> : <ShieldAlert size={14} strokeWidth={1.5} />}
                  {verified.ok
                    ? `Unaltered since upload · checked ${formatTimestamp(verified.checkedAt)}`
                    : 'Tamper warning — the item no longer matches its intake digest'}
                </span>
              ) : null}
            </div>
            {verified && !verified.ok ? (
              <div className="ev-mismatch">
                <div>
                  <span>Recorded</span>
                  <code>{shortHash(verified.expected, 12)}</code>
                </div>
                <div>
                  <span>Recomputed</span>
                  <code>{shortHash(verified.actual, 12)}</code>
                </div>
              </div>
            ) : null}
          </section>

          {/* --- Provenance -------------------------------------------- */}
          <section>
            <div className="cw-section-label">Provenance</div>
            <div className="ep-field-list">
              <div>
                <div className="ep-field-label">Filed by</div>
                <div className="ep-field-value">
                  {item.uploadedByName} · {item.uploadedByRole}
                </div>
              </div>
              <div>
                <div className="ep-field-label">Received</div>
                <div className="ep-field-value">{formatTimestamp(item.uploadedAt)}</div>
              </div>
              <div>
                <div className="ep-field-label">Size and type</div>
                <div className="ep-field-value">
                  {item.sizeKb} KB · {mimeLabel(item.mimeType ?? '')}
                </div>
              </div>
              <div>
                <div className="ep-field-label">Version</div>
                <div className="ep-field-value">
                  v{item.version ?? 1}
                  {item.superseded ? ' · superseded' : ''}
                  {item.supersedes ? ' · replaces an earlier item' : ''}
                </div>
              </div>
            </div>
            {item.stateReason ? (
              <div className="wf-blocked" style={{ marginTop: 'var(--space-3)' }}>
                <span>
                  <strong style={{ fontWeight: 500, color: 'var(--color-primary)' }}>Not admitted. </strong>
                  {item.stateReason}
                </span>
              </div>
            ) : null}
          </section>

          {/* --- Admission --------------------------------------------- */}
          {mayDecide && !item.superseded && (
            <section>
              <div className="cw-section-label">Admission under s.11</div>
              <p className="ev-state-meaning">{STATE_MEANING[state]}</p>
              {refusing ? (
                <div className="wf-note">
                  <span className="wf-note-label">Reason for refusing this item — recorded on the file</span>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
                  <div className="wf-note-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setRefusing(false)}>
                      Cancel
                    </button>
                    <button type="button" className="btn wf-btn-danger" onClick={confirmRefusal} disabled={!reason.trim()}>
                      Not admitted
                    </button>
                  </div>
                </div>
              ) : (
                <div className="wf-action-row">
                  {state !== 'Under review' && (
                    <button type="button" className="btn btn-secondary" onClick={() => decide('Under review')}>
                      Take under review
                    </button>
                  )}
                  {state !== 'Admitted' && (
                    <button type="button" className="btn btn-primary" onClick={() => decide('Admitted')}>
                      <Check size={14} strokeWidth={1.5} />
                      Admit to the record
                    </button>
                  )}
                  {state !== 'Not admitted' && (
                    <button type="button" className="btn wf-btn-danger" onClick={() => decide('Not admitted')}>
                      Not admitted
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {/* --- Custody ------------------------------------------------ */}
          <section>
            <div className="cw-section-label">
              Chain of custody — {custody.length} {custody.length === 1 ? 'entry' : 'entries'}
            </div>
            <div className="ev-custody">
              {custody.map((c) => (
                <div key={c.id} className="ev-custody-row">
                  <span className="ev-custody-time">{formatTimestamp(c.at)}</span>
                  <span>
                    <span className="ev-custody-action">{c.action}</span>
                    <span className="ev-custody-detail">
                      {c.actorName} · {c.actorRole} — {c.detail}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <p className="ev-append-only">
              <Lock size={11} strokeWidth={2} />
              Append-only. No role, including an administrator, can edit or remove an entry.
            </p>
          </section>
        </div>

        <footer className="ev-panel-foot">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-primary" onClick={download}>
            <Download size={14} strokeWidth={1.5} />
            Download — watermarked
          </button>
        </footer>
      </aside>
    </>
  )
}
