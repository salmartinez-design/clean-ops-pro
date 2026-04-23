# Commit Q2 — Hover card rebuild + dispatch endpoint extension + /jobs → /reports/jobs

- **Timestamp:** 2026-04-22 CT (America/Chicago)
- **Operator:** Claude Code (Sal approved full plan)
- **Company:** PHES (company_id=1)
- **Engine flag:** false across all 4 tenants (unchanged)

## Commit letter

Sal's prompt called this P2. P is taken (`7df6ee5`), so this is Q2 matching Q1 (`232d241`).

## Headline

MC-parity hover card redesign with office-use-focused layout (status pill + zone/branch badge + last service date + entry instructions + stacked time block + total/payment + clean tech list). Backend endpoint extended to supply branch, derived zone, last_service_date, client_notes, and client_payment_method. JobsListPage relocated from `/jobs` to `/reports/jobs` with redirects for old bookmarks.

## Files changed

```
artifacts/api-server/src/routes/dispatch.ts              |  48 ++++-
artifacts/qleno/src/App.tsx                              |   9 +-
artifacts/qleno/src/components/layout/app-sidebar.tsx    |   6 +-
artifacts/qleno/src/pages/jobs.tsx                       | 272 +++++++++++++++-----
artifacts/qleno/src/pages/reports/index.tsx              |   4 +-
```

+265 / −74. 5 files touched. Zero DB writes.

## Part 2 — `/api/dispatch` endpoint extension

`artifacts/api-server/src/routes/dispatch.ts`

### New imports
- `branchesTable` added to drizzle schema imports

### New LEFT JOIN
```ts
.leftJoin(branchesTable, eq(jobsTable.branch_id, branchesTable.id))
```

### New SELECT fields
| Field | Source | Purpose |
|---|---|---|
| `client_zip` | `clientsTable.zip` | Feeds derived-zone subquery on frontend |
| `client_notes` | `clientsTable.notes` | Entry instructions (3.4% coverage per Phase A audit) |
| `client_payment_method` | `clientsTable.payment_method` | Post-Q1 has `card_on_file`/`net_30` for 264 clients |
| `branch_id` / `branch_name` | `jobsTable.branch_id` / `branchesTable.name` | Header badge |
| `last_service_date` | correlated subquery on `job_history` | `MAX(jh.job_date) WHERE customer_id AND job_date < scheduled_date` |
| `actual_hours` | `jobsTable.actual_hours` | Display in Time block alongside parsed MC `act:` start/end |

### Zone name/color upgraded to COALESCE with derivation fallback

Previously: `zone_name/zone_color` came only from the direct JOIN `jobs.zone_id → service_zones.id`. All 983 MC-imported rows have `jobs.zone_id = NULL`, so zones never rendered.

Now:
```sql
COALESCE(
  serviceZonesTable.color,                     -- direct JOIN (when jobs.zone_id set)
  (SELECT z.color FROM service_zones z         -- fallback: derive from client zip
     WHERE z.company_id = X AND z.is_active = true
       AND ${clientsTable.zip} = ANY(z.zip_codes) LIMIT 1)
)
```

MC-imported jobs now resolve zones via `clients.zip → service_zones.zip_codes @> ARRAY[zip]`. Zero data writes; purely a query-time enrichment.

## Part 3 — JobHoverCard rebuild

`artifacts/qleno/src/pages/jobs.tsx`

Replaced the entire `JobHoverCard` component (lines 1246-1361 pre-Q2 → expanded ~200 lines). 320px width preserved. No stopPropagation on root (clicks still bubble to parent `JobChip`). Phone anchor keeps its own stopPropagation to preserve tel:-dialing without opening the drawer.

### New structure (top to bottom)

