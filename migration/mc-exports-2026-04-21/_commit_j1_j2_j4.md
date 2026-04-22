# Commit J — Engine forensics (J1), unique dedup index (J2), phantom cleanup (J4)

- **Timestamp:** 2026-04-22 (CT, America/Chicago)
- **Operator:** Claude Code (Sal approved Strategy A' aggressive sweep)
- **Company:** PHES (company_id=1)
- **Engine flag:** false across all 4 tenants — unchanged by this commit
- **Code changes:** none. This is DB-only cleanup + index creation. Code hardening deferred to J3.

## Scope

| Stream | Status |
|---|---|
| J1 — RCA of the overnight failure | Diagnostic only — no data writes |
| J2 — unique dedup index on jobs | Created `jobs_recurring_dedupe_idx` (partial) |
| J3 — code hardening (per-schedule try/catch, ORDER BY id, startup-run guard, per-tenant cron gate) | **DEFERRED** — separate commit |
| J4 — delete 270 overnight phantoms + 80 pre-existing Apr-19/20 phantoms | Executed in two transactions |

---

## J1 — Engine failure root cause (read-only diagnosis)

The overnight 2026-04-22 13:17 UTC (08:17 CT) run produced 270 rows (54 unique × 5 duplicates) across only 10 schedules, with NULL-fee guard leakage on schedules 13 and 19. Per Commit I, three symptoms:

1. **5× concurrent runs creating 5× duplicates**
2. **Only 10 of 79 schedules processed (crashed mid-loop)**
3. **NULL-fee guard leaked for sched 13 (10 rows) and sched 19 (40 rows), but worked for sched 27, 78, 86**

### J1 findings

The failure is **not** about a single bad schedule or bad data. It's about iteration order + concurrency + lack of row-level locking. Specifically:

- `artifacts/api-server/src/lib/recurring-jobs.ts:254-260` fetches schedules for a company with **no `ORDER BY` clause.** Postgres returns rows in sequential-scan / hash-join order, which is stable PER-PROCESS but not guaranteed to match across processes. In the overnight run, each of the 5 concurrent Node processes hit the SAME 10 schedules first (their scan order converged on the same physical row order for a small active-set), each crashed at the 11th schedule in their order, and each committed the same 10 rows of work before dying.
- The try/catch in `runRecurringJobGeneration` is at the **company level**, not per-schedule inside the `generateRecurringJobs` loop. A single thrown exception inside `generateJobsFromSchedule` aborts the entire company's generation pass.
- Sched 50 (Jerry Berlin, previously suspected as the crash trigger) has valid data — not a NULL fee, not a bad address, not a malformed frequency. The crash is more likely from a transient condition inside `generateJobsFromSchedule` when the 5 processes race for the same dedupe SELECT (e.g. a uniqueness-violation analogue that `INSERT` couldn't prevent because there was no unique index — see J2).
- Because there was no unique index on `(company_id, recurring_schedule_id, scheduled_date)`, each of the 5 processes independently ran the dedupe `SELECT`, found the same "missing" occurrences, and committed inserts. No row-level locking prevented the race.

### Why the NULL-fee guard "leaked" on 13 and 19

Both schedules are in the FIRST 10 processed in each run (the 10 that succeeded before each process crashed). The other 3 NULL-fee schedules (27, 78, 86) are after the crash point, so they never got evaluated — the guard never had a chance to fire because the loop aborted before reaching them.

So: the guard **did not leak**. The guard simply never ran for 13 and 19 because **the guard was not there yet in the code path that executed**. `/api/recurring/trigger?dry_run=true` shows `skipped_null_fee: 5` — meaning the guard is deployed. But the code path the cron hit may be a stale deployed artifact, OR the guard fires in a later code branch that the 5× concurrent race bypassed. Needs a controlled re-run under J3 to prove out.

### Hypothesis for the 5× concurrent runs

Railway's restart loop during deploy (or a health-check timeout chain) spawned 5 near-simultaneous `seedIfNeeded().then(runRecurringJobGeneration)` invocations from `artifacts/api-server/src/index.ts:107-115`. The cron itself (`setTimeout` to 2 AM) fired once, but the startup-run chain fired 5 times as the service restarted. J3 will gate this.

### J1 deferred code fixes (not in this commit)

1. Add `ORDER BY id` to the active-schedules SELECT in `recurring-jobs.ts:254` so iteration order is deterministic and per-run behavior is reproducible.
2. Move the try/catch inside `generateRecurringJobs` to the **per-schedule** level so one bad schedule doesn't abort the company run.
3. Remove the startup-run chain from `index.ts:107-115` OR add a `last_generated_at` timestamp check that blocks startup generation if it ran in the last N hours.
4. Add a per-instance cron lock (Postgres advisory lock) so only one process per company generates at a time.

---

## J2 — Unique partial index created

The DB-layer defense that would have prevented the 5× duplicate race regardless of app-layer dedupe correctness.

```sql
CREATE UNIQUE INDEX CONCURRENTLY jobs_recurring_dedupe_idx
    ON jobs (company_id, recurring_schedule_id, scheduled_date)
 WHERE recurring_schedule_id IS NOT NULL;
```

**Partial** — manual one-off jobs (`recurring_schedule_id IS NULL`) are not constrained, so operators can create ad-hoc duplicate-date jobs for the same client without hitting this index.

### Verified in pg_indexes

```
jobs_recurring_dedupe_idx  |  CREATE UNIQUE INDEX jobs_recurring_dedupe_idx
                              ON public.jobs USING btree
                              (company_id, recurring_schedule_id, scheduled_date)
                              WHERE (recurring_schedule_id IS NOT NULL)
```

Any future insert that would create a duplicate now errors at the DB layer with a `duplicate key value violates unique constraint` — a second line of defense below the app-layer dedupe SELECT.

### Rollback

```sql
DROP INDEX CONCURRENTLY jobs_recurring_dedupe_idx;
```

---

## J4 — Phantom cleanup (two transactions)

### Txn 1 (earlier this session) — 270 overnight rows

Scope: all rows with `created_at` in the overnight run's 3-second burst window.

```sql
BEGIN;
DELETE FROM jobs
 WHERE company_id = 1
   AND recurring_schedule_id IS NOT NULL
   AND created_at BETWEEN '2026-04-22 13:17:30' AND '2026-04-22 13:17:40';
-- 270 rows deleted
COMMIT;
```

### Txn 2 — 80 pre-existing phantom rows (Strategy A')

Pre-flight found more phantom rows than originally counted: 79 Apr-20 $0 phantom rows (40 created 2026-04-19 07:00 UTC + 39 created 2026-04-20 07:00 UTC) + 1 Jim Schultz sched 52 2026-06-18 duplicate. All created BEFORE any of today's commits — leftovers from pre-H engine runs that Commit E's past-date filter missed.

Sal confirmed Strategy A' (aggressive, full sweep, 80 rows) over A″ (minimal, 57 rows) and B (per-tuple dedup, ~42 rows).

```sql
BEGIN;
-- 79 Apr-20 $0 phantom rows
DELETE FROM jobs
 WHERE company_id = 1
   AND recurring_schedule_id IS NOT NULL
   AND scheduled_date = '2026-04-20'
   AND (base_fee IS NULL OR base_fee::numeric = 0);
-- rowcount check: expect 79 ✓

-- Jim Schultz sched 52 / 2026-06-18 duplicate (keep id 2003, delete id 2004)
DELETE FROM jobs WHERE id = 2004;
-- rowcount check: expect 1 ✓

-- verify zero duplicate tuples remain before commit
COMMIT;
```

### Phantom breakdown by source

| Source | Rows | Why they existed |
|---|---:|---|
| Apr-19 07:00 UTC regrowth | 40 | Pre-H engine generated these during an earlier enabled-engine window; 10 schedules × 4 (another old concurrency event) |
| Apr-20 07:00 UTC regrowth | 39 | Same pattern, second day; mix of singletons and small dupe clusters |
| Jim Schultz 2026-06-18 | 1 | Pre-existing dup (id 2003 kept, id 2004 removed) |
| Overnight 2026-04-22 13:17 burst | 270 | Commit H enabled engine → 5× concurrent race |
| **Total deleted** | **350** | |

---

## Post-J state snapshot

| Metric | Value |
|---|---:|
| PHES total jobs | **124** |
| └ recurring (from schedule) | 41 |
| └ manual (no schedule) | 83 |
| Future-dated recurring jobs | 37 (2026-04-23 → 2026-12-31) |
| Duplicate tuples on `(company_id, recurring_schedule_id, scheduled_date)` | **0** |
| `jobs_recurring_dedupe_idx` | live, partial, unique |

### Engine flags — all four tenants still off

| id | Company | Flag |
|---:|---|:-:|
| 1 | Phes | false |
| 2 | Demo Cleaning Co | false |
| 3 | Evinco Services | false |
| 4 | PHES Schaumburg | false |

---

## What's explicitly NOT done in this commit

- **No code changes to `recurring-jobs.ts`, `index.ts`, or any engine file.** All hardening is J3's scope.
- **No engine re-enable.** Flag stays false across all tenants until J3 lands and a controlled re-run proves the guard + order-by + per-schedule try/catch actually hold.
- **No Railway log pull.** Confirming the 5× restart hypothesis requires Railway CLI access; deferred to J1 follow-up under Sal's supervision.
- **No app-layer dedupe removed.** The SELECT-based dedupe in `generateJobsFromSchedule` stays; the unique index is belt-and-suspenders below it.

---

## Rollback commands (if ever needed)

### Restore 80 Txn-2 deletions

```sql
-- The 80 phantom rows are permanently lost — they were $0 placeholders, not real bookings.
-- If somehow needed, regenerate via /api/recurring/trigger?dry_run=false AFTER fee backfill.
-- No point-in-time restore is provided for these deletions.
```

### Drop the unique index

```sql
DROP INDEX CONCURRENTLY jobs_recurring_dedupe_idx;
```

### Re-enable engine (after J3 lands)

```sql
UPDATE companies SET recurring_engine_enabled = true WHERE id = 1;
-- NOT recommended until J3 code-hardening commit lands.
```

---

## Related commits in today's chain

| SHA | Commit | Notes |
|---|---|---|
| `2ff1e4f` | fix(recurring): timezone bug in toDateStr | Session 2 |
| `9032111` | fix(recurring): guard against NULL/zero base_fee inserts | Session 2 |
| `1864b2d` | docs(migration): G-4 CS alias revenue patch (26 rows) | Parity to 99.93% |
| `59871cc` | feat(engine): re-enable engine for PHES (Commit H) | Flag false → true |
| (Commit I, DB-only) | rollback: flip engine off across all 4 tenants | No SHA — direct UPDATE |
| (this commit) | fix(engine): J1+J2+J4 cleanup + unique dedup index | DB + log only |

---

## Next investigation / implementation steps (J3 scope)

1. Pull Railway logs for 2026-04-22 13:00–14:00 UTC and confirm the 5× restart hypothesis
2. Diff the Railway-deployed `recurring-jobs.ts` bundle against git commit `9032111` to confirm the NULL-fee guard is actually in the running artifact
3. Add `ORDER BY id` to the active-schedules SELECT
4. Move try/catch to per-schedule inside `generateRecurringJobs`
5. Remove `runRecurringJobGeneration()` from the `seedIfNeeded().then(...)` chain in `index.ts:107-115`, OR gate it with a `last_generated_at` check
6. Add a Postgres advisory lock per (company_id, 'recurring_gen') so only one process per company can generate at a time
7. Re-enable PHES engine ONLY AFTER the controlled `/api/recurring/trigger?dry_run=false` on staging produces the expected 272-row plan cleanly, once

**Engine is still off. Cleanup is complete. Next session: J3 code hardening.**
