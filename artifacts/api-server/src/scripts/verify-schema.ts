/**
 * [PR / 2026-04-30] Schema drift verification.
 *
 * Goal: prevent a Claude Code schema change from booting prod into a
 * broken state where seed/migration runs but app code expects a
 * different shape (e.g. PR ships ORM expecting columns that don't
 * exist → broken queries on every request).
 *
 * Direction: ONE-WAY (Sal's Q2.1 = a). We flag when Drizzle declares
 * a table / column / enum-value the DB does NOT have. We do NOT flag
 * the reverse — DB-extra rows from `phes-data-migration.ts` (~30
 * tables: rate_locks, offer_settings, booking_settings, leads,
 * follow_up_*, acquisition_sources, recurring_schedule_addons_days,
 * commercial_service_types, job_audit_log, client_audit_log, etc.)
 * are intentional and benign. Allowlisting them would create a
 * maintenance burden that doesn't pay for itself.
 *
 * Coverage: tables, columns (existence + nullability), enums + enum
 * values. NOT covered in v1: column type equivalence (Drizzle/DB type
 * names diverge in messy ways — `serial` ↔ `integer`, `varchar(N)` ↔
 * `character varying`, `timestamp` ↔ `timestamp without time zone`),
 * indexes, foreign keys, defaults. v2 if v1 proves insufficient.
 *
 * Modes (via `SCHEMA_VERIFY_MODE` env var, consumed in index.ts):
 *   strict  — exit non-zero on any error-severity drift
 *   warn    — log only, never exit (default for first deploy)
 *   off     — skip verification entirely
 *
 * Standalone invocation: `tsx scripts/verify-schema.ts` from the
 * api-server workspace. Runs against the same DATABASE_URL the
 * server uses.
 */

