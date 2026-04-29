/**
 * [commercial-workflow 2026-04-29] Per-add-on, per-weekday scoping
 * for recurring schedule add-ons.
 *
 * Until now, `recurring_schedule_add_ons` was just (schedule_id,
 * pricing_addon_id, qty) — every scheduled occurrence of the parent
 * recurring_schedule got every add-on. Parking-fee was bespoke: it
 * lived as parking_fee_days int[] directly on recurring_schedules
 * (with values 0=Sun..6=Sat).
 *
 * This table generalizes that pattern. For any add-on linked to a
 * recurring schedule, operators can scope which weekdays the add-on
 * applies to. The recurring engine, when generating each child job,
 * looks up day rows for the add-on and stamps job_add_ons only for
 * occurrences whose weekday matches.
 *
 * Convention: 0=Sunday..6=Saturday — exactly matches
 * recurring_schedules.parking_fee_days, so the engine doesn't have
 * to translate between systems.
 *
 * Backwards compat: existing recurring_schedule_add_ons rows that
 * pre-date this table have ZERO day rows here. Engine semantics:
 *   - day rows present → apply only on listed weekdays
 *   - day rows absent  → apply to every scheduled occurrence
 * That preserves current behavior for legacy rows while letting
 * new ones scope. The UI will default new add-ons to "no days
 * selected" with a save-time warning + "All days" quick action,
 * so operators can't accidentally land in the legacy "no rows"
 * state without seeing a prompt (Sal's decision #5).
 */
import { pgTable, serial, integer, smallint, timestamp } from "drizzle-orm/pg-core";
import { recurringScheduleAddOnsTable } from "./recurring_schedule_add_ons";

export const recurringScheduleAddonsDaysTable = pgTable("recurring_schedule_addons_days", {
  id: serial("id").primaryKey(),
  recurring_schedule_addon_id: integer("recurring_schedule_addon_id")
    .references(() => recurringScheduleAddOnsTable.id, { onDelete: "cascade" })
    .notNull(),
  day_of_week: smallint("day_of_week").notNull(),    // 0=Sun..6=Sat (CHECK 0..6 enforced in migration)
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export type RecurringScheduleAddonsDay = typeof recurringScheduleAddonsDaysTable.$inferSelect;
export type InsertRecurringScheduleAddonsDay = typeof recurringScheduleAddonsDaysTable.$inferInsert;
