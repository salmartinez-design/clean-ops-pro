import { Router } from "express";
import { db } from "@workspace/db";
import { quotesTable, clientsTable, jobsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const clientId = req.query.client_id ? parseInt(req.query.client_id as string) : undefined;
    const conditions: any[] = [eq(quotesTable.company_id, req.auth!.companyId)];
    if (clientId) conditions.push(eq(quotesTable.client_id, clientId));
    const quotes = await db
      .select()
      .from(quotesTable)
      .where(and(...conditions))
      .orderBy(desc(quotesTable.created_at));
    res.json(quotes);
  } catch (e: any) {
    console.error("List quotes error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.post("/", requireAuth, requireRole(["owner", "admin"]), async (req, res) => {
  try {
    const { client_id, lead_name, lead_email, lead_phone, address, service_type,
      frequency, estimated_hours, base_price, notes } = req.body;
    const [q] = await db.insert(quotesTable).values({
      company_id: req.auth!.companyId,
      client_id: client_id || null,
      lead_name, lead_email, lead_phone, address,
      service_type, frequency, estimated_hours, base_price,
      notes, created_by: req.auth!.userId,
      status: "draft",
    }).returning();
    res.status(201).json(q);
  } catch (e: any) {
    console.error("Create quote error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.patch("/:id", requireAuth, requireRole(["owner", "admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const allowed = ["status", "base_price", "estimated_hours", "notes", "service_type", "frequency", "sent_at", "viewed_at", "accepted_at"];
    const updates: any = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    const [q] = await db
      .update(quotesTable)
      .set(updates)
      .where(and(eq(quotesTable.id, id), eq(quotesTable.company_id, req.auth!.companyId)))
      .returning();
    if (!q) return res.status(404).json({ error: "Not found" });
    res.json(q);
  } catch (e: any) {
    console.error("Update quote error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.post("/:id/send", requireAuth, requireRole(["owner", "admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [q] = await db
      .update(quotesTable)
      .set({ status: "sent", sent_at: new Date() })
      .where(and(eq(quotesTable.id, id), eq(quotesTable.company_id, req.auth!.companyId)))
      .returning();
    if (!q) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, quote: q });
  } catch (e: any) {
    console.error("Send quote error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.post("/:id/convert", requireAuth, requireRole(["owner", "admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const quote = await db.query.quotesTable?.findFirst?.({
      where: and(eq(quotesTable.id, id), eq(quotesTable.company_id, req.auth!.companyId)),
    });
    const [q] = await db
      .update(quotesTable)
      .set({ status: "booked" })
      .where(and(eq(quotesTable.id, id), eq(quotesTable.company_id, req.auth!.companyId)))
      .returning();
    if (!q) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, quote: q, message: "Quote marked as booked. Create a job to complete conversion." });
  } catch (e: any) {
    console.error("Convert quote error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.delete("/:id", requireAuth, requireRole(["owner", "admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(quotesTable).where(and(eq(quotesTable.id, id), eq(quotesTable.company_id, req.auth!.companyId)));
    res.json({ success: true });
  } catch (e: any) {
    console.error("Delete quote error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

export default router;
