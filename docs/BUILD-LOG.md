# Sentinel — build log

Running record of each phase: what was done, what was decided and why, what was
deferred, and anything a human should check.

---

## Phase 0 — Restore the broken roles

**Status: no work required. The premise was already resolved.**

The audit (`docs/CRITIQUE.md` §1a) reports that five of eight demo sign-ins are dead —
Employee, HR SPOC, Internal Committee member, External Member and Company Owner — with
only POSH Admin, Presiding Officer and Management reachable.

Tested all eight from a clean page load, by **mouse click and by keyboard Enter**
separately, since the audit specified both fail:

| Role | Click | Enter | Nav items | Lands on |
|---|---|---|---|---|
| Employee | ✓ | ✓ | 8 | Welcome, Ananya |
| HR SPOC | ✓ | ✓ | 11 | Rajesh Kumar · HR SPOC |
| POSH Admin | ✓ | ✓ | 25 | Anita Sharma · POSH Admin |
| Presiding Officer | ✓ | ✓ | 12 | Priya Sharma · Presiding Officer |
| Internal Committee member | ✓ | ✓ | 11 | Vikram Mehta · IC member |
| External Member | ✓ | ✓ | 10 | Farah Qureshi · External Member |
| Management | ✓ | ✓ | 1 | Compliance command centre |
| Company Owner | ✓ | ✓ | 27 | Saanya Kapoor · Company Owner |

Eight of eight, both input methods, zero console errors.

**Why the audit saw otherwise:** it was performed against the build that was live on
Vercel at the time (`index-BC6P8vao.js`). The five roles it lists as broken are exactly
the five whose dashboards were built later in the same working session, and which only
reached production minutes before this phase began. The audit is accurate about the build
it tested and stale against the current one.

**Honest completeness assessment of the five, as §1a asks for.** None is a placeholder:

- **Employee** — fully built. Own-case scoping, tracker with committee/hearings/history,
  documents wallet split submitted vs received, help centre, profile with an access log.
- **HR SPOC** — fully built. Intake desk with funnel, notices register, s.19 duty
  register. Deliberately excludes all inquiry content, and says so on screen.
- **Internal Committee member** — fully built. Inquiry queue, attendance ring, own tasks.
- **External Member** — fully built. Oversight, advisory panel, evidence register,
  documents vault, summary workspace.
- **Company Owner** — fully built. Governance band (four figures, compliance index,
  derived important-notices, response-rate vs incident-density) over the whole admin
  console, plus provisioning and company settings.

What this means for later phases: no phase needs to *build* a missing dashboard. All
later work is extension and polish, as intended.

---

## Phase 1 — Foundations (`PROMPT 1`)

### Plan

**Order chosen: item 2 first, then 1, 3, 5, 4.** The audit's own closing line says the
data inconsistency "is the thing that will actually hurt you", and items 1 and 5 both
render numbers that item 2 changes — doing the fixture first avoids wiring deep links and
KPI filters to figures that are about to move.

#### 1.2 — One canonical fixture (the root problem)

The contradiction is not a rounding error. `src/data/annualReport.ts` holds a **real,
filled annual return for a different organisation entirely** — Jijiwisha Society, 2
employees (1M/1F), 0 reported cases, and an Internal Committee of Shuchita Singh /
Parveen Akhter / Shweta Singh / Sneha Kala with four personal mobile numbers. The case
fixture next to it is a 24-case corporate caseload across six offices with an IC of Priya
Sharma / Vikram Mehta / Farah Qureshi / Deepak Rao.

Two unrelated datasets in one application. That is why the roster changes identity when
you switch roles, and why "Open 19 / Closed 5" sits beside "Reported cases 0".

There are also **three different headcounts**: `COMPLIANCE.totalEmployees` = 2,450
(commented "single source of truth"), `boardDisclosure` workforce = 4,482,
`ANNUAL_REPORT.employees.total` = 2.

Approach — **extend, do not replace**, because Standing Rule 2 protects both the
17-field annual return and the anonymised Management console:

- New `lib/data/organisation.ts`: one organisation — name, six offices across five
  cities, headcount by office and by gender, departments. This becomes the only place a
  headcount is written down.
- Keep all 17 annual-return fields and their labels exactly. Change only where the
  *values* come from: every count is computed from the case fixture and the organisation,
  never typed in.
- Replace the Jijiwisha IC roster with the real one derived from `USERS` + committees, so
  Management and the Presiding Officer see the same four people.
- Remove the four real personal mobile numbers. They are live personal data of real
  named individuals sitting in a demo fixture, and the Management banner claims
  identities are never rendered while rendering them. Replaced with fixture contacts.
- A consistency test asserting the same roster and the same aggregates across roles.

Not touched: the six compliance clocks, the quorum engine, the s.4 validation, the
21-step machine, the permission matrix. This phase changes where numbers come from, not
how the law is applied.

#### 1.1 — Deep linking

**Noted conflict with the existing design.** The codebase deliberately keeps sign-in in
memory — `role-context.tsx` says so in a comment, and the sign-in screen advertises
"Refreshing returns to this screen." Prompt 1 requires the opposite. Prompt 1 wins, per
the execution order; the comment and the on-screen line both get corrected so the code
does not contradict itself.

