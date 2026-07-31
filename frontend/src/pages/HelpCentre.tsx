import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown,
  Clock,
  FileText,
  Mail,
  Phone,
  Scale,
  Shield,
  ShieldAlert,
  UserX,
} from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { userById } from '../lib/data/users'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'

const ICON = { size: 15, strokeWidth: 1.5 } as const

/** The protections that matter most to someone deciding whether to come forward. */
const RIGHTS = [
  {
    icon: Shield,
    title: 'Your identity is protected',
    body: 'Your name, the respondent’s name and anything said in the inquiry cannot be published or circulated. Management sees statistics only — never a name. Breaching this carries a penalty on the person who breaches it.',
    cite: 'Section 16 · Rule 12',
  },
  {
    icon: UserX,
    title: 'You cannot be retaliated against',
    body: 'Adverse treatment because you complained is itself misconduct. If anything changes about your role, appraisal or treatment after filing, tell the committee — it is dealt with as part of the case.',
    cite: 'Section 19(g)',
  },
  {
    icon: Clock,
    title: 'The inquiry is time-bound',
    body: 'Notice goes to the respondent within 7 working days. The inquiry must finish within 90 days. The employer must act on the recommendation within 60 days. Every one of those clocks is on your tracker.',
    cite: 'Rule 7 · Section 11(4) · Section 13(4)',
  },
  {
    icon: Scale,
    title: 'You may ask for interim relief',
    body: 'While the inquiry runs you can ask to be moved, to have the respondent moved, for leave of up to three months, or for a no-contact directive. Ask the committee in writing at any time.',
    cite: 'Section 12',
  },
  {
    icon: FileText,
    title: 'You may choose conciliation first',
    body: 'Before a formal inquiry you may ask the committee to attempt a settlement. No monetary settlement may be made the basis of one, and you can stop the process and return to a full inquiry.',
    cite: 'Section 10',
  },
  {
    icon: ShieldAlert,
    title: 'You may appeal',
    body: 'If you are not satisfied with the findings or the action taken, you may appeal within 90 days of the recommendation.',
    cite: 'Section 18',
  },
]

const FAQS = [
  {
    q: 'Can I file a complaint anonymously?',
    a: 'You can ask for your name to be withheld from the workplace, and the complaint form has a switch for exactly that. The Internal Committee itself must know who you are — it cannot run an inquiry against an unnamed account — but your identity is not disclosed to your team, your manager, or management. On every screen outside the committee you appear as “Complainant A”.',
  },
  {
    q: 'How long do I have to file?',
    a: 'Within three months of the incident, or of the last incident where the conduct was continuing. The committee can extend that by a further three months if it is satisfied that circumstances prevented you from filing sooner — so if you are outside the window, still file and explain why.',
  },
  {
    q: 'Who will see what I write?',
    a: 'The Internal Committee members named on your case, and the POSH Admin who administers the process. Not your manager. Not HR generally. Not management. Every single time somebody opens your file it is recorded with their name, the time and their IP address, and that record cannot be edited or deleted.',
  },
  {
    q: 'Will the respondent see my complaint?',
    a: 'The respondent is served with a statement of the allegations, because they cannot answer a case they have not been told. They are not given your supporting material wholesale, and any document the committee shares with them is recorded on the file so you can see what was shared and when.',
  },
  {
    q: 'Do I have to attend the hearings?',
    a: 'You will be given notice of any sitting you are required to attend, and it appears on your dashboard. You may bring a support person. You are never required to be in the same room as the respondent — ask the committee and it will arrange separate or video sittings.',
  },
  {
    q: 'What if I want to withdraw?',
    a: 'Tell the committee. It records the withdrawal and the reason. Be aware that where the conduct alleged is serious, the committee may be obliged to continue on its own motion, and it will tell you if that is the case.',
  },
  {
    q: 'What happens if the 90 days pass?',
    a: 'The committee must record why, and the delay is reportable to the District Officer in the annual return. The case does not lapse and your complaint is not weakened — but you are entitled to an explanation, and you can see the recorded reason on your case.',
  },
  {
    q: 'Can I object to a committee member?',
    a: 'Yes. If you believe a member has a conflict of interest — they report to the respondent, they are a close colleague, anything of that kind — say so in writing before the next sitting. The objection is recorded against the case and the member’s own conflict declaration is on the file.',
  },
]

export function HelpCentrePage() {
  const [open, setOpen] = useState<number | null>(0)
  const { visibleCases, flowFor } = useWorkflow()

  // Route "contact the committee" to the actual people on their case.
  const primary = visibleCases[0]
  const flow = primary ? flowFor(primary.id) : undefined
  const po = userById(
    (flow?.committeeId ? undefined : primary?.assignedIC?.find((id) => id === 'u-po')) ?? 'u-po',
  )
  const external = userById('u-ext')

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Help centre</h1>
          <p>
            What the law gives you, what the process does, and who to talk to. Written for the
            person filing, not for the committee.
          </p>
        </div>
        <Link to="/complaint/new" className="btn btn-primary">
          File a complaint
        </Link>
      </div>

      {/* ── Rights ───────────────────────────────────────────────── */}
      <section>
        <div className="cw-section-label" style={{ marginBottom: 12 }}>
          Your rights under the PoSH Act 2013
        </div>
        <div className="ep-rights">
          {RIGHTS.map((r) => (
            <div key={r.title} className="ep-right">
              <div className="ep-right-title">
                <r.icon {...ICON} style={{ color: 'var(--color-accent)' }} />
                {r.title}
              </div>
              <p className="ep-right-body">{r.body}</p>
              <div className="ep-right-cite">{r.cite}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQs ─────────────────────────────────────────────────── */}
      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">Common questions</span>
          <span className="meta-pill">{FAQS.length}</span>
        </div>
        <div className="ep-card-body tight">
          {FAQS.map((f, i) => (
            <div key={f.q} className="ep-faq">
              <button
                type="button"
                className="ep-faq-q"
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? null : i)}
              >
                {f.q}
                <ChevronDown
                  size={16}
                  strokeWidth={1.5}
                  style={{
                    flexShrink: 0,
                    transition: 'transform 150ms ease-out',
                    transform: open === i ? 'rotate(180deg)' : 'none',
                    color: 'var(--color-secondary-text)',
                  }}
                />
              </button>
              {open === i && <p className="ep-faq-a">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Who to contact ───────────────────────────────────────── */}
      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">Who to contact</span>
        </div>
        <div className="ep-card-body">
          <div className="ep-rights">
            <div className="ep-right">
              <div className="ep-right-title">Presiding Officer</div>
              <p className="ep-right-body">
                {po?.name} — {po?.designation}. For anything about your case: interim relief, an
                objection to a member, a request to reschedule a sitting.
              </p>
              <div className="ep-right-cite" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={12} strokeWidth={1.5} />
                {po?.email}
              </div>
            </div>

            <div className="ep-right">
              <div className="ep-right-title">External Member</div>
              <p className="ep-right-body">
                {external?.name} — {external?.designation}. Independent of the company. Speak to
                them if you are uncomfortable raising something internally.
              </p>
              <div className="ep-right-cite" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={12} strokeWidth={1.5} />
                {external?.email}
              </div>
            </div>

            <div className="ep-right">
              <div className="ep-right-title">If you are in immediate danger</div>
              <p className="ep-right-body">
                This platform is not an emergency service. Contact building security, or the police
                on 112. The National Commission for Women helpline is 7827-170-170. Nothing here
                prevents you from also filing a criminal complaint.
              </p>
              <div className="ep-right-cite" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={12} strokeWidth={1.5} />
                112 · 7827-170-170
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
