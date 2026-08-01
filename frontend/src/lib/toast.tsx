import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AlertTriangle, Check, Info, X, XCircle } from 'lucide-react'
import './toast.css'

/**
 * Toasts.
 *
 * Deliberately small. Phase 4 of the build plan specifies the full treatment — stacking
 * behaviour, an 8-second Undo on destructive actions, a progress hairline — and this is
 * built to be extended into that rather than replaced by it: the `push` signature already
 * carries `action`, so adding Undo later means passing one more prop, not rewriting call
 * sites.
 *
 * Accessibility: the region is `aria-live="polite"` so a screen reader announces the
 * toast without stealing focus, and every toast pairs its colour with an icon and text,
 * because colour alone is not a signal.
 */

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  tone: ToastTone
  message: string
  /** Optional label + handler, rendered as a button inside the toast. */
  action?: { label: string; onClick: () => void }
}

interface ToastState {
  toasts: Toast[]
  push: (message: string, tone?: ToastTone, action?: Toast['action']) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastState | null>(null)

const DURATION = 4000

const ICONS = { success: Check, error: XCircle, warning: AlertTriangle, info: Info } as const

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (message: string, tone: ToastTone = 'success', action?: Toast['action']) => {
      const id = nextId.current++
      setToasts((t) => [...t, { id, tone, message, action }])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION),
      )
    },
    [dismiss],
  )

  // Clear every pending timer on unmount, so a toast cannot fire into a dead tree.
  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach(clearTimeout)
      pending.clear()
    }
  }, [])

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.tone]
          return (
            <div key={t.id} className={`toast toast-${t.tone}`}>
              <Icon size={15} strokeWidth={1.5} className="toast-icon" aria-hidden="true" />
              <span className="toast-message">{t.message}</span>
              {t.action ? (
                <button
                  type="button"
                  className="toast-action"
                  onClick={() => {
                    t.action?.onClick()
                    dismiss(t.id)
                  }}
                >
                  {t.action.label}
                </button>
              ) : null}
              <button
                type="button"
                className="toast-close"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
              >
                <X size={13} strokeWidth={1.5} />
              </button>
              <span className="toast-progress" />
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
