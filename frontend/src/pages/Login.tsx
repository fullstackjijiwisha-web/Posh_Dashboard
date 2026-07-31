import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ChevronLeft, Eye, EyeOff, Shield } from 'lucide-react'
import { DEMO_USERS } from '../data/mock'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import './Login.css'

const ICON = { size: 16, strokeWidth: 1.5 } as const

export function LoginPage() {
  const { user, pendingEmail, login, demoLogin, verifyMfa, backToLogin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')

  useDocumentTitle('Sign in')

  if (user) return <Navigate to="/dashboard" replace />

  const onContinue = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Enter an email address and password.')
      return
    }
    login(email, password)
  }

  const onVerify = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!verifyMfa(otp)) setError('Enter a 6-digit code.')
  }

  return (
    <div className="login-page">
      <aside className="login-hero">
        <div className="hero-inner">
          <div className="hero-icon">
            <Shield size={16} strokeWidth={1.5} />
          </div>
          <h1>Sentinel</h1>
          <p>
            Prevention of Sexual Harassment case management for Internal Committees.
          </p>
        </div>
        <div className="hero-foot">
          <span>SOC 2 compliant</span>
          <span>·</span>
          <span>256-bit encryption</span>
          <span>·</span>
          <span>PoSH Act 2013</span>
        </div>
      </aside>

      <section className="login-panel">
        {!pendingEmail ? (
          <form className="login-card" onSubmit={onContinue}>
            <h2>Sign in</h2>
            <p className="muted">Use your work account to continue.</p>

            <label>
              Work email
              <input
                className="input"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label>
              Password
              <div className="pass-wrap">
                <input
                  className="input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="eye"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff {...ICON} /> : <Eye {...ICON} />}
                </button>
              </div>
            </label>

            {error ? <div className="error">{error}</div> : null}

            <button className="btn btn-primary full" type="submit" disabled={!email || !password}>
              Continue
            </button>

            <div className="demo-block">
              <div className="demo-label">Demo access</div>
              {DEMO_USERS.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  className="demo-btn"
                  onClick={() => {
                    setEmail(u.email)
                    setPassword('demo')
                    demoLogin(u.email)
                  }}
                >
                  <strong>{u.title}</strong>
                  <span>{u.email}</span>
                </button>
              ))}
            </div>
          </form>
        ) : (
          <form className="login-card" onSubmit={onVerify}>
            <h2>Two-factor authentication</h2>
            <p className="muted">Enter the 6-digit code from your authenticator app.</p>

            <input
              className="input otp"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              aria-label="Authentication code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoFocus
            />

            {error ? <div className="error">{error}</div> : null}

            <div className="stack">
              <button className="btn btn-primary full" type="submit" disabled={otp.length !== 6}>
                Verify and sign in
              </button>
              <button className="btn btn-secondary full" type="button" onClick={backToLogin}>
                <ChevronLeft {...ICON} />
                Back
              </button>
            </div>

            <div className="demo-note">Demo: enter any 6 digits to proceed.</div>
          </form>
        )}

        <p className="login-foot">
          All access is logged · Confidential system · Authorised personnel only
        </p>
      </section>
    </div>
  )
}
