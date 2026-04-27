import { pgTable, serial, integer, text, boolean, numeric, timestamp, unique } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

// [AI.3] Per-tenant commercial service types. Replaces the hardcoded
// COMMERCIAL_SERVICE_TYPES constant in the edit-job modal. Tenants manage
// display name, default hourly rate, sort order, and active flag via
// /settings/pricing → Commercial Service Types section.
//
// `slug` MUST be a valid jobs.service_type enum value (the column is still
// a Postgres enum). When users add a new type via the UI, the server runs
// a sanitized ALTER TYPE service_type ADD VALUE IF NOT EXISTS '<slug>'
// before inserting the row. Slug regex: ^[a-z][a-z0-9_]*$.
//
// Soft delete only: is_active=false hides the row from active dropdowns
// but historical jobs continue to display correctly via their service_type
// string.
export const commercialServiceTypesTable = pgTable("commercial_service_types", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companiesTable.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  default_hourly_rate: numeric("default_hourly_rate", { precision: 10, scale: 2 }),
  is_active: boolean("is_active").notNull().default(true),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [unique().on(t.company_id, t.slug)]);

export type CommercialServiceType = typeof commercialServiceTypesTable.$inferSelect;
