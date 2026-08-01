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

---

## Phase 11 (run early) — The Defensibility Pack (`PROMPT 4`)

**Run out of order at the operator's request.** The plan placed this after Phase 5
(evidence hashing) and Phase 10 (minutes) so it could include them. Running it now means
those pieces get built here instead, at the depth the pack needs — which is genuinely
less than a full Phase 5, and the difference is recorded honestly under "what is real"
below rather than papered over.

### Plan

**Ten sections, one hash chain, three options, a four-second assembly, a preview.**

#### Dependencies this pulls forward

- **SHA-256** — Phase 5 owns evidence hashing. The pack needs a hash per item and a root
  hash for the certificate, so hashing is built here using **Web Crypto**
  (`crypto.subtle.digest`) — no dependency, and it is the same primitive Phase 5 and
  W5 (the Ledger) will use. Canonical JSON serialisation so a hash is reproducible.
- **Redaction** — option 3 says the redacted pack "uses the Presenter Mode alias system",
  which is Phase 2 and does not exist. Building the alias layer here rather than a
  throwaway: `lib/defensibility/alias.ts` is written as the shared vocabulary Presenter
  Mode will consume, so Phase 2 wires a toggle to it instead of inventing a second one.
- **Minutes** — Phase 10 owns the minutes editor. The pack prints whatever minutes exist
  on a sitting today; it does not invent a richer structure.

#### The PDF library

`jsPDF`. The prompt explicitly sanctions a client-side library and forbids pypdf. Chosen
over `pdf-lib` because it is roughly a third of the size and has the text-flow primitives
this needs; the pack is typeset text, not PDF surgery.

Standing Rule 5 asks for a reason on any new dependency, and there is a second one worth
recording: it is **dynamically imported**, so it code-splits out of the main bundle and
only downloads when somebody actually generates a pack. The main bundle does not grow.

#### Structure

- `lib/defensibility/hash.ts` — canonical serialise + SHA-256 + short-form display
- `lib/defensibility/alias.ts` — the redaction vocabulary (Complainant A, Witness 1,
  Internal Member 1, `•••• ••••` for contact details at matching character width)
- `lib/defensibility/pack.ts` — assembles the ten sections from existing data, hashes
  each, then computes the root. Pure: no rendering, so it is testable and so W5 can reuse
  the same assembly for the Ledger.
- `lib/defensibility/render.ts` — jsPDF. Serif body, running header with the case ID,
  "Page x of y", diagonal watermark, section cover pages.
- `components/defensibility/PackDialog.tsx` — options → assembly sequence → preview.

#### Auditable

Generating a pack is itself an event. The workflow store gains `packExports` on the flow
and `recordPackExport()`, so the access log in a *later* pack shows who exported the
earlier one. That is the property that makes an access log worth anything.

### Execution

Done. Typecheck clean, build passes, **lint zero errors**, browser run **zero console
errors**. A real 16-page PDF was generated and its contents extracted and inspected —
not just the metadata.

**What was verified, by opening the file rather than trusting the UI:**

- 16 pages, valid `%PDF-` header, 29 KB, 10 sections
- Every required element present in the extracted text: cover, `Page 1 of`, running
  header, `Root SHA`, chronology, quorum results, `NOT MET` on failing tests, the
  s.16 confidentiality line, the recipient in the watermark, certificate page
- **Redaction leak-checked against all ten real people in the fixture.** In the redacted
  pack: zero occurrences of any party or committee member, zero email addresses, zero
  phone numbers. The only real name is the person who generated it, on the cover and the
  certificate — required, since an unsigned certificate of completeness is worthless.
- Root hash differs between the redacted and unredacted packs, as it must
- The export is recorded on the flow: `{by: Priya Sharma, role: Presiding Officer,
  redacted: false, pages: 16, hash: 38398997694c}`

**Role gate:** the button appears for Presiding Officer, IC member, External Member,
POSH Admin and Company Owner. HR SPOC and Management cannot even reach the case
workspace — the `InquiryOnly` route guard turns them away first.

**Assembly:** 3.6 seconds, narrating each section as it is genuinely built and hashed.

