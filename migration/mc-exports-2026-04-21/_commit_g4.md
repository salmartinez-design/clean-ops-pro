# Commit G-4 — CS alias revenue patch log

- **Timestamp:** 2026-04-21 19:36 CT (America/Chicago)
- **Operator:** Claude Code (Sal approved)
- **Company:** PHES (company_id=1)
- **Transaction mode:** single BEGIN/COMMIT with rowcount gate + per-client total verification + rollback-on-any-fail
- **Source:** `Customer Sales - Phes (3).xlsx` + `(4).xlsx` — authoritative CS monthly allocations, attributed to the correct DB clients via Sal-approved aliases

## Result

| Metric | Value |
|---|---|
| Rows affected | **26** (plan was 26; prompt estimate of 25 was off by 1 because Tamara Ditter has 17 rows from 2025-01+, not 16) |
| Rollback triggered? | No (one rollback early in execution due to my verification query bug; re-ran and clean) |
| Revenue added | **$6,452.86** |
| Clients patched | 6 |

## Per-client summary

| DB id | Client | CS alias name | Rows | Delta | Post-G4 2025+ total |
|---:|---|---|---:|---:|---:|
| 96 | Tamara Ditter | Wilkosz, Erika | 17 | +$2,540.00 | $2,540.00 |
| 161 | Gwendolyn Norfleet | Stone, Delian | 1 | +$1,000.00 | $1,000.00 |
| 243 | 413 N Noble Condo Assoc | Broz, Kelsey | 4 | +$740.00 | $740.00 |
| 248 | Evinco Services | Orvis, Keith | 1 | +$704.38 | $895.40 (was $191.02) |
| 260 | Cannon REI LLC | Cannon, Shawn | 2 | +$855.00 | $855.00 |
| 410 | Josephine Medrano | Medrano, Mark | 1 | +$613.48 | $613.48 |

## Deviation from prompt SQL

- Adapted row count from 25 to 26 after pre-flight verification showed Tamara Ditter has 17 rows from 2025-01+ (not 16 as the prompt estimated).
- Used `notes NOT LIKE '%mc_import_g4_2026_04_21%'` as the idempotency guard instead of `revenue IS NULL OR = 0` because Evinco row_b had pre-existing $95.51 revenue (the UPDATE adds $704.38 to it, not replaces $0).
- First execution attempt rolled back cleanly: my verification query summed lifetime revenue (including pre-2025 rows), which for Tamara mistakenly flagged a mismatch against her CS 2025+ target. Corrected the query to filter `WHERE job_date >= '2025-01-01'` and re-ran. No data was written during the rollback attempt.

## Parity achieved

| Period | DB post-G4 | MC CS | Residual | Parity % |
|---|---:|---:|---:|---:|
| 2025 full year | $738,908.49 | $739,399.51 | $491.02 | **99.93%** |
| 2026 YTD | $196,343.47 | $196,493.47 | $150.00 | **99.92%** |
| **Combined** | $935,251.96 | $935,892.98 | $641.02 | **99.93%** |

See `_commit_g4_parity.md` for per-client parity breakdown.

## Residual accounted for

| Item | $ | Status |
|---|---:|---|
| Stan Bratt (CS 2025-05 $300) | $300.00 | Accepted unmatched — MC "No Results Found" per Sal |
| Ray Rackman (CS 2026-01 $150) | $150.00 | Accepted unmatched — MC "No Results Found" per Sal |
| Unexplained | $191.02 | 0.02% of combined — deferred for post-cutover investigation |

## Full list of patched job_history IDs

```
Tamara Ditter (id 96) — 17 rows:
  8103, 8104, 8105, 8106, 8107, 8108, 8109, 8110, 8111, 8112, 8113, 8114,
  9275, 9276, 9277, 9278, 9279

Evinco Services (id 248) — 1 row (row_b only; row_a id 8024 preserved):
  8025

Josephine Medrano (id 410) — 1 row:
  8119

Cannon REI LLC (id 260) — 2 rows:
  8057, 8058

413 N Noble Condo Assoc (id 243) — 4 rows:
  8054, 8055, 8056, 9255

Gwendolyn Norfleet (id 161) — 1 row:
  8120
```

## Rollback command (if ever needed)

```sql
BEGIN;
UPDATE job_history
   SET revenue = 0,
       notes = regexp_replace(notes, ' \[mc_import_g4_2026_04_21 cs_patch\]', '', 'g')
 WHERE company_id = 1
   AND notes LIKE '%mc_import_g4_2026_04_21%'
   AND id IN (8103, 8104, 8105, 8106, 8107, 8108, 8109, 8110, 8111, 8112, 8113, 8114,
              9275, 9276, 9277, 9278, 9279,
              8119, 8057, 8058, 8054, 8055, 8056, 9255, 8120);
-- Evinco row 8025 special case: restore to $95.51
UPDATE job_history SET revenue = 95.51 WHERE id = 8025;
COMMIT;
```

## Follow-up notes (out of scope)

- **Unexplained $191.02 in 2025** — below 0.03% of annual revenue, not blocking cutover. Likely another CS alias we haven't identified. Can be investigated post-cutover with additional MC probes.
- **Arianna Goose (id 26)** not in this commit — already at perfect parity with CS "Rowland, Kristin" line pre-G4. Documented as a CS-alias anomaly.
- **Cucci Property Management ($5,329 CS line)** — still a G-2-documented reporting artifact. CS under-reports real Cucci billing; DB is correct via client id 24.
- **Engine flag unchanged.** `companies.recurring_engine_enabled = false` for PHES (id=1). Re-enable still gated on a separate commit (H or later).
- **No clients created.** All patches were UPDATEs on existing job_history rows. Zero new `clients` entries, zero `recurring_schedules` touched.
