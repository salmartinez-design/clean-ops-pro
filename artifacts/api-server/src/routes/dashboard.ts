import { Router } from "express";
import { db } from "@workspace/db";
import { jobsTable, clientsTable, usersTable, invoicesTable, timeclockTable, scorecardsTable } from "@workspace/db/schema";
import { eq, and, gte, lte, lt, isNull, count, sum, avg, desc, sql, isNotNull } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/metrics", requireAuth, async (req, res) => {
  try {
    const { period = "week" } = req.query;

    const now = new Date();
    let dateFrom: Date;
    switch (period) {
      case "today":
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "month":
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        dateFrom = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const dateFromStr = dateFrom.toISOString().split("T")[0];

    const [scheduledCount, inProgressCount, completedCount, cancelledCount] = await Promise.all([
      db.select({ count: count() }).from(jobsTable).where(and(eq(jobsTable.company_id, req.auth!.companyId), eq(jobsTable.status, "scheduled"), gte(jobsTable.scheduled_date, dateFromStr))),
      db.select({ count: count() }).from(jobsTable).where(and(eq(jobsTable.company_id, req.auth!.companyId), eq(jobsTable.status, "in_progress"))),
      db.select({ count: count() }).from(jobsTable).where(and(eq(jobsTable.company_id, req.auth!.companyId), eq(jobsTable.status, "complete"), gte(jobsTable.scheduled_date, dateFromStr))),
      db.select({ count: count() }).from(jobsTable).where(and(eq(jobsTable.company_id, req.auth!.companyId), eq(jobsTable.status, "cancelled"), gte(jobsTable.scheduled_date, dateFromStr))),
    ]);

    const revenueResult = await db
      .select({ total: sum(invoicesTable.total), tips: sum(invoicesTable.tips) })
      .from(invoicesTable)
      .where(and(
        eq(invoicesTable.company_id, req.auth!.companyId),
        eq(invoicesTable.status, "paid"),
        gte(invoicesTable.created_at, dateFrom)
      ));

    const activeClients = await db
      .select({ count: count() })
      .from(clientsTable)
      .where(eq(clientsTable.company_id, req.auth!.companyId));

    const activeEmployees = await db
      .select({ count: count() })
      .from(usersTable)
      .where(and(
        eq(usersTable.company_id, req.auth!.companyId),
        eq(usersTable.is_active, true)
      ));

    const scoreAvg = await db
      .select({ avg: avg(scorecardsTable.score) })
      .from(scorecardsTable)
      .where(and(
        eq(scorecardsTable.company_id, req.auth!.companyId),
        eq(scorecardsTable.excluded, false),
        gte(scorecardsTable.created_at, dateFrom)
      ));

    const flaggedCount = await db
      .select({ count: count() })
      .from(timeclockTable)
      .where(and(
        eq(timeclockTable.company_id, req.auth!.companyId),
        eq(timeclockTable.flagged, true),
        gte(timeclockTable.clock_in_at, dateFrom)
      ));

    const topEmployees = await db
      .select({
        user_id: usersTable.id,
        name: sql<string>`concat(${usersTable.first_name}, ' ', ${usersTable.last_name})`,
        jobs_completed: count(jobsTable.id),
      })
      .from(usersTable)
      .leftJoin(jobsTable, and(
        eq(jobsTable.assigned_user_id, usersTable.id),
        eq(jobsTable.status, "complete"),
        gte(jobsTable.scheduled_date, dateFromStr)
      ))
      .where(and(
        eq(usersTable.company_id, req.auth!.companyId),
        eq(usersTable.is_active, true)
      ))
      .groupBy(usersTable.id)
      .orderBy(desc(count(jobsTable.id)))
      .limit(5);

    const recentJobs = await db
      .select({
        id: jobsTable.id,
        client_id: jobsTable.client_id,
        client_name: sql<string>`concat(${clientsTable.first_name}, ' ', ${clientsTable.last_name})`,
        assigned_user_id: jobsTable.assigned_user_id,
        assigned_user_name: sql<string>`concat(${usersTable.first_name}, ' ', ${usersTable.last_name})`,
        service_type: jobsTable.service_type,
        status: jobsTable.status,
        scheduled_date: jobsTable.scheduled_date,
        scheduled_time: jobsTable.scheduled_time,
        frequency: jobsTable.frequency,
        base_fee: jobsTable.base_fee,
        allowed_hours: jobsTable.allowed_hours,
        actual_hours: jobsTable.actual_hours,
        notes: jobsTable.notes,
        created_at: jobsTable.created_at,
      })
      .from(jobsTable)
      .leftJoin(clientsTable, eq(jobsTable.client_id, clientsTable.id))
      .leftJoin(usersTable, eq(jobsTable.assigned_user_id, usersTable.id))
      .where(eq(jobsTable.company_id, req.auth!.companyId))
      .orderBy(desc(jobsTable.created_at))
      .limit(10);

    return res.json({
      period,
      jobs_scheduled: scheduledCount[0].count,
      jobs_completed: completedCount[0].count,
      jobs_in_progress: inProgressCount[0].count,
      jobs_cancelled: cancelledCount[0].count,
      total_revenue: parseFloat(revenueResult[0]?.total || "0"),
      total_tips: parseFloat(revenueResult[0]?.tips || "0"),
      active_clients: activeClients[0].count,
      active_employees: activeEmployees[0].count,
      avg_job_score: scoreAvg[0].avg ? parseFloat(scoreAvg[0].avg) : null,
      flagged_clock_ins: flaggedCount[0].count,
      top_employees: topEmployees.map(e => ({ ...e, avg_score: null })),
      recent_jobs: recentJobs.map(j => ({
        ...j,
        before_photo_count: 0,
        after_photo_count: 0,
      })),
    });
  } catch (err) {
    console.error("Dashboard metrics error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to get dashboard metrics" });
  }
});

