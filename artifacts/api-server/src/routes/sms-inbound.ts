import { Router } from "express";
import { db } from "@workspace/db";
import {
  clientsTable, jobsTable, scorecardsTable, companiesTable, usersTable, contactTicketsTable,
} from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

const WEIGHT_MAP: Record<number, number> = { 4: 1.0, 3: 0.75, 2: 0.40, 1: 0.0 };
const FLOOR_PCT = 95;
const ROLLING_N = 30;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

async function sendTwilioSms(to: string, from: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });
}

// POST /api/sms/inbound — Twilio webhook for inbound SMS replies
router.post("/", async (req, res) => {
  // Always return 200 with empty TwiML to suppress Twilio errors
  res.set("Content-Type", "text/xml");

  try {
    const rawFrom = (req.body?.From || req.body?.from || "").trim();
    const bodyText = (req.body?.Body || req.body?.body || "").trim();
    const rawTo = (req.body?.To || req.body?.to || "").trim();

    if (!rawFrom || !bodyText) {
      return res.send("<Response></Response>");
    }

    const fromPhone = normalizePhone(rawFrom);
    const toPhone = normalizePhone(rawTo);

    // Parse rating 1-4
    const rating = parseInt(bodyText);
    if (isNaN(rating) || rating < 1 || rating > 4) {
      return res.send(
        "<Response><Message>Thanks! Reply with 1 (poor), 2 (fair), 3 (good), or 4 (excellent) to rate your service.</Message></Response>"
      );
    }

    const weight = WEIGHT_MAP[rating];

    // Find company by Twilio From number
    const companies = await db
      .select({ id: companiesTable.id, twilio_from_number: companiesTable.twilio_from_number })
      .from(companiesTable)
      .where(eq(companiesTable.twilio_from_number, toPhone));

    if (!companies.length) {
      return res.send("<Response></Response>");
    }
    const company = companies[0];

    // Find client by phone
    const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const clients = await db
      .select({ id: clientsTable.id, first_name: clientsTable.first_name, last_name: clientsTable.last_name, phone: clientsTable.phone })
      .from(clientsTable)
      .where(eq(clientsTable.company_id, company.id))
      .limit(500);

    const matchedClient = clients.find(c => {
      const p = (c.phone || "").replace(/\D/g, "");
      const f = fromPhone.replace(/\D/g, "");
      return p.endsWith(f.slice(-10)) || f.endsWith(p.slice(-10));
    });

    if (!matchedClient) {
      return res.send("<Response><Message>Thank you for your feedback!</Message></Response>");
    }

    // Find most recent completed job for this client within 48h
    const recentJobs = await db
      .select({
        id: jobsTable.id,
        assigned_user_id: jobsTable.assigned_user_id,
        client_id: jobsTable.client_id,
        scheduled_date: jobsTable.scheduled_date,
      })
      .from(jobsTable)
      .where(and(
        eq(jobsTable.company_id, company.id),
        eq(jobsTable.client_id, matchedClient.id),
        eq(jobsTable.status, "complete"),
      ))
      .orderBy(desc(jobsTable.scheduled_date))
      .limit(1);

    if (!recentJobs.length) {
      return res.send("<Response><Message>Thank you for your feedback!</Message></Response>");
    }

    const job = recentJobs[0];
    const techId = job.assigned_user_id;
    const employeeIds = techId ? [techId] : [];

    // Check if scorecard already exists for this job (prevent duplicates)
    const existing = await db
      .select({ id: scorecardsTable.id })
      .from(scorecardsTable)
      .where(and(eq(scorecardsTable.job_id, job.id), eq(scorecardsTable.company_id, company.id)))
      .limit(1);

    if (existing.length) {
      return res.send("<Response><Message>We already received your rating. Thank you!</Message></Response>");
    }

    // Score = weight * 100 (0, 40, 75, 100)
    const score = Math.round(weight * 100);
    const employeeIdsArr = `{${employeeIds.join(",")}}`;

    // Use raw SQL since rating/weight/employee_ids columns were added via ALTER TABLE
    await db.execute(sql`
      INSERT INTO scorecards (company_id, job_id, user_id, client_id, score, rating, weight, employee_ids, excluded, comments)
      VALUES (${company.id}, ${job.id}, ${techId ?? 0}, ${matchedClient.id}, ${score}, ${rating}, ${weight}, ${employeeIdsArr}::integer[], false, ${`Inbound SMS reply: ${bodyText}`})
    `);

    // Check 95% floor for the tech
    if (techId) {
      const recent = await db
        .select({ weight: scorecardsTable.weight })
        .from(scorecardsTable)
        .where(and(
          eq(scorecardsTable.company_id, company.id),
          eq(scorecardsTable.user_id, techId),
          eq(scorecardsTable.excluded, false),
        ))
        .orderBy(desc(scorecardsTable.created_at))
        .limit(ROLLING_N);

      if (recent.length >= 3) {
        const sum = recent.reduce((acc, r) => acc + parseFloat(String(r.weight ?? 0)), 0);
        const avg = (sum / recent.length) * 100;

        if (avg < FLOOR_PCT) {
          // Get tech phone for SMS alert
          const techs = await db
            .select({ phone: usersTable.phone, first_name: usersTable.first_name })
            .from(usersTable)
            .where(eq(usersTable.id, techId))
            .limit(1);

          if (techs.length && techs[0].phone && company.twilio_from_number) {
            const techPhone = normalizePhone(techs[0].phone);
            await sendTwilioSms(
              techPhone,
              company.twilio_from_number,
              `Hi ${techs[0].first_name}, your recent client satisfaction score has dropped below 95%. Please speak with your manager. Keep up the great work and let's get it back up!`
            );
          }

          // Create internal ticket
          await db.insert(contactTicketsTable).values({
            company_id: company.id,
            user_id: techId,
            client_id: matchedClient.id,
            job_id: job.id,
            ticket_type: "complaint_poor_cleaning",
            notes: `SCORECARD FLOOR ALERT: Tech #${techId} rolling score dropped to ${avg.toFixed(1)}% (below 95% floor). Latest rating: ${rating}/4.`,
            created_by: null as any,
          } as any);
        }
      }
    }

    return res.send(`<Response><Message>Thank you, ${matchedClient.first_name}! We appreciate your ${rating === 4 ? "excellent " : rating === 3 ? "great " : ""}feedback.</Message></Response>`);
  } catch (err) {
    console.error("[sms-inbound] Error:", err);
    return res.send("<Response></Response>");
  }
});

export default router;
