import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable, jobsTable, usersTable, invoicesTable } from "@workspace/db/schema";
import { eq, and, ilike, or, count, sum, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { search, page = "1", limit = "25" } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const conditions = [eq(clientsTable.company_id, req.auth!.companyId)];
    if (search) {
      conditions.push(
        or(
          ilike(clientsTable.first_name, `%${search}%`),
          ilike(clientsTable.last_name, `%${search}%`),
          ilike(clientsTable.email, `%${search}%`),
          ilike(clientsTable.phone, `%${search}%`)
        ) as any
      );
    }

    const clients = await db
      .select()
      .from(clientsTable)
      .where(and(...conditions))
      .orderBy(clientsTable.last_name, clientsTable.first_name)
      .limit(parseInt(limit as string))
      .offset(offset);

    const totalResult = await db
      .select({ count: count() })
      .from(clientsTable)
      .where(and(...conditions));

    return res.json({
      data: clients,
      total: totalResult[0].count,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
  } catch (err) {
    console.error("List clients error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to list clients" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { first_name, last_name, email, phone, address, city, state, zip, notes } = req.body;

    const newClient = await db
      .insert(clientsTable)
      .values({
        company_id: req.auth!.companyId,
        first_name,
        last_name,
        email,
        phone,
        address,
        city,
        state,
        zip,
        notes,
      })
      .returning();

    return res.status(201).json(newClient[0]);
  } catch (err) {
    console.error("Create client error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to create client" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    const client = await db
      .select()
      .from(clientsTable)
      .where(and(
        eq(clientsTable.id, clientId),
        eq(clientsTable.company_id, req.auth!.companyId)
      ))
      .limit(1);

    if (!client[0]) {
      return res.status(404).json({ error: "Not Found", message: "Client not found" });
    }

    const recentJobs = await db
      .select({
        id: jobsTable.id,
        service_type: jobsTable.service_type,
        status: jobsTable.status,
        scheduled_date: jobsTable.scheduled_date,
        client_name: sql<string>`concat(${clientsTable.first_name}, ' ', ${clientsTable.last_name})`,
        base_fee: jobsTable.base_fee,
      })
      .from(jobsTable)
      .leftJoin(clientsTable, eq(jobsTable.client_id, clientsTable.id))
      .where(and(
        eq(jobsTable.client_id, clientId),
        eq(jobsTable.company_id, req.auth!.companyId)
      ))
      .orderBy(desc(jobsTable.scheduled_date))
      .limit(10);

    const stats = await db
      .select({
        total_jobs: count(),
        total_revenue: sum(invoicesTable.total),
      })
      .from(jobsTable)
      .leftJoin(invoicesTable, eq(invoicesTable.job_id, jobsTable.id))
      .where(and(
        eq(jobsTable.client_id, clientId),
        eq(jobsTable.company_id, req.auth!.companyId)
      ));

    const lastJob = await db
      .select({ scheduled_date: jobsTable.scheduled_date })
      .from(jobsTable)
      .where(and(
        eq(jobsTable.client_id, clientId),
        eq(jobsTable.status, "complete")
      ))
      .orderBy(desc(jobsTable.scheduled_date))
      .limit(1);

    return res.json({
      ...client[0],
      recent_jobs: recentJobs,
      total_jobs: stats[0].total_jobs,
      total_revenue: stats[0].total_revenue ? parseFloat(stats[0].total_revenue) : 0,
      last_service_date: lastJob[0]?.scheduled_date || null,
      assigned_cleaner: null,
    });
  } catch (err) {
    console.error("Get client error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to get client" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const { first_name, last_name, email, phone, address, city, state, zip, notes } = req.body;

    const updated = await db
      .update(clientsTable)
      .set({
        ...(first_name && { first_name }),
        ...(last_name && { last_name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zip !== undefined && { zip }),
        ...(notes !== undefined && { notes }),
      })
      .where(and(
        eq(clientsTable.id, clientId),
        eq(clientsTable.company_id, req.auth!.companyId)
      ))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: "Not Found", message: "Client not found" });
    }

    return res.json(updated[0]);
  } catch (err) {
    console.error("Update client error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to update client" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    await db
      .delete(clientsTable)
      .where(and(
        eq(clientsTable.id, clientId),
        eq(clientsTable.company_id, req.auth!.companyId)
      ));
    return res.json({ success: true, message: "Client deleted" });
  } catch (err) {
    console.error("Delete client error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to delete client" });
  }
});

export default router;
