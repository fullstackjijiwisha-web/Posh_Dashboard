# Sentinel — Product & Craft Critique
### What's missing, what to add, and how to make it feel magical

**Audited live:** all 8 roles, every screen, 1 August 2026
**Goal:** beat Ungender Conduct, POSH360 and ePOSH outright

Every section ends with **complete, copy-paste prompts for Claude in VS Code.**

---

## How to use this document

Save this file in the repo at `docs/CRITIQUE.md` and reference it with `@docs/CRITIQUE.md`.

**Do not run all seventeen prompts in one go.** Claude will do a shallow pass on everything instead of a good job on anything, and you'll lose the thread when something breaks. Run **one prompt per session**, in the order given in §6, and commit between each.

The working loop for each prompt:

1. Start a fresh session. Paste: `Read @docs/CRITIQUE.md, then do PROMPT [n]. Plan first, don't write code yet.`
2. Read the plan. Push back on anything that looks wrong or over-engineered.
3. Say `Go ahead.`
4. Check it in the browser yourself before committing.
5. `git commit` — so you can always roll back one prompt, not one day.

Two standing rules worth giving Claude at the start of every session:

- **Never change the visual language.** Dark theme, `#0F172A` base, emerald accent, judicial vocabulary — the bench, cause list, sittings, carriage of the case. That vocabulary is the product's biggest asset.
- **Never break what already works.** The quorum engine, the s.4 board validation, the six compliance clocks and the eight-role permission matrix are the strongest things in the product. If a change would touch them, stop and ask first.

---

## 1. Where you actually stand

Your case record screen is better than anything your competitors ship. The three-column layout — workflow rail, tabbed centre, live activity feed — with six statutory clocks running down the left and "Restricted — access logged" pinned top-right is genuinely category-leading. The quorum ring, the "Bench short" badge, the s.4 board validation: these are real.

So the gap isn't ideas. It's that **the product currently behaves like a beautiful read-only report and not like a tool you live inside.** Almost nothing is interactive. There's a search bar that looks like it does nothing. There are no filters. You can't send anyone a link. You can't export anything. There's no AI. There's no motion.

Three specific things are costing you the "wow":

1. **You can't share a link.** Every URL bounces to the sign-in screen. `.../cases/POSH-2026-0141` — dead. In an enterprise tool, "send me that case" is the single most common action in a day, and yours can't do it.
2. **Nothing moves.** No transitions, no skeletons, no count-ups, no toasts, no hover depth. Numbers just appear. In a demo, motion is what reads as "expensive".
3. **There's no AI anywhere**, while Ungender ships PoSHGPT and POSH360 markets an "AI compliance engine". This is the biggest single perception gap, and the easiest to close spectacularly.

---

## 1a. 🔴 Five of your eight roles cannot be opened at all

Tested repeatedly, from a clean page load, with both mouse and keyboard.

| Role | Demo sign-in |
|---|---|
| Employee | **Broken** — button takes focus, nothing happens |
| HR SPOC | **Broken** |
| POSH Admin | Works |
| Presiding Officer | Works |
| Internal Committee member | **Broken** |
| External Member | **Broken** |
| Management | Works |
| Company Owner / Super Admin | **Broken** |

**Only three of eight personas are reachable.** Employee is the first button on the screen and the highest-volume user in any real deployment — every complainant in the organisation. Company Owner is the person who would actually sign the contract. If either is clicked during the demo, nothing happens, and the room watches you click a dead button.

This also means Sentinel is being *seen* as an IC tool when it is in fact an organisation-wide platform — which is a positioning problem as much as a bug. The three working roles are all committee-and-admin side. The whole employee-facing half of the product is invisible.

**Fix this before anything else in this document.**

```
Five of the eight demo sign-in buttons do not work.

Working: POSH Admin, Presiding Officer, Management.
Broken: Employee, HR SPOC, Internal Committee member, External Member,
Company Owner / Super Admin.

The broken buttons receive focus but do not sign in — no navigation, no
console error, no state change. Both click and Enter fail. This reproduces
from a clean page load.

Please:
1. Find the root cause. Check whether these roles are missing from the role
   fixture, whether their dashboard routes exist, whether the handler is
   failing silently on a missing property, and whether an error is being
   swallowed by a try/catch or an error boundary.
2. Fix all five so every role signs in and lands on a complete dashboard.
3. Add a smoke test that signs in as each of the eight roles in turn and
   asserts the correct dashboard renders, so this can never regress
   silently.
4. Remove any silent catch that hid this. Failures must surface.
5. Then walk each of the five previously-broken roles and tell me honestly
   how complete each dashboard actually is — fully built, partially built,
   or a placeholder. I need to know which ones are demo-ready and which are
   scaffolding.
```

---

## 1b. Sentinel is not an Internal Committee tool — stop describing it as one

The sign-in screen says *"Statutory case management for Internal Committees."* That is undershooting your own product by a wide margin.

What's actually in there, across roles:

- **Employee** — the complainant's channel: filing, evidence, outcome, feedback
- **HR SPOC** — intake, deliberately constrained so HR cannot drive the process
- **POSH Admin** — the operational hub: duty register, SLA health against five statutory timelines, twelve-month complaint trend, task queues, audit log, establishment view. **This is the richest screen in the application and I under-weighted it in my first pass**
- **Presiding Officer / IC member / External Member** — the bench
- **Management** — anonymised compliance console and the statutory annual return
- **Company Owner / Super Admin** — provisioning and the whole estate

That is an **organisation-wide compliance platform with a committee module inside it**, spanning six offices across five cities. Ungender, POSH360 and ePOSH all sell to HR. You have a product that serves the complainant, the intake desk, the committee, the administrator, the executive and the owner — each with a genuinely different view and genuinely different permissions.

Change the positioning line to reflect it. Something like:

> **"PoSH compliance for the whole organisation — from the person raising a complaint to the board reviewing the estate."**

Then say in the demo: *"Eight roles. Every one sees a different product. None of them can see what they shouldn't."* That sentence sells the permission architecture, the confidentiality model and the breadth in one go — and it's a sentence none of your competitors can say.

---

## 2. Screen-by-screen — what's missing

### 2.1 Sign-in
Clean and confident. But eight identical grey role buttons give no sense of what each persona will *see*. **Add a one-line description under each role** ("Sees only the cases she sits on") — it turns the login screen into a free explanation of your permission model, which is your best story.

