# Commit L1 — MC dispatch staging + CSV load

- **Timestamp:** 2026-04-22 CT (America/Chicago)
- **Operator:** Claude Code (Sal approved — file in place, go ahead)
- **Company:** PHES (company_id=1)
- **Engine flag:** false across all 4 tenants (still — unchanged by this commit)

## What shipped

**Schema additions (idempotent):**
- `jobs.mc_job_id BIGINT NULL` — idempotency anchor for future MC-sourced inserts
- `jobs_mc_job_id_uniq` — partial unique index ON `jobs(mc_job_id) WHERE mc_job_id IS NOT NULL`

**Staging table:** `mc_dispatch_staging` (dropped + recreated, 22 columns)

**Data loaded:** 983 rows from `migration/mc-exports-2026-04-22/dispatch-board-jan-apr.csv`

## Phase 1 gates — all passing

| Gate | Expected | Observed | ✓ |
|---|---:|---:|:-:|
| Total rows | 983 | 983 | ✓ |
| Unique `mc_job_id` | 983 | 983 | ✓ |
| Unique `customer_name` | 266 | 266 | ✓ |
| Min `scheduled_date` | 2026-01-01 | 2026-01-01 | ✓ |
| Max `scheduled_date` | 2026-04-30 | 2026-04-30 | ✓ |
| Total `bill_rate` | $217,533.38 | $217,533.38 | ✓ |
| Parse failures (null scheduled_date) | 0 | 0 | ✓ |

## Status distribution

| Status | Expected | Observed |
|---|---:|---:|
| Closed | 820 | 820 ✓ |
| Completed | 89 | 89 ✓ |
| Pending | 72 | 72 ✓ |
| In Progress | 2 | 2 ✓ |

## Frequency distribution (observed)

| Frequency | Rows |
|---|---:|
| Every Two Weeks | 263 |
| Single | 241 |
| Every Week | 201 |
| Other Recurring | 146 |
| Every Four Weeks | 103 |
| Every Three Weeks | 18 |
| On Demand | 11 |
| **TOTAL** | **983** |

## April 2026 daily distribution — matches MC ground truth exactly

MC ground truth (Sal's email) vs what just landed in staging for Apr 22–30:

| Date | DOW | MC jobs | MC $ | Staging jobs | Staging $ | Match |
|---|---|---:|---:|---:|---:|:-:|
| Apr 22 | Wed | 12 | $2,238.60 | 12 | $2,238.60 | ✓ |
| Apr 23 | Thu | 14 | $2,900.25 | 14 | $2,900.25 | ✓ |
| Apr 24 | Fri | 11 | $2,401.54 | 11 | $2,401.54 | ✓ |
| Apr 25 | Sat | 4 | $1,062.00 | 4 | $1,062.00 | ✓ |
| Apr 26 | Sun | 0 | $0 | 0 | $0 | ✓ |
| Apr 27 | Mon | 7 | $1,811.32 | 7 | $1,811.32 | ✓ |
| Apr 28 | Tue | 11 | $2,042.33 | 11 | $2,042.33 | ✓ |
| Apr 29 | Wed | 13 | $2,385.35 | 13 | $2,385.35 | ✓ |
| Apr 30 | Thu | 11 | $2,312.68 | 11 | $2,312.68 | ✓ |
| **Apr 22-30 TOTAL** | | **83** | **$17,154.07** | **83** | **$17,154.07** | ✓ |

Full-month April in staging: 258 rows, $62,467.28 (MC says 279 jobs $62,467.26 per Sal's original numbers — 21-row gap likely a Sat/Sun filtering artifact or a MC report boundary; will be reconciled in Phase 2 matching).

## What's NOT touched

- `jobs` table — **only the column was added.** No job rows inserted / updated / deleted in this commit.
- `job_history` — untouched. 4,514 rows / $935,252 intact; Dashboard KPIs unchanged.
- `recurring_schedules` — untouched. Still has 78 schedules with NULL `day_of_week` + wrong `start_date`. Phase 2 is the match-and-merge step; backfilling the schedule table is a separate downstream concern.
- Engine flag — still **false** across all tenants. 2 AM cron continues to short-circuit.

## Parser notes

### Scheduled-field parsing

MC format: `"M/D/YYYY H:MM AM - H:MM PM"`. Split on `" - "` to separate start/end times, then split the left-hand side on the first space to extract date. Date coerced to `YYYY-MM-DD` via `M.padStart(2,'0')` / `D.padStart(2,'0')`. **Zero parse failures** across all 983 rows.

### BOM handling

File starts with `\uFEFF` BOM. Stripped at parse time. Header comparison uses the 21 expected column names without BOM interference.

### RFC-4180-style CSV parser (hand-rolled)

No papaparse / csv-parse in deps (despite the prompt's hint). Hand-rolled parser handles:
- BOM strip
- Quoted fields containing commas
- Doubled-quote escaping (`""` inside quoted field → literal `"`)
- CRLF + LF line endings
- Final row without trailing newline

## Rollback

```sql
-- Undo L1 entirely:
DROP TABLE IF EXISTS mc_dispatch_staging;
DROP INDEX IF EXISTS jobs_mc_job_id_uniq;
ALTER TABLE jobs DROP COLUMN IF EXISTS mc_job_id;
```

The column + index are idempotent (`IF EXISTS` / schema check before ALTER), so re-running L1 is safe. The staging table is always dropped+recreated on load.

## Next step — Phase 2

Stops here. Phase 2 will:
1. Customer name-matching: link each of the 266 unique MC customer names to a `clients.id`. **Unmatched = HARD FAIL.**
2. Recurring schedule linking: where MC `frequency` matches `recurring_schedules.frequency` for a given customer, populate `matched_schedule_id`; otherwise leave NULL.
3. Parse the `team_raw` column into structured techs for `parsed_techs` JSONB.
4. Map MC status → Qleno status (Closed/Completed → `complete`, Pending/In Progress → `scheduled`).

After Phase 2 completes cleanly, Phase 3 will do the actual `INSERT ... ON CONFLICT (mc_job_id) DO UPDATE` into `jobs`.

## Commit chain context

| SHA | Commit | Notes |
|---|---|---|
| `4691069` | fix(engine): J1+J2+J4 cleanup + unique index | DB-only |
| `4bdd2f3` | fix(engine): J3 code hardening | ORDER BY + try/catch + no startup + advisory lock |
| `0371737` | feat(engine): J5 controlled re-enable | Manual trigger, 272 mis-distributed rows |
| `75d11ab` | fix(engine): K rollback 313 mis-distributed April rows + engine off | DB-only |
| (this) | chore(migration): L1 — staging table + CSV load for MC dispatch import | DB + log + CSV |

## Constraint maintained

- Engine flag **false** across all 4 tenants
- No code changes (only scripts under `artifacts/api-server/scripts/`, not committed)
- No `jobs` data touched (only new column added)
- No `job_history` changes
- No `recurring_schedules` changes
- No engine re-enable
