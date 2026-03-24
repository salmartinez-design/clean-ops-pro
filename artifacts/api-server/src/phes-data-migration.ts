/**
 * PHES Data Migration
 * Idempotent — safe to run on every server startup.
 *
 * Sections:
 *   1. Client activations + typo fixes (2026-03-24 audit)
 *   2. Missing client inserts (MC PDF reconciliation)
 *   3. PHES pricing scope seeding (7 scopes)
 *   4. PHES rate modification / addon seeding (MC data)
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const PHES = 1; // company_id

export async function runPhesDataMigration(): Promise<void> {
  try {
    // ── 1. Activate + set cadence for 4 inactive clients ───────────────────
    await db.execute(sql`
      UPDATE clients
         SET is_active = true, frequency = 'monthly', base_fee = 251.89
       WHERE id = 222 AND company_id = ${PHES}
    `);
    await db.execute(sql`
      UPDATE clients
         SET is_active = true, frequency = 'bi-weekly', base_fee = 195.00
       WHERE id = 206 AND company_id = ${PHES}
    `);
    await db.execute(sql`
      UPDATE clients
         SET is_active = true, frequency = 'monthly', base_fee = 185.00
       WHERE id = 248 AND company_id = ${PHES}
    `);
    await db.execute(sql`
      UPDATE clients
         SET is_active = true, frequency = 'bi-weekly', base_fee = 165.00
       WHERE id = 239 AND company_id = ${PHES}
    `);

    // ── 2. Fix typo: Cianan → Ciana Lesley ─────────────────────────────────
    await db.execute(sql`
      UPDATE clients SET first_name = 'Ciana'
       WHERE company_id = ${PHES}
         AND LOWER(TRIM(first_name)) = 'cianan'
         AND LOWER(TRIM(last_name)) = 'lesley'
    `);

    // ── 3. Insert 25 missing clients from MC PDF ───────────────────────────
    const missingClients: Array<[string, string, string, number, string]> = [
      ["Cucci Property Management - 10410 Moody Avenue", "", "bi-weekly", 0,  "commercial"],
      ["Cucci Realty Palos Hills",                       "", "bi-weekly", 0,  "commercial"],
      ["Cucci Realty 11901-05 South Lawndale",           "", "bi-weekly", 0,  "commercial"],
      ["Cucci Realty 10418 S Keating",                   "", "bi-weekly", 0,  "commercial"],
      ["Cucci Realty Chicago Ridge",                     "", "bi-weekly", 0,  "commercial"],
      ["KMA 4846 W North Offices",                       "", "weekly",    0,  "commercial"],
      ["KMA Eggleston",                                  "", "weekly",    0,  "commercial"],
      ["KMA Ashland",                                    "", "weekly",    0,  "commercial"],
      ["KMA Lamon",                                      "", "weekly",    0,  "commercial"],
      ["KMA North Ave",                                  "", "weekly",    0,  "commercial"],
      ["KMA Tracy",                                      "", "weekly",    0,  "commercial"],
      ["KMA 63rd",                                       "", "weekly",    0,  "commercial"],
      ["Daveco 18440 Torrence Lansing",                  "", "bi-weekly", 0,  "commercial"],
      ["Daveco 18428 Torrence Lansing",                  "", "bi-weekly", 0,  "commercial"],
      ["Bill",       "Azzarello 9620 S Komensky",        "monthly",  0,  "residential"],
      ["Bill",       "Garlanger",                        "monthly",  0,  "residential"],
      ["Caravel",    "Health",                           "bi-weekly", 0, "commercial"],
      ["WR ASSET ADMIN, INC",                            "", "bi-weekly", 0, "commercial"],
      ["4128 W Cullom Condominium Assoc.",                "", "monthly",  0, "commercial"],
      ["Hickory Hills Condominium",                       "", "monthly",  0, "commercial"],
      ["Heritage Condominium",                            "", "monthly",  0, "commercial"],
      ["413 N Noble St Condominium Association",          "", "monthly",  0, "commercial"],
      ["City Light Church",                               "", "bi-weekly", 0, "commercial"],
      ["Amber",      "Swanson",                          "bi-weekly", 0, "residential"],
      ["Jordan",     "Szczepanski",                      "bi-weekly", 0, "residential"],
      ["Kristen",    "Ivy",                              "bi-weekly", 0, "residential"],
      ["Molly",      "Leonard",                          "bi-weekly", 0, "residential"],
    ];

    for (const [firstName, lastName, freq, fee, ctype] of missingClients) {
      await db.execute(sql`
        INSERT INTO clients
          (company_id, first_name, last_name, is_active,
           frequency, base_fee, client_type, created_at)
        SELECT
          ${PHES}, ${firstName}, ${lastName}, true,
          ${freq}, ${fee}, ${ctype}::client_type, NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM clients
           WHERE company_id = ${PHES}
             AND LOWER(TRIM(first_name)) = LOWER(TRIM(${firstName}))
             AND LOWER(TRIM(COALESCE(last_name, ''))) = LOWER(TRIM(${lastName}))
        )
      `);
    }

    console.log("[phes-migration] Client data migration complete.");

    // ── 4. Ensure PHES pricing scopes exist ────────────────────────────────
    const scopeDefs = [
      { name: "Deep Clean or Move In/Out",  method: "sqft",   rate: "70.00", min: "210.00" },
      { name: "One-Time Standard Clean",    method: "sqft",   rate: "60.00", min: "150.00" },
      { name: "Recurring Cleaning",         method: "sqft",   rate: "55.00", min: "120.00" },
      { name: "Hourly Deep Clean",          method: "hourly", rate: "70.00", min: "210.00" },
      { name: "Hourly Standard Cleaning",   method: "hourly", rate: "60.00", min: "150.00" },
      { name: "Commercial Cleaning",        method: "hourly", rate: "65.00", min: "200.00" },
      { name: "PPM Turnover",              method: "sqft",   rate: "65.00", min: "250.00" },
    ];

    for (const s of scopeDefs) {
      await db.execute(sql`
        INSERT INTO pricing_scopes
          (company_id, name, pricing_method, hourly_rate, minimum_bill,
           displayed_for_office, is_active, sort_order)
        SELECT ${PHES}, ${s.name}, ${s.method}, ${s.rate}, ${s.min}, true, true,
               (SELECT COALESCE(MAX(sort_order),0)+1 FROM pricing_scopes WHERE company_id=${PHES})
        WHERE NOT EXISTS (
          SELECT 1 FROM pricing_scopes WHERE company_id=${PHES} AND name=${s.name}
        )
      `);
    }

    // Build scope name → id map
    const scopeResult = await db.execute(sql`
      SELECT id, name FROM pricing_scopes WHERE company_id = ${PHES}
    `);
    const scopeMap: Record<string, number> = {};
    for (const row of (scopeResult as any).rows ?? []) {
      scopeMap[row.name] = parseInt(row.id);
    }

    console.log("[phes-migration] Pricing scopes ensured:", Object.keys(scopeMap).length, "scopes");

    // ── 4b. Seed default frequencies for each scope (idempotent) ───────────
    type FreqDef = { freq: string; mult: string; override?: string; showOffice: boolean; showOnline: boolean };
    const sqftFreqs: FreqDef[] = [
      { freq: "onetime",  mult: "1.00", showOffice: true,  showOnline: true  },
      { freq: "weekly",   mult: "0.80", showOffice: true,  showOnline: true  },
      { freq: "biweekly", mult: "0.90", showOffice: true,  showOnline: true  },
      { freq: "monthly",  mult: "1.00", showOffice: true,  showOnline: true  },
    ];
    const hourlyFreqs: FreqDef[] = [
      { freq: "onetime",  mult: "1.00", showOffice: true, showOnline: true },
    ];
    // Deep Clean existing frequencies take priority — only fill gaps
    const existingFreqResult = await db.execute(sql`
      SELECT scope_id, frequency FROM pricing_frequencies WHERE company_id = ${PHES}
    `);
    const existingFreqSet = new Set<string>(
      ((existingFreqResult as any).rows ?? []).map((r: any) => `${r.scope_id}:${r.frequency}`)
    );

    for (const [name, method] of Object.entries({ ...Object.fromEntries(scopeDefs.map(s => [s.name, s.method])) })) {
      const sid = scopeMap[name];
      if (!sid) continue;
      const freqList = method === "sqft" ? sqftFreqs : hourlyFreqs;
      for (const f of freqList) {
        if (existingFreqSet.has(`${sid}:${f.freq}`)) continue;
        await db.execute(sql`
          INSERT INTO pricing_frequencies
            (company_id, scope_id, frequency, multiplier, rate_override, label, show_office, sort_order)
          VALUES
            (${PHES}, ${sid}, ${f.freq}, ${f.mult}, ${f.override ?? null}, '',
             ${f.showOffice},
             (SELECT COALESCE(MAX(sort_order),0)+1 FROM pricing_frequencies WHERE scope_id=${sid}))
          ON CONFLICT DO NOTHING
        `);
      }
    }
    // Also seed for pre-existing "Standard Clean" (scope 2)
    const stdCleanId = scopeMap["Standard Clean"];
    if (stdCleanId) {
      for (const f of sqftFreqs) {
        if (existingFreqSet.has(`${stdCleanId}:${f.freq}`)) continue;
        await db.execute(sql`
          INSERT INTO pricing_frequencies
            (company_id, scope_id, frequency, multiplier, rate_override, label, show_office, sort_order)
          VALUES
            (${PHES}, ${stdCleanId}, ${f.freq}, ${f.mult}, ${f.override ?? null}, '',
             ${f.showOffice},
             (SELECT COALESCE(MAX(sort_order),0)+1 FROM pricing_frequencies WHERE scope_id=${stdCleanId}))
          ON CONFLICT DO NOTHING
        `);
      }
    }
    console.log("[phes-migration] Frequencies ensured for all scopes");

    // ── 5. Seed MC rate modifications / add-ons ────────────────────────────
    // Only run if no addons with scope_ids have been seeded yet
    const addonCheckResult = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM pricing_addons
       WHERE company_id = ${PHES} AND scope_ids != '[]' AND scope_ids != ''
    `);
    const addonCount = parseInt(((addonCheckResult as any).rows ?? [{}])[0]?.cnt ?? "0");

    if (addonCount === 0) {
      // Clear any stale legacy addon records (pre-scope_ids era)
      await db.execute(sql`DELETE FROM pricing_addons WHERE company_id = ${PHES}`);

      const D  = scopeMap["Deep Clean or Move In/Out"];
      const S  = scopeMap["One-Time Standard Clean"];
      const R  = scopeMap["Recurring Cleaning"];
      const HD = scopeMap["Hourly Deep Clean"];
      const HS = scopeMap["Hourly Standard Cleaning"];
      const C  = scopeMap["Commercial Cleaning"];
      const P  = scopeMap["PPM Turnover"];

      type AddonSeed = {
        name: string;
        addon_type: string;
        scope_ids: number[];
        price_type: string;
        price_value: number;
        time_minutes: number;
        time_unit: string;
        is_itemized: boolean;
        show_office: boolean;
        show_online: boolean;
        show_portal: boolean;
        sort_order: number;
      };

      const addons: AddonSeed[] = [
        // ── CLEANING EXTRAS ──────────────────────────────────────────────
        {
          name: "Oven Cleaning",
          addon_type: "cleaning_extras",
          scope_ids: [D, S, R].filter(Boolean),
          price_type: "flat", price_value: 50,
          time_minutes: 45, time_unit: "each",
          is_itemized: true, show_office: true, show_online: true, show_portal: true, sort_order: 10,
        },
        {
          name: "Oven Cleaning (Hourly — Time Add)",
          addon_type: "cleaning_extras",
          scope_ids: [HD, HS].filter(Boolean),
          price_type: "time_only", price_value: 0,
          time_minutes: 45, time_unit: "each",
          is_itemized: false, show_office: true, show_online: true, show_portal: true, sort_order: 11,
        },
        {
          name: "Refrigerator Cleaning",
          addon_type: "cleaning_extras",
          scope_ids: [D, S, R].filter(Boolean),
          price_type: "flat", price_value: 50,
          time_minutes: 45, time_unit: "each",
          is_itemized: true, show_office: true, show_online: true, show_portal: true, sort_order: 20,
        },
        {
          name: "Refrigerator Cleaning (Hourly — Time Add)",
          addon_type: "cleaning_extras",
          scope_ids: [HD, HS].filter(Boolean),
          price_type: "time_only", price_value: 0,
          time_minutes: 45, time_unit: "each",
          is_itemized: false, show_office: true, show_online: true, show_portal: true, sort_order: 21,
        },
        {
          name: "Kitchen Cabinets (must be empty upon arrival)",
          addon_type: "cleaning_extras",
          scope_ids: [D, S].filter(Boolean),
          price_type: "flat", price_value: 50,
          time_minutes: 45, time_unit: "each",
          is_itemized: true, show_office: true, show_online: true, show_portal: true, sort_order: 30,
        },
        {
          name: "Kitchen Cabinets — Hourly (Time Add)",
          addon_type: "cleaning_extras",
          scope_ids: [HD, HS].filter(Boolean),
          price_type: "time_only", price_value: 0,
          time_minutes: 45, time_unit: "each",
          is_itemized: false, show_office: true, show_online: true, show_portal: true, sort_order: 31,
        },
        {
          name: "Baseboards",
          addon_type: "cleaning_extras",
          scope_ids: [S].filter(Boolean),
          price_type: "flat", price_value: 50,
          time_minutes: 45, time_unit: "each",
          is_itemized: true, show_office: true, show_online: true, show_portal: true, sort_order: 40,
        },
        {
          name: "Baseboards — Deep Clean (Sq Ft %)",
          addon_type: "cleaning_extras",
          scope_ids: [HD].filter(Boolean),
          price_type: "sqft_pct", price_value: 12,
          time_minutes: 45, time_unit: "sqft",
          is_itemized: true, show_office: true, show_online: true, show_portal: true, sort_order: 41,
        },
        // Windows — 3 variants
        {
          name: "Windows (inside panes) — Deep Clean",
          addon_type: "cleaning_extras",
          scope_ids: [D].filter(Boolean),
          price_type: "sqft_pct", price_value: 15,
          time_minutes: 45, time_unit: "sqft",
          is_itemized: true, show_office: true, show_online: true, show_portal: true, sort_order: 50,
        },
        {
          name: "Windows (inside panes) — Standard / Recurring",
          addon_type: "cleaning_extras",
          scope_ids: [S, R].filter(Boolean),
          price_type: "percentage", price_value: 12,
          time_minutes: 45, time_unit: "each",
          is_itemized: true, show_office: true, show_online: true, show_portal: true, sort_order: 51,
        },
        {
          name: "Windows (inside panes) — Hourly (Time Add)",
          addon_type: "cleaning_extras",
          scope_ids: [HD, HS].filter(Boolean),
          price_type: "time_only", price_value: 0,
          time_minutes: 45, time_unit: "each",
          is_itemized: false, show_office: true, show_online: true, show_portal: true, sort_order: 52,
        },
        // Clean Basement — 3 variants
        {
          name: "Clean Basement — Deep / Standard",
          addon_type: "cleaning_extras",
          scope_ids: [D, S].filter(Boolean),
          price_type: "sqft_pct", price_value: 15,
          time_minutes: 45, time_unit: "sqft",
          is_itemized: true, show_office: true, show_online: true, show_portal: true, sort_order: 60,
        },
        {
          name: "Clean Basement — Recurring",
          addon_type: "cleaning_extras",
          scope_ids: [R].filter(Boolean),
          price_type: "sqft_pct", price_value: 12,
          time_minutes: 45, time_unit: "sqft",
          is_itemized: true, show_office: true, show_online: true, show_portal: true, sort_order: 61,
        },
        {
          name: "Clean Basement — Hourly (Time Add)",
          addon_type: "cleaning_extras",
          scope_ids: [HD, HS].filter(Boolean),
          price_type: "time_only", price_value: 0,
          time_minutes: 0, time_unit: "each",
          is_itemized: false, show_office: true, show_online: true, show_portal: true, sort_order: 62,
        },
        // Parking Fee — all scopes
        {
          name: "Parking Fee",
          addon_type: "cleaning_extras",
          scope_ids: [D, S, R, HD, HS, C, P].filter(Boolean),
          price_type: "flat", price_value: 20,
          time_minutes: 0, time_unit: "each",
          is_itemized: true, show_office: true, show_online: true, show_portal: true, sort_order: 70,
        },
        // Manual Adjustment (replaces MC $1 increment hack)
        {
          name: "Manual Adjustment",
          addon_type: "cleaning_extras",
          scope_ids: [D, S, R].filter(Boolean),
          price_type: "manual_adj", price_value: 0,
          time_minutes: 0, time_unit: "each",
          is_itemized: true, show_office: true, show_online: false, show_portal: false, sort_order: 99,
        },
        // ── DISCOUNTS ────────────────────────────────────────────────────
        {
          name: "Loyalty Discount — $100",
          addon_type: "other",
          scope_ids: [D, S, R, HS, P].filter(Boolean),
          price_type: "flat", price_value: -100,
          time_minutes: 0, time_unit: "each",
          is_itemized: true, show_office: true, show_online: true, show_portal: true, sort_order: 110,
        },
        {
          name: "Loyalty Discount — $50",
          addon_type: "other",
          scope_ids: [D, S, R, HD, HS, P].filter(Boolean),
          price_type: "flat", price_value: -50,
          time_minutes: 0, time_unit: "each",
          is_itemized: true, show_office: true, show_online: true, show_portal: true, sort_order: 111,
        },
        {
          name: "Loyalty Discount — 20% Off",
          addon_type: "other",
          scope_ids: [HD].filter(Boolean),
          price_type: "percentage", price_value: -20,
          time_minutes: 0, time_unit: "each",
          is_itemized: true, show_office: true, show_online: true, show_portal: true, sort_order: 112,
        },
        {
          name: "Promo Discount — 10% Off",
          addon_type: "other",
          scope_ids: [S, R, HD, HS, P].filter(Boolean),
          price_type: "percentage", price_value: -10,
          time_minutes: 0, time_unit: "each",
          is_itemized: true, show_office: true, show_online: true, show_portal: true, sort_order: 120,
        },
        {
          name: "Promo Discount — 15% Off",
          addon_type: "other",
          scope_ids: [S, HD].filter(Boolean),
          price_type: "percentage", price_value: -15,
          time_minutes: 0, time_unit: "each",
          is_itemized: true, show_office: true, show_online: true, show_portal: true, sort_order: 121,
        },
        {
          name: "Second Appointment Discount — 15% Off",
          addon_type: "other",
          scope_ids: [S, HD].filter(Boolean),
          price_type: "percentage", price_value: -15,
          time_minutes: 0, time_unit: "each",
          is_itemized: true, show_office: true, show_online: true, show_portal: true, sort_order: 130,
        },
        {
          name: "Second Appointment — +15% (markup)",
          addon_type: "other",
          scope_ids: [HS].filter(Boolean),
          price_type: "percentage", price_value: 15,
          time_minutes: 0, time_unit: "each",
          is_itemized: true, show_office: true, show_online: true, show_portal: true, sort_order: 131,
        },
        // Commercial Adjustment
        {
          name: "Commercial Adjustment",
          addon_type: "other",
          scope_ids: [C].filter(Boolean),
          price_type: "percentage", price_value: -100,
          time_minutes: 0, time_unit: "each",
          is_itemized: true, show_office: true, show_online: true, show_portal: true, sort_order: 140,
        },
      ];

      let order = 0;
      for (const a of addons) {
        const scopeIdsJson = JSON.stringify(a.scope_ids);
        const firstScopeId = a.scope_ids[0] ?? null;
        await db.execute(sql`
          INSERT INTO pricing_addons
            (company_id, scope_id, name, addon_type, scope_ids,
             price_type, price_value, time_add_minutes, time_unit,
             is_itemized, show_office, show_online, show_portal,
             is_active, sort_order)
          VALUES
            (${PHES}, ${firstScopeId}, ${a.name}, ${a.addon_type}, ${scopeIdsJson},
             ${a.price_type}, ${a.price_value}, ${a.time_minutes}, ${a.time_unit},
             ${a.is_itemized}, ${a.show_office}, ${a.show_online}, ${a.show_portal},
             true, ${a.sort_order + order})
        `);
        order++;
      }
      console.log("[phes-migration] Rate modifications seeded:", addons.length, "add-ons");

      // Ensure "Standard Clean" (pre-existing scope) gets same addons as "One-Time Standard Clean"
      const stdClean = scopeMap["Standard Clean"];
      const otStdClean = scopeMap["One-Time Standard Clean"];
      if (stdClean && otStdClean) {
        await db.execute(sql`
          UPDATE pricing_addons
          SET scope_ids = (scope_ids::jsonb || ${JSON.stringify([stdClean])}::jsonb)::text
          WHERE company_id = ${PHES}
            AND scope_ids::jsonb @> ${JSON.stringify([otStdClean])}::jsonb
            AND NOT scope_ids::jsonb @> ${JSON.stringify([stdClean])}::jsonb
        `);
      }
    } else {
      console.log("[phes-migration] Rate modifications already seeded — skipping.");
    }

  } catch (err) {
    console.error("[phes-migration] Migration error (non-fatal):", err);
  }
}
