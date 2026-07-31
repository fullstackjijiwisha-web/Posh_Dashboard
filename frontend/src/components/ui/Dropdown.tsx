import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Filter dropdown. Options are supplied by the caller and are expected to be derived
 * from the data on screen, so no selection can produce an empty table.
 */
export function Dropdown({
  label,
  value,
  options,
  onChange,
  counts,
  align = 'left',
}: {
  label: string
  value: string
  options: string[]
  onChange: (next: string) => void
  counts?: Record<string, number>
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-surface px-3 text-13 text-ink transition-colors duration-150 ease-out hover:bg-raised"
      >
        <span className="text-muted">{label}</span>
        <span className="font-medium">{value}</span>
        <ChevronDown size={16} strokeWidth={1.5} className="text-faint" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="listbox"
          className={`absolute z-30 mt-1 max-h-72 w-56 overflow-auto rounded-lg border border-line bg-surface py-1 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              role="option"
              aria-selected={value === opt}
              onClick={() => {
                onChange(opt)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-13 transition-colors duration-150 ease-out hover:bg-raised ${
                value === opt ? 'font-medium text-accent' : 'text-ink'
              }`}
            >
              <span className="truncate">{opt}</span>
              {counts ? <span className="shrink-0 text-12 text-muted">{counts[opt]}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
