import { Router } from "express";
import { db, pool } from "@workspace/db";
import {
  usersTable,
  companiesTable,
  auditLogTable,
  articlesTable,
  clientsTable,
} from "@workspace/db/schema";
import { eq, sql, and, inArray, gte, desc, isNull } from "drizzle-orm";
import { requireAuth, requireRole, signToken } from "../lib/auth.js";
import { runSmokeTests } from "../lib/smoke-test.js";
import { geocodeWithComponents } from "../lib/geocode.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

const PLAN_MRR: Record<string, number> = {
  starter: 49,
  growth: 149,
  enterprise: 299,
};

function requireSuperAdminAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    res.status(401).json({ error: "Unauthorized", message: "Not authenticated" });
    return;
  }
  if (req.auth.role === "super_admin" || req.auth.isSuperAdmin === true) {
    next();
    return;
  }
  res.status(403).json({ error: "Forbidden", message: "Super admin access required" });
}

const isSuperAdmin = [requireAuth, requireSuperAdminAccess];

/* ── DASHBOARD ────────────────────────────────────────────────── */
router.get("/dashboard", ...isSuperAdmin, async (_req, res) => {
  try {
    const companies = await db.select().from(companiesTable);

    const totalCompanies = companies.length;
    const activeSubs = companies.filter(
      (c) => c.subscription_status === "active"
    ).length;
    const trialSubs = companies.filter(
      (c) => c.subscription_status === "trialing"
    ).length;
    const pastDueSubs = companies.filter(
      (c) => c.subscription_status === "past_due"
    ).length;
    const canceledSubs = companies.filter(
      (c) => c.subscription_status === "canceled"
    ).length;

    const mrr = companies
      .filter((c) => c.subscription_status === "active")
      .reduce((sum, c) => sum + (PLAN_MRR[c.plan] || 0), 0);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newThisWeek = companies.filter(
      (c) => new Date(c.created_at) >= oneWeekAgo
    ).length;

    const flagged = companies.filter((c) =>
      ["past_due", "canceled"].includes(c.subscription_status)
    );

    return res.json({
      totalCompanies,
      activeSubs,
      trialSubs,
      pastDueSubs,
      canceledSubs,
      mrr,
      arr: mrr * 12,
      newThisWeek,
      platformFeeRevenue: Math.round(mrr * 0.05),
      flagged: flagged.map((c) => ({ id: c.id, name: c.name, status: c.subscription_status })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ── COMPANIES LIST ───────────────────────────────────────────── */
router.get("/companies", ...isSuperAdmin, async (req, res) => {
  try {
    const { status } = req.query as { status?: string };

    const allCompanies = await db.select().from(companiesTable);

    const filtered = status && status !== "all"
      ? allCompanies.filter((c) => c.subscription_status === status)
      : allCompanies;

    const companyIds = filtered.map((c) => c.id);
    const owners = companyIds.length
      ? await db
          .select({
            company_id: usersTable.company_id,
            email: usersTable.email,
            first_name: usersTable.first_name,
            last_name: usersTable.last_name,
          })
          .from(usersTable)
          .where(
            and(
              inArray(usersTable.company_id as any, companyIds),
              inArray(usersTable.role, ["owner"])
            )
          )
      : [];

    const ownerMap: Record<number, typeof owners[0]> = {};
    for (const o of owners) {
      if (o.company_id != null) ownerMap[o.company_id] = o;
    }

    const result = filtered.map((c) => ({
      ...c,
      owner: ownerMap[c.id] || null,
      mrr: c.subscription_status === "active" ? PLAN_MRR[c.plan] || 0 : 0,
    }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ── TENANT SUMMARY LIST ──────────────────────────────────────── */
router.get("/tenants", ...isSuperAdmin, async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        c.id, c.name, c.subscription_status, c.plan, c.early_tenant,
        c.trial_ends_at, c.stripe_customer_id, c.created_at,
        t.name AS tier_name, t.slug AS tier_slug, t.price_monthly,
        (SELECT COUNT(*)::int FROM users u WHERE u.company_id=c.id AND u.role='technician' AND u.is_active=true) AS active_techs,
        (SELECT COUNT(*)::int FROM users u WHERE u.company_id=c.id AND u.role IN ('office','admin') AND u.is_active=true) AS active_office,
        (SELECT COUNT(*)::int FROM users u WHERE u.company_id=c.id AND u.is_active=true) AS total_users,
        CASE WHEN c.subscription_status='active' THEN COALESCE(t.price_monthly::numeric, 0) ELSE 0 END AS mrr
      FROM companies c
      LEFT JOIN subscription_tiers t ON t.id=c.tier_id
      ORDER BY c.id
    `);
    return res.json({ data: (rows as any).rows ?? [] });
  } catch (err) {
    console.error("GET admin/tenants error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ── COMPANY UPDATE ───────────────────────────────────────────── */
router.patch("/companies/:id", ...isSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { plan, brand_color, subscription_status } = req.body;

    const updates: Record<string, unknown> = {};
    if (plan) updates.plan = plan;
    if (brand_color) updates.brand_color = brand_color;
    if (subscription_status) updates.subscription_status = subscription_status;

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const updated = await db
      .update(companiesTable)
      .set(updates as any)
      .where(eq(companiesTable.id, id))
      .returning();

    return res.json(updated[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ── SUSPEND COMPANY ──────────────────────────────────────────── */
router.post("/companies/:id/suspend", ...isSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await db
      .update(companiesTable)
      .set({ subscription_status: "canceled" } as any)
      .where(eq(companiesTable.id, id));

    await db.update(usersTable)
      .set({ is_active: false })
      .where(eq(usersTable.company_id as any, id));

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ── IMPERSONATE COMPANY ──────────────────────────────────────── */
router.post("/companies/:id/impersonate", ...isSuperAdmin, async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    const adminUserId = req.auth!.userId;

    const ownerUsers = await db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.company_id as any, companyId),
          inArray(usersTable.role, ["owner", "admin"])
        )
      )
      .limit(1);

    if (!ownerUsers[0]) {
      return res.status(404).json({ error: "No owner found for this company" });
    }

    const target = ownerUsers[0];

    await db.insert(auditLogTable).values({
      admin_user_id: adminUserId,
      action: "impersonate",
      target_company_id: companyId,
      target_user_id: target.id,
      metadata: JSON.stringify({ timestamp: new Date().toISOString() }),
    });

    const impersonationToken = signToken({
      userId: target.id,
      companyId: target.company_id,
      role: target.role,
      email: target.email,
    });

    return res.json({ token: impersonationToken, user: { email: target.email, role: target.role } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ── BILLING ──────────────────────────────────────────────────── */
router.get("/billing", ...isSuperAdmin, async (_req, res) => {
  try {
    const companies = await db.select().from(companiesTable);

    const byPlan = { starter: 0, growth: 0, enterprise: 0 };
    let mrr = 0;

    for (const c of companies) {
      if (c.subscription_status === "active") {
        const key = c.plan as keyof typeof byPlan;
        byPlan[key] = (byPlan[key] || 0) + 1;
        mrr += PLAN_MRR[c.plan] || 0;
      }
    }

    const upcomingRenewals = companies.filter(
      (c) => c.subscription_status === "active"
    ).length;

    const failedPayments = companies.filter(
      (c) => c.subscription_status === "past_due"
    ).length;

    const mrrHistory = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        month: d.toLocaleString("default", { month: "short" }),
        mrr: Math.round(mrr * (0.7 + i * 0.06)),
      };
    });

    return res.json({
      mrr,
      arr: mrr * 12,
      platformFees: Math.round(mrr * 0.05),
      byPlan,
      upcomingRenewals,
      failedPayments,
      mrrHistory,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ── ARTICLES ─────────────────────────────────────────────────── */
router.get("/articles", ...isSuperAdmin, async (req, res) => {
  try {
    const articles = await db
      .select()
      .from(articlesTable)
      .orderBy(desc(articlesTable.created_at));
    return res.json(articles);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/articles", ...isSuperAdmin, async (req, res) => {
  try {
    const { title_en, title_es, content_en, content_es, category, published, slug } = req.body;
    if (!title_en || !slug) {
      return res.status(400).json({ error: "title_en and slug are required" });
    }
    const created = await db.insert(articlesTable).values({
      slug,
      title_en,
      title_es: title_es || null,
      content_en: content_en || "",
      content_es: content_es || null,
      category: category || null,
      published: published || false,
    }).returning();
    return res.status(201).json(created[0]);
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Slug already exists" });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/articles/:id", ...isSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title_en, title_es, content_en, content_es, category, published } = req.body;
    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (title_en !== undefined) updates.title_en = title_en;
    if (title_es !== undefined) updates.title_es = title_es;
    if (content_en !== undefined) updates.content_en = content_en;
    if (content_es !== undefined) updates.content_es = content_es;
    if (category !== undefined) updates.category = category;
    if (published !== undefined) updates.published = published;

    const updated = await db
      .update(articlesTable)
      .set(updates as any)
      .where(eq(articlesTable.id, id))
      .returning();
    return res.json(updated[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/articles/:id", ...isSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(articlesTable).where(eq(articlesTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ── SMOKE TEST RESULTS ──────────────────────────────────────────── */
router.get("/smoke-tests", ...isSuperAdmin, async (_req, res) => {
  try {
    const r = await pool.query(`
      SELECT id, run_at, environment, total_tests, passed, failed, results, duration_ms
      FROM smoke_test_results
      ORDER BY run_at DESC
      LIMIT 5
    `);
    return res.json({ runs: r.rows });
  } catch (err: any) {
    // Table may not exist yet (first deploy)
    if (err.code === "42P01") return res.json({ runs: [] });
    console.error("[admin] smoke-tests fetch error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/smoke-tests/run", ...isSuperAdmin, async (_req, res) => {
  try {
    const result = await runSmokeTests(true);
    return res.json(result);
  } catch (err: any) {
    console.error("[admin] smoke-tests/run error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/* ── AUDIT LOG HEALTH CHECK ──────────────────────────────────────── */
router.post("/audit-test", ...isSuperAdmin, async (req, res) => {
  try {
    const { logAudit } = await import("../lib/audit.js");
    await logAudit(req, "SMOKE_TEST", "system", "0", null, { test: true, timestamp: new Date().toISOString() });

    const verify = await pool.query(
      `SELECT id, company_id, performed_by, action, target_type, performed_at
       FROM app_audit_log
       WHERE action = 'SMOKE_TEST'
       ORDER BY performed_at DESC LIMIT 1`
    );

    if (!verify.rows[0]) {
      return res.json({ written: false, audit_logging_healthy: false, error: "Row not found after insert" });
    }

    return res.json({
      written: true,
      row: verify.rows[0],
      audit_logging_healthy: true,
    });
  } catch (err: any) {
    console.error("[admin] audit-test error:", err);
    return res.status(500).json({ audit_logging_healthy: false, error: err.message });
  }
});

// [AI.8] Geocode-backed zip resolution for clients with NULL zip.
// 576/1308 Phes clients have no parseable address text — pure data
// gap from the MC import. Geocoding is the way out: send whatever
// address fragment exists to Google Maps, parse the postal_code
// component out of the response, write back to clients.zip.
//
// Auth: super_admin OR owner (owners can only geocode their own
// company; super_admin can target any). Field techs / office staff
// blocked.

function requireSuperAdminOrOwner(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    res.status(401).json({ error: "Unauthorized", message: "Not authenticated" });
    return;
  }
  if (req.auth.role === "super_admin" || req.auth.isSuperAdmin === true || req.auth.role === "owner") {
    next();
    return;
  }
  res.status(403).json({ error: "Forbidden", message: "Owner or super-admin access required" });
}
const isSuperAdminOrOwner = [requireAuth, requireSuperAdminOrOwner];

/* ── ZONE COVERAGE: list clients missing zip ─────────────────────
 * GET /api/admin/clients-missing-zip?company_id=N&include_no_address=true
 * Returns the operator's worklist for /admin/zone-coverage.
 * Fields surfaced let the UI decide whether to offer "Geocode" or
 * "Add Address" per row (geocode needs a non-empty address string).
 */
router.get("/clients-missing-zip", ...isSuperAdminOrOwner, async (req, res) => {
  try {
    const auth = req.auth!;
    let companyId: number;
    if (auth.role === "super_admin" || auth.isSuperAdmin === true) {
      companyId = Number(req.query.company_id ?? auth.companyId);
    } else {
      // Owners locked to their own company regardless of what they pass
      companyId = Number(auth.companyId);
    }
    if (!Number.isFinite(companyId)) {
      return res.status(400).json({ error: "Bad Request", message: "company_id required" });
    }

    const rows = await db.execute(sql`
      SELECT
        c.id,
        c.first_name, c.last_name,
        c.address    AS clients_address,
        c.city       AS clients_city,
        c.state      AS clients_state,
        c.zip        AS clients_zip,
        c.geocoded_at,
        c.geocode_source,
        (SELECT j.address_street FROM jobs j
           WHERE j.client_id = c.id AND j.address_street IS NOT NULL
           ORDER BY j.scheduled_date DESC NULLS LAST, j.id DESC LIMIT 1) AS recent_job_street,
        (SELECT j.address_city FROM jobs j
           WHERE j.client_id = c.id AND j.address_street IS NOT NULL
           ORDER BY j.scheduled_date DESC NULLS LAST, j.id DESC LIMIT 1) AS recent_job_city,
        (SELECT j.address_state FROM jobs j
           WHERE j.client_id = c.id AND j.address_street IS NOT NULL
           ORDER BY j.scheduled_date DESC NULLS LAST, j.id DESC LIMIT 1) AS recent_job_state,
        (SELECT count(*) FROM jobs j
           WHERE j.client_id = c.id AND j.scheduled_date >= CURRENT_DATE) AS upcoming_job_count
      FROM clients c
      WHERE c.company_id = ${companyId}
        AND c.zip IS NULL
      ORDER BY upcoming_job_count DESC, c.last_name, c.first_name
    `);

    const data = (rows.rows as any[]).map(r => {
      const street = (r.clients_address ?? r.recent_job_street ?? "")?.trim() || null;
      const city   = (r.clients_city    ?? r.recent_job_city   ?? "")?.trim() || null;
      const state  = (r.clients_state   ?? r.recent_job_state  ?? "")?.trim() || null;
      const has_address_string = !!(street || city);
      return {
        id: Number(r.id),
        name: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
        clients_address: r.clients_address,
        clients_city: r.clients_city,
        clients_state: r.clients_state,
        recent_job_street: r.recent_job_street,
        recent_job_city: r.recent_job_city,
        recent_job_state: r.recent_job_state,
        upcoming_job_count: Number(r.upcoming_job_count ?? 0),
        geocoded_at: r.geocoded_at,
        geocode_source: r.geocode_source,
        candidate_address: has_address_string
          ? [street, city, state].filter(Boolean).join(", ")
          : null,
        action: has_address_string ? "geocode" : "manual_entry",
      };
    });

    return res.json({
      company_id: companyId,
      total: data.length,
      can_geocode: data.filter(d => d.action === "geocode").length,
      needs_manual: data.filter(d => d.action === "manual_entry").length,
      clients: data,
    });
  } catch (err) {
    console.error("[admin] clients-missing-zip error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: err instanceof Error ? err.message : String(err) });
  }
});

/* ── ZONE COVERAGE: bulk geocode ──────────────────────────────────
 * POST /api/admin/geocode-clients
 * Body: { company_id?, batch_size=50, dry_run=false, client_ids?[] }
 * - company_id required for super_admin; ignored for owners (locked)
 * - hard cap 1000 per call regardless of batch_size
 * - skips clients with zip already populated (idempotent)
 * - skips clients with no usable address string
 * - throttle: 100ms between Google Maps calls (~10 req/sec, well under
 *   the 50 req/sec free-tier ceiling — conservative)
 */
const HARD_CAP = 1000;
const THROTTLE_MS = 100;

router.post("/geocode-clients", ...isSuperAdminOrOwner, async (req, res) => {
  try {
    const auth = req.auth!;
    const body = req.body ?? {};
    let companyId: number;
    if (auth.role === "super_admin" || auth.isSuperAdmin === true) {
      companyId = Number(body.company_id ?? auth.companyId);
    } else {
      companyId = Number(auth.companyId);
    }
    if (!Number.isFinite(companyId)) {
      return res.status(400).json({ error: "Bad Request", message: "company_id required" });
    }
    const dryRun = body.dry_run === true;
    const batchSize = Math.max(1, Math.min(HARD_CAP, Number(body.batch_size ?? 50)));
    const explicitIds: number[] | null = Array.isArray(body.client_ids)
      ? body.client_ids.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n))
      : null;

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "GOOGLE_MAPS_API_KEY not set in env — cannot geocode",
      });
    }

    // Pull candidates. Idempotency: skip rows where zip is already set.
    const candidatesQuery = explicitIds && explicitIds.length > 0
      ? sql`
          SELECT
            c.id, c.first_name, c.last_name,
            c.address AS clients_address,
            c.city    AS clients_city,
            c.state   AS clients_state,
            (SELECT j.address_street FROM jobs j
               WHERE j.client_id = c.id AND j.address_street IS NOT NULL
               ORDER BY j.scheduled_date DESC NULLS LAST, j.id DESC LIMIT 1) AS recent_job_street,
            (SELECT j.address_city FROM jobs j
               WHERE j.client_id = c.id AND j.address_street IS NOT NULL
               ORDER BY j.scheduled_date DESC NULLS LAST, j.id DESC LIMIT 1) AS recent_job_city,
            (SELECT j.address_state FROM jobs j
               WHERE j.client_id = c.id AND j.address_street IS NOT NULL
               ORDER BY j.scheduled_date DESC NULLS LAST, j.id DESC LIMIT 1) AS recent_job_state
          FROM clients c
          WHERE c.company_id = ${companyId}
            AND c.zip IS NULL
            AND c.id = ANY(${explicitIds}::int[])
          LIMIT ${batchSize}
        `
      : sql`
          SELECT
            c.id, c.first_name, c.last_name,
            c.address AS clients_address,
            c.city    AS clients_city,
            c.state   AS clients_state,
            (SELECT j.address_street FROM jobs j
               WHERE j.client_id = c.id AND j.address_street IS NOT NULL
               ORDER BY j.scheduled_date DESC NULLS LAST, j.id DESC LIMIT 1) AS recent_job_street,
            (SELECT j.address_city FROM jobs j
               WHERE j.client_id = c.id AND j.address_street IS NOT NULL
               ORDER BY j.scheduled_date DESC NULLS LAST, j.id DESC LIMIT 1) AS recent_job_city,
            (SELECT j.address_state FROM jobs j
               WHERE j.client_id = c.id AND j.address_street IS NOT NULL
               ORDER BY j.scheduled_date DESC NULLS LAST, j.id DESC LIMIT 1) AS recent_job_state
          FROM clients c
          WHERE c.company_id = ${companyId}
            AND c.zip IS NULL
          ORDER BY c.id
          LIMIT ${batchSize}
        `;

    const candidates = await db.execute(candidatesQuery);

    type Result =
      | { client_id: number; name: string; status: "succeeded"; zip: string; lat: number; lng: number; formatted_address: string }
      | { client_id: number; name: string; status: "skipped"; reason: string }
      | { client_id: number; name: string; status: "failed"; reason: string };
    const results: Result[] = [];

    for (const row of candidates.rows as any[]) {
      const id = Number(row.id);
      const name = `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim();
      const street = (row.clients_address ?? row.recent_job_street ?? "")?.trim() || null;
      const city = (row.clients_city ?? row.recent_job_city ?? "")?.trim() || null;
      const state = (row.clients_state ?? row.recent_job_state ?? "")?.trim() || null;
      const addressString = [street, city, state].filter(Boolean).join(", ");

      if (!addressString) {
        results.push({ client_id: id, name, status: "skipped", reason: "no_address_string" });
        continue;
      }

      if (dryRun) {
        results.push({ client_id: id, name, status: "skipped", reason: `dry_run: would_geocode "${addressString}"` });
        continue;
      }

      // Throttle between API calls. First call has no preceding wait.
      if (results.length > 0) {
        await new Promise(r => setTimeout(r, THROTTLE_MS));
      }

      const geo = await geocodeWithComponents(addressString);
      if (!geo) {
        results.push({ client_id: id, name, status: "failed", reason: "geocode_returned_null" });
        continue;
      }
      if (!geo.zip) {
        results.push({ client_id: id, name, status: "failed", reason: "geocode_no_postal_code" });
        continue;
      }

      try {
        await db.execute(sql`
          UPDATE clients
          SET
            zip            = ${geo.zip},
            lat            = ${geo.lat},
            lng            = ${geo.lng},
            city           = COALESCE(NULLIF(city, ''), ${geo.city}),
            state          = COALESCE(NULLIF(state, ''), ${geo.state}),
            address        = COALESCE(NULLIF(address, ''), ${geo.street ?? geo.formatted_address}),
            geocoded_at    = NOW(),
            geocode_source = 'google_maps_v1'
          WHERE id = ${id} AND company_id = ${companyId} AND zip IS NULL
        `);
        results.push({
          client_id: id, name, status: "succeeded",
          zip: geo.zip, lat: geo.lat, lng: geo.lng,
          formatted_address: geo.formatted_address,
        });
      } catch (err: any) {
        results.push({ client_id: id, name, status: "failed", reason: `db_update: ${err?.message ?? err}` });
      }
    }

    const succeeded = results.filter(r => r.status === "succeeded").length;
    const failed = results.filter(r => r.status === "failed").length;
    const skipped = results.filter(r => r.status === "skipped").length;

    console.log(
      `[AI.8] geocode-clients company=${companyId} dry_run=${dryRun} ` +
      `processed=${results.length} succeeded=${succeeded} failed=${failed} skipped=${skipped}`
    );

    return res.json({
      company_id: companyId,
      dry_run: dryRun,
      processed: results.length,
      succeeded,
      failed,
      skipped,
      sample_results: results.slice(0, 10),
      results,
    });
  } catch (err) {
    console.error("[admin] geocode-clients error:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
