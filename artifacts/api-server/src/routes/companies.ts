import { Router } from "express";
import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  try {
    const company = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.id, req.auth!.companyId))
      .limit(1);

    if (!company[0]) {
      return res.status(404).json({ error: "Not Found", message: "Company not found" });
    }

    return res.json(company[0]);
  } catch (err) {
    console.error("Get company error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to get company" });
  }
});

router.put("/me", requireAuth, async (req, res) => {
  try {
    const { name, logo_url, pay_cadence, geo_fence_threshold_ft, brand_color } = req.body;

    const updated = await db
      .update(companiesTable)
      .set({
        ...(name && { name }),
        ...(logo_url !== undefined && { logo_url }),
        ...(pay_cadence && { pay_cadence }),
        ...(geo_fence_threshold_ft !== undefined && { geo_fence_threshold_ft }),
        ...(brand_color && { brand_color }),
      })
      .where(eq(companiesTable.id, req.auth!.companyId))
      .returning();

    return res.json(updated[0]);
  } catch (err) {
    console.error("Update company error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to update company" });
  }
});

export default router;
