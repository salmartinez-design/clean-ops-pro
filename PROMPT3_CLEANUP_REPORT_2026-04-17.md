# Prompt 3 Cleanup Report — 2026-04-17

## Schema changes
- Added `companies.recurring_engine_enabled BOOLEAN NOT NULL DEFAULT true`
- Added via idempotent guard in `artifacts/api-server/src/phes-data-migration.ts`
- Drizzle schema (`lib/db/src/schema/companies.ts`) updated

## Code changes (commit: `7d1c836`)
- `artifacts/api-server/src/lib/recurring-jobs.ts` — per-tenant check at top of `generateRecurringJobs()`; returns early with `{ skipped: true, reason: 'tenant_disabled' }` when flag is false
- `artifacts/api-server/src/index.ts` — `RECURRING_ENGINE_ENABLED` env var guard around both `runRecurringJobGeneration()` and `startRecurringJobCron()`
- `artifacts/api-server/src/phes-data-migration.ts` — idempotent ALTER TABLE guard
- `lib/db/src/schema/companies.ts` — Drizzle column definition

**Push:** `7d1c836` → `origin/main` → Railway auto-deployed (verified `/` = 200, `/api/auth/me` = 401).

## Env vars set
- **Railway `RECURRING_ENGINE_ENABLED`: DEFERRED** — not set today to avoid triggering a redeploy mid-transaction during Block 4 deletions.
- **Action required later:** Add `RECURRING_ENGINE_ENABLED=false` to Railway env vars **before the second tenant goes live**. This is the belt-and-suspenders global kill switch. Per-tenant flag is sufficient for a single-tenant deployment.

## Data changes

| Action | Expected | Actual | Status |
|---|---|---|---|
| Disable engine for PHES | 1 row updated | 1 | ✅ |
| Delete phantom jobs | 744 | 744 | ✅ |
| Delete placeholder discounts | 18 | 18 | ✅ |
| Delete dummy clients | 3 | 3 | ✅ |

All four operations ran inside transactions with dry-run counts before each DELETE. No mismatches, no rollbacks.

## Post-cleanup state

| Metric | Before | After | Expected |
|---|---|---|---|
| Total jobs (PHES) | 865 | **121** | 121 ✅ |
| Phantom jobs (base_fee=0, scheduled) | 744 | **0** | 0 ✅ |
| Jobs by status | — | 63 scheduled / 55 complete / 3 cancelled | — |
| Total clients | 1,272 | **1,269** | 1,269 ✅ |
| Active clients | 256 | **256** | 256 (dummies were already `is_active=false`) |
| Discount rows | 41 | **23** | 23 ✅ |
| Recurring engine for PHES | `true` (default) | **`false`** | false ✅ |
| New jobs created last 30d | 865 | 121 | sharp drop ✅ |

## Files written
- `phantom_deletion_audit_2026-04-17.csv` — 744 deleted job ids with `category` (`recurring_phantom` or `oneoff_zero_fee`), `client_id`, `scheduled_date`, `recurring_schedule_id`, `service_type`
- `PROMPT3_CLEANUP_REPORT_2026-04-17.md` — this report

## Errors encountered
None. Every transaction committed cleanly. Every row count matched expectation.

## What happens next at 2 AM UTC
The recurring-job cron will tick. For every tenant, `generateRecurringJobs()` is called:
- **PHES (company_id=1)**: `recurring_engine_enabled = false` → logs `[recurring-engine] Skipping company_id=1 — engine disabled for this tenant`, returns immediately. **Zero phantom jobs created.**
- **Demo, PHES Schaumburg, Evinco**: `recurring_engine_enabled = true` → normal behavior (those tenants have zero active schedules anyway).

## Pending follow-ups
1. **Railway env var** — add `RECURRING_ENGINE_ENABLED=false` before second tenant goes live (deferred from Block 3.3 to avoid redeploy mid-cleanup)
2. **Engine root-cause fix** — the engine creates jobs with `base_fee = 0` when `recurring_schedules.base_fee IS NULL`. Fix options:
   - Reject job creation if `base_fee IS NULL` on the schedule
   - Backfill `recurring_schedules.base_fee` from client history median
3. **Edge case: 2 one-off $0 jobs** (ids 27, 28 from 2026-03-21/27) had `client_id = NULL` — deleted as part of the 744. These were orphan records, likely from early testing.

## What's next (Prompt 4)
Historical `job_history` import. Sources per handoff:
- Dispatch Board CSV (2,652 rows Jan 2025+)
- Job Campaign 2025 (3,311 rows)
- Job Campaign 2026 (872 rows)

Target: ~5,400 rows into `job_history` table. Reconcile duplicates by `customer_id` + `job_date` + `service_type`. Dry-run first.

**Current `job_history` state:** 34 rows, $18,059 revenue — only MC sample data. A proper import will unblock Monthly Revenue / Weekly Forecast dashboard metrics.
