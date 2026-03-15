import { Router } from "express";
import { db } from "@workspace/db";
import { discountsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req as any).auth.company_id;
    const rows = await db
      .select()
      .from(discountsTable)
      .where(eq(discountsTable.company_id, companyId))
      .orderBy(discountsTable.created_at);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch discounts" });
  }
});

router.post("/", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const companyId = (req as any).auth.company_id;
    const { name, code, type, value, scope, max_uses, expires_at } = req.body;
    if (!name || !code || !type || value === undefined) {
      return res.status(400).json({ error: "name, code, type, and value are required" });
    }
    const [row] = await db
      .insert(discountsTable)
      .values({
        company_id: companyId,
        name,
        code: code.toUpperCase(),
        type,
        value: String(value),
        scope: scope || "all_clients",
        max_uses: max_uses || null,
        expires_at: expires_at ? new Date(expires_at) : null,
      })
      .returning();
    res.status(201).json(row);
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Discount code already exists" });
    }
    res.status(500).json({ error: "Failed to create discount" });
  }
});

router.patch("/:id", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const companyId = (req as any).auth.company_id;
    const id = parseInt(req.params.id);
    const { active, name, code, value, type, scope, max_uses, expires_at } = req.body;
    const updates: Record<string, any> = {};
    if (active !== undefined) updates.active = active;
    if (name !== undefined) updates.name = name;
    if (code !== undefined) updates.code = code.toUpperCase();
    if (value !== undefined) updates.value = String(value);
    if (type !== undefined) updates.type = type;
    if (scope !== undefined) updates.scope = scope;
    if (max_uses !== undefined) updates.max_uses = max_uses;
    if (expires_at !== undefined) updates.expires_at = expires_at ? new Date(expires_at) : null;

    const [row] = await db
      .update(discountsTable)
      .set(updates)
      .where(and(eq(discountsTable.id, id), eq(discountsTable.company_id, companyId)))
      .returning();
    if (!row) return res.status(404).json({ error: "Discount not found" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Failed to update discount" });
  }
});

router.delete("/:id", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const companyId = (req as any).auth.company_id;
    const id = parseInt(req.params.id);
    const [row] = await db
      .delete(discountsTable)
      .where(and(eq(discountsTable.id, id), eq(discountsTable.company_id, companyId)))
      .returning();
    if (!row) return res.status(404).json({ error: "Discount not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete discount" });
  }
});

export default router;