```
┌──────────────────────────────────────────────────┐
│ [client_name]           [status pill: colored]    │
│ [address]                                          │
│ [phone — teal link]                               │
│ [●zone_color] [branch_name] · [zone_name]         │
├──────────────────────────────────────────────────┤
│ [service] · [frequency]                           │
│ Last service: [YYYY-MM-DD] ([9 days ago])         │
├──────────────────────────────────────────────────┤  ← only if client_notes
│ 🔑 ENTRY                                          │
│ [client_notes truncated to 180 chars]             │
├──────────────────────────────────────────────────┤
│ TIME                                              │
│ Scheduled: [start] – [end]                        │
│ Actual: [parsed] (X.XXh)                          │  ← only if act: tag parsed
│ Allowed: X.XXh                                    │
├──────────────────────────────────────────────────┤
│ TOTAL            │ PAYMENT                         │  ← payment col hidden if manual
│ $[amount]        │ [Credit Card / Invoice (Net 30)]│
├──────────────────────────────────────────────────┤
│ TECHNICIAN                                         │
│ [AV] [tech_name]  (no pay $ — per Q4 decision)    │
├──────────────────────────────────────────────────┤  ← only if live timeclock
│ JOB CLOCKS                                         │
│ In: 2:07 PM (23 ft)                               │
│ Out: 4:30 PM                                      │
│ [Flagged] (optional)                              │
├──────────────────────────────────────────────────┤  ← only if office_notes
│ [italic office notes, 120-char truncated]         │
├──────────────────────────────────────────────────┤
│ → Click for full details                          │
└──────────────────────────────────────────────────┘
```

### New helpers

| Helper | Purpose |
|---|---|
| `STATUS_PILL` | Colored pill config for scheduled / in_progress / complete / cancelled |
| `fmtPayment(pm)` | `card_on_file`→"Credit Card", `net_30`→"Invoice (Net 30)", `manual`→null (hides section) |
| `fmtRelativeDate(iso)` | "today" / "yesterday" / "N days ago" / "N weeks ago" / "N months ago" / "N years ago" |
| `parseActualTimes(notes)` | Extracts `act: 11:21 AM-1:25 PM` pattern from `jobs.notes` (L4 import artifact) |
| `stripImportTags(notes)` | Removes `[mc_import_phase* ...]` traceability tags before display |

### Conditional rendering

| Section | Shown when |
|---|---|
| Entry instructions (🔑 block) | `client_notes` non-empty after tag strip |
| Actual time line | `act:` parsed from notes OR `actual_hours > 0` |
| Payment column | `client_payment_method !== 'manual'` |
| Job Clocks block | `job.clock_entry` present (live-app jobs only) |
| Office notes italic footer | `office_notes` non-empty after tag strip |
| Zone/branch badge | `zone_name` OR `branch_name` present |

### Per-field decisions honored

| Sal's decision | Implementation |
|---|---|
| Q1 Zone → derive from client.zip at query time | COALESCE with `service_zones.zip_codes @> ARRAY[zip]` subquery in dispatch endpoint |
| Q2 Payment → backfill from MC consensus | Q1 already shipped; hover reads `client_payment_method` |
| Q3 Entry → show `clients.notes` when non-empty | Strip import tags, truncate to 180 chars, hide when empty |
| Q4 Tech → drop pay $, name only | `technicians.map` renders only avatar + name + (Primary tag if team) |
| Q5 Actual → parse `act:` from notes | `parseActualTimes` regex; fallback to nothing when not present |

### What stays unchanged in JobHoverCard

- 320px width, absolute positioning above chip with 8px gap
- No stopPropagation on root (clicks bubble to JobChip, which opens JobPanel)
- Phone anchor's stopPropagation preserved (tel: dial without drawer)
- Plus Jakarta Sans font inherited
- Mint accent `#2D9B83` for the phone link

## Part 4a — Route move: `/jobs` → `/reports/jobs`

`artifacts/qleno/src/App.tsx`

```diff
+ import { ..., Redirect } from "wouter";

 <Route path="/dispatch" component={JobsPage} />
- <Route path="/jobs" component={JobsListPage} />
- <Route path="/jobs/list" component={JobsListPage} />
+ <Route path="/jobs"><Redirect to="/reports/jobs" /></Route>
+ <Route path="/jobs/list"><Redirect to="/reports/jobs" /></Route>
+ <Route path="/reports/jobs" component={JobsListPage} />
```

- **`/dispatch`** — Gantt (sidebar default, unchanged)
- **`/jobs`** — redirects to `/reports/jobs` (old bookmark compat)
- **`/jobs/list`** — redirects to `/reports/jobs` (old alias)
- **`/reports/jobs`** — the new canonical URL for JobsListPage

