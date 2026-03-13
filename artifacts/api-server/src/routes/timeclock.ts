import { Router } from "express";
import { db } from "@workspace/db";
import { timeclockTable, usersTable, jobsTable, clientsTable, companiesTable } from "@workspace/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

function calculateDistanceFt(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3963.1;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const miles = R * c;
  return Math.round(miles * 5280);
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const { user_id, job_id, flagged, date_from, date_to } = req.query;

    const conditions: any[] = [eq(timeclockTable.company_id, req.auth!.companyId)];
    if (user_id) conditions.push(eq(timeclockTable.user_id, parseInt(user_id as string)));
    if (job_id) conditions.push(eq(timeclockTable.job_id, parseInt(job_id as string)));
    if (flagged !== undefined) conditions.push(eq(timeclockTable.flagged, flagged === "true"));
    if (date_from) conditions.push(gte(timeclockTable.clock_in_at, new Date(date_from as string)));
    if (date_to) conditions.push(lte(timeclockTable.clock_in_at, new Date(date_to as string)));

    const entries = await db
      .select({
        id: timeclockTable.id,
        job_id: timeclockTable.job_id,
        user_id: timeclockTable.user_id,
        user_name: sql<string>`concat(${usersTable.first_name}, ' ', ${usersTable.last_name})`,
        clock_in_at: timeclockTable.clock_in_at,
        clock_out_at: timeclockTable.clock_out_at,
        clock_in_lat: timeclockTable.clock_in_lat,
        clock_in_lng: timeclockTable.clock_in_lng,
        clock_out_lat: timeclockTable.clock_out_lat,
        clock_out_lng: timeclockTable.clock_out_lng,
        distance_from_job_ft: timeclockTable.distance_from_job_ft,
        flagged: timeclockTable.flagged,
      })
      .from(timeclockTable)
      .leftJoin(usersTable, eq(timeclockTable.user_id, usersTable.id))
      .where(and(...conditions))
      .orderBy(desc(timeclockTable.clock_in_at));

    return res.json({
      data: entries.map(e => ({
        ...e,
        distance_from_job_ft: e.distance_from_job_ft ? parseFloat(e.distance_from_job_ft) : null,
        duration_hours: e.clock_out_at
          ? (new Date(e.clock_out_at).getTime() - new Date(e.clock_in_at).getTime()) / 3600000
          : null,
      })),
      total: entries.length,
    });
  } catch (err) {
    console.error("List timeclock error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to list timeclock" });
  }
});

router.post("/clock-in", requireAuth, async (req, res) => {
  try {
    const { job_id, lat, lng } = req.body;

    const job = await db
      .select()
      .from(jobsTable)
      .leftJoin(clientsTable, eq(jobsTable.client_id, clientsTable.id))
      .where(and(
        eq(jobsTable.id, job_id),
        eq(jobsTable.company_id, req.auth!.companyId)
      ))
      .limit(1);

    if (!job[0]) {
      return res.status(404).json({ error: "Not Found", message: "Job not found" });
    }

    const company = await db
      .select({ geo_fence_threshold_ft: companiesTable.geo_fence_threshold_ft })
      .from(companiesTable)
      .where(eq(companiesTable.id, req.auth!.companyId))
      .limit(1);

    const threshold = company[0]?.geo_fence_threshold_ft || 500;

    let distance_from_job_ft: number | null = null;
    let flagged = false;

    if (lat && lng && job[0].clients?.lat && job[0].clients?.lng) {
      distance_from_job_ft = calculateDistanceFt(
        parseFloat(lat),
        parseFloat(lng),
        parseFloat(job[0].clients.lat),
        parseFloat(job[0].clients.lng)
      );
      flagged = distance_from_job_ft > threshold;
    }

    const entry = await db
      .insert(timeclockTable)
      .values({
        job_id,
        user_id: req.auth!.userId,
        company_id: req.auth!.companyId,
        clock_in_lat: lat?.toString(),
        clock_in_lng: lng?.toString(),
        distance_from_job_ft: distance_from_job_ft?.toString(),
        flagged,
      })
      .returning();

    const user = await db
      .select({ first_name: usersTable.first_name, last_name: usersTable.last_name })
      .from(usersTable)
      .where(eq(usersTable.id, req.auth!.userId))
      .limit(1);

    return res.status(201).json({
      ...entry[0],
      user_name: `${user[0]?.first_name || ""} ${user[0]?.last_name || ""}`.trim(),
      distance_from_job_ft,
      duration_hours: null,
    });
  } catch (err) {
    console.error("Clock in error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to clock in" });
  }
});

router.post("/:id/clock-out", requireAuth, async (req, res) => {
  try {
    const entryId = parseInt(req.params.id);
    const { lat, lng } = req.body;

    const updated = await db
      .update(timeclockTable)
      .set({
        clock_out_at: new Date(),
        clock_out_lat: lat?.toString(),
        clock_out_lng: lng?.toString(),
      })
      .where(and(
        eq(timeclockTable.id, entryId),
        eq(timeclockTable.company_id, req.auth!.companyId)
      ))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: "Not Found", message: "Time clock entry not found" });
    }

    const user = await db
      .select({ first_name: usersTable.first_name, last_name: usersTable.last_name })
      .from(usersTable)
      .where(eq(usersTable.id, updated[0].user_id))
      .limit(1);

    const durationHours = updated[0].clock_out_at
      ? (new Date(updated[0].clock_out_at).getTime() - new Date(updated[0].clock_in_at).getTime()) / 3600000
      : null;

    return res.json({
      ...updated[0],
      user_name: `${user[0]?.first_name || ""} ${user[0]?.last_name || ""}`.trim(),
      distance_from_job_ft: updated[0].distance_from_job_ft ? parseFloat(updated[0].distance_from_job_ft) : null,
      duration_hours: durationHours,
    });
  } catch (err) {
    console.error("Clock out error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to clock out" });
  }
});

export default router;
