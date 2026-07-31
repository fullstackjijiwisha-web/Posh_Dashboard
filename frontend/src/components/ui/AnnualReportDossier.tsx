import { useMemo, useState } from 'react'
import {
  Award,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileBadge2,
  GraduationCap,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react'
import { ANNUAL_REPORT } from '../../data/annualReport'
import './AnnualReportDossier.css'

const ICON = { size: 16, strokeWidth: 1.5 } as const
const ICON_LG = { size: 20, strokeWidth: 1.5 } as const

type FieldId =
  | 'ic-status'
  | 'ic-members'
  | 'external'
  | 'display'
  | 'awareness'
  | 'sensitisation'
  | 'challenges'
  | 'feedback'
  | 'resource'
  | 'preventive'
  | 'employees'
  | 'cases'
  | 'confidentiality'
  | 'inquiry'
  | 'pending'
  | 'upcoming'
  | 'other'

interface FieldMeta {
  id: FieldId
  n: string
  label: string
  status: 'complete' | 'gap' | 'na'
}

const FIELDS: FieldMeta[] = [
  { id: 'ic-status', n: '01', label: 'Functional IC', status: 'complete' },
  { id: 'ic-members', n: '02', label: 'IC members', status: 'complete' },
  { id: 'external', n: '03', label: 'External member', status: 'complete' },
  { id: 'display', n: '04', label: 'IC display units', status: 'complete' },
  { id: 'awareness', n: '05', label: 'Awareness workshops', status: 'complete' },
  { id: 'sensitisation', n: '06', label: 'IC sensitisation', status: 'gap' },
  { id: 'challenges', n: '07', label: 'Challenges', status: 'complete' },
  { id: 'feedback', n: '08', label: 'Feedback', status: 'complete' },
  { id: 'resource', n: '09', label: 'Resource person', status: 'complete' },
  { id: 'preventive', n: '10', label: 'Preventive measures', status: 'complete' },
  { id: 'employees', n: '11', label: 'Headcount', status: 'complete' },
  { id: 'cases', n: '12', label: 'Reported cases', status: 'complete' },
  { id: 'confidentiality', n: '13', label: 'Confidentiality', status: 'na' },
  { id: 'inquiry', n: '14', label: 'Inquiry status', status: 'na' },
  { id: 'pending', n: '15', label: 'Pending cases', status: 'na' },
  { id: 'upcoming', n: '16', label: 'Upcoming year', status: 'complete' },
  { id: 'other', n: '17', label: 'Other information', status: 'complete' },
]

interface AnnualReportDossierProps {
  /** Compact strip for embedding on the command centre. */
  variant?: 'embedded' | 'full'
}

export function AnnualReportDossier({ variant = 'full' }: AnnualReportDossierProps) {
  const r = ANNUAL_REPORT
  const [active, setActive] = useState<FieldId>('ic-status')

  const readiness = useMemo(() => {
    const scored = FIELDS.filter((f) => f.status !== 'na')
    const done = scored.filter((f) => f.status === 'complete').length
    return Math.round((done / scored.length) * 100)
  }, [])

  const gaps = FIELDS.filter((f) => f.status === 'gap')
  const activeField = FIELDS.find((f) => f.id === active) ?? FIELDS[0]

  return (
    <section className={`ard ${variant === 'embedded' ? 'ard-embedded' : ''}`}>
      {/* Hero band */}
      <div className="ard-hero">
        <div className="ard-hero-glow" aria-hidden="true" />
        <div className="ard-hero-copy">
          <div className="ard-eyebrow">
            <FileBadge2 {...ICON} />
            PoSH Act 2013 · Annual Report Submission Format
          </div>
          <h2 className="ard-title">Statutory annual return</h2>
          <p className="ard-sub">
            FY {r.year} · Workplace filing dossier for the District Officer — every field from the
            official submission format, rendered live.
          </p>
          <div className="ard-hero-actions">
            <button type="button" className="btn btn-primary">
              <Download {...ICON} />
              Export for filing
            </button>
            <span className="ard-chip">
              <Sparkles size={12} strokeWidth={2} />
              17 statutory fields
            </span>
          </div>
        </div>

        <div className="ard-readiness" aria-label={`Submission readiness ${readiness}%`}>
          <svg viewBox="0 0 120 120" className="ard-ring">
            <circle cx="60" cy="60" r="52" className="ard-ring-track" />
            <circle
              cx="60"
              cy="60"
              r="52"
              className="ard-ring-fill"
              style={{
                strokeDasharray: `${(readiness / 100) * 326.7} 326.7`,
              }}
            />
          </svg>
          <div className="ard-ring-label">
            <strong>{readiness}%</strong>
            <span>filing ready</span>
          </div>
        </div>
      </div>

      {/* Signal tiles */}
      <div className="ard-signals">
        <div className="ard-signal ard-signal-ok">
          <Shield {...ICON_LG} />
          <div>
            <span className="ard-signal-k">Internal Committee</span>
            <strong>Functional</strong>
          </div>
        </div>
        <div className="ard-signal">
          <Users {...ICON_LG} />
          <div>
            <span className="ard-signal-k">Employees covered</span>
            <strong>
              {r.employees.total}
              <em>
                {' '}
                · {r.employees.male}M / {r.employees.female}F
              </em>
            </strong>
          </div>
        </div>
        <div className="ard-signal ard-signal-zero">
          <ClipboardList {...ICON_LG} />
          <div>
            <span className="ard-signal-k">Reported cases</span>
            <strong>
              {r.reportedCases}
              <em> this year</em>
            </strong>
          </div>
        </div>
        <div className="ard-signal">
          <GraduationCap {...ICON_LG} />
          <div>
            <span className="ard-signal-k">Awareness sessions</span>
            <strong>
              {r.awarenessWorkshops.count}
              <em> virtual</em>
            </strong>
          </div>
        </div>
      </div>

      {gaps.length > 0 && (
        <div className="ard-gap-banner">
          <span className="ard-gap-pulse" aria-hidden="true" />
          <div>
            <strong>Open filing item</strong>
            <p>
              Field 06 — IC sensitisation workshops recorded as none. Plan sessions before the next
              District Officer submission.
            </p>
          </div>
          <button type="button" className="ard-gap-btn" onClick={() => setActive('sensitisation')}>
            Review field 06
          </button>
        </div>
      )}

      {/* IC constellation */}
      <div className="ard-constellation">
        <div className="ard-section-head">
          <h3>Internal Committee constellation</h3>
          <p>Names disclosed for the annual return · Field 02</p>
        </div>
        <div className="ard-members">
          {r.icMembers.map((m, i) => {
            const isExternal = m.designation.toLowerCase().includes('external')
            const isPO = m.designation.toLowerCase().includes('presiding')
            return (
              <article
                key={m.sno}
                className={`ard-member ${isPO ? 'ard-member-po' : ''} ${isExternal ? 'ard-member-ext' : ''}`}
                style={{ '--i': i } as React.CSSProperties}
              >
                <div className="ard-member-orbit" aria-hidden="true" />
                <div className="ard-member-avatar">
                  {m.name
                    .replace(/^Ms\.\s*/i, '')
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="ard-member-body">
                  <div className="ard-member-role">
                    {isPO ? 'Presiding Officer' : isExternal ? 'External Member' : 'Internal Member'}
                  </div>
                  <div className="ard-member-name">{m.name}</div>
                  <div className="ard-member-contact mono">{m.contact}</div>
                  {isExternal && r.externalMembers[0] && (
                    <div className="ard-member-xp">
                      <Award size={12} strokeWidth={2} />
                      {r.externalMembers[0].experienceYears} years in PoSH law
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {/* Interactive field navigator + detail pane */}
      <div className="ard-dossier">
        <div className="ard-nav">
          <div className="ard-section-head">
            <h3>Submission fields</h3>
            <p>Tap a field to inspect the filed answer</p>
          </div>
          <div className="ard-field-rail" role="tablist" aria-label="Annual report fields">
            {FIELDS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active === f.id}
                className={`ard-field-chip ${active === f.id ? 'active' : ''} ard-status-${f.status}`}
                onClick={() => setActive(f.id)}
              >
                <span className="ard-field-n">{f.n}</span>
                <span className="ard-field-l">{f.label}</span>
                <span className={`ard-field-dot ard-dot-${f.status}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="ard-pane" role="tabpanel">
          <div className="ard-pane-head">
            <span className="ard-pane-n">Field {activeField.n}</span>
            <h3>{activeField.label}</h3>
            <span className={`badge ${activeField.status === 'complete' ? 'badge-completed' : activeField.status === 'gap' ? 'badge-overdue' : 'badge-low'}`}>
              {activeField.status === 'complete' ? 'Filed' : activeField.status === 'gap' ? 'Gap' : 'N/A'}
            </span>
          </div>
          <div className="ard-pane-body">{renderField(active, r)}</div>
        </div>
      </div>

      {/* Resource person spotlight */}
      <div className="ard-spotlight">
        <div className="ard-spotlight-mark">
          <Users {...ICON_LG} />
        </div>
        <div>
          <div className="ard-eyebrow">Field 09 · Resource person</div>
          <h3>{r.resourcePerson.name}</h3>
          <p>{r.resourcePerson.credentials}</p>
        </div>
      </div>

      <footer className="ard-foot">
        <CheckCircle2 size={14} strokeWidth={1.5} className="text-accent" />
        <span>{r.createdBy}</span>
      </footer>
    </section>
  )
}

function renderField(id: FieldId, r: typeof ANNUAL_REPORT) {
  switch (id) {
    case 'ic-status':
      return (
        <div className="ard-answer-rich">
          <div className="ard-yes">
            <CheckCircle2 {...ICON} />
            Yes — functional Internal Committee
          </div>
          <p>{r.functionalIcNote}</p>
        </div>
      )
    case 'ic-members':
      return (
        <ul className="ard-list">
          {r.icMembers.map((m) => (
            <li key={m.sno}>
              <strong>{m.name}</strong>
              <span>
                {m.designation} · {m.contact}
              </span>
            </li>
          ))}
        </ul>
      )
    case 'external':
      return (
        <ul className="ard-list">
          {r.externalMembers.map((m) => (
            <li key={m.sno}>
              <strong>{m.name}</strong>
              <span>
                {m.organization !== '—' ? `${m.organization} · ` : ''}
                {m.experienceYears} years in PoSH laws · {m.contact}
              </span>
            </li>
          ))}
        </ul>
      )
    case 'display':
      return <p className="ard-prose">{r.displayLocations}</p>
    case 'awareness':
      return (
        <div className="ard-answer-rich">
          <p className="ard-prose">{r.awarenessWorkshops.notes}</p>
          <a className="ard-link" href={r.awarenessWorkshops.url} target="_blank" rel="noreferrer">
            <ExternalLink {...ICON} />
            {r.awarenessWorkshops.url}
          </a>
          <div className="ard-mini">
            Mode: {r.awarenessWorkshops.mode} · Audience: {r.awarenessWorkshops.audience}
          </div>
        </div>
      )
    case 'sensitisation':
      return (
        <div className="ard-answer-rich">
          <p className="ard-prose">{r.sensitizationWorkshops.notes}</p>
          <div className="ard-mini ard-mini-warn">
            {r.sensitizationWorkshops.count} sessions recorded — schedule IC sensitisation before
            the next filing cycle.
          </div>
        </div>
      )
    case 'challenges':
      return <p className="ard-prose">{r.challenges}</p>
    case 'feedback':
      return <p className="ard-prose">{r.feedback}</p>
    case 'resource':
      return (
        <div className="ard-answer-rich">
          <strong className="ard-name">{r.resourcePerson.name}</strong>
          <p className="ard-prose">{r.resourcePerson.credentials}</p>
        </div>
      )
    case 'preventive':
      return <p className="ard-prose">{r.preventiveMeasures}</p>
    case 'employees':
      return (
        <div className="ard-emp">
          <div>
            <span>Total</span>
            <strong>{r.employees.total}</strong>
          </div>
          <div>
            <span>Male</span>
            <strong>{r.employees.male}</strong>
          </div>
          <div>
            <span>Female</span>
            <strong>{r.employees.female}</strong>
          </div>
          <div>
            <span>Others</span>
            <strong>{r.employees.others}</strong>
          </div>
        </div>
      )
    case 'cases':
      return (
        <div className="ard-cases-zero">
          <span className="ard-zero-figure">{r.reportedCases}</span>
          <p>No sexual harassment complaints were reported in FY {r.year}.</p>
        </div>
      )
    case 'confidentiality':
      return <p className="ard-prose">{r.confidentialityMeasures}</p>
    case 'inquiry':
      return <p className="ard-prose">{r.inquiryStatus}</p>
    case 'pending':
      return <p className="ard-prose">{r.pendingCases}</p>
    case 'upcoming':
      return <p className="ard-prose">{r.upcomingInitiatives}</p>
    case 'other':
      return <p className="ard-prose">{r.otherInfo}</p>
    default:
      return null
  }
}
