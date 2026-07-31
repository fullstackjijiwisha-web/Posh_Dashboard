import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { DEMO_USERS, type User } from '../data/mock'

interface AuthState {
  user: User | null
  pendingEmail: string | null
  login: (email: string, password: string) => boolean
  demoLogin: (email: string) => void
  verifyMfa: (code: string) => boolean
  logout: () => void
  backToLogin: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('posh_user')
    return raw ? (JSON.parse(raw) as User) : null
  })
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const value = useMemo<AuthState>(
    () => ({
      user,
      pendingEmail,
      login: (email) => {
        const found = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase())
        if (!found && !email.includes('@')) return false
        setPendingEmail(email || found?.email || email)
        return true
      },
      demoLogin: (email) => {
        setPendingEmail(email)
      },
      verifyMfa: (code) => {
        if (!/^\d{6}$/.test(code)) return false
        const found =
          DEMO_USERS.find((u) => u.email.toLowerCase() === pendingEmail?.toLowerCase()) ||
          DEMO_USERS[0]
        setUser(found)
        localStorage.setItem('posh_user', JSON.stringify(found))
        setPendingEmail(null)
        return true
      },
      logout: () => {
        setUser(null)
        setPendingEmail(null)
        localStorage.removeItem('posh_user')
      },
      backToLogin: () => setPendingEmail(null),
    }),
    [user, pendingEmail],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