### 2.2 The bench (Presiding Officer dashboard)
Strong. Missing:
- **The four KPI cards are dead ends.** "Past 90 days — 1", "Within 14 days of limit — 4" should be clickable filters into the cause list. Right now they're posters.
- The sparkline-free stat cards on the bench don't trend. Management's do. Inconsistent.
- No "what needs me today" single answer. The PO opens this at 9am wanting one line: *do this first.*

### 2.3 Cause list
- **No filters or sort at all** beyond Ahead / Held / All — no filter by location, bench status, case, date range, or member.
- **No calendar export.** A Presiding Officer lives in Outlook. No `.ics`, no subscribe feed. This is a daily-friction miss.
- **The warning banner has no action.** "Adjourn or reconstitute before the day" — but there's no button to adjourn or reconstitute.
- **No conflict detection.** Nothing warns you that Farah Qureshi is listed at Nehru Place and Whitefield on the same morning.
- **No attendance confirmation.** The way to prevent "Bench short" is to ask members to confirm in advance. Nothing does.
- **Text truncation bug:** "DELIBERATI" is cut off at 1488px width. Visible in a demo.
- Four sittings consume three screens of scroll. Far too airy.

### 2.4 Case record
The best screen you have. Missing:
- **No case subject line.** Just `POSH-2026-0141`. Humans need "Conduct at offsite — Procurement" to tell cases apart.
- **The Communications tab is cut off** at 1488px — the tab bar overflows with no visible scroll affordance.
- **Activity feed is an undifferentiated grey wall.** No icons, no day grouping, no filter by event type. Its whole value is being scannable evidence.
- **The compliance clock is your best asset and it's in the narrowest column**, small and low-contrast.
- **"Record reason for delay" is a text link** where it should be a prominent, slightly alarming button.
- No case notes, no private committee deliberation space, no conflict-of-interest declaration per member.

### 2.5 Evidence register / Documents vault
- No inline document preview, so every review is a download.
- **No chain of custody.** For a defensibility product this is the obvious gap: SHA-256 hash on upload, immutable timestamp, tamper-evident seal, full view history per document.
- No watermarking on export — the commonest real leak is a forwarded PDF.

### 2.6 Recommendation centre
- Four cases share a **word-for-word identical** finding. Reads as filler immediately.
- No drafting surface — "Draft the report" implies one, but there's no template, no structure, no guidance.

### 2.6a POSH Admin console
The strongest screen in the product, and I under-rated it first time round. The duty register mapped to s.4 / s.19(b) / s.19(c) / s.19(i) / s.21, the SLA health panel showing all five statutory timelines with hit rates, the task queue with overdue states, and the twelve-month trend with that genuinely thoughtful annotation — *"a rising filing rate is not in itself a bad sign; under-reporting is the harder problem"* — are all excellent. That annotation is the best sentence in the application.

Missing:
- The four "Waiting on you" counts (boards to assign, recommendations to audit, decisions to record, cases to close) are not clickable. They should be the primary work queue.
- No bulk actions anywhere — assigning boards one at a time doesn't scale past a few cases.
- Pending tasks show four overdue with no escalation path and no way to reassign.
- The duty register sits at 50% posture with no explanation of what would move it, and no link to the actions that would.
- "Committee boards: 2 · one short of s.4" is a live compliance failure surfaced as a passive stat. It should be an action.

### 2.6b The roles nobody can see
Employee, HR SPOC, Internal Committee member, External Member and Company Owner could not be opened at all (see §1a), so I cannot assess them. When they're fixed, these are the specific things to check — and they're the areas most likely to be thin, because they've clearly had less attention:

- **Employee** — can a complainant file without a colleague seeing the screen? Is there a save-and-return draft? Is the tone of the intake form humane rather than bureaucratic? Can they track status without seeing committee deliberations? This is the screen that decides whether people actually report.
- **HR SPOC** — is the constraint visible and reassuring? The whole point of this role is that HR *can't* drive the process, which is a selling point, and it should be legible on screen.
- **IC member / External Member** — how do these differ from the Presiding Officer view? An external member is not an employee, logs in occasionally, and needs orientation each time. Do they get context, or the same dense bench?
- **Company Owner** — provisioning, the multi-location estate, and the s.13(4) 60-day clock, which is the employer's own exposure. This is the person signing the contract; their view should be the most polished in the product, and it is currently unreachable.

### 2.7 Management console
- The KPI cards and the annual return block **contradict each other**: 19 open cases and 5 closed, alongside "Reported cases 0 this year" and "Employees covered 2 · 1M/1F".
- The IC roster differs by role: Presiding Officer sees *Priya Sharma / Vikram Mehta / Farah Qureshi / Deepak Rao*; Management sees *Shuchita Singh / Parveen Akhter / Shweta Singh / Sneha Kala*. **Switch roles live in the demo — which is your best moment — and the committee changes identity.**
- Banner says "identities are never rendered" while rendering four names and four personal mobile numbers.
- No drill-down, no date-range control, no trend comparison, no export beyond the annual return.

### 2.8 Global
- **No deep linking.** Every direct URL → sign-in.
- **Search bar appears non-functional.** ⌘K is advertised and does nothing visible.
- **No empty states** anywhere.
- **No responsive design checked** — needs a mobile pass.
- **No print stylesheet.** Hearings happen in rooms with bad wifi; a printable bundle matters.
- **No email/SMS.** A bell icon isn't a notification system.

---

## 3. The ten features that would put you ahead of everyone

Ranked by how much they'd move a demo.