### Two bugs found by driving the UI

1. **The dialog rendered off-screen.** It reused the global `rise` keyframes, whose
   `to { transform: translateY(0) }` with `fill-mode: both` persists after the animation
   and *overwrote* the `translate(-50%, -50%)` that centres a fixed modal. The dialog sat
   at viewport-centre as its top-left corner, with its buttons past the right edge. Fixed
   with its own keyframes that carry the centring. **Worth remembering for Phase 4** —
   any centred element animated with a transform has this problem, and `rise` is used
   widely.
2. **The preview was blank.** It was an `<iframe>` pointed at the blob, which relies on
   the browser having a PDF plugin. Replaced with page-shaped section thumbnails drawn
   from the pack model — always render, carry each section's title, entry count and
   digest — plus "Open the PDF" which hands the real document to the browser's viewer.

### Decisions and deviations

- **Run out of order**, at the operator's request. Consequences are under "what is real".
- **jsPDF added** — sanctioned by the prompt, chosen over pdf-lib for size, and
  **dynamically imported** so it code-splits. The main bundle went 1.226 → 1.251 MB
  (+25 KB for the dialog); jsPDF's 399 KB and its optional deps sit in separate chunks
  that only download when somebody generates a pack.
- **No pdf.js.** True page rasterisation for thumbnails would cost roughly a megabyte to
  show a preview of something the reader can open in one click. The section thumbnails
  are honest about being a contents preview.
- **Hashing built on Web Crypto**, no dependency. `canonical()` sorts object keys at
  every depth because `JSON.stringify` is insertion-ordered and would make the same
  record hash differently depending on how it was assembled — a hash that is not
  reproducible is not evidence.
- **The alias layer is the Presenter Mode foundation**, not a throwaway. Phase 2 should
  consume `lib/defensibility/alias.ts` rather than write a second vocabulary; if the two
  ever disagree, the confidentiality claim collapses.
- **Excluding the access log states the count** of withheld records, so absence cannot be
  read as non-existence.

### What is real, and what is not

- **Real:** all ten sections, per-section and root SHA-256, quorum and s.4 tests
  recomputed at print time, redaction, watermark, page numbering, the auditable export
  record.
- **Evidence hashes cover metadata, not file bytes** — the fixture has no files. Phase 5
  should hash content on upload and store it; the pack will then print the stored digest
  instead of recomputing from metadata. **TODO: revisit in Phase 5.**
- **Minutes print whatever exists on a sitting today.** Phase 10's structured editor will
  give them per-speaker attribution and versioning; the pack will pick that up for free.
- **No verification UI yet.** The pack states its digests; recomputing them to prove the
  document is unaltered is W5 (the Ledger). *(Closed in Phase 5 for evidence items.)*

---

## Phase 5 — Evidence integrity and the document layer (`PROMPT 5`)

### The thing that was actually wrong

Phase 4 hashed evidence *at export time*. That reads like integrity and is not: a digest
derived from the record at the moment you print it will always match the record, because
it came from it. It can never disagree, so it can never detect anything.

Phase 5 moves the digest to **intake** and never recomputes it. `verifyIntegrity` hashes
the item as it stands now and compares. That comparison can fail, which is the only
reason it is worth doing.

### What was built

- `lib/evidence/model.ts` — the admission state machine (Submitted → Under review →
  Admitted / Not admitted), custody types, intake hashing, verification, upload
  validation. A refusal without a reason is rejected **in the store**, not in a form.
- `lib/evidence/download.ts` — watermarked release. Diagonal, low opacity, repeated down
  the page so a cropped screenshot still carries it, naming the recipient, their role,
  the timestamp and the s.16 restriction.
- `components/evidence/EvidencePanel.tsx` — preview, integrity, provenance, admission,
  custody. Opening it **is** a read and is recorded: under s.16 the question asked
  afterwards is who *saw* the file.
- `components/evidence/EvidenceDropZone.tsx` — drag-and-drop with a keyboard path,
  per-file validation, and errors that name the file, the problem and the limit.
