/**
 * The template composer.
 *
 * Three columns, left to right: the library, the fields a human still has to fill, and
 * the letter as it will read. The preview is live because the point of the screen is that
 * you can see what you are about to serve on somebody before you serve it.
 *
 * Two rules shape everything here.
 *
 * STANDING RULE 3 — nothing in this component writes legal prose. The letters come from
 * `lib/documents/templates.ts`, whose provisions and dates are computed from the statutory
 * calculators the compliance clocks already use. Where a template needs a fact only a
 * human knows — the allegation as put, the measure recommended — it is a required merge
 * field, and the composer refuses to file until it is filled.
 *
 * s.16 — party names reach this screen through `maskParty`, exactly as everywhere else.
 * A drafter who cannot see identities drafts against the masked label, and the letter that
 * gets filed carries the masked label. That is deliberate: the alternative is a component
 * that quietly re-reveals what the role provider withheld.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, FileText, Info, X } from 'lucide-react'
import {
  TEMPLATES,
  deriveValues,
  missingRequired,
  renderPlain,
  type Audience,
  type MergeContext,
} from '../../lib/documents/templates'
import { useRole } from '../../lib/role-context'
import { useWorkflow } from '../../lib/workflow/store'
import { useToast } from '../../lib/toast'
import { userById } from '../../lib/data/users'
import { ROLE_LABEL, type Case } from '../../lib/data/types'
import type { CaseFlow } from '../../lib/workflow/types'
import './Documents.css'

const ICON = { size: 15, strokeWidth: 1.5 } as const

/** Library order — intake first, then the inquiry, then the outcome. */
const GROUPS: Array<{ label: string; audiences: Audience[] }> = [
  { label: 'On receipt', audiences: ['Complainant'] },
  { label: 'During the inquiry', audiences: ['Respondent', 'Witness'] },
  { label: 'To the employer', audiences: ['Employer'] },
]

interface Props {
  record: Case
  flow: CaseFlow
  onClose: () => void
  /** Called with the new document id once it is filed, so the caller can chain to issue. */
  onFiled?: (documentId: string) => void
}

