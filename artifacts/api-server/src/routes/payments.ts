import { Router } from "express";
import { db } from "@workspace/db";
import { paymentsTable, invoicesTable } from "@workspace/db/schema";
import { eq, and, desc, sum } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const clientId = req.query.client_id ? parseInt(req.query.client_id as string) : undefined;
    const conditions: any[] = [eq(paymentsTable.company_id, req.auth!.companyId)];
    if (clientId) conditions.push(eq(paymentsTable.client_id, clientId));
    const payments = await db
      .select()
      .from(paymentsTable)
      .where(and(...conditions))
      .orderBy(desc(paymentsTable.created_at));
    res.json(payments);
  } catch (e: any) {
    console.error("List payments error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.post("/", requireAuth, requireRole(["owner", "admin"]), async (req, res) => {
  try {
    const { client_id, invoice_id, amount, method, last_4, card_brand, stripe_payment_id } = req.body;
    if (!client_id || !amount) return res.status(400).json({ error: "client_id and amount required" });
    const [p] = await db.insert(paymentsTable).values({
      company_id: req.auth!.companyId,
      client_id: parseInt(client_id),
      invoice_id: invoice_id ? parseInt(invoice_id) : null,
      amount: amount.toString(),
      method: method || "card",
      status: "completed",
      last_4, card_brand, stripe_payment_id,
      processed_by: req.auth!.userId,
    }).returning();
    if (invoice_id) {
      await db.update(invoicesTable)
        .set({ paid_at: new Date(), status: "paid" as any })
        .where(and(eq(invoicesTable.id, parseInt(invoice_id)), eq(invoicesTable.company_id, req.auth!.companyId)));
    }
    res.status(201).json(p);
  } catch (e: any) {
    console.error("Create payment error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.post("/:id/refund", requireAuth, requireRole(["owner", "admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;
    const [p] = await db
      .update(paymentsTable)
      .set({ status: "refunded", refunded_at: new Date(), refund_reason: reason || "" })
      .where(and(eq(paymentsTable.id, id), eq(paymentsTable.company_id, req.auth!.companyId)))
      .returning();
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(p);
  } catch (e: any) {
    console.error("Refund payment error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

export default router;
