import { Router } from "express";
import { db } from "@workspace/db";
import { loyaltySettingsTable, loyaltyPointsLogTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/settings", requireAuth, async (req, res) => {
  try {
    const settings = await db
      .select()
      .from(loyaltySettingsTable)
      .where(eq(loyaltySettingsTable.company_id, req.auth!.companyId))
      .limit(1);

    if (!settings[0]) {
      const defaultSettings = await db
        .insert(loyaltySettingsTable)
        .values({ company_id: req.auth!.companyId })
        .returning();
      return res.json(defaultSettings[0]);
    }

    return res.json(settings[0]);
  } catch (err) {
    console.error("Get loyalty settings error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to get loyalty settings" });
  }
});

router.put("/settings", requireAuth, async (req, res) => {
  try {
    const { program_style, pts_per_cleaning, pts_per_dollar, referral_pts, review_pts, birthday_pts, autopay_pts, enabled } = req.body;

    const existing = await db
      .select({ id: loyaltySettingsTable.id })
      .from(loyaltySettingsTable)
      .where(eq(loyaltySettingsTable.company_id, req.auth!.companyId))
      .limit(1);

    let settings;
    if (existing[0]) {
      const updated = await db
        .update(loyaltySettingsTable)
        .set({
          ...(program_style && { program_style }),
          ...(pts_per_cleaning !== undefined && { pts_per_cleaning }),
          ...(pts_per_dollar !== undefined && { pts_per_dollar }),
          ...(referral_pts !== undefined && { referral_pts }),
          ...(review_pts !== undefined && { review_pts }),
          ...(birthday_pts !== undefined && { birthday_pts }),
          ...(autopay_pts !== undefined && { autopay_pts }),
          ...(enabled !== undefined && { enabled }),
        })
        .where(eq(loyaltySettingsTable.company_id, req.auth!.companyId))
        .returning();
      settings = updated[0];
    } else {
      const created = await db
        .insert(loyaltySettingsTable)
        .values({ company_id: req.auth!.companyId, ...req.body })
        .returning();
      settings = created[0];
    }

    return res.json(settings);
  } catch (err) {
    console.error("Update loyalty settings error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to update loyalty settings" });
  }
});

router.get("/points/:clientId", requireAuth, async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);

    const history = await db
      .select()
      .from(loyaltyPointsLogTable)
      .where(and(
        eq(loyaltyPointsLogTable.client_id, clientId),
        eq(loyaltyPointsLogTable.company_id, req.auth!.companyId)
      ))
      .orderBy(desc(loyaltyPointsLogTable.created_at));

    const totalPoints = history
      .filter(h => h.action === "earn")
      .reduce((s, h) => s + h.points, 0) -
      history
        .filter(h => h.action === "redeem")
        .reduce((s, h) => s + h.points, 0);

    const lifetimePoints = history
      .filter(h => h.action === "earn")
      .reduce((s, h) => s + h.points, 0);

    return res.json({
      client_id: clientId,
      total_points: Math.max(0, totalPoints),
      lifetime_points: lifetimePoints,
      history,
    });
  } catch (err) {
    console.error("Get client loyalty points error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to get loyalty points" });
  }
});

export default router;
