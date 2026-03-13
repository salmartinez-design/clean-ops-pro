import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useListInvoices, ListInvoicesStatus } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { Plus, Search, Send, Download } from "lucide-react";
import { Input } from "@/components/ui/input";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  paid:     { bg: '#EAF3DE', text: '#27500A', label: 'PAID' },
  overdue:  { bg: '#FAEEDA', text: '#633806', label: 'OVERDUE' },
  draft:    { bg: '#F1EFE8', text: '#444441', label: 'DRAFT' },
  sent:     { bg: '#E6F1FB', text: '#0C447C', label: 'SENT' },
};

type TabId = ListInvoicesStatus | 'all';

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [search, setSearch] = useState('');
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

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '42px', color: '#E8E0D0', margin: 0, lineHeight: 1.1 }}>Invoices</h1>
            <p style={{ fontFamily: "'DM Mono', monospace", fontWeight: 300, fontSize: '13px', color: '#888780', marginTop: '6px' }}>Manage billing, capture payments, and track revenue.</p>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', backgroundColor: 'var(--tenant-color)', color: '#0D0D0D', borderRadius: '6px', fontSize: '13px', fontFamily: "'DM Mono', monospace", fontWeight: 400, border: 'none', cursor: 'pointer' }}>
            <Plus size={15} strokeWidth={2} /> Create Invoice
          </button>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <StatCard label="Total Outstanding" value={`$${(data?.stats?.total_outstanding || 0).toLocaleString()}`} />
          <StatCard label="Total Overdue" value={`$${(data?.stats?.total_overdue || 0).toLocaleString()}`} danger />
          <StatCard label="Paid (Last 30D)" value={`$${(data?.stats?.total_paid || 0).toLocaleString()}`} positive />
          <StatCard label="Total Revenue (YTD)" value={`$${(data?.stats?.total_revenue || 0).toLocaleString()}`} accent />
        </div>

        {/* Table */}
        <div style={{ backgroundColor: '#161616', border: '1px solid #252525', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #252525', backgroundColor: '#1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '5px 14px', fontSize: '12px', fontFamily: "'DM Mono', monospace", fontWeight: 300, borderRadius: '4px', cursor: 'pointer', border: activeTab === tab.id ? 'none' : '1px solid #252525', backgroundColor: activeTab === tab.id ? 'var(--tenant-color)' : 'transparent', color: activeTab === tab.id ? '#0D0D0D' : '#888780', transition: 'all 0.15s' }}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={14} strokeWidth={1.5} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888780' }} />
              <input
                placeholder="Search invoice or client..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '34px', paddingRight: '12px', height: '36px', backgroundColor: '#0D0D0D', border: '1px solid #252525', borderRadius: '6px', color: '#E8E0D0', fontSize: '12px', fontFamily: "'DM Mono', monospace", width: '220px', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#0D0D0D', borderBottom: '1px solid #252525' }}>
                  {['Invoice #', 'Client', 'Amount', 'Date', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: h === '' ? 'right' : 'left', fontSize: '11px', fontFamily: "'DM Mono', monospace", fontWeight: 400, color: '#555550', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#888780', fontSize: '13px', fontFamily: "'DM Mono', monospace" }}>Loading invoices...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#888780', fontSize: '13px', fontFamily: "'DM Mono', monospace" }}>No invoices found.</td></tr>
                ) : invoices.map(inv => {
                  const s = STATUS_STYLES[inv.status] || STATUS_STYLES.draft;
                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #252525' }} className="hover:bg-[#1A1A1A] transition-colors">
                      <td style={{ padding: '14px 20px', fontSize: '13px', fontFamily: "'DM Mono', monospace", fontWeight: 400, color: '#E8E0D0' }}>INV-{inv.id.toString().padStart(4, '0')}</td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', fontFamily: "'DM Mono', monospace", fontWeight: 400, color: '#E8E0D0' }}>{inv.client_name}</td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#E8E0D0' }}>${inv.total.toFixed(2)}</td>
                      <td style={{ padding: '14px 20px', fontSize: '12px', fontFamily: "'DM Mono', monospace", color: '#888780' }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ backgroundColor: s.bg, color: s.text, padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontFamily: "'DM Mono', monospace", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {inv.status === 'draft' && (
                          <button style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', border: '1px solid #252525', borderRadius: '5px', backgroundColor: 'transparent', color: '#888780', fontSize: '12px', fontFamily: "'DM Mono', monospace", cursor: 'pointer' }}>
                            <Send size={12} strokeWidth={1.5} /> Send
                          </button>
                        )}
                        <button style={{ padding: '5px', border: 'none', backgroundColor: 'transparent', color: '#888780', cursor: 'pointer', borderRadius: '4px' }} className="hover:text-[#E8E0D0] transition-colors">
                          <Download size={15} strokeWidth={1.5} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, danger, positive, accent }: { label: string; value: string; danger?: boolean; positive?: boolean; accent?: boolean }) {
  const valueColor = danger ? '#FCEBEB' : positive ? '#EAF3DE' : '#E8E0D0';
  return (
    <div style={{
      backgroundColor: '#1A1A1A',
      borderRadius: '8px',
      padding: '16px 20px',
      border: accent ? '1px solid var(--tenant-color)' : 'none',
    }}>
      <p style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", fontWeight: 400, color: accent ? 'var(--tenant-color)' : '#888780', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px 0' }}>{label}</p>
      <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: '24px', color: valueColor, margin: 0 }}>{value}</p>
    </div>
  );
}
