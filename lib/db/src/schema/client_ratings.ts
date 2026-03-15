import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { clientsTable } from "./clients";
import { jobsTable } from "./jobs";

export const clientRatingsTable = pgTable("client_ratings", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companiesTable.id).notNull(),
  client_id: integer("client_id").references(() => clientsTable.id).notNull(),
  job_id: integer("job_id").references(() => jobsTable.id).notNull(),
  score: integer("score").notNull(),
  comment: text("comment"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertClientRatingSchema = createInsertSchema(clientRatingsTable).omit({ id: true, created_at: true });
export type InsertClientRating = z.infer<typeof insertClientRatingSchema>;
export type ClientRating = typeof clientRatingsTable.$inferSelect;
