import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { clientsTable } from "./clients";

export const clientAgreementsTable = pgTable("client_agreements", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companiesTable.id).notNull(),
  client_id: integer("client_id").references(() => clientsTable.id).notNull(),
  home_id: integer("home_id"),
  template_name: text("template_name"),
  sent_at: timestamp("sent_at"),
  accepted_at: timestamp("accepted_at"),
  ip_address: text("ip_address"),
  pdf_url: text("pdf_url"),
  template_id: integer("template_id"),
  content_hash: text("content_hash"),
  typed_name: text("typed_name"),
  client_home_id: integer("client_home_id"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertClientAgreementSchema = createInsertSchema(clientAgreementsTable).omit({ id: true, created_at: true });
export type InsertClientAgreement = z.infer<typeof insertClientAgreementSchema>;
export type ClientAgreement = typeof clientAgreementsTable.$inferSelect;
