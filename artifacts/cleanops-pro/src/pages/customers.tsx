import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useListClients } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { Plus, Search, Phone, Mail, MapPin } from "lucide-react";

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const { data, isLoading } = useListClients({}, { request: { headers: getAuthHeaders() } });

  const clients = (data?.data || []).filter(c =>
    !search || `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: number) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '42px', color: '#E8E0D0', margin: 0, lineHeight: 1.1 }}>Customers</h1>
            <p style={{ fontFamily: "'DM Mono', monospace", fontWeight: 300, fontSize: '13px', color: '#888780', marginTop: '6px' }}>Manage clients and loyalty points.</p>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', backgroundColor: 'var(--tenant-color)', color: '#0D0D0D', borderRadius: '6px', fontSize: '13px', fontFamily: "'DM Mono', monospace", fontWeight: 400, border: 'none', cursor: 'pointer' }}>
            <Plus size={15} strokeWidth={2} /> Add Client
          </button>
        </div>

        {/* Table */}
        <div style={{ backgroundColor: '#161616', border: '1px solid #252525', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #252525', backgroundColor: '#1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative', maxWidth: '360px', flex: 1 }}>
              <Search size={14} strokeWidth={1.5} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888780' }} />
              <input
                placeholder="Search clients by name or address..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '34px', paddingRight: '12px', height: '36px', backgroundColor: '#0D0D0D', border: '1px solid #252525', borderRadius: '6px', color: '#E8E0D0', fontSize: '12px', fontFamily: "'DM Mono', monospace", outline: 'none' }}
              />
            </div>
            {selected.length > 0 && (
              <span style={{ fontSize: '12px', fontFamily: "'DM Mono', monospace", color: 'var(--tenant-color)' }}>{selected.length} selected</span>
            )}
            <button style={{ padding: '6px 14px', border: '1px solid #252525', borderRadius: '6px', backgroundColor: 'transparent', color: '#888780', fontSize: '12px', fontFamily: "'DM Mono', monospace", cursor: 'pointer' }}>
              Batch Actions
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#0D0D0D', borderBottom: '1px solid #252525' }}>
                  <th style={{ width: '44px', padding: '12px 16px' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1px solid #252525', backgroundColor: 'transparent' }} />
                  </th>
                  {['Client Info', 'Contact', 'Address', 'Loyalty', 'Status'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Loyalty' ? 'center' : 'left', fontSize: '11px', fontFamily: "'DM Mono', monospace", fontWeight: 400, color: '#555550', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#888780', fontSize: '13px', fontFamily: "'DM Mono', monospace" }}>Loading clients...</td></tr>
                ) : clients.map(client => {
                  const isSelected = selected.includes(client.id);
                  const rewardReady = client.loyalty_points > 100;
                  return (
                    <tr key={client.id} style={{ borderBottom: '1px solid #252525', backgroundColor: isSelected ? 'rgba(var(--tenant-color-rgb), 0.06)' : 'transparent' }} className="hover:bg-[#1A1A1A] transition-colors">
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => toggleSelect(client.id)}
                          style={{ width: '16px', height: '16px', borderRadius: '50%', border: `1px solid ${isSelected ? 'var(--tenant-color)' : '#252525'}`, backgroundColor: isSelected ? 'var(--tenant-color)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0D0D0D' }} />}
                        </button>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <p style={{ fontSize: '14px', fontFamily: "'DM Mono', monospace", fontWeight: 400, color: '#E8E0D0', margin: 0 }}>{client.first_name} {client.last_name}</p>
                        <p style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: '#888780', margin: 0 }}>CL-{client.id.toString().padStart(4, '0')}</p>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {client.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: "'DM Mono', monospace", color: '#888780' }}><Phone size={11} strokeWidth={1.5} />{client.phone}</div>}
                          {client.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: "'DM Mono', monospace", color: '#888780' }}><Mail size={11} strokeWidth={1.5} />{client.email}</div>}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', maxWidth: '180px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: '#888780', fontSize: '12px', fontFamily: "'DM Mono', monospace" }}>
                          <MapPin size={12} strokeWidth={1.5} style={{ marginTop: '2px', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.address || 'No address'}, {client.city}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <div style={{ backgroundColor: 'rgba(var(--tenant-color-rgb), 0.15)', borderRadius: '20px', padding: '4px 14px' }}>
                            <span style={{ fontSize: '18px', fontFamily: "'DM Mono', monospace", fontWeight: 400, color: 'var(--tenant-color)' }}>{client.loyalty_points}</span>
                            <span style={{ fontSize: '10px', fontFamily: "'DM Mono', monospace", color: 'var(--tenant-color)', marginLeft: '4px' }}>PTS</span>
                          </div>
                          {rewardReady && (
                            <span style={{ fontSize: '9px', fontFamily: "'DM Mono', monospace", color: 'var(--tenant-color)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reward Ready</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ backgroundColor: '#EAF3DE', color: '#27500A', padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active</span>
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
