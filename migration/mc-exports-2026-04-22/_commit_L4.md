# Commit L4 — MC dispatch import complete (Phase 4 of 4)

- **Timestamp:** 2026-04-22 CT (America/Chicago)
- **Operator:** Claude Code (Sal approved)
- **Company:** PHES (company_id=1)
- **Engine flag:** false across all 4 tenants (unchanged)

## Headline

**983 MC dispatch rows merged into `jobs`. 1,092 tech assignments in `job_technicians`. Exact-to-the-cent match against MC ground truth for every month and every day of Apr 22-30.** Transaction passed all 4 rowcount gates on the second attempt; first attempt rolled back cleanly on a Daveco collision against the J2 unique index and was resolved by a 7-row `matched_schedule_id` NULL-out before retry.

## Final PHES state

| Metric | Value |
|---|---:|
| **jobs total** | **1,066** (83 pre-existing + 983 MC-imported) |
| jobs.status = complete | 964 |
| jobs.status = scheduled | 97 |
| jobs.status = in_progress | 2 |
| jobs.status = cancelled | 3 |
| **job_technicians total** | **1,092** |
| Unique techs referenced | 11 (10 active + Delia) |
| Jobs with ≥1 tech | 972 |
| Jobs with 0 techs (Cleaner-only) | 11 |

## Monthly reconciliation — exact match

| Month | MC jobs | MC $ | DB jobs | DB $ | Δ |
|---|---:|---:|---:|---:|:-:|
| 2026-01 | 232 | $52,218.71 | 232 | $52,218.71 | **0** |
| 2026-02 | 216 | $45,643.27 | 216 | $45,643.27 | **0** |
| 2026-03 | 258 | $58,108.14 | 258 | $58,108.14 | **0** |
| 2026-04 | 277 | $61,563.26 | 277 | $61,563.26 | **0** |
| **TOTAL** | **983** | **$217,533.38** | **983** | **$217,533.38** | **0** |

## Apr 22–30 daily reconciliation — exact match

| Date | DOW | MC jobs | MC $ | DB jobs | DB $ | Δ |
|---|---|---:|---:|---:|---:|:-:|
| Apr 22 | Wed | 12 | $2,238.60 | 12 | $2,238.60 | **0** |
| Apr 23 | Thu | 14 | $2,900.25 | 14 | $2,900.25 | **0** |
| Apr 24 | Fri | 11 | $2,401.54 | 11 | $2,401.54 | **0** |
| Apr 25 | Sat | 4 | $1,062.00 | 4 | $1,062.00 | **0** |
| Apr 26 | Sun | 0 | $0.00 | 0 | $0.00 | — |
| Apr 27 | Mon | 7 | $1,811.32 | 7 | $1,811.32 | **0** |
| Apr 28 | Tue | 11 | $2,042.33 | 11 | $2,042.33 | **0** |
| Apr 29 | Wed | 13 | $2,385.35 | 13 | $2,385.35 | **0** |
| Apr 30 | Thu | 11 | $2,312.68 | 11 | $2,312.68 | **0** |
| **Total** | | **83** | **$17,154.07** | **83** | **$17,154.07** | **0** |

## Transaction timeline

### Attempt 1 — rolled back

Ran `INSERT INTO jobs ... ON CONFLICT (mc_job_id) WHERE mc_job_id IS NOT NULL DO UPDATE ...` → hit the J2 unique index `jobs_recurring_dedupe_idx` on `(company_id, recurring_schedule_id, scheduled_date)`. Error: `Key (company_id, recurring_schedule_id, scheduled_date)=(1, 35, 2026-04-07) already exists.` Full ROLLBACK — no rows persisted.

### Root cause — Daveco

Daveco properties (client id=25) has **3 monthly `recurring_schedules`** (ids 35, 36, 37) for 3 separate physical properties. Phase 3's schedule-linking used `DISTINCT ON (mc_job_id) ORDER BY rs.created_at ASC` to pick the earliest schedule, which resulted in all 3 properties' same-day visits being linked to schedule id=35 — creating duplicate `(1, 35, 2026-04-07)` tuples.

