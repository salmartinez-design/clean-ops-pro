import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { usersTable } from "./users";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companiesTable.id).notNull(),
  sender_id: integer("sender_id").references(() => usersTable.id).notNull(),
  recipient_id: integer("recipient_id").references(() => usersTable.id),
  channel: text("channel").notNull().default("general"),
  body: text("body").notNull(),
  read_at: timestamp("read_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, created_at: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
