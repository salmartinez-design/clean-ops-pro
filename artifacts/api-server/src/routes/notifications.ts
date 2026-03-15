import { Router } from "express";
import { db } from "@workspace/db";
import { notificationTemplatesTable, notificationLogTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

const DEFAULT_TEMPLATES = [
  {
    trigger: "job_scheduled",
    channel: "email" as const,
    subject: "Your cleaning appointment is confirmed",
    body: "Hi {{client_name}},\n\nYour {{service_type}} appointment is scheduled for {{date}} at {{time}}.\n\nThank you for choosing {{company_name}}!\n\nBest,\nThe {{company_name}} Team",
    is_active: true,
  },
  {
    trigger: "job_reminder_24h",
    channel: "email" as const,
    subject: "Reminder: Cleaning tomorrow at {{time}}",
    body: "Hi {{client_name}},\n\nJust a reminder that your {{service_type}} is tomorrow, {{date}} at {{time}}.\n\nQuestions? Call us anytime.\n\n{{company_name}}",
    is_active: true,
  },
  {
    trigger: "invoice_sent",
    channel: "email" as const,
    subject: "Invoice #{{invoice_number}} from {{company_name}}",
    body: "Hi {{client_name}},\n\nPlease find your invoice for ${{amount}} attached.\n\nThank you for your business!\n\n{{company_name}}",
    is_active: true,
  },
  {
    trigger: "job_complete",
    channel: "in_app" as const,
    subject: null,
    body: "Job for {{client_name}} has been marked complete by {{employee_name}}.",
    is_active: true,
  },
  {
    trigger: "employee_clock_in",
    channel: "in_app" as const,
    subject: null,
    body: "{{employee_name}} clocked in for {{client_name}}'s job.",
    is_active: false,
  },
  {
    trigger: "payment_received",
    channel: "email" as const,
    subject: "Payment confirmed — Thank you!",
    body: "Hi {{client_name}},\n\nWe received your payment of ${{amount}}. Thank you!\n\n{{company_name}}",
    is_active: true,
  },
];

router.get("/templates", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const companyId = req.auth!.companyId!;
    let templates = await db.select().from(notificationTemplatesTable)
      .where(eq(notificationTemplatesTable.company_id, companyId))
      .orderBy(notificationTemplatesTable.id);

    if (templates.length === 0) {
      const inserted = await db.insert(notificationTemplatesTable)
        .values(DEFAULT_TEMPLATES.map(t => ({ ...t, company_id: companyId })))
        .returning();
      templates = inserted;
    }

    return res.json({ data: templates });
  } catch (err) {
    console.error("Notifications templates error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/templates/:id", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const companyId = req.auth!.companyId!;
    const id = parseInt(req.params.id);
    const { is_active, subject, body } = req.body;

    const [updated] = await db.update(notificationTemplatesTable)
      .set({ is_active, subject, body })
      .where(and(eq(notificationTemplatesTable.id, id), eq(notificationTemplatesTable.company_id, companyId)))
      .returning();

    return res.json(updated);
  } catch (err) {
    console.error("Update template error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/templates/:id/test", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const companyId = req.auth!.companyId!;
    const id = parseInt(req.params.id);

    const [template] = await db.select().from(notificationTemplatesTable)
      .where(and(eq(notificationTemplatesTable.id, id), eq(notificationTemplatesTable.company_id, companyId)));

    if (!template) return res.status(404).json({ error: "Template not found" });

    await db.insert(notificationLogTable).values({
      company_id: companyId,
      recipient: req.auth!.email || "test@example.com",
      channel: template.channel,
      trigger: template.trigger,
      status: "test_sent",
    });

    return res.json({ success: true, message: `Test notification logged for trigger: ${template.trigger}` });
  } catch (err) {
    console.error("Test notification error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/log", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const companyId = req.auth!.companyId!;
    const logs = await db.select().from(notificationLogTable)
      .where(eq(notificationLogTable.company_id, companyId))
      .orderBy(desc(notificationLogTable.sent_at))
      .limit(50);
    return res.json({ data: logs });
  } catch (err) {
    console.error("Notification log error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
