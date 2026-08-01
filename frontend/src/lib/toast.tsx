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
 * Toasts — bottom-right, stacking.
 *
 * Default dismiss at 4s with a progress hairline. When an Undo action is offered,
 * the window stretches to 8 seconds so an irreversible step can still be walked back.
 */

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  tone: ToastTone
  message: string
  /** Optional label + handler — typically Undo. Extends lifetime to 8s. */
  action?: { label: string; onClick: () => void }
  duration: number
}

interface ToastState {
  toasts: Toast[]
  push: (message: string, tone?: ToastTone, action?: Toast['action']) => void
  /** Convenience: success toast with an 8-second Undo. */
  pushUndo: (message: string, onUndo: () => void) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastState | null>(null)

const DURATION = 4000
const UNDO_DURATION = 8000

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
      const duration = action ? UNDO_DURATION : DURATION
      setToasts((t) => [...t, { id, tone, message, action, duration }])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      )
    },
    [dismiss],
  )

  const pushUndo = useCallback(
    (message: string, onUndo: () => void) => {
      push(message, 'warning', { label: 'Undo', onClick: onUndo })
    },
    [push],
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach(clearTimeout)
      pending.clear()
    }
  }, [])

  const value = useMemo(
    () => ({ toasts, push, pushUndo, dismiss }),
    [toasts, push, pushUndo, dismiss],
  )

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
              <span
                className="toast-progress"
                style={{ animationDuration: `${t.duration}ms` }}
              />
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
