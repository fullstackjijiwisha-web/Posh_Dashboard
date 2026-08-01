import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useRole } from '../lib/role-context'
import { ROLES, ROLE_LABEL, type Role } from '../lib/data/types'
import { USER_BY_ROLE } from '../lib/data/users'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import './SignIn.css'

/** One line under each demo role — turns the login into a permission-model explainer. */
const ROLE_BLURB: Record<Role, string> = {
  employee: 'Own case only — tracker, documents, help. Never sees the respondent’s identity.',
  hr_spoc: 'Intake desk and the s.19 duty register. No inquiry content.',
  posh_admin: 'Filing ingest, statutory workspace, hearings, analytics and audit.',
  presiding_officer: 'Cause list, quorum instruments, and carriage of the inquiry.',
  ic_member: 'Inquiry queue, attendance, and the tasks assigned to you.',
  external_member: 'Oversight of the cases you sit on — evidence, documents, recommendations.',
  management: 'The compliance command centre, and nothing else. No party names.',
  super_admin: 'Admin console plus provisioning and company settings. Never adjudicates.',
}

export function SignInPage() {
  const { currentRole, setRole } = useRole()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selecting, setSelecting] = useState<Role | null>(null)
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useDocumentTitle('Sign in')

  useEffect(() => {
    return () => {
      if (navTimer.current) clearTimeout(navTimer.current)
    }
  }, [])

  const returning = currentRole ? USER_BY_ROLE[currentRole] : null

  const enter = (role: Role) => {
    setSelecting(role)
    setRole(role)
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    navTimer.current = setTimeout(
      () => navigate('/dashboard'),
      reduced ? 0 : 420,
    )
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    enter('presiding_officer')
  }

  return (
    <div className={`signin${selecting ? ' is-entering' : ''}`}>
      <aside className="signin-panel">
        <div className="signin-brand">
          <span className="signin-mark">
            <ShieldCheck size={16} strokeWidth={1.5} />
          </span>
          <span className="signin-wordmark">Sentinel</span>
        </div>

        <div className="signin-copy">
          <h1>Statutory case management for Internal Committees.</h1>
          <p>
            Every complaint tracked against its PoSH Act deadlines, with an audit trail that
            records who read what, and party identities withheld from anyone who does not need
            them.
          </p>
        </div>

        <div className="signin-foot">
          <span>PoSH Act 2013</span>
          <span>·</span>
          <span>SOC 2 compliant</span>
          <span>·</span>
          <span>Access logged</span>
        </div>
      </aside>

      <section className="signin-form-wrap">
        <form className="signin-card" onSubmit={onSubmit}>
          <h2>Sign in</h2>
          <p>Use your work account to continue.</p>

          <label className="field">
            Work email
            <input
              className="input"
              type="email"
              placeholder="name@company.co.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="field">
            Password
            <input
              className="input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>
            Sign in
          </button>

          {returning && currentRole && (
            <div className="signin-resume">
              <span className="avatar sm">{returning.initials}</span>
              <span className="signin-resume-text">
                Still signed in as <strong>{returning.name}</strong>
                <span>{ROLE_LABEL[currentRole]}</span>
              </span>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                Continue
              </button>
            </div>
          )}

          <div className="demo-divider">
            <span>Demo — sign in as</span>
          </div>

          <div className="role-chips" role="list">
            {ROLES.map((role, i) => {
              const selected = selecting === role
              const dimmed = selecting !== null && !selected
              return (
                <button
                  key={role}
                  type="button"
                  role="listitem"
                  className={`role-chip rise${role === currentRole ? ' current' : ''}${selected ? ' selected' : ''}${dimmed ? ' dimmed' : ''}`}
                  style={{ ['--i' as string]: i }}
                  onClick={() => enter(role)}
                  disabled={selecting !== null}
                  aria-describedby={`role-blurb-${role}`}
                >
                  <span className="avatar sm">{USER_BY_ROLE[role].initials}</span>
                  <span className="role-chip-body">
                    <span className="role-chip-name">{ROLE_LABEL[role]}</span>
                    <span className="role-chip-blurb" id={`role-blurb-${role}`}>
                      {ROLE_BLURB[role]}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </form>

        <p className="signin-note">
          Prototype — no backend. Your role is remembered so a shared case link survives a
          reload; this screen stays reachable at any time. Press <kbd>?</kbd> after signing in
          for keyboard shortcuts.
        </p>
      </section>
    </div>
  )
}
