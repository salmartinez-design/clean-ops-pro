import { pgTable, serial, text, integer, timestamp, numeric, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { clientsTable } from "./clients";
import { usersTable } from "./users";

export const jobStatusEnum = pgEnum("job_status", [
  "scheduled", "in_progress", "complete", "cancelled"
]);

export const serviceTypeEnum = pgEnum("service_type", [
  "standard_clean", "deep_clean", "move_out", "recurring", "post_construction", "move_in",
  "office_cleaning", "common_areas", "retail_store", "medical_office", "ppm_turnover", "post_event"
]);

export const frequencyEnum = pgEnum("frequency", [
  "weekly", "biweekly", "every_3_weeks", "monthly", "on_demand"
]);

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companiesTable.id).notNull(),
  client_id: integer("client_id").references(() => clientsTable.id).notNull(),
  assigned_user_id: integer("assigned_user_id").references(() => usersTable.id),
  service_type: serviceTypeEnum("service_type").notNull(),
  status: jobStatusEnum("status").notNull().default("scheduled"),
  scheduled_date: date("scheduled_date").notNull(),
  scheduled_time: text("scheduled_time"),
  frequency: frequencyEnum("frequency").notNull().default("on_demand"),
  base_fee: numeric("base_fee", { precision: 10, scale: 2 }).notNull(),
  fee_split_pct: numeric("fee_split_pct", { precision: 5, scale: 2 }),
  allowed_hours: numeric("allowed_hours", { precision: 6, scale: 2 }),
  actual_hours: numeric("actual_hours", { precision: 6, scale: 2 }),
  notes: text("notes"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, created_at: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
