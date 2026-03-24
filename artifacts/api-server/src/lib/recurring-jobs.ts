import { db } from "@workspace/db";
import { recurringSchedulesTable, jobsTable } from "@workspace/db/schema";
import { eq, and, gte, sql, inArray } from "drizzle-orm";

const WEEKS_AHEAD = 8;
const MIN_FUTURE_JOBS = 4;

const DAY_NAME_TO_NUM: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function mapServiceType(raw: string | null): string {
  if (!raw) return "recurring";
  const s = raw.toLowerCase().trim();
  if (s.includes("deep")) return "deep_clean";
  if (s.includes("move out") || s.includes("move-out")) return "move_out";
  if (s.includes("move in") || s.includes("move-in")) return "move_in";
  if (s.includes("post construct") || s.includes("post-construct")) return "post_construction";
  if (s.includes("commercial") || s.includes("office")) return "office_cleaning";
  if (s.includes("common")) return "common_areas";
  if (s.includes("retail")) return "retail_store";
  if (s.includes("medical")) return "medical_office";
  if (s.includes("standard") || s.includes("regular")) return "standard_clean";
  return "recurring";
}

function mapFrequency(freq: string): string {
  if (freq === "weekly") return "weekly";
  if (freq === "biweekly") return "biweekly";
  if (freq === "monthly") return "monthly";
  return "biweekly"; // custom → treat as biweekly
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getFirstOccurrence(startDate: Date, targetDow: number, fromDate: Date): Date {
  let d = new Date(fromDate);
  // Snap to the target day-of-week >= fromDate
  const diff = (targetDow - d.getDay() + 7) % 7;
  d = addDays(d, diff);
  return d;
}

function generateOccurrences(
  schedule: { frequency: string; day_of_week: string | null; start_date: string; end_date?: string | null },
  fromDate: Date,
  toDate: Date
): Date[] {
  const start = parseDate(schedule.start_date);
  const endLimit = schedule.end_date ? parseDate(schedule.end_date) : toDate;
  const effectiveEnd = endLimit < toDate ? endLimit : toDate;

  // Determine target day-of-week: prefer explicit day_of_week, fall back to start_date's dow
  const targetDow = schedule.day_of_week
    ? DAY_NAME_TO_NUM[schedule.day_of_week] ?? start.getDay()
    : start.getDay();

  const freq = schedule.frequency;
  const dates: Date[] = [];

  if (freq === "monthly") {
    // Same day-of-month as start_date, monthly
    const dayOfMonth = start.getDate();
    let current = new Date(fromDate.getFullYear(), fromDate.getMonth(), dayOfMonth);
    if (current < fromDate) current = addMonths(current, 1);
    while (current <= effectiveEnd) {
      if (current >= fromDate) dates.push(new Date(current));
      current = addMonths(current, 1);
    }
  } else {
    // weekly / biweekly / custom
    const intervalDays = freq === "weekly" ? 7 : 14;
    let current = getFirstOccurrence(start, targetDow, fromDate);
    while (current <= effectiveEnd) {
      if (current >= fromDate) dates.push(new Date(current));
      current = addDays(current, intervalDays);
    }
  }

  return dates;
}

export async function generateJobsFromSchedule(
  schedule: {
    id: number;
    company_id: number;
    customer_id: number;
    frequency: string;
    day_of_week: string | null;
    start_date: string;
    end_date?: string | null;
    assigned_employee_id: number | null;
    service_type: string | null;
    duration_minutes: number | null;
    base_fee: string | null;
    notes: string | null;
  },
  fromDate: Date,
  toDate: Date
): Promise<number> {
  const occurrences = generateOccurrences(schedule, fromDate, toDate);
  if (!occurrences.length) return 0;

  const datesToCheck = occurrences.map(toDateStr);

  // Find which dates already have a job for this schedule
  const existing = await db
    .select({ scheduled_date: jobsTable.scheduled_date })
    .from(jobsTable)
    .where(
      and(
        eq(jobsTable.company_id, schedule.company_id),
        eq((jobsTable as any).recurring_schedule_id, schedule.id),
        inArray(jobsTable.scheduled_date, datesToCheck)
      )
    );

  const existingDates = new Set(existing.map(r => r.scheduled_date));

  const toInsert = occurrences
    .filter(d => !existingDates.has(toDateStr(d)))
    .map(d => ({
      company_id: schedule.company_id,
      client_id: schedule.customer_id,
      assigned_user_id: schedule.assigned_employee_id ?? null,
      service_type: mapServiceType(schedule.service_type) as any,
      status: "scheduled" as const,
      scheduled_date: toDateStr(d),
      scheduled_time: null,
      frequency: mapFrequency(schedule.frequency) as any,
      base_fee: schedule.base_fee ? parseFloat(schedule.base_fee).toFixed(2) : "0.00",
      allowed_hours: schedule.duration_minutes ? (schedule.duration_minutes / 60).toFixed(2) : null,
      notes: schedule.notes ?? null,
      recurring_schedule_id: schedule.id,
    }));

  if (!toInsert.length) return 0;

  await db.insert(jobsTable).values(toInsert as any[]);
  return toInsert.length;
}

export async function runRecurringJobGeneration(options: { minFutureJobs?: number } = {}) {
  const threshold = options.minFutureJobs ?? MIN_FUTURE_JOBS;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = addDays(today, WEEKS_AHEAD * 7);
  const horizonStr = toDateStr(horizon);
  const todayStr = toDateStr(today);

  console.log(`[recurring-jobs] Starting generation — window: ${todayStr} → ${horizonStr}`);

  const schedules = await db
    .select()
    .from(recurringSchedulesTable)
    .where(eq(recurringSchedulesTable.is_active, true));

  let total = 0;
  let processed = 0;

  for (const schedule of schedules) {
    // For monthly schedules the 8-week window only yields ~2 jobs; lower threshold accordingly
    const effectiveThreshold = schedule.frequency === "monthly" ? 2 : threshold;

    // Skip if already generated today (idempotency fast-path)
    if (schedule.last_generated_date === todayStr) continue;

    // Count future jobs linked to this schedule
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM jobs
      WHERE recurring_schedule_id = ${schedule.id}
        AND scheduled_date >= ${todayStr}
        AND status != 'cancelled'
    `);
    const existing = parseInt((countResult.rows[0] as any).cnt ?? "0", 10);

    if (existing >= effectiveThreshold) continue;

    const generated = await generateJobsFromSchedule(schedule, today, horizon);
    if (generated > 0) {
      total += generated;
      processed++;
      // Update last_generated_date
      await db
        .update(recurringSchedulesTable)
        .set({ last_generated_date: todayStr })
        .where(eq(recurringSchedulesTable.id, schedule.id));
    }
  }

  console.log(`[recurring-jobs] Done — generated ${total} jobs across ${processed} schedules`);
  return { generated: total, schedules_touched: processed };
}

export function startRecurringJobCron() {
  // Run every Monday at 06:00 using a simple interval check
  function scheduleNext() {
    const now = new Date();
    const next = new Date(now);

    // Find next Monday at 06:00
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7; // days until next Monday
    next.setDate(now.getDate() + daysUntilMonday);
    next.setHours(6, 0, 0, 0);

    const msUntilNext = next.getTime() - now.getTime();
    console.log(`[recurring-jobs] Next cron run scheduled for ${next.toISOString()} (${Math.round(msUntilNext / 3600000)}h from now)`);

    return setTimeout(async () => {
      try {
        await runRecurringJobGeneration({ minFutureJobs: MIN_FUTURE_JOBS });
      } catch (err) {
        console.error("[recurring-jobs] Cron run failed:", err);
      }
      scheduleNext(); // reschedule for next Monday
    }, msUntilNext);
  }

  scheduleNext();
}