- `pages/EvidenceRegister.tsx` — rebuilt: four filters (search, case, state, party),
  multi-select with bulk verify / admit / refuse, exhibits separated from filed material.

Evidence gained fields by **extension**, not replacement: eleven screens read the old
three-value `status`, so `state` became the source of truth and the store derives
`status` from it in one place. Nothing downstream needed touching.

### Verified by driving it

- 48 items, **48 of 48 digests fixed** at intake
- Custody grows on real events: 1 → 2 (preview) → 3 (verify) → 6 (state changes,
  download). Nothing in the store edits or deletes an entry.
- State transitions work; **E-01 issued on admission**; refusal blocked without a reason;
  the reason then shows on the item
- Watermarked download names the exhibit: `POSH-2026-0158-E-01-….pdf`
- Upload rejections are specific: *"huge.pdf is 26.0 MB. The limit is 25 MB"*,
  *"thing.exe is a X-MSDOWNLOAD file. Accepted: PDF, PNG, …"*
- **Tamper test — the one that matters.** Edited a stored item's content directly in
  localStorage, left its digest untouched, reloaded, and verified: *"Tamper warning — the
  item no longer matches its intake digest"*, both hashes displayed side by side, and
  `DIGEST MISMATCH` written to the custody trail.

Typecheck clean, build passes, lint **zero errors**, browser run **zero console errors**.

### A bug found by driving it

**The slide-over never updated.** It took the item as a prop, captured at click time, so
admitting an item or appending custody changed the store while the panel went on
rendering its copy — custody stuck at 1, the state pill never moved, the refusal reason
never appeared. It now takes an *id* and selects the item live. The guard for a missing
item sits **after** every hook, so hook order cannot depend on whether it resolved.

### Deviations and what is still not real

- **Digests cover metadata, not file bytes.** The fixture has no bytes. Files uploaded in
  this session are held as object URLs and do preview, but they are session-scoped and
  the digest still covers the record. Swapping to `crypto.subtle.digest` over an
  `ArrayBuffer` is a one-line change in `computeHash`; the comparison logic is identical.
- **Watermarked download produces a cover sheet**, not the original file, for the same
  reason. It is real, it carries the watermark and the digest, and it says what it is
  rather than pretending to hand over a document that does not exist.
- **Bulk export / zip not built.** Bulk verify, admit and refuse are; a zip would need a
  compression dependency for material that does not exist yet. **TODO: revisit** with
  real files.
- Seeded digests are hydrated once on first mount, because seeding is synchronous and Web
  Crypto is not. After that they are stored and never recomputed — a digest refreshed on
  every load would always match and prove nothing.

---

## Phase 6 — Documents, minutes and correspondence

*Section 3 of the prompt (transcription) was dropped on the user's instruction, along with
every AI surface. Sections 1, 2 and 4 built in full.*

### Plan

Three surfaces, all on the case record so nothing has to be found in a second place:

1. **A template library** — nine statutory documents, merge fields prefilled from the case,
   a live preview of the letter as it will read, and a vault copy hashed at filing.
2. **A minute book** — attributed lines, a quorum snapshot, finalise-and-lock, versions,
   circulation and per-member confirmation.
3. **A correspondence thread** — the seeded log and anything issued in this session in one
   chronological sequence, with an explicit confirm step before anything is served.

### What was built

**`lib/documents/templates.ts`** (already present from an earlier sitting, extended in use,
not rewritten). Nine templates: acknowledgement, notice to respondent, notice of hearing,
witness summons, request for further evidence, interim relief recommendation, findings and
recommendation, and the two outcome notifications.

**`components/documents/DocumentComposer.tsx`** — three columns: library, merge fields,
live preview. Required fields are listed by name above the sheet and the file button stays
disabled until they are filled.

**`components/documents/IssueDialog.tsx`** — the confirm step. Recipient, channel, the
letter as filed, its digest, and a tick that has to be set before *Issue* enables.

**`components/documents/MinutesEditor.tsx`** — five standing headings; *Submissions* and
*Questions put* record line by line against a named speaker. Attendance drives
`sittingQuorumTests`, and the result is frozen into the minutes. Finalising hashes and
locks; revising opens v2 and keeps v1 on the file.