**4 collision groups / 11 rows, all Daveco:**
- 2026-01-08: 3 rows → 1 kept, 2 NULLed
- 2026-02-09: 3 rows → 1 kept, 2 NULLed
- 2026-03-05: 3 rows → 1 kept, 2 NULLed
- 2026-04-07: 2 rows → 1 kept, 1 NULLed

### Fix — NULL-out 7 collision rows, keep 1 per group

```sql
WITH ranked AS (
  SELECT mc_job_id, ROW_NUMBER() OVER (
    PARTITION BY matched_schedule_id, scheduled_date ORDER BY mc_job_id
  ) AS rn
  FROM mc_dispatch_staging
  WHERE matched_schedule_id IS NOT NULL
)
UPDATE mc_dispatch_staging s
   SET matched_schedule_id = NULL
  FROM ranked r
 WHERE s.mc_job_id = r.mc_job_id AND r.rn > 1;
-- rowcount: 7 ✓
```

Net: `matched_schedule_id` went from 407 → 400 rows. 7 Daveco rows now have NULL schedule link (client_id=25 still populated — they import correctly as "Daveco one-off dispatch visits").

This matches the G-2 precedent for Cucci: when customer→schedule is ambiguous from MC data, leave schedule NULL and keep client linkage.

### Attempt 2 — all 4 gates passed

| Gate | Expected | Actual |
|---|---:|---:|
| 1. `jobs` INSERT rowcount | 983 | **983 ✓** |
| 2. `job_technicians` INSERT rowcount | 1,092 | **1,092 ✓** |
| 3. PHES jobs total | 1,066 | **1,066 ✓** |
| 4. Apr 22-30 day-by-day vs MC | exact match | **exact match ✓** |

COMMIT.

## Schema corrections vs prompt's SQL (also in L4 log)

| Prompt said | Actual | Resolution |
|---|---|---|
| `jobs.customer_id` | `jobs.client_id` | Renamed |
| `jobs.service_address` | `jobs.address_street` | Single-line MC address → `address_street`; city/state/zip NULL |
| `jobs.updated_at` | doesn't exist | Omitted |
| `jobs.actual_start_time` / `actual_end_time` | don't exist | Folded into `notes`: `'[mc_import_phase4 2026-04-22 mc_job_id=X act: 2:49 PM-6:39 PM]'` |
| `jobs.service_type` | REQUIRED, no default | `'standard_clean'::service_type` for all rows |
| `jobs.frequency` | NOT NULL, default `on_demand` | MC → enum mapping: Every Week→weekly, Every Two Weeks→biweekly, Every Four Weeks→monthly, Every Three Weeks→`every_3_weeks`, Other Recurring/Single/On Demand→`on_demand` |
| `job_technicians.company_id` | REQUIRED, no default | `1` for all rows |

## Per-tech job counts (after merge)

| user_id | Tech | Active? | MC jobs |
|---:|---|:-:|---:|
| 39 | Alma Salinas | ✓ | 204 |
| 32 | Norma Puga | ✓ | 154 |
| 38 | Diana Vasquez | ✓ | 134 |
| 34 | Ana Valdez | ✓ | 132 |
| 41 | Alejandra Cuervo | ✓ | 124 |
| 40 | Guadalupe Mejia | ✓ | 100 |
| 42 | Juliana Loredo | ✓ | 98 |
| 36 | Rosa Gallegos | ✓ | 59 |
| 43 | Juan Salazar | ✓ | 46 |
| 283 | Delia Martinez | **false** | 38 |
| 33 | Tatiana Merchan | ✓ | 3 |

Delia's 38 historical assignments landed as real `job_technicians` FK rows. Her `is_active=false` keeps her off the live Dispatch Board roster while the history is preserved for commission/payroll/reporting purposes.