router.get("/today", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId!;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Today's job counts by status
    const [todayJobs, inProgress, complete, cancelled, scheduled] = await Promise.all([
      db.select({
        id: jobsTable.id,
        status: jobsTable.status,
        scheduled_time: jobsTable.scheduled_time,
        assigned_user_id: jobsTable.assigned_user_id,
        client_name: sql<string>`concat(${clientsTable.first_name},' ',${clientsTable.last_name})`,
        base_fee: jobsTable.base_fee,
      })
        .from(jobsTable)
        .leftJoin(clientsTable, eq(jobsTable.client_id, clientsTable.id))
        .where(and(eq(jobsTable.company_id, companyId), eq(jobsTable.scheduled_date, todayStr))),
      db.select({ c: count() }).from(jobsTable).where(and(eq(jobsTable.company_id, companyId), eq(jobsTable.status, "in_progress"), eq(jobsTable.scheduled_date, todayStr))),
      db.select({ c: count() }).from(jobsTable).where(and(eq(jobsTable.company_id, companyId), eq(jobsTable.status, "complete"), eq(jobsTable.scheduled_date, todayStr))),
      db.select({ c: count() }).from(jobsTable).where(and(eq(jobsTable.company_id, companyId), eq(jobsTable.status, "cancelled"), eq(jobsTable.scheduled_date, todayStr))),
      db.select({ c: count() }).from(jobsTable).where(and(eq(jobsTable.company_id, companyId), eq(jobsTable.status, "scheduled"), eq(jobsTable.scheduled_date, todayStr))),
    ]);

    // Today's revenue (complete jobs' base_fee sum)
    const todayRevenue = todayJobs.filter(j => j.status === 'complete').reduce((s, j) => s + parseFloat(j.base_fee || '0'), 0);

    // Flagged clocks (unresolved)
    const flagged = await db
      .select({
        id: timeclockTable.id,
        user_id: timeclockTable.user_id,
        distance_ft: timeclockTable.distance_from_job_ft,
        user_name: sql<string>`concat(${usersTable.first_name},' ',${usersTable.last_name})`,
      })
      .from(timeclockTable)
      .leftJoin(usersTable, eq(timeclockTable.user_id, usersTable.id))
      .where(and(eq(timeclockTable.company_id, companyId), eq(timeclockTable.flagged, true), gte(timeclockTable.clock_in_at, new Date(todayStr))))
      .limit(5);

    // Overdue invoices
    const overdueInvoices = await db
      .select({
        id: invoicesTable.id,
        total: invoicesTable.total,
        client_name: sql<string>`concat(${clientsTable.first_name},' ',${clientsTable.last_name})`,
        created_at: invoicesTable.created_at,
      })
      .from(invoicesTable)
      .leftJoin(clientsTable, eq(invoicesTable.client_id, clientsTable.id))
      .where(and(eq(invoicesTable.company_id, companyId), eq(invoicesTable.status, "overdue")))
      .limit(5);

    // Employees with jobs today — check active timeclock
    const allEmployees = await db
      .select({
        id: usersTable.id,
        first_name: usersTable.first_name,
        last_name: usersTable.last_name,
        avatar_url: usersTable.avatar_url,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(and(eq(usersTable.company_id, companyId), eq(usersTable.is_active, true)));

    const activeClockins = await db
      .select({
        user_id: timeclockTable.user_id,
        clock_in_at: timeclockTable.clock_in_at,
        job_id: timeclockTable.job_id,
      })
      .from(timeclockTable)
      .where(and(
        eq(timeclockTable.company_id, companyId),
        gte(timeclockTable.clock_in_at, new Date(todayStr)),
        isNull(timeclockTable.clock_out_at),
      ));

    const nowMs = now.getTime();
    const employeeBoard = allEmployees.map(emp => {
      const empJobs = todayJobs.filter(j => j.assigned_user_id === emp.id);
      const activeClock = activeClockins.find(c => c.user_id === emp.id);
      const currentJob = empJobs.find(j => j.status === 'in_progress') || (activeClock ? empJobs[0] : null);

      let status: string;
      let detail = '';

      if (activeClock) {
        status = 'ON JOB';
        const elapsedMin = Math.floor((nowMs - new Date(activeClock.clock_in_at).getTime()) / 60000);
        const h = Math.floor(elapsedMin / 60), m = elapsedMin % 60;
        detail = currentJob ? `${currentJob.client_name} · ${h}h ${m}m` : `${elapsedMin}min elapsed`;
      } else if (empJobs.length === 0) {
        status = 'OFF TODAY';
      } else if (empJobs.every(j => j.status === 'complete')) {
        status = 'COMPLETE';
      } else {
        // Check if next job starts within 30 min
        const nextJob = empJobs.find(j => j.status === 'scheduled' && j.scheduled_time);
        if (nextJob?.scheduled_time) {
          const [h, m] = nextJob.scheduled_time.split(':').map(Number);
          const jobMs = new Date(todayStr + 'T00:00:00').setHours(h, m);
          const diffMin = (jobMs - nowMs) / 60000;
          if (diffMin > 0 && diffMin <= 30) {
            status = 'EN ROUTE';
            detail = `Job in ${Math.floor(diffMin)}min`;
          } else {
            status = 'SCHEDULED';
            detail = `${empJobs.length} job${empJobs.length > 1 ? 's' : ''} today`;
          }
        } else {
          status = 'SCHEDULED';
          detail = `${empJobs.length} job${empJobs.length > 1 ? 's' : ''} today`;
        }
      }

      return { ...emp, status, detail, job_count: empJobs.length };
    });

    // Auto-generate alerts
    const alerts: { type: string; message: string; action: string; id?: number }[] = [];

    // Employees not clocked in with imminent jobs
    const now15min = new Date(nowMs + 15 * 60 * 1000);
    for (const emp of employeeBoard) {
      if (emp.status === 'SCHEDULED') {
        const empJobs = todayJobs.filter(j => j.assigned_user_id === emp.id && j.scheduled_time);
        for (const job of empJobs) {
          const [h, m] = (job.scheduled_time || '').split(':').map(Number);
          const jobMs = new Date(todayStr + 'T00:00:00').setHours(h, m);
          if (jobMs <= now15min.getTime() && jobMs >= nowMs - 15 * 60 * 1000) {
            alerts.push({
              type: 'warning',
              message: `${emp.first_name} ${emp.last_name} hasn't clocked in — job starts${jobMs > nowMs ? ` in ${Math.floor((jobMs - nowMs) / 60000)} min` : ' now'}`,
              action: 'call_employee',
              id: emp.id,
            });
          }
        }
      }
    }

    for (const inv of overdueInvoices) {
      const daysAgo = Math.floor((nowMs - new Date(inv.created_at).getTime()) / (1000 * 60 * 60 * 24));
      alerts.push({
        type: 'warning',
        message: `Invoice #${inv.id} overdue by ${daysAgo} days — ${inv.client_name}`,
        action: 'send_invoice',
        id: inv.id,
      });
    }

    for (const flag of flagged) {
      alerts.push({
        type: 'warning',
        message: `Clock-in flagged — ${flag.user_name} was ${flag.distance_ft}ft from job site`,
        action: 'review_clock',
        id: flag.id,
      });
    }

    // En route count
    const enRouteCount = employeeBoard.filter(e => e.status === 'EN ROUTE').length;

    return res.json({
      counts: {
        in_progress: Number(inProgress[0].c),
        scheduled: Number(scheduled[0].c),
        complete: Number(complete[0].c),
        cancelled: Number(cancelled[0].c),
        en_route: enRouteCount,
      },
      today_revenue: todayRevenue,
      alerts,
      employee_board: employeeBoard,
    });
  } catch (err) {
    console.error("Dashboard today error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
