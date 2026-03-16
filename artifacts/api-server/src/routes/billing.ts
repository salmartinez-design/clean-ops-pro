import { Router } from "express";
import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

router.get("/status", requireAuth, async (req, res) => {
  try {
    const [company] = await db
      .select({
        id: companiesTable.id,
        name: companiesTable.name,
        subscription_status: companiesTable.subscription_status,
        plan: companiesTable.plan,
        stripe_customer_id: companiesTable.stripe_customer_id,
        stripe_subscription_id: companiesTable.stripe_subscription_id,
        trial_ends_at: (companiesTable as any).trial_ends_at,
        billing_email: (companiesTable as any).billing_email,
        employee_count: companiesTable.employee_count,
      })
      .from(companiesTable)
      .where(eq(companiesTable.id, req.auth!.companyId));
    if (!company) return res.status(404).json({ error: "Company not found" });
    const plan = company.plan || "starter";
    const base = 100;
    const empOver50 = Math.max(0, (company.employee_count || 0) - 50) * 2;
    const monthly_total = base + empOver50;
    res.json({
      ...company,
      monthly_total,
      plan_label: plan === "starter" ? "Starter" : plan === "growth" ? "Growth" : "Enterprise",
    });
  } catch (e: any) {
    console.error("Billing status error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.post("/create-subscription", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const { plan, billing_email } = req.body;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      await db.update(companiesTable).set({
        subscription_status: "trialing",
        plan: plan || "starter",
        ...(billing_email ? { billing_email } : {}),
      } as any).where(eq(companiesTable.id, req.auth!.companyId));
      return res.json({
        success: true,
        status: "trialing",
        message: "Trial activated (Stripe not configured — connect Stripe to enable billing)",
      });
    }
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" as any });
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, req.auth!.companyId));
    let customerId = company.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: billing_email || company.name,
        name: company.name,
        metadata: { company_id: String(company.id), slug: company.slug },
      });
      customerId = customer.id;
    }
    const trialEnd = Math.floor((Date.now() + 14 * 24 * 60 * 60 * 1000) / 1000);
    await db.update(companiesTable).set({
      stripe_customer_id: customerId,
      subscription_status: "trialing",
      plan: plan || "starter",
    } as any).where(eq(companiesTable.id, req.auth!.companyId));
    res.json({
      success: true,
      stripe_customer_id: customerId,
      status: "trialing",
      trial_end: new Date(trialEnd * 1000).toISOString(),
    });
  } catch (e: any) {
    console.error("Create subscription error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.post("/cancel-subscription", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    await db.update(companiesTable).set({
      subscription_status: "canceled",
    } as any).where(eq(companiesTable.id, req.auth!.companyId));
    res.json({ success: true, message: "Subscription cancelled at period end." });
  } catch (e: any) {
    console.error("Cancel subscription error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

router.patch("/update", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  try {
    const { plan, billing_email } = req.body;
    const updates: any = {};
    if (plan) updates.plan = plan;
    if (billing_email) updates.billing_email = billing_email;
    await db.update(companiesTable).set(updates).where(eq(companiesTable.id, req.auth!.companyId));
    res.json({ success: true });
  } catch (e: any) {
    console.error("Update billing error:", e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
});

export default router;