## Part 4b — Reports index card

`artifacts/qleno/src/pages/reports/index.tsx`

Added a new report card in the "Operations" group (placed first since it's the broadest operational log):

```ts
{ title: "Job Log", desc: "All jobs with filters, KPIs, and export.", url: "/reports/jobs", icon: Briefcase },
```

Imports: added `Briefcase` to lucide-react import. Updated page subtitle: "17 reports" → "18 reports".

## Sidebar (not changed in Q2, clarification)

Jobs sidebar entry continues to point at `/dispatch` (per P, the Gantt view). `MULTI_URL_HIGHLIGHT` updated its comment to note that `/reports/jobs` (the flat list) highlights **Reports** not **Jobs** — by design, since it lives in the Reports section now. `/dispatch`, `/jobs`, and `/jobs/list` still highlight the Jobs sidebar entry.

## Typecheck

| Target | Baseline | After Q2 | Δ |
|---|---:|---:|---:|
| Frontend (`artifacts/qleno`) | 166 | **166** | 0 |
| API server (`artifacts/api-server`) | 888 | **892** | +4 |

The 4 new backend errors are all in the same "schema type drift" class as the 888 pre-existing ones (schema package TS types don't expose many columns, e.g. `jobsTable.account_id` already errored before this commit). Drizzle uses JS proxies at runtime — the column references work correctly regardless of TS types. Verified by **`esbuild` server bundle = OK**.

The new errors:
- `branchesTable` import (TS2305 — schema package type-export drift)
- `clientsTable.notes`, `clientsTable.payment_method`, `clientsTable.zip` (TS2339 — same class as existing `jobsTable.billed_hours` etc.)
- `jobsTable.actual_hours`, `jobsTable.branch_id` (same class)

This is a tolerated pre-existing codebase condition; the team has been living with 888 such errors. Fixing them requires regenerating the `@workspace/db/schema` types, which is a separate cross-cutting task.

## Rollback

```bash
git revert HEAD    # undoes Q2 cleanly
```

No DB writes in Q2 — frontend/backend code only. Q1's `clients.payment_method` backfill is independent and would remain.

## Verification plan for Sal

After Railway redeploys:

1. **Sidebar** — Jobs entry still points at `/dispatch` (Gantt). No new entry.
2. **Open `/dispatch?date=2026-04-23`** — Gantt renders, MC data.
3. **Hover any chip** — new hover card appears with:
   - Status pill top-right (colored)
   - Address + phone
   - Zone color dot + branch ("Oak Lawn") + zone name (if zip maps)
   - Service · Frequency on one line
   - "Last service: 2026-04-14 (9 days ago)" for clients with job_history
   - Entry (🔑) section only for clients with non-empty notes (~45 clients / 3.4%)
   - Time block: Scheduled / Actual (if act: parsed) / Allowed
   - Total + Payment (if not manual)
   - Technician name only (no pay $)
   - Job Clocks only for live-clock jobs (none for MC-imported)
   - No `[mc_import_phase4...]` tag visible anywhere
4. **Click anywhere on the hover card** — JobPanel drawer slides in.
5. **Click phone link** — tel: dialer, drawer does NOT open.
6. **Navigate to `/reports`** — "Job Log" card appears in Operations group.
7. **Click Job Log** → `/reports/jobs` → flat list view.
8. **Navigate to `/jobs` directly** (old bookmark) → redirects to `/reports/jobs`.

## Commit chain today

| SHA | Commit |
|---|---|
| `7df6ee5` | P — sidebar consolidation (Dispatch + Jobs → Jobs) |
| `232d241` | Q1 — payment_method backfill (264 clients) |
| (this) | **Q2** — hover card rebuild + endpoint extension + /jobs → /reports/jobs |

## Constraint maintained

- Engine flag **false** across all 4 tenants
- No `jobs` writes
- No `job_history` writes
- No `recurring_schedules` writes
- No `users` writes
- No `mc_dispatch_staging` writes
- No code changes to engine (`recurring-jobs.ts` / `index.ts`)
- No engine re-enable
