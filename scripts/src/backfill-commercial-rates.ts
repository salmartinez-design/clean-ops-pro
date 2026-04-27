// [AH] Backfill commercial_hourly_rate for clients with client_type='commercial'.
//
// Strategy (per AH spec, step 6):
//   For each commercial client where commercial_hourly_rate IS NULL:
//     1. Pull the most recent 3 completed jobs (status='complete')
//     2. Compute base_fee / allowed_hours per job, ignoring rows where
//        either is null/zero/missing
//     3. If we have ≥3 valid rates AND all agree within $1 tolerance →
//        flag as auto-derivable (avg of the 3)
//     4. If rates diverge → flag as ambiguous
//     5. If <3 valid jobs → flag as insufficient history
//
// Default mode: DRY-RUN. Prints JSON report only.
// Apply mode: pass `--apply` to actually UPDATE the auto-derivable rows.
// Ambiguous and insufficient lists are NEVER auto-written, regardless of flag.
//
// Usage:
//   pnpm --filter @workspace/scripts exec tsx ./src/backfill-commercial-rates.ts
//   pnpm --filter @workspace/scripts exec tsx ./src/backfill-commercial-rates.ts --apply
//   COMPANY_ID=1 pnpm --filter @workspace/scripts exec tsx ./src/backfill-commercial-rates.ts
//
// Exit code 0 always; the report is the output.
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const APPLY = process.argv.includes("--apply");
const COMPANY_ID = process.env.COMPANY_ID ? parseInt(process.env.COMPANY_ID) : 1; // PHES default
const TOLERANCE = 1.0; // $1

interface JobRow {
  id: number;
  base_fee: string | null;
  allowed_hours: string | null;
  scheduled_date: string;
}

interface ClientRow {
  id: number;
  first_name: string;
  last_name: string;
  client_type: string;
  commercial_hourly_rate: string | null;
}

interface ReportEntry {
  client_id: number;
  display_name: string;
  rates: number[];
  job_dates: string[];
}

async function main() {
  console.log(`[backfill-commercial-rates] mode=${APPLY ? "APPLY" : "DRY-RUN"} company_id=${COMPANY_ID}`);

  const clientsRes = await db.execute(sql`
    SELECT id, first_name, last_name, client_type, commercial_hourly_rate
    FROM clients
    WHERE company_id = ${COMPANY_ID}
      AND client_type = 'commercial'
      AND commercial_hourly_rate IS NULL
    ORDER BY id
  `);
  const clients = clientsRes.rows as unknown as ClientRow[];
  console.log(`[backfill-commercial-rates] found ${clients.length} commercial clients without a rate`);

  const autoDerivable: ReportEntry[] = [];
  const ambiguous: ReportEntry[] = [];
  const insufficient: ReportEntry[] = [];

  for (const c of clients) {
    const jobsRes = await db.execute(sql`
      SELECT id, base_fee, allowed_hours, scheduled_date::text AS scheduled_date
      FROM jobs
      WHERE company_id = ${COMPANY_ID}
        AND client_id = ${c.id}
        AND status = 'complete'
        AND base_fee IS NOT NULL
        AND allowed_hours IS NOT NULL
        AND CAST(base_fee AS NUMERIC) > 0
        AND CAST(allowed_hours AS NUMERIC) > 0
      ORDER BY scheduled_date DESC
      LIMIT 3
    `);
    const jobs = jobsRes.rows as unknown as JobRow[];

    const rates = jobs.map(j => {
      const fee = parseFloat(String(j.base_fee ?? "0"));
      const hrs = parseFloat(String(j.allowed_hours ?? "0"));
      return hrs > 0 ? Math.round((fee / hrs) * 100) / 100 : 0;
    }).filter(r => r > 0);

    const display = `${c.first_name} ${c.last_name}`.trim() || `client #${c.id}`;
    const dates = jobs.map(j => j.scheduled_date);
    const entry: ReportEntry = { client_id: c.id, display_name: display, rates, job_dates: dates };

    if (rates.length < 3) {
      insufficient.push(entry);
      continue;
    }
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    if (max - min <= TOLERANCE) {
      autoDerivable.push(entry);
    } else {
      ambiguous.push(entry);
    }
  }

  // Apply unambiguous rates if requested.
  let written = 0;
  if (APPLY && autoDerivable.length > 0) {
    for (const entry of autoDerivable) {
      const avg = entry.rates.reduce((a, b) => a + b, 0) / entry.rates.length;
      const rounded = Math.round(avg * 100) / 100;
      await db.execute(sql`
        UPDATE clients
        SET commercial_hourly_rate = ${String(rounded)}
        WHERE id = ${entry.client_id} AND company_id = ${COMPANY_ID}
      `);
      written++;
    }
  }

  // Report
  const summary = {
    mode: APPLY ? "APPLY" : "DRY-RUN",
    company_id: COMPANY_ID,
    tolerance_usd: TOLERANCE,
    counts: {
      auto_derivable: autoDerivable.length,
      ambiguous: ambiguous.length,
      insufficient: insufficient.length,
      total_examined: clients.length,
    },
    written: APPLY ? written : 0,
    auto_derivable: autoDerivable.map(e => ({
      client_id: e.client_id,
      display_name: e.display_name,
      derived_rate: Math.round((e.rates.reduce((a, b) => a + b, 0) / e.rates.length) * 100) / 100,
      rates: e.rates,
      job_dates: e.job_dates,
    })),
    ambiguous: ambiguous.map(e => ({
      client_id: e.client_id,
      display_name: e.display_name,
      rates: e.rates,
      spread: Math.round((Math.max(...e.rates) - Math.min(...e.rates)) * 100) / 100,
      job_dates: e.job_dates,
    })),
    insufficient: insufficient.map(e => ({
      client_id: e.client_id,
      display_name: e.display_name,
      completed_jobs_with_rate: e.rates.length,
    })),
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!APPLY) {
    console.log("\n[backfill-commercial-rates] DRY-RUN complete. Re-run with --apply to write the auto_derivable list.");
  } else {
    console.log(`\n[backfill-commercial-rates] APPLY complete. Wrote ${written} rates. ${ambiguous.length} ambiguous + ${insufficient.length} insufficient remain — these need manual review via the client profile.`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("[backfill-commercial-rates] fatal:", err);
  process.exit(1);
});