**`pages/Cases.tsx`** — wired into three existing tabs. Nothing was removed: the
Proceedings table gained a minutes button beside its existing badge, the Documents tab
gained a strip above the existing table, and Communications gained a Thread view with the
original table still one click away under a Thread/Table toggle.

### Standing rules

- **Rule 3 — no invented legal content.** Every provision cited in a template already
  existed in `statutory.ts` or the Help centre. Every date is computed by the same
  calculators the compliance clocks use, so a notice cannot state a deadline the case
  record disagrees with. Facts only a human knows — the allegation as put, the measure
  recommended — are required merge fields, and the composer refuses to file without them.
  The minutes editor generates no prose at all.
- **Rule 1 — vocabulary.** The bench, the sitting, carriage, the record, service, the
  minute book. Nothing softened.
- **Rule 2 — nothing broken.** The quorum engine is *consumed* here, not reimplemented.
  Verified after the change: bench language on Committee, the annual return, the six
  compliance clocks, the permission matrix (HR SPOC is offered no drafting control), and
  the workflow machine.
- **Rule 4 — accessibility.** Dialogs carry `role="dialog"`, `aria-modal`, a label and
  Escape-to-close, and take focus on open. Selection is marked by a tick as well as a
  border; "Required" is spelled out, never a red asterisk; quorum results read "met" /
  "not met" beside the icon. Every dialog has its own keyframes carrying its centring
  transform, and all of them are switched off under `prefers-reduced-motion`.
- **Rule 5 — no new dependencies.** None added.

### Verified

26 checks driven in a browser, all passing, **zero console errors**. Typecheck clean,
production build clean.

Covered: the composer refusing to file with a required field empty; the preview updating
live; `Rule 7(1)` and the computed ten-working-day reply window appearing in the letter;
issue staying disabled until the tick is set; the issued letter appearing on the Documents
tab with its digest and in the thread with its body; finalise blocked on empty minutes;
save, finalise, lock, circulate, confirm, and revise-to-v2-keeping-v1; the version showing
on the proceedings row; **HR SPOC offered no drafting control**; and the whole record
surviving a reload.

### Deviations

- **`lib/documents/records.ts` was deleted.** It duplicated types the workflow layer
  already had (`GeneratedDocument`, `HearingMinutes`); keeping both would have meant two
  models of the same thing. The workflow layer's version won because the store was already
  built against it.
- **Delivery state is not simulated.** An issued document reads *Delivered*. Modelling
  bounces and read receipts would mean inventing a mail transport. **TODO: revisit** when
  there is one.
- **Minutes are per-sitting, keyed to the listed hearings.** Sittings scheduled through the
  workflow in-session appear in the Workflow tab; the minute book is reached from the
  Proceedings list.

---

## Phase 7 — Calendar, notifications and the command palette

*PROMPT 7 from `docs/CRITIQUE.md`. All three sections built.*

### Plan

Three pieces of daily infrastructure that were advertised but hollow: the ⌘K affordance
did nothing, the bell showed a hard-coded "5", and the hearing calendar was a month grid
without conflicts, attendance or export. Built in that order — palette first (demo
credibility), then notifications (the bell is next to it), then the calendar surfaces.

### What was built

**1. Command palette**

- `components/command/CommandPalette.tsx` — centred dialog, blurred backdrop, fuzzy
  search (no new dependency), keyboard navigation, grouped results, recent items.
- Search across cases (respecting role visibility and Presenter Mode), people (identities
  gated), documents, evidence and role-scoped destinations.
- Quick actions behind `>`: Schedule a sitting, Generate Defensibility Pack, Toggle
  Presenter Mode, Switch role.
- Top bar search is now a button that opens the palette; ⌘/Ctrl+K works globally.

**2. Calendar**

- `lib/calendar/sittings.ts` — shared sitting collection, diary-conflict detection,
  attendance RSVP (localStorage), reschedule overlays, `.ics` export and a copyable
  feed URL.