| # | Feature | Why it wins |
|---|---|---|
| 1 | **Presenter Mode** — one toggle masks every name, photo and identifier across the app, replacing them with role aliases | Nobody has this. It makes screen-sharing a live case safe, and it *demonstrates* your confidentiality architecture instead of describing it. The single most memorable thing you could build |
| 2 | **Sentinel Copilot** — an AI assistant scoped to the case record | Ungender has PoSHGPT, POSH360 has an "AI compliance engine". You have nothing. Closes the biggest perception gap |
| 3 | **The Defensibility Pack** — one-click court-ready PDF bundle: chronology, every clock with dates met, quorum per sitting, evidence index with hashes, full access log | Turns your whole product into a single deliverable a lawyer can hold |
| 4 | **Chain of custody on evidence** — SHA-256 on upload, tamper-evident, full view history | The obvious missing half of "defensibility" |
| 5 | **Hearing minutes with live transcription** | Ungender's strongest feature. Highest-quality evidence you can produce |
| 6 | **Document templates** — notice, hearing notice, reply form, findings, auto-filled from the case | Removes the biggest real-world time sink for every IC |
| 7 | **Command palette (⌘K)** that actually works | Instant "this is a serious tool" signal, five seconds into a demo |
| 8 | **Calendar sync** — `.ics` feed, Outlook/Google, attendance confirmation, conflict detection | Daily friction, invisible until you have it |
| 9 | **Respondent login** | Your case record already models the respondent perfectly. They just can't sign in — so half the journey is invisible |
| 10 | **Multi-language** — Hindi first, then Tamil, Telugu, Bengali, Marathi | India. Nobody serves the shop floor. Enormous differentiator for manufacturing and retail buyers |

---

## 4. The prompts

Run them roughly in this order. Each is self-contained.

---

### PROMPT 1 — Fix the foundations (do this first)

```
You are working on Sentinel, a PoSH Act case management app for Internal
Committees in India. React + Vite, deployed on Vercel. Read the codebase
structure and the routing setup before making changes, then show me your
plan.

Fix five foundational problems:

1. DEEP LINKING IS BROKEN
   Every direct URL (e.g. /cases/POSH-2026-0141, /cause-list) redirects to
   the sign-in screen. Fix routing so that:
   - Any route can be opened directly and, once the demo session is active,
     renders that view.
   - The signed-in role persists across reloads (localStorage), including
     which role was selected.
   - On reload, the user returns to the exact route they were on, not the
     sign-in screen.
   - Deep links to a case work: /cases/:id opens that case with the correct
     tab if a tab is in the URL, e.g. /cases/POSH-2026-0141?tab=evidence.
   - Add a "Copy link" button on the case record that copies the deep link
     and shows a toast.

2. ONE CANONICAL DATA FIXTURE
   The demo data contradicts itself. Management shows "Open cases 19,
   Closed 5" next to "Reported cases 0 this year" and "Employees covered
   2 · 1M/1F". The IC roster differs by role — Presiding Officer sees
   Priya Sharma / Vikram Mehta / Farah Qureshi / Deepak Rao, Management sees
   Shuchita Singh / Parveen Akhter / Shweta Singh / Sneha Kala.
   Refactor to a single source of truth: one organisation, one employee
   list, one set of IC boards, one set of cases. Every view derives from it.
   All aggregate numbers must be COMPUTED from the case fixture, never
   hardcoded. Add a test asserting cross-view consistency.

3. TEXT TRUNCATION
   On the cause list, the sitting-type label renders as "DELIBERATI" —
   truncated. Audit the app at 1280px, 1440px and 1920px for any clipped or
   overflowing text and fix each. On the case record the tab bar overflows
   and "Communications" is cut off — make the tab bar scroll horizontally
   with a visible fade affordance, or collapse overflow into a "More" menu.

4. EMPTY STATES
   There are no empty states anywhere. Design and implement one reusable
   EmptyState component (icon, headline, one line of explanation, primary
   action) and apply it to: cause list with no sittings, evidence register
   with no items, documents vault when empty, notifications when clear,
   recommendation centre with nothing awaiting, search with no results.
   Tone: calm and plain. Never cute.

5. MAKE THE KPI CARDS LIVE
   On the Presiding Officer bench, the cards "Inquiries chaired", "Past 90
   days", "Within 14 days of limit" and "Reports owed to employer" are dead.
   Make each one navigate to the cause list or case list pre-filtered to
   exactly that set, with the active filter shown as a removable chip.
```

---

### PROMPT 2 — Presenter Mode (build this one first if you only build one)

```
Add "Presenter Mode" to Sentinel — a global privacy toggle that makes it
safe to screen-share a live case.

THE IDEA
PoSH case files contain the most sensitive data in a company. Today, showing
the product to anyone means exposing real names. Presenter Mode masks every
identifying detail across the entire app with a single switch, so the
workflow stays fully legible while identities disappear.

REQUIREMENTS

1. A toggle in the top bar, always visible, with a clear on-state — a small
   "PRESENTING" pill with a subtle pulsing dot. Keyboard shortcut Cmd/Ctrl +
   Shift + P. The state persists across navigation and reload.

2. When ON, across every screen and every role:
   - Party names become role aliases: "Complainant A", "Respondent A",
     "Witness 1", "Witness 2". Consistent per case, so the same person is
     always "Witness 1" within that case.
   - IC member names become "Presiding Officer", "Internal Member 1",
     "Internal Member 2", "External Member".
   - Avatar initials become neutral role glyphs, not letters.
   - Phone numbers, email addresses and employee IDs are replaced with
     "•••• ••••" — same character width, so no layout shift.
   - Department and location generalise: "Delhi — Nehru Place" becomes
     "Location 1". Job titles become "Band 3 — Individual contributor".
   - Document filenames become "Complaint form.pdf", "Evidence item E-01" —
     type preserved, identity removed.
   - The activity feed shows roles instead of names: "External Member viewed
     E-02".
   - Free-text fields (findings, minutes, notes) get a blur overlay with a
     "Hold to reveal" interaction, so the presenter can show one line
     deliberately without exposing the whole block.

3. What must NOT change: case IDs, dates, all clocks, workflow states,
   quorum status, evidence counts, statistics. The entire process must stay
   completely demonstrable.

4. Implement as a React context with a `useMask()` hook plus a `<Masked>`
   component, so masking is applied at the render layer and cannot be
   forgotten. Add an ESLint rule or a dev-mode runtime warning if a
   component renders a value from the `person` or `party` shape without
   going through `<Masked>`.

5. Toggling animates: a 300ms crossfade with a slight blur, so it reads as a
   deliberate act rather than a page reload.

6. Add a first-run tooltip on the toggle: "Mask every identity for
   screen-sharing."

This is the flagship feature. Make the interaction feel precise and
expensive.
```

---

### PROMPT 3 — Sentinel Copilot (the AI layer)

