import { pgTable, serial, integer, varchar, text, boolean, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const addonBundlesTable = pgTable("addon_bundles", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  discount_type: varchar("discount_type", { length: 20 }).notNull().default("flat_per_item"),
  discount_value: numeric("discount_value", { precision: 10, scale: 2 }).notNull().default("0"),
  active: boolean("active").notNull().default(true),
  valid_from: date("valid_from"),
  valid_until: date("valid_until"),
  created_at: timestamp("created_at").defaultNow(),
});

export const addonBundleItemsTable = pgTable("addon_bundle_items", {
  id: serial("id").primaryKey(),
  bundle_id: integer("bundle_id").notNull().references(() => addonBundlesTable.id, { onDelete: "cascade" }),
  addon_id: integer("addon_id").notNull(),
});

export type AddonBundle = typeof addonBundlesTable.$inferSelect;
export type AddonBundleItem = typeof addonBundleItemsTable.$inferSelect;