- `HearingCalendar` — month/week toggle, chips colour-coded by bench validity, conflict
  banner, per-member confirm/decline with "short predicted", drag-to-reschedule with a
  required reason and quorum re-check.
- `CauseList` — attendance counts and diary conflicts inline; expanded row shows
  confirmed / awaiting / declined per member.
- `HearingsAdmin` — short chips use the amber style; `.ics` export for the whole caseload.

**3. Notifications**

- `FlowNotification` gained `type`, `severity`, `href` and optional `escalatedFrom`.
  Seeds cover clock approaching/breached, sitting at risk, evidence, recommendation,
  report owed and an escalation.
- Bell opens `NotificationCentre` — grouped by day, filterable, mark-all-read, severity
  styling, preferences (in-app / email / digest per type, escalation interval).
- Full `/notifications` page uses the same vocabulary and deep-links every row.

**Presenter Mode (minimal, for the palette action)** — `role-context` persists a toggle
that forces `maskParty` to the masked label for every role. The alias layer from Phase 4
is what a fuller Presenter Mode will consume later; this is enough for the live-demo
action the critique asked for.

### Standing rules

- **Rule 5 — no new dependencies.** Fuzzy search is a few dozen lines.
- **Rule 4 — accessibility.** Palette and notification panel are `role="dialog"` with
  Escape-to-close; severity always pairs colour with an icon and a text label; RSVP
  states are spelled out, not colour alone.
- **Rule 2 — nothing broken.** Quorum engine consumed, not reimplemented. Workflow
  store upgrades old notification snapshots on load.
- **Rule 1 — vocabulary.** Sitting, bench, cause list, carriage. No "meetings" or
  "alerts".

### Verified

Typecheck clean, production build clean, lint reports zero errors (only pre-existing
fast-refresh export warnings).

### Deviations

- **Calendar RSVP and reschedule live outside the workflow snapshot**
  (`sentinel.calendar.v1`). Resetting the workflow demo does not wipe attendance —
  deliberate, so a walkthrough of the cause list survives a lifecycle reset. **TODO:
  revisit** if a single "reset everything" control is wanted.
- **Email and digest channels are preference flags only.** There is no mail transport.
  The preferences UI records intent; delivery is not simulated.
- **Presenter Mode is identity masking only.** Phase 2's fuller treatment (place aliases,
  prose redaction on screen) is still ahead; the palette action toggles what exists.
- **Subscribable feed URL is a `webcal://` demo string.** Copying it is real; a live
  HTTP feed would need a backend. The `.ics` download carries the same events.

---

## Phase 8 — Make it feel magical

*PROMPT 8 from `docs/CRITIQUE.md`. Craft pass — motion, hero clock, surfaces, feedback,
typography, keyboard, sign-in, accessibility.*

### What was built

**1. Motion language.** One curve (`cubic-bezier(0.16, 1, 0.3, 1)`) and three durations
(150 / 250 / 400) as CSS tokens. Page content fades up 8px on enter; `.stagger` assembles
children 40ms apart. `prefers-reduced-motion` kills the lot.

**2. Numbers.** `CountUp` on every numeric `FigureTile` (800ms eased). Quorum / coverage
arcs already drew on mount; deadline strips now fill from the left. Value changes pulse
the cell briefly.

**3. Loading.** Route skeleton shimmer slowed to 2s, lower contrast.

**4. Compliance Clock — hero.** Redesigned as a vertical timeline with a filled progress
spine, state dots (met / running / not started / breached) each with icon + label, live
countdown on the active milestone, urgency colour (emerald → amber ≤14d → red), slow
breach pulse, and statutory basis on hover. Moved above the workflow tracker; left rail
widened to give it room.

**5. Depth.** Three elevation levels (`--elev-border` + soft shadows). Interactive tiles
lift 2px on hover. Sliding emerald nav indicator. 2% noise texture over the shell.

**6. Feedback.** Toasts already stacked; Undo actions now hold for 8s with a matching
progress hairline. `.btn.busy` shows an inline spinner instead of a mute disabled state.
`pushUndo` helper added.

**7. Typography.** Body line-height 1.6. Tabular nums and mono for IDs/clocks already in
place; six-size scale preserved.

