# Dispatch Backlog

Prioritized work Dispatch can pick from overnight. Every item here is
**single-file or single-feature**, **non-schema**, and has clear
acceptance criteria.

> **Read first:** [`dispatch-runbook.md`](./dispatch-runbook.md). The
> blacklist there overrides this list — if a backlog item turns out
> to need a schema change, a new env var, or a new dep, it gets
> queued for Sal, not shipped.

## Tier 1 — Highest priority (tightly scoped, fix or unblock today)

### 1.1 — Fix Match schedule button on parking picker

**Surface:** EditJobModal parking days picker — "Match schedule"
button currently renders as `Match schedule (—)` instead of
`Match schedule (M-F)` and clicking it does nothing on jobs with
non-null `recurring_schedules.day_of_week` (single-day frequencies).

**Status:** A separate prompt is shipping the fix on its own branch.
**Dispatch should not touch this** unless that PR fails to land
before the overnight window opens. If it does need to be picked up,
the fix lives in `artifacts/qleno/src/components/edit-job-modal.tsx`
and reads both `rs.days_of_week` (multi-day) and `rs.day_of_week`
(enum) from the dispatch payload.

**Acceptance:** Sal opens the modal on a job whose schedule fires
M-F, clicks Match schedule, the parking days picker fills in
M / T / W / Th / F.

**Diff size:** ~30 lines, one file.

### 1.2 — Register `/customers/new` route for Add Client UI

**Surface:** The Add Client button on `/customers` navigates to
`/customers/new` but the route isn't registered, so the button
404s. Confirmed bug.

**Acceptance:** Click Add Client → navigates to a working "new
customer" form (using whatever existing component renders client
creation today — likely the JobWizard's customer-info step or a
dedicated `customers/new.tsx` already in tree but unrouted).

**Files:**
- `artifacts/qleno/src/App.tsx` — add the `<Route path="/customers/new">`.
- Possibly the customer-creation component itself if it doesn't
  exist as a standalone page yet (extract from wizard if needed —
  but no schema or API changes).

**Diff size:** Small if the form already exists (~10 lines);
medium if a new component has to wrap an existing one (~80 lines).
**Pre-flight:** if a new component is needed and it's > 100 lines,
queue for AM review instead of shipping overnight.

### 1.3 — Diagnose `/api/jobs/4147` 500

**Surface:** GET `/api/jobs/4147` returns 500 in production.
Suspected cause: the duplicate Monday Jaira tile reported during
PR #42's rollout. Read-only diagnosis first.

**Acceptance:**
- Reproduce locally if possible. If the bad row exists only in
  prod, write a single read-only query that diagnoses (no UPDATE,
  no DELETE).
- File a GitHub issue with the root cause + a one-paragraph
  remediation plan.
- Do **not** run any data fixes overnight. Data writes against
  prod are AM-only.

**Diff size:** Zero (read-only investigation). The deliverable is
the issue, not a PR.

### 1.4 — Wire employee password reset flow

**Pre-flight:** This may need a new env var (Resend "from" address
override) or schema (password-reset-token table). Check before
starting:
- New env var? → queue for AM (blacklist B.2).
- New table? → queue for AM (blacklist B.1).
- Existing `users.password_reset_token` column + existing email
  template + Resend already wired? → ship.

If Dispatch isn't sure, queue. Don't guess.

**Acceptance (if shippable):**
- POST `/api/auth/forgot-password` issues a token, emails the
  user via Resend.
- GET `/reset-password?token=...` renders a confirmation page.
- POST `/api/auth/reset-password` updates the password hash,
  invalidates the token.
- Existing token + email template reuse — no new schema.

**Diff size:** 200–400 lines if the schema is already in place;
otherwise queue.

## Tier 2 — Medium scope (read-first, fix if root cause is single-file)

### 2.1 — Dashboard "New Jobs Booked" count investigation

**Surface:** Dashboard widget shows the wrong count for "New Jobs
Booked." Read-only diagnosis first.

**Acceptance:**
- Identify which query feeds the widget (likely `routes/dashboard.ts`).
- Compare its result to a hand-run query against `jobs` for the
  same window.
