# Schema drift baseline — production

Owner: Sal Martinez. Updated: 2026-04-30.

## Purpose

The schema-verify check (`artifacts/api-server/src/scripts/verify-schema.ts`) runs on every cold start of the api-server. It compares Drizzle's declared schema against the live Postgres schema **in one direction only**: it flags when Drizzle declares a table / column / enum-value the DB does NOT have. The reverse — DB has things Drizzle doesn't know about — is benign and intentional (`phes-data-migration.ts` creates ~30 tables outside the Drizzle schema; legacy migrations may have added columns that never made it into the ORM).

This document captures any drift detected the first time the verifier ran in production, so we can distinguish "expected baseline" from "new drift introduced by this PR" going forward.

## Procedure

1. Deploy a PR containing the `verify-schema` check with `SCHEMA_VERIFY_MODE` unset (default = `warn`). The api-server will log drift to Railway logs without blocking boot.
2. Open Railway logs for the post-deploy cold start. Search for `[schema-verify]`.
3. **If the log says `[schema-verify] mode=warn — no drift detected`**: paste that line below under "Baseline reading" and skip to the Strict-mode rollover section.
4. **If the log lists drifts**: paste the full output below. For each line, decide:
   - **Expected** — drift is benign, document the reason. Stays as-is.
   - **Bug** — drift represents a real ORM↔DB mismatch that needs fixing. File as a follow-up issue, fix in a separate PR.
5. After all expected drift is documented and all bugs are filed: open a follow-up PR setting `SCHEMA_VERIFY_MODE=strict` in Railway env vars. From then on, any new drift fails boot until resolved.

## Baseline reading

> Sal: paste the full `[schema-verify]` log output from the first post-deploy cold start here. Then annotate each line as `[expected]` or `[bug]` per the procedure above.

```
[schema-verify] mode=warn — <output goes here>
```

## Strict-mode rollover

After baseline is clean (or all drift annotated as expected and bugs filed):

1. Set `SCHEMA_VERIFY_MODE=strict` in Railway env vars.
2. Trigger a redeploy. Confirm the next cold start logs `[schema-verify] mode=strict — no drift detected` (or the same baseline-expected drift, which will still fail strict mode if any are error-severity — that's the signal to either fix Drizzle/DB or escalate the drift to allowlist-with-justification).
3. Document the rollover date here.

**Rolled over to strict on:** _(not yet)_

## What's NOT covered

- **Type equivalence** — Drizzle's `serial` ↔ DB's `integer` (with sequence default), `varchar(N)` ↔ `character varying`, `timestamp` ↔ `timestamp without time zone`. Type-name divergence is messy enough that v1 of the verifier checks existence + nullability only. v2 if it proves insufficient.
- **Indexes** — not introspected.
- **Foreign keys** — not introspected. Drizzle declares `references()` but the runtime introspection query is non-trivial.
- **Defaults** — not compared.
- **DB-extra schema** — by design (one-way, see Purpose above).

## Operator notes

- The check adds ~0.5s to cold-start time on Phes's ~50-table schema. Acceptable on a 15s boot.
- If verification itself crashes (rare — query syntax error, missing module, etc.), boot continues. We don't want a verifier bug to take prod down.
- The verifier is also runnable standalone: `pnpm --filter @workspace/api-server exec tsx src/scripts/verify-schema.ts` against any `DATABASE_URL`. Useful for local-vs-prod drift checks during development.