import { db } from "@workspace/db";
import * as schema from "@workspace/db/schema";
import { sql, is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";

export type DriftSeverity = "error" | "warn";
export type DriftKind =
  | "missing_table"
  | "missing_column"
  | "nullability_mismatch"
  | "missing_enum"
  | "missing_enum_value";

export type Drift = {
  severity: DriftSeverity;
  kind: DriftKind;
  message: string;
  table?: string;
  column?: string;
  enum?: string;
};

// Drizzle's pgEnum() returns a callable function with `enumName` and
// `enumValues` properties attached. There's no exported `is(v, PgEnum)`
// helper, so we duck-type. Stable enough — Drizzle would have to break
// the enumName/enumValues contract to break this check, and that's a
// public-API change they'd flag.
type PgEnumLike = { readonly enumName: string; readonly enumValues: readonly string[] };
function isPgEnumValue(v: unknown): v is PgEnumLike {
  if (!v) return false;
  if (typeof v !== "function" && typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.enumName === "string" && Array.isArray(obj.enumValues);
}

export async function verifySchema(): Promise<Drift[]> {
  const drifts: Drift[] = [];

  // ── Pass 1: tables + columns ────────────────────────────────────────────
  // `Object.values(schema)` returns a union of every export type
  // (PgTable specializations, pgEnum results, helper functions). TS
  // can't narrow that union to a single PgTable shape via the runtime
  // `is(v, PgTable)` check — Drizzle's type machinery is too rich for
  // a single user-defined type predicate to satisfy. Cast through
  // `unknown` and let the runtime check (which IS reliable) gate the
  // narrowing. Same pattern below for enums.
  const drizzleTables = (Object.values(schema) as unknown[]).filter(
    (v): v is PgTable => is(v, PgTable),
  );

  // One round-trip for all DB tables so we don't N+1 a small set.
  const dbTablesRes = await db.execute(sql`
    SELECT table_name
      FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'
  `);
  const dbTables = new Set(
    (dbTablesRes.rows as Array<{ table_name: string }>).map(r => String(r.table_name)),
  );

  for (const table of drizzleTables) {
    const config = getTableConfig(table);
    const tableName = config.name;

    if (!dbTables.has(tableName)) {
      drifts.push({
        severity: "error",
        kind: "missing_table",
        table: tableName,
        message: `Drizzle declares table '${tableName}' but DB does not have it`,
      });
      // Skip per-column check when the table itself is missing.
      continue;
    }

    // Per-column check. Pull all columns for this table in one query
    // so we don't N+1 inside the table loop.
    const dbColsRes = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = ${tableName}
    `);
    const dbCols = new Map<string, { type: string; nullable: boolean }>();
    for (const r of dbColsRes.rows as Array<{ column_name: string; data_type: string; is_nullable: string }>) {
      dbCols.set(String(r.column_name), {
        type: String(r.data_type),
        nullable: String(r.is_nullable).toUpperCase() === "YES",
      });
    }

    for (const col of config.columns) {
      const colName = col.name;
      const dbCol = dbCols.get(colName);
      if (!dbCol) {
        drifts.push({
          severity: "error",
          kind: "missing_column",
          table: tableName,
          column: colName,
          message: `Drizzle declares column '${tableName}.${colName}' but DB does not have it`,
        });
        continue;
      }

      // Nullability check. Both directions are dangerous:
      //   Drizzle NOT NULL + DB NULL → reads can return null where
      //     the type system says "non-null", causing runtime crashes
      //     on `.field.foo` access.
      //   Drizzle NULL + DB NOT NULL → INSERTs that omit the field
      //     will succeed in TypeScript but crash at the DB.
      // We log as 'warn' — boot-breaking is rare; runtime impact is
      // recoverable once spotted.
      const drizzleNullable = !col.notNull;
      if (drizzleNullable !== dbCol.nullable) {
        drifts.push({
          severity: "warn",
          kind: "nullability_mismatch",
          table: tableName,
          column: colName,
          message:
            `Column '${tableName}.${colName}' nullability differs — ` +
            `Drizzle=${drizzleNullable ? "NULL" : "NOT NULL"}, ` +
            `DB=${dbCol.nullable ? "NULL" : "NOT NULL"}`,
        });
      }
    }
  }

  // ── Pass 2: enums + enum values ────────────────────────────────────────
  const drizzleEnums = (Object.values(schema) as unknown[]).filter(isPgEnumValue);

  const dbEnumsRes = await db.execute(sql`
    SELECT t.typname AS enum_name,
           array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public'
     GROUP BY t.typname
  `);
  const dbEnums = new Map<string, Set<string>>();
  for (const r of dbEnumsRes.rows as Array<{ enum_name: string; values: string[] }>) {
    dbEnums.set(String(r.enum_name), new Set(r.values.map(String)));
  }

  for (const e of drizzleEnums) {
    const enumName = String(e.enumName);
    const dbValues = dbEnums.get(enumName);
    if (!dbValues) {
      drifts.push({
        severity: "error",
        kind: "missing_enum",
        enum: enumName,
        message: `Drizzle declares enum '${enumName}' but DB does not have it`,
      });
      continue;
    }
    for (const v of e.enumValues) {
      const literal = String(v);
      if (!dbValues.has(literal)) {
        drifts.push({
          severity: "error",
          kind: "missing_enum_value",
          enum: enumName,
          message:
            `Drizzle declares enum value '${enumName}.${literal}' but DB does not have it`,
        });
      }
    }
  }

  return drifts;
}

// Format helper for both standalone CLI + index.ts boot logging.
export function formatDrifts(drifts: Drift[]): string[] {
  return drifts.map(d => `[${d.severity}] ${d.kind}: ${d.message}`);
}

// Standalone CLI: `tsx scripts/verify-schema.ts`. Exit 0 on no error-
// severity drift, 1 otherwise. Warn-severity does not affect exit code.
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  (async () => {
    try {
      const drifts = await verifySchema();
      if (drifts.length === 0) {
        console.log("[verify-schema] no drift detected");
        process.exit(0);
      }
      for (const line of formatDrifts(drifts)) console.log(line);
      const hasErrors = drifts.some(d => d.severity === "error");
      console.log(
        `[verify-schema] ${drifts.length} drift(s) detected — ` +
        `${drifts.filter(d => d.severity === "error").length} error, ` +
        `${drifts.filter(d => d.severity === "warn").length} warn`,
      );
      process.exit(hasErrors ? 1 : 0);
    } catch (err: any) {
      console.error("[verify-schema] verification crashed:", err?.message ?? err);
      process.exit(2);
    }
  })();
}
