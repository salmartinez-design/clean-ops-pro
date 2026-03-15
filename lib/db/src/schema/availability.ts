import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { companiesTable } from "./companies";

export const availabilityTable = pgTable("availability", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companiesTable.id).notNull(),
  user_id: integer("user_id").references(() => usersTable.id).notNull(),
  day_of_week: integer("day_of_week").notNull(),
  start_time: text("start_time"),
  end_time: text("end_time"),
  is_available: boolean("is_available").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertAvailabilitySchema = createInsertSchema(availabilityTable).omit({ id: true, created_at: true });
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type Availability = typeof availabilityTable.$inferSelect;
