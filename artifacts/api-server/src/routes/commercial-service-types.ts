// [AI.3] Tenant-managed commercial service types.
//
// Drives the Service Type dropdown in the edit-job modal (commercial branch)
// and is administered from /settings/pricing → "Commercial Service Types".
// Each row is per-company (RLS-scoped via JWT companyId).
//
// Slug invariant: must be a valid jobs.service_type Postgres enum value.
// On POST, server slugifies the user-supplied name (or accepts an explicit
// slug), validates regex ^[a-z][a-z0-9_]*$, then runs
//   ALTER TYPE service_type ADD VALUE IF NOT EXISTS '<slug>'
// outside the transaction (Postgres requires this for ALTER TYPE) before
// inserting the row. Idempotent: ADD VALUE IF NOT EXISTS is a no-op when
// the value already exists.
//
// Soft delete only: DELETE sets is_active=false. Historical jobs that
// reference a deactivated slug continue to render correctly via the
// service_type column on jobs.
import { Router } from "express";
import { db } from "@workspace/db";
import { commercialServiceTypesTable } from "@workspace/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

const SLUG_RE = /^[a-z][a-z0-9_]*$/;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
}

// GET /api/commercial-service-types
// Returns all rows for the user's company. By default includes inactive
// rows so the settings UI can render them; pass ?active=true to filter.
router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId!;
    const onlyActive = req.query.active === "true";
    const rows = await db
      .select()
      .from(commercialServiceTypesTable)
      .where(
        onlyActive
          ? and(
              eq(commercialServiceTypesTable.company_id, companyId),
              eq(commercialServiceTypesTable.is_active, true),
            )
          : eq(commercialServiceTypesTable.company_id, companyId),
      )
      .orderBy(asc(commercialServiceTypesTable.sort_order), asc(commercialServiceTypesTable.id));
    return res.json(rows);
  } catch (err) {
    console.error("GET /commercial-service-types error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/commercial-service-types — create new type.
// Body: { name: string, slug?: string, default_hourly_rate?: number, sort_order?: number }
// If slug omitted, server slugifies name. Validates slug regex; extends the
// service_type enum if needed (idempotent), then INSERTs.
router.post("/", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const companyId = req.auth!.companyId!;
    const { name, slug: slugInput, default_hourly_rate, sort_order } = req.body ?? {};

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "name is required" });
    }
    const slug = (slugInput && typeof slugInput === "string" ? slugInput : slugify(name)).toLowerCase();

    // Hard regex gate. Anything that doesn't match this is rejected before
    // touching the DB — prevents SQL injection in the dynamic ALTER TYPE.
    if (!SLUG_RE.test(slug)) {
      return res.status(400).json({
        error: "invalid slug",
        message: "slug must match ^[a-z][a-z0-9_]*$ (lowercase letters/digits/underscores, starts with a letter)",
        derived_slug: slug,
      });
    }

    // Extend the Postgres enum (no-op if already present). Cannot run inside
    // a transaction; doing it here as its own statement is safe per Postgres
    // semantics. The slug has already passed SLUG_RE so no injection risk.
    try {
      await db.execute(sql.raw(`ALTER TYPE service_type ADD VALUE IF NOT EXISTS '${slug}'`));
    } catch (err: any) {
      console.error("ALTER TYPE service_type ADD VALUE failed:", err?.message ?? err);
      return res.status(500).json({ error: "Could not extend service_type enum" });
    }

    // Now insert the row. UNIQUE (company_id, slug) guards against duplicates.
    try {
      const [row] = await db
        .insert(commercialServiceTypesTable)
        .values({
          company_id: companyId,
          name: name.trim(),
          slug,
          default_hourly_rate: default_hourly_rate != null && default_hourly_rate !== ""
            ? String(default_hourly_rate)
            : null,
          sort_order: typeof sort_order === "number" ? sort_order : 0,
        })
        .returning();
      return res.status(201).json(row);
    } catch (err: any) {
      // Likely the UNIQUE constraint — surface a friendly message.
      if (String(err?.message ?? "").includes("commercial_service_types") && String(err?.message ?? "").toLowerCase().includes("unique")) {
        return res.status(409).json({ error: "A service type with this slug already exists" });
      }
      throw err;
    }
  } catch (err) {
    console.error("POST /commercial-service-types error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/commercial-service-types/:id — edit name / rate / sort / active.
// Slug is intentionally immutable (changing it would orphan jobs that
// reference the old slug).
router.patch("/:id", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
    const companyId = req.auth!.companyId!;
    const { name, default_hourly_rate, is_active, sort_order } = req.body ?? {};

    const setParts: Record<string, unknown> = { updated_at: new Date() };
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "name must be a non-empty string" });
      }
      setParts.name = name.trim();
    }
    if (default_hourly_rate !== undefined) {
      setParts.default_hourly_rate = default_hourly_rate === null || default_hourly_rate === ""
        ? null
        : String(default_hourly_rate);
    }
    if (is_active !== undefined) setParts.is_active = !!is_active;
    if (sort_order !== undefined && typeof sort_order === "number") setParts.sort_order = sort_order;

    const updated = await db
      .update(commercialServiceTypesTable)
      .set(setParts)
      .where(and(
        eq(commercialServiceTypesTable.id, id),
        eq(commercialServiceTypesTable.company_id, companyId),
      ))
      .returning();
    if (!updated[0]) return res.status(404).json({ error: "Not found" });
    return res.json(updated[0]);
  } catch (err) {
    console.error("PATCH /commercial-service-types/:id error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/commercial-service-types/:id — soft delete (is_active=false).
// Hard delete is intentionally unsupported — historical jobs may reference
// the slug via jobs.service_type, and dropping the row would not delete
// those jobs but would lose the display name + default rate.
router.delete("/:id", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
    const companyId = req.auth!.companyId!;
    const updated = await db
      .update(commercialServiceTypesTable)
      .set({ is_active: false, updated_at: new Date() })
      .where(and(
        eq(commercialServiceTypesTable.id, id),
        eq(commercialServiceTypesTable.company_id, companyId),
      ))
      .returning();
    if (!updated[0]) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, id, is_active: false });
  } catch (err) {
    console.error("DELETE /commercial-service-types/:id error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