```
Add "Sentinel Copilot" — an AI assistant scoped to PoSH case management.

Competitors ship AI (Ungender's PoSHGPT, POSH360's AI compliance engine).
Sentinel has none. Build the interface and interaction now; wire it to a
real model later. For the prototype, drive it with scripted responses keyed
to intent so it demos perfectly and never hallucinates on stage.

1. ENTRY POINTS
   - A slim rail button, bottom-right, that opens a right-hand drawer
     (420px) which pushes content rather than covering it.
   - Cmd/Ctrl + J anywhere.
   - A "Ask Copilot" action inside the case record that opens it pre-scoped
     to that case, with a chip showing "Scoped to POSH-2026-0141".

2. CAPABILITIES to build, each with a suggested-prompt chip on open:
   - "Summarise this case" — chronology, current stage, what's outstanding,
     what's at risk. Rendered as structured cards, not a wall of prose.
   - "What's at risk this week?" — cases near a statutory limit, sittings
     that would sit short, reports owed. Every item deep-links.
   - "Draft the notice to the respondent" — produces a document from the
     case data using the template system, opens in the editor for review.
     Must always require human approval before anything is issued.
   - "Check this sitting" — validates the proposed bench against s.4
     composition and Rule 7 quorum, and explains any failure in plain words.
   - "What does the annual return still need?" — lists incomplete fields
     with deep links.

3. GROUND RULES, enforced in the UI
   - Every answer cites the case record fields it drew on, as small
     clickable source chips.
   - Copilot NEVER takes a workflow action itself. It drafts and proposes;
     a human commits. Show this as a persistent line in the drawer footer:
     "Copilot drafts. You decide."
   - Copilot respects the current role's permissions and Presenter Mode — if
     masking is on, its answers are masked too.
   - If it lacks the data to answer, it says so plainly rather than guessing.

4. CRAFT
   - Streaming token-by-token render with a soft cursor.
   - A thinking state that names what it's doing ("Reading the compliance
     clock…") rather than a generic spinner.
   - Responses build as cards that fade and rise in sequence, 40ms apart.
   - Copy-to-clipboard on any block.

5. Include a clearly-labelled toggle in dev settings to switch between
   scripted demo responses and a live model endpoint.
```

---

### PROMPT 4 — The Defensibility Pack

```
Build "Defensibility Pack" — a one-click, court-ready PDF export of a
complete case record.

This is the deliverable that makes the whole product tangible. A lawyer
should be able to hold it.

1. TRIGGER
   A prominent button on the case record: "Generate Defensibility Pack".
   Available to Presiding Officer, IC members, External Member, POSH Admin
   and Company Owner. Generating it is itself an auditable event.

2. CONTENTS, in this order, each on its own section with a cover page:
   - Cover: case ID, subject, status, date generated, generated by, and a
     document hash of the pack itself.
   - Chronology: every workflow transition with timestamp, actor and role.
   - Compliance clocks: each statutory deadline, its target date, the date
     met, and whether it was met within the window. Any breach shown with
     the recorded reason.
   - Constitution of the committee: members, roles, and the s.4 composition
     test result at the date of assignment.
   - Sittings: date, time, venue, members in attendance, quorum test result
     for each.
   - Evidence index: every item with its ID, description, who submitted it,
     when, its SHA-256 hash, and its admission status.
   - Documents index: same treatment.
   - Recommendation: current version in full, with all superseded versions
     appended in date order.
   - Access log: every read and write against the case, by whom and when.
   - Certificate page: a statement of completeness with the pack hash and
     generation timestamp.

3. OPTIONS at generation
   - Redacted / unredacted (redacted uses the Presenter Mode alias system).
   - Include or exclude the full access log.
   - Watermark each page with the recipient name, the date, and "Confidential
     — s.16 PoSH Act 2013" at low opacity.

4. CRAFT
   - Typeset it properly: serif body, clear hierarchy, page numbers,
     "Page x of y", running header with the case ID.
   - Show a real generation progress sequence naming each section as it is
     assembled. This takes about four seconds and should feel substantial,
     not fake.
   - On completion, a preview modal with page thumbnails before download.

Use a client-side PDF library. Do not use pypdf.
```

---

### PROMPT 5 — Evidence integrity and the document layer

```
Upgrade the Evidence register and Documents vault from lists into a
credible evidence system.

1. CHAIN OF CUSTODY
   For every evidence item and document:
   - Compute a SHA-256 hash on upload, display it in monospace, truncated
     with a copy action.
   - Record and display: uploaded by, role, exact timestamp, file size, MIME
     type.
   - An immutable custody trail: every view, download, and status change,
     with actor and timestamp. Never editable.
   - A "Verify integrity" action that re-hashes and shows either a green
     "Unaltered since upload" state or a red tamper warning.
   - Version history where a document is superseded — old versions remain
     visible and marked "Superseded", never deleted.

2. INLINE PREVIEW
   Preview PDFs and images in a right-hand panel without downloading.
   Include page navigation, zoom, and a "Download" action that is itself
   logged. Every preview open is an auditable read.

3. WATERMARKING
   Any download is watermarked with the downloader's name, their role, the
   timestamp, and "Confidential — s.16 PoSH Act 2013" — diagonal, low
   opacity, on every page.

4. EVIDENCE STATES
   Model evidence properly: Submitted → Under review → Admitted to record /
   Not admitted (with a required recorded reason). Show state as a coloured
   chip. Filter the register by state, by submitting party, and by date.

5. BULK ACTIONS
   Multi-select with checkboxes; bulk admit, bulk export, bulk download as a
   zip — each action logged individually.

6. DRAG AND DROP upload with a clear drop zone, upload progress, file-type
   validation and a size cap, with graceful, specific error messages.
```

---

### PROMPT 6 — Templates, minutes and communications

