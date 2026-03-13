import { Router } from "express";
import { db } from "@workspace/db";
import { scorecardsTable, usersTable, clientsTable } from "@workspace/db/schema";
import { eq, and, avg, count, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { user_id, client_id } = req.query;
    const conditions: any[] = [eq(scorecardsTable.company_id, req.auth!.companyId)];
    if (user_id) conditions.push(eq(scorecardsTable.user_id, parseInt(user_id as string)));
    if (client_id) conditions.push(eq(scorecardsTable.client_id, parseInt(client_id as string)));

    const scorecards = await db
      .select({
        id: scorecardsTable.id,
        job_id: scorecardsTable.job_id,
        user_id: scorecardsTable.user_id,
        user_name: sql<string>`concat(${usersTable.first_name}, ' ', ${usersTable.last_name})`,
        client_id: scorecardsTable.client_id,
        client_name: sql<string>`concat(${clientsTable.first_name}, ' ', ${clientsTable.last_name})`,
        score: scorecardsTable.score,
        comments: scorecardsTable.comments,
        excluded: scorecardsTable.excluded,
        created_at: scorecardsTable.created_at,
      })
      .from(scorecardsTable)
      .leftJoin(usersTable, eq(scorecardsTable.user_id, usersTable.id))
      .leftJoin(clientsTable, eq(scorecardsTable.client_id, clientsTable.id))
      .where(and(...conditions))
      .orderBy(desc(scorecardsTable.created_at));

    const avgResult = await db
      .select({ avg: avg(scorecardsTable.score) })
      .from(scorecardsTable)
      .where(and(...conditions, eq(scorecardsTable.excluded, false)));

    return res.json({
      data: scorecards,
      total: scorecards.length,
      average_score: avgResult[0].avg ? parseFloat(avgResult[0].avg) : null,
    });
  } catch (err) {
    console.error("List scorecards error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to list scorecards" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { job_id, user_id, client_id, score, comments, excluded = false } = req.body;

    const newScorecard = await db
      .insert(scorecardsTable)
      .values({
        company_id: req.auth!.companyId,
        job_id,
        user_id,
        client_id,
        score,
        comments,
        excluded,
      })
      .returning();

    const user = await db
      .select({ first_name: usersTable.first_name, last_name: usersTable.last_name })
      .from(usersTable)
      .where(eq(usersTable.id, user_id))
      .limit(1);

    const client = await db
      .select({ first_name: clientsTable.first_name, last_name: clientsTable.last_name })
      .from(clientsTable)
      .where(eq(clientsTable.id, client_id))
      .limit(1);

    return res.status(201).json({
      ...newScorecard[0],
      user_name: `${user[0]?.first_name || ""} ${user[0]?.last_name || ""}`.trim(),
      client_name: `${client[0]?.first_name || ""} ${client[0]?.last_name || ""}`.trim(),
    });
  } catch (err) {
    console.error("Create scorecard error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to create scorecard" });
  }
});

export default router;
