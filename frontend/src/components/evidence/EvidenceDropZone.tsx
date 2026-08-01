import { useCallback, useRef, useState } from 'react'
import { AlertTriangle, Loader2, Upload } from 'lucide-react'
import { useWorkflow } from '../../lib/workflow/store'
import { useToast } from '../../lib/toast'
import { MAX_UPLOAD_KB, validateUpload } from '../../lib/evidence/model'
import './Evidence.css'

/**
 * Drag-and-drop intake.
 *
 * Rejections name the file, the actual problem and the limit. That matters more here
 * than in most products: the person hitting this error may be a complainant filing
 * evidence against a statutory deadline, and "invalid file" leaves them unable to
 * comply. Accepted files are hashed before they land — see `uploadEvidence`.
 */
export function EvidenceDropZone({
  caseId,
  supplementary = false,
  supersedesId,
  label = 'Drop files here, or browse',
}: {
  caseId: string
  supplementary?: boolean
  /** Set to file a replacement; the superseded item is retained and marked. */
  supersedesId?: string
  label?: string
}) {
  const { uploadEvidence } = useWorkflow()
  const { push } = useToast()
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const input = useRef<HTMLInputElement>(null)

  const accept = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return
      const files = Array.from(list)
      const rejected: string[] = []
      const ok: Array<{ name: string; sizeKb: number; mimeType: string; objectUrl: string }> = []

      for (const f of files) {
        const problem = validateUpload(f)
        if (problem) {
          rejected.push(problem)
          continue
        }
        ok.push({
          name: f.name,
          sizeKb: Math.max(1, Math.round(f.size / 1024)),
          mimeType: f.type || 'application/octet-stream',
          // Held for the session so the item can actually be previewed. Revoked when
          // the tab closes; nothing here pretends to be durable storage.
          objectUrl: URL.createObjectURL(f),
        })
      }

      setErrors(rejected)
      if (!ok.length) return

      setBusy(true)
      await uploadEvidence(caseId, ok, { supplementary, supersedesId })
      setBusy(false)
      push(
        `${ok.length} item${ok.length === 1 ? '' : 's'} filed — digest fixed at intake`,
        'success',
      )
    },
    [caseId, supplementary, supersedesId, uploadEvidence, push],
  )

  return (
    <div>
      <div
        className={`ev-drop${over ? ' over' : ''}${busy ? ' busy' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          void accept(e.dataTransfer.files)
        }}
      >
        {busy ? (
          <Loader2 size={20} strokeWidth={1.5} className="ev-spin" />
        ) : (
          <Upload size={20} strokeWidth={1.5} />
        )}
        <span className="ev-drop-label">{busy ? 'Hashing and filing…' : label}</span>
        <span className="ev-drop-detail">
          PDF, PNG, JPEG, WebP, text, email or Word · up to {MAX_UPLOAD_KB / 1024} MB each
        </span>
        {/* Keyboard and screen-reader path — drag is never the only way in. */}
        <button type="button" className="btn btn-secondary" onClick={() => input.current?.click()} disabled={busy}>
          Browse files
        </button>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            void accept(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {errors.length > 0 && (
        <div className="ev-errors">
          {errors.map((msg) => (
            <p key={msg}>
              <AlertTriangle size={13} strokeWidth={1.5} />
              {msg}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
