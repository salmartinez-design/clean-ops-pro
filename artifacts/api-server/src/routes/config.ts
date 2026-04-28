/**
 * Frontend runtime configuration.
 *
 * The dispatch popover and other inline editors load Google Maps Places
 * Autocomplete in the browser. The Vite build maps process.env.
 * GOOGLE_MAPS_API_KEY into import.meta.env.VITE_GOOGLE_MAPS_API_KEY at
 * compile time, but if the env var was not set on the build host the
 * bundle ships with an empty string. Fetching the key at runtime makes
 * the frontend resilient to that build state and lets us rotate keys
 * without a rebuild.
 *
 * Auth gated. The same key is already discoverable in any compiled
 * bundle that did receive it, so exposing it to authenticated users adds
 * no real attack surface.
 */
import { Router } from "express";
import { requireAuth } from "../lib/auth.js";

const router = Router();

/**
 * GET /api/config/google-maps-key
 *
 * 200 { key: string } — empty string when the server has no key configured.
 * Frontend treats empty as "Maps unavailable" and falls back to manual entry.
 */
router.get("/google-maps-key", requireAuth, (_req, res) => {
  return res.json({ key: process.env.GOOGLE_MAPS_API_KEY ?? "" });
});

export default router;
