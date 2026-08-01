import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarPlus,
  FileText,
  FolderOpen,
  Fingerprint,
  Gavel,
  LayoutDashboard,
  Presentation,
  Search,
  UserRound,
  Users,
} from 'lucide-react'
import { useRole } from '../../lib/role-context'
import { useWorkflow } from '../../lib/workflow/store'
import { useToast } from '../../lib/toast'
import { ROLE_LABEL } from '../../lib/data/types'
import { USER_BY_ROLE, USERS } from '../../lib/data/users'
import { DOCUMENTS } from '../../lib/data/caseDetail'
import { evidenceForCase } from '../../lib/data/evidence'
import { FLAGSHIP_CASE_ID } from '../../lib/data/cases'
import { fuzzyRank } from '../../lib/command/fuzzy'
import { destinationsFor } from '../../lib/command/destinations'
import './CommandPalette.css'

const RECENT_KEY = 'sentinel.command.recent.v1'
const MAX_RECENT = 8

export type PaletteKind = 'case' | 'person' | 'document' | 'evidence' | 'nav' | 'action'

export interface PaletteItem {
  id: string
  kind: PaletteKind
  title: string
  subtitle?: string
  to?: string
  run?: () => void
  keywords?: string
}

const KIND_LABEL: Record<PaletteKind, string> = {
  action: 'Actions',
  case: 'Cases',
  person: 'People',
  document: 'Documents',
  evidence: 'Evidence',
  nav: 'Go to',
}

const KIND_ORDER: PaletteKind[] = ['action', 'case', 'person', 'document', 'evidence', 'nav']

function loadRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function pushRecent(id: string) {
  try {
    const next = [id, ...loadRecent().filter((x) => x !== id)].slice(0, MAX_RECENT)
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

function IconFor({ kind }: { kind: PaletteKind }) {
  const props = { size: 14, strokeWidth: 1.5 } as const
  switch (kind) {
    case 'action':
      return <ArrowRight {...props} />
    case 'case':
      return <Gavel {...props} />
    case 'person':
      return <UserRound {...props} />
    case 'document':
      return <FolderOpen {...props} />
    case 'evidence':
      return <Fingerprint {...props} />
    case 'nav':
      return <LayoutDashboard {...props} />
  }
}

export function CommandPalette({
  open,
  onClose,
  onSwitchRole,
}: {
  open: boolean
  onClose: () => void
  onSwitchRole: () => void
}) {
  const navigate = useNavigate()
  const { currentRole, can, maskParty, presenterMode, setPresenterMode, canOpenCase } = useRole()
  const { visibleCases, allCases } = useWorkflow()
  const { push } = useToast()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [recentIds, setRecentIds] = useState<string[]>(() => loadRecent())
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const isActionMode = query.trim().startsWith('>')
  const searchText = isActionMode ? query.trim().slice(1).trim() : query.trim()

  const go = useCallback(
    (to: string) => {
      navigate(to)
      onClose()
    },
    [navigate, onClose],
  )

  const catalog = useMemo(() => {
    const items: PaletteItem[] = []

    // Quick actions — always available; filtered when `>` mode is on.
    items.push({
      id: 'action:schedule',
      kind: 'action',
      title: 'Schedule a sitting',
      subtitle: 'Open the hearings calendar',
      keywords: 'hearing list sitting',
      to: can('workflow:administer') ? '/hearings-calendar' : '/hearing-calendar',
      run: () => go(can('workflow:administer') ? '/hearings-calendar' : '/hearing-calendar'),
    })
    items.push({
      id: 'action:pack',
      kind: 'action',
      title: 'Generate Defensibility Pack',
      subtitle: FLAGSHIP_CASE_ID,
      keywords: 'export pdf pack',
      run: () => {
        const id = visibleCases[0]?.id ?? FLAGSHIP_CASE_ID
        go(`/cases/${id}?pack=1`)
      },
    })
    items.push({
      id: 'action:presenter',
      kind: 'action',
      title: presenterMode ? 'Turn off Presenter Mode' : 'Toggle Presenter Mode',
      subtitle: presenterMode ? 'Identities are currently masked' : 'Mask identities for a live demo',
      keywords: 'anonymise redact demo',
      run: () => {
        setPresenterMode(!presenterMode)
        push(
          presenterMode ? 'Presenter Mode off — identities restored for your role.' : 'Presenter Mode on — party identities masked.',
          'info',
        )
        onClose()
      },
    })
    items.push({
      id: 'action:role',
      kind: 'action',
      title: 'Switch role',
      subtitle: currentRole ? ROLE_LABEL[currentRole] : 'Demo control',
      keywords: 'persona demo',
      run: () => {
        onClose()
        onSwitchRole()
      },
    })

    if (isActionMode) return items

    const cases = can('view:all_cases') ? allCases : visibleCases
    for (const c of cases) {
      if (!canOpenCase(c.id) && !visibleCases.some((v) => v.id === c.id)) continue
      const complainant = maskParty(c.complainant)
      const respondent = maskParty(c.respondent)
      items.push({
        id: `case:${c.id}`,
        kind: 'case',
        title: c.id,
        subtitle: `${complainant} v ${respondent} · ${c.department}`,
        keywords: `${c.summary} ${c.location}`,
        to: `/cases/${c.id}`,
        run: () => go(`/cases/${c.id}`),
      })
    }

    // People — only when the role may see identities, and never under Presenter Mode.
    if (can('view:identities') && !presenterMode) {
      for (const u of USERS) {
        items.push({
          id: `person:${u.id}`,
          kind: 'person',
          title: u.name,
          subtitle: `${ROLE_LABEL[u.role]} · ${u.designation}`,
          keywords: `${u.email} ${u.location}`,
          to: '/my-profile',
          run: () => {
            push(`${u.name} — ${ROLE_LABEL[u.role]}`, 'info')
            onClose()
          },
        })
      }
    } else if (currentRole) {
      // Still allow finding the signed-in user under Presenter Mode / management.
      const self = USER_BY_ROLE[currentRole]
      items.push({
        id: `person:${self.id}`,
        kind: 'person',
        title: self.name,
        subtitle: 'You',
        to: '/my-profile',
        run: () => go('/my-profile'),
      })
    }

    if (can('view:inquiry')) {
      for (const d of DOCUMENTS) {
        if (!cases.some((c) => c.id === d.caseId)) continue
        items.push({
          id: `doc:${d.id}`,
          kind: 'document',
          title: d.name,
          subtitle: `${d.caseId} · ${d.category}`,
          keywords: d.description,
          to: `/cases/${d.caseId}?tab=documents`,
          run: () => go(`/cases/${d.caseId}?tab=documents`),
        })
      }
      for (const c of cases) {
        for (const e of evidenceForCase(c.id)) {
          items.push({
            id: `ev:${e.id}`,
            kind: 'evidence',
            title: e.exhibitNo ? `${e.exhibitNo} — ${e.description}` : e.description,
            subtitle: `${c.id} · ${e.type}`,
            keywords: e.submittedBy,
            to: `/cases/${c.id}?tab=evidence`,
            run: () => go(`/cases/${c.id}?tab=evidence`),
          })
        }
      }
    }

    for (const d of destinationsFor(currentRole)) {
      items.push({
        id: `nav:${d.to}`,
        kind: 'nav',
        title: d.label,
        subtitle: d.to,
        keywords: d.keywords,
        to: d.to,
        run: () => go(d.to),
      })
    }

    return items
  }, [
    allCases,
    visibleCases,
    can,
    canOpenCase,
    maskParty,
    presenterMode,
    setPresenterMode,
    currentRole,
    isActionMode,
    go,
    push,
    onClose,
    onSwitchRole,
  ])

  const ranked = useMemo(() => {
    const pool = isActionMode ? catalog.filter((i) => i.kind === 'action') : catalog
    if (!searchText) {
      // Recent items when empty; otherwise actions first then a quiet empty.
      if (isActionMode) return pool
      const byId = new Map(pool.map((i) => [i.id, i]))
      const recent = recentIds.map((id) => byId.get(id)).filter(Boolean) as PaletteItem[]
      const rest = pool.filter((i) => !recentIds.includes(i.id))
      return [...recent, ...rest].slice(0, 40)
    }
    return fuzzyRank(searchText, pool, (i) => [
      i.title,
      i.subtitle ?? '',
      i.keywords ?? '',
      i.kind,
    ])
      .slice(0, 40)
      .map((h) => h.item)
  }, [catalog, searchText, isActionMode, recentIds])

  const grouped = useMemo(() => {
    const map = new Map<PaletteKind, PaletteItem[]>()
    for (const item of ranked) {
      const list = map.get(item.kind) ?? []
      list.push(item)
      map.set(item.kind, list)
    }
    return KIND_ORDER.filter((k) => map.has(k)).map((k) => ({
      kind: k,
      label: KIND_LABEL[k],
      items: map.get(k)!,
    }))
  }, [ranked])

  const flat = ranked

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    setRecentIds(loadRecent())
    const t = window.setTimeout(() => inputRef.current?.focus(), 10)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((i) => Math.min(i + 1, Math.max(0, flat.length - 1)))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = flat[active]
        if (item) {
          pushRecent(item.id)
          item.run?.()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, flat, active])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  let running = 0

  return (
    <div className="cmd-root" role="presentation">
      <button type="button" className="cmd-backdrop" aria-label="Close command palette" onClick={onClose} />
      <div
        className="cmd-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="cmd-input-row">
          <Search size={16} strokeWidth={1.5} />
          <input
            ref={inputRef}
            className="cmd-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases, people, documents — or type > for actions"
            aria-label="Command search"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="cmd-kbd">esc</span>
        </div>

        <div className="cmd-results" ref={listRef} role="listbox" aria-label="Results">
          {flat.length === 0 ? (
            <div className="cmd-empty">Nothing matches. Try a case ID, a name, or &gt; for actions.</div>
          ) : (
            grouped.map((g) => (
              <div key={g.kind} className="cmd-group">
                <div className="cmd-group-label">{g.label}</div>
                {g.items.map((item) => {
                  const idx = running
                  running += 1
                  const selected = idx === active
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      data-idx={idx}
                      className={`cmd-item${selected ? ' active' : ''}`}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => {
                        pushRecent(item.id)
                        item.run?.()
                      }}
                    >
                      <span className="cmd-item-icon">
                        {item.id === 'action:schedule' ? (
                          <CalendarPlus size={14} strokeWidth={1.5} />
                        ) : item.id === 'action:pack' ? (
                          <FileText size={14} strokeWidth={1.5} />
                        ) : item.id === 'action:presenter' ? (
                          <Presentation size={14} strokeWidth={1.5} />
                        ) : item.id === 'action:role' ? (
                          <Users size={14} strokeWidth={1.5} />
                        ) : (
                          <IconFor kind={item.kind} />
                        )}
                      </span>
                      <span className="cmd-item-text">
                        <span className="cmd-item-title">{item.title}</span>
                        {item.subtitle ? <span className="cmd-item-sub">{item.subtitle}</span> : null}
                      </span>
                      {item.kind === 'action' ? <span className="cmd-hint">&gt;</span> : null}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="cmd-footer">
          <span>
            <kbd>↑↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>&gt;</kbd> actions
          </span>
        </div>
      </div>
    </div>
  )
}

/** Global ⌘K / Ctrl+K listener — mounts once in the app shell. */
export function useCommandPaletteShortcut(onOpen: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onOpen])
}
