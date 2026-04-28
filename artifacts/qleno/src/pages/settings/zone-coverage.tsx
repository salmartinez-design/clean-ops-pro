/**
 * [AI.8] Zone coverage admin page.
 *
 * 576 of 1308 Phes clients had no parseable zip after MC import.
 * AI.7.7's text-extraction backfill couldn't help — the data wasn't
 * there. This page is the operator's worklist for filling those gaps
 * via Google Maps geocoding (when an address fragment exists) or
 * manual entry (when no address text exists at all).
 *
 * Auth: super_admin or owner. Field staff blocked by route-level
 * permissions on the API endpoints (admin.ts).
 */
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { MapPin, RefreshCw, AlertTriangle, Check, X } from "lucide-react";
import { formatAddress } from "@/lib/format-address";

const FF = "'Plus Jakarta Sans', sans-serif";

interface MissingZipClient {
  id: number;
  name: string;
  clients_address: string | null;
  clients_city: string | null;
  clients_state: string | null;
  recent_job_street: string | null;
  recent_job_city: string | null;
  recent_job_state: string | null;
  upcoming_job_count: number;
  geocoded_at: string | null;
  geocode_source: string | null;
  candidate_address: string | null;
  action: "geocode" | "manual_entry";
}

interface ListResponse {
  company_id: number;
  total: number;
  can_geocode: number;
  needs_manual: number;
  clients: MissingZipClient[];
}

interface GeocodeResult {
  client_id: number;
  name: string;
  status: "succeeded" | "failed" | "skipped";
  zip?: string;
  lat?: number;
  lng?: number;
  formatted_address?: string;
  reason?: string;
}

interface GeocodeResponse {
  company_id: number;
  dry_run: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  sample_results: GeocodeResult[];
  results: GeocodeResult[];
}

