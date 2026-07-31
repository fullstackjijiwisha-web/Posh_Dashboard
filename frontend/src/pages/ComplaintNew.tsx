import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  Check,
  FileText,
  Lock,
  Search,
  ShieldCheck,
  Upload,
  X,
  ArrowLeft,
} from 'lucide-react'
import { useRole } from '../lib/role-context'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { formatDate } from '../lib/format'
import './ComplaintNew.css'

const ICON = { size: 16, strokeWidth: 1.5 } as const
const ICON_SM = { size: 14, strokeWidth: 1.5 } as const

const STEPS = [
  { n: 1, label: 'What happened' },
  { n: 2, label: 'When and where' },
  { n: 3, label: 'People involved' },
  { n: 4, label: 'Supporting material' },
  { n: 5, label: 'Review and submit' },
] as const

const CATEGORIES = [
  'Verbal conduct',
  'Physical conduct',
  'Written or electronic',
  'Quid pro quo',
  'Hostile work environment',
  'Other',
] as const

const LOCATIONS = [
  'Bengaluru — Whitefield',
  'Mumbai — Andheri East',
  'Pune — Hinjawadi',
  'Delhi — Nehru Place',
  'Gurugram — Cyber City',
  'Hyderabad — Gachibowli',
  'Chennai — Taramani',
  'Kolkata — Salt Lake',
  'Virtual / remote',
  'Offsite / client location',
]

const DIRECTORY = [
  { name: 'Kabir Ahluwalia', department: 'Engineering' },
  { name: 'Manish Oberoi', department: 'Sales' },
  { name: 'Rohit Kaushik', department: 'Customer Success' },
  { name: 'Suresh Iyengar', department: 'Finance' },
  { name: 'Gaurav Sethi', department: 'Engineering' },
  { name: 'Nikhil Barua', department: 'Marketing' },
]

interface AttachedFile {
  id: string
  name: string
  sizeKb: number
  ext: string
}

interface FormState {
  narrative: string
  category: string
  incidentDate: string
  ongoing: boolean
  location: string
  withholdNames: boolean
  respondentName: string
  respondentDept: string
  witnesses: string
  files: AttachedFile[]
  conciliation: 'conciliation' | 'inquiry' | null
  confirmed: boolean
}

const INITIAL: FormState = {
  narrative: '',
  category: '',
  incidentDate: '',
  ongoing: false,
  location: '',
  withholdNames: false,
  respondentName: '',
  respondentDept: '',
  witnesses: '',
  files: [
    { id: 'f1', name: 'email_thread_export.eml', sizeKb: 248, ext: 'eml' },
    { id: 'f2', name: 'message_screenshots.pdf', sizeKb: 1120, ext: 'pdf' },
  ],
  conciliation: null,
  confirmed: false,
}

/** Matches an open registered case so confirmation deep-links work for all roles. */
const NEXT_CASE_ID = 'POSH-2026-0158'
/** Employee demo persona owns the flagship case — confirmation must deep-link there. */
const EMPLOYEE_CASE_ID = 'POSH-2026-0142'

function stepValid(step: number, form: FormState): { ok: boolean; hint: string } {
  if (step === 1) {
    if (form.narrative.trim().length < 20) {
      return { ok: false, hint: 'Please share a short account (at least a few sentences).' }
    }
    if (!form.category) return { ok: false, hint: 'Select a category to continue.' }
    return { ok: true, hint: '' }
  }
  if (step === 2) {
    if (!form.incidentDate) return { ok: false, hint: 'Choose an incident date.' }
    if (!form.location) return { ok: false, hint: 'Select a location.' }
    return { ok: true, hint: '' }
  }
  if (step === 3) {
    if (form.withholdNames) return { ok: true, hint: '' }
    if (form.respondentName.trim().length < 2) {
      return { ok: false, hint: 'Enter a respondent name, or choose not to name anyone.' }
    }
    return { ok: true, hint: '' }
  }
  if (step === 4) return { ok: true, hint: '' }
  if (step === 5) {
    if (!form.conciliation) return { ok: false, hint: 'Choose conciliation or a formal inquiry.' }
    if (!form.confirmed) return { ok: false, hint: 'Confirm the declaration before submitting.' }
    return { ok: true, hint: '' }
  }
  return { ok: false, hint: '' }
}

