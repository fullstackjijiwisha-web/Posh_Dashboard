import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, Eye, EyeOff, Shield } from 'lucide-react'
import { DEMO_USERS } from '../data/mock'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export function LoginPage() {
  const { user, pendingEmail, login, demoLogin, verifyMfa, backToLogin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')

  if (user) return <Navigate to="/dashboard" replace />

  const onContinue = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Enter email and password')
      return
    }
    login(email, password)
  }

  const onVerify = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!verifyMfa(otp)) {
      setError('Enter any 6-digit code')
      return
    }
  }

  return (
    <div className="login-page">
      <aside className="login-hero noise">
        <div className="hero-inner">
          <div className="hero-icon">
            <Shield size={28} />
          </div>
          <h1>POSH</h1>
          <p>
            Prevention of Sexual Harassment
            <br />
            Case Management
          </p>
        </div>
        <div className="hero-foot">
          <span>SOC 2 Compliant</span>
          <span>·</span>
          <span>256-bit Encryption</span>
          <span>·</span>
          <span>POSH Act 2013</span>
        </div>
      </aside>

      <section className="login-panel">
        {!pendingEmail ? (
          <form className="login-card slide-up" onSubmit={onContinue}>
            <div className="card-icon">
              <Shield size={22} />
            </div>
            <h2>Welcome back</h2>
            <p className="muted">Sign in to access the POSH platform</p>

            <label>
              Work Email
              <input
                className="input"
                type="email"
                placeholder="you@company.com"
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
                <button type="button" className="eye" onClick={() => setShowPass((v) => !v)} aria-label="Toggle password">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error ? <div className="error">{error}</div> : null}

            <button className="btn btn-primary full" type="submit" disabled={!email || !password}>
              Continue
            </button>

            <div className="demo-block">
              <div className="demo-label">Quick Demo Access</div>
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
          <form className="login-card slide-up" onSubmit={onVerify}>
            <div className="card-icon">
              <Shield size={22} />
            </div>
            <h2>Two-Factor Authentication</h2>
            <p className="muted">Enter the 6-digit code from your authenticator app</p>

            <input
              className="input otp"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoFocus
            />

            {error ? <div className="error">{error}</div> : null}

            <button className="btn btn-primary full" type="submit" disabled={otp.length !== 6}>
              <CheckCircle2 size={16} />
              Verify & Sign In
            </button>
            <button className="btn btn-secondary full" type="button" onClick={backToLogin}>
              <ChevronLeft size={16} />
              Back to Sign In
            </button>

            <div className="demo-note">Demo: enter any 6 digits to proceed</div>
          </form>
        )}

        <p className="login-foot">All access is logged · Confidential system · Authorised personnel only</p>
      </section>
    </div>
  )
}
