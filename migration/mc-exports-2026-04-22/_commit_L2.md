# Commit L2 — MC dispatch customer matching complete

- **Timestamp:** 2026-04-22 CT (America/Chicago)
- **Operator:** Claude Code (Sal approved Option A)
- **Company:** PHES (company_id=1)
- **Engine flag:** false across all 4 tenants (unchanged)

## Headline

**All 983 `mc_dispatch_staging` rows resolve to 266 unique Qleno client IDs.** Zero unmatched after the Option A fix. Ready for Phase 3 (schedule linking + tech parsing + status mapping).

## Match-pass summary

| Pass | Rule | Caught | Running |
|---|---|---:|---:|
| 2.2 | exact normalized name match | 958 / 258 names | 958 / 983 |
| 2.3 | phone last-10-digits match | 4 / 1 name | 962 / 983 |
| 2.4 | address prefix (20-char lowercase) | 0 | 962 / 983 |
| F2.2 | Carol Butler alias → client id=22 | 15 / 1 name | 977 / 983 |
| F2.4 | 6 new clients created + linked | 6 / 6 names | **983 / 983** ✓ |

Effective coverage: **266 unique MC customer names → 266 unique Qleno clients** (perfect 1:1, no name-to-many or many-to-name collisions).

## What changed in `clients`

### 1. Backfilled id=22 "Tom and Carol Butler" contact info

```sql
UPDATE clients
   SET phone = '312-301-5678',
       address = COALESCE(address, '121 N Garfield St')
 WHERE id = 22 AND company_id = 1;
```

| Field | Before | After |
|---|---|---|
| phone | NULL | `312-301-5678` |
| address | NULL | `121 N Garfield St` |
| first_name | `Tom and Carol` | unchanged |
| last_name | `Butler` | unchanged |
| is_active | true | unchanged |

Value add: id=22 now has phone + address for automated comms. The DB record was a skeleton from the B-series import that never got field-enriched; MC's 15 Carol Butler visits all agreed on the phone/address pair, so it's reliable.

### 2. Six new residential clients created from MC singletons

```sql
INSERT INTO clients (company_id, first_name, last_name, phone, address,
                     is_active, notes, client_type, created_at)
SELECT 1, <split-name>, <split-last>, phone, address,
       false, '[mc_import_phase2 2026-04-22]', 'residential'::client_type, NOW()
  FROM (SELECT DISTINCT ON (customer_name) ...) unmatched;
-- rowcount: 6 ✓
```

Name split: `POSITION(' ' IN REVERSE(customer_name))` trick — first_name is everything before the LAST space, last_name is everything after. All 6 split cleanly because each has a single first + single last name.

**NOTE:** `clients.migration_source` does not exist. The traceability tag lives in `clients.notes = '[mc_import_phase2 2026-04-22]'` — same pattern as the G-series `[mc_import_g4_2026_04_21]` tags on `job_history` rows. Queryable via `notes LIKE '%mc_import_phase2%'`.

| id | first_name | last_name | phone | address | is_active | MC jobs |
|---:|---|---|---|---|:-:|---:|
| 1331 | Connie | Castillo | 773-266-9673 | 96 Foxfire Drive | false | 1 |
| 1332 | Falana | Smart | 313-722-5035 | 9955 Nottingham Avenue | false | 1 |
| 1333 | Lauren | Covalle | 586-292-7152 | 11411 South Ewing Avenue | false | 1 |
| 1334 | Lauren | Kent | 773-354-7896 | 6214 South Champlain Avenue | false | 1 |
| 1335 | Mackenzie | Dongmo | 872-310-8477 | 5009 North Sheridan Road Unit 410 | false | 1 |
| 1336 | Peter | Nicieja | 773-598-0216 | 4455 North Hamilton Avenue | false | 1 |

All 6 are `is_active=false` — MC marks them as `frequency='Single'` (one-time bookings). Can be reactivated later if they return for recurring service.

## What changed in `mc_dispatch_staging`

- `matched_customer_id` populated on all 983 rows (was 962 / 21 NULL before this commit)
- 15 Carol Butler rows → `matched_customer_id = 22`
- 6 singleton rows → `matched_customer_id IN (1331, 1332, 1333, 1334, 1335, 1336)`

Other staging columns (`matched_schedule_id`, `parsed_techs`, `mapped_status`) are still NULL — those get populated in Phase 3.

## What did NOT change

