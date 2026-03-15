import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const propertyGroupsTable = pgTable("property_groups", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companiesTable.id).notNull(),
  name: text("name").notNull(),
  contact_name: text("contact_name"),
  contact_email: text("contact_email"),
  contact_phone: text("contact_phone"),
  billing_centralized: boolean("billing_centralized").default(false),
  notes: text("notes"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertPropertyGroupSchema = createInsertSchema(propertyGroupsTable).omit({ id: true, created_at: true });
export type InsertPropertyGroup = z.infer<typeof insertPropertyGroupSchema>;
export type PropertyGroup = typeof propertyGroupsTable.$inferSelect;
