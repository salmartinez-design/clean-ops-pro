import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, jobsTable, scorecardsTable, timeclockTable,
  clientsTable, clientRatingsTable, invoicesTable,
} from "@workspace/db/schema";
import { eq, and, gte, lte, desc, count, avg, sum, sql, lt, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

router.get("/insights", requireAuth, requireRole("owner", "admin", "office"), async (req, res) => {
  try {
    const companyId = req.auth!.companyId!;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
    const dateStr30 = thirtyDaysAgo.toISOString().split("T")[0];
    const dateStr7 = sevenDaysAgo.toISOString().split("T")[0];
    const dateStr45 = fortyFiveDaysAgo.toISOString().split("T")[0];
    const todayStr = now.toISOString().split("T")[0];

    // Top performers: score avg + jobs completed + client ratings this week
    const topPerformers = await db
      .select({
        id: usersTable.id,
        first_name: usersTable.first_name,
        last_name: usersTable.last_name,
        avatar_url: usersTable.avatar_url,
        jobs_completed: count(jobsTable.id),
        avg_score: avg(scorecardsTable.score),
      })
      .from(usersTable)
      .leftJoin(jobsTable, and(
        eq(jobsTable.assigned_user_id, usersTable.id),
        eq(jobsTable.status, "complete"),
        gte(jobsTable.scheduled_date, dateStr7),
      ))
      .leftJoin(scorecardsTable, and(
        eq(scorecardsTable.user_id, usersTable.id),
        gte(scorecardsTable.created_at, sevenDaysAgo),
        eq(scorecardsTable.excluded, false),
      ))
      .where(and(eq(usersTable.company_id, companyId), eq(usersTable.is_active, true)))
      .groupBy(usersTable.id)
      .orderBy(desc(count(jobsTable.id)))
      .limit(5);

    // Concern alerts — employees with low scores or late clock-ins
    const lateClockins = await db
      .select({
        user_id: timeclockTable.user_id,
        late_count: count(timeclockTable.id),
      })
      .from(timeclockTable)
      .where(and(
        eq(timeclockTable.company_id, companyId),
        eq(timeclockTable.flagged, true),
        gte(timeclockTable.clock_in_at, thirtyDaysAgo),
      ))
      .groupBy(timeclockTable.user_id);

    const lowScorecards = await db
      .select({
        user_id: scorecardsTable.user_id,
        avg_score: avg(scorecardsTable.score),
      })
      .from(scorecardsTable)
      .where(and(
        eq(scorecardsTable.company_id, companyId),
        gte(scorecardsTable.created_at, thirtyDaysAgo),
        eq(scorecardsTable.excluded, false),
      ))
      .groupBy(scorecardsTable.user_id)
      .having(sql`avg(${scorecardsTable.score}) < 3.0`);

    const concernUserIds = new Set([
      ...lateClockins.map(l => l.user_id),
      ...lowScorecards.map(l => l.user_id),
    ]);

    const concernUserIdList = [...concernUserIds];
    const concernEmployees = concernUserIdList.length > 0
      ? await db
          .select({ id: usersTable.id, first_name: usersTable.first_name, last_name: usersTable.last_name, avatar_url: usersTable.avatar_url })
          .from(usersTable)
          .where(and(eq(usersTable.company_id, companyId), inArray(usersTable.id, concernUserIdList)))
      : [];

    const concerns = concernEmployees.map(u => {
      const flags: string[] = [];
      const lc = lateClockins.find(l => l.user_id === u.id);
      if (lc) flags.push(`${lc.late_count} flagged clock-in${lc.late_count > 1 ? 's' : ''} this month`);
      const ls = lowScorecards.find(l => l.user_id === u.id);
      if (ls) flags.push(`Score avg ${parseFloat(ls.avg_score || '0').toFixed(1)}/4.0 (below 3.0)`);
      return { ...u, concerns: flags };
    });

    // Client health: no booking in 45+ days (recurring), last job had low rating
    const lastJobPerClient = await db
      .select({
        client_id: jobsTable.client_id,
        last_date: sql<string>`max(${jobsTable.scheduled_date})`,
      })
      .from(jobsTable)
      .where(and(
        eq(jobsTable.company_id, companyId),
        eq(jobsTable.status, "complete"),
      ))
      .groupBy(jobsTable.client_id);

    const atRiskClients = lastJobPerClient.filter(j => j.last_date < dateStr45).slice(0, 5);
    const atRiskClientIds = atRiskClients.map(j => j.client_id);

    const atRiskClientDetails = atRiskClientIds.length > 0
      ? await db
          .select({ id: clientsTable.id, first_name: clientsTable.first_name, last_name: clientsTable.last_name, email: clientsTable.email })
          .from(clientsTable)
          .where(inArray(clientsTable.id, atRiskClientIds as number[]))
      : [];

    const clientHealth = atRiskClientDetails.map(c => {
      const last = atRiskClients.find(j => j.client_id === c.id);
      const daysSince = last ? Math.floor((now.getTime() - new Date(last.last_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      return { ...c, reason: `No booking in ${daysSince} days`, days_since: daysSince };
    });

    // Revenue insights: by service type + today's scheduled revenue
    const revenueByService = await db
      .select({
        service_type: jobsTable.service_type,
        total_revenue: sum(jobsTable.base_fee),
        job_count: count(jobsTable.id),
      })
      .from(jobsTable)
      .where(and(
        eq(jobsTable.company_id, companyId),
        eq(jobsTable.status, "complete"),
        gte(jobsTable.scheduled_date, dateStr30),
      ))
      .groupBy(jobsTable.service_type)
      .orderBy(desc(sum(jobsTable.base_fee)));

    const avgJobValue = await db
      .select({ avg: avg(jobsTable.base_fee) })
      .from(jobsTable)
      .where(and(
        eq(jobsTable.company_id, companyId),
        eq(jobsTable.status, "complete"),
        gte(jobsTable.scheduled_date, dateStr30),
      ));

    const projectedRevenue = await db
      .select({ projected: sum(jobsTable.base_fee) })
      .from(jobsTable)
      .where(and(
        eq(jobsTable.company_id, companyId),
        eq(jobsTable.status, "scheduled"),
        gte(jobsTable.scheduled_date, todayStr),
      ));

    return res.json({
      top_performers: topPerformers.map(p => ({
        ...p,
        avg_score: p.avg_score ? parseFloat(p.avg_score) : null,
        jobs_completed: Number(p.jobs_completed),
      })),
      concerns,
      client_health: clientHealth,
      revenue_by_service: revenueByService.map(r => ({
        service_type: r.service_type,
        total_revenue: parseFloat(r.total_revenue || '0'),
        job_count: Number(r.job_count),
      })),
      avg_job_value: parseFloat(avgJobValue[0]?.avg || '0'),
      projected_revenue: parseFloat(projectedRevenue[0]?.projected || '0'),
    });
  } catch (err) {
    console.error("Reports insights error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