- If the bug is a single-file SQL fix → ship the PR.
- If the bug requires a schema column or a new column on
  `companies` (e.g. "include / exclude one-time jobs") → queue.

**Diff size:** Read-only first; fix PR ~30 lines if applicable.

### 2.2 — TS strict-mode error chipping

**Goal:** chip away at the 748 strict-mode errors. **One file per
PR**, and the PR must net-reduce the total error count.

**Acceptance:**
- Pick one file from
  ```sh
  pnpm -r exec tsc --noEmit 2>&1 | grep -E "\.tsx?:" | head -20
  ```
- Fix only the typing — no behavioral change. No new helpers, no
  refactor.
- Commit the strict-mode count before / after in the PR
  description.
- Ship.
- Rinse and repeat until the rate limit (Section B.10 in the
  runbook) is hit.

**Diff size:** 5–80 lines per PR.

### 2.3 — Phantom job 4147 root cause investigation

**Surface:** Same job referenced in 1.3, but a deeper read of how
the row got into the state it's in. Likely a recurring-engine
duplicate, possibly from PR #25's array-binding bug before it was
fixed.

**Acceptance:**
- Trace the job's `created_at`, `recurring_schedule_id` history
  from `audit_log`.
- Identify the engine version / cron run that wrote the row.
- File the findings as a GitHub issue.
- Do **not** delete the row overnight (blacklist B.4).

**Diff size:** Zero. Read-only.

## Tier 3 — Only if Tier 1 + 2 exhausted

### 3.1 — Unit tests for cascade-overwrite path

**Surface:** PR #41 stabilized cascade overwrite. Add unit tests so
the next regression is caught at PR-time, not at Sal's-Tuesday-tile
time.

**Acceptance:**
- Tests live next to existing helper tests (e.g.
  `artifacts/qleno/src/lib/price-delta.test.ts` is the pattern).
- Cover at minimum:
  - this_and_future cascade reaches unlinked Tue–Fri MC-imported
    jobs.
  - Lock matrix: completed anchor blocks `service_type` /
    `frequency` change.
  - cascade_scope=this_job leaves siblings untouched.
- No e2e infra changes. Pure unit tests on the cascade helper.

**Diff size:** ~150 lines of tests, 0 lines of production code.

### 3.2 — Unit tests for parking day-of-week stamping

**Surface:** PR #42 fixed Match schedule + cascade reach. Add unit
tests for `parking_fee_days` filtering in the recurring engine.

**Acceptance:**
- Test the days-of-week filter when generating each child job.
- Cover: `parking_fee_days = null` → applies all days,
  `parking_fee_days = [1,2,3,4,5]` → applies M-F only,
  `parking_fee_enabled = false` → never applies.
- No DB writes — call the helper directly with a fixture.

**Diff size:** ~100 lines of tests.

### 3.3 — Lint warning cleanup

**Goal:** burn down ESLint warnings one file at a time. Same
ground rules as 2.2 (one file per PR, no behavioral change, net
reduction in warning count).

**Diff size:** 5–50 lines per PR.

## Items NOT on the backlog (require AM judgment)

- **Cutover date decision** (May 12 vs June 1). Sal calls this.
- **`base_fee` backfill on the 52 NULL recurring schedules.**
  Data decision — Sal picks the rule.
- **Tech assignment on the 41 unassigned schedules.** Operator
  decision — Sal or his lead dispatcher picks who.
- **May 12 critical-path items that touch env vars, schema, or
  integration glue.** All blacklist territory.
- **Anything that requires a new test infrastructure component.**
  PR #28 ships the harness; new test types come after that lands.

## Pickup discipline

- Tier 1 first, top to bottom. Tier 2 only after Tier 1 is empty
  or every Tier 1 item is queued. Tier 3 last.
- One PR open at a time (runbook B.9).
- Three PRs per hour cap (runbook B.10).
- If an item turns out to be more than 600 lines or to need
  blacklist work, **queue it** with a one-line "why this is
  bigger than overnight-safe" note. Don't try to break it apart
  on the fly.
