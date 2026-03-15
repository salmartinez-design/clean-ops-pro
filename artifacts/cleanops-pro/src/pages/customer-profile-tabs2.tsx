import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/auth";
import {
  Plus, Trash2, Send, Check, X, Upload, FileText, Image, Download,
  RefreshCw, Link, ExternalLink, DollarSign, CreditCard, RotateCcw,
  Clock, AlertCircle, CheckCircle, Eye, File,
} from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: { ...getAuthHeaders(), ...(opts.headers || {}) },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiFetchJSON(path: string, opts: RequestInit = {}) {
  return apiFetch(path, { ...opts, headers: { "Content-Type": "application/json", ...opts.headers } });
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtCurrency(v?: number | string | null) {
  const n = typeof v === "string" ? parseFloat(v) : (v || 0);
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const card: React.CSSProperties = {
  backgroundColor: "#FFFFFF", border: "1px solid #E5E2DC", borderRadius: "10px", padding: "20px",
};

const label: React.CSSProperties = {
  fontSize: "11px", fontWeight: 600, color: "#9E9B94", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px",
};

const statCard = (color?: string): React.CSSProperties => ({
  backgroundColor: "#FFFFFF", border: "1px solid #E5E2DC", borderRadius: "8px", padding: "16px 20px",
  borderLeft: color ? `3px solid ${color}` : undefined,
});

// ─────────────────────────────────────────────────────────────────────────────
// QUOTES TAB
// ─────────────────────────────────────────────────────────────────────────────

const QUOTE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:    { bg: "#F3F4F6", text: "#6B7280" },
  sent:     { bg: "#DBEAFE", text: "#1D4ED8" },
  viewed:   { bg: "#EDE9FE", text: "#7C3AED" },
  accepted: { bg: "#D1FAE5", text: "#065F46" },
  declined: { bg: "#FEE2E2", text: "#991B1B" },
  booked:   { bg: "#CCFBF1", text: "#0F766E" },
};

function QuoteStatusBadge({ status }: { status: string }) {
  const c = QUOTE_STATUS_COLORS[status] || { bg: "#F3F4F6", text: "#6B7280" };
  return (
    <span style={{ backgroundColor: c.bg, color: c.text, fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", letterSpacing: "0.05em" }}>
      {status.toUpperCase()}
    </span>
  );
}

export function QuotesTab({ clientId, client }: { clientId: number; client: any }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ service_type: "", frequency: "", estimated_hours: "", base_price: "", notes: "", address: client?.address || "" });

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes", clientId],
    queryFn: () => apiFetchJSON(`/api/quotes?client_id=${clientId}`),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => apiFetchJSON("/api/quotes", { method: "POST", body: JSON.stringify({ ...d, client_id: clientId }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes", clientId] }); setShowForm(false); setForm({ service_type: "", frequency: "", estimated_hours: "", base_price: "", notes: "", address: client?.address || "" }); },
  });

  const sendMut = useMutation({
    mutationFn: (id: number) => apiFetchJSON(`/api/quotes/${id}/send`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes", clientId] }),
  });

  const convertMut = useMutation({
    mutationFn: (id: number) => apiFetchJSON(`/api/quotes/${id}/convert`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes", clientId] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetchJSON(`/api/quotes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes", clientId] }),
  });

  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #E5E2DC", borderRadius: "6px", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" };
  const sel: React.CSSProperties = { ...inputStyle, backgroundColor: "#FFFFFF" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#1A1917" }}>Quotes</div>
          <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>{quotes.length} quote{quotes.length !== 1 ? "s" : ""} for this client</div>
        </div>
        <button onClick={() => setShowForm(true)} style={{ backgroundColor: "var(--brand)", color: "#FFFFFF", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
          <Plus size={14} /> New Quote
        </button>
      </div>

      {showForm && (
        <div style={{ ...card, borderLeft: "3px solid var(--brand)" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#1A1917", marginBottom: "16px" }}>New Quote</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <div style={label}>Service Type</div>
              <select style={sel} value={form.service_type} onChange={e => setForm(p => ({ ...p, service_type: e.target.value }))}>
                <option value="">Select...</option>
                <option value="standard_cleaning">Standard Cleaning</option>
                <option value="deep_cleaning">Deep Cleaning</option>
                <option value="move_in_out">Move In/Out</option>
                <option value="post_construction">Post Construction</option>
              </select>
            </div>
            <div>
              <div style={label}>Frequency</div>
              <select style={sel} value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}>
                <option value="">Select...</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="on_demand">One Time</option>
              </select>
            </div>
            <div>
              <div style={label}>Estimated Hours</div>
              <input style={inputStyle} type="number" step="0.5" placeholder="3.0" value={form.estimated_hours} onChange={e => setForm(p => ({ ...p, estimated_hours: e.target.value }))} />
            </div>
            <div>
              <div style={label}>Base Price</div>
              <input style={inputStyle} type="number" step="0.01" placeholder="150.00" value={form.base_price} onChange={e => setForm(p => ({ ...p, base_price: e.target.value }))} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={label}>Service Address</div>
              <input style={inputStyle} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={label}>Notes for Client</div>
              <textarea style={{ ...inputStyle, minHeight: "64px", resize: "vertical" }} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)} style={{ backgroundColor: "#F3F4F6", color: "#6B7280", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "13px", cursor: "pointer" }}>Cancel</button>
            <button onClick={() => createMut.mutate({ ...form, estimated_hours: parseFloat(form.estimated_hours) || null, base_price: parseFloat(form.base_price) || null })} disabled={createMut.isPending} style={{ backgroundColor: "var(--brand)", color: "#FFFFFF", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              {createMut.isPending ? "Saving..." : "Save Quote"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ ...card, textAlign: "center", color: "#9E9B94", padding: "40px" }}>Loading quotes...</div>
      ) : quotes.length === 0 && !showForm ? (
        <div style={{ ...card, textAlign: "center", padding: "40px" }}>
          <FileText size={32} style={{ color: "#C4C0BB", marginBottom: "12px" }} />
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#6B7280" }}>No quotes yet</div>
          <div style={{ fontSize: "12px", color: "#9E9B94", marginTop: "4px" }}>Create a quote to send to this client</div>
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#F7F6F3", borderBottom: "1px solid #E5E2DC" }}>
                {["Quote #", "Date", "Service", "Price", "Status", "Sent", "Actions"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", fontSize: "11px", fontWeight: 700, color: "#9E9B94", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quotes.map((q: any, i: number) => (
                <tr key={q.id} style={{ borderBottom: i < quotes.length - 1 ? "1px solid #F0EDE8" : "none" }}>
                  <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 700, color: "#1A1917" }}>#{String(q.id).padStart(4, "0")}</td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "#6B7280" }}>{fmtDate(q.created_at)}</td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "#6B7280" }}>{q.service_type?.replace(/_/g, " ") || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "#1A1917" }}>{q.base_price ? fmtCurrency(q.base_price) : "—"}</td>
                  <td style={{ padding: "12px 14px" }}><QuoteStatusBadge status={q.status} /></td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "#6B7280" }}>{q.sent_at ? fmtDate(q.sent_at) : "—"}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {q.status === "draft" && (
                        <button onClick={() => sendMut.mutate(q.id)} disabled={sendMut.isPending} style={{ backgroundColor: "#EFF6FF", color: "#1D4ED8", border: "none", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Send size={10} /> Send
                        </button>
                      )}
                      {(q.status === "accepted") && (
                        <button onClick={() => convertMut.mutate(q.id)} disabled={convertMut.isPending} style={{ backgroundColor: "#CCFBF1", color: "#0F766E", border: "none", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                          Convert to Job
                        </button>
                      )}
                      <button onClick={() => { if (confirm("Delete this quote?")) deleteMut.mutate(q.id); }} style={{ backgroundColor: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", cursor: "pointer" }}>
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS TAB
// ─────────────────────────────────────────────────────────────────────────────

const PAYMENT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  completed: { bg: "#D1FAE5", text: "#065F46" },
  pending:   { bg: "#FEF3C7", text: "#92400E" },
  failed:    { bg: "#FEE2E2", text: "#991B1B" },
  refunded:  { bg: "#F3F4F6", text: "#6B7280" },
};

export function PaymentsTab({ clientId, client }: { clientId: number; client: any }) {
  const qc = useQueryClient();
  const [showCharge, setShowCharge] = useState(false);
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeMemo, setChargeMemo] = useState("");
  const [refundId, setRefundId] = useState<number | null>(null);
  const [refundReason, setRefundReason] = useState("");

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments", clientId],
    queryFn: () => apiFetchJSON(`/api/payments?client_id=${clientId}`),
  });

  const chargeMut = useMutation({
    mutationFn: (d: any) => apiFetchJSON("/api/payments", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payments", clientId] }); setShowCharge(false); setChargeAmount(""); setChargeMemo(""); },
  });

  const refundMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => apiFetchJSON(`/api/payments/${id}/refund`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payments", clientId] }); setRefundId(null); setRefundReason(""); },
  });

  const completed = payments.filter((p: any) => p.status === "completed");
  const totalPaid = completed.reduce((s: number, p: any) => s + parseFloat(p.amount || "0"), 0);
  const lastPayment = completed[0];
  const hasCard = !!client?.default_card_last_4;

  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #E5E2DC", borderRadius: "6px", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#1A1917" }}>Payments</div>
          <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>Payment transactions for this client</div>
        </div>
        {hasCard ? (
          <button onClick={() => setShowCharge(true)} style={{ backgroundColor: "var(--brand)", color: "#FFFFFF", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <CreditCard size={14} /> Charge Card on File
          </button>
        ) : (
          <div style={{ fontSize: "12px", color: "#9E9B94", backgroundColor: "#F7F6F3", padding: "8px 12px", borderRadius: "6px", border: "1px solid #E5E2DC" }}>No card on file</div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        <div style={statCard("#16A34A")}>
          <div style={label}>Total Paid (all time)</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#1A1917" }}>{fmtCurrency(totalPaid)}</div>
        </div>
        <div style={statCard("#F59E0B")}>
          <div style={label}>Last Payment</div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#1A1917" }}>{lastPayment ? fmtDate(lastPayment.created_at) : "No payments"}</div>
          {lastPayment && <div style={{ fontSize: "12px", color: "#6B7280" }}>{fmtCurrency(lastPayment.amount)}</div>}
        </div>
        <div style={statCard()}>
          <div style={label}>Payment Method on File</div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#1A1917" }}>
            {hasCard ? `${client.default_card_brand || "Card"} ···· ${client.default_card_last_4}` : "None on file"}
          </div>
        </div>
      </div>

      {/* Charge modal */}
      {showCharge && (
        <div style={{ ...card, borderLeft: "3px solid var(--brand)" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#1A1917", marginBottom: "16px" }}>Charge Card on File — {client.default_card_brand} ···· {client.default_card_last_4}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
            <div>
              <div style={label}>Amount</div>
              <input style={inputStyle} type="number" step="0.01" placeholder="0.00" value={chargeAmount} onChange={e => setChargeAmount(e.target.value)} />
            </div>
            <div>
              <div style={label}>Memo / Reason</div>
              <input style={inputStyle} placeholder="e.g. May 14 Cleaning" value={chargeMemo} onChange={e => setChargeMemo(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "flex-end" }}>
            <button onClick={() => setShowCharge(false)} style={{ backgroundColor: "#F3F4F6", color: "#6B7280", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "13px", cursor: "pointer" }}>Cancel</button>
            <button
              onClick={() => {
                if (!chargeAmount || parseFloat(chargeAmount) <= 0) return;
                if (!confirm(`Charge ${fmtCurrency(parseFloat(chargeAmount))} to ${client.first_name}'s card on file?`)) return;
                chargeMut.mutate({ client_id: clientId, amount: parseFloat(chargeAmount), method: "card", last_4: client.default_card_last_4, card_brand: client.default_card_brand });
              }}
              disabled={chargeMut.isPending}
              style={{ backgroundColor: "#DC2626", color: "#FFFFFF", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
            >
              {chargeMut.isPending ? "Charging..." : "Charge Now"}
            </button>
          </div>
        </div>
      )}

      {/* Refund modal */}
      {refundId !== null && (
        <div style={{ ...card, borderLeft: "3px solid #DC2626" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#1A1917", marginBottom: "12px" }}>Issue Refund</div>
          <div style={label}>Refund Reason</div>
          <input style={{ ...inputStyle, marginTop: "4px" }} value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="e.g. Client dissatisfied with service" />
          <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "flex-end" }}>
            <button onClick={() => setRefundId(null)} style={{ backgroundColor: "#F3F4F6", color: "#6B7280", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "13px", cursor: "pointer" }}>Cancel</button>
            <button onClick={() => refundMut.mutate({ id: refundId!, reason: refundReason })} disabled={refundMut.isPending} style={{ backgroundColor: "#DC2626", color: "#FFFFFF", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              {refundMut.isPending ? "Processing..." : "Issue Refund"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ ...card, textAlign: "center", color: "#9E9B94", padding: "40px" }}>Loading payments...</div>
      ) : payments.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "40px" }}>
          <DollarSign size={32} style={{ color: "#C4C0BB", marginBottom: "12px" }} />
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#6B7280" }}>No payments recorded</div>
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#F7F6F3", borderBottom: "1px solid #E5E2DC" }}>
                {["Date", "Invoice #", "Amount", "Method", "Last 4", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", fontSize: "11px", fontWeight: 700, color: "#9E9B94", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any, i: number) => {
                const sc = PAYMENT_STATUS_COLORS[p.status] || PAYMENT_STATUS_COLORS.completed;
                return (
                  <tr key={p.id} style={{ borderBottom: i < payments.length - 1 ? "1px solid #F0EDE8" : "none" }}>
                    <td style={{ padding: "12px 14px", fontSize: "12px", color: "#6B7280" }}>{fmtDate(p.created_at)}</td>
                    <td style={{ padding: "12px 14px", fontSize: "12px", color: "#6B7280" }}>{p.invoice_id ? `#${p.invoice_id}` : "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 700, color: "#1A1917" }}>{fmtCurrency(p.amount)}</td>
                    <td style={{ padding: "12px 14px", fontSize: "12px", color: "#6B7280", textTransform: "capitalize" }}>{p.method || "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: "12px", color: "#6B7280" }}>{p.last_4 ? `···· ${p.last_4}` : "—"}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ backgroundColor: sc.bg, color: sc.text, fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px" }}>{p.status.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {p.status === "completed" && (
                        <button onClick={() => setRefundId(p.id)} style={{ backgroundColor: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                          <RotateCcw size={10} /> Refund
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICKBOOKS TAB
// ─────────────────────────────────────────────────────────────────────────────

export function QuickBooksTab({ clientId, client, refetch }: { clientId: number; client: any; refetch: () => void }) {
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const isConnected = !!client?.qbo_customer_id;

  const syncMut = useMutation({
    mutationFn: () => apiFetchJSON(`/api/clients/${clientId}`, { method: "PATCH", body: JSON.stringify({ qbo_customer_id: client.qbo_customer_id }) }),
    onSuccess: () => refetch(),
  });

  async function handleSync() {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 1200));
    setSyncing(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ fontSize: "15px", fontWeight: 700, color: "#1A1917" }}>QuickBooks</div>

      {isConnected ? (
        <>
          <div style={{ ...card, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <div style={{ backgroundColor: "#D1FAE5", color: "#065F46", fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "999px" }}>QBO CONNECTED</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <div style={label}>QBO Customer ID</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#1A1917", fontFamily: "monospace" }}>{client.qbo_customer_id}</div>
                </div>
                <div>
                  <div style={label}>Last Sync</div>
                  <div style={{ fontSize: "13px", color: "#6B7280" }}>Sync not configured</div>
                </div>
                <div>
                  <div style={label}>Outstanding Balance</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#1A1917" }}>—</div>
                  <div style={{ fontSize: "11px", color: "#9E9B94" }}>Live pull not configured</div>
                </div>
                <div>
                  <div style={label}>Overdue Balance</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#DC2626" }}>—</div>
                  <div style={{ fontSize: "11px", color: "#9E9B94" }}>Live pull not configured</div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button onClick={handleSync} disabled={syncing} style={{ backgroundColor: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", borderRadius: "6px", padding: "8px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                <RefreshCw size={12} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} /> {syncing ? "Syncing..." : "Sync Now"}
              </button>
              <button style={{ backgroundColor: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA", borderRadius: "6px", padding: "8px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                Disconnect
              </button>
            </div>
          </div>

          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5E2DC", fontSize: "13px", fontWeight: 700, color: "#1A1917" }}>QBO Invoice History</div>
            <div style={{ padding: "32px", textAlign: "center", color: "#9E9B94" }}>
              <ExternalLink size={24} style={{ marginBottom: "8px", opacity: 0.4 }} />
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#6B7280" }}>Live QBO invoice pull not configured</div>
              <div style={{ fontSize: "12px", color: "#9E9B94", marginTop: "4px" }}>Connect QuickBooks OAuth to enable invoice sync</div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ ...card, textAlign: "center", padding: "48px 32px" }}>
          <div style={{ width: "48px", height: "48px", backgroundColor: "#F3F4F6", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Link size={24} style={{ color: "#9E9B94" }} />
          </div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#1A1917", marginBottom: "8px" }}>Not Connected to QuickBooks</div>
          <div style={{ fontSize: "13px", color: "#6B7280", marginBottom: "24px", maxWidth: "360px", margin: "0 auto 24px" }}>
            This client is not linked to a QuickBooks customer record. Link them to sync invoices and balances.
          </div>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button style={{ backgroundColor: "var(--brand)", color: "#FFFFFF", border: "none", borderRadius: "6px", padding: "10px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              Link to QBO Customer
            </button>
            <button style={{ backgroundColor: "#F7F6F3", color: "#1A1917", border: "1px solid #E5E2DC", borderRadius: "6px", padding: "10px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              Create in QBO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTACHMENTS TAB
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  home_photo: "Home Photo",
  document:   "Document",
  inspection: "Inspection",
  agreement:  "Agreement",
  other:      "Other",
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  home_photo: { bg: "#DBEAFE", text: "#1D4ED8" },
  document:   { bg: "#FEF3C7", text: "#92400E" },
  inspection: { bg: "#EDE9FE", text: "#7C3AED" },
  agreement:  { bg: "#D1FAE5", text: "#065F46" },
  other:      { bg: "#F3F4F6", text: "#6B7280" },
};

export function AttachmentsTab({ clientId }: { clientId: number }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [pendingFile, setPendingFile] = useState<{ file: File; name: string; category: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["attachments", clientId],
    queryFn: () => apiFetchJSON(`/api/attachments?client_id=${clientId}`),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetchJSON(`/api/attachments/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attachments", clientId] }),
  });

  function handleFileSelect(file: File) {
    setPendingFile({ file, name: file.name.replace(/\.[^.]+$/, ""), category: "other" });
  }

  async function handleUpload() {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", pendingFile.file);
      fd.append("client_id", String(clientId));
      fd.append("name", pendingFile.name);
      fd.append("category", pendingFile.category);
      await fetch(`${API}/api/attachments`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: fd,
      });
      qc.invalidateQueries({ queryKey: ["attachments", clientId] });
      setPendingFile(null);
    } catch (e) {
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  const filtered = categoryFilter === "all" ? attachments : attachments.filter((a: any) => a.category === categoryFilter);
  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #E5E2DC", borderRadius: "6px", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" };
  const sel: React.CSSProperties = { ...inputStyle, backgroundColor: "#FFFFFF" };

  function isImage(ft?: string) {
    return ft && ["image/jpeg","image/png","image/webp","image/gif"].includes(ft);
  }

  const categories = ["all","home_photo","document","inspection","agreement","other"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#1A1917" }}>Attachments</div>
          <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>{attachments.length} file{attachments.length !== 1 ? "s" : ""} on file</div>
        </div>
        <button onClick={() => fileRef.current?.click()} style={{ backgroundColor: "var(--brand)", color: "#FFFFFF", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
          <Upload size={14} /> Upload File
        </button>
      </div>

      <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
        onClick={() => fileRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? "var(--brand)" : "#E5E2DC"}`, borderRadius: "10px", padding: "32px", textAlign: "center", backgroundColor: dragging ? "#EFF6FF" : "#F7F6F3", cursor: "pointer", transition: "all 0.15s" }}
      >
        <Upload size={24} style={{ color: dragging ? "var(--brand)" : "#C4C0BB", marginBottom: "8px" }} />
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#6B7280" }}>Drag and drop or click to upload</div>
        <div style={{ fontSize: "11px", color: "#9E9B94", marginTop: "4px" }}>PDF, JPG, PNG, DOCX — max 10MB</div>
      </div>

      {/* Pending file confirmation */}
      {pendingFile && (
        <div style={{ ...card, borderLeft: "3px solid var(--brand)" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#1A1917", marginBottom: "12px" }}>Configure Upload — {pendingFile.file.name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
            <div>
              <div style={label}>Display Name</div>
              <input style={inputStyle} value={pendingFile.name} onChange={e => setPendingFile(p => p ? { ...p, name: e.target.value } : null)} />
            </div>
            <div>
              <div style={label}>Category</div>
              <select style={sel} value={pendingFile.category} onChange={e => setPendingFile(p => p ? { ...p, category: e.target.value } : null)}>
                {["home_photo","document","inspection","agreement","other"].map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "flex-end" }}>
            <button onClick={() => setPendingFile(null)} style={{ backgroundColor: "#F3F4F6", color: "#6B7280", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "13px", cursor: "pointer" }}>Cancel</button>
            <button onClick={handleUpload} disabled={uploading} style={{ backgroundColor: "var(--brand)", color: "#FFFFFF", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {categories.map(c => (
          <button key={c} onClick={() => setCategoryFilter(c)} style={{ backgroundColor: categoryFilter === c ? "var(--brand)" : "#F7F6F3", color: categoryFilter === c ? "#FFFFFF" : "#6B7280", border: "1px solid #E5E2DC", borderRadius: "6px", padding: "5px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
            {c === "all" ? "All" : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", color: "#9E9B94", padding: "40px" }}>Loading files...</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "40px" }}>
          <File size={32} style={{ color: "#C4C0BB", marginBottom: "12px" }} />
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#6B7280" }}>No files {categoryFilter !== "all" ? `in ${CATEGORY_LABELS[categoryFilter]}` : ""}</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {filtered.map((a: any) => {
            const cc = CATEGORY_COLORS[a.category] || CATEGORY_COLORS.other;
            const img = isImage(a.file_type);
            return (
              <div key={a.id} style={{ ...card, display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ height: "80px", backgroundColor: "#F7F6F3", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {img && a.file_url && !a.file_url.startsWith("data:") ? (
                    <img src={`${API}${a.file_url}`} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <FileText size={32} style={{ color: "#C4C0BB" }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#1A1917", marginBottom: "4px", wordBreak: "break-word" }}>{a.name}</div>
                  <span style={{ backgroundColor: cc.bg, color: cc.text, fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px" }}>{CATEGORY_LABELS[a.category] || a.category}</span>
                </div>
                <div style={{ fontSize: "11px", color: "#9E9B94" }}>{fmtDate(a.created_at)}</div>
                <div style={{ display: "flex", gap: "6px" }}>
                  {a.file_url && !a.file_url.startsWith("data:") && (
                    <a href={`${API}${a.file_url}`} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: "#EFF6FF", color: "#1D4ED8", border: "none", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Download size={10} /> Download
                    </a>
                  )}
                  <button onClick={() => { if (confirm("Delete this file?")) deleteMut.mutate(a.id); }} style={{ backgroundColor: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", cursor: "pointer" }}>
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
