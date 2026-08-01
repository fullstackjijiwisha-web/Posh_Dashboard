/**
 * The confirm step before anything leaves the building.
 *
 * A notice served on the wrong person, or served before the committee meant it to go, is
 * not recoverable by deleting a row. So issuing is deliberately two movements: read the
 * letter as it stands, then tick that you have read it. The tick is not decoration — the
 * issue button stays disabled until it is set, and the record of who issued it, to whom,
 * by what channel and when is written into the document's custody trail.
 *
 * The letter itself is never editable here. It was hashed when it was filed; if it is
 * wrong, the answer is a fresh document, not a quiet amendment to the one on record.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, ShieldCheck, X } from 'lucide-react'
import { useWorkflow } from '../../lib/workflow/store'
import { useToast } from '../../lib/toast'
import { shortHash } from '../../lib/defensibility/hash'
import type { GeneratedDocument } from '../../lib/workflow/types'
import './Documents.css'

const CHANNELS = ['Email', 'Letter', 'Portal notice', 'In person'] as const
type Channel = (typeof CHANNELS)[number]

/** Recipients are named by their part in the proceedings, never by identity. */
const RECIPIENTS = ['Complainant', 'Respondent', 'Witness', 'The Employer', 'Internal Committee']

interface Props {
  caseId: string
  doc: GeneratedDocument
  onClose: () => void
}

export function IssueDialog({ caseId, doc, onClose }: Props) {
  const { issueDocument } = useWorkflow()
  const { push } = useToast()

  const suggested = RECIPIENTS.includes(doc.audience) ? doc.audience : RECIPIENTS[0]
  const [to, setTo] = useState(suggested)
  const [channel, setChannel] = useState<Channel>('Email')
  const [read, setRead] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    },
    [onClose],
  )

  const issue = () => {
    if (!read) return
    issueDocument(caseId, doc.id, to, channel)
    push(`${doc.title} issued to the ${to.toLowerCase()}`, 'success')
    onClose()
  }

  return (
    <>
      <div className="doc-overlay" onClick={onClose} aria-hidden="true" />
      <div
        className="doc-dialog narrow"
        role="dialog"
        aria-modal="true"
        aria-label={`Issue ${doc.title}`}
        tabIndex={-1}
        ref={dialogRef}
        onKeyDown={onKeyDown}
      >
        <div className="doc-head">
          <div>
            <h2>Issue {doc.title.toLowerCase()}</h2>
            <p>
              Read what is going out. Once issued, this document is on the record as served, and
              the time, channel and recipient go into its custody trail.
            </p>
          </div>
          <button type="button" className="doc-close" onClick={onClose} aria-label="Close without issuing">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="doc-col" style={{ borderRight: 'none', gap: 'var(--space-4)' }}>
          <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
            <label className="doc-field" style={{ flex: '1 1 180px' }}>
              <span className="doc-field-label">Recipient</span>
              <select className="select" value={to} onChange={(e) => setTo(e.target.value)}>
                {RECIPIENTS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="doc-field" style={{ flex: '1 1 180px' }}>
              <span className="doc-field-label">Channel</span>
              <select
                className="select"
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <span className="doc-col-label">The document, as filed</span>
            <article className="doc-sheet" style={{ marginTop: 'var(--space-2)', maxHeight: 280, overflowY: 'auto' }}>
              <p>{doc.body}</p>
            </article>
            <p className="doc-hash" style={{ marginTop: 'var(--space-2)', display: 'block' }}>
              <ShieldCheck size={11} strokeWidth={1.5} style={{ verticalAlign: -1 }} /> Digest{' '}
              {shortHash(doc.hash)} · fixed when it was filed
            </p>
          </div>

          <label className="min-attendee" style={{ padding: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} />
            <span style={{ lineHeight: 1.55 }}>
              I have read this document and it is what should go to the {to.toLowerCase()}.
            </span>
          </label>
        </div>

        <div className="doc-foot">
          <span className="doc-foot-note">Nothing is sent until you confirm.</span>
          <div className="doc-foot-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={issue} disabled={!read}>
              <Send size={15} strokeWidth={1.5} />
              Issue
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