export default function AdminZoneCoverage() {
  const { toast } = useToast();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<GeocodeResponse | null>(null);
  const [perRowBusy, setPerRowBusy] = useState<Set<number>>(new Set());
  const [manualOpen, setManualOpen] = useState<number | null>(null);
  const [manualForm, setManualForm] = useState({ address: "", city: "", state: "IL", zip: "" });

  async function load() {
    setLoading(true);
    try {
      // [AI.8] source=page_mount is the telemetry flag — server logs
      // a "[AI.8] zone-coverage page viewed" line only on this branch,
      // so the sidebar's 60s poll doesn't spam logs.
      const r = await fetch("/api/admin/clients-missing-zip?source=page_mount", { headers: getAuthHeaders() });
      if (!r.ok) {
        const body = await r.text();
        throw new Error(body || `HTTP ${r.status}`);
      }
      setData(await r.json());
    } catch (err) {
      toast({ title: "Failed to load", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function geocode(opts: { dry_run?: boolean; client_ids?: number[]; batch_size?: number }) {
    setRunning(true);
    setLastRun(null);
    try {
      const r = await fetch("/api/admin/geocode-clients", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_size: opts.batch_size ?? 1000,
          dry_run: !!opts.dry_run,
          client_ids: opts.client_ids,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        // [AI.8.2] Concatenate pg_code / pg_detail when present so the
        // toast surfaces what Postgres actually said, not just
        // "Failed query". Console gets the full body for forensics.
        console.error("[zone-coverage] geocode failed", body);
        const parts = [
          body?.message,
          body?.pg_code && `code=${body.pg_code}`,
          body?.pg_detail,
          body?.pg_hint && `hint: ${body.pg_hint}`,
        ].filter(Boolean);
        throw new Error(parts.join(" · ") || `HTTP ${r.status}`);
      }
      setLastRun(body);
      const verb = opts.dry_run ? "Dry run complete" : "Geocode complete";
      toast({
        title: verb,
        description: `Processed ${body.processed}: ${body.succeeded} ok, ${body.failed} failed, ${body.skipped} skipped`,
      });
      if (!opts.dry_run) await load();
    } catch (err) {
      toast({ title: "Geocode failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }

  async function geocodeOne(id: number) {
    setPerRowBusy(prev => { const n = new Set(prev); n.add(id); return n; });
    try {
      await geocode({ client_ids: [id], batch_size: 1 });
    } finally {
      setPerRowBusy(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  async function saveManual(id: number) {
    if (!manualForm.zip.match(/^\d{5}$/)) {
      toast({ title: "Invalid zip", description: "Enter a 5-digit US zip", variant: "destructive" });
      return;
    }
    try {
      const r = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          address: manualForm.address || null,
          city: manualForm.city || null,
          state: manualForm.state || "IL",
          zip: manualForm.zip,
        }),
      });
      if (!r.ok) {
        const body = await r.text();
        throw new Error(body || `HTTP ${r.status}`);
      }
      toast({ title: "Address saved", description: `Client ${id}` });
      setManualOpen(null);
      setManualForm({ address: "", city: "", state: "IL", zip: "" });
      await load();
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  }

  return (
    <DashboardLayout>
      <div style={{ padding: "24px 32px", fontFamily: FF }}>
        {/* HEADER */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#1A1917", marginBottom: 4 }}>Zone coverage</div>
          <div style={{ fontSize: 13, color: "#6B6860", lineHeight: 1.5 }}>
            Clients with no zip code on file. Pre-launch data gap from MaidCentral import.
            Geocode those with usable address text; enter manually when no address exists.
          </div>
        </div>

        {/* SUMMARY + ACTIONS */}
        <div style={{
          backgroundColor: "#FFFFFF", border: "1px solid #E5E2DC", borderRadius: 10,
          padding: 20, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16,
        }}>
          <div style={{ display: "flex", gap: 32 }}>
            <Stat label="Missing zip" value={data?.total ?? "—"} />
            <Stat label="Can geocode" value={data?.can_geocode ?? "—"} color="#2D9B83" />
            <Stat label="Needs manual entry" value={data?.needs_manual ?? "—"} color="#D97706" />
            {lastRun && (
              <Stat label="Last run · succeeded" value={lastRun.succeeded} color="#16A34A" />
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => geocode({ dry_run: true })}
              disabled={running || (data?.can_geocode ?? 0) === 0}
              style={btnSecondary(running || (data?.can_geocode ?? 0) === 0)}
            >
              {running ? "..." : "Dry run"}
            </button>
            <button
              onClick={() => geocode({ dry_run: false })}
              disabled={running || (data?.can_geocode ?? 0) === 0}
              style={btnPrimary(running || (data?.can_geocode ?? 0) === 0)}
            >
              <RefreshCw size={14} /> {running ? "Geocoding..." : `Geocode All (${data?.can_geocode ?? 0})`}
            </button>
          </div>
        </div>

        {/* LAST RUN SAMPLE RESULTS */}
        {lastRun && lastRun.sample_results.length > 0 && (
          <div style={{
            backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10,
            padding: 16, marginBottom: 20,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              {lastRun.dry_run ? "Dry run sample" : "Last run · sample (first 10)"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {lastRun.sample_results.map(r => (
                <div key={r.client_id} style={{ fontSize: 12, color: "#1A1917", fontFamily: "ui-monospace, monospace" }}>
                  <span style={{
                    fontWeight: 700,
                    color: r.status === "succeeded" ? "#16A34A" : r.status === "failed" ? "#DC2626" : "#9E9B94",
                    marginRight: 8,
                  }}>{r.status.toUpperCase()}</span>
                  <span style={{ marginRight: 8 }}>#{r.client_id} {r.name}</span>
                  {r.zip && <span style={{ color: "#2D9B83" }}>→ {r.zip}</span>}
                  {r.formatted_address && <span style={{ color: "#6B6860", marginLeft: 6 }}>· {r.formatted_address}</span>}
                  {r.reason && <span style={{ color: "#6B6860" }}>· {r.reason}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CLIENT LIST */}
        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E2DC", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #F0EEE9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1917" }}>
              {loading ? "Loading..." : `${data?.total ?? 0} clients`}
            </div>
            <button onClick={load} style={btnGhost(loading)}><RefreshCw size={12} /> Refresh</button>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#9E9B94", fontSize: 13 }}>Loading...</div>
          ) : !data || data.clients.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <Check size={32} color="#16A34A" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1917" }}>All clients have a zip</div>
              <div style={{ fontSize: 12, color: "#6B6860", marginTop: 4 }}>Zone coverage is complete.</div>
            </div>
          ) : (
            <div>
              {data.clients.map((c, i) => (
                <div key={c.id} style={{
                  padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid #F0EEE9",
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1917" }}>{c.name}</span>
                      <span style={{ fontSize: 11, color: "#9E9B94" }}>#{c.id}</span>
                      {c.upcoming_job_count > 0 && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: "#92400E", backgroundColor: "#FEF3C7",
                          padding: "1px 6px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em",
                        }}>
                          {c.upcoming_job_count} upcoming
                        </span>
                      )}
                      {c.action === "geocode" ? (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: "#1D4ED8", backgroundColor: "#DBEAFE",
                          padding: "1px 6px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em",
                        }}>
                          Geocodable
                        </span>
                      ) : (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: "#991B1B", backgroundColor: "#FEE2E2",
                          padding: "1px 6px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em",
                          display: "inline-flex", alignItems: "center", gap: 3,
                        }}>
                          <AlertTriangle size={9} /> No address
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#6B6860", display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={11} style={{ color: "#9E9B94", flexShrink: 0 }} />
                      {c.candidate_address || <span style={{ fontStyle: "italic" }}>No address text in clients or jobs</span>}
                    </div>
                    {c.candidate_address && c.recent_job_street && !c.clients_address && (
                      <div style={{ fontSize: 10, color: "#9E9B94", marginTop: 2, marginLeft: 15 }}>
                        Source: most recent job
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {c.action === "geocode" && (
                      <button
                        onClick={() => geocodeOne(c.id)}
                        disabled={perRowBusy.has(c.id) || running}
                        style={btnSecondary(perRowBusy.has(c.id) || running)}
                      >
                        {perRowBusy.has(c.id) ? "..." : "Geocode"}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setManualOpen(c.id);
                        setManualForm({
                          address: c.clients_address || c.recent_job_street || "",
                          city: c.clients_city || c.recent_job_city || "",
                          state: c.clients_state || c.recent_job_state || "IL",
                          zip: "",
                        });
                      }}
                      style={btnGhost(false)}
                    >
                      Add address
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MANUAL ENTRY MODAL */}
      {manualOpen != null && (
        <>
          <div onClick={() => setManualOpen(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 410 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            zIndex: 411, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 24,
            width: "100%", maxWidth: 480, fontFamily: FF, boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1917" }}>
                Add address — {data?.clients.find(c => c.id === manualOpen)?.name}
              </div>
              <button onClick={() => setManualOpen(null)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}>
                <X size={18} color="#6B6860" />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Street">
                <input
                  type="text" value={manualForm.address}
                  onChange={e => setManualForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="1234 N Main St"
                  style={inputStyle}
                />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px", gap: 12 }}>
                <Field label="City">
                  <input
                    type="text" value={manualForm.city}
                    onChange={e => setManualForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="Chicago"
                    style={inputStyle}
                  />
                </Field>
                <Field label="State">
                  <input
                    type="text" value={manualForm.state}
                    onChange={e => setManualForm(f => ({ ...f, state: e.target.value.toUpperCase().slice(0, 2) }))}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Zip">
                  <input
                    type="text" inputMode="numeric" maxLength={5}
                    value={manualForm.zip}
                    onChange={e => setManualForm(f => ({ ...f, zip: e.target.value.replace(/\D/g, "").slice(0, 5) }))}
                    placeholder="60629"
                    style={inputStyle}
                  />
                </Field>
              </div>
              <div style={{ fontSize: 11, color: "#9E9B94", marginTop: 4 }}>
                Preview: {formatAddress(manualForm.address, manualForm.city, manualForm.state, manualForm.zip) || "—"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button onClick={() => setManualOpen(null)} style={{ flex: 1, ...btnGhost(false), padding: "10px", justifyContent: "center" }}>
                Cancel
              </button>
              <button onClick={() => saveManual(manualOpen)} disabled={!manualForm.zip.match(/^\d{5}$/)} style={{ flex: 2, ...btnPrimary(!manualForm.zip.match(/^\d{5}$/)), padding: "10px", justifyContent: "center" }}>
                Save address
              </button>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color ?? "#1A1917", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#9E9B94", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6B6860", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 40, padding: "0 12px", border: "1px solid #E5E2DC", borderRadius: 8,
  fontSize: 14, fontFamily: FF, outline: "none", backgroundColor: "#FAFAF9", color: "#1A1917",
  boxSizing: "border-box",
};

function btnPrimary(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
    border: "none", backgroundColor: disabled ? "#9E9B94" : "var(--brand, #2D9B83)",
    color: "#FFFFFF", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: FF, opacity: disabled ? 0.6 : 1,
  };
}
function btnSecondary(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
    border: "1px solid #E5E2DC", backgroundColor: "#FFFFFF",
    color: "#1A1917", fontSize: 12, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: FF, opacity: disabled ? 0.5 : 1,
  };
}
function btnGhost(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6,
    border: "none", backgroundColor: "transparent",
    color: "#6B6860", fontSize: 12, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: FF, opacity: disabled ? 0.5 : 1,
  };
}
