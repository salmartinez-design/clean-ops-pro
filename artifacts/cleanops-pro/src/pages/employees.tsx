import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useListUsers } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { Plus, Search, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ROLE_STYLES: Record<string, { bg: string; text: string }> = {
  owner:       { bg: '#EEEDFE', text: '#3C3489' },
  admin:       { bg: '#E6F1FB', text: '#0C447C' },
  office:      { bg: '#FFF3E0', text: '#B45309' },
  technician:  { bg: '#EAF3DE', text: '#27500A' },
  super_admin: { bg: '#FAEEDA', text: '#633806' },
};

function ProductivityRing({ pct }: { pct: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ position: 'relative', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="48" height="48" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx="24" cy="24" r={r} fill="none" stroke="#252525" strokeWidth="3" />
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--tenant-color)" strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', fontWeight: 400, color: 'var(--tenant-color)', position: 'relative', zIndex: 1 }}>{pct}%</span>
    </div>
  );
}

export default function EmployeesPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useListUsers({}, { request: { headers: getAuthHeaders() } });

  const employees = (data?.data || []).filter(u =>
    !search || `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '42px', color: '#E8E0D0', margin: 0, lineHeight: 1.1 }}>Employees</h1>
            <p style={{ fontFamily: "'DM Mono', monospace", fontWeight: 300, fontSize: '13px', color: '#888780', marginTop: '6px' }}>Manage staff, roles, and performance.</p>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', backgroundColor: 'var(--tenant-color)', color: '#0D0D0D', borderRadius: '6px', fontSize: '13px', fontFamily: "'DM Mono', monospace", fontWeight: 400, border: 'none', cursor: 'pointer' }}>
            <Plus size={15} strokeWidth={2} /> Add Employee
          </button>
        </div>

        {/* Table */}
        <div style={{ backgroundColor: '#161616', border: '1px solid #252525', borderRadius: '8px', overflow: 'hidden' }}>
          {/* Search bar */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #252525', backgroundColor: '#1A1A1A', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', maxWidth: '320px', flex: 1 }}>
              <Search size={14} strokeWidth={1.5} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888780' }} />
              <input
                placeholder="Search team..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '34px', paddingRight: '12px', height: '36px', backgroundColor: '#0D0D0D', border: '1px solid #252525', borderRadius: '6px', color: '#E8E0D0', fontSize: '12px', fontFamily: "'DM Mono', monospace", outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#0D0D0D', borderBottom: '1px solid #252525' }}>
                  {['Employee', 'Role', 'Pay Structure', 'Productivity', 'Score', ''].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: h === 'Productivity' || h === 'Score' ? 'center' : 'left', fontSize: '11px', fontFamily: "'DM Mono', monospace", fontWeight: 400, color: '#555550', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#888780', fontSize: '13px', fontFamily: "'DM Mono', monospace" }}>Loading employees...</td></tr>
                ) : employees.map(user => {
                  const roleStyle = ROLE_STYLES[user.role] || ROLE_STYLES.technician;
                  const productivity = user.productivity_pct || 85;
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid #252525' }} className="hover:bg-[#1A1A1A] transition-colors">
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(var(--tenant-color-rgb), 0.20)', color: 'var(--tenant-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontFamily: "'DM Mono', monospace", fontWeight: 400, flexShrink: 0, border: '1px solid rgba(var(--tenant-color-rgb), 0.2)' }}>
                            {user.first_name[0]}{user.last_name[0]}
                          </div>
                          <div>
                            <p style={{ fontSize: '14px', fontFamily: "'DM Mono', monospace", fontWeight: 400, color: '#E8E0D0', margin: 0 }}>{user.first_name} {user.last_name}</p>
                            <p style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: '#888780', margin: 0 }}>{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ backgroundColor: roleStyle.bg, color: roleStyle.text, padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontFamily: "'DM Mono', monospace", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <p style={{ fontSize: '13px', fontFamily: "'DM Mono', monospace", fontWeight: 400, color: '#E8E0D0', margin: 0 }}>${user.pay_rate}/hr</p>
                        <p style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: '#888780', margin: 0, textTransform: 'capitalize' }}>{user.pay_type?.replace('_', ' ')}</p>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <ProductivityRing pct={productivity} />
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <span style={{ backgroundColor: '#EAF3DE', color: '#27500A', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontFamily: "'DM Mono', monospace", fontWeight: 400 }}>
                          ★ 3.9
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', padding: '4px' }} className="hover:text-[#E8E0D0] transition-colors">
                          <MoreHorizontal size={16} strokeWidth={1.5} />
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
