import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Keyboard, X } from 'lucide-react'
import { useRole } from '../../lib/role-context'
import './KeyboardShortcuts.css'

/**
 * Keyboard shortcuts.
 *
 *   g then c  → cause list
 *   g then b  → the bench (presiding dashboard)
 *   g then r  → recommendations
 *   ?         → this sheet
 *   Esc       → close
 *
 * j / k move through `[data-nav-list] > *` when focus is inside one.
 */

const SHORTCUTS = [
  { keys: 'g c', action: 'Cause list' },
  { keys: 'g b', action: 'The bench' },
  { keys: 'g r', action: 'Recommendations' },
  { keys: '⌘ K', action: 'Command palette' },
  { keys: 'j / k', action: 'Move through a list' },
  { keys: 'Enter', action: 'Open the focused item' },
  { keys: 'Esc', action: 'Close dialogs and this sheet' },
  { keys: '?', action: 'Keyboard shortcuts' },
]

export function KeyboardShortcuts() {
  const navigate = useNavigate()
  const { currentRole } = useRole()
  const [open, setOpen] = useState(false)
  const pendingG = useRef(false)

  useEffect(() => {
    if (!currentRole) return

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if (typing) return

      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setOpen((o) => !o)
        return
      }

      if (e.key === 'Escape') {
        setOpen(false)
        return
      }

      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        pendingG.current = true
        window.setTimeout(() => {
          pendingG.current = false
        }, 800)
        return
      }

      if (pendingG.current) {
        pendingG.current = false
        const k = e.key.toLowerCase()
        if (k === 'c') {
          e.preventDefault()
          navigate('/cause-list')
        } else if (k === 'b') {
          e.preventDefault()
          navigate('/dashboard')
        } else if (k === 'r') {
          e.preventDefault()
          navigate(
            currentRole === 'presiding_officer' ||
              currentRole === 'ic_member' ||
              currentRole === 'external_member'
              ? '/ic-recommendations'
              : '/recommendations',
          )
        }
        return
      }

      // j / k through list rows marked data-nav-list
      if (e.key === 'j' || e.key === 'k') {
        const list = document.querySelector<HTMLElement>('[data-nav-list]')
        if (!list) return
        const items = [...list.querySelectorAll<HTMLElement>('[data-nav-item]')]
        if (!items.length) return
        e.preventDefault()
        const active = document.activeElement as HTMLElement | null
        const idx = items.findIndex((el) => el === active || el.contains(active))
        const next =
          e.key === 'j'
            ? items[Math.min(items.length - 1, Math.max(0, idx) + 1)]
            : items[Math.max(0, (idx < 0 ? 0 : idx) - 1)]
        next?.focus()
      }

      if (e.key === 'Enter') {
        const el = document.activeElement as HTMLElement | null
        if (el?.matches('[data-nav-item]')) el.click()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentRole, navigate])

  if (!open) return null

  return (
    <div className="ks-root" role="presentation">
      <button type="button" className="ks-backdrop" aria-label="Close" onClick={() => setOpen(false)} />
      <div className="ks-dialog" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
        <div className="ks-head">
          <span className="ks-title">
            <Keyboard size={15} strokeWidth={1.5} />
            Keyboard shortcuts
          </span>
          <button type="button" className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
        <ul className="ks-list">
          {SHORTCUTS.map((s) => (
            <li key={s.keys}>
              <span className="ks-keys">
                {s.keys.split(' ').map((k) => (
                  <kbd key={k}>{k}</kbd>
                ))}
              </span>
              <span className="ks-action">{s.action}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
