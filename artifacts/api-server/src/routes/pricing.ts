import { Router } from "express";
import { db } from "@workspace/db";
import {
  pricingScopesTable,
  pricingTiersTable,
  pricingFrequenciesTable,
  pricingAddonsTable,
  pricingDiscountsTable,
  pricingFeeRulesTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// ── Scopes ──────────────────────────────────────────────────────────────────

router.get("/scopes", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const scopes = await db
      .select()
      .from(pricingScopesTable)
      .where(eq(pricingScopesTable.company_id, companyId))
      .orderBy(pricingScopesTable.sort_order, pricingScopesTable.id);
    return res.json(scopes);
  } catch (err) {
    console.error("GET /pricing/scopes:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/scopes", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const { name, scope_group, hourly_rate, minimum_bill, sort_order } = req.body;
    const [scope] = await db
      .insert(pricingScopesTable)
      .values({ company_id: companyId, name, scope_group: scope_group || "Residential", hourly_rate: hourly_rate || "0", minimum_bill: minimum_bill || "0", sort_order: sort_order ?? 0 })
      .returning();
    return res.status(201).json(scope);
  } catch (err) {
    console.error("POST /pricing/scopes:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/scopes/:id", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const id = parseInt(req.params.id);
    const { name, scope_group, hourly_rate, minimum_bill, is_active, sort_order } = req.body;
    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (name !== undefined) updates.name = name;
    if (scope_group !== undefined) updates.scope_group = scope_group;
    if (hourly_rate !== undefined) updates.hourly_rate = hourly_rate;
    if (minimum_bill !== undefined) updates.minimum_bill = minimum_bill;
    if (is_active !== undefined) updates.is_active = is_active;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    const [scope] = await db
      .update(pricingScopesTable)
      .set(updates)
      .where(and(eq(pricingScopesTable.id, id), eq(pricingScopesTable.company_id, companyId)))
      .returning();
    if (!scope) return res.status(404).json({ error: "Not found" });
    return res.json(scope);
  } catch (err) {
    console.error("PUT /pricing/scopes/:id:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/scopes/:id", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const id = parseInt(req.params.id);
    await db
      .update(pricingScopesTable)
      .set({ is_active: false, updated_at: new Date() })
      .where(and(eq(pricingScopesTable.id, id), eq(pricingScopesTable.company_id, companyId)));
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /pricing/scopes/:id:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Tiers ────────────────────────────────────────────────────────────────────

router.get("/scopes/:id/tiers", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const scopeId = parseInt(req.params.id);
    const tiers = await db
      .select()
      .from(pricingTiersTable)
      .where(and(eq(pricingTiersTable.scope_id, scopeId), eq(pricingTiersTable.company_id, companyId)))
      .orderBy(pricingTiersTable.min_sqft);
    return res.json(tiers);
  } catch (err) {
    console.error("GET /pricing/scopes/:id/tiers:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/scopes/:id/tiers", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const scopeId = parseInt(req.params.id);
    const tiers: Array<{ min_sqft: number; max_sqft: number; hours: string | number }> = req.body;
    if (!Array.isArray(tiers)) return res.status(400).json({ error: "Body must be an array of tiers" });
    await db.delete(pricingTiersTable).where(and(eq(pricingTiersTable.scope_id, scopeId), eq(pricingTiersTable.company_id, companyId)));
    if (tiers.length > 0) {
      await db.insert(pricingTiersTable).values(
        tiers.map(t => ({ scope_id: scopeId, company_id: companyId, min_sqft: t.min_sqft, max_sqft: t.max_sqft, hours: String(t.hours) }))
      );
    }
    const result = await db.select().from(pricingTiersTable).where(and(eq(pricingTiersTable.scope_id, scopeId), eq(pricingTiersTable.company_id, companyId))).orderBy(pricingTiersTable.min_sqft);
    return res.json(result);
  } catch (err) {
    console.error("POST /pricing/scopes/:id/tiers:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Frequencies ──────────────────────────────────────────────────────────────

router.get("/scopes/:id/frequencies", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const scopeId = parseInt(req.params.id);
    const freqs = await db
      .select()
      .from(pricingFrequenciesTable)
      .where(and(eq(pricingFrequenciesTable.scope_id, scopeId), eq(pricingFrequenciesTable.company_id, companyId)))
      .orderBy(pricingFrequenciesTable.sort_order);
    return res.json(freqs);
  } catch (err) {
    console.error("GET /pricing/scopes/:id/frequencies:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/scopes/:id/frequencies", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const scopeId = parseInt(req.params.id);
    const freqs: Array<{ frequency: string; label: string; rate_override?: string | null; multiplier?: string | number; sort_order?: number }> = req.body;
    if (!Array.isArray(freqs)) return res.status(400).json({ error: "Body must be an array" });
    await db.delete(pricingFrequenciesTable).where(and(eq(pricingFrequenciesTable.scope_id, scopeId), eq(pricingFrequenciesTable.company_id, companyId)));
    if (freqs.length > 0) {
      await db.insert(pricingFrequenciesTable).values(
        freqs.map((f, i) => ({
          scope_id: scopeId,
          company_id: companyId,
          frequency: f.frequency,
          label: f.label,
          rate_override: f.rate_override ? String(f.rate_override) : null,
          multiplier: String(f.multiplier ?? "1.0000"),
          sort_order: f.sort_order ?? i,
        }))
      );
    }
    const result = await db.select().from(pricingFrequenciesTable).where(and(eq(pricingFrequenciesTable.scope_id, scopeId), eq(pricingFrequenciesTable.company_id, companyId))).orderBy(pricingFrequenciesTable.sort_order);
    return res.json(result);
  } catch (err) {
    console.error("POST /pricing/scopes/:id/frequencies:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Add-ons ───────────────────────────────────────────────────────────────────

router.get("/scopes/:id/addons", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const scopeId = parseInt(req.params.id);
    const addons = await db
      .select()
      .from(pricingAddonsTable)
      .where(and(eq(pricingAddonsTable.scope_id, scopeId), eq(pricingAddonsTable.company_id, companyId)))
      .orderBy(pricingAddonsTable.sort_order, pricingAddonsTable.id);
    return res.json(addons);
  } catch (err) {
    console.error("GET /pricing/scopes/:id/addons:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/scopes/:id/addons", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const scopeId = parseInt(req.params.id);
    const { name, price, price_type, percent_of_base, time_add_minutes, unit, sort_order } = req.body;
    const [addon] = await db
      .insert(pricingAddonsTable)
      .values({
        scope_id: scopeId,
        company_id: companyId,
        name,
        price: price != null ? String(price) : null,
        price_type: price_type || "flat",
        percent_of_base: percent_of_base != null ? String(percent_of_base) : null,
        time_add_minutes: time_add_minutes ?? 0,
        unit: unit || "each",
        sort_order: sort_order ?? 0,
      })
      .returning();
    return res.status(201).json(addon);
  } catch (err) {
    console.error("POST /pricing/scopes/:id/addons:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/addons/:id", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const id = parseInt(req.params.id);
    const { name, price, price_type, percent_of_base, time_add_minutes, unit, is_active, sort_order } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (price !== undefined) updates.price = price != null ? String(price) : null;
    if (price_type !== undefined) updates.price_type = price_type;
    if (percent_of_base !== undefined) updates.percent_of_base = percent_of_base != null ? String(percent_of_base) : null;
    if (time_add_minutes !== undefined) updates.time_add_minutes = time_add_minutes;
    if (unit !== undefined) updates.unit = unit;
    if (is_active !== undefined) updates.is_active = is_active;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    const [addon] = await db
      .update(pricingAddonsTable)
      .set(updates)
      .where(and(eq(pricingAddonsTable.id, id), eq(pricingAddonsTable.company_id, companyId)))
      .returning();
    if (!addon) return res.status(404).json({ error: "Not found" });
    return res.json(addon);
  } catch (err) {
    console.error("PUT /pricing/addons/:id:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/addons/:id", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const id = parseInt(req.params.id);
    await db
      .update(pricingAddonsTable)
      .set({ is_active: false })
      .where(and(eq(pricingAddonsTable.id, id), eq(pricingAddonsTable.company_id, companyId)));
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /pricing/addons/:id:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Discounts ─────────────────────────────────────────────────────────────────

router.get("/discounts", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const rows = await db
      .select()
      .from(pricingDiscountsTable)
      .where(eq(pricingDiscountsTable.company_id, companyId))
      .orderBy(pricingDiscountsTable.id);
    return res.json(rows);
  } catch (err) {
    console.error("GET /pricing/discounts:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/discounts", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const { code, description, discount_type, discount_value } = req.body;
    const [row] = await db
      .insert(pricingDiscountsTable)
      .values({ company_id: companyId, code: (code || "").toUpperCase(), description: description || "", discount_type: discount_type || "flat", discount_value: String(discount_value) })
      .returning();
    return res.status(201).json(row);
  } catch (err) {
    console.error("POST /pricing/discounts:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/discounts/:id", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const id = parseInt(req.params.id);
    const { code, description, discount_type, discount_value, is_active } = req.body;
    const updates: Record<string, unknown> = {};
    if (code !== undefined) updates.code = (code || "").toUpperCase();
    if (description !== undefined) updates.description = description;
    if (discount_type !== undefined) updates.discount_type = discount_type;
    if (discount_value !== undefined) updates.discount_value = String(discount_value);
    if (is_active !== undefined) updates.is_active = is_active;
    const [row] = await db
      .update(pricingDiscountsTable)
      .set(updates)
      .where(and(eq(pricingDiscountsTable.id, id), eq(pricingDiscountsTable.company_id, companyId)))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (err) {
    console.error("PUT /pricing/discounts/:id:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/discounts/:id", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const id = parseInt(req.params.id);
    await db.delete(pricingDiscountsTable).where(and(eq(pricingDiscountsTable.id, id), eq(pricingDiscountsTable.company_id, companyId)));
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /pricing/discounts/:id:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Fee Rules ─────────────────────────────────────────────────────────────────

router.get("/fees", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const rows = await db
      .select()
      .from(pricingFeeRulesTable)
      .where(eq(pricingFeeRulesTable.company_id, companyId))
      .orderBy(pricingFeeRulesTable.id);
    return res.json(rows);
  } catch (err) {
    console.error("GET /pricing/fees:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/fees", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const { rule_type, label, charge_percent, tech_split_percent, window_hours } = req.body;
    const [row] = await db
      .insert(pricingFeeRulesTable)
      .values({ company_id: companyId, rule_type: rule_type || "custom", label, charge_percent: String(charge_percent ?? "100"), tech_split_percent: String(tech_split_percent ?? "0"), window_hours: window_hours ?? null })
      .returning();
    return res.status(201).json(row);
  } catch (err) {
    console.error("POST /pricing/fees:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/fees/:id", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const id = parseInt(req.params.id);
    const { rule_type, label, charge_percent, tech_split_percent, window_hours, is_active } = req.body;
    const updates: Record<string, unknown> = {};
    if (rule_type !== undefined) updates.rule_type = rule_type;
    if (label !== undefined) updates.label = label;
    if (charge_percent !== undefined) updates.charge_percent = String(charge_percent);
    if (tech_split_percent !== undefined) updates.tech_split_percent = String(tech_split_percent);
    if (window_hours !== undefined) updates.window_hours = window_hours;
    if (is_active !== undefined) updates.is_active = is_active;
    const [row] = await db
      .update(pricingFeeRulesTable)
      .set(updates)
      .where(and(eq(pricingFeeRulesTable.id, id), eq(pricingFeeRulesTable.company_id, companyId)))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (err) {
    console.error("PUT /pricing/fees/:id:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/fees/:id", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const id = parseInt(req.params.id);
    await db.delete(pricingFeeRulesTable).where(and(eq(pricingFeeRulesTable.id, id), eq(pricingFeeRulesTable.company_id, companyId)));
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /pricing/fees/:id:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Calculate ─────────────────────────────────────────────────────────────────

router.post("/calculate", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId;
    const { scope_id, sqft, frequency, addon_ids, discount_code } = req.body;

    if (!scope_id || !sqft || !frequency) {
      return res.status(400).json({ error: "scope_id, sqft, and frequency are required" });
    }

    const [scope] = await db
      .select()
      .from(pricingScopesTable)
      .where(and(eq(pricingScopesTable.id, scope_id), eq(pricingScopesTable.company_id, companyId)));
    if (!scope) return res.status(404).json({ error: "Scope not found" });

    const tiers = await db
      .select()
      .from(pricingTiersTable)
      .where(and(eq(pricingTiersTable.scope_id, scope_id), eq(pricingTiersTable.company_id, companyId)));

    const sortedTiers = [...tiers].sort((a, b) => a.min_sqft - b.min_sqft);
    const tier = sortedTiers.find(t => sqft >= t.min_sqft && sqft <= t.max_sqft)
      ?? (sqft < Number(sortedTiers[0]?.min_sqft) ? sortedTiers[0] : sortedTiers[sortedTiers.length - 1]);

    if (!tier) return res.status(422).json({ error: "No tier found for the given sqft" });

    const base_hours = parseFloat(String(tier.hours));

    const freqs = await db
      .select()
      .from(pricingFrequenciesTable)
      .where(and(eq(pricingFrequenciesTable.scope_id, scope_id), eq(pricingFrequenciesTable.company_id, companyId)));
    const freqFactor = freqs.find(f => f.frequency === frequency);

    const scope_hourly = parseFloat(String(scope.hourly_rate));
    let hourly_rate: number;
    if (freqFactor?.rate_override != null && freqFactor.rate_override !== "") {
      hourly_rate = parseFloat(String(freqFactor.rate_override));
    } else {
      const mult = freqFactor ? parseFloat(String(freqFactor.multiplier)) : 1.0;
      hourly_rate = scope_hourly * mult;
    }

    let base_price = base_hours * hourly_rate;
    const minimum_bill = parseFloat(String(scope.minimum_bill));
    let minimum_applied = false;
    if (base_price < minimum_bill) {
      base_price = minimum_bill;
      minimum_applied = true;
    }

    let addons_total = 0;
    const addon_breakdown: Array<{ id: number; name: string; amount: number }> = [];
    if (Array.isArray(addon_ids) && addon_ids.length > 0) {
      const addons = await db
        .select()
        .from(pricingAddonsTable)
        .where(and(eq(pricingAddonsTable.scope_id, scope_id), eq(pricingAddonsTable.company_id, companyId)));
      for (const addon of addons.filter(a => addon_ids.includes(a.id) && a.is_active)) {
        let amount = 0;
        if (addon.price_type === "flat" && addon.price != null) {
          amount = parseFloat(String(addon.price));
        } else if (addon.price_type === "percent" && addon.percent_of_base != null) {
          amount = (parseFloat(String(addon.percent_of_base)) / 100) * base_price;
        }
        addons_total += amount;
        addon_breakdown.push({ id: addon.id, name: addon.name, amount: Math.round(amount * 100) / 100 });
      }
    }

    let subtotal = base_price + addons_total;
    let discount_amount = 0;
    let final_total = subtotal;

    if (discount_code) {
      const allDiscounts = await db.select().from(pricingDiscountsTable).where(eq(pricingDiscountsTable.company_id, companyId));
      const match = allDiscounts.find(d => d.code.toUpperCase() === discount_code.toUpperCase() && d.is_active);
      if (match) {
        if (match.discount_type === "flat") {
          discount_amount = parseFloat(String(match.discount_value));
        } else {
          discount_amount = (parseFloat(String(match.discount_value)) / 100) * subtotal;
        }
        final_total = Math.max(0, subtotal - discount_amount);
      }
    }

    return res.json({
      scope_id,
      sqft,
      frequency,
      tier_id: tier.id,
      base_hours,
      hourly_rate: Math.round(hourly_rate * 100) / 100,
      base_price: Math.round(base_price * 100) / 100,
      minimum_applied,
      addons_total: Math.round(addons_total * 100) / 100,
      addon_breakdown,
      subtotal: Math.round(subtotal * 100) / 100,
      discount_amount: Math.round(discount_amount * 100) / 100,
      final_total: Math.round(final_total * 100) / 100,
    });
  } catch (err) {
    console.error("POST /pricing/calculate:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
