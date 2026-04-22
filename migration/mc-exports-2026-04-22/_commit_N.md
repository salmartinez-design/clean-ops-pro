# Commit N — Restore Jobs sidebar → flat list; backfill allowed_hours

- **Timestamp:** 2026-04-22 CT (America/Chicago)
- **Operator:** Claude Code (Sal re-flipped Option C after shipping B in M)
- **Company:** PHES (company_id=1)
- **Engine flag:** false across all 4 tenants (unchanged)

## Headline

Three targeted fixes bundled: **(1)** restore the Jobs sidebar entry but point it at the flat list view instead of the Gantt; **(2)** change the `/jobs` route handler to `JobsListPage`; **(3)** backfill `jobs.allowed_hours` from `estimated_hours` on the 983 L4-imported rows so the Dispatch Board Gantt renders true MC durations.

## Fix 1 — Restore Jobs sidebar entry

`artifacts/qleno/src/components/layout/app-sidebar.tsx`

Re-added the entry I removed in M. Back to where it was:

```diff
 import {
   LogOut, X, LayoutDashboard, CalendarDays,
-  Users, UserCheck, FileText, DollarSign,
+  Briefcase, Users, UserCheck, FileText, DollarSign,
   ...
 } from "lucide-react";

 { title: "Dashboard",      url: "/dashboard",  icon: LayoutDashboard },
 { title: "Dispatch Board", url: "/dispatch",    icon: CalendarDays },
+ { title: "Jobs",           url: "/jobs",       icon: Briefcase },
 { title: "Customers",      url: "/customers",  icon: Users },
```

## Fix 2 — Repoint `/jobs` route to JobsListPage

`artifacts/qleno/src/App.tsx:106`

Previously `/jobs` and `/dispatch` both rendered the Gantt (intentional per `cc3a231`, but confusing because the sidebar implied two distinct views). Now `/jobs` renders the flat list, `/dispatch` renders the Gantt, and clicking Jobs in the sidebar produces a visibly different view from Dispatch Board.

```diff
 <Route path="/dispatch" component={JobsPage} />
- <Route path="/jobs" component={JobsPage} />
+ <Route path="/jobs" component={JobsListPage} />
 <Route path="/jobs/list" component={JobsListPage} />
```

`/jobs/list` stays as an alias for any direct bookmarks. Both paths render the same component.

`JobsListPage` already exists at `artifacts/qleno/src/pages/jobs-list.tsx` (631 lines, imported on App.tsx:13) — columns for Client, Tech, Date, Time, Service, Status, Amount, Branch, Zone, Payment, Frequency, Flagged, Created. Clicking a row opens the client profile.

## Fix 3 — Backfill `jobs.allowed_hours` from `estimated_hours` on MC-imported rows

### Why

My L4 INSERT populated `estimated_hours` but not `allowed_hours`. The Dispatch endpoint at `artifacts/api-server/src/routes/dispatch.ts:53` reads `allowed_hours` to compute `durationMinutes`:

```ts
const durationMinutes = j.allowed_hours ? Math.round(parseFloat(j.allowed_hours) * 60) : 120;
```

Without a backfill, all 983 MC-imported rows would have `durationMinutes = 120` (2-hour default block) on the Gantt, regardless of MC's actual `Alwd. Hours`.

### Dry-run

```sql
SELECT COUNT(*) FROM jobs
 WHERE company_id = 1 AND mc_job_id IS NOT NULL
   AND allowed_hours IS NULL AND estimated_hours IS NOT NULL;
-- result: 983
```

MC rows context:

| total_mc | already_set (allowed_hours NOT NULL) | no_estimate |
|---:|---:|---:|
| 983 | 0 | 0 |

All 983 MC-imported rows matched the backfill predicate. Zero had `allowed_hours` already set, zero were missing an `estimated_hours` source.

Sample pre-update:

| id | mc_job_id | client_id | estimated_hours | allowed_hours |
|---:|---|---:|---:|---|
| 3249 | 49361698 | 131 | 3.20 | NULL |
| 3250 | 49492404 | 65 | 4.00 | NULL |
| 3251 | 49492405 | 65 | 4.00 | NULL |
| 3252 | 52661856 | 145 | 3.45 | NULL |
| 3253 | 53217328 | 28 | 4.00 | NULL |

