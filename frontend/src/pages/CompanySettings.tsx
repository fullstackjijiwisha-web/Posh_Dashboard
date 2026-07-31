import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Check, Lock, ScrollText, ShieldCheck, Users } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { CoverageRing, FigureTile } from '../components/workflow/Dials'
import { constitutionTests, allMet } from '../lib/workflow/quorum'
import { ANNUAL_REPORT } from '../data/annualReport'
import { COMPLIANCE } from '../data/mock'
import { LOCATIONS } from '../lib/data/cases'
import { formatNumber } from '../lib/format'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/workflow/Dials.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

/**
 * Company settings — the owner's policy surface.
 *
 * Distinct from System settings, and the distinction matters. System settings configures
 * the software: roles, workflow, retention mechanics. This configures the *organisation's
 * position under the Act* — how long the committee's term runs, where the policy is
 * displayed, who the District Officer is, what the escalation path looks like. Those are
 * the employer's decisions, and s.19 makes the employer answerable for them personally.
 *
 * Changes are held locally for the session. This is a prototype and nothing here writes
 * to a real policy register — the screen says so rather than implying otherwise.
 */
export function CompanySettingsPage() {
  const { committees, admins } = useWorkflow()
  const { can } = useRole()

  const mayEdit = can('edit:settings')

  const [profile, setProfile] = useState({
    name: 'Meridian Technologies Private Limited',
    cin: 'U72900KA2014PTC076231',
    registered: 'Bengaluru — Whitefield',
    sites: String(LOCATIONS.length),
  })

  const [policy, setPolicy] = useState({
    icTermYears: '3',
    conciliationOffered: true,
    anonymousIntake: true,
    retentionYears: '7',
    appealWindowDays: '90',
    displayLocations: ANNUAL_REPORT.displayLocations || 'All site notice boards and the intranet',
    districtOfficer: 'District Officer, Bengaluru Urban',
    sheBoxRegistered: true,
  })

  const [saved, setSaved] = useState(false)
  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2400)
  }

  const boardsValid = committees.length > 0 && committees.every((b) => allMet(constitutionTests(b.memberIds)))

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Company settings</h1>
          <p>
            The organisation’s position under the PoSH Act — committee term, policy display,
            retention, and who the return is filed with. Distinct from system settings, which
            configures the software rather than the employer.
          </p>
        </div>
        {mayEdit && (
          <button type="button" className="btn btn-primary" onClick={save}>
            {saved ? <Check {...ICON} /> : <ShieldCheck {...ICON} />}
            {saved ? 'Saved for this session' : 'Save changes'}
          </button>
        )}
      </div>

      <div className="figure-grid">
        <FigureTile label="Workforce" value={formatNumber(COMPLIANCE.totalEmployees)} meta={`${LOCATIONS.length} sites`} />
        <FigureTile
          label="Committee boards"
          value={committees.length}
          tone={boardsValid ? 'accent' : 'warning'}
          meta={boardsValid ? 'All satisfy s.4' : 'One falls short of s.4'}
        />
        <FigureTile label="POSH Admins" value={admins.length} meta="Provisioned by the owner" />
        <FigureTile
          label="Awareness coverage"
          value={`${COMPLIANCE.trainingCoveragePct}%`}
          meta={`${formatNumber(COMPLIANCE.trainedEmployees)} employees`}
          aside={<CoverageRing value={COMPLIANCE.trainingCoveragePct} caption="covered" size={72} />}
        />
      </div>

      <div className="ep-grid">
        {/* ── Company profile ──────────────────────────────────── */}
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <Building2 size={15} strokeWidth={1.5} />
              Company profile
            </span>
          </div>
          <div className="ep-card-body">
            <div className="wf-form">
              <label className="wf-field">
                Registered name
                <input
                  className="input"
                  value={profile.name}
                  disabled={!mayEdit}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </label>
              <div className="wf-form-row">
                <label className="wf-field">
                  Corporate identity number
                  <input
                    className="input mono"
                    value={profile.cin}
                    disabled={!mayEdit}
                    onChange={(e) => setProfile({ ...profile, cin: e.target.value })}
                  />
                </label>
                <label className="wf-field">
                  Registered office
                  <select
                    className="select"
                    value={profile.registered}
                    disabled={!mayEdit}
                    onChange={(e) => setProfile({ ...profile, registered: e.target.value })}
                  >
                    {LOCATIONS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="text-12 text-muted" style={{ lineHeight: 1.6 }}>
                An employer with ten or more employees must constitute an Internal Committee at
                every office or administrative unit — a single committee at head office does not
                discharge the duty across {LOCATIONS.length} sites.
              </p>
            </div>
          </div>
        </section>

        {/* ── Statutory policy ─────────────────────────────────── */}
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <ScrollText size={15} strokeWidth={1.5} />
              Statutory policy
            </span>
            <span className="meta-pill">PoSH Act 2013</span>
          </div>
          <div className="ep-card-body">
            <div className="wf-form">
              <div className="wf-form-row">
                <label className="wf-field">
                  Committee term (years)
                  <select
                    className="select"
                    value={policy.icTermYears}
                    disabled={!mayEdit}
                    onChange={(e) => setPolicy({ ...policy, icTermYears: e.target.value })}
                  >
                    {['1', '2', '3'].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: 10, color: 'var(--color-tertiary-text)', textTransform: 'none', letterSpacing: 0 }}>
                    s.4(3) — not more than three
                  </span>
                </label>
                <label className="wf-field">
                  Record retention (years)
                  <input
                    className="input"
                    type="number"
                    min={3}
                    value={policy.retentionYears}
                    disabled={!mayEdit}
                    onChange={(e) => setPolicy({ ...policy, retentionYears: e.target.value })}
                  />
                </label>
                <label className="wf-field">
                  Appeal window (days)
                  <input
                    className="input"
                    type="number"
                    value={policy.appealWindowDays}
                    disabled={!mayEdit}
                    onChange={(e) => setPolicy({ ...policy, appealWindowDays: e.target.value })}
                  />
                  <span style={{ fontSize: 10, color: 'var(--color-tertiary-text)', textTransform: 'none', letterSpacing: 0 }}>
                    s.18 — 90 days
                  </span>
                </label>
              </div>

              <label className="wf-field">
                Policy display locations
                <input
                  className="input"
                  value={policy.displayLocations}
                  disabled={!mayEdit}
                  onChange={(e) => setPolicy({ ...policy, displayLocations: e.target.value })}
                />
                <span style={{ fontSize: 10, color: 'var(--color-tertiary-text)', textTransform: 'none', letterSpacing: 0 }}>
                  s.19(b) — displayed at a conspicuous place
                </span>
              </label>

              <label className="wf-field">
                District Officer
                <input
                  className="input"
                  value={policy.districtOfficer}
                  disabled={!mayEdit}
                  onChange={(e) => setPolicy({ ...policy, districtOfficer: e.target.value })}
                />
                <span style={{ fontSize: 10, color: 'var(--color-tertiary-text)', textTransform: 'none', letterSpacing: 0 }}>
                  s.21 — annual return filed within 30 days of the financial year end
                </span>
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {(
                  [
                    ['conciliationOffered', 'Offer conciliation before inquiry', 's.10 — at the complainant’s request only'],
                    ['anonymousIntake', 'Allow identity to be withheld from the workplace', 's.16 — the committee must still know'],
                    ['sheBoxRegistered', 'Committee registered on SHe-Box', 'Central government portal'],
                  ] as const
                ).map(([key, label, note]) => (
                  <label
                    key={key}
                    style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: 10, alignItems: 'start', cursor: mayEdit ? 'pointer' : 'default' }}
                  >
                    <input
                      type="checkbox"
                      checked={policy[key]}
                      disabled={!mayEdit}
                      onChange={(e) => setPolicy({ ...policy, [key]: e.target.checked })}
                      style={{ marginTop: 3 }}
                    />
                    <span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', display: 'block' }}>
                        {label}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--color-tertiary-text)' }}>{note}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Escalation and delegation ────────────────────────────── */}
      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">
            <Users size={15} strokeWidth={1.5} />
            Delegation
          </span>
          <Link to="/employees" className="text-13" style={{ color: 'var(--color-accent)' }}>
            Manage accounts
          </Link>
        </div>
        <div className="ep-card-body">
          <div className="ep-field-list">
            <div>
              <div className="ep-field-label">Process administered by</div>
              <div className="ep-field-value">{admins.map((a) => a.name).join(', ') || 'Nobody provisioned'}</div>
              <div className="text-12 text-faint" style={{ marginTop: 2 }}>
                Only the owner can provision or revoke a POSH Admin.
              </div>
            </div>
            <div>
              <div className="ep-field-label">Committee constituted by</div>
              <div className="ep-field-value">The POSH Admin, on the owner’s authority</div>
            </div>
            <div>
              <div className="ep-field-label">Owner sits on inquiries</div>
              <div className="ep-field-value" style={{ color: 'var(--color-accent)' }}>
                No — by design
              </div>
              <div className="text-12 text-faint" style={{ marginTop: 2 }}>
                An employer adjudicating complaints against its own workplace is the conflict the
                external member exists to prevent.
              </div>
            </div>
            <div>
              <div className="ep-field-label">Escalation beyond the committee</div>
              <div className="ep-field-value">Appeal to the appellate authority under s.18</div>
            </div>
          </div>
        </div>
      </section>

      <p className="ep-confidential">
        <Lock size={12} strokeWidth={2} />
        {mayEdit
          ? 'Prototype — changes are held in this session only and are not written to a policy register. Every change to company policy would be recorded in the audit trail.'
          : 'Company policy is set by the Company Owner. Your role can read these settings but not change them.'}
      </p>
    </div>
  )
}
