import { pgTable, serial, integer, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { jobsTable } from "./jobs";
import { usersTable } from "./users";

export const jobStatusEventEnum = pgEnum("job_status_event", [
  "on_my_way", "arrived", "paused", "resumed", "complete",
]);

export const jobStatusLogsTable = pgTable("job_status_logs", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companiesTable.id).notNull(),
  job_id: integer("job_id").references(() => jobsTable.id).notNull(),
  user_id: integer("user_id").references(() => usersTable.id).notNull(),
  event: jobStatusEventEnum("event").notNull(),
  sms_sent: boolean("sms_sent").notNull().default(false),
  sms_error: text("sms_error"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertJobStatusLogSchema = createInsertSchema(jobStatusLogsTable).omit({ id: true, created_at: true });
export type InsertJobStatusLog = z.infer<typeof insertJobStatusLogSchema>;
export type JobStatusLog = typeof jobStatusLogsTable.$inferSelect;
