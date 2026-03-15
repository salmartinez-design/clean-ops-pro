import { pgTable, serial, text, integer, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { clientsTable } from "./clients";
import { usersTable } from "./users";
import { jobsTable } from "./jobs";

export const quotesTable = pgTable("quotes", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companiesTable.id).notNull(),
  client_id: integer("client_id").references(() => clientsTable.id),
  lead_name: text("lead_name"),
  lead_email: text("lead_email"),
  lead_phone: text("lead_phone"),
  address: text("address"),
  service_type: text("service_type"),
  frequency: text("frequency"),
  estimated_hours: decimal("estimated_hours", { precision: 4, scale: 2 }),
  base_price: decimal("base_price", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("draft"),
  sent_at: timestamp("sent_at"),
  viewed_at: timestamp("viewed_at"),
  accepted_at: timestamp("accepted_at"),
  booked_job_id: integer("booked_job_id").references(() => jobsTable.id),
  notes: text("notes"),
  created_by: integer("created_by").references(() => usersTable.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertQuoteSchema = createInsertSchema(quotesTable).omit({ id: true, created_at: true });
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotesTable.$inferSelect;
