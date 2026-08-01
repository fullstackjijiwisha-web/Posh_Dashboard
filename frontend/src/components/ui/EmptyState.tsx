import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import './EmptyState.css'

/**
 * The one empty state.
 *
 * Tone is the whole specification here: calm and plain, never cute. This product tells
 * people their harassment complaint is being investigated — an empty evidence register
 * is not an opportunity for a joke or a cartoon. Each instance says what is not there,
 * one line on why that is normal or what would change it, and at most one action.
 *
 * "Nothing to show" is never enough on its own. A reader who cannot tell the difference
 * between "no sittings have been listed" and "the filter you applied excludes them all"
 * will assume the software is broken.
 */
export function EmptyState({
  icon: Icon,
  headline,
  detail,
  action,
  compact = false,
}: {
  icon: LucideIcon
  /** What is not here. A statement, not a question. */
  headline: string
  /** One line: why that is expected, or what would populate it. */
  detail: string
  action?: { label: string; to: string } | { label: string; onClick: () => void }
  /** Sits inside a card that already has its own padding. */
  compact?: boolean
}) {
  return (
    <div className={`empty-state${compact ? ' compact' : ''}`}>
      <span className="empty-state-icon" aria-hidden="true">
        <Icon size={compact ? 18 : 22} strokeWidth={1.5} />
      </span>
      <p className="empty-state-headline">{headline}</p>
      <p className="empty-state-detail">{detail}</p>
      {action ? (
        'to' in action ? (
          <Link to={action.to} className="btn btn-secondary empty-state-action">
            {action.label}
          </Link>
        ) : (
          <button type="button" className="btn btn-secondary empty-state-action" onClick={action.onClick}>
            {action.label}
          </button>
        )
      ) : null}
    </div>
  )
}
