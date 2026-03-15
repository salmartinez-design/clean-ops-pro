import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { clientsTable } from "./clients";
import { usersTable } from "./users";

export const clientAttachmentsTable = pgTable("client_attachments", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companiesTable.id).notNull(),
  client_id: integer("client_id").references(() => clientsTable.id).notNull(),
  name: text("name").notNull(),
  file_url: text("file_url").notNull(),
  file_type: text("file_type"),
  file_size: integer("file_size"),
  category: text("category").default("other"),
  uploaded_by: integer("uploaded_by").references(() => usersTable.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertClientAttachmentSchema = createInsertSchema(clientAttachmentsTable).omit({ id: true, created_at: true });
export type InsertClientAttachment = z.infer<typeof insertClientAttachmentSchema>;
export type ClientAttachment = typeof clientAttachmentsTable.$inferSelect;
