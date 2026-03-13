import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, timeclockTable, additionalPayTable, jobsTable } from "@workspace/db/schema";
import { eq, and, gte, lte, sum, count, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

router.get("/summary", requireAuth, requireRole("owner", "admin", "office"), async (req, res) => {
  try {
    const { pay_period_start, pay_period_end } = req.query;

    if (!pay_period_start || !pay_period_end) {
      return res.status(400).json({ error: "Bad Request", message: "pay_period_start and pay_period_end are required" });
    }

    const employees = await db
      .select()
      .from(usersTable)
      .where(and(
        eq(usersTable.company_id, req.auth!.companyId),
        eq(usersTable.is_active, true)
      ));

    const timeclockData = await db
      .select({
        user_id: timeclockTable.user_id,
        duration: sql<number>`EXTRACT(EPOCH FROM (${timeclockTable.clock_out_at} - ${timeclockTable.clock_in_at})) / 3600`,
      })
      .from(timeclockTable)
      .where(and(
        eq(timeclockTable.company_id, req.auth!.companyId),
        gte(timeclockTable.clock_in_at, new Date(pay_period_start as string)),
        lte(timeclockTable.clock_in_at, new Date(pay_period_end as string))
      ));

    const jobsData = await db
      .select({
        user_id: jobsTable.assigned_user_id,
        cnt: count(),
        total_fee: sum(jobsTable.base_fee),
      })
      .from(jobsTable)
      .where(and(
        eq(jobsTable.company_id, req.auth!.companyId),
        eq(jobsTable.status, "complete"),
        gte(jobsTable.scheduled_date, pay_period_start as string),
        lte(jobsTable.scheduled_date, pay_period_end as string)
      ))
      .groupBy(jobsTable.assigned_user_id);

    const additionalPayData = await db
      .select({
        user_id: additionalPayTable.user_id,
        type: additionalPayTable.type,
        total: sum(additionalPayTable.amount),
      })
      .from(additionalPayTable)
      .where(and(
        eq(additionalPayTable.company_id, req.auth!.companyId),
        gte(additionalPayTable.created_at, new Date(pay_period_start as string)),
        lte(additionalPayTable.created_at, new Date(pay_period_end as string))
      ))
      .groupBy(additionalPayTable.user_id, additionalPayTable.type);

    const hoursMap = new Map<number, number>();
    for (const row of timeclockData) {
      const current = hoursMap.get(row.user_id) || 0;
      hoursMap.set(row.user_id, current + (row.duration || 0));
    }

    const jobsMap = new Map<number, { count: number; total_fee: number }>();
    for (const row of jobsData) {
      if (row.user_id) {
        jobsMap.set(row.user_id, { count: row.cnt, total_fee: parseFloat(row.total_fee || "0") });
      }
    }

    const additionalMap = new Map<number, Record<string, number>>();
    for (const row of additionalPayData) {
      if (!additionalMap.has(row.user_id)) additionalMap.set(row.user_id, {});
      const entry = additionalMap.get(row.user_id)!;
      entry[row.type] = parseFloat(row.total || "0");
    }

    const payrollEmployees = employees.map(emp => {
      const hours = hoursMap.get(emp.id) || 0;
      const jobs = jobsMap.get(emp.id) || { count: 0, total_fee: 0 };
      const additional = additionalMap.get(emp.id) || {};
      const payRate = parseFloat(emp.pay_rate || "0");

      let base_pay = 0;
      if (emp.pay_type === "hourly") {
        base_pay = hours * payRate;
      } else if (emp.pay_type === "per_job") {
        base_pay = jobs.count * payRate;
      } else if (emp.pay_type === "fee_split") {
        const splitPct = parseFloat(emp.fee_split_pct || "0") / 100;
        base_pay = jobs.total_fee * splitPct;
      }

      const tips = additional.tips || 0;
      const bonuses = additional.bonus || 0;
      const sick_pay = additional.sick_pay || 0;
      const holiday_pay = additional.holiday_pay || 0;
      const vacation_pay = additional.vacation_pay || 0;
      const deductions = additional.amount_owed || 0;
      const gross_pay = base_pay + tips + bonuses + sick_pay + holiday_pay + vacation_pay - deductions;

      return {
        user_id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        pay_type: emp.pay_type || "hourly",
        pay_rate: payRate,
        hours_worked: Math.round(hours * 100) / 100,
        jobs_completed: jobs.count,
        base_pay: Math.round(base_pay * 100) / 100,
        tips,
        bonuses,
        sick_pay,
        holiday_pay,
        vacation_pay,
        deductions,
        gross_pay: Math.round(gross_pay * 100) / 100,
      };
    });

    const total_gross = payrollEmployees.reduce((s, e) => s + e.gross_pay, 0);
    const total_hours = payrollEmployees.reduce((s, e) => s + e.hours_worked, 0);
    const total_jobs = payrollEmployees.reduce((s, e) => s + e.jobs_completed, 0);

    return res.json({
      pay_period_start,
      pay_period_end,
      employees: payrollEmployees,
      total_gross: Math.round(total_gross * 100) / 100,
      total_hours: Math.round(total_hours * 100) / 100,
      total_jobs,
    });
  } catch (err) {
    console.error("Payroll summary error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to get payroll summary" });
  }
});

export default router;
