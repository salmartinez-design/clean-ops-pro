import { pgTable, serial, text, integer, timestamp, numeric, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { clientsTable } from "./clients";
import { jobsTable } from "./jobs";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft", "sent", "paid", "overdue"
]);

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companiesTable.id).notNull(),
  client_id: integer("client_id").references(() => clientsTable.id).notNull(),
  job_id: integer("job_id").references(() => jobsTable.id),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  line_items: jsonb("line_items").notNull().default([]),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  tips: numeric("tips", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  qbo_invoice_id: text("qbo_invoice_id"),
  stripe_payment_intent_id: text("stripe_payment_intent_id"),
  square_payment_id: text("square_payment_id"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  paid_at: timestamp("paid_at"),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, created_at: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
