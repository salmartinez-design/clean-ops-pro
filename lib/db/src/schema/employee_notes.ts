import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { companiesTable } from "./companies";

export const employeeNotesTable = pgTable("employee_notes", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companiesTable.id).notNull(),
  user_id: integer("user_id").references(() => usersTable.id).notNull(),
  note_type: text("note_type").notNull().default("manual"),
  content: text("content").notNull(),
  is_system: boolean("is_system").notNull().default(false),
  created_by: integer("created_by").references(() => usersTable.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertEmployeeNoteSchema = createInsertSchema(employeeNotesTable).omit({ id: true, created_at: true });
export type InsertEmployeeNote = z.infer<typeof insertEmployeeNoteSchema>;
export type EmployeeNote = typeof employeeNotesTable.$inferSelect;
