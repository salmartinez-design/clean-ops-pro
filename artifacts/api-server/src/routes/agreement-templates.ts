import { Router } from "express";
import { db } from "@workspace/db";
import { agreementTemplatesTable, clientAgreementsTable, clientsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";
import crypto from "crypto";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const templates = await db
      .select()
      .from(agreementTemplatesTable)
      .where(eq(agreementTemplatesTable.company_id, req.auth!.companyId))
      .orderBy(desc(agreementTemplatesTable.created_at));
    res.json(templates);
  } catch (e: any) {
    console.error("List templates error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.post("/", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const { name, body } = req.body;
    if (!name || !body) return res.status(400).json({ error: "name and body required" });
    const [t] = await db.insert(agreementTemplatesTable).values({
      company_id: req.auth!.companyId,
      name, body,
      created_by: req.auth!.userId,
      is_active: true,
    }).returning();
    res.status(201).json(t);
  } catch (e: any) {
    console.error("Create template error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.patch("/:id", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, body, is_active } = req.body;
    const updates: any = { updated_at: new Date() };
    if (name !== undefined) updates.name = name;
    if (body !== undefined) updates.body = body;
    if (is_active !== undefined) updates.is_active = is_active;
    const [t] = await db
      .update(agreementTemplatesTable)
      .set(updates)
      .where(and(eq(agreementTemplatesTable.id, id), eq(agreementTemplatesTable.company_id, req.auth!.companyId)))
      .returning();
    if (!t) return res.status(404).json({ error: "Not found" });
    res.json(t);
  } catch (e: any) {
    console.error("Update template error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.delete("/:id", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(agreementTemplatesTable).where(
      and(eq(agreementTemplatesTable.id, id), eq(agreementTemplatesTable.company_id, req.auth!.companyId))
    );
    res.json({ success: true });
  } catch (e: any) {
    console.error("Delete template error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.post("/:id/send", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const { client_id, client_home_id } = req.body;
    if (!client_id) return res.status(400).json({ error: "client_id required" });
    const [template] = await db.select().from(agreementTemplatesTable)
      .where(and(eq(agreementTemplatesTable.id, templateId), eq(agreementTemplatesTable.company_id, req.auth!.companyId)));
    if (!template) return res.status(404).json({ error: "Template not found" });
    const contentHash = crypto.createHash("sha256").update(template.body).digest("hex");
    const [agreement] = await db.insert(clientAgreementsTable).values({
      company_id: req.auth!.companyId,
      client_id: parseInt(client_id),
      template_name: template.name,
      template_id: templateId,
      content_hash: contentHash,
      client_home_id: client_home_id ? parseInt(client_home_id) : null,
      sent_at: new Date(),
    } as any).returning();
    res.status(201).json({ success: true, agreement });
  } catch (e: any) {
    console.error("Send agreement error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.post("/agreements/:id/sign", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { typed_name, agreed } = req.body;
    if (!typed_name || !agreed) return res.status(400).json({ error: "typed_name and agreed required" });
    const ip_address = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "";
    const [agreement] = await db
      .update(clientAgreementsTable)
      .set({
        accepted_at: new Date(),
        typed_name,
        ip_address,
      } as any)
      .where(eq(clientAgreementsTable.id, id))
      .returning();
    if (!agreement) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, agreement });
  } catch (e: any) {
    console.error("Sign agreement error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

export default router;