export function ComplaintNewPage() {
  const { currentRole, signOut } = useRole()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL)
  const [dirOpen, setDirOpen] = useState(false)
  const [dirQ, setDirQ] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const dirRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useDocumentTitle(submitted ? 'Complaint registered' : 'File a complaint')

  const dirMatches = useMemo(() => {
    const q = dirQ.trim().toLowerCase()
    if (!q) return DIRECTORY
    return DIRECTORY.filter(
      (d) => d.name.toLowerCase().includes(q) || d.department.toLowerCase().includes(q),
    )
  }, [dirQ])

  // Close directory on outside click
  useEffect(() => {
    if (!dirOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!dirRef.current?.contains(e.target as Node)) setDirOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [dirOpen])

  // Reset hint when step or form validity changes
  useEffect(() => {
    setShowHint(false)
  }, [step, form])

  const validation = stepValid(step, form)
  const canContinue = validation.ok

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  if (!currentRole) return <Navigate to="/" replace />

  const isEmployee = currentRole === 'employee'
  const caseIdForConfirm = isEmployee ? EMPLOYEE_CASE_ID : NEXT_CASE_ID

  const goNext = () => {
    if (!canContinue) {
      setShowHint(true)
      return
    }
    setStep((s) => Math.min(5, s + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    setStep((s) => Math.max(1, s - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToStep = (n: number) => {
    // Only allow jumping to completed steps or current
    if (n < step) {
      setStep(n)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canContinue) {
      setShowHint(true)
      return
    }
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const removeFile = (id: string) =>
    setForm((f) => ({ ...f, files: f.files.filter((x) => x.id !== id) }))

  const addFilesFromList = (list: FileList | null) => {
    if (!list?.length) return
    const extras: AttachedFile[] = Array.from(list).map((file, i) => {
      const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'file'
      return {
        id: `up-${Date.now()}-${i}`,
        name: file.name,
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
        ext,
      }
    })
    setForm((f) => ({ ...f, files: [...f.files, ...extras] }))
  }

  const shell = (children: ReactNode) => (
    <div className="cn">
      <ComplaintShell
        onSignOut={signOut}
        showWorkspace={!isEmployee}
        onWorkspace={() => navigate('/dashboard')}
      >
        {children}
      </ComplaintShell>
    </div>
  )

  if (submitted) {
    return shell(
      <div className="cn-confirm rise">
        <div className="cn-confirm-icon">
          <Check size={22} strokeWidth={2} />
        </div>
        <h1>Your complaint has been registered</h1>
        <p className="cn-confirm-lead">
          Thank you for coming forward. Your submission is confidential and access-logged.
        </p>
        <div className="cn-case-id">{caseIdForConfirm}</div>
        <p className="cn-case-caption">Your Case ID — keep this for your records</p>

        <div className="cn-next">
          <h2>What happens next</h2>
          <ol>
            <li>
              <span>Acknowledgement issued</span>
              <strong>Immediately</strong>
            </li>
            <li>
              <span>Internal Committee assigned</span>
              <strong>Within 3 working days</strong>
            </li>
            <li>
              <span>Notice served on respondent</span>
              <strong>Within 7 working days</strong>
            </li>
            <li>
              <span>Inquiry completion</span>
              <strong>Within 90 days</strong>
            </li>
          </ol>
        </div>

        <p className="cn-only-ic">
          <Lock {...ICON_SM} />
          Only the Internal Committee can view this complaint.
        </p>

        <div className="cn-confirm-actions">
          <Link to={`/cases/${caseIdForConfirm}`} className="btn btn-primary">
            View my case status
          </Link>
          {!isEmployee && (
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/cases')}>
              Go to cases
            </button>
          )}
          {!isEmployee && (
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
              Return to workspace
            </button>
          )}
          {isEmployee && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSubmitted(false)
                setStep(1)
                setForm(INITIAL)
              }}
            >
              File another complaint
            </button>
          )}
        </div>
      </div>,
    )
  }

  return shell(
    <>
      <div className="cn-conf">
        <Lock {...ICON} />
        <p>
          This complaint is visible only to the Internal Committee. Your line manager, HR and
          colleagues cannot see it. Every access to this record is logged.
        </p>
      </div>

      <nav className="cn-steps" aria-label="Complaint steps">
        {STEPS.map((s, idx) => {
          const done = step > s.n
          const current = step === s.n
          return (
            <div key={s.n} className="cn-step-wrap">
              <button
                type="button"
                className={`cn-step ${done ? 'done' : ''} ${current ? 'current' : ''}`}
                disabled={!done && !current}
                onClick={() => goToStep(s.n)}
                aria-current={current ? 'step' : undefined}
              >
                <span className="cn-step-dot">
                  {done ? <Check size={12} strokeWidth={2.5} /> : s.n}
                </span>
                <span className="cn-step-label">{s.label}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <span className={`cn-step-connector ${done ? 'done' : ''}`} aria-hidden="true" />
              )}
            </div>
          )
        })}
      </nav>

      <form className="cn-panel rise" onSubmit={onSubmit} noValidate>
        {step === 1 && (
          <section className="cn-section">
            <h1>What happened</h1>
            <p className="cn-lead">
              Describe what took place in your own words. You do not need legal language — clarity
              and honesty are enough.
            </p>
            <label className="cn-field">
              <span className="cn-label">Your account</span>
              <textarea
                className="cn-textarea"
                rows={8}
                placeholder="Take your time. Share what you are comfortable sharing — dates, places, and what was said or done. You can add more detail later."
                value={form.narrative}
                onChange={(e) => set('narrative', e.target.value)}
              />
              <span className="cn-char">
                {form.narrative.trim().length < 20
                  ? `${Math.max(0, 20 - form.narrative.trim().length)} more characters needed`
                  : 'Ready to continue'}
              </span>
            </label>
            <label className="cn-field">
              <span className="cn-label">Category</span>
              <select
                className="select"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </section>
        )}

        {step === 2 && (
          <section className="cn-section">
            <h1>When and where</h1>
            <p className="cn-lead">Approximate dates are fine if you are unsure of the exact day.</p>
            <div className="cn-grid-2">
              <label className="cn-field">
                <span className="cn-label">Incident date</span>
                <input
                  className="input"
                  type="date"
                  value={form.incidentDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set('incidentDate', e.target.value)}
                />
              </label>
              <div className="cn-toggle-row">
                <span>
                  <span className="cn-label">Is this ongoing?</span>
                  <span className="cn-hint">The conduct has continued beyond a single incident</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.ongoing}
                  className={`cn-switch ${form.ongoing ? 'on' : ''}`}
                  onClick={() => set('ongoing', !form.ongoing)}
                >
                  <span className="cn-switch-knob" />
                </button>
              </div>
            </div>
            <label className="cn-field">
              <span className="cn-label">Location</span>
              <select
                className="select"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
              >
                <option value="">Select a location</option>
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <p className="cn-note">
              A complaint should ordinarily be filed within three months of the incident. The
              Internal Committee may extend this period.
            </p>
          </section>
        )}

        {step === 3 && (
          <section className="cn-section">
            <h1>People involved</h1>
            <p className="cn-lead">
              Naming someone helps the committee act promptly — but you are not required to name
              anyone at this stage.
            </p>

            <label className="cn-check">
              <input
                type="checkbox"
                checked={form.withholdNames}
                onChange={(e) => {
                  const on = e.target.checked
                  setForm((f) => ({
                    ...f,
                    withholdNames: on,
                    ...(on
                      ? { respondentName: '', respondentDept: '', witnesses: '' }
                      : null),
                  }))
                  setDirOpen(false)
                }}
              />
              <span>I would prefer not to name anyone at this stage</span>
            </label>

            <div className={`cn-people ${form.withholdNames ? 'disabled' : ''}`} aria-disabled={form.withholdNames}>
              <div className="cn-field" ref={dirRef}>
                <span className="cn-label">Respondent name</span>
                <div className="cn-dir">
                  <input
                    className="input"
                    type="text"
                    placeholder="Full name"
                    disabled={form.withholdNames}
                    value={form.respondentName}
                    onChange={(e) => {
                      set('respondentName', e.target.value)
                      setDirQ(e.target.value)
                      setDirOpen(true)
                    }}
                    onFocus={() => {
                      if (!form.withholdNames) setDirOpen(true)
                    }}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="cn-dir-btn"
                    disabled={form.withholdNames}
                    onClick={() => setDirOpen((o) => !o)}
                  >
                    <Search {...ICON_SM} />
                    Search directory
                  </button>
                </div>
                {dirOpen && !form.withholdNames && (
                  <div className="cn-dir-panel" role="listbox">
                    {dirMatches.length === 0 ? (
                      <div className="cn-dir-empty">No directory matches — you can still type a name.</div>
                    ) : (
                      dirMatches.map((d) => (
                        <button
                          key={d.name}
                          type="button"
                          className="cn-dir-item"
                          role="option"
                          onClick={() => {
                            setForm((f) => ({
                              ...f,
                              respondentName: d.name,
                              respondentDept: d.department,
                            }))
                            setDirQ(d.name)
                            setDirOpen(false)
                          }}
                        >
                          <strong>{d.name}</strong>
                          <span>{d.department}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <label className="cn-field">
                <span className="cn-label">Their department</span>
                <input
                  className="input"
                  type="text"
                  placeholder="Department"
                  disabled={form.withholdNames}
                  value={form.respondentDept}
                  onChange={(e) => set('respondentDept', e.target.value)}
                />
              </label>
              <label className="cn-field">
                <span className="cn-label">Witnesses (optional)</span>
                <textarea
                  className="cn-textarea cn-textarea-sm"
                  rows={3}
                  placeholder="Names of anyone who may have observed the incident"
                  disabled={form.withholdNames}
                  value={form.witnesses}
                  onChange={(e) => set('witnesses', e.target.value)}
                />
              </label>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="cn-section">
            <h1>Supporting material</h1>
            <p className="cn-lead">
              Attach anything that helps the committee understand what happened. Nothing is required
              to file.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.eml,.msg,.doc,.docx,.txt"
              className="cn-file-input"
              onChange={(e) => {
                addFilesFromList(e.target.files)
                e.target.value = ''
              }}
            />

            <div
              className={`cn-drop ${dragOver ? 'over' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                addFilesFromList(e.dataTransfer.files)
              }}
            >
              <Upload {...ICON} />
              <div>
                <strong>Drop files here, or click to browse</strong>
                <span>PDF, images, email exports · encrypted at rest</span>
              </div>
            </div>

            <ul className="cn-files">
              {form.files.map((f) => (
                <li key={f.id}>
                  <div className={`cn-file-ico ${f.ext === 'pdf' ? 'pdf' : 'other'}`}>
                    <FileText size={14} strokeWidth={1.5} />
                  </div>
                  <div className="cn-file-meta">
                    <strong>{f.name}</strong>
                    <span>
                      {f.sizeKb >= 1024 ? `${(f.sizeKb / 1024).toFixed(1)} MB` : `${f.sizeKb} KB`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="cn-file-remove"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => removeFile(f.id)}
                  >
                    <X {...ICON_SM} />
                  </button>
                </li>
              ))}
            </ul>
            <p className="cn-note">
              Files are encrypted and access-logged. You may add more at any time.
            </p>
          </section>
        )}

        {step === 5 && (
          <section className="cn-section">
            <h1>Review and submit</h1>
            <p className="cn-lead">
              Please check your details. You can go back to edit before submitting.
            </p>

            <dl className="cn-summary">
              <div>
                <dt>What happened</dt>
                <dd>{form.narrative}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{form.category}</dd>
              </div>
              <div>
                <dt>Incident date</dt>
                <dd>
                  {form.incidentDate ? formatDate(form.incidentDate) : '—'}
                  {form.ongoing ? ' · Ongoing' : ''}
                </dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{form.location || '—'}</dd>
              </div>
              <div>
                <dt>Respondent</dt>
                <dd>
                  {form.withholdNames
                    ? 'Not named at this stage'
                    : `${form.respondentName}${form.respondentDept ? ` · ${form.respondentDept}` : ''}`}
                </dd>
              </div>
              {!form.withholdNames && form.witnesses.trim() ? (
                <div>
                  <dt>Witnesses</dt>
                  <dd>{form.witnesses}</dd>
                </div>
              ) : null}
              <div>
                <dt>Attachments</dt>
                <dd>
                  {form.files.length ? form.files.map((f) => f.name).join(', ') : 'None attached'}
                </dd>
              </div>
            </dl>

            <h2 className="cn-subhead">How would you like to proceed?</h2>
            <div className="cn-cards" role="radiogroup" aria-label="Proceeding choice">
              <button
                type="button"
                role="radio"
                aria-checked={form.conciliation === 'conciliation'}
                className={`cn-choice ${form.conciliation === 'conciliation' ? 'selected' : ''}`}
                onClick={() => set('conciliation', 'conciliation')}
              >
                <strong>Request conciliation first</strong>
                <span>
                  Under Section 10, you may request conciliation before a formal inquiry. No monetary
                  settlement can be made.
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={form.conciliation === 'inquiry'}
                className={`cn-choice ${form.conciliation === 'inquiry' ? 'selected' : ''}`}
                onClick={() => set('conciliation', 'inquiry')}
              >
                <strong>Proceed directly to formal inquiry</strong>
                <span>
                  The Internal Committee will begin the inquiry process under the PoSH Act.
                </span>
              </button>
            </div>

            <label className="cn-check cn-check-final">
              <input
                type="checkbox"
                checked={form.confirmed}
                onChange={(e) => set('confirmed', e.target.checked)}
              />
              <span>
                I confirm that the information I have provided is true to the best of my knowledge,
                and I understand this complaint will be handled confidentially by the Internal
                Committee.
              </span>
            </label>
          </section>
        )}

        {showHint && !canContinue && (
          <p className="cn-error" role="alert">
            {validation.hint}
          </p>
        )}

        <div className="cn-nav">
          <button type="button" className="btn btn-secondary" disabled={step === 1} onClick={goBack}>
            Back
          </button>
          {step < 5 ? (
            <button type="button" className="btn btn-primary" onClick={goNext}>
              Continue
            </button>
          ) : (
            <button type="submit" className="btn btn-primary">
              Submit complaint
            </button>
          )}
        </div>
      </form>
    </>,
  )
}

function ComplaintShell({
  children,
  onSignOut,
  showWorkspace,
  onWorkspace,
}: {
  children: ReactNode
  onSignOut: () => void
  showWorkspace?: boolean
  onWorkspace?: () => void
}) {
  return (
    <div className="cn-shell">
      <header className="cn-top">
        <div className="cn-brand">
          <span className="cn-mark">
            <ShieldCheck size={15} strokeWidth={1.5} />
          </span>
          <div>
            <div className="cn-brand-title">Sentinel</div>
            <div className="cn-brand-sub">Confidential complaint channel</div>
          </div>
        </div>
        <div className="cn-top-actions">
          {showWorkspace && onWorkspace ? (
            <button type="button" className="btn btn-secondary" onClick={onWorkspace}>
              <ArrowLeft {...ICON_SM} />
              Back to workspace
            </button>
          ) : null}
          <button type="button" className="btn btn-secondary" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>
      <main className="cn-main">{children}</main>
    </div>
  )
}
