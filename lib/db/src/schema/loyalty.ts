import { pgTable, serial, integer, timestamp, text, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { clientsTable } from "./clients";
import { jobsTable } from "./jobs";

export const loyaltyProgramStyleEnum = pgEnum("loyalty_program_style", [
  "points", "punch_card", "tiered_vip"
]);

export const loyaltyActionEnum = pgEnum("loyalty_action", ["earn", "redeem"]);

export const loyaltySettingsTable = pgTable("loyalty_settings", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companiesTable.id).notNull().unique(),
  program_style: loyaltyProgramStyleEnum("program_style").notNull().default("points"),
  pts_per_cleaning: integer("pts_per_cleaning").notNull().default(50),
  pts_per_dollar: integer("pts_per_dollar").notNull().default(1),
  referral_pts: integer("referral_pts").notNull().default(200),
  review_pts: integer("review_pts").notNull().default(100),
  birthday_pts: integer("birthday_pts").notNull().default(50),
  autopay_pts: integer("autopay_pts").notNull().default(25),
  enabled: boolean("enabled").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const loyaltyPointsLogTable = pgTable("loyalty_points_log", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companiesTable.id).notNull(),
  client_id: integer("client_id").references(() => clientsTable.id).notNull(),
  points: integer("points").notNull(),
  action: loyaltyActionEnum("action").notNull(),
  reason: text("reason").notNull(),
  job_id: integer("job_id").references(() => jobsTable.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertLoyaltySettingsSchema = createInsertSchema(loyaltySettingsTable).omit({ id: true, created_at: true });
export const insertLoyaltyPointsLogSchema = createInsertSchema(loyaltyPointsLogTable).omit({ id: true, created_at: true });
export type InsertLoyaltySettings = z.infer<typeof insertLoyaltySettingsSchema>;
export type LoyaltySettings = typeof loyaltySettingsTable.$inferSelect;
export type LoyaltyPointsLog = typeof loyaltyPointsLogTable.$inferSelect;
