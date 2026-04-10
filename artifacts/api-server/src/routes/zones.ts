import { Router } from "express";
import { db } from "@workspace/db";
import {
  serviceZonesTable, serviceZoneEmployeesTable, waitlistTable,
  clientsTable, jobsTable, usersTable, companiesTable,
} from "@workspace/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

// ─── PHES company_id=1 seed zones (17 Oak Lawn zones) ───────────────────────
// Source: MaidCentral screenshot 2026-04-10 (Oak Lawn location)
// Deduplication applied — first alphabetical zone wins each conflicted zip:
//   60632 → Chicago Central (removed from Company Zone)
//   60630 → Lake View/Lincoln Square/Lincolnwood (removed from Norridge/Park Ridge/Des Plaines)
//   60706 → Maywood/Northlake/Schiller Park (removed from Norridge/Park Ridge/Des Plaines)
//   60523 → La Grange/Hodgkins/Berwyn (removed from Westmont/Lombard/Elmhurst)
//   60409 → South Suburbs (duplicate within same zone removed)
const PHES_SEED: { name: string; color: string; zip_codes: string[] }[] = [
  {
    name: "Chicago Central",
    color: "#F1D0A4",
    zip_codes: ["60632","60633","60615","60653","60608","60616","60623","60804","60638"],
  },
  {
    name: "Chicago Downtown/Loop Zone",
    color: "#4B8083",
    zip_codes: ["60605","60654","60601","60661","60606","60602","60603","60604","60699","60611","60610","60607"],
  },
  {
    name: "Chicago North Residential Zone",
    color: "#CCF518",
    zip_codes: ["60622","60642","60614","60647","60651","60639","60641","60634"],
  },
  {
    name: "Chicago South",
    color: "#D34DCB",
    zip_codes: ["60628","60617","60619","60649","60620","60637"],
  },
  {
    name: "Chicago West Side",
    color: "#FF7F50",
    zip_codes: ["60624","60644","60512"],
  },
  {
    name: "Company Zone",
    color: "#F7DAE9",
    zip_codes: ["60453","60803","60655","60415","60456","60465","60482","60643","60805","60459","60455","60454"],
  },
  {
    name: "Homer Glen/Lemont/Burr Ridge",
    color: "#00C5CD",
    zip_codes: [],
  },
  {
    name: "Homewood/Harvey/Markham",
    color: "#8C0000",
    zip_codes: [],
  },
  {
    name: "La Grange/Hodgkins/Berwyn",
    color: "#00D0FF",
    zip_codes: ["60534","60402","60304","60513","60546","60130","60141","60155","60526","60154","60523","60558","60501"],
  },
  {
    name: "Lake View/Lincoln Square/Lincolnwood",
    color: "#A97A00",
    zip_codes: ["60625","60646","60630","60659","60640","60660","60626","60645","60712","60618","60613","60657","60076"],
  },
  {
    name: "Maywood/Northlake/Schiller Park",
    color: "#7F6669",
    zip_codes: ["60176","60131","60164","60163","60162","60706","60171","60165","60153","60305","60707","60302","60301"],
  },
  {
    name: "Naperville/Woodridge/Lisle",
    color: "#F1B9F7",
    zip_codes: ["60540","60532","60517","60565","60516","60561"],
  },
  {
    name: "Norridge/Park Ridge/Des Plaines",
    color: "#4FF30A",
    zip_codes: ["60068","60018","60666","60656","60053"],
  },
  {
    name: "South Suburbs",
    color: "#FF7200",
    zip_codes: ["60409","60633","60472","60827","46311","60411","60430","60429","60422","60428","60476","60426","60469","60473"],
  },
  {
    name: "Southwest Suburbs",
    color: "#17C9D3",
    zip_codes: ["60441","60446","60440","60490","60439","60527","60480","60491","60458","60451","60423"],
  },
  {
    name: "Tinley/Orlando/Palos Park",
    color: "#F7D7D0",
    zip_codes: ["60464","60463","60445","60452","60477","60467","60462","60487","60466"],
  },
  {
    name: "Westmont/Lombard/Elmhurst",
    color: "#00B8FF",
    zip_codes: ["60559","60514","60521","60515","60148","60126","60181"],
  },
];