```
Add the document generation layer. Internal Committees currently hand-type
every letter, and this is the biggest real-world time sink in the job.

1. TEMPLATE LIBRARY
   Build a template system with these documents, each auto-filled from the
   case record:
   - Acknowledgement of complaint
   - Notice to respondent (with the statutory reply window computed)
   - Notice of hearing (to either party, with date, time, venue)
   - Witness summons
   - Request for further evidence
   - Interim relief recommendation
   - Findings and recommendation
   - Outcome notification to complainant
   - Outcome notification to respondent
   Merge fields pull live from the case. Show a live preview alongside the
   form as fields are completed. Every generated document lands in the
   Documents vault with full custody metadata.

2. HEARING MINUTES
   A structured minutes editor opened from a sitting:
   - Auto-filled: case, date, time, venue, members present, quorum result.
   - Sections: present, apologies, matters considered, submissions by each
     party, questions put, adjournments, next steps.
   - Per-speaker attribution.
   - Save draft / finalise. Once finalised, minutes are locked and any
     change creates a new version with the old one retained.
   - "Circulate for confirmation" sends to members for sign-off, with a
     confirmation status shown per member.

3. TRANSCRIPTION (build the interface, stub the engine)
   - A "Record sitting" control that shows a live waveform and elapsed time.
   - Live transcript pane with speaker labels.
   - On stop: transcript attaches to the minutes as evidence, hashed, with
     an "AI-generated — requires review" banner until a human confirms it.
   - A language selector — English, Hindi, Tamil, Telugu, Bengali, Marathi —
     with translated transcript alongside the original.

4. COMMUNICATIONS TAB
   Make it real: a threaded log of every notice and message issued on the
   case, showing channel, recipient role, sent timestamp, delivery status
   and read status. Compose from a template. Nothing sends without an
   explicit confirm step showing exactly what will go to whom.
```

---

### PROMPT 7 — Calendar, notifications and the command palette

```
Three pieces of daily infrastructure that are currently missing.

1. COMMAND PALETTE
   The top bar advertises ⌘K but nothing happens. Build it properly:
   - Cmd/Ctrl + K opens a centred palette with a blurred backdrop.
   - Fuzzy search across cases (by ID and subject), people (respecting the
     current role's permissions and Presenter Mode), documents, evidence
     items, and navigation destinations.
   - Grouped, labelled results with keyboard navigation and Enter to open.
   - Quick actions prefixed with ">" — "> Schedule a sitting",
     "> Generate Defensibility Pack", "> Toggle Presenter Mode",
     "> Switch role".
   - Recent items when the input is empty.
   - Sub-50ms response. This is a craft signal — it must feel instant.

2. CALENDAR
   - A real month/week view on the Hearing calendar route, colour-coded by
     bench validity, with sittings clickable through to the case.
   - Conflict detection: warn when a member is listed at two venues in an
     overlapping window, shown inline on the cause list and the calendar.
   - Attendance confirmation: members confirm or decline a sitting in
     advance; the cause list shows confirmed / awaiting / declined per
     member, so "Bench short" is predicted days ahead rather than discovered
     on the morning.
   - `.ics` export per sitting and a subscribable feed URL per user, so
     sittings appear in Outlook and Google Calendar automatically.
   - Drag to reschedule, with a confirmation step that requires a reason and
     re-runs the quorum test on the new date.

3. NOTIFICATIONS
   - A proper notification centre behind the bell: grouped by day,
     filterable by type, with read/unread states and mark-all-read.
   - Types: clock approaching, clock breached, sitting listed, sitting at
     risk, evidence submitted, recommendation awaiting you, report owed.
   - Severity styling — a breached statutory clock must look different from
     an FYI.
   - Per-user preferences: in-app, email, and daily digest, per type.
   - Escalation: if a clock passes without action, notify the next role up
     after a configurable interval, and show that escalation on the case.
   - Every notification deep-links to the exact thing it concerns.
```

---

### PROMPT 8 — Make it feel magical

```
This is a craft pass on Sentinel. The product is functionally strong but
feels static — nothing moves, nothing responds, everything simply appears.
Make it feel expensive and alive without becoming showy. Restraint is the
brief: this is software about serious matters. Every motion should feel
purposeful, never playful.

Keep the existing dark palette (#0F172A base, emerald accent) and the
judicial tone. Do not lighten the theme.

1. MOTION LANGUAGE
   - Define one easing curve and use it everywhere:
     cubic-bezier(0.16, 1, 0.3, 1). Durations: 150ms micro, 250ms standard,
     400ms page.
   - Page transitions: content fades up 8px on enter. Never a hard swap.
   - Staggered entry: cards and list rows appear 40ms apart, so a screen
     assembles rather than blinks in.
   - Respect prefers-reduced-motion throughout — fall back to instant.

2. NUMBERS THAT EARN ATTENTION
   - All KPI figures count up from zero on first render, 800ms, eased.
   - The quorum ring animates its arc from 0 to its value on mount.
   - Compliance clock progress bars fill from the left on mount.
   - When a value changes, briefly pulse the background of that cell.

3. LOADING
   - Replace every spinner with skeleton screens matching the real layout.
   - Skeletons use a slow, subtle shimmer — 2s, low contrast, not a
     flashing grey.

4. THE COMPLIANCE CLOCK — make it the hero
   This is your single best asset and it currently sits small in the
   narrowest column. Redesign it:
   - A vertical timeline with a filled progress spine connecting milestones.
   - Each milestone: a state dot (met / running / not started / breached),
     the requirement, the target date, and the date met.
   - The active milestone is visually dominant — larger, brighter, with a
     soft glow — and shows a live countdown ("12 days remaining") that
     updates.
   - Colour encodes urgency on a gradient: comfortable emerald → amber
     inside 14 days → red past the limit. Never rely on colour alone; pair
     every state with an icon and a text label.
   - A breached clock gets a slow, restrained pulse. Slow enough to read as
     gravity, not an alarm.
   - Hovering a milestone reveals the statutory basis in a tooltip.

5. DEPTH AND SURFACE
   - A consistent elevation scale: three levels, differentiated by a
     1px border in rgba(255,255,255,0.06) plus a soft shadow. Avoid heavy
     drop shadows on dark backgrounds.
   - Interactive cards lift 2px and brighten their border on hover, 150ms.
   - The active nav item gets a 2px emerald left bar that slides between
     items rather than jumping.
   - Add a very subtle noise texture (2% opacity) over the page background
     to kill banding on the dark gradient.

6. FEEDBACK
   - A toast system, bottom-right, that stacks: success, warning, error,
     info. Each auto-dismisses at 4s with a progress hairline.
   - Every destructive or irreversible action offers Undo in its toast for
     8 seconds.
   - Optimistic UI on workflow transitions: the state updates instantly,
     rolls back visibly if it fails.
   - Buttons show an inline spinner in place of their label while working —
     never a disabled button with no explanation.

7. TYPOGRAPHY
   - Tighten the scale to six sizes and stop there.
   - Case IDs, hashes and clock values in a monospace face — it reads as
     evidence.
   - Increase body line-height to 1.6; the current density is tiring on dark.
   - Numerals: use tabular figures everywhere numbers align in columns.

8. KEYBOARD
   - g then c = cause list, g then b = the bench, g then r =
     recommendations. j / k move through lists, Enter opens, Esc closes.
   - "?" opens a keyboard shortcut sheet.
   - Visible focus rings throughout — a 2px emerald ring at 2px offset.

9. THE SIGN-IN SCREEN
   - Add a one-line description under each demo role explaining what that
     persona can see. It turns the login screen into an explanation of the
     permission model.
   - Animate the role cards in on load, staggered.
   - On selection: the card lifts, the rest dim, then the transition into
     the app. Make signing in feel like a door opening.

10. ACCESSIBILITY — non-negotiable
   - Every text/background pair at WCAG AA (4.5:1). Audit the muted greys on
     #0F172A specifically; several are currently too low.
   - Full keyboard operability, logical tab order, aria-live on clock
     changes and toasts.
   - Never encode meaning in colour alone.

Work through these in order and show me a before/after screenshot for each
section.
```

