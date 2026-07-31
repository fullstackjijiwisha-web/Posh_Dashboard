import { Building2, ShieldCheck, UserRound } from 'lucide-react'
import { useWorkflow } from '../../lib/workflow/store'
import { userById } from '../../lib/data/users'
import { ROLE_LABEL, type Role } from '../../lib/data/types'
import './EmployeePortal.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

/**
 * The board hearing the complainant's case.
 *
 * Withholding this would be the wrong kind of confidentiality. Section 16 protects the
 * identity of the *parties* — it says nothing about the committee, and a complainant who
 * does not know who is hearing their case cannot raise a conflict of interest, which
 * s.4 and the conflict-declaration process both assume they can. So this panel names
 * every member, their seat, and which of them are external to the company.
 */

const SEAT_ICON: Partial<Record<Role, typeof UserRound>> = {
  presiding_officer: ShieldCheck,
  ic_member: UserRound,
  external_member: Building2,
}

const SEAT_NOTE: Partial<Record<Role, string>> = {
  presiding_officer: 'Chairs the inquiry. A woman employed at a senior level, under s.4(2)(a).',
  ic_member: 'Internal member committed to the cause of women or with social work experience.',
  external_member: 'From outside the company — required by s.4(2)(c) so the panel is not wholly internal.',
}

export function MyCommittee({ caseId, compact = false }: { caseId: string; compact?: boolean }) {
  const { flowFor, committeeById, caseById } = useWorkflow()

  const flow = flowFor(caseId)
  const record = caseById(caseId)
  const board = committeeById(flow?.committeeId ?? null)

  // Before a board is nominated, the case has an assigned panel on the fixture but no
  // committee record — fall back to the panel so the complainant is never told "nobody".
  const memberIds = board?.memberIds ?? record?.assignedIC ?? []
  const accepted = new Set(flow?.acceptedBy ?? [])

  if (!memberIds.length) {
    return (
      <p className="text-13 text-muted">
        No Internal Committee has been assigned to your complaint yet. You will be notified as soon
        as a board takes carriage of it.
      </p>
    )
  }

  return (
    <div>
      {board ? (
        <p className="text-12 text-muted" style={{ marginBottom: 'var(--space-3)' }}>
          {board.name}
          {flow && flow.acceptedBy.length
            ? ` · ${flow.acceptedBy.length} of ${memberIds.length} have accepted the assignment`
            : ' · assignment pending acceptance'}
        </p>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {memberIds.map((id) => {
          const member = userById(id)
          if (!member) return null
          const Icon = SEAT_ICON[member.role] ?? UserRound
          const isExternal = member.role === 'external_member'

          return (
            <div
              key={id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
              }}
            >
              <span className="avatar" style={{ marginTop: 2 }}>
                {member.initials}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)' }}>{member.name}</span>
                  <span
                    className="badge"
                    style={
                      isExternal
                        ? { background: 'rgba(167,139,250,0.14)', color: '#c4b5fd' }
                        : { background: 'rgba(139,155,168,0.14)', color: '#a9b8c4' }
                    }
                  >
                    <Icon {...ICON} style={{ marginRight: 4 }} />
                    {ROLE_LABEL[member.role]}
                  </span>
                  {accepted.has(id) ? <span className="badge badge-completed">Accepted</span> : null}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-secondary-text)', marginTop: 3 }}>
                  {member.designation}
                </div>
                {!compact && (
                  <>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-tertiary-text)', marginTop: 2 }}>
                      {isExternal ? member.email : member.location}
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-tertiary-text)',
                        marginTop: 6,
                        lineHeight: 1.5,
                      }}
                    >
                      {SEAT_NOTE[member.role]}
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {!compact && (
        <p
          className="text-12 text-muted"
          style={{ marginTop: 'var(--space-4)', lineHeight: 1.6, maxWidth: '74ch' }}
        >
          If you believe any member has a conflict of interest, you may object in writing. Raise it
          through the Help centre and the objection is recorded against the case before the next
          sitting.
        </p>
      )}
    </div>
  )
}
