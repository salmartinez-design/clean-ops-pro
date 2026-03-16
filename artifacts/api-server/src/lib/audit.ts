import { Request } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function logAudit(
  req: Request,
  action: string,
  targetType: string,
  targetId: string | number | null,
  oldValue?: Record<string, unknown> | null,
  newValue?: Record<string, unknown> | null
): Promise<void> {
  try {
    const userId = req.auth?.userId ?? null;
    const companyId = req.auth?.companyId ?? null;
    const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
      ?? req.socket?.remoteAddress
      ?? null;
    const userAgent = req.headers["user-agent"] ?? null;

    await db.execute(sql`
      INSERT INTO app_audit_log
        (company_id, performed_by, action, target_type, target_id,
         old_value, new_value, ip_address, user_agent, performed_at)
      VALUES
        (${companyId}, ${userId}, ${action}, ${targetType}, ${String(targetId ?? "")},
         ${oldValue ? JSON.stringify(oldValue) : null}::jsonb,
         ${newValue ? JSON.stringify(newValue) : null}::jsonb,
         ${ip}, ${userAgent}, now())
    `);
  } catch (err) {
    // Never let audit logging crash a request
    console.error("[audit] Failed to write audit log:", err);
  }
}