---

### PROMPT 9 — Respondent access and the mobile pass

```
Two gaps that will be noticed in a demo.

1. RESPONDENT LOGIN
   The case record models the respondent properly — notice served, reply
   received, both clocks tracked — but there is no Respondent role that can
   sign in. Add one.
   Permissions, and nothing beyond them:
   - View the complaint as served on them
   - File a written reply, with the reply window counting down visibly
   - Upload evidence in their defence
   - View hearing notices addressed to them
   - View the final decision concerning them
   The Respondent must NOT see witness identities, witness statements
   attributed by name, committee deliberations, or any other case.
   Add a Respondent to the demo sign-in list, and seed one case where the
   reply is filed and one where it is outstanding with the clock running.

2. RESPONSIVE PASS
   The app is desktop-only. Make it work properly at 390px, 768px and
   1024px:
   - The left navigation collapses to a bottom bar or a slide-over drawer.
   - The case record's three columns stack: workflow rail first, then the
     tabbed content, with the activity feed behind a toggle.
   - Tables become stacked cards below 768px.
   - Touch targets minimum 44px.
   - The compliance clock stays fully legible at 390px — it is the most
     important thing on a phone.
   An IC member checking a hearing time on their phone is the single most
   likely mobile use. Optimise for that specifically.
```

---

## 5. The wow factors

Eight features designed to stop the room. Each is genuinely novel in this category — none of Ungender, POSH360 or ePOSH has any of them — and each is buildable as a prototype.

| # | Feature | The moment it creates |
|---|---|---|
| W1 | **Time Machine** — scrub the case back to any date and watch the record reconstruct itself | *"Show me exactly what the committee knew on 3 June."* Nobody has this |
| W2 | **The Seal** — a cryptographic closing ceremony when a case is archived | Turns "case closed" into a ritual with a hash chain behind it |
| W3 | **The Bench Builder** — drag members onto a sitting, watch s.4 and Rule 7 validate live | The most tactile thing in the product |
| W4 | **Clock Cascade** — "what happens if this sitting slips a week?" | Shows the product *thinking*, not just recording |
| W5 | **The Ledger** — the audit trail as a visible, hash-chained ribbon | Makes tamper-evidence physical |
| W6 | **The India Board** — every location, every IC, live compliance state on a map | The CHRO's board slide, generated |
| W7 | **Live presence** — see which committee members are in the case right now | Instant "this is real software" |
| W8 | **Pattern Radar** — anonymised hotspot and repeat-respondent detection | The renewal argument, visualised |

---

### PROMPT W1 — Time Machine

```
Build "Time Machine" for the Sentinel case record — the ability to view the
complete state of a case as it stood on any past date.

WHY THIS MATTERS
When a PoSH decision is challenged months later, the question is always
"what did the committee know, and when?" Every other product can only show
today's state. Sentinel should be able to reconstruct any day.

1. THE CONTROL
   - A slim horizontal scrubber pinned below the case header, spanning from
     the complaint filing date to today.
   - Notches on the track mark every significant event: notice served, reply
     received, evidence admitted, sitting held, recommendation submitted.
     Hovering a notch shows what happened.
   - Dragging the handle moves the whole case record backwards in time.
   - A date input for jumping precisely.
   - "Return to today" resets.

2. WHAT CHANGES AS YOU SCRUB
   Every panel re-renders to its state on that date:
   - Workflow position rewinds to the step the case was at.
   - Compliance clocks recompute — a clock that is green today may be
     running, or not yet started, on the selected date.
   - Evidence list shows only items on record by then.
   - Documents show only versions existing then; superseded versions appear
     as current.
   - The recommendation shows the version live at that moment.
   - The activity feed truncates to that point.
   - Committee composition reflects any changes in membership.

3. THE VISUAL LANGUAGE OF THE PAST
   - When not at "today", the entire content area takes a subtle sepia-toned
     desaturation and a 1px amber border.
   - A persistent, unmissable banner: "Viewing as at 03 June 2026 — 59 days
     ago" with the return control beside it.
   - All action buttons are disabled with the tooltip "Historical view —
     actions are disabled."
   - Values that differ from today's state get a small amber left-edge
     marker, so what changed is visible at a glance.

4. MOTION
   - Scrubbing updates live, throttled to 60fps, with values crossfading
     rather than snapping.
   - Numbers roll rather than jump.
   - Entering historical mode: a 400ms desaturation sweep from left to right,
     like a shadow passing over the record.

5. THE DEMO MOMENT
   Add a "Replay case" button that animates automatically from filing to
   today over about 12 seconds, with the clocks filling, evidence
   accumulating and the workflow advancing. Pausable. This is the single
   most impressive twelve seconds in the product — make it beautiful.

Implement by storing the case as an ordered event log and deriving state at
any timestamp, rather than snapshotting. Show me the data model first.
```

---

### PROMPT W2 — The Seal

