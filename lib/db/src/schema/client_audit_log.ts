import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";
import { usersTable } from "./users";

// [AH] Per-client audit trail. Mirror of job_audit_log shape (without
// cascade_scope/schedule_id since clients aren't recurring entities).
// Currently only commercial_hourly_rate edits are logged here; future
// expansion will track other tracked client fields.
export const clientAuditLogTable = pgTable("client_audit_log", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").references(() => clientsTable.id, { onDelete: "cascade" }).notNull(),
  company_id: integer("company_id").notNull(),
  user_id: integer("user_id").references(() => usersTable.id).notNull(),
  user_name: text("user_name").notNull(),
  user_email: text("user_email").notNull(),
  field_name: text("field_name").notNull(),
  old_value: jsonb("old_value"),
  new_value: jsonb("new_value"),
  edited_at: timestamp("edited_at").notNull().defaultNow(),
});

export type ClientAuditLog = typeof clientAuditLogTable.$inferSelect;
