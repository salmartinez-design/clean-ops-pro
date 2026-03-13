import { Router } from "express";
import { db } from "@workspace/db";
import { invoicesTable, clientsTable } from "@workspace/db/schema";
import { eq, and, desc, count, sum, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, client_id, date_from, date_to, page = "1", limit = "25" } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const conditions: any[] = [eq(invoicesTable.company_id, req.auth!.companyId)];
    if (status) conditions.push(eq(invoicesTable.status, status as any));
    if (client_id) conditions.push(eq(invoicesTable.client_id, parseInt(client_id as string)));

    const invoices = await db
      .select({
        id: invoicesTable.id,
        client_id: invoicesTable.client_id,
        client_name: sql<string>`concat(${clientsTable.first_name}, ' ', ${clientsTable.last_name})`,
        job_id: invoicesTable.job_id,
        status: invoicesTable.status,
        line_items: invoicesTable.line_items,
        subtotal: invoicesTable.subtotal,
        tips: invoicesTable.tips,
        total: invoicesTable.total,
        created_at: invoicesTable.created_at,
        paid_at: invoicesTable.paid_at,
      })
      .from(invoicesTable)
      .leftJoin(clientsTable, eq(invoicesTable.client_id, clientsTable.id))
      .where(and(...conditions))
      .orderBy(desc(invoicesTable.created_at))
      .limit(parseInt(limit as string))
      .offset(offset);

    const totalResult = await db
      .select({ count: count() })
      .from(invoicesTable)
      .where(and(...conditions));

    const statsResult = await db
      .select({
        total_revenue: sum(invoicesTable.total),
      })
      .from(invoicesTable)
      .where(eq(invoicesTable.company_id, req.auth!.companyId));

    const paidResult = await db
      .select({ total_paid: sum(invoicesTable.total) })
      .from(invoicesTable)
      .where(and(
        eq(invoicesTable.company_id, req.auth!.companyId),
        eq(invoicesTable.status, "paid")
      ));

    const overdueResult = await db
      .select({ total_overdue: sum(invoicesTable.total) })
      .from(invoicesTable)
      .where(and(
        eq(invoicesTable.company_id, req.auth!.companyId),
        eq(invoicesTable.status, "overdue")
      ));

    const sentResult = await db
      .select({ total_outstanding: sum(invoicesTable.total) })
      .from(invoicesTable)
      .where(and(
        eq(invoicesTable.company_id, req.auth!.companyId),
        eq(invoicesTable.status, "sent")
      ));

    return res.json({
      data: invoices.map(inv => ({
        ...inv,
        subtotal: parseFloat(inv.subtotal),
        tips: parseFloat(inv.tips),
        total: parseFloat(inv.total),
      })),
      total: totalResult[0].count,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      stats: {
        total_revenue: parseFloat(statsResult[0].total_revenue || "0"),
        total_paid: parseFloat(paidResult[0].total_paid || "0"),
        total_overdue: parseFloat(overdueResult[0].total_overdue || "0"),
        total_outstanding: parseFloat(sentResult[0].total_outstanding || "0"),
      },
    });
  } catch (err) {
    console.error("List invoices error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to list invoices" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { client_id, job_id, line_items, tips = 0 } = req.body;

    const subtotal = line_items.reduce((sum: number, item: any) => sum + item.total, 0);
    const total = subtotal + (tips || 0);

    const newInvoice = await db
      .insert(invoicesTable)
      .values({
        company_id: req.auth!.companyId,
        client_id,
        job_id,
        line_items,
        subtotal: subtotal.toString(),
        tips: (tips || 0).toString(),
        total: total.toString(),
      })
      .returning();

    const client = await db
      .select({ first_name: clientsTable.first_name, last_name: clientsTable.last_name })
      .from(clientsTable)
      .where(eq(clientsTable.id, client_id))
      .limit(1);

    return res.status(201).json({
      ...newInvoice[0],
      client_name: `${client[0]?.first_name || ""} ${client[0]?.last_name || ""}`.trim(),
      subtotal,
      tips: tips || 0,
      total,
    });
  } catch (err) {
    console.error("Create invoice error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to create invoice" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);

    const invoice = await db
      .select({
        id: invoicesTable.id,
        client_id: invoicesTable.client_id,
        client_name: sql<string>`concat(${clientsTable.first_name}, ' ', ${clientsTable.last_name})`,
        job_id: invoicesTable.job_id,
        status: invoicesTable.status,
        line_items: invoicesTable.line_items,
        subtotal: invoicesTable.subtotal,
        tips: invoicesTable.tips,
        total: invoicesTable.total,
        created_at: invoicesTable.created_at,
        paid_at: invoicesTable.paid_at,
      })
      .from(invoicesTable)
      .leftJoin(clientsTable, eq(invoicesTable.client_id, clientsTable.id))
      .where(and(
        eq(invoicesTable.id, invoiceId),
        eq(invoicesTable.company_id, req.auth!.companyId)
      ))
      .limit(1);

    if (!invoice[0]) {
      return res.status(404).json({ error: "Not Found", message: "Invoice not found" });
    }

    return res.json({
      ...invoice[0],
      subtotal: parseFloat(invoice[0].subtotal),
      tips: parseFloat(invoice[0].tips),
      total: parseFloat(invoice[0].total),
    });
  } catch (err) {
    console.error("Get invoice error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to get invoice" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const { status, line_items, tips } = req.body;

    let subtotal: number | undefined;
    let total: number | undefined;

    if (line_items) {
      subtotal = line_items.reduce((s: number, item: any) => s + item.total, 0);
      total = subtotal + (tips || 0);
    }

    const updated = await db
      .update(invoicesTable)
      .set({
        ...(status && { status }),
        ...(line_items && { line_items }),
        ...(tips !== undefined && { tips: tips.toString() }),
        ...(subtotal !== undefined && { subtotal: subtotal.toString() }),
        ...(total !== undefined && { total: total.toString() }),
        ...(status === "paid" && { paid_at: new Date() }),
      })
      .where(and(
        eq(invoicesTable.id, invoiceId),
        eq(invoicesTable.company_id, req.auth!.companyId)
      ))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: "Not Found", message: "Invoice not found" });
    }

    const client = await db
      .select({ first_name: clientsTable.first_name, last_name: clientsTable.last_name })
      .from(clientsTable)
      .where(eq(clientsTable.id, updated[0].client_id))
      .limit(1);

    return res.json({
      ...updated[0],
      client_name: `${client[0]?.first_name || ""} ${client[0]?.last_name || ""}`.trim(),
      subtotal: parseFloat(updated[0].subtotal),
      tips: parseFloat(updated[0].tips),
      total: parseFloat(updated[0].total),
    });
  } catch (err) {
    console.error("Update invoice error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to update invoice" });
  }
});

router.post("/:id/send", requireAuth, async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);

    const updated = await db
      .update(invoicesTable)
      .set({ status: "sent" })
      .where(and(
        eq(invoicesTable.id, invoiceId),
        eq(invoicesTable.company_id, req.auth!.companyId)
      ))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: "Not Found", message: "Invoice not found" });
    }

    const client = await db
      .select({ first_name: clientsTable.first_name, last_name: clientsTable.last_name })
      .from(clientsTable)
      .where(eq(clientsTable.id, updated[0].client_id))
      .limit(1);

    return res.json({
      ...updated[0],
      client_name: `${client[0]?.first_name || ""} ${client[0]?.last_name || ""}`.trim(),
      subtotal: parseFloat(updated[0].subtotal),
      tips: parseFloat(updated[0].tips),
      total: parseFloat(updated[0].total),
    });
  } catch (err) {
    console.error("Send invoice error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to send invoice" });
  }
});

export default router;