### Transaction

```sql
BEGIN;
UPDATE jobs
   SET allowed_hours = estimated_hours
 WHERE company_id = 1
   AND mc_job_id IS NOT NULL
   AND allowed_hours IS NULL
   AND estimated_hours IS NOT NULL
RETURNING id;
-- rowcount: 983 ✓
COMMIT;
```

Committed on first attempt.

### Post-verify

| total_mc | has_allowed | null_allowed | min_allowed | max_allowed | avg_allowed |
|---:|---:|---:|---:|---:|---:|
| 983 | **983** | 0 | 0.00 | 15.20 | **3.73** |

### Duration distribution (top buckets)

| allowed_hours | Rows |
|---:|---:|
| 0.00 | 1 |
| 1.00 | 6 |
| 1.20 | 4 |
| 1.50 | 38 |
| **2.00** | **116** |
| 2.50 | 35 |
| **3.00** | **299** |
| 3.50 | 30 |
| ... | ... |
| 15.20 | (commercial batch) |

The **avg 3.73h** is meaningfully different from the previous hardcoded 120-minute default (2h). The Gantt will now show 3-hour and 4-hour visits at their true length, and short 1.5h cleans will no longer swallow neighboring chip space.

## Files changed

```
artifacts/qleno/src/App.tsx                            | 2 +-
artifacts/qleno/src/components/layout/app-sidebar.tsx  | 6 ++++--
```

+6 / −3 total. Plus 983-row UPDATE on `jobs` (DB-only, not in git diff).

## Typecheck

| Check | Count |
|---|---:|
| `tsc --noEmit` errors (qleno frontend) | **166** (unchanged from M baseline) |

Zero new errors.

## Rollback

### Revert fix 1 & 2 (frontend)

```bash
git revert HEAD
```

### Revert fix 3 (DB)

```sql
-- Safe reversal: NULL out allowed_hours where it equals estimated_hours on
-- MC-imported rows. Because L4 never set allowed_hours, this restores the
-- pre-N state exactly.
UPDATE jobs
   SET allowed_hours = NULL
 WHERE company_id = 1
   AND mc_job_id IS NOT NULL
   AND allowed_hours = estimated_hours;
-- expect 983 rows
```

## Verification plan for Sal

After Railway redeploys (auto from main push):

1. **Sidebar shows Jobs again** — reload `app.qleno.com`. Under "Operations": Dashboard / Dispatch Board / **Jobs** / Customers / Accounts / Employees.
2. **Click Jobs → flat list** — row of jobs with columns (Client, Tech, Date, Time, Service, Status, Amount, Branch). Filter/search works. Distinct from Dispatch Board's Gantt.
3. **Click Dispatch Board → Gantt with true durations** — MC-imported jobs now render as 3-hour, 4-hour, 1.5-hour blocks matching their real `Alwd. Hours`, instead of uniform 2-hour blocks.
4. **Spot-check Apr 23 `/dispatch?date=2026-04-23`** — 14 jobs total matches MC; chip widths vary visibly (no longer all identical-looking).

## What did NOT change

- `job_history` — untouched, 4,514 rows / $935K intact
- `recurring_schedules` — still has NULL `day_of_week` on 78/79 rows (deferred to separate session)
- `clients` — untouched since L2
- `users` — untouched since L3.1
- Engine flag — `false` across all 4 tenants
- No new backend code changes (Dispatch endpoint already reads `allowed_hours` correctly — the bug was upstream in L4's INSERT omitting the column)

## Commit chain

| SHA | Commit | Notes |
|---|---|---|
| `0354e57` | feat(migration): L4 — MC dispatch merge | 983 jobs imported |
| `54b5420` | fix(ui): M — remove Jobs sidebar + hover card fixes | A/B/C/D; D shipped as "remove" |
| (this) | fix(ui+data): N — restore Jobs → list view, allowed_hours backfill | D re-flipped to "repoint"; durations fixed |

## Constraint maintained

- Engine flag **false** across all 4 tenants
- No `job_history` writes
- No `recurring_schedules` writes
- No `clients` writes
- No `users` writes
- No backend code changes
- No engine re-enable
