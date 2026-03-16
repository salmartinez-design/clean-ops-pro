import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/health", async (_req, res) => {
  const timestamp = new Date().toISOString();
  let dbStatus = "connected";

  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    dbStatus = "error";
  }

  const status = dbStatus === "connected" ? "ok" : "degraded";

  return res.status(status === "ok" ? 200 : 503).json({
    status,
    timestamp,
    database: dbStatus,
    version: "1.0.0",
    services: {
      stripe: process.env.STRIPE_SECRET_KEY ? "configured" : "not_configured",
      resend: process.env.RESEND_API_KEY ? "configured" : "not_configured",
      twilio: process.env.TWILIO_ACCOUNT_SID ? "configured" : "not_configured",
    },
  });
});

export default router;
