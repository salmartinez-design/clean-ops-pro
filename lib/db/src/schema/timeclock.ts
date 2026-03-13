import { pgTable, serial, integer, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { jobsTable } from "./jobs";
import { usersTable } from "./users";

export const timeclockTable = pgTable("timeclock", {
  id: serial("id").primaryKey(),
  job_id: integer("job_id").references(() => jobsTable.id).notNull(),
  user_id: integer("user_id").references(() => usersTable.id).notNull(),
  company_id: integer("company_id").references(() => companiesTable.id).notNull(),
  clock_in_at: timestamp("clock_in_at").notNull().defaultNow(),
  clock_out_at: timestamp("clock_out_at"),
  clock_in_lat: numeric("clock_in_lat", { precision: 10, scale: 7 }),
  clock_in_lng: numeric("clock_in_lng", { precision: 10, scale: 7 }),
  clock_out_lat: numeric("clock_out_lat", { precision: 10, scale: 7 }),
  clock_out_lng: numeric("clock_out_lng", { precision: 10, scale: 7 }),
  distance_from_job_ft: numeric("distance_from_job_ft", { precision: 10, scale: 2 }),
  flagged: boolean("flagged").notNull().default(false),
});

export const insertTimeclockSchema = createInsertSchema(timeclockTable).omit({ id: true });
export type InsertTimeclock = z.infer<typeof insertTimeclockSchema>;
export type TimeclockEntry = typeof timeclockTable.$inferSelect;