- Persist the selected role to `localStorage`, read synchronously in the `useState`
  initialiser so there is no one-frame flash to the sign-in screen before hydration.
- `/cases/:id?tab=evidence` — read the tab from the URL, and write tab changes back to it
  with `replace` so the back button still leaves the case rather than cycling tabs.
- "Copy link" on the case record with a toast.
- Sign-out clears the persisted session.

#### 1.3 — Truncation

The "DELIBERATI" bug is `s.type.slice(0, 10)` in `CauseList.tsx` — a hard character
truncation I wrote. Fixed at source rather than with CSS. Then the case-record tab bar
gets horizontal scroll with a fade affordance, and a width audit at 1280 / 1440 / 1920.

#### 1.4 — Empty states

One `<EmptyState>` component (icon, headline, one line, optional action), applied to the
six surfaces named in the prompt. Tone plain, never cute.

#### 1.5 — Live KPI cards

The four bench tiles become links into the cause list / case list carrying a filter in
the URL, shown as a removable chip. URL-driven so it composes with deep linking from 1.1.

### Execution

All five items done. Typecheck clean, build passes, lint reports **zero errors**, and the
browser sweep found **zero console errors**.

**1.2 — canonical fixture.** New `lib/data/organisation.ts` sums a headcount of **4,482**
from eight offices, with the gender split (1,847 W / 2,591 M / 44 T) taken from the
Board's Report — the only one of the three competing figures already reconciled against
the case fixture. `COMPLIANCE`, the annual return and the Board's Report now all derive
from it. `lib/data/consistency.ts` asserts twelve invariants: **12/12 pass.** Verified in
the browser that Management, POSH Admin and the annual return all render the same four
committee members, no Jijiwisha names anywhere, and **zero phone numbers**.

**1.1 — deep linking.** Role persists to `localStorage`, read synchronously.
`/cases/POSH-2026-0142?tab=evidence` opens on the Evidence tab; reload preserves route,
tab and role. "Copy link" copies the full deep link — verified via the clipboard API —
and raises a toast.

**1.3 — truncation.** `type.slice(0, 10)` replaced with a short-form map plus a `title`.
Labels now read `FINAL` / `DELIB.` / `DEPOSIT.` — "Deliberati" is gone. Tab bar wrapped in
`ScrollTabs`, which reports `data-at-start` / `data-at-end` for a fade affordance and
scrolls the active tab into view on deep link. At 1280px: zero clipped tab labels.

**1.4 — empty states.** One `EmptyState` component on all six named surfaces. Copy is
context-aware — filtering the cause list to "Past the 90-day limit" with no matches says
*"Nothing on your cause list meets that condition — which is the answer you wanted"*
rather than "no results".

**1.5 — live KPI cards.** All four bench tiles are links; filters travel in the URL and
render as a removable chip. Verified: tile → `/cause-list?filter=near-limit` → chip reading
"Within 14 days of the limit · 14" → removing it returns to the unfiltered list.

**Protected features re-verified after the changes:** quorum rings render, 12 s.4 test rows,
Bench valid/short still 3/1, all six statutory clocks present (Rule 7(1), Rule 7(4),
s.11(4), s.13(1), s.13(4), s.18), 21-step workflow tracker intact, Management console
still name-free.

### Decisions and deviations

- **Eight offices, not six.** The critique says six across five cities; the case fixture
  references eight distinct locations and joins cases to them by name. Changing them
  would orphan case data, so the fixture won. **A human should confirm which is
  intended** — if six is correct, the caseload's location strings need editing too.
- **Headcount anchored to 4,482**, not `COMPLIANCE`'s 2,450. The Board's Report is a filed
  statutory disclosure whose `sourceCaseCount` already matched `CASES.length`; the other
  two figures had nothing tying them to anything.
- **Real personal data removed.** The old return carried four named women and their
  personal mobile numbers, rendered under a banner promising identities are never shown.
  Replaced with the fixture committee and work email addresses. This is a fix, not
  invented legal content — no statutory text was touched.
- **Session persistence reverses a deliberate design.** Noted in the plan; the code
  comment and the sign-in screen's "refreshing returns to this screen" line were both
  corrected so nothing in the repo now contradicts the behaviour.
- **Narrative annual-return fields are still authored text**, because they record what an
  organisation actually did and cannot be derived. Only counts are computed.
- **A toast system landed early.** Phase 4 specifies the full treatment; this is a minimal
  version built to be extended — `push()` already accepts an `action`, so adding Undo is a
  prop, not a rewrite.
- **No new dependencies.** `vite-node` was used once via `npx` to execute the consistency
  checks and was not added to `package.json`.

### To check / carry forward

- Six vs eight offices (above).
- The Company Owner dashboard renders 3 of 4 committee names inline; the full roster is on
  `/annual-report`. Not a consistency failure, but worth a look in Phase 12.
- `assertConsistency()` exists but is not yet wired into dev startup — deferred to avoid
  touching `main.tsx` during a fixture phase. **TODO: revisit** in Phase 4.
- Bundle is 1.23 MB (322 KB gzipped). Route-level code splitting is worth doing before the
  demo; not in scope for this phase.
