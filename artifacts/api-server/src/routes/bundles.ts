import { Router } from "express";
import { db } from "@workspace/db";
import { sql as drizzleSql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

async function getBundlesWithItems(companyId: number, activeOnly = false) {
  const activeFilter = activeOnly ? "AND b.active = true" : "";
  const result = await db.execute(drizzleSql`
    SELECT
      b.id, b.company_id, b.name, b.description,
      b.discount_type, b.discount_value, b.active,
      b.valid_from, b.valid_until, b.created_at,
      COALESCE(
        json_agg(
          json_build_object('id', bi.id, 'addon_id', bi.addon_id, 'addon_name', pa.name, 'price_type', pa.price_type)
          ORDER BY bi.id
        ) FILTER (WHERE bi.id IS NOT NULL),
        '[]'
      ) AS items
    FROM addon_bundles b
    LEFT JOIN addon_bundle_items bi ON bi.bundle_id = b.id
    LEFT JOIN pricing_addons pa ON pa.id = bi.addon_id
    WHERE b.company_id = ${companyId}
    ${drizzleSql.raw(activeFilter)}
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `);
  return (result as any).rows ?? [];
}

router.get("/flat-addons", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(drizzleSql`
      SELECT id, name, price_type, price_value, is_active
      FROM pricing_addons
      WHERE company_id = ${req.auth!.companyId}
        AND is_active = true
        AND price_type NOT IN ('percentage', 'percent', 'sqft_pct', 'time_only', 'manual_adj')
      ORDER BY sort_order, name
    `);
    return res.json((result as any).rows ?? []);
  } catch (err) {
    console.error("GET /bundles/flat-addons:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const bundles = await getBundlesWithItems(req.auth!.companyId);
    return res.json(bundles);
  } catch (err) {
    console.error("GET /bundles:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, requireRole("owner", "admin", "office"), async (req, res) => {
  try {
    const { name, description, discount_type, discount_value, active, valid_from, valid_until, addon_ids } = req.body;
    if (!name || !discount_value || !addon_ids || addon_ids.length < 2) {
      return res.status(400).json({ error: "Name, discount_value, and at least 2 addon_ids are required" });
    }

    const bundleResult = await db.execute(drizzleSql`
      INSERT INTO addon_bundles (company_id, name, description, discount_type, discount_value, active, valid_from, valid_until)
      VALUES (
        ${req.auth!.companyId}, ${name}, ${description || null},
        ${discount_type || "flat_per_item"}, ${discount_value},
        ${active !== false},
        ${valid_from || null}, ${valid_until || null}
      ) RETURNING id
    `);
    const bundleId = (bundleResult as any).rows[0].id;

    for (const addonId of addon_ids) {
      await db.execute(drizzleSql`INSERT INTO addon_bundle_items (bundle_id, addon_id) VALUES (${bundleId}, ${addonId})`);
    }

    const [bundle] = await getBundlesWithItems(req.auth!.companyId);
    return res.status(201).json(bundle);
  } catch (err) {
    console.error("POST /bundles:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAuth, requireRole("owner", "admin", "office"), async (req, res) => {
  try {
    const bundleId = parseInt(req.params.id);
    const { name, description, discount_type, discount_value, active, valid_from, valid_until, addon_ids } = req.body;

    const existing = await db.execute(drizzleSql`SELECT id FROM addon_bundles WHERE id = ${bundleId} AND company_id = ${req.auth!.companyId} LIMIT 1`);
    if (!(existing as any).rows.length) return res.status(404).json({ error: "Not found" });

    await db.execute(drizzleSql`
      UPDATE addon_bundles SET
        name = COALESCE(${name ?? null}, name),
        description = COALESCE(${description ?? null}, description),
        discount_type = COALESCE(${discount_type ?? null}, discount_type),
        discount_value = COALESCE(${discount_value != null ? String(discount_value) : null}::numeric, discount_value),
        active = COALESCE(${active != null ? active : null}, active),
        valid_from = ${valid_from !== undefined ? (valid_from || null) : drizzleSql`valid_from`},
        valid_until = ${valid_until !== undefined ? (valid_until || null) : drizzleSql`valid_until`}
      WHERE id = ${bundleId}
    `);

    if (addon_ids && addon_ids.length >= 2) {
      await db.execute(drizzleSql`DELETE FROM addon_bundle_items WHERE bundle_id = ${bundleId}`);
      for (const addonId of addon_ids) {
        await db.execute(drizzleSql`INSERT INTO addon_bundle_items (bundle_id, addon_id) VALUES (${bundleId}, ${addonId})`);
      }
    }

    const bundles = await getBundlesWithItems(req.auth!.companyId);
    const updated = bundles.find((b: any) => b.id === bundleId);
    return res.json(updated);
  } catch (err) {
    console.error("PUT /bundles/:id:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id/toggle", requireAuth, requireRole("owner", "admin", "office"), async (req, res) => {
  try {
    const bundleId = parseInt(req.params.id);
    const existing = await db.execute(drizzleSql`SELECT id, active FROM addon_bundles WHERE id = ${bundleId} AND company_id = ${req.auth!.companyId} LIMIT 1`);
    if (!(existing as any).rows.length) return res.status(404).json({ error: "Not found" });

    const currentActive = (existing as any).rows[0].active;
    await db.execute(drizzleSql`UPDATE addon_bundles SET active = ${!currentActive} WHERE id = ${bundleId}`);
    return res.json({ active: !currentActive });
  } catch (err) {
    console.error("PUT /bundles/:id/toggle:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAuth, requireRole("owner", "admin", "office"), async (req, res) => {
  try {
    const bundleId = parseInt(req.params.id);
    const existing = await db.execute(drizzleSql`SELECT id FROM addon_bundles WHERE id = ${bundleId} AND company_id = ${req.auth!.companyId} LIMIT 1`);
    if (!(existing as any).rows.length) return res.status(404).json({ error: "Not found" });

    await db.execute(drizzleSql`DELETE FROM addon_bundles WHERE id = ${bundleId}`);
    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE /bundles/:id:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
