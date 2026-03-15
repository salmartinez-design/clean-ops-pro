import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { usersTable } from "./users";

export const agreementTemplatesTable = pgTable("agreement_templates", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companiesTable.id).notNull(),
  name: text("name").notNull(),
  body: text("body").notNull(),
  is_active: boolean("is_active").default(true),
  created_by: integer("created_by").references(() => usersTable.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAgreementTemplateSchema = createInsertSchema(agreementTemplatesTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertAgreementTemplate = z.infer<typeof insertAgreementTemplateSchema>;
export type AgreementTemplate = typeof agreementTemplatesTable.$inferSelect;