```
Build "The Seal" — the ceremony that happens when a case is archived.

WHY
Right now archiving a case is step 21 of a state machine — a status change.
It should be the most weighted moment in the product: the point at which the
record becomes permanent and tamper-evident.

1. THE SEALING SEQUENCE
   Triggered by "Seal this case". A full-screen modal over a blurred
   backdrop, and a sequence that takes about six seconds:
   - Step 1: "Assembling the record" — a list of components ticks off in
     sequence with their counts: 47 workflow events, 12 evidence items,
     8 documents, 4 sittings, 213 access records.
   - Step 2: "Computing the seal" — each component's SHA-256 appears in
     monospace, one after another, then combines into a single root hash.
     Show the hashes actually resolving character by character.
   - Step 3: "Sealed" — the root hash lands, large and centred, with the
     seal timestamp and the sealing user.
   - A restrained emerald ring draws itself around the hash on completion.
     No confetti. This is a solemn act.

2. THE SEAL ARTEFACT
   - A sealed case shows a distinct badge in the header — a lock glyph, the
     truncated root hash in monospace, and the seal date.
   - The case record becomes read-only, visually flattened, with a thin
     emerald hairline border.
   - A "Verify seal" action re-computes the root hash and shows either
     "Intact — record unaltered since 12 Aug 2026" in emerald, or a red
     tamper warning naming exactly which component's hash no longer matches.
   - Verification takes a real moment and shows each component being checked.

3. UNSEALING
   Only the Company Owner can unseal, and only with a recorded written
   reason. Unsealing is itself a permanent, prominent event on the record —
   the case afterwards shows "Previously sealed, unsealed on [date] by
   [user]" forever.

4. Make the typography of the hash beautiful. Monospace, generously letter-
   spaced, in a slightly brighter tone than body text. It should read as a
   certificate.
```

---

### PROMPT W3 — The Bench Builder

```
Build "Bench Builder" — a drag-and-drop interface for composing a sitting
that validates statutory composition in real time.

WHY
Today the app tells you after the fact that a bench would sit short. It
should make composing a valid bench a satisfying, tactile act.

1. LAYOUT
   - Left: available committee members as draggable cards — avatar, name,
     role, and small availability indicator for the selected date.
   - Centre: "The bench" — a semicircular arrangement of empty seats, styled
     like a courtroom. Members drop into seats.
   - Right: a live validation panel.

2. LIVE VALIDATION
   As members are added or removed, four tests re-evaluate instantly, each
   as a row that animates between states:
   - Presiding Officer seated
   - Three or more members present
   - External member present
   - At least one-half women
   Each row: an icon, the requirement, and the current count. Passing rows
   settle to emerald with a soft check animation; failing rows sit amber with
   a plain explanation of what is needed ("Add one more member — 2 of 3").
   A ring in the panel shows n/4 conditions met and animates its arc as the
   count changes.

3. TACTILE FEEL
   - Cards lift and cast a shadow while dragged, tilting slightly toward the
     drag direction.
   - Valid seats glow softly as a card approaches.
   - Dropping settles with a small spring.
   - The moment the fourth condition passes, the whole bench area gets one
     brief emerald bloom — a single 500ms pulse, then still.
   - If a member is dragged out and breaks quorum, the affected condition row
     shakes once, 200ms, low amplitude.

4. INTELLIGENCE
   - Conflict warnings inline on a member card if they are already listed
     elsewhere in an overlapping window.
   - Availability shading based on confirmed / declined responses.
   - A "Suggest a valid bench" action that auto-fills the smallest compliant
     bench from available members, animating each card into place in
     sequence.

5. Full keyboard alternative: select a member, press Enter to seat them,
   arrow keys to move between seats. The drag interaction must never be the
   only way to do this.

6. Once valid, "List this sitting" commits it to the cause list and the
   calendar.
```

---

### PROMPT W4 — Clock Cascade

```
Build "Clock Cascade" — a what-if simulator showing how one scheduling
change ripples through every statutory deadline on a case.

WHY
This is the difference between a product that records and a product that
thinks. It makes Sentinel feel like it is on the committee's side.

1. ENTRY
   A "Model a change" action on the case record and on any sitting.

2. THE CONTROLS
   Simple, direct inputs:
   - Move this sitting by [n] days
   - Delay evidence verification by [n] days
   - Add [n] days for the respondent's reply
   - Committee unavailable from [date] to [date]

3. THE OUTPUT — a side-by-side comparison
   Left column: the current projection. Right column: the projected outcome.
   Every milestone shows its current date and its projected date, with the
   delta.
   - Milestones that stay comfortable: emerald, unchanged.
   - Milestones that move but stay within their window: amber, with the new
     date and remaining headroom.
   - Milestones that would breach: red, with the overshoot stated plainly
     ("Inquiry completion would fall 6 days beyond the 90-day limit").
   Draw connecting lines between the two columns so the cascade is literally
   visible — a change at the top visibly pushes everything below it.

4. THE HEADLINE
   One sentence at the top, stated plainly, e.g.:
   "Moving this sitting by 9 days pushes inquiry completion 6 days past the
   statutory limit and would require a recorded reason."
   Or, when safe: "This change fits comfortably. All deadlines still met with
   11 days to spare."

5. MOTION
   - When an input changes, the projected column re-animates: dates roll to
     their new values, the connecting lines redraw, and any milestone
     changing severity transitions its colour over 300ms.
   - A breach appearing gets one restrained red pulse.

6. Add "Apply this change" to commit it, and "Save as a note" to attach the
   projection to the case record for the committee to discuss.
```

---

### PROMPT W5 — The Ledger

```
Build "The Ledger" — the case audit trail rendered as a visible, verifiable
hash chain.

WHY
"Access logged" is a claim. This makes it an object you can look at.

1. THE VISUAL
   A vertical ribbon down the case record, or a full-screen view from
   "Open the ledger":
   - Each entry is a linked block: actor avatar, action, timestamp, and its
     hash in monospace.
   - Each block displays the previous block's hash, so the chain is literally
     visible — a thin connecting line runs between them.
   - Blocks are colour-coded by action class: reads in cool grey, writes in
     emerald, state changes in blue, exports and downloads in amber.
   - The chain scrolls smoothly, with the block count and the current root
     hash pinned at the top.

2. VERIFY
   A "Verify chain" action walks the chain from genesis to head, animating
   block by block — roughly 40ms each — with a check settling on each as it
   validates. On completion: "Chain intact — 213 entries verified" with the
   root hash. If a link fails, the chain visibly breaks at that point with a
   red gap and names the compromised entry.

3. FILTERS
   By actor, by action class, by date range, and a toggle for "reads only" —
   because in a s.16 confidentiality question, reads are what matter.

4. THE KILLER VIEW
   "Who has seen this case?" — a summary panel listing every person who has
   ever accessed the case, with their role, first access, last access, total
   views, and which specific documents they opened. This is the answer to
   "prove the leak wasn't from the committee", and it should be one click
   from the case header.

5. Export the ledger as a standalone signed PDF, and include it in the
   Defensibility Pack.

6. Make the monospace hash typography beautiful — this screen should look
   like infrastructure, not like a log file.
```

