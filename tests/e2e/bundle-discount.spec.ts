/**
 * Playwright E2E Tests — Appliance Combo Bundle Discount
 *
 * Coverage:
 *   API-level integration (Playwright request context, no browser binary required):
 *     - Public booking widget API: /api/public/calculate (tests 1–8)
 *     - Internal quote builder API: /api/pricing/calculate (tests 9–10)
 *
 *   Browser UI (skipped by default, requires Playwright Chromium):
 *     - UI Test A: Booking widget /book/phes-cleaning — discount row visible after addon click
 *     - UI Test B: Quote builder /quotes/new — discount row visible in Price Preview panel
 *
 * Run API-only tests (no browser required, always fast):
 *   pnpm --filter @workspace/tests test:e2e
 *
 * Run including browser UI tests (requires SKIP_BROWSER_TESTS=0 and Playwright browsers):
 *   SKIP_BROWSER_TESTS=0 pnpm --filter @workspace/tests test:e2e:headed
 *
 * Environment variables:
 *   TEST_BASE_URL  — frontend base URL (default: http://localhost:80)
 *   TEST_API_BASE  — API server base URL (default: http://localhost:8080)
 *   TEST_EMAIL     — owner login email (default: salmartinez@phes.io)
 *   TEST_PASSWORD  — owner login password (default: phes1234)
 */
import { test, expect, type APIRequestContext } from "@playwright/test";

const API_BASE = process.env.TEST_API_BASE ?? "http://localhost:8080";
const FRONTEND_BASE = process.env.TEST_BASE_URL ?? "http://localhost:80";
const LOGIN_EMAIL = process.env.TEST_EMAIL ?? "salmartinez@phes.io";
const LOGIN_PASSWORD = process.env.TEST_PASSWORD ?? "phes1234";

const COMPANY_ID = 1;
const SCOPE_DEEP_CLEAN = 1;
const SCOPE_STANDARD_CLEAN = 3;
const SCOPE_RECURRING_WEEKLY = 4;
const SCOPE_MOVE_IN_OUT = 12;
const ADDON_OVEN = 8;
const ADDON_FRIDGE = 10;
const ADDON_EXTRA = 9;
const EXPECTED_DISCOUNT = 20;

async function publicCalc(request: APIRequestContext, addonIds: number[], scopeId = SCOPE_DEEP_CLEAN) {
  const res = await request.post(`${API_BASE}/api/public/calculate`, {
    data: {
      company_id: COMPANY_ID,
      scope_id: scopeId,
      sqft: 1500,
      frequency: "onetime",
      addon_ids: addonIds,
    },
  });
  expect(res.status()).toBe(200);
  return res.json() as Promise<Record<string, unknown>>;
}

async function getAuthToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { token: string };
  return body.token;
}

async function internalCalc(request: APIRequestContext, token: string, addonIds: number[], scopeId = SCOPE_DEEP_CLEAN) {
  const res = await request.post(`${API_BASE}/api/pricing/calculate`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      scope_id: scopeId,
      sqft: 1500,
      frequency: "onetime",
      addon_ids: addonIds,
    },
  });
  expect(res.status()).toBe(200);
  return res.json() as Promise<Record<string, unknown>>;
}

