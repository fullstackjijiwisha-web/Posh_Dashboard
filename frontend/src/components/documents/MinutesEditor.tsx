/**
 * Minutes of a sitting.
 *
 * A minute book is not a notes app. Three things follow from that, and they are the three
 * things this editor is built around:
 *
 *   · ATTRIBUTION. Submissions and questions are recorded line by line against the person
 *     who spoke. "The committee discussed the allegations" is not a record of anything.
 *   · QUORUM. The attendance list is the input to the s.4 sitting test, and the result is
 *     frozen into the minutes at the moment they are taken. A sitting later found to have
 *     been inquorate must show as inquorate in its own minutes.
 *   · IMMUTABILITY. Finalising locks the text and hashes it. A later change does not edit
 *     the locked version — it opens a new one that supersedes it, and both stay on the
 *     file, because the version the committee signed off is the version that matters if
 *     the finding is challenged.
 *
 * No legal wording is generated here. Every word in a set of minutes is typed by the
 * person taking them; the editor supplies the structure and the clocks, nothing else.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, History, Lock, PenLine, Plus, Send, Trash2, X } from 'lucide-react'
import { useRole } from '../../lib/role-context'
import { useWorkflow } from '../../lib/workflow/store'
import { useToast } from '../../lib/toast'
import { sittingQuorumTests, allMet } from '../../lib/workflow/quorum'
import { shortHash } from '../../lib/defensibility/hash'
import { userById } from '../../lib/data/users'
import { ROLE_LABEL, type Case } from '../../lib/data/types'
import { formatTimestamp } from '../../lib/format'
import type { CaseFlow, HearingMinutes, MinuteLine, MinutesSection } from '../../lib/workflow/types'
import './Documents.css'

const ICON = { size: 15, strokeWidth: 1.5 } as const

/**
 * The standing headings. Fixed rather than free-form, because the value of a minute book
 * is that every sitting is recorded the same way and a reader knows where to look.
 */
const SECTIONS: Array<{ id: string; heading: string; hint: string; lines: boolean }> = [
  { id: 'matters', heading: 'Matters considered', hint: 'What the sitting took up.', lines: false },
  { id: 'submissions', heading: 'Submissions', hint: 'What each party put to the committee, attributed.', lines: true },
  { id: 'questions', heading: 'Questions put', hint: 'Questions asked, and by whom.', lines: true },
  { id: 'adjournments', heading: 'Adjournments', hint: 'Any adjournment, and the reason for it.', lines: false },
  { id: 'directions', heading: 'Directions', hint: 'What the committee directed before rising.', lines: false },
]

const blankSections = (): MinutesSection[] =>
  SECTIONS.map((s) => ({ id: s.id, heading: s.heading, body: '', lines: [] }))

interface Props {
  record: Case
  flow: CaseFlow
  hearing: { id: string; at: string; title: string; attendeeIds?: string[] }
  onClose: () => void
}