export function DocumentComposer({ record, flow, onClose, onFiled }: Props) {
  const { maskParty, currentUser, currentRole } = useRole()
  const { committeeById, fileDocument } = useWorkflow()
  const { push } = useToast()

  const [templateId, setTemplateId] = useState<string>(TEMPLATES[0].id)
  const [values, setValues] = useState<Record<string, string>>({})
  const [filing, setFiling] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]

  /** The committee as it will be printed at the foot of a report. */
  const committee = useMemo(() => {
    const board = flow.committeeId ? committeeById(flow.committeeId) : null
    if (!board) return []
    return board.memberIds.map((id) => {
      const u = userById(id)
      if (!u) return id
      const seat = id === board.presidingOfficerId ? 'Presiding Officer' : ROLE_LABEL[u.role]
      return `${u.name} — ${seat}`
    })
  }, [flow.committeeId, committeeById])

  const presidingOfficer = useMemo(() => {
    const board = flow.committeeId ? committeeById(flow.committeeId) : null
    return (board && userById(board.presidingOfficerId)?.name) || 'The Presiding Officer'
  }, [flow.committeeId, committeeById])

  const base = useMemo<Omit<MergeContext, 'values'>>(
    () => ({
      record,
      flow,
      complainant: maskParty(record.complainant),
      respondent: maskParty(record.respondent),
      committee,
      presidingOfficer,
      sender: currentUser?.name ?? 'Sentinel',
      senderRole: currentRole ? ROLE_LABEL[currentRole] : 'System',
    }),
    [record, flow, maskParty, committee, presidingOfficer, currentUser, currentRole],
  )

  /**
   * Switching template refills from the case. Anything the sender typed under the previous
   * template belonged to that template's fields, so carrying it across would be wrong.
   *
   * Keyed on the template id and not on `base`. `base` closes over the flow, whose object
   * identity changes on any store write — a notification arriving mid-draft would
   * otherwise wipe everything the sender had typed.
   */
  const filledFor = useRef<string | null>(null)
  useEffect(() => {
    if (filledFor.current === template.id) return
    filledFor.current = template.id
    setValues(deriveValues(template, base))
  }, [template, base])

  const ctx: MergeContext = useMemo(() => ({ ...base, values }), [base, values])
  const blocks = useMemo(() => {
    try {
      return template.build(ctx)
    } catch {
      return [{ body: 'This template could not be rendered against the current case record.' }]
    }
  }, [template, ctx])

  const missing = missingRequired(template, values)

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

  const file = async () => {
    if (missing.length || filing) return
    setFiling(true)
    try {
      const id = await fileDocument(record.id, {
        templateId: template.id,
        title: template.title,
        audience: template.audience,
        body: renderPlain(template, ctx),
        values,
      })
      push(`${template.title} filed on ${record.id}`, 'success')
      onFiled?.(id)
      onClose()
    } finally {
      setFiling(false)
    }
  }

  const set = (id: string, value: string) => setValues((v) => ({ ...v, [id]: value }))

  return (
    <>
      <div className="doc-overlay" onClick={onClose} aria-hidden="true" />
      <div
        className="doc-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Draft a document on case ${record.id}`}
        tabIndex={-1}
        ref={dialogRef}
        onKeyDown={onKeyDown}
      >
        <div className="doc-head">
          <div>
            <h2>Draft from template</h2>
            <p>
              Dates and provisions are computed from the case record, so a notice cannot state
              a deadline the compliance clocks disagree with. The fields marked required are the
              facts only you can supply.
            </p>
          </div>
          <button type="button" className="doc-close" onClick={onClose} aria-label="Close the composer">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="doc-body">
          {/* ─── Library ─── */}
          <div className="doc-col">
            <span className="doc-col-label">Library · {TEMPLATES.length} documents</span>
            {GROUPS.map((g) => {
              const items = TEMPLATES.filter((t) => g.audiences.includes(t.audience))
              if (!items.length) return null
              return (
                <div key={g.label} className="flex flex-col gap-2">
                  <span className="doc-group-head">{g.label}</span>
                  {items.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`doc-template${t.id === templateId ? ' active' : ''}`}
                      aria-pressed={t.id === templateId}
                      onClick={() => setTemplateId(t.id)}
                    >
                      <span className="doc-template-title">
                        {t.id === templateId && <Check size={13} strokeWidth={2} className="doc-template-tick" />}
                        {t.title}
                      </span>
                      <span className="doc-template-cite">{t.cite}</span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>

          {/* ─── Fields ─── */}
          <div className="doc-col">
            <span className="doc-col-label">Merge fields</span>
            <p className="text-12 text-muted" style={{ lineHeight: 1.6 }}>
              {template.purpose}
            </p>
            {template.fields.map((f) => (
              <label key={f.id} className="doc-field">
                <span className="doc-field-label">
                  {f.label}
                  {f.required && <span className="doc-req">Required</span>}
                </span>
                {f.long ? (
                  <textarea
                    className="input"
                    value={values[f.id] ?? ''}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.id, e.target.value)}
                  />
                ) : (
                  <input
                    className="input"
                    value={values[f.id] ?? ''}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.id, e.target.value)}
                  />
                )}
                {f.derive && (
                  <span className="doc-derived">
                    <Info size={11} strokeWidth={1.5} />
                    Prefilled from the case record — edit if it is wrong.
                  </span>
                )}
              </label>
            ))}
          </div>

          {/* ─── Preview ─── */}
          <div className="doc-col preview">
            <span className="doc-col-label">As it will read</span>

            {missing.length > 0 && (
              <p className="text-12 text-muted" style={{ lineHeight: 1.7 }}>
                Still to complete before this can be filed:{' '}
                {missing.map((f) => (
                  <span key={f.id} className="doc-gap">
                    {f.label}
                  </span>
                ))}
              </p>
            )}

            <article className="doc-sheet">
              {blocks.map((b, i) => (
                <div key={i}>
                  {b.heading && <h3>{b.heading}</h3>}
                  <p>{b.body}</p>
                </div>
              ))}
            </article>
          </div>
        </div>

        <div className="doc-foot">
          <span className="doc-foot-note">
            Filing hashes the letter and puts it in the case vault. It is not sent to anyone until
            you issue it, and it is never edited afterwards — a correction is a fresh document.
          </span>
          <div className="doc-foot-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={file}
              disabled={missing.length > 0 || filing}
              title={missing.length ? `${missing.length} required field(s) outstanding` : undefined}
            >
              <FileText {...ICON} />
              {filing ? 'Filing…' : 'File in the vault'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