test.describe("Appliance Combo Bundle Discount", () => {
  test.describe("Tests 1–6: Booking widget API (/api/public/calculate)", () => {
    test("Test 1: Deep Clean — Oven first [8,10] fires bundle_discount=20 with breakdown", async ({ request }) => {
      const data = await publicCalc(request, [ADDON_OVEN, ADDON_FRIDGE], SCOPE_DEEP_CLEAN);
      expect(data.bundle_discount).toBe(EXPECTED_DISCOUNT);
      expect(Array.isArray(data.bundle_breakdown)).toBe(true);
      const breakdown = data.bundle_breakdown as Array<{ name: string; discount: number }>;
      expect(breakdown.length).toBeGreaterThan(0);
      const combo = breakdown.find((b) => b.name === "Appliance Combo");
      expect(combo).toBeTruthy();
      expect(combo!.discount).toBe(EXPECTED_DISCOUNT);
    });

    test("Test 2: Deep Clean — Fridge first [10,8] fires bundle_discount=20 (order-independent)", async ({ request }) => {
      const data = await publicCalc(request, [ADDON_FRIDGE, ADDON_OVEN], SCOPE_DEEP_CLEAN);
      expect(data.bundle_discount).toBe(EXPECTED_DISCOUNT);
    });

    test("Test 3: Standard Clean scope — bundle discount fires for non-deep-clean scope", async ({ request }) => {
      const data = await publicCalc(request, [ADDON_OVEN, ADDON_FRIDGE], SCOPE_STANDARD_CLEAN);
      expect(data.bundle_discount).toBe(EXPECTED_DISCOUNT);
    });

    test("Test 4: Move In/Out scope — bundle discount fires for move-in/out jobs", async ({ request }) => {
      const data = await publicCalc(request, [ADDON_OVEN, ADDON_FRIDGE], SCOPE_MOVE_IN_OUT);
      expect(data.bundle_discount).toBe(EXPECTED_DISCOUNT);
    });

    test("Test 5: Extra add-on alongside Oven+Fridge does not block discount", async ({ request }) => {
      const data = await publicCalc(request, [ADDON_OVEN, ADDON_EXTRA, ADDON_FRIDGE], SCOPE_DEEP_CLEAN);
      expect(data.bundle_discount).toBe(EXPECTED_DISCOUNT);
    });

    test("Test 6: Recurring Weekly scope — bundle discount fires for recurring subscriptions", async ({ request }) => {
      const res = await request.post(`${API_BASE}/api/public/calculate`, {
        data: {
          company_id: COMPANY_ID,
          scope_id: SCOPE_RECURRING_WEEKLY,
          sqft: 1500,
          frequency: "weekly",
          addon_ids: [ADDON_OVEN, ADDON_FRIDGE],
        },
      });
      expect(res.status()).toBe(200);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data.bundle_discount).toBe(EXPECTED_DISCOUNT);
    });
  });

  test.describe("Tests 7–8: Negative cases — single add-on must not trigger discount", () => {
    test("Test 7: Only Oven selected — bundle_discount must be 0", async ({ request }) => {
      const data = await publicCalc(request, [ADDON_OVEN], SCOPE_DEEP_CLEAN);
      expect(data.bundle_discount).toBe(0);
    });

    test("Test 8: Only Fridge selected — bundle_discount must be 0", async ({ request }) => {
      const data = await publicCalc(request, [ADDON_FRIDGE], SCOPE_DEEP_CLEAN);
      expect(data.bundle_discount).toBe(0);
    });
  });

  test.describe("Tests 9–10: Quote builder API (/api/pricing/calculate, JWT-authenticated)", () => {
    let token = "";

    test.beforeAll(async ({ request }) => {
      token = await getAuthToken(request);
    });

    test("Test 9: Quote builder — Oven+Fridge fires bundle_discount=20 via authenticated endpoint", async ({ request }) => {
      const data = await internalCalc(request, token, [ADDON_OVEN, ADDON_FRIDGE], SCOPE_DEEP_CLEAN);
      expect(data.bundle_discount).toBe(EXPECTED_DISCOUNT);
      expect(Array.isArray(data.bundle_breakdown)).toBe(true);
      const breakdown = data.bundle_breakdown as Array<{ name: string; discount: number }>;
      expect(breakdown.length).toBeGreaterThan(0);
    });

    test("Test 10: Quote builder — Fridge first [10,8] fires bundle_discount=20 (order-independent)", async ({ request }) => {
      const data = await internalCalc(request, token, [ADDON_FRIDGE, ADDON_OVEN], SCOPE_DEEP_CLEAN);
      expect(data.bundle_discount).toBe(EXPECTED_DISCOUNT);
    });
  });

  /**
   * Browser UI Tests — verify the discount row renders in the actual page DOM.
   *
   * Skipped by default. To run:
   *   1. Install Playwright browsers: npx playwright install chromium
   *   2. Set SKIP_BROWSER_TESTS=0
   *   3. Run: SKIP_BROWSER_TESTS=0 pnpm --filter @workspace/tests test:e2e
   *
   * Booking widget flow (/book/phes-cleaning):
   *   Navigate → select Deep Clean → enter 1500 sqft → advance to add-ons →
   *   click "Oven Cleaning" → click "Refrigerator Cleaning" →
   *   assert "Appliance Combo Discount" row with "-$20.00" visible in price breakdown
   *
   * Quote builder flow (/quotes/new):
   *   Login → navigate to quotes/new → advance to Add-ons tab →
   *   select "Oven Cleaning" → select "Refrigerator Cleaning" →
   *   assert "Appliance Combo Discount" row with "-$20.00" visible in Price Preview panel
   */
  test.describe("Browser UI: Booking widget — discount row visible in price breakdown", () => {
    test.skip(process.env.SKIP_BROWSER_TESTS !== "0", "Skipped: install Playwright browsers and set SKIP_BROWSER_TESTS=0 to run browser UI tests");

    test("UI Test A: /book/phes-cleaning shows 'Appliance Combo Discount -$20.00' after selecting Oven + Fridge", async ({ page }) => {
      await page.goto(`${FRONTEND_BASE}/book/phes-cleaning`);
      await page.waitForSelector("text=Deep Clean", { timeout: 10000 });
      await page.click("text=Deep Clean");

      const sqftInputs = page.locator("input[type='number'], input[placeholder*='sqft' i], input[placeholder*='square' i]");
      await sqftInputs.first().fill("1500");

      const continueBtn = page.locator("button").filter({ hasText: /continue|next/i }).first();
      await continueBtn.click();

      const onetimeOption = page.locator("text=One-Time").first();
      if (await onetimeOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await onetimeOption.click();
      }
      const continueBtn2 = page.locator("button").filter({ hasText: /continue|next/i }).first();
      if (await continueBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await continueBtn2.click();
      }

      await page.waitForSelector("text=Oven Cleaning", { timeout: 10000 });
      await page.click("text=Oven Cleaning");
      await page.waitForTimeout(500);
      await page.click("text=Refrigerator Cleaning");

      await page.waitForSelector("text=Appliance Combo Discount", { timeout: 8000 });
      await expect(page.locator("text=Appliance Combo Discount")).toBeVisible();
      await expect(page.locator("text=-$20.00")).toBeVisible();
    });
  });

  test.describe("Browser UI: Quote builder — discount row visible in Price Preview panel", () => {
    test.skip(process.env.SKIP_BROWSER_TESTS !== "0", "Skipped: install Playwright browsers and set SKIP_BROWSER_TESTS=0 to run browser UI tests");

    test("UI Test B: /quotes/new shows 'Appliance Combo Discount -$20.00' in Price Preview after selecting Oven + Fridge", async ({ page, request }) => {
      const authToken = await getAuthToken(request);

      await page.goto(`${FRONTEND_BASE}/quotes/new`);
      await page.evaluate((t) => localStorage.setItem("auth_token", t), authToken);
      await page.reload();
      await page.waitForSelector("text=New Quote", { timeout: 10000 });

      const nameInput = page.locator("input[placeholder*='Jane' i], input[placeholder*='name' i]").first();
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill("Test Customer");
        const emailInput = page.locator("input[type='email']").first();
        await emailInput.fill("test@example.com");
        await page.locator("button").filter({ hasText: /next|property/i }).first().click();
      }

      const addonsTab = page.locator("text=Add-ons").first();
      if (await addonsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addonsTab.click();
      }

      await page.waitForSelector("text=Oven Cleaning", { timeout: 10000 });
      await page.locator("text=Oven Cleaning").first().click();
      await page.waitForTimeout(500);
      await page.locator("text=Refrigerator Cleaning").first().click();

      await page.waitForSelector("text=Appliance Combo Discount", { timeout: 8000 });
      await expect(page.locator("text=Appliance Combo Discount")).toBeVisible();
      await expect(page.locator("text=-$20.00")).toBeVisible();
    });
  });
});
