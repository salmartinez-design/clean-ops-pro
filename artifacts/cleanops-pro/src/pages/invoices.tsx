import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useListInvoices, ListInvoicesStatus } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/auth";
import { Plus, Search, Send, Download, Layers, X, Check, CheckSquare, Square, AlertCircle } from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: { ...getAuthHeaders(), "Content-Type": "application/json", ...opts.headers },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  paid:    { background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' },
  overdue: { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' },
  draft:   { background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' },
  sent:    { background: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE' },
};

type TabId = ListInvoicesStatus | 'all';

function BatchInvoiceModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [autoSend, setAutoSend] = useState(false);
  const [autoCharge, setAutoCharge] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; errors: number } | null>(null);
  const [summary, setSummary] = useState<{ created: number; sent: number; charged: number; errors: number } | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const { data: uninvoicedJobs = [], isLoading } = useQuery({
    queryKey: ["uninvoiced-jobs-today"],
    queryFn: () => apiFetch(`/api/jobs?status=complete&date=${today}&uninvoiced=true`),
  });

  const jobs: any[] = Array.isArray(uninvoicedJobs) ? uninvoicedJobs : (uninvoicedJobs?.data || []);
  const allSelected = jobs.length > 0 && selected.size === jobs.length;

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(jobs.map((j: any) => j.id)));
  }

  function toggle(id: number) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function handleCreate() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setProgress({ done: 0, total: ids.length, errors: 0 });
    let created = 0; let sent = 0; let charged = 0; let errors = 0;
    for (const jobId of ids) {
      try {
        await apiFetch("/api/invoices", { method: "POST", body: JSON.stringify({ job_id: jobId, auto_send: autoSend, auto_charge: autoCharge }) });
        created++;
        if (autoSend) sent++;
        if (autoCharge) charged++;
      } catch { errors++; }
      setProgress({ done: created + errors, total: ids.length, errors });
    }
    setSummary({ created, sent, charged, errors });
    qc.invalidateQueries({ queryKey: ["invoices"] });
  }

  const inputStyle: React.CSSProperties = { padding: "8px 12px", border: "1px solid #E5E2DC", borderRadius: "6px", fontSize: "13px", fontFamily: "inherit" };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", padding: "32px", maxWidth: "760px", width: "100%", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#1A1917" }}>Batch Invoice — Today</h2>
            <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px" }}>Create invoices for today's completed jobs</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9E9B94" }}><X size={20} /></button>
        </div>

        {summary ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ width: "56px", height: "56px", backgroundColor: "#D1FAE5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Check size={28} style={{ color: "#16A34A" }} />
              </div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#1A1917", marginBottom: "8px" }}>Batch complete</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
              {[
                { label: "Invoices Created", value: summary.created, color: "#1A1917" },
                { label: "Auto-sent", value: summary.sent, color: "#1D4ED8" },
                { label: "Auto-charged", value: summary.charged, color: "#16A34A" },
                { label: "Errors", value: summary.errors, color: summary.errors > 0 ? "#DC2626" : "#9E9B94" },
              ].map(s => (
                <div key={s.label} style={{ backgroundColor: "#F7F6F3", borderRadius: "8px", padding: "16px", textAlign: "center" }}>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#9E9B94", textTransform: "uppercase", marginTop: "4px" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { onDone(); onClose(); }} style={{ backgroundColor: "var(--brand)", color: "#FFFFFF", border: "none", borderRadius: "8px", padding: "12px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>Done</button>
          </div>
        ) : progress ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#1A1917" }}>Creating invoices... {progress.done}/{progress.total}</div>
            <div style={{ width: "100%", height: "8px", backgroundColor: "#F0EDE8", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{ height: "100%", backgroundColor: "var(--brand)", borderRadius: "99px", width: `${(progress.done / progress.total) * 100}%`, transition: "width 0.3s" }} />
            </div>
            {progress.errors > 0 && <div style={{ fontSize: "12px", color: "#DC2626" }}>{progress.errors} error(s) so far</div>}
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {isLoading ? (
                <div style={{ textAlign: "center", color: "#9E9B94", padding: "40px" }}>Loading today's completed jobs...</div>
              ) : jobs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <AlertCircle size={32} style={{ color: "#C4C0BB", marginBottom: "12px" }} />
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#6B7280" }}>No uninvoiced completed jobs today</div>
                  <div style={{ fontSize: "12px", color: "#9E9B94", marginTop: "4px" }}>All of today's completed jobs already have invoices.</div>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#F7F6F3", borderBottom: "1px solid #E5E2DC" }}>
                      <th style={{ padding: "10px 14px", width: "40px" }}>
                        <button onClick={toggleAll} style={{ background: "none", border: "none", cursor: "pointer", color: allSelected ? "var(--brand)" : "#C4C0BB" }}>
                          {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </th>
                      {["Client", "Service", "Amount"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", fontSize: "11px", fontWeight: 700, color: "#9E9B94", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((j: any, i: number) => (
                      <tr key={j.id} style={{ borderBottom: i < jobs.length - 1 ? "1px solid #F0EDE8" : "none", backgroundColor: selected.has(j.id) ? "#F0F7FF" : "transparent" }}>
                        <td style={{ padding: "10px 14px" }}>
                          <button onClick={() => toggle(j.id)} style={{ background: "none", border: "none", cursor: "pointer", color: selected.has(j.id) ? "var(--brand)" : "#C4C0BB" }}>
                            {selected.has(j.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: "13px", fontWeight: 600, color: "#1A1917" }}>{j.client_name || `Client #${j.client_id}`}</td>
                        <td style={{ padding: "10px 14px", fontSize: "12px", color: "#6B7280", textTransform: "capitalize" }}>{(j.service_type || "").replace(/_/g, " ")}</td>
                        <td style={{ padding: "10px 14px", fontSize: "14px", fontWeight: 700, color: "#1A1917" }}>${parseFloat(j.base_fee || "0").toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ borderTop: "1px solid #E5E2DC", paddingTop: "16px", marginTop: "16px" }}>
              <div style={{ display: "flex", gap: "20px", marginBottom: "16px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#1A1917" }}>
                  <input type="checkbox" checked={autoSend} onChange={e => setAutoSend(e.target.checked)} style={{ width: "16px", height: "16px" }} />
                  Auto-send invoice to client
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#1A1917" }}>
                  <input type="checkbox" checked={autoCharge} onChange={e => setAutoCharge(e.target.checked)} style={{ width: "16px", height: "16px" }} />
                  Auto-charge card on file
                </label>
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button onClick={onClose} style={{ backgroundColor: "#F3F4F6", color: "#6B7280", border: "none", borderRadius: "6px", padding: "10px 18px", fontSize: "13px", cursor: "pointer" }}>Cancel</button>
                <button onClick={handleCreate} disabled={selected.size === 0} style={{ backgroundColor: selected.size === 0 ? "#C4C0BB" : "var(--brand)", color: "#FFFFFF", border: "none", borderRadius: "8px", padding: "10px 18px", fontSize: "13px", fontWeight: 700, cursor: selected.size === 0 ? "default" : "pointer" }}>
                  Create {selected.size > 0 ? `${selected.size} ` : ""}Invoice{selected.size !== 1 ? "s" : ""}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [search, setSearch] = useState('');
  const [showBatch, setShowBatch] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useListInvoices(
    activeTab !== 'all' ? { status: activeTab } : {},
    { request: { headers: getAuthHeaders() } }
  );

  const tabs: { id: TabId; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Drafts' },
    { id: 'sent', label: 'Sent' },
    { id: 'paid', label: 'Paid' },
    { id: 'overdue', label: 'Overdue' },
  ];

  const invoices = (data?.data || []).filter(i =>
    !search || i.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  const TH: React.CSSProperties = {
    padding: '12px 20px', textAlign: 'left',
    fontSize: '11px', fontWeight: 500, color: '#9E9B94',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    borderBottom: '1px solid #EEECE7',
  };

  const CARD: React.CSSProperties = {
    backgroundColor: '#FFFFFF', border: '1px solid #E5E2DC',
    borderRadius: '10px', padding: '20px',
  };

  return (
    <>
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'Total Outstanding', value: `$${(data?.stats?.total_outstanding || 0).toLocaleString()}` },
            { label: 'Total Overdue',     value: `$${(data?.stats?.total_overdue || 0).toLocaleString()}`,     color: '#DC2626' },
            { label: 'Paid (Last 30D)',   value: `$${(data?.stats?.total_paid || 0).toLocaleString()}`,        color: '#16A34A' },
            { label: 'Total Revenue (YTD)', value: `$${(data?.stats?.total_revenue || 0).toLocaleString()}`,  accent: true },
          ].map(c => (
            <div key={c.label} style={{ ...CARD, border: c.accent ? '1px solid rgba(var(--brand-rgb), 0.5)' : '1px solid #E5E2DC', transition: 'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = c.accent ? 'var(--brand)' : 'rgba(var(--brand-rgb), 0.4)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = c.accent ? 'rgba(var(--brand-rgb), 0.5)' : '#E5E2DC')}
            >
              <p style={{ fontSize: '11px', fontWeight: 500, color: c.accent ? 'var(--brand)' : '#9E9B94', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px 0' }}>{c.label}</p>
              <p style={{ fontSize: '22px', fontWeight: 700, color: c.color || (c.accent ? 'var(--brand)' : '#1A1917'), margin: 0 }}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DC', borderRadius: '10px', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #EEECE7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F7F6F3', border: '1px solid #E5E2DC', borderRadius: '8px', padding: '4px' }}>
              {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '5px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: isActive ? 600 : 400, border: 'none', backgroundColor: isActive ? 'var(--brand)' : 'transparent', color: isActive ? '#FFFFFF' : '#6B7280', transition: 'all 0.15s' }}>
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} strokeWidth={1.5} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9E9B94', pointerEvents: 'none' }} />
                <input placeholder="Search invoice or client..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: '36px', paddingRight: '12px', height: '36px', width: '220px', backgroundColor: '#F7F6F3', border: '1px solid #E5E2DC', borderRadius: '8px', color: '#1A1917', fontSize: '13px', outline: 'none' }} />
              </div>
              <button onClick={() => setShowBatch(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', backgroundColor: '#F7F6F3', color: '#1A1917', border: '1px solid #E5E2DC', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                <Layers size={14} strokeWidth={2} /> Batch Invoice
              </button>
              <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', backgroundColor: 'var(--brand)', color: '#FFFFFF', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                <Plus size={14} strokeWidth={2} /> Create
              </button>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Invoice #', 'Client', 'Amount', 'Date', 'Status', ''].map(h => (
                  <th key={h} style={{ ...TH, textAlign: h === '' ? 'right' as const : 'left' as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>Loading invoices...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>No invoices found.</td></tr>
              ) : invoices.map(inv => {
                const s = STATUS_STYLES[inv.status] || STATUS_STYLES.draft;
                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #F0EEE9', cursor: 'default' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F7F6F3')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 500, color: '#1A1917' }}>INV-{inv.id.toString().padStart(4, '0')}</td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 600, color: '#1A1917' }}>{inv.client_name}</td>
                    <td style={{ padding: '14px 20px', fontSize: '22px', fontWeight: 700, color: '#1A1917' }}>${inv.total.toFixed(2)}</td>
                    <td style={{ padding: '14px 20px', fontSize: '12px', color: '#6B7280' }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ ...s, display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {inv.status === 'draft' && (
                          <button style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', border: '1px solid #E5E2DC', borderRadius: '6px', backgroundColor: 'transparent', color: '#6B7280', fontSize: '12px', cursor: 'pointer' }}>
                            <Send size={12} strokeWidth={1.5} /> Send
                          </button>
                        )}
                        <button style={{ padding: '5px', border: 'none', backgroundColor: 'transparent', color: '#9E9B94', cursor: 'pointer', borderRadius: '4px' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand)')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#9E9B94')}
                        >
                          <Download size={15} strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
    {showBatch && <BatchInvoiceModal onClose={() => setShowBatch(false)} onDone={() => {}} />}
    </>
  );
}