**8. Keyboard.** `g c` / `g b` / `g r`, `?` shortcut sheet, `j`/`k` on `[data-nav-list]`
(cause list wired). Focus rings were already 2px emerald at 2px offset.

**9. Sign-in.** One-line permission blurb under each demo role; staggered entrance;
selection lifts the card, dims the rest, then transitions into the app.

**10. Accessibility.** Secondary/tertiary text lightened for AA on the dark canvas.
Clock and toasts use `aria-live`. Colour never alone — every clock state has icon + word.

### Deviations

- **Optimistic workflow rollback** is not simulated — there is no failing backend. State
  already updates instantly; a visible rollback would be theatre without a failure mode.
- **Before/after screenshots** are for the human to capture in the running app; the craft
  changes are structural and visible on every dashboard and case record.

---

## Phase W1 — Time Machine

*PROMPT W1 from `docs/CRITIQUE.md`. Event-log reconstruction of any past case date,
with scrubber, historical visual language, and a twelve-second Replay.*

### Data model

The case is an ordered **event log**, not a set of snapshots. Sources merged into
`TimelineEvent[]`: statutory milestones on the Case record, workflow history, fixture
evidence / sittings / documents, and in-session flow records. State at a date is
`deriveAt(record, flow, asOf)` — filter `at ≤ asOf`, then project stage, milestones,
clocks, evidence, documents, hearings, recommendations, and truncated history.

### What was built

**1. Scrubber.** Slim bar under the case header (`TimeMachineBar`): track from filing to
today, diamond notches for significant events (hover tooltip), drag handle (rAF-throttled),
date jump, Return to today, keyboard arrows / Home / End.

**2. Live re-derive.** Workflow tracker, StagePill, Compliance Clock (with `asOf`),
evidence register, documents, sittings, recommendations, activity feed, and workflow
history all re-render from the derived view.

**3. Historical language.** Sepia desaturation + amber border on the case shell; banner
"Viewing as at … — N days ago"; action buttons disabled (ActionPanel + CSS); amber
left-edge `.tm-diff` markers where stage / day / counts differ from today.

**4. Replay case.** Twelve-second animation from filing to today, pausable / stoppable.
Clocks rewind and fill, evidence accumulates, workflow advances.

### Deviations

- **Committee membership over time** is not yet modelled in fixtures — the IC roster
  shown is today's. Composition changes would need dated membership events on the log.
- **Document version supersession** filters by upload date; there is no separate
  version timeline beyond what fixtures already carry (`v1` / `v2` / `v3` labels).

---

## Phase W4 — Clock Cascade

*PROMPT W4 from `docs/CRITIQUE.md`. What-if simulator: one scheduling change ripples
through every statutory deadline.*

### What was built

**1. Entry.** "Model a change" on the case left rail (under the Compliance Clock) and on
Proceedings — both the tab header and each scheduled sitting row.

**2. Controls.** Sitting shift (days), evidence verification delay, extra reply days, and
a committee unavailable date range.

**3. Side-by-side cascade.** Current projection vs projected outcome for notice, reply,
evidence, next sitting, inquiry, report, employer action, and appeal. Connecting lines
carry the delta. Emerald / amber / red severity with plain-language overshoot copy.

**4. Headline.** One sentence at the top — breach ("…would require a recorded reason") or
comfort ("…N days to spare"). Recomputes live as inputs change.

**5. Motion.** Dates roll, lines redraw, severity colours transition (~300ms); a breach
row gets one restrained red pulse. Reduced-motion respected.

**6. Commit.** "Apply this change" shifts upcoming sittings via `sittingDateOverrides` on
the flow and files an advisory note. "Save as a note" attaches the projection without
moving dates (concern flag when the inquiry would breach).

### Deviations

- **Apply** moves sittings (and records the note); evidence/reply delays are modelled in
  the projection and saved in the note, but do not rewrite statutory `replyDue` on the
  Case fixture — those windows are fixed by law from filing/notice.
- Calendar views outside the case workspace do not yet read `sittingDateOverrides`.