---

### PROMPT W6 — The India Board

```
Build "The India Board" — a live geographic compliance view for the
Management and Company Owner roles.

WHY
A multi-million-rupee enterprise runs several Internal Committees across
states. Nobody shows them one picture. This is the slide their CHRO takes
to the board.

1. THE MAP
   - A clean, stylised map of India — flat vector, no satellite imagery, no
     country labels beyond state outlines. Dark, matching the theme.
   - Each office location is a node, sized by headcount.
   - Node colour encodes IC compliance state: emerald (constituted and
     valid), amber (constituted, an issue — external member missing, or a
     clock at risk), red (no functional IC, or a breached clock), grey (no
     data).
   - Nodes at risk emit a slow, restrained pulse.

2. INTERACTION
   - Hovering a node raises a card: location, headcount, IC members and
     composition status, open cases, cases at risk, annual return status.
   - Clicking drills into that location's cases, respecting Presenter Mode
     and the role's permissions — Management never sees a party name.
   - A state-level toggle aggregates nodes by state, since filings are
     per-District Officer.

3. THE SIDE PANEL
   - National totals: locations, ICs constituted, employees covered, open
     cases, cases at risk, annual returns filed.
   - A ranked list of locations needing attention, worst first, each
     deep-linking to the location.

4. MOTION
   - Nodes fade and scale in from the centre outward on load, staggered by
     distance — about 1.2 seconds total.
   - The map draws its state outlines with a stroke animation on first load.
   - Zoom and pan are smooth and inertial.

5. Include a "Present" mode that hides all chrome and shows the map
   full-screen for a boardroom display, with totals ticking.

Keep it restrained and cartographic. It must look like an instrument, not an
infographic.
```

---

### PROMPT W7 — Live presence

```
Add live presence to the Sentinel case record.

An Internal Committee is a group of people working the same file. Show them
each other.

1. PRESENCE INDICATORS
   - Stacked avatars in the case header showing who is currently viewing.
   - A soft emerald ring around each active avatar, with a gentle breathing
     animation.
   - Hovering shows the name, role, and which tab they are on ("Farah
     Qureshi — Evidence").
   - Respects Presenter Mode: masked to roles when masking is on.

2. GRANULAR AWARENESS
   - When another member is viewing a specific evidence item or document, a
     small avatar appears on that row.
   - If two people open the same document, a subtle inline note: "Vikram is
     also viewing this."

3. ACTIVITY IN REAL TIME
   - When another member takes a workflow action, a toast slides in:
     "Vikram Mehta admitted E-03 to the record" with an "View" action.
   - The activity feed inserts new entries with a highlight that fades over
     3 seconds, so change is noticeable without being disruptive.

4. EDIT SAFETY
   - If two members open the same minutes draft, warn clearly and show who
     holds it.
   - Soft locking on minutes and recommendation drafts, with the holder named
     and a "Request access" action.

For the prototype, simulate presence with scripted peers on a timer so it
demos reliably without a backend — but structure the code so a real
websocket layer can replace the simulation cleanly.
```

---

### PROMPT W8 — Pattern Radar

```
Build "Pattern Radar" — anonymised pattern detection across all cases, for
the Management and Company Owner roles.

WHY
This is the reason POSH software gets renewed rather than merely bought. It
is also the thing a CHRO cannot get from a spreadsheet.

Strict rule: this view NEVER names a complainant, respondent or witness. All
analysis is on anonymised identifiers. Build that constraint into the data
layer, not the UI.

1. SIGNALS TO SURFACE
   - Repeat respondents: an anonymised identifier appearing in more than one
     case, with case count and dates. Shown as "Respondent identifier R-0042
     — 3 cases across 14 months". This is the single highest-value signal in
     the whole product.
   - Location hotspots: cases per 1,000 employees by location, against the
     organisation median.
   - Department and band concentration.
   - Time-to-resolution outliers: cases sitting at one stage far longer than
     the organisation's median for that stage.
   - Reporting seasonality — clustering after offsites, appraisal cycles or
     festival periods.
   - Withdrawal rate — a rising rate of withdrawn complaints is a
     psychological-safety signal worth surfacing.

2. THE VISUALS
   - A radar or heat grid as the hero, department against location, cell
     intensity by rate.
   - Small multiples beneath: a sparkline per signal with its trend and
     direction against the previous period.
   - Each signal is a card with a plain-language headline, the number, the
     comparison, and a "why this matters" line.

3. THE ALERT LAYER
   Signals crossing a threshold surface as prominent cards at the top:
   "Repeat respondent identified — 3 cases, same identifier, across two
   locations." Each has a recommended action.

4. MOTION
   - The heat grid fills cell by cell on load, staggered outward.
   - Sparklines draw left to right.
   - Alert cards enter last, after the data settles, so the eye lands on the
     data first and the alert second.

5. Export as a board-ready PDF with the same anonymisation guarantees, and a
   prominent statement on the cover that no party is identified.
```

---

## 6. If you only have one day

In this order:

1. **Prompt 1** — deep links, one data fixture, truncation, empty states. Without these the demo can break live.
2. **Prompt 2** — Presenter Mode. The most memorable thing you can show.
3. **Prompt W1** — Time Machine, and specifically the twelve-second "Replay case" animation. This is your single best demo moment.
4. **Prompt 8, sections 2 and 4** — count-up numbers and the hero compliance clock. Cheapest possible "expensive" signal.
5. **Prompt 7, section 1** — the command palette. Five seconds of demo, enormous credibility.

Everything else is roadmap you can show as a slide — and W2 through W8 make a genuinely strong roadmap slide, because none of your competitors could build most of them without rewriting their data model.

One honest note before the polish: the data inconsistency in §2.7 is the thing that will actually hurt you. Switching roles live is your best moment, and right now the committee changes names when you do it. Fix that first, then make it beautiful.