async function autoSeedPhes(companyId: number) {
  const existing = await db
    .select({ id: serviceZonesTable.id })
    .from(serviceZonesTable)
    .where(eq(serviceZonesTable.company_id, companyId));
  if (existing.length > 0) return;

  for (let i = 0; i < PHES_SEED.length; i++) {
    const s = PHES_SEED[i];
    await db.insert(serviceZonesTable).values({
      company_id: companyId,
      name: s.name,
      color: s.color,
      zip_codes: s.zip_codes,
      sort_order: i,
    });
  }
}

// ─── Helper: resolve zone_id from zip code ───────────────────────────────────
export async function resolveZoneForZip(companyId: number, zip: string | null | undefined): Promise<number | null> {
  if (!zip) return null;
  const clean = zip.trim().replace(/\D/g, "").slice(0, 5);
  if (clean.length < 5) return null;

  const zones = await db
    .select({ id: serviceZonesTable.id, zip_codes: serviceZonesTable.zip_codes })
    .from(serviceZonesTable)
    .where(and(eq(serviceZonesTable.company_id, companyId), eq(serviceZonesTable.is_active, true)));

  for (const z of zones) {
    if (z.zip_codes && z.zip_codes.includes(clean)) return z.id;
  }
  return null;
}

// ─── GET /api/zones — list zones with stats ──────────────────────────────────
router.get("/", requireAuth, requireRole("owner", "admin", "office"), async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const { branch_id } = req.query;

    // Auto-seed PHES
    if (companyId === 1) await autoSeedPhes(companyId);

    const zoneConds: any[] = [eq(serviceZonesTable.company_id, companyId)];
    if (branch_id && branch_id !== "all") zoneConds.push(eq(serviceZonesTable.branch_id, parseInt(branch_id as string)));
    const zones = await db
      .select()
      .from(serviceZonesTable)
      .where(and(...zoneConds))
      .orderBy(serviceZonesTable.sort_order);

    if (zones.length === 0) return res.json([]);

    const zoneIds = zones.map(z => z.id);

    // Employee counts per zone
    const empCounts = await db
      .select({ zone_id: serviceZoneEmployeesTable.zone_id, count: sql<number>`count(*)::int` })
      .from(serviceZoneEmployeesTable)
      .where(inArray(serviceZoneEmployeesTable.zone_id, zoneIds))
      .groupBy(serviceZoneEmployeesTable.zone_id);

    const empMap: Record<number, number> = {};
    for (const r of empCounts) empMap[r.zone_id] = r.count;

    // Jobs this month per zone
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const nextMonthStart = now.getMonth() === 11
      ? `${now.getFullYear() + 1}-01-01`
      : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}-01`;

    const jobCounts = await db
      .select({ zone_id: jobsTable.zone_id, count: sql<number>`count(*)::int` })
      .from(jobsTable)
      .where(
        and(
          eq(jobsTable.company_id, companyId),
          inArray(jobsTable.zone_id as any, zoneIds),
          sql`${jobsTable.scheduled_date} >= ${monthStart}`,
          sql`${jobsTable.scheduled_date} < ${nextMonthStart}`,
        )
      )
      .groupBy(jobsTable.zone_id);

    const jobMap: Record<number, number> = {};
    for (const r of jobCounts) if (r.zone_id) jobMap[r.zone_id] = r.count;

    // Employee names per zone
    const empRows = await db
      .select({
        zone_id: serviceZoneEmployeesTable.zone_id,
        user_id: serviceZoneEmployeesTable.user_id,
        name: sql<string>`concat(${usersTable.first_name}, ' ', ${usersTable.last_name})`,
      })
      .from(serviceZoneEmployeesTable)
      .innerJoin(usersTable, eq(usersTable.id, serviceZoneEmployeesTable.user_id))
      .where(inArray(serviceZoneEmployeesTable.zone_id, zoneIds));

    const empNamesMap: Record<number, { id: number; name: string }[]> = {};
    for (const r of empRows) {
      if (!empNamesMap[r.zone_id]) empNamesMap[r.zone_id] = [];
      empNamesMap[r.zone_id].push({ id: r.user_id, name: r.name });
    }

    const result = zones.map(z => ({
      ...z,
      employee_count: empMap[z.id] ?? 0,
      jobs_this_month: jobMap[z.id] ?? 0,
      employees: empNamesMap[z.id] ?? [],
    }));

    return res.json(result);
  } catch (err) {
    console.error("[zones GET]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/zones/public?company_id=X — for quote form zip check ───────────
router.get("/public", async (req, res) => {
  try {
    const companyId = parseInt(req.query.company_id as string);
    if (!companyId) return res.status(400).json({ error: "company_id required" });

    const zones = await db
      .select({ id: serviceZonesTable.id, name: serviceZonesTable.name, color: serviceZonesTable.color, zip_codes: serviceZonesTable.zip_codes })
      .from(serviceZonesTable)
      .where(and(eq(serviceZonesTable.company_id, companyId), eq(serviceZonesTable.is_active, true)));

    return res.json(zones);
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── Helper: validate no zip conflicts ───────────────────────────────────────
async function validateNoZipConflicts(
  companyId: number,
  zips: string[],
  excludeZoneId?: number
): Promise<{ zip: string; existingZone: string; existingLocation: string }[]> {
  const query = excludeZoneId
    ? `SELECT id, name, location, zip_codes FROM service_zones WHERE company_id = $1 AND id != $2`
    : `SELECT id, name, location, zip_codes FROM service_zones WHERE company_id = $1`;
  const params: any[] = excludeZoneId ? [companyId, excludeZoneId] : [companyId];
  const { sql: drSql } = await import("drizzle-orm");
  const rows = await db.execute(drSql.raw(
    excludeZoneId
      ? `SELECT id, name, location, zip_codes FROM service_zones WHERE company_id = ${companyId} AND id != ${excludeZoneId}`
      : `SELECT id, name, location, zip_codes FROM service_zones WHERE company_id = ${companyId}`
  ));
  const conflicts: { zip: string; existingZone: string; existingLocation: string }[] = [];
  for (const zone of (rows as any).rows ?? []) {
    const existingZips: string[] = Array.isArray(zone.zip_codes) ? zone.zip_codes : [];
    for (const z of zips) {
      if (existingZips.includes(z)) {
        conflicts.push({ zip: z, existingZone: zone.name, existingLocation: zone.location });
      }
    }
  }
  return conflicts;
}

// ─── POST /api/zones — create ─────────────────────────────────────────────────
router.post("/", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const { name, color, zip_codes, employee_ids, sort_order, location } = req.body;

    if (!name) return res.status(400).json({ error: "name required" });
    if (location && !["oak_lawn", "schaumburg"].includes(location)) {
      return res.status(400).json({ error: "location must be oak_lawn or schaumburg" });
    }

    const zips = Array.isArray(zip_codes) ? zip_codes : [];
    if (zips.length > 0) {
      const conflicts = await validateNoZipConflicts(companyId, zips);
      if (conflicts.length > 0) {
        return res.status(400).json({ error: "zip_conflict", conflicts });
      }
    }

    const [zone] = await db.insert(serviceZonesTable).values({
      company_id: companyId,
      name,
      color: color ?? "#5B9BD5",
      zip_codes: zips,
      sort_order: sort_order ?? 0,
      location: location ?? "oak_lawn",
    }).returning();

    // Assign employees
    if (Array.isArray(employee_ids) && employee_ids.length > 0) {
      await db.insert(serviceZoneEmployeesTable).values(
        employee_ids.map((uid: number) => ({ zone_id: zone.id, user_id: uid, company_id: companyId }))
      );
    }

    return res.status(201).json(zone);
  } catch (err) {
    console.error("[zones POST]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── PATCH /api/zones/:id — update ───────────────────────────────────────────
router.patch("/:id", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const id = parseInt(req.params.id);
    const { name, color, zip_codes, employee_ids, is_active, sort_order, location } = req.body;

    const existing = await db.select().from(serviceZonesTable).where(
      and(eq(serviceZonesTable.id, id), eq(serviceZonesTable.company_id, companyId))
    );
    if (!existing.length) return res.status(404).json({ error: "Not found" });

    if (location && !["oak_lawn", "schaumburg"].includes(location)) {
      return res.status(400).json({ error: "location must be oak_lawn or schaumburg" });
    }

    if (zip_codes !== undefined && Array.isArray(zip_codes) && zip_codes.length > 0) {
      const conflicts = await validateNoZipConflicts(companyId, zip_codes, id);
      if (conflicts.length > 0) {
        return res.status(400).json({ error: "zip_conflict", conflicts });
      }
    }

    const patch: Record<string, any> = {};
    if (name !== undefined) patch.name = name;
    if (color !== undefined) patch.color = color;
    if (zip_codes !== undefined) patch.zip_codes = zip_codes;
    if (is_active !== undefined) patch.is_active = is_active;
    if (sort_order !== undefined) patch.sort_order = sort_order;
    if (location !== undefined) patch.location = location;

    if (Object.keys(patch).length > 0) {
      await db.update(serviceZonesTable).set(patch).where(
        and(eq(serviceZonesTable.id, id), eq(serviceZonesTable.company_id, companyId))
      );
    }

    // Re-sync employees if provided
    if (Array.isArray(employee_ids)) {
      await db.delete(serviceZoneEmployeesTable).where(eq(serviceZoneEmployeesTable.zone_id, id));
      if (employee_ids.length > 0) {
        await db.insert(serviceZoneEmployeesTable).values(
          employee_ids.map((uid: number) => ({ zone_id: id, user_id: uid, company_id: companyId }))
        );
      }
    }

    const [updated] = await db.select().from(serviceZonesTable).where(eq(serviceZonesTable.id, id));
    return res.json(updated);
  } catch (err) {
    console.error("[zones PATCH]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── DELETE /api/zones/:id ────────────────────────────────────────────────────
router.delete("/:id", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const id = parseInt(req.params.id);

    const existing = await db.select().from(serviceZonesTable).where(
      and(eq(serviceZonesTable.id, id), eq(serviceZonesTable.company_id, companyId))
    );
    if (!existing.length) return res.status(404).json({ error: "Not found" });

    await db.delete(serviceZoneEmployeesTable).where(eq(serviceZoneEmployeesTable.zone_id, id));
    await db.delete(serviceZonesTable).where(eq(serviceZonesTable.id, id));

    return res.json({ success: true });
  } catch (err) {
    console.error("[zones DELETE]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/zones/:id/zips — add a zip to zone ────────────────────────────
router.post("/:id/zips", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const id = parseInt(req.params.id);
    const { zip } = req.body;
    if (!zip) return res.status(400).json({ error: "zip required" });
    const clean = zip.trim().replace(/\D/g, "").slice(0, 5);
    if (clean.length !== 5) return res.status(400).json({ error: "zip must be 5 digits" });

    const existing = await db.select().from(serviceZonesTable).where(
      and(eq(serviceZonesTable.id, id), eq(serviceZonesTable.company_id, companyId))
    );
    if (!existing.length) return res.status(404).json({ error: "Not found" });

    const conflicts = await validateNoZipConflicts(companyId, [clean], id);
    if (conflicts.length > 0) {
      return res.status(400).json({ error: "zip_conflict", conflicts });
    }

    const current = existing[0].zip_codes ?? [];
    if (current.includes(clean)) return res.status(400).json({ error: "zip already in zone" });

    const { sql: drSql } = await import("drizzle-orm");
    await db.execute(drSql`UPDATE service_zones SET zip_codes = array_append(zip_codes, ${clean}) WHERE id = ${id}`);
    const [updated] = await db.select().from(serviceZonesTable).where(eq(serviceZonesTable.id, id));
    return res.json(updated);
  } catch (err) {
    console.error("[zones/:id/zips POST]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── DELETE /api/zones/:id/zips/:zip — remove a zip from zone ────────────────
router.delete("/:id/zips/:zip", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const id = parseInt(req.params.id);
    const zip = req.params.zip;

    const existing = await db.select().from(serviceZonesTable).where(
      and(eq(serviceZonesTable.id, id), eq(serviceZonesTable.company_id, companyId))
    );
    if (!existing.length) return res.status(404).json({ error: "Not found" });

    const { sql: drSql } = await import("drizzle-orm");
    await db.execute(drSql`UPDATE service_zones SET zip_codes = array_remove(zip_codes, ${zip}) WHERE id = ${id}`);
    const [updated] = await db.select().from(serviceZonesTable).where(eq(serviceZonesTable.id, id));
    return res.json(updated);
  } catch (err) {
    console.error("[zones/:id/zips DELETE]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── PUT /api/zones/:id/zips — replace all zips ───────────────────────────────
router.put("/:id/zips", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const id = parseInt(req.params.id);
    const { zip_codes } = req.body;
    if (!Array.isArray(zip_codes)) return res.status(400).json({ error: "zip_codes array required" });

    const existing = await db.select().from(serviceZonesTable).where(
      and(eq(serviceZonesTable.id, id), eq(serviceZonesTable.company_id, companyId))
    );
    if (!existing.length) return res.status(404).json({ error: "Not found" });

    if (zip_codes.length > 0) {
      const conflicts = await validateNoZipConflicts(companyId, zip_codes, id);
      if (conflicts.length > 0) {
        return res.status(400).json({ error: "zip_conflict", conflicts });
      }
    }

    await db.update(serviceZonesTable).set({ zip_codes }).where(
      and(eq(serviceZonesTable.id, id), eq(serviceZonesTable.company_id, companyId))
    );
    const [updated] = await db.select().from(serviceZonesTable).where(eq(serviceZonesTable.id, id));
    return res.json(updated);
  } catch (err) {
    console.error("[zones/:id/zips PUT]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/zones/stats — performance table ────────────────────────────────
router.get("/stats", requireAuth, requireRole("owner", "admin", "office"), async (req, res) => {
  try {
    const companyId = req.auth!.companyId;

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const nextMonthStart = now.getMonth() === 11
      ? `${now.getFullYear() + 1}-01-01`
      : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}-01`;

    const zones = await db
      .select()
      .from(serviceZonesTable)
      .where(and(eq(serviceZonesTable.company_id, companyId), eq(serviceZonesTable.is_active, true)))
      .orderBy(serviceZonesTable.sort_order);

    if (!zones.length) return res.json([]);

    const zoneIds = zones.map(z => z.id);

    const stats = await db
      .select({
        zone_id: jobsTable.zone_id,
        job_count: sql<number>`count(*)::int`,
        revenue: sql<number>`sum(${jobsTable.base_fee})::numeric`,
      })
      .from(jobsTable)
      .where(
        and(
          eq(jobsTable.company_id, companyId),
          inArray(jobsTable.zone_id as any, zoneIds),
          sql`${jobsTable.scheduled_date} >= ${monthStart}`,
          sql`${jobsTable.scheduled_date} < ${nextMonthStart}`,
        )
      )
      .groupBy(jobsTable.zone_id);

    const statsMap: Record<number, { job_count: number; revenue: number }> = {};
    for (const s of stats) if (s.zone_id) statsMap[s.zone_id] = { job_count: s.job_count, revenue: Number(s.revenue) };

    return res.json(
      zones.map(z => ({
        ...z,
        job_count: statsMap[z.id]?.job_count ?? 0,
        revenue: statsMap[z.id]?.revenue ?? 0,
        avg_bill: statsMap[z.id]?.job_count
          ? (statsMap[z.id].revenue / statsMap[z.id].job_count)
          : 0,
      }))
    );
  } catch (err) {
    console.error("[zones/stats GET]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/zones/waitlist — out-of-zone email capture ────────────────────
router.post("/waitlist", async (req, res) => {
  try {
    const { company_id, email, zip_code } = req.body;
    if (!company_id || !email || !zip_code) {
      return res.status(400).json({ error: "company_id, email, and zip_code required" });
    }

    await db.insert(waitlistTable).values({ company_id, email, zip_code });
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error("[zones/waitlist POST]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/zones/employee-zones — get zone assignments for all employees ──
router.get("/employee-zones", requireAuth, requireRole("owner", "admin", "office"), async (req, res) => {
  try {
    const companyId = req.auth!.companyId;

    const rows = await db
      .select({
        user_id: serviceZoneEmployeesTable.user_id,
        zone_id: serviceZoneEmployeesTable.zone_id,
        zone_name: serviceZonesTable.name,
        zone_color: serviceZonesTable.color,
      })
      .from(serviceZoneEmployeesTable)
      .innerJoin(serviceZonesTable, eq(serviceZonesTable.id, serviceZoneEmployeesTable.zone_id))
      .where(eq(serviceZoneEmployeesTable.company_id, companyId));

    // Build map: user_id → primary zone (first found)
    const map: Record<number, { zone_id: number; zone_name: string; zone_color: string }> = {};
    for (const r of rows) {
      if (!map[r.user_id]) {
        map[r.user_id] = { zone_id: r.zone_id, zone_name: r.zone_name, zone_color: r.zone_color };
      }
    }

    return res.json(map);
  } catch (err) {
    console.error("[zones/employee-zones GET]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── PUT /api/zones/user-zone — assign employee to a zone (replaces all) ─────
router.put("/user-zone", requireAuth, requireRole("owner", "admin", "office"), async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const { user_id, zone_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id required" });

    // Remove from all zones first
    await db.delete(serviceZoneEmployeesTable)
      .where(and(eq(serviceZoneEmployeesTable.user_id, user_id), eq(serviceZoneEmployeesTable.company_id, companyId)));

    // If zone_id provided, add to that zone
    if (zone_id) {
      await db.insert(serviceZoneEmployeesTable)
        .values({ zone_id, user_id, company_id: companyId })
        .onConflictDoNothing();
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("[zones/user-zone PUT]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