## is_primary flag

For each job with ≥1 tech, the first element of `parsed_techs[]` was set as primary (`is_primary=true`), and matches `jobs.assigned_user_id`. Subsequent techs in multi-tech jobs are `is_primary=false`. This matches the Dispatch Board's existing convention.

## What did NOT change

- `job_history` — untouched. **4,514 rows / $935,252 intact.** Dashboard Monthly Revenue (reads from job_history) returns the same value as before L4.
- `recurring_schedules` — untouched. Still has NULL `day_of_week` on 78 of 79 rows. Engine remains off — no auto-generation.
- `clients` — untouched since L2.
- `users` — untouched since L3.1.
- Engine flag — **false** across all 4 tenants.
- No code changes.

## Staging table retention

`mc_dispatch_staging` is **kept, not dropped.** It retains:
- All 983 rows with full MC source fields + all 4 Phase 2-3 enrichment columns
- The Daveco `matched_schedule_id` NULL-outs from the L4 pre-fix

Rationale: post-cutover reconciliation, audit trail, and future "why did job X import this way" queries. No operational cost — single table, ~100KB.

## Rollback

```sql
-- Full undo of L4 (leaves L3.1 state intact):
BEGIN;

-- 1) Clear job_technicians rows from MC-imported jobs
DELETE FROM job_technicians jt
 USING jobs j
 WHERE jt.job_id = j.id
   AND j.mc_job_id IS NOT NULL
   AND j.company_id = 1;

-- 2) Delete the 983 imported jobs
DELETE FROM jobs
 WHERE company_id = 1 AND mc_job_id IS NOT NULL;
-- expect 983 rows

COMMIT;

-- 3) Optionally restore the Daveco NULL-outs in staging (if re-running L4)
UPDATE mc_dispatch_staging
   SET matched_schedule_id = 35
 WHERE matched_customer_id = 25 AND matched_schedule_id IS NULL
   AND scheduled_date IN ('2026-01-08','2026-02-09','2026-03-05','2026-04-07');
```

## Post-L4 verification for Sal

**Visit `app.qleno.com/dispatch?date=2026-04-23`** — should show **14 jobs / $2,900.25**. If it does, the MC import pipeline worked end-to-end from CSV → staging → jobs → Dispatch Board UI.

Dashboard Monthly Revenue won't change from today (still reads from `job_history`, which is untouched). That's the separate "MC actuals import" work you flagged for post-cutover reconciliation.

## Commit chain

| SHA | Commit | Notes |
|---|---|---|
| `75d11ab` | fix(engine): K — rollback + engine off | DB-only |
| `7079276` | chore(migration): L1 — staging + CSV load | 983 rows staged |
| `d867398` | chore(migration): L2 — customer matching | 983/983 → 266 clients |
| `1f5aeff` | chore(migration): L3 — schedule+tech+status | Staging enriched |
| `dc550ea` | chore(migration): L3.1 — Delia Martinez inactive user | +38 assignments |
| (this) | feat(migration): L4 — MC dispatch merge complete | **jobs + job_technicians populated** |

## Constraint maintained

- Engine flag **false** across all 4 tenants
- `job_history` untouched (Dashboard KPIs unchanged)
- `recurring_schedules` untouched (still needs day_of_week backfill before engine re-enable)
- `clients` untouched since L2
- `users` untouched since L3.1
- No code changes
- No engine re-enable

## What unlocks next

- **Dispatch Board** now reflects MC reality: ~11-14 jobs per working day, evenly distributed, correct tech assignments. Sal should verify at `app.qleno.com/dispatch`.
- **Historical attribution**: every job has `mc_job_id` for bidirectional audit against MC exports.
- **Per-tech commission calculations** can now run against real assignment history.
- **`recurring_schedules.day_of_week` backfill** (still pending) — once populated from MC's recurring-schedules report, the engine can be re-enabled without clustering.

**MC dispatch import: done. Reconciliation: exact.**