export function MinutesEditor({ record, flow, hearing, onClose }: Props) {
  const { can, currentUser } = useRole()
  const { committeeById, saveMinutes, finaliseMinutes, reviseMinutes, circulateMinutes, confirmMinutes } =
    useWorkflow()
  const { push } = useToast()

  const dialogRef = useRef<HTMLDivElement>(null)
  const editable = can('workflow:committee')

  /** Every version taken for this sitting, oldest first. */
  const versions = useMemo(
    () => (flow.minutes ?? []).filter((m) => m.hearingId === hearing.id).sort((a, b) => a.version - b.version),
    [flow.minutes, hearing.id],
  )

  const latest = versions[versions.length - 1] ?? null
  const [activeId, setActiveId] = useState<string | null>(latest?.id ?? null)
  const active = versions.find((m) => m.id === activeId) ?? latest

  /** The board sitting on this case — the only people who can be marked present. */
  const panel = useMemo(() => {
    const board = flow.committeeId ? committeeById(flow.committeeId) : null
    if (!board) return []
    return board.memberIds
      .map((id) => userById(id))
      .filter(Boolean)
      .map((u) => ({
        id: u!.id,
        name: u!.name,
        seat: u!.id === board.presidingOfficerId ? 'Presiding Officer' : ROLE_LABEL[u!.role],
      }))
  }, [flow.committeeId, committeeById])

  /* ---- the working draft ---------------------------------------------- */

  const makeDraft = useCallback((): HearingMinutes => {
    const now = new Date().toISOString()
    const finals = versions.filter((m) => m.status === 'Final')
    return {
      id: `${record.id}-min-${Date.now()}`,
      caseId: record.id,
      hearingId: hearing.id,
      version: finals.length + 1,
      status: 'Draft',
      sections: blankSections(),
      // Seeded from the attendance the sitting was listed with, then corrected by hand.
      present: hearing.attendeeIds?.filter((id) => panel.some((p) => p.id === id)) ?? panel.map((p) => p.id),
      apologies: [],
      quorumMet: false,
      createdAt: now,
      updatedAt: now,
      finalisedAt: null,
      finalisedBy: null,
      hash: null,
      confirmations: [],
      circulatedAt: null,
      supersedes: finals.length ? finals[finals.length - 1].id : null,
    }
  }, [record.id, hearing.id, hearing.attendeeIds, panel, versions])

  const [draft, setDraft] = useState<HearingMinutes>(() => {
    const openDraft = versions.find((m) => m.status === 'Draft')
    return openDraft ?? makeDraft()
  })
  const [dirty, setDirty] = useState(false)

  // When the reader picks a different version, load it. Only drafts are editable, so a
  // final version simply renders read-only.
  useEffect(() => {
    if (active && active.status === 'Draft' && active.id !== draft.id) {
      setDraft(active)
      setDirty(false)
    }
  }, [active, draft.id])

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

  /* ---- quorum ---------------------------------------------------------- */

  const tests = useMemo(() => sittingQuorumTests(draft.present), [draft.present])
  const quorum = allMet(tests)

  /* ---- editing --------------------------------------------------------- */

  const showing = active && active.status === 'Final' ? active : draft
  const locked = showing.status === 'Final'

  const touch = (next: Partial<HearingMinutes>) => {
    setDraft((d) => ({ ...d, ...next }))
    setDirty(true)
  }

  const togglePresent = (id: string) => {
    const present = draft.present.includes(id)
      ? draft.present.filter((p) => p !== id)
      : [...draft.present, id]
    touch({ present, apologies: panel.map((p) => p.id).filter((p) => !present.includes(p)) })
  }

  const setBody = (sectionId: string, body: string) =>
    touch({ sections: draft.sections.map((s) => (s.id === sectionId ? { ...s, body } : s)) })

  const addLine = (sectionId: string) =>
    touch({
      sections: draft.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              lines: [
                ...s.lines,
                { id: `${sectionId}-${Date.now()}`, speaker: '', speakerRole: '', text: '' } as MinuteLine,
              ],
            }
          : s,
      ),
    })

  const setLine = (sectionId: string, lineId: string, patch: Partial<MinuteLine>) =>
    touch({
      sections: draft.sections.map((s) =>
        s.id === sectionId
          ? { ...s, lines: s.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) }
          : s,
      ),
    })

  const removeLine = (sectionId: string, lineId: string) =>
    touch({
      sections: draft.sections.map((s) =>
        s.id === sectionId ? { ...s, lines: s.lines.filter((l) => l.id !== lineId) } : s,
      ),
    })

  /** Speaker options: the panel, plus the parties by their part in the proceedings. */
  const speakers = [
    ...panel.map((p) => ({ value: p.name, role: p.seat })),
    { value: 'Complainant', role: 'Party' },
    { value: 'Respondent', role: 'Party' },
    { value: 'Witness', role: 'Witness' },
  ]

  const hasContent = draft.sections.some((s) => s.body.trim() || s.lines.some((l) => l.text.trim()))

  /* ---- actions --------------------------------------------------------- */

  const save = () => {
    saveMinutes(record.id, { ...draft, quorumMet: quorum })
    setActiveId(draft.id)
    setDirty(false)
    push('Draft minutes saved', 'success')
  }

  const finalise = async () => {
    if (!hasContent) return
    saveMinutes(record.id, { ...draft, quorumMet: quorum })
    await finaliseMinutes(record.id, draft.id)
    setActiveId(draft.id)
    setDirty(false)
    push(`Minutes v${draft.version} finalised and locked`, 'success')
  }

  const revise = () => {
    if (!showing || showing.status !== 'Final') return
    const id = reviseMinutes(record.id, showing.id)
    if (!id) return
    setActiveId(id)
    push(`Version ${showing.version + 1} opened — the signed-off version is kept`, 'info')
  }

  const circulate = () => {
    if (!showing) return
    circulateMinutes(record.id, showing.id)
    push('Circulated to the bench for confirmation', 'success')
  }

  const myConfirmation = currentUser
    ? showing.confirmations.find((c) => c.memberId === currentUser.id)
    : undefined
  const onPanel = currentUser ? panel.some((p) => p.id === currentUser.id) : false

  /* ---------------------------------------------------------------------- */

  return (
    <>
      <div className="doc-overlay" onClick={onClose} aria-hidden="true" />
      <div
        className="doc-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Minutes of the sitting on ${formatTimestamp(hearing.at)}`}
        tabIndex={-1}
        ref={dialogRef}
        onKeyDown={onKeyDown}
      >
        <div className="doc-head">
          <div>
            <h2>Minutes of the sitting</h2>
            <p>
              {record.id} · {hearing.title} · {formatTimestamp(hearing.at)}
              {locked && ` · version ${showing.version}, locked`}
            </p>
          </div>
          <button type="button" className="doc-close" onClick={onClose} aria-label="Close the minutes">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="min-body">
          {/* ─── Attendance, quorum, versions ─── */}
          <div className="doc-col">
            <span className="doc-col-label">Attendance</span>
            {panel.length === 0 && (
              <p className="text-12 text-muted">No board is carrying this case yet.</p>
            )}
            {panel.map((p) => {
              const isPresent = showing.present.includes(p.id)
              return (
                <label key={p.id} className="min-attendee">
                  <input
                    type="checkbox"
                    checked={isPresent}
                    disabled={locked || !editable}
                    onChange={() => togglePresent(p.id)}
                  />
                  <span>{p.name}</span>
                  <span className="min-attendee-role">{p.seat}</span>
                </label>
              )
            })}

            <span className="doc-col-label" style={{ marginTop: 'var(--space-2)' }}>
              Quorum for this sitting
            </span>
            {(locked ? sittingQuorumTests(showing.present) : tests).map((t) => (
              <div key={t.label} className="min-confirmation">
                {t.met ? (
                  <Check size={13} strokeWidth={2} style={{ color: 'var(--color-accent)' }} />
                ) : (
                  <X size={13} strokeWidth={2} style={{ color: 'var(--color-warning)' }} />
                )}
                <span>
                  {t.label} — {t.met ? 'met' : 'not met'}
                </span>
              </div>
            ))}

            {versions.length > 0 && (
              <>
                <span className="doc-col-label" style={{ marginTop: 'var(--space-2)' }}>
                  <History size={11} strokeWidth={1.5} style={{ verticalAlign: -1 }} /> Versions
                </span>
                {versions.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`min-version${m.id === showing.id ? ' active' : ''}`}
                    aria-pressed={m.id === showing.id}
                    onClick={() => setActiveId(m.id)}
                  >
                    {m.status === 'Final' ? <Lock size={11} strokeWidth={1.5} /> : <PenLine size={11} strokeWidth={1.5} />}
                    <span>
                      v{m.version} · {m.status}
                    </span>
                    {m.hash && <span className="doc-hash" style={{ marginLeft: 'auto' }}>{shortHash(m.hash)}</span>}
                  </button>
                ))}
              </>
            )}

            {showing.circulatedAt && (
              <>
                <span className="doc-col-label" style={{ marginTop: 'var(--space-2)' }}>
                  Confirmations
                </span>
                {panel.map((p) => {
                  const c = showing.confirmations.find((x) => x.memberId === p.id)
                  return (
                    <div key={p.id} className="min-confirmation">
                      {c?.confirmed ? (
                        <Check size={13} strokeWidth={2} style={{ color: 'var(--color-accent)' }} />
                      ) : (
                        <span aria-hidden="true" style={{ width: 13, textAlign: 'center' }}>·</span>
                      )}
                      <span>
                        {p.name} — {c ? (c.confirmed ? 'confirmed' : 'queried') : 'awaiting'}
                      </span>
                    </div>
                  )
                })}
              </>
            )}
          </div>

          {/* ─── The record ─── */}
          <div className="doc-col">
            {locked && (
              <div className="min-locked">
                <Lock size={13} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Version {showing.version} was finalised by {showing.finalisedBy} on{' '}
                  {showing.finalisedAt ? formatTimestamp(showing.finalisedAt) : '—'} and is locked.
                  Digest {showing.hash ? shortHash(showing.hash) : '—'}. To change anything, open a
                  new version — this one stays on the file.
                </span>
              </div>
            )}

            {SECTIONS.map((meta) => {
              const section = showing.sections.find((s) => s.id === meta.id) ?? {
                id: meta.id,
                heading: meta.heading,
                body: '',
                lines: [],
              }
              return (
                <section key={meta.id} className="min-section">
                  <div className="min-section-head">
                    <h4>{meta.heading}</h4>
                    <span className="min-section-hint">{meta.hint}</span>
                  </div>

                  {meta.lines ? (
                    <>
                      {section.lines.length === 0 && locked && (
                        <p className="text-12 text-muted">Nothing recorded under this heading.</p>
                      )}
                      {section.lines.map((l) =>
                        locked ? (
                          <p key={l.id} className="min-read">
                            <strong>{l.speaker || 'Unattributed'}</strong>
                            {l.speakerRole ? ` (${l.speakerRole})` : ''}: {l.text}
                          </p>
                        ) : (
                          <div key={l.id} className="min-line">
                            <select
                              className="select"
                              value={l.speaker}
                              aria-label="Speaker"
                              onChange={(e) => {
                                const s = speakers.find((x) => x.value === e.target.value)
                                setLine(meta.id, l.id, { speaker: e.target.value, speakerRole: s?.role ?? '' })
                              }}
                            >
                              <option value="">Who spoke…</option>
                              {speakers.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.value}
                                </option>
                              ))}
                            </select>
                            <textarea
                              className="input"
                              value={l.text}
                              placeholder="What was said, in the words of the record."
                              onChange={(e) => setLine(meta.id, l.id, { text: e.target.value })}
                            />
                            <button
                              type="button"
                              className="min-line-remove"
                              aria-label="Remove this line"
                              onClick={() => removeLine(meta.id, l.id)}
                            >
                              <Trash2 size={13} strokeWidth={1.5} />
                            </button>
                          </div>
                        ),
                      )}
                      {!locked && editable && (
                        <button type="button" className="btn btn-secondary" onClick={() => addLine(meta.id)}>
                          <Plus size={13} strokeWidth={1.5} />
                          Add a line
                        </button>
                      )}
                    </>
                  ) : locked ? (
                    <p className="min-read">{section.body || 'Nothing recorded under this heading.'}</p>
                  ) : (
                    <textarea
                      className="input"
                      style={{ minHeight: 76, resize: 'vertical', lineHeight: 1.6 }}
                      value={section.body}
                      disabled={!editable}
                      placeholder={meta.hint}
                      onChange={(e) => setBody(meta.id, e.target.value)}
                    />
                  )}
                </section>
              )
            })}
          </div>
        </div>

        <div className="doc-foot">
          <span className="doc-foot-note">
            {locked
              ? 'A finalised set is never edited. Revising opens a new version and keeps this one.'
              : quorum
                ? 'Quorum is met for this sitting. Finalising locks the text and fixes its digest.'
                : 'Quorum is not met on the attendance as recorded. You may still finalise — the minutes will show the sitting as inquorate, which is the honest record.'}
          </span>
          <div className="doc-foot-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>

            {locked && editable && (
              <>
                {!showing.circulatedAt && (
                  <button type="button" className="btn btn-secondary" onClick={circulate}>
                    <Send {...ICON} />
                    Circulate for confirmation
                  </button>
                )}
                {showing.circulatedAt && onPanel && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      confirmMinutes(record.id, showing.id, !myConfirmation?.confirmed)
                      push(
                        myConfirmation?.confirmed
                          ? 'Confirmation withdrawn — recorded as queried'
                          : 'Confirmed as an accurate record',
                        'success',
                      )
                    }}
                  >
                    <Check {...ICON} />
                    {myConfirmation?.confirmed ? 'Withdraw confirmation' : 'Confirm as accurate'}
                  </button>
                )}
                <button type="button" className="btn btn-primary" onClick={revise}>
                  <PenLine {...ICON} />
                  Open a new version
                </button>
              </>
            )}

            {!locked && editable && (
              <>
                <button type="button" className="btn btn-secondary" onClick={save} disabled={!dirty}>
                  Save draft
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={finalise}
                  disabled={!hasContent}
                  title={hasContent ? undefined : 'Record something before finalising'}
                >
                  <Lock {...ICON} />
                  Finalise and lock
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
