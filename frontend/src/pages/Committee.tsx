import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, Plus, Users, X } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { IC_ROSTER, actorName } from '../lib/data/users'
import { ROLE_LABEL } from '../lib/data/types'
import { STAGE_META } from '../lib/workflow/types'
import { formatDate } from '../lib/format'
import '../components/workflow/Workflow.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

/**
 * Committee console.
 *
 * Two audiences on one screen, deliberately. The POSH Admin constitutes boards and puts
 * them on cases; the committee sees what it has been handed and accepts or declines.
 * Keeping both on one page makes the handover visible — the admin can watch an
 * assignment go unaccepted, which is exactly the thing that stalls real inquiries.
 */
export function CommitteePage() {
  const { committees, createCommittee, allCases, flowFor, assignCommittee, runAction, committeeById } = useWorkflow()
  const { can, currentRole, currentUser } = useRole()
  const [params, setParams] = useSearchParams()
  const focus = params.get('case')

  const isAdmin = can('workflow:administer')
  const isCommittee = can('workflow:committee')

  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [members, setMembers] = useState<string[]>([])
  const [po, setPo] = useState('u-po')

  // Cases with a docket open but no board carrying them yet. Arriving from a workspace
  // remedy link narrows the list to the one case that sent us here.
  const awaitingBoard = allCases.filter(
    (c) => flowFor(c.id)?.stage === 'case_created' && (!focus || c.id === focus),
  )

  // Assignments this committee has been handed but not yet answered.
  const awaitingAcceptance = allCases.filter((c) => flowFor(c.id)?.stage === 'committee_assigned')

  const toggle = (id: string) =>
    setMembers((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))

  const submit = () => {
    if (!name.trim() || members.length < 3) return
    createCommittee(name.trim(), members, members.includes(po) ? po : members[0])
    setCreating(false)
    setName('')
    setMembers([])
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="page-header">
        <div>
          <h1>Committee</h1>
          <p>
            Internal Committee boards, the cases each one carries, and assignments waiting to be
            accepted. A board must have at least three members with a Presiding Officer named.
          </p>
        </div>
        {isAdmin && !creating && (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus {...ICON} />
            Create committee board
          </button>
        )}
      </div>

      {/* ── Create a board ────────────────────────────────────────── */}
      {isAdmin && creating && (
        <section className="card card-pad">
          <div className="wf-form">
            <label className="wf-field">
              Board name
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Internal Committee — Board C"
              />
            </label>

            <div className="wf-field">
              Members — select at least three
              <div className="wf-member-grid" style={{ marginTop: 4 }}>
                {IC_ROSTER.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className={`wf-member ${members.includes(u.id) ? 'selected' : ''}`}
                    onClick={() => toggle(u.id)}
                  >
                    <span className="avatar sm">{u.initials}</span>
                    <span style={{ minWidth: 0 }}>
                      <span className="wf-member-name" style={{ display: 'block' }}>{u.name}</span>
                      <span className="wf-member-role">{ROLE_LABEL[u.role]}</span>
                    </span>
                    {members.includes(u.id) ? <Check size={14} strokeWidth={2} style={{ marginLeft: 'auto', color: 'var(--color-accent)' }} /> : null}
                  </button>
                ))}
              </div>
            </div>

            <label className="wf-field" style={{ maxWidth: 320 }}>
              Presiding Officer
              <select className="select" value={po} onChange={(e) => setPo(e.target.value)}>
                {IC_ROSTER.filter((u) => members.includes(u.id)).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
                {members.length === 0 ? <option value="u-po">Select members first</option> : null}
              </select>
            </label>

            <div className="wf-note-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={submit}
                disabled={!name.trim() || members.length < 3}
              >
                Constitute board
              </button>
            </div>
            {members.length > 0 && members.length < 3 && (
              <p className="text-12 text-muted">
                {3 - members.length} more member{3 - members.length === 1 ? '' : 's'} needed for quorum.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Boards ───────────────────────────────────────────────── */}
      <section>
        <div className="cw-section-label" style={{ marginBottom: 12 }}>
          Constituted boards
        </div>
        <div className="wf-list">
          {committees.map((c) => {
            const carrying = allCases.filter((k) => flowFor(k.id)?.committeeId === c.id)
            return (
              <div key={c.id} className="wf-list-item">
                <div style={{ minWidth: 0 }}>
                  <div className="wf-list-title">
                    <Users size={14} strokeWidth={1.5} style={{ color: 'var(--color-violet)' }} />
                    {c.name}
                    <span className="meta-pill">{c.memberIds.length} members</span>
                    {c.active ? <span className="badge badge-completed">Active</span> : null}
                  </div>
                  <div className="wf-list-meta">
                    Presiding Officer: {actorName(c.presidingOfficerId)} ·{' '}
                    {c.memberIds.map((id) => actorName(id)).join(', ')}
                  </div>
                  <div className="wf-list-meta">
                    Constituted {formatDate(c.createdAt)} · carrying {carrying.length} case
                    {carrying.length === 1 ? '' : 's'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="wf-list-meta" style={{ marginTop: 0 }}>
                    {carrying.slice(0, 4).map((k) => (
                      <div key={k.id}>
                        <Link to={`/cases/${k.id}`} className="mono text-13" style={{ color: 'var(--color-accent)' }}>
                          {k.id}
                        </Link>
                      </div>
                    ))}
                    {carrying.length > 4 ? <div className="text-12 text-faint">+{carrying.length - 4} more</div> : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Assign a board ───────────────────────────────────────── */}
      {isAdmin && (
        <section>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            <span className="cw-section-label" style={{ margin: 0 }}>
              Cases awaiting a board — {awaitingBoard.length}
            </span>
            {focus ? (
              <button type="button" className="btn btn-secondary" onClick={() => setParams({})}>
                <X {...ICON} />
                Showing {focus} only — show all
              </button>
            ) : null}
          </div>
          {awaitingBoard.length === 0 ? (
            <div className="wf-empty">
              {focus ? `${focus} already has a board assigned.` : 'Every open docket has a committee assigned.'}
            </div>
          ) : (
            <div className="wf-list">
              {awaitingBoard.map((c) => {
                const flow = flowFor(c.id)!
                return (
                  <div key={c.id} className="wf-list-item">
                    <div style={{ minWidth: 0 }}>
                      <div className="wf-list-title">
                        <Link to={`/cases/${c.id}`} className="mono" style={{ color: 'var(--color-accent)' }}>
                          {c.id}
                        </Link>
                        <span className="badge badge-open">{STAGE_META[flow.stage].label}</span>
                      </div>
                      <div className="wf-list-meta">
                        {c.department} · {c.location} · filed {formatDate(c.filedDate)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      <select
                        className="select"
                        value={flow.committeeId ?? ''}
                        onChange={(e) => assignCommittee(c.id, e.target.value)}
                      >
                        <option value="">Choose a board…</option>
                        {committees.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!flow.committeeId}
                        onClick={() => runAction(c.id, 'assign-committee')}
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Accept or decline ────────────────────────────────────── */}
      {isCommittee && (
        <section>
          <div className="cw-section-label" style={{ marginBottom: 12 }}>
            Assignments awaiting your response — {awaitingAcceptance.length}
          </div>
          {awaitingAcceptance.length === 0 ? (
            <div className="wf-empty">Nothing waiting on you. Assignments appear here as boards are nominated.</div>
          ) : (
            <div className="wf-list">
              {awaitingAcceptance.map((c) => {
                const flow = flowFor(c.id)!
                const board = committeeById(flow.committeeId)
                const onThisBoard = !board || !currentUser || board.memberIds.includes(currentUser.id)
                return (
                  <div key={c.id} className="wf-list-item">
                    <div style={{ minWidth: 0 }}>
                      <div className="wf-list-title">
                        <Link to={`/cases/${c.id}`} className="mono" style={{ color: 'var(--color-accent)' }}>
                          {c.id}
                        </Link>
                        <span className="badge badge-progress">{board?.name ?? 'Board pending'}</span>
                      </div>
                      <div className="wf-list-meta">
                        {c.summary}
                      </div>
                      <div className="wf-list-meta">
                        {c.department} · {c.location} · Day {c.daysElapsed} of the 90-day window
                        {!onThisBoard ? ' · you are not named on this board' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => runAction(c.id, 'accept-assignment')}
                      >
                        <Check {...ICON} />
                        Accept
                      </button>
                      <Link to={`/cases/${c.id}`} className="btn btn-secondary">
                        <X {...ICON} />
                        Decline in workspace
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {!isAdmin && !isCommittee && (
        <div className="wf-empty">
          Committee composition is visible to administrators and committee members. Your role
          ({currentRole ? ROLE_LABEL[currentRole] : '—'}) has read access to the boards above but
          takes no part in assignment.
        </div>
      )}
    </div>
  )
}
