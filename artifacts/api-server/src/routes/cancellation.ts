import { Router } from "express";
import { db } from "@workspace/db";
import { cancellationLogTable, jobsTable, clientsTable, usersTable } from "@workspace/db/schema";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

const REASON_MAP: Record<string, "customer_request" | "no_show" | "weather" | "emergency" | "other"> = {
  client_request: "customer_request",
  customer_request: "customer_request",
  no_show_client: "no_show",
  no_show_tech: "no_show",
  no_show: "no_show",
  weather: "weather",
  tech_unavailable: "other",
  emergency: "emergency",
  other: "other",
};

// GET /api/cancellations/reschedule-count — count reschedule records for a client in last N days
router.get("/reschedule-count", requireAuth, async (req, res) => {
  try {
    const { client_id, days = "90" } = req.query;
    if (!client_id) return res.status(400).json({ error: "client_id required" });
    const companyId = req.auth!.companyId;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days as string));
    const cutoffStr = cutoff.toISOString();

    const rows = await db
      .select({ cnt: count() })
      .from(cancellationLogTable)
      .where(and(
        eq(cancellationLogTable.company_id, companyId),
        eq(cancellationLogTable.customer_id, parseInt(client_id as string)),
        gte(cancellationLogTable.cancelled_at, new Date(cutoffStr)),
        sql`${cancellationLogTable.notes} ILIKE 'Rescheduled to%'`,
      ));

    return res.json({ count: rows[0]?.cnt ?? 0 });
  } catch (err) {
    console.error("[cancellations/reschedule-count]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/cancellations — list with filters
router.get("/", requireAuth, async (req, res) => {
  try {
    const { date_from, date_to, customer_id, employee_id } = req.query;
    const conditions: any[] = [eq(cancellationLogTable.company_id, req.auth!.companyId)];
    if (date_from) conditions.push(sql`${cancellationLogTable.cancelled_at} >= ${date_from as string}`);
    if (date_to) conditions.push(sql`${cancellationLogTable.cancelled_at} <= ${date_to as string}`);
    if (customer_id) conditions.push(eq(cancellationLogTable.customer_id, parseInt(customer_id as string)));

    const rows = await db
      .select({
        id: cancellationLogTable.id,
        job_id: cancellationLogTable.job_id,
        customer_id: cancellationLogTable.customer_id,
        client_name: sql<string>`concat(${clientsTable.first_name}, ' ', ${clientsTable.last_name})`,
        cancelled_by: cancellationLogTable.cancelled_by,
        cancel_reason: cancellationLogTable.cancel_reason,
        cancelled_at: cancellationLogTable.cancelled_at,
        rescheduled_to_job_id: cancellationLogTable.rescheduled_to_job_id,
        notes: cancellationLogTable.notes,
        refund_issued: cancellationLogTable.refund_issued,
      })
      .from(cancellationLogTable)
      .leftJoin(clientsTable, eq(clientsTable.id, cancellationLogTable.customer_id))
      .where(and(...conditions))
      .orderBy(desc(cancellationLogTable.cancelled_at));

    return res.json(rows);
  } catch (err) {
    console.error("[cancellations GET]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/cancellations — log a cancellation or reschedule event
router.post("/", requireAuth, async (req, res) => {
  try {
    const { job_id, customer_id, cancel_reason, notes } = req.body;
    if (!job_id || !customer_id || !cancel_reason) {
      return res.status(400).json({ error: "job_id, customer_id, and cancel_reason required" });
    }
    const companyId = req.auth!.companyId;
    const mappedReason = REASON_MAP[cancel_reason as string] ?? "other";

    const [row] = await db.insert(cancellationLogTable).values({
      company_id: companyId,
      job_id: parseInt(job_id),
      customer_id: parseInt(customer_id),
      cancelled_by: req.auth!.userId,
      cancel_reason: mappedReason,
      notes: notes ?? null,
    }).returning();

    return res.status(201).json(row);
  } catch (err) {
    console.error("[cancellations POST]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
