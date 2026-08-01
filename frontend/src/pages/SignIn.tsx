import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useRole } from '../lib/role-context'
import { ROLES, ROLE_LABEL, type Role } from '../lib/data/types'
import { USER_BY_ROLE } from '../lib/data/users'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import './SignIn.css'

export function SignInPage() {
  const { currentRole, setRole } = useRole()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useDocumentTitle('Sign in')

  /**
   * The root path always shows this screen, even with a session open.
   *
   * It used to redirect to the dashboard whenever a role was stored, which meant that
   * once you had signed in once you could never reach the sign-in screen again without
   * signing out — and picking a role is the first thing anyone wants to do here.
   *
   * That redirect was never what deep linking needed. Prompt 1 asked that a *reload of a
   * route* keeps its route and role, which `AppLayout` handles; `/` is not a route
   * somebody was on, it is the front door. So the front door stays open, and an existing
   * session is offered as a shortcut rather than imposed as a destination.
   */
  const returning = currentRole ? USER_BY_ROLE[currentRole] : null

  const enter = (role: Role) => {
    setRole(role)
    navigate('/dashboard')
  }

  // The prototype does not validate. Signing in lands on the Presiding Officer view,
  // which is the persona with the fullest access to the flagship case.
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    enter('presiding_officer')
  }

  return (
    <div className="signin">
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

          {/* An open session is a shortcut back, not a redirect past this screen. */}
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

          <div className="role-chips">
            {ROLES.map((role) => (
              <button
                key={role}
                type="button"
                className={`role-chip${role === currentRole ? ' current' : ''}`}
                onClick={() => enter(role)}
              >
                <span className="avatar sm">{USER_BY_ROLE[role].initials}</span>
                <span className="role-chip-name">{ROLE_LABEL[role]}</span>
              </button>
            ))}
          </div>
        </form>

        <p className="signin-note">
          Prototype — no backend. Your role is remembered so a shared case link survives a
          reload; this screen stays reachable at any time.
        </p>
      </section>
    </div>
  )
}
