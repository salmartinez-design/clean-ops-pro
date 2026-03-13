import { pgTable, serial, text, integer, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { jobsTable } from "./jobs";
import { usersTable } from "./users";

export const photoTypeEnum = pgEnum("photo_type", ["before", "after"]);

export const jobPhotosTable = pgTable("job_photos", {
  id: serial("id").primaryKey(),
  job_id: integer("job_id").references(() => jobsTable.id).notNull(),
  company_id: integer("company_id").references(() => companiesTable.id).notNull(),
  photo_type: photoTypeEnum("photo_type").notNull(),
  url: text("url").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  lat: numeric("lat", { precision: 10, scale: 7 }),
  lng: numeric("lng", { precision: 10, scale: 7 }),
  uploaded_by: integer("uploaded_by").references(() => usersTable.id),
});

export const insertJobPhotoSchema = createInsertSchema(jobPhotosTable).omit({ id: true });
export type InsertJobPhoto = z.infer<typeof insertJobPhotoSchema>;
export type JobPhoto = typeof jobPhotosTable.$inferSelect;
