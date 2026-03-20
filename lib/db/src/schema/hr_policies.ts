import {
  pgTable, serial, integer, boolean, text, numeric, pgEnum, jsonb
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const commissionTypeEnum = pgEnum("commission_type", [
  "percent_per_job", "flat_per_job", "hourly_only", "none",
]);

export const overtimeRuleEnum = pgEnum("overtime_rule", [
  "federal_only", "state_overlay", "daily_california",
]);

export const payWeekStartDayEnum = pgEnum("pay_week_start_day", [
  "sunday", "monday",
]);

export const reCleanPayTypeEnum = pgEnum("re_clean_pay_type", [
  "no_additional", "reduced_rate", "full_rate",
]);

export const benefitYearBasisEnum = pgEnum("benefit_year_basis", [
  "calendar_year", "hire_date_anniversary",
]);

export const leaveGrantMethodEnum = pgEnum("leave_grant_method", [
  "front_loaded", "accrual",
]);

export const leaveResetBasisEnum = pgEnum("leave_reset_basis", [
  "calendar_year", "work_anniversary",
]);

export const companyPayPolicyTable = pgTable("company_pay_policy", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").notNull().unique().references(() => companiesTable.id),

  training_period_weeks: integer("training_period_weeks").default(3),
  training_hourly_rate: numeric("training_hourly_rate", { precision: 10, scale: 2 }).default("0"),

  job_minimum_hours_enabled: boolean("job_minimum_hours_enabled").default(false),
  job_minimum_hours: numeric("job_minimum_hours", { precision: 6, scale: 2 }).default("3"),

  commission_type: commissionTypeEnum("commission_type").default("hourly_only"),
  commission_rate: numeric("commission_rate", { precision: 6, scale: 2 }).default("0"),
  commission_condition_label: text("commission_condition_label").default("All quality standards met"),

  min_hourly_wage_per_period: numeric("min_hourly_wage_per_period", { precision: 10, scale: 2 }).default("0"),
  min_hourly_wage_per_job: numeric("min_hourly_wage_per_job", { precision: 10, scale: 2 }).default("0"),

  mileage_reimbursement_enabled: boolean("mileage_reimbursement_enabled").default(false),
  mileage_rate_per_mile: numeric("mileage_rate_per_mile", { precision: 8, scale: 4 }).default("0"),
  mileage_job_to_job_only: boolean("mileage_job_to_job_only").default(true),
  mileage_submission_deadline_days: integer("mileage_submission_deadline_days").default(30),

  overtime_rule: overtimeRuleEnum("overtime_rule").default("federal_only"),

  pay_week_start_day: payWeekStartDayEnum("pay_week_start_day").default("sunday"),
  full_time_hours_threshold: integer("full_time_hours_threshold").default(40),

  quality_probation_enabled: boolean("quality_probation_enabled").default(false),
  quality_probation_trigger_count: integer("quality_probation_trigger_count").default(2),
  quality_probation_rolling_days: integer("quality_probation_rolling_days").default(30),
  quality_probation_duration_days: integer("quality_probation_duration_days").default(30),
  quality_probation_hourly_rate: numeric("quality_probation_hourly_rate", { precision: 10, scale: 2 }).default("0"),
  recovery_tech_rate: numeric("recovery_tech_rate", { precision: 10, scale: 2 }).default("0"),
  return_to_commission_clean_days: integer("return_to_commission_clean_days").default(30),
  re_clean_pay_type: reCleanPayTypeEnum("re_clean_pay_type").default("no_additional"),
  re_clean_reduced_rate: numeric("re_clean_reduced_rate", { precision: 10, scale: 2 }).default("0"),
});

export const companyAttendancePolicyTable = pgTable("company_attendance_policy", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").notNull().unique().references(() => companiesTable.id),

  benefit_year_basis: benefitYearBasisEnum("benefit_year_basis").default("calendar_year"),
  grace_period_minutes: integer("grace_period_minutes").default(0),

  tardy_steps: jsonb("tardy_steps").$type<any[]>().default([]),
  absence_steps: jsonb("absence_steps").$type<any[]>().default([]),

  ncns_policy_enabled: boolean("ncns_policy_enabled").default(false),
  ncns_may_terminate_immediately: boolean("ncns_may_terminate_immediately").default(false),
  ncns_custom_note: text("ncns_custom_note"),

  max_simultaneous_off_enabled: boolean("max_simultaneous_off_enabled").default(false),
  max_simultaneous_off_count: integer("max_simultaneous_off_count").default(2),
});

export const companyLeavePolicyTable = pgTable("company_leave_policy", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").notNull().unique().references(() => companiesTable.id),

  leave_program_enabled: boolean("leave_program_enabled").default(false),
  leave_program_name: text("leave_program_name").default("Paid Leave"),
  leave_hours_granted: numeric("leave_hours_granted", { precision: 8, scale: 2 }).default("0"),
  leave_grant_method: leaveGrantMethodEnum("leave_grant_method").default("front_loaded"),
  accrual_rate_per_hour_worked: numeric("accrual_rate_per_hour_worked", { precision: 8, scale: 4 }).default("0"),
  eligibility_trigger_days: integer("eligibility_trigger_days").default(0),
  leave_reset_basis: leaveResetBasisEnum("leave_reset_basis").default("calendar_year"),
  carryover_enabled: boolean("carryover_enabled").default(false),
  carryover_max_hours: numeric("carryover_max_hours", { precision: 8, scale: 2 }).default("0"),
  payout_on_separation: boolean("payout_on_separation").default(false),
  documentation_required_after_days: integer("documentation_required_after_days").default(3),
  notice_required_foreseeable_days: integer("notice_required_foreseeable_days").default(7),

  lactation_breaks_paid: boolean("lactation_breaks_paid").default(true),
  pto_request_deadline_days: integer("pto_request_deadline_days").default(7),

  holidays: jsonb("holidays").$type<any[]>().default([]),
  holiday_pay_rate_multiplier: numeric("holiday_pay_rate_multiplier", { precision: 5, scale: 2 }).default("1.00"),

  birthday_holiday_enabled: boolean("birthday_holiday_enabled").default(false),
  birthday_advance_notice_days: integer("birthday_advance_notice_days").default(14),
});

export type CompanyPayPolicy = typeof companyPayPolicyTable.$inferSelect;
export type CompanyAttendancePolicy = typeof companyAttendancePolicyTable.$inferSelect;
export type CompanyLeavePolicy = typeof companyLeavePolicyTable.$inferSelect;
