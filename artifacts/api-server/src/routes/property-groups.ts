import { Router } from "express";
import { db } from "@workspace/db";
import { propertyGroupsTable, clientsTable } from "@workspace/db/schema";
import { eq, and, count, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const groups = await db
      .select()
      .from(propertyGroupsTable)
      .where(eq(propertyGroupsTable.company_id, req.auth!.companyId))
      .orderBy(propertyGroupsTable.name);
    const clientCounts = await db
      .select({ group_id: clientsTable.property_group_id, cnt: count() })
      .from(clientsTable)
      .where(eq(clientsTable.company_id, req.auth!.companyId))
      .groupBy(clientsTable.property_group_id);
    const countMap: Record<number, number> = {};
    for (const r of clientCounts) {
      if (r.group_id) countMap[r.group_id] = Number(r.cnt);
    }
    res.json(groups.map(g => ({ ...g, client_count: countMap[g.id] || 0 })));
  } catch (e: any) {
    console.error("List property groups error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.get("/:id/clients", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const clients = await db
      .select()
      .from(clientsTable)
      .where(and(
        eq(clientsTable.company_id, req.auth!.companyId),
        eq(clientsTable.property_group_id, id)
      ));
    res.json(clients);
  } catch (e: any) {
    console.error("Get group clients error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.post("/", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const { name, contact_name, contact_email, contact_phone, billing_centralized, notes } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const [g] = await db.insert(propertyGroupsTable).values({
      company_id: req.auth!.companyId,
      name, contact_name, contact_email, contact_phone,
      billing_centralized: billing_centralized || false,
      notes,
    }).returning();
    res.status(201).json(g);
  } catch (e: any) {
    console.error("Create group error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.patch("/:id", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const allowed = ["name", "contact_name", "contact_email", "contact_phone", "billing_centralized", "notes"];
    const updates: any = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    const [g] = await db
      .update(propertyGroupsTable)
      .set(updates)
      .where(and(eq(propertyGroupsTable.id, id), eq(propertyGroupsTable.company_id, req.auth!.companyId)))
      .returning();
    if (!g) return res.status(404).json({ error: "Not found" });
    res.json(g);
  } catch (e: any) {
    console.error("Update group error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.delete("/:id", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(clientsTable).set({ property_group_id: null } as any)
      .where(and(eq(clientsTable.company_id, req.auth!.companyId), eq(clientsTable.property_group_id, id)));
    await db.delete(propertyGroupsTable).where(
      and(eq(propertyGroupsTable.id, id), eq(propertyGroupsTable.company_id, req.auth!.companyId))
    );
    res.json({ success: true });
  } catch (e: any) {
    console.error("Delete group error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

export default router;
