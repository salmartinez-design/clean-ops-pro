import { db } from "@workspace/db";
import { companiesTable, usersTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function seedIfNeeded() {
  try {
    // Ensure the schema tables exist first (idempotent raw check)
    const tableCheck = await db.execute(
      sql`SELECT to_regclass('public.companies') as exists`
    );
    const tableExists = (tableCheck.rows[0] as any)?.exists;
    if (!tableExists) {
      console.log("[seed] Tables not yet created — skipping seed (run db:push first)");
      return;
    }

    // Check if PHES company already exists
    const existing = await db
      .select({ id: companiesTable.id })
      .from(companiesTable)
      .where(eq(companiesTable.slug, "phes-cleaning"))
      .limit(1);

    if (existing.length > 0) {
      // Ensure brand color is correct even on existing records
      await db
        .update(companiesTable)
        .set({ brand_color: "#5B9BD5" })
        .where(eq(companiesTable.slug, "phes-cleaning"));
      console.log("[seed] PHES Cleaning already seeded — brand color ensured");
      return;
    }

    console.log("[seed] Seeding PHES Cleaning LLC...");

    // Create company
    const [company] = await db
      .insert(companiesTable)
      .values({
        name: "PHES Cleaning LLC",
        slug: "phes-cleaning",
        brand_color: "#5B9BD5",
        subscription_status: "active",
        plan: "growth",
        employee_count: 0,
        pay_cadence: "biweekly",
        geo_fence_threshold_ft: 500,
        sms_on_my_way_enabled: true,
        sms_arrived_enabled: false,
        sms_paused_enabled: false,
        sms_complete_enabled: true,
      })
      .returning({ id: companiesTable.id });

    // Hash owner password
    const passwordHash = await bcrypt.hash("Avaseb2024$", 12);

    // Create owner user
    await db.insert(usersTable).values({
      company_id: company.id,
      email: "salmartinez@phes.io",
      password_hash: passwordHash,
      role: "owner",
      first_name: "Sal",
      last_name: "Martinez",
      is_active: true,
    });

    console.log("[seed] PHES Cleaning seeded successfully — login: salmartinez@phes.io");
  } catch (err) {
    // Never crash the server over a seed failure
    console.error("[seed] Seed error (non-fatal):", err);
  }
}
