import { useMemo, useState } from 'react'
import {
  Download,
  Fingerprint,
  Lock,
  Scale,
  Search,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { AUDIT_LOG } from '../lib/data/audit'
import { CASES } from '../lib/data/cases'
import { USERS, actorInitials, actorName, userById } from '../lib/data/users'
import { ROLE_LABEL, type AuditAction, type AuditKind, type Role } from '../lib/data/types'
import { useRole } from '../lib/role-context'
import { formatAuditTimestamp } from '../lib/format'
import './Audit.css'

const ICON = { size: 16, strokeWidth: 1.5 } as const
const PAGE_SIZE = 25

const ACTION_BADGE: Record<AuditAction, string> = {
  VIEW: 'aud-badge-view',
  CREATE: 'aud-badge-create',
  UPDATE: 'aud-badge-update',
  DOWNLOAD: 'aud-badge-download',
  SHARE: 'aud-badge-share',
  DELETE: 'aud-badge-delete',
  LOGIN: 'aud-badge-login',
  EXPORT: 'aud-badge-export',
  STAGE_CHANGE: 'aud-badge-stage',
  ACCESS_DENIED: 'aud-badge-denied',
}

const ACTIONS: Array<AuditAction | 'all'> = [
  'all',
  'VIEW',
  'CREATE',
  'UPDATE',
  'DOWNLOAD',
  'SHARE',
  'DELETE',
  'LOGIN',
  'EXPORT',
  'STAGE_CHANGE',
  'ACCESS_DENIED',
]

export function AuditPage() {
  const { can } = useRole()
  const [kind, setKind] = useState<AuditKind | 'all'>('all')
  const [caseFilter, setCaseFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all')
  const [range, setRange] = useState<'7' | '30' | '90' | 'all'>('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  if (!can('view:audit')) {
    return (
      <div className="aud-denied card p-8">
        <Lock {...ICON} className="text-warning" />
        <div>
          <h2 className="text-16">Audit trail restricted</h2>
          <p className="mt-2 text-13 text-muted">
            Your role cannot view the immutable audit trail. This attempt is itself logged.
            Presiding Officer, IC members, External Member, Legal, and Super Admin retain access.
          </p>
        </div>
      </div>
    )
  }

  const filtered = useMemo(() => {
    const now = Date.now()
    const rangeMs =
      range === '7' ? 7 : range === '30' ? 30 : range === '90' ? 90 : null
    const query = q.trim().toLowerCase()

    return AUDIT_LOG.filter((e) => {
      if (kind !== 'all' && e.kind !== kind) return false
      if (caseFilter !== 'all' && e.caseId !== caseFilter) return false
      if (userFilter !== 'all' && e.actorId !== userFilter) return false
      if (actionFilter !== 'all' && e.action !== actionFilter) return false
      if (rangeMs !== null) {
        const ageDays = (now - new Date(e.at).getTime()) / 86400000
        if (ageDays > rangeMs) return false
      }
      if (query) {
        const blob = `${e.entity} ${e.detail} ${actorName(e.actorId)} ${e.ip} ${e.action}`.toLowerCase()
        if (!blob.includes(query)) return false
      }
      return true
    })
  }, [kind, caseFilter, userFilter, actionFilter, range, q])

  const total = filtered.length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, pages)
  const start = (safePage - 1) * PAGE_SIZE
  const slice = filtered.slice(start, start + PAGE_SIZE)

  const poshCount = AUDIT_LOG.filter((e) => e.kind === 'posh').length
  const techCount = AUDIT_LOG.filter((e) => e.kind === 'technical').length
  const viewCount = AUDIT_LOG.filter((e) => e.action === 'VIEW').length

  const caseOptions = [
    { id: 'all', label: 'All cases' },
    { id: 'SYSTEM', label: 'Platform / system' },
    ...CASES.map((c) => ({ id: c.id, label: c.id })),
  ]

  return (
    <div className="aud">
      <div className="aud-header">
        <div>
          <h1 className="aud-title">Audit trail</h1>
          <p className="aud-sub">Immutable record of every action taken in the platform.</p>
        </div>
        <button type="button" className="btn btn-secondary">
          <Download {...ICON} />
          Export for tribunal
        </button>
      </div>

      {/* Dual audit mode switcher */}
      <div className="aud-modes">
        <button
          type="button"
          className={`aud-mode ${kind === 'all' ? 'active' : ''}`}
          onClick={() => { setKind('all'); setPage(1) }}
        >
          <Shield {...ICON} />
          <div>
            <strong>Unified ledger</strong>
            <span>{AUDIT_LOG.length} events</span>
          </div>
        </button>
        <button
          type="button"
          className={`aud-mode aud-mode-posh ${kind === 'posh' ? 'active' : ''}`}
          onClick={() => { setKind('posh'); setPage(1) }}
        >
          <Scale {...ICON} />
          <div>
            <strong>PoSH audit</strong>
            <span>{poshCount} case &amp; inquiry events · confidentiality trail</span>
          </div>
        </button>
        <button
          type="button"
          className={`aud-mode aud-mode-tech ${kind === 'technical' ? 'active' : ''}`}
          onClick={() => { setKind('technical'); setPage(1) }}
        >
          <Fingerprint {...ICON} />
          <div>
            <strong>Technical audit</strong>
            <span>{techCount} platform, login &amp; access-control events</span>
          </div>
        </button>
        <div className="aud-mode-stat">
          <span className="aud-mode-stat-n">{viewCount}</span>
          <span className="aud-mode-stat-l">VIEW events logged — even reading is recorded</span>
        </div>
      </div>

      <div className="aud-info">
        <Lock size={14} strokeWidth={1.5} />
        <span>
          Records are append-only and cannot be edited or deleted by any user, including
          administrators.
        </span>
      </div>

      {/* Filters */}
      <div className="aud-filters">
        <label className="aud-filter">
          <span>Case</span>
          <select value={caseFilter} onChange={(e) => { setCaseFilter(e.target.value); setPage(1) }}>
            {caseOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="aud-filter">
          <span>User</span>
          <select value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setPage(1) }}>
            <option value="all">All users</option>
            {USERS.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
            <option value="system">System</option>
          </select>
        </label>
        <label className="aud-filter">
          <span>Action</span>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value as AuditAction | 'all'); setPage(1) }}
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a === 'all' ? 'All actions' : a}</option>
            ))}
          </select>
        </label>
        <label className="aud-filter">
          <span>Date range</span>
          <select value={range} onChange={(e) => { setRange(e.target.value as typeof range); setPage(1) }}>
            <option value="all">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
        <label className="aud-search">
          <Search size={14} strokeWidth={1.5} />
          <input
            type="search"
            placeholder="Search entity, actor, IP…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1) }}
          />
        </label>
      </div>

      {/* Table */}
      <div className="aud-table-card">
        <div className="table-wrap" style={{ maxHeight: 'none' }}>
          <table className="data aud-table" style={{ minWidth: 1100 }}>
            <colgroup>
              <col style={{ width: 190 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 320 }} />
              <col style={{ width: 130 }} />
            </colgroup>
            <thead>
              <tr>
                <th className="num">Timestamp</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Action</th>
                <th>Entity</th>
                <th className="num">IP address</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((e) => {
                const user = userById(e.actorId)
                const roleLabel =
                  e.actorId === 'system'
                    ? 'System'
                    : user
                      ? ROLE_LABEL[user.role as Role]
                      : e.actorId
                return (
                  <tr key={e.id} className={`aud-row aud-kind-${e.kind}`}>
                    <td className="aud-ts num mono">{formatAuditTimestamp(e.at)}</td>
                    <td>
                      <div className="aud-actor">
                        <span className="aud-avatar">{actorInitials(e.actorId)}</span>
                        <span title={actorName(e.actorId)}>{actorName(e.actorId)}</span>
                      </div>
                    </td>
                    <td>
                      <span className="aud-role-pill">{roleLabel}</span>
                    </td>
                    <td>
                      <span className={`aud-action ${ACTION_BADGE[e.action]}`}>{e.action}</span>
                    </td>
                    <td title={`${e.entity} — ${e.detail}`}>
                      <div className="aud-entity">{e.entity}</div>
                      <div className="aud-detail">{e.detail}</div>
                    </td>
                    <td className="num mono aud-ip">{e.ip}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="aud-pager">
          <span>
            Showing {total === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total}{' '}
            entries
          </span>
          <div className="aud-pager-btns">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft {...ICON} />
              Prev
            </button>
            <span className="aud-page-n">
              {safePage} / {pages}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={safePage >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next
              <ChevronRight {...ICON} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