- `jobs` — **zero writes**. Only the `mc_job_id` column added in L1 persists.
- `job_history` — untouched. 4,514 rows / $935,252.
- `recurring_schedules` — untouched. Still has NULL `day_of_week` on 78 of 79 rows.
- Engine flag — `false` across all 4 tenants. Cron still short-circuits.
- No code changes.

## Match quality probes

### Top 10 customers by MC job volume

| Qleno id | Name | MC jobs | $ |
|---:|---|---:|---:|
| 19 | Daniel Walter | 53 | $11,325.00 |
| 24 | Chris Cucci | 40 | $6,704.35 |
| 26 | Arianna Goose | 34 | $5,440.00 |
| 20 | KMA Property Management | 33 | $6,115.00 |
| 21 | Jaira Estrada | 33 | $11,810.00 |
| 47 | Jennifer Joy | 18 | $2,100.00 |
| 1330 | 4009 West 93rd Place Condo Assoc | 18 | $1,667.04 |
| 40 | Heritage Condominium | 18 | $1,732.00 |
| 29 | Bill Azzarello | 17 | $3,045.00 |
| 22 | Tom and Carol Butler | 15 | $3,600.00 |

Consistent with expectations from the G-series and earlier CS reconciliations:
- **Chris Cucci (id 24)** — 40 visits matches the dispatch-authoritative narrative from Commit G-2. CS CPM remains a reporting artifact.
- **Arianna Goose (id 26)** — 34 visits under her real Qleno name (not the "Rowland, Kristin" CS alias).
- **Bill Azzarello (id 29)** — the NULL-fee schedule from the J3 incident cohort, now has 17 real billed visits in MC.
- **Tom and Carol Butler (id 22)** — 15 Carol Butler weekly visits, now correctly linked.

### Integrity checks

- **Any MC name → multiple customer_ids?** None. Every MC customer_name resolves to exactly one Qleno client.
- **Name-variant consolidation?** Carol Butler is the only one-name-to-one-variant consolidation (Carol Butler → Tom and Carol Butler). The other 265 MC names exactly equal the DB name (259 from Pass 1, 1 from Pass 2, 6 from F2.3 we just created).

## Rollback

```sql
-- 1. Unlink new clients from staging
UPDATE mc_dispatch_staging
   SET matched_customer_id = NULL
 WHERE matched_customer_id IN (1331, 1332, 1333, 1334, 1335, 1336);

-- 2. Delete the 6 new client rows
DELETE FROM clients
 WHERE company_id = 1 AND notes = '[mc_import_phase2 2026-04-22]';
-- expect 6 rows ✓

-- 3. Unlink Carol Butler rows
UPDATE mc_dispatch_staging
   SET matched_customer_id = NULL
 WHERE customer_name = 'Carol Butler' AND matched_customer_id = 22;
-- expect 15 rows

-- 4. Restore client id=22 phone/address to NULL
UPDATE clients SET phone = NULL, address = NULL WHERE id = 22;
```

Scoped idempotent rollback — safe to run if Phase 3 reveals a reason to start over.

## Commit chain

| SHA | Commit | Notes |
|---|---|---|
| `75d11ab` | fix(engine): K — rollback 313 mis-distributed April rows + engine off | DB-only |
| `7079276` | chore(migration): L1 — staging table + CSV load | Staging 983 rows |
| (this) | chore(migration): L2 — customer matching complete (983/983) | Clients table + staging writes |

## Next — Phase 3

Stop here. Phase 3 will:
1. Map MC frequency → Qleno frequency enum (Every Two Weeks → biweekly, Every Week → weekly, Every Four Weeks → monthly, Single → NULL/one-off, Other Recurring → case-by-case, On Demand → NULL, Every Three Weeks → custom)
2. For each staging row, attempt to link `matched_schedule_id` to an existing `recurring_schedules.id` for that `matched_customer_id` with compatible frequency
3. Parse `team_raw` ("Alma Salinas" / "Alma Salinas, Ana Valdez") into structured `parsed_techs` JSONB
4. Map MC `status_raw` → Qleno status enum (Closed/Completed → `complete`, Pending/In Progress → `scheduled`, etc.)

After Phase 3 completes clean, Phase 4 will be the actual `INSERT ... ON CONFLICT (mc_job_id) DO UPDATE` merge into `jobs`.

## Constraint maintained

- Engine flag **false** across all 4 tenants
- No `jobs` writes
- No `job_history` writes
- No `recurring_schedules` writes
- No code changes
- No engine re-enable
