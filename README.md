# Sentinel — PoSH Case Management

Frontend for Prevention of Sexual Harassment compliance workflows under the PoSH Act 2013.

Two things sit on top of a statutory case model: a **case lifecycle workflow** that gates
every action by role, and a **portal per role** shaped to what that role is actually
answerable for.

## The workflow

A 27-stage lifecycle from complaint filed to case sealed, with branches for rejection,
evidence requests and returned recommendations.

```
Employee            files → uploads evidence → reads the outcome → gives feedback
POSH Admin          screens intake → opens the docket → assigns the board →
                    audits the recommendation → records the decision → closes → archives
Internal Committee  accepts assignment → investigates → verifies evidence →
                    hears the parties → minutes the sitting → recommends
Company Owner       provisions POSH Admins and sets company policy; never adjudicates
```

One transition table in `lib/workflow/machine.ts` decides what may happen next and who
may do it. Screens render whatever `actionsFor(stage, role)` returns rather than deciding
for themselves, so a capability added there appears everywhere at once — and gating it
there removes it everywhere at once.

Blocked actions carry a remedy link that opens the right case, not a list to hunt
through.

## Roles

| Role | Sees |
|---|---|
| Employee | Their own case only — tracker, documents wallet, help centre, profile |
| HR SPOC | Intake desk and the s.19 duty register. **No inquiry content** |
| POSH Admin | Filing ingest, statutory workspace, hearings, analytics, audit |
| Presiding Officer | Quorum and clock instruments, cause list with a bench test per sitting |
| IC Member | Inquiry queue, attendance, own tasks |
| External Member | Oversight, case advisory panel, evidence register, documents vault |
| Company Owner / Super Admin | The admin console plus governance, provisioning and company settings |
| Management | The compliance command centre, and nothing else |

Access boundaries are route guards, not hidden navigation entries — a typed URL is turned
away the same as a missing link.

## Statutory rules the code enforces

- **s.4** committee composition and sitting quorum, tested rather than counted
- **s.10** conciliation offered before inquiry, at the complainant's request only
- **s.11(4)** 90-day inquiry window, with the overrun reason treated as the reportable
  item rather than the overrun itself
- **s.12** interim relief
- **s.13(1) / 13(4)** report within 10 days, employer action within 60
- **s.16** party identities withheld — `maskParty` refuses to hand a name to a role that
  should not have it, rather than each screen remembering to check
- **s.18** 90-day appeal window
- **s.19** the nine employer duties, as a register with the evidence for each
- **s.21 / s.22** annual return and Board's Report
- **Rule 7** notice in 7 working days, reply in 10
- **Rule 8(5)** delay disclosure

## Quick start

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and pick a role from the sign-in screen.

## Demo behaviour

Sign-in is held **in memory** — refreshing returns to the sign-in screen by design.
Workflow progress persists to `localStorage`, so a walkthrough survives an accidental
refresh. *Reset workflow demo* on the Case lifecycle page restores the seed.

There is no backend. All data is fixtures.

## Stack

React · TypeScript · Vite · React Router · Recharts · Lucide

Charts and dials share one visual vocabulary in `components/workflow/` so five
visualisations on a page read as one system rather than five libraries.
