import app from "./app";
import { seedIfNeeded } from "./seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ── Environment Variable Validation ─────────────────────────────────────────
console.log("[CleanOps] Starting server...");

const REQUIRED_VARS = ["DATABASE_URL", "JWT_SECRET"];
const OPTIONAL_VARS: Record<string, string> = {
  STRIPE_SECRET_KEY: "payments disabled",
  RESEND_API_KEY: "emails disabled",
  TWILIO_ACCOUNT_SID: "SMS disabled",
  GOOGLE_MAPS_API_KEY: "geocoding disabled",
  CLOUDFLARE_R2_ACCESS_KEY: "file uploads disabled",
};

let criticalMissing = false;
for (const v of REQUIRED_VARS) {
  if (!process.env[v]) {
    console.error(`[CleanOps] FATAL: Required env var ${v} is missing`);
    criticalMissing = true;
  }
}

for (const [v, fallback] of Object.entries(OPTIONAL_VARS)) {
  if (!process.env[v]) {
    console.warn(`[CleanOps] ${v}: NOT CONFIGURED — ${fallback}`);
  } else {
    console.log(`[CleanOps] ${v}: configured`);
  }
}

if (criticalMissing) {
  console.error("[CleanOps] Missing critical env vars — server may not function correctly");
}

// ── Startup ──────────────────────────────────────────────────────────────────
seedIfNeeded().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}).catch((err) => {
  console.error("Fatal startup error:", err);
  app.listen(port, () => {
    console.log(`Server listening on port ${port} (seed skipped)`);
  });
});
