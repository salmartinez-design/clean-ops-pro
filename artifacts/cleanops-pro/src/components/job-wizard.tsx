import { useState, useEffect, useRef } from "react";
import { getAuthHeaders } from "@/lib/auth";
import { X, ChevronRight, ChevronLeft, Search, Check, Clock, User, Calendar, Sparkles, Zap, ArrowRightCircle, Home, RefreshCw, Wrench, Building2, LayoutGrid, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SuggestedTech {
  employee_id: number;
  name: string;
  avatar_url: string | null;
  tier: number;
  reason: string;
  zone_color: string | null;
  zone_name: string | null;
  last_job_end_time: string | null;
}

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const SERVICE_TYPES: { value: string; label: string; price: number; icon: LucideIcon; duration: number }[] = [
  { value: "standard_clean",    label: "Standard Clean",    price: 120, icon: Sparkles,         duration: 120 },
  { value: "deep_clean",        label: "Deep Clean",        price: 220, icon: Zap,              duration: 180 },
  { value: "move_out",          label: "Move Out",          price: 300, icon: ArrowRightCircle, duration: 240 },
  { value: "move_in",           label: "Move In",           price: 280, icon: Home,             duration: 240 },
  { value: "recurring",         label: "Recurring",         price: 95,  icon: RefreshCw,        duration: 90  },
  { value: "post_construction", label: "Post-Construction", price: 450, icon: Wrench,           duration: 300 },
  { value: "office_cleaning",   label: "Office Cleaning",   price: 200, icon: Building2,        duration: 150 },
  { value: "common_areas",      label: "Common Areas",      price: 150, icon: LayoutGrid,       duration: 120 },
];

const TIME_OPTIONS = [
  "07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00",
];

const DURATION_OPTIONS = [60, 90, 120, 150, 180, 210, 240, 300, 360];

const FREQ_OPTIONS = [
  { value: "one_time", label: "One Time" },
  { value: "weekly",   label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" },
  { value: "monthly",  label: "Monthly" },
];

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled", in_progress: "In Progress", complete: "Complete", cancelled: "Cancelled",
};

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDate(d: string) {
  return new Date(d + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

interface JobWizardProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function JobWizard({ open, onClose, onCreated }: JobWizardProps) {
  const [step, setStep] = useState(1);

  // Step 1 — Client
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientRecentJobs, setClientRecentJobs] = useState<any[]>([]);
  const clientDebounce = useRef<ReturnType<typeof setTimeout>>();

  // Step 2 — Details
  const [serviceType, setServiceType] = useState("standard_clean");
  const [scheduledDate, setScheduledDate] = useState(todayStr());
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [duration, setDuration] = useState(120);
  const [price, setPrice] = useState(120);
  const [priceOverridden, setPriceOverridden] = useState(false);
  const [frequency, setFrequency] = useState("one_time");
  const [notes, setNotes] = useState("");

  // Step 3 — Assign
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Smart suggestions
  const [suggestions, setSuggestions] = useState<SuggestedTech[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setClientQuery(""); setClientResults([]); setSelectedClient(null); setClientRecentJobs([]);
      setServiceType("standard_clean"); setScheduledDate(todayStr()); setScheduledTime("09:00");
      setDuration(120); setPrice(120); setPriceOverridden(false); setFrequency("one_time"); setNotes("");
      setSelectedEmployee(null); setSubmitting(false); setError("");
      setSuggestions([]); setSuggestionsLoading(false); setSuggestionsDismissed(false);
    }
  }, [open]);

  // Client search debounce
  useEffect(() => {
    clearTimeout(clientDebounce.current);
    if (clientQuery.length < 2) { setClientResults([]); return; }
    clientDebounce.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/api/clients?search=${encodeURIComponent(clientQuery)}&limit=6`, { headers: getAuthHeaders() });
        if (r.ok) { const d = await r.json(); setClientResults(d.data || d || []); }
      } catch {}
    }, 250);
  }, [clientQuery]);

  // Load last 3 jobs when client selected
  useEffect(() => {
    if (!selectedClient) { setClientRecentJobs([]); return; }
    fetch(`${API}/api/jobs?client_id=${selectedClient.id}&limit=3&sort=desc`, { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => setClientRecentJobs(d?.data?.slice(0, 3) || []))
      .catch(() => {});
  }, [selectedClient]);

  // Load employees when entering step 3
  useEffect(() => {
    if (step !== 3) return;
    fetch(`${API}/api/users?role=cleaner,employee&active=true`, { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => setEmployees(d?.data || d || []))
      .catch(() => {});
  }, [step]);

  // Fetch smart suggestions when entering step 3 (or when date/time/duration changes while on step 3)
  useEffect(() => {
    if (step !== 3) return;
    const zip = selectedClient?.zip;
    if (!scheduledDate || !scheduledTime || !duration || !zip) return;

    // Compute end_time from start + duration
    const [h, m] = scheduledTime.split(":").map(Number);
    const endTotalMins = h * 60 + (m || 0) + duration;
    const endH = Math.floor(endTotalMins / 60) % 24;
    const endM = endTotalMins % 60;
    const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    setSuggestionsLoading(true);
    setSuggestions([]);
    fetch(`${API}/api/jobs/suggest-tech`, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ date: scheduledDate, start_time: scheduledTime, end_time: endTime, zip_code: zip }),
    })
      .then(r => r.ok ? r.json() : [])
      .then(d => setSuggestions(Array.isArray(d) ? d : []))
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionsLoading(false));
  }, [step, scheduledDate, scheduledTime, duration, selectedClient?.zip]);

  // Auto-price on service type change
  useEffect(() => {
    if (priceOverridden) return;
    const svc = SERVICE_TYPES.find(s => s.value === serviceType);
    if (svc) { setPrice(svc.price); setDuration(svc.duration); }
  }, [serviceType, priceOverridden]);

  async function submit() {
    if (!selectedClient) return;
    setSubmitting(true); setError("");
    try {
      const body = {
        client_id: selectedClient.id,
        service_type: serviceType,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime + ":00",
        duration_minutes: duration,
        base_fee: price,
        frequency,
        notes: notes || undefined,
        assigned_user_id: selectedEmployee || undefined,
        status: "scheduled",
      };
      const r = await fetch(`${API}/api/jobs`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || "Failed"); }
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const svcConfig = SERVICE_TYPES.find(s => s.value === serviceType)!;

  const OVERLAY: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9998,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };
  const MODAL: React.CSSProperties = {
    background: "#FFFFFF", borderRadius: 16, width: "min(600px, 96vw)",
    maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
    position: "relative",
  };
  const STEP_LABEL = (n: number, label: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 14,
        background: step >= n ? "var(--brand, #5B9BD5)" : "#F3F4F6",
        color: step >= n ? "#fff" : "#9E9B94",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}>{step > n ? <Check size={13}/> : n}</div>
      <span style={{ fontSize: 12, fontWeight: step === n ? 700 : 400, color: step === n ? "#1A1917" : "#9E9B94" }}>{label}</span>
    </div>
  );

  return (
    <div style={OVERLAY} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={MODAL}>
        {/* Header */}
        <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#1A1917", margin: "0 0 12px" }}>Create New Job</p>
              <div style={{ display: "flex", gap: 24 }}>
                {STEP_LABEL(1, "Client")}
                <div style={{ width: 24, height: 1, background: "#E5E2DC", alignSelf: "center" }}/>
                {STEP_LABEL(2, "Details")}
                <div style={{ width: 24, height: 1, background: "#E5E2DC", alignSelf: "center" }}/>
                {STEP_LABEL(3, "Assign")}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9E9B94", padding: 4 }}><X size={20}/></button>
          </div>
        </div>

        <div style={{ padding: "20px 24px" }}>

          {/* ── STEP 1: CLIENT ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9E9B94" }}/>
                <input
                  autoFocus
                  value={clientQuery}
                  onChange={e => setClientQuery(e.target.value)}
                  placeholder="Search client by name, email, or phone…"
                  style={{ width: "100%", padding: "10px 12px 10px 34px", border: "1px solid #E5E2DC", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {clientResults.length > 0 && !selectedClient && (
                <div style={{ border: "1px solid #E5E2DC", borderRadius: 10, overflow: "hidden" }}>
                  {clientResults.map((c, i) => (
                    <button key={c.id} onClick={() => { setSelectedClient(c); setClientQuery(`${c.first_name} ${c.last_name}`); setClientResults([]); }}
                      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 14px", background: "#fff", border: "none", borderBottom: i < clientResults.length - 1 ? "1px solid #F3F4F6" : "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 17, background: "#EBF4FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--brand, #5B9BD5)", flexShrink: 0 }}>
                        {c.first_name?.[0]}{c.last_name?.[0]}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1A1917", margin: "0 0 2px" }}>{c.first_name} {c.last_name}</p>
                        <p style={{ fontSize: 11, color: "#9E9B94", margin: 0 }}>{c.email} · {c.city || c.address || ""}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedClient && (
                <div style={{ background: "#EBF4FF", border: "1px solid color-mix(in srgb, var(--brand) 30%, transparent)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 18, background: "var(--brand, #5B9BD5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                    {selectedClient.first_name?.[0]}{selectedClient.last_name?.[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#1A1917", margin: "0 0 2px" }}>{selectedClient.first_name} {selectedClient.last_name}</p>
                    <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>{selectedClient.email}{selectedClient.address ? ` · ${selectedClient.address}` : ""}</p>
                  </div>
                  <button onClick={() => { setSelectedClient(null); setClientQuery(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#9E9B94", padding: 4 }}><X size={14}/></button>
                </div>
              )}

              {selectedClient && clientRecentJobs.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#9E9B94", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Last 3 Jobs</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {clientRecentJobs.map((j: any) => (
                      <div key={j.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: "#F9F9F9", borderRadius: 8, border: "1px solid #E5E2DC" }}>
                        <span style={{ fontSize: 12, color: "#1A1917" }}>{j.service_type?.replace(/_/g, " ")}</span>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: "#9E9B94" }}>{formatDate(j.scheduled_date)}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: j.status === "complete" ? "#16A34A" : "#6B7280" }}>{STATUS_LABELS[j.status] || j.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: DETAILS ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Service Type Grid */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Service Type</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {SERVICE_TYPES.map(svc => (
                    <button key={svc.value} onClick={() => setServiceType(svc.value)}
                      style={{ padding: "12px 8px", border: `2px solid ${serviceType === svc.value ? "var(--brand, #5B9BD5)" : "#E5E2DC"}`, borderRadius: 10, background: serviceType === svc.value ? "#EBF4FF" : "#fff", cursor: "pointer", textAlign: "center", fontFamily: "inherit", transition: "all 0.15s" }}>
                      <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                        <svc.icon size={18} color={serviceType === svc.value ? "var(--brand, #5B9BD5)" : "#6B7280"}/>
                      </div>
                      <p style={{ fontSize: 10, fontWeight: 600, color: serviceType === svc.value ? "var(--brand, #5B9BD5)" : "#6B7280", margin: 0, lineHeight: 1.3 }}>{svc.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date + Time */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Date</p>
                  <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #E5E2DC", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}/>
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Time</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {TIME_OPTIONS.map(t => (
                      <button key={t} onClick={() => setScheduledTime(t)}
                        style={{ padding: "5px 10px", border: `1.5px solid ${scheduledTime === t ? "var(--brand, #5B9BD5)" : "#E5E2DC"}`, borderRadius: 6, background: scheduledTime === t ? "#EBF4FF" : "#fff", fontSize: 11, fontWeight: scheduledTime === t ? 700 : 400, color: scheduledTime === t ? "var(--brand, #5B9BD5)" : "#6B7280", cursor: "pointer", fontFamily: "inherit" }}>
                        {formatTime(t)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Duration + Price */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Duration</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {DURATION_OPTIONS.map(d => (
                      <button key={d} onClick={() => setDuration(d)}
                        style={{ padding: "5px 10px", border: `1.5px solid ${duration === d ? "var(--brand, #5B9BD5)" : "#E5E2DC"}`, borderRadius: 6, background: duration === d ? "#EBF4FF" : "#fff", fontSize: 11, fontWeight: duration === d ? 700 : 400, color: duration === d ? "var(--brand, #5B9BD5)" : "#6B7280", cursor: "pointer", fontFamily: "inherit" }}>
                        {d >= 60 ? `${d / 60}h` : `${d}m`}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Price</p>
                    <span style={{ fontSize: 10, color: "#9E9B94" }}>{priceOverridden ? "Custom" : `Auto (${svcConfig?.label})`}</span>
                  </div>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#6B7280" }}>$</span>
                    <input type="number" value={price} onChange={e => { setPrice(Number(e.target.value)); setPriceOverridden(true); }}
                      style={{ width: "100%", padding: "9px 12px 9px 24px", border: "1px solid #E5E2DC", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}/>
                  </div>
                </div>
              </div>

              {/* Frequency + Notes */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Frequency</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {FREQ_OPTIONS.map(f => (
                      <button key={f.value} onClick={() => setFrequency(f.value)}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: `1.5px solid ${frequency === f.value ? "var(--brand, #5B9BD5)" : "#E5E2DC"}`, borderRadius: 8, background: frequency === f.value ? "#EBF4FF" : "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                        {frequency === f.value && <Check size={12} color="var(--brand, #5B9BD5)"/>}
                        <span style={{ fontSize: 12, fontWeight: frequency === f.value ? 600 : 400, color: frequency === f.value ? "var(--brand, #5B9BD5)" : "#6B7280" }}>{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Notes (optional)</p>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions, access codes, etc…"
                    style={{ width: "100%", height: 130, padding: "10px 12px", border: "1px solid #E5E2DC", borderRadius: 8, fontSize: 12, fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.5 }}/>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: ASSIGN ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Summary card */}
              <div style={{ background: "#F7F6F3", borderRadius: 10, padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#9E9B94", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Client</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1A1917", margin: 0 }}>{selectedClient?.first_name} {selectedClient?.last_name}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#9E9B94", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Service</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1A1917", margin: 0 }}>{svcConfig?.label}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#9E9B94", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Date & Time</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1A1917", margin: 0 }}>{formatDate(scheduledDate)} · {formatTime(scheduledTime)}</p>
                </div>
              </div>

              {/* ── Smart Suggestions ── */}
              {!suggestionsDismissed && (suggestionsLoading || suggestions.length > 0 || (!suggestionsLoading && selectedClient?.zip)) && (
                <div style={{ border: "1px solid #E5E2DC", borderRadius: 12, overflow: "hidden" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#F7F6F3", borderBottom: "1px solid #E5E2DC" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <MapPin size={13} color="var(--brand, #5B9BD5)"/>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#1A1917", textTransform: "uppercase", letterSpacing: "0.06em" }}>Smart Suggestions</span>
                    </div>
                    <button onClick={() => setSuggestionsDismissed(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9E9B94", padding: 2, lineHeight: 1 }}>
                      <X size={13}/>
                    </button>
                  </div>

                  {/* Loading skeletons */}
                  {suggestionsLoading && (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderBottom: i < 2 ? "1px solid #F3F4F6" : "none" }}>
                          <div style={{ width: 34, height: 34, borderRadius: 17, background: "#F3F4F6", flexShrink: 0, animation: "pulse 1.5s ease-in-out infinite" }}/>
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ height: 11, width: "55%", background: "#F3F4F6", borderRadius: 4 }}/>
                            <div style={{ height: 9, width: "35%", background: "#F3F4F6", borderRadius: 4 }}/>
                          </div>
                          <div style={{ height: 28, width: 58, background: "#F3F4F6", borderRadius: 6 }}/>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggestion rows */}
                  {!suggestionsLoading && suggestions.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {suggestions.map((s, i) => {
                        const isTop = i === 0;
                        const initials = s.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("");
                        return (
                          <div key={s.employee_id} style={{
                            display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
                            borderLeft: isTop ? "3px solid var(--brand, #5B9BD5)" : "3px solid transparent",
                            borderBottom: i < suggestions.length - 1 ? "1px solid #F3F4F6" : "none",
                            background: selectedEmployee === s.employee_id ? "#EBF4FF" : "#fff",
                          }}>
                            {/* Avatar */}
                            {s.avatar_url
                              ? <img src={s.avatar_url} style={{ width: 34, height: 34, borderRadius: 17, objectFit: "cover", flexShrink: 0 }}/>
                              : <div style={{ width: 34, height: 34, borderRadius: 17, background: isTop ? "#EBF4FF" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: isTop ? "var(--brand, #5B9BD5)" : "#6B7280", flexShrink: 0 }}>
                                  {initials}
                                </div>
                            }
                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1917" }}>{s.name}</span>
                                {s.zone_color && (
                                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.zone_color, flexShrink: 0, display: "inline-block" }}/>
                                    <span style={{ fontSize: 10, color: "#9E9B94" }}>{s.zone_name}</span>
                                  </span>
                                )}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 10,
                                  background: s.tier === 1 ? "#DCFCE7" : s.tier === 2 ? "#EBF4FF" : s.tier === 3 ? "#FEF3C7" : "#F3F4F6",
                                  color: s.tier === 1 ? "#16A34A" : s.tier === 2 ? "var(--brand, #5B9BD5)" : s.tier === 3 ? "#D97706" : "#6B7280",
                                }}>
                                  {s.reason}
                                </span>
                                {s.last_job_end_time && (
                                  <span style={{ fontSize: 10, color: "#9E9B94" }}>Free after {s.last_job_end_time}</span>
                                )}
                                {!s.last_job_end_time && (
                                  <span style={{ fontSize: 10, color: "#9E9B94" }}>Available all day</span>
                                )}
                              </div>
                            </div>
                            {/* Assign button */}
                            <button
                              onClick={() => {
                                setSelectedEmployee(s.employee_id);
                                setSuggestionsDismissed(true);
                              }}
                              style={{
                                padding: "6px 12px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "inherit",
                                fontSize: 11, fontWeight: 700, flexShrink: 0,
                                background: selectedEmployee === s.employee_id ? "var(--brand, #5B9BD5)" : "#F3F4F6",
                                color: selectedEmployee === s.employee_id ? "#fff" : "#1A1917",
                              }}
                            >
                              {selectedEmployee === s.employee_id ? "Assigned" : "Assign"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* No suggestions */}
                  {!suggestionsLoading && suggestions.length === 0 && (
                    <div style={{ padding: "16px 14px", textAlign: "center" }}>
                      <p style={{ fontSize: 12, color: "#9E9B94", margin: 0 }}>No techs available in this window — adjust time or date</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Full employee list ── */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {suggestions.length > 0 && !suggestionsDismissed ? "All Technicians" : "Choose Assignee (optional)"}
                </p>
                {employees.length === 0 && (
                  <p style={{ fontSize: 13, color: "#9E9B94", textAlign: "center", padding: "20px 0" }}>No active employees found</p>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {employees.map((e: any) => (
                    <button key={e.id} onClick={() => setSelectedEmployee(selectedEmployee === e.id ? null : e.id)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: `2px solid ${selectedEmployee === e.id ? "var(--brand, #5B9BD5)" : "#E5E2DC"}`, borderRadius: 10, background: selectedEmployee === e.id ? "#EBF4FF" : "#fff", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                      {e.avatar_url
                        ? <img src={e.avatar_url} style={{ width: 36, height: 36, borderRadius: 18, objectFit: "cover", flexShrink: 0 }}/>
                        : <div style={{ width: 36, height: 36, borderRadius: 18, background: "#E5E2DC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#6B7280", flexShrink: 0 }}>
                            {e.first_name?.[0]}{e.last_name?.[0]}
                          </div>
                      }
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1A1917", margin: "0 0 2px" }}>{e.first_name} {e.last_name}</p>
                        <p style={{ fontSize: 11, color: "#9E9B94", margin: 0, textTransform: "capitalize" }}>{e.role?.replace(/_/g, " ")}</p>
                      </div>
                      {selectedEmployee === e.id && <Check size={16} color="var(--brand, #5B9BD5)"/>}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p style={{ fontSize: 12, color: "#DC2626", background: "#FEE2E2", borderRadius: 6, padding: "8px 12px", margin: 0 }}>{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", border: "1px solid #E5E2DC", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#6B7280", fontFamily: "inherit" }}>
            <ChevronLeft size={14}/> {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 3
            ? <button onClick={() => {
                if (step === 1 && !selectedClient) return;
                setStep(s => s + 1);
              }}
              disabled={step === 1 && !selectedClient}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", border: "none", borderRadius: 8, background: (step === 1 && !selectedClient) ? "#E5E2DC" : "var(--brand, #5B9BD5)", cursor: (step === 1 && !selectedClient) ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "inherit" }}>
              Next <ChevronRight size={14}/>
            </button>
            : <button onClick={submit} disabled={submitting}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 22px", border: "none", borderRadius: 8, background: submitting ? "#9E9B94" : "var(--brand, #5B9BD5)", cursor: submitting ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "inherit" }}>
              {submitting ? "Creating…" : "Create Job"}
            </button>
          }
        </div>
      </div>
    </div>
  );
}
