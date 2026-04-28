/**
 * [AI.8] Geocoding helpers backed by Google Maps Geocoding API.
 *
 * Two entry points:
 *   - geocodeAddress(address)        → just lat/lng (legacy, used by job intake)
 *   - geocodeWithComponents(address) → full {lat, lng, zip, formatted_address,
 *                                            components} for the AI.8 admin
 *                                            geocode endpoint
 *
 * Both honor GOOGLE_MAPS_API_KEY env var. Without it they return null and
 * log a warning so callers fall through gracefully.
 */

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn("[Geocode] GOOGLE_MAPS_API_KEY not set — geocoding disabled");
    return null;
  }
  try {
    const encoded = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("[Geocode] HTTP error", res.status);
      return null;
    }
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.length) {
      console.warn("[Geocode] No results for address:", address, "status:", data.status);
      return null;
    }
    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  } catch (err) {
    console.error("[Geocode] Error:", err);
    return null;
  }
}

export interface GeocodeComponents {
  lat: number;
  lng: number;
  zip: string | null;
  state: string | null;
  city: string | null;
  street: string | null;
  formatted_address: string;
  /** Raw Google components for debugging / future fields */
  raw_components: Array<{ long_name: string; short_name: string; types: string[] }>;
}

/**
 * [AI.8] Full geocode that pulls postal_code + locality + admin_area + street
 * out of the response so the caller can backfill clients.zip/city/state/address
 * from a single API hit.
 */
export async function geocodeWithComponents(address: string): Promise<GeocodeComponents | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn("[Geocode] GOOGLE_MAPS_API_KEY not set — geocoding disabled");
    return null;
  }
  if (!address || !address.trim()) return null;
  try {
    const encoded = encodeURIComponent(address.trim());
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("[Geocode] HTTP error", res.status, "for", address);
      return null;
    }
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.length) {
      console.warn("[Geocode] No results for", address, "status:", data.status);
      return null;
    }
    const r = data.results[0];
    const { lat, lng } = r.geometry.location;
    const components: Array<{ long_name: string; short_name: string; types: string[] }> = r.address_components ?? [];
    const findComp = (...types: string[]): { long: string | null; short: string | null } => {
      for (const t of types) {
        const c = components.find(x => x.types.includes(t));
        if (c) return { long: c.long_name, short: c.short_name };
      }
      return { long: null, short: null };
    };
    const zipComp = findComp("postal_code");
    const cityComp = findComp("locality", "sublocality", "postal_town");
    const stateComp = findComp("administrative_area_level_1");
    const streetNumber = findComp("street_number").long;
    const route = findComp("route").long;
    const street = [streetNumber, route].filter(Boolean).join(" ") || null;
    return {
      lat: Number(lat),
      lng: Number(lng),
      zip: zipComp.short ? String(zipComp.short).slice(0, 5) : null,
      state: stateComp.short,
      city: cityComp.long,
      street,
      formatted_address: r.formatted_address ?? address,
      raw_components: components,
    };
  } catch (err) {
    console.error("[Geocode] Error for", address, ":", err);
    return null;
  }
}
