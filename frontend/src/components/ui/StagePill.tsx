import { STAGE_LABEL, type CaseStage } from '../../lib/data/types'

/**
 * Status pill — tinted background, brighter text, no border.
 * Tints track the case's position in the statutory lifecycle rather than being
 * decorative: intake is neutral, live inquiry is accented, terminal states recede.
 */
const PILL: Record<CaseStage, string> = {
  registered: 'bg-[rgba(59,130,246,0.14)] text-[#93c5fd]',
  notice_served: 'bg-[rgba(59,130,246,0.14)] text-[#93c5fd]',
  awaiting_reply: 'bg-[rgba(245,158,11,0.14)] text-[#fcd34d]',
  inquiry: 'bg-[rgba(16,185,129,0.14)] text-[#6ee7b7]',
  report_pending: 'bg-[rgba(167,139,250,0.14)] text-[#c4b5fd]',
  employer_action: 'bg-[rgba(167,139,250,0.14)] text-[#c4b5fd]',
  appeal_window: 'bg-[rgba(139,155,168,0.14)] text-[#a9b8c4]',
  closed: 'bg-[rgba(139,155,168,0.14)] text-[#a9b8c4]',
  archived: 'bg-[rgba(139,155,168,0.10)] text-[#7d8c99]',
}

export function StagePill({ stage }: { stage: CaseStage }) {
  const label = STAGE_LABEL[stage] ?? stage
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-md px-2 py-0.5 text-12 font-medium ${
        PILL[stage] ?? 'bg-[rgba(139,155,168,0.14)] text-[#a9b8c4]'
      }`}
      title={label}
    >
      {label}
    </span>
  )
}
