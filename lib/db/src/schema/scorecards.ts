import { pgTable, serial, integer, timestamp, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { jobsTable } from "./jobs";
import { usersTable } from "./users";
import { clientsTable } from "./clients";

export const scorecardsTable = pgTable("scorecards", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companiesTable.id).notNull(),
  job_id: integer("job_id").references(() => jobsTable.id).notNull(),
  user_id: integer("user_id").references(() => usersTable.id).notNull(),
  client_id: integer("client_id").references(() => clientsTable.id).notNull(),
  score: integer("score").notNull(),
  comments: text("comments"),
  excluded: boolean("excluded").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertScorecardSchema = createInsertSchema(scorecardsTable).omit({ id: true, created_at: true });
export type InsertScorecard = z.infer<typeof insertScorecardSchema>;
export type Scorecard = typeof scorecardsTable.$inferSelect;
