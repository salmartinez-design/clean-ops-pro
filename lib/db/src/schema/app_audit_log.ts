import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const appAuditLogTable = pgTable("app_audit_log", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id"),
  performed_by: integer("performed_by"),
  action: text("action").notNull(),
  target_type: text("target_type").notNull().default(""),
  target_id: text("target_id"),
  old_value: jsonb("old_value"),
  new_value: jsonb("new_value"),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  performed_at: timestamp("performed_at").notNull().defaultNow(),
});

export type AppAuditLog = typeof appAuditLogTable.$inferSelect;
