import { pgTable, serial, integer, timestamp, text, boolean, pgEnum, varchar, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { clientsTable } from "./clients";

export const discountTypeEnum = pgEnum("discount_type", ["percentage", "flat_amount", "free_service"]);
export const discountScopeEnum = pgEnum("discount_scope", ["all_clients", "specific_clients", "new_clients"]);

export const discountsTable = pgTable("discounts", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companiesTable.id).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  code: varchar("code", { length: 32 }).notNull(),
  type: discountTypeEnum("type").notNull().default("percentage"),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  scope: discountScopeEnum("scope").notNull().default("all_clients"),
  max_uses: integer("max_uses"),
  uses_count: integer("uses_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  expires_at: timestamp("expires_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertDiscountSchema = createInsertSchema(discountsTable).omit({ id: true, created_at: true, uses_count: true });
export type InsertDiscount = z.infer<typeof insertDiscountSchema>;
export type Discount = typeof discountsTable.$inferSelect;
