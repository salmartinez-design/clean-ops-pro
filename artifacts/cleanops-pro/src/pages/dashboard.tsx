import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetDashboardMetrics } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, CheckCircle2, Users, AlertTriangle } from "lucide-react";

const mockChartData = [
  { name: 'Mon', revenue: 3200 },
  { name: 'Tue', revenue: 2800 },
  { name: 'Wed', revenue: 4800 },
  { name: 'Thu', revenue: 4100 },
  { name: 'Fri', revenue: 5600 },
  { name: 'Sat', revenue: 2100 },
  { name: 'Sun', revenue: 1400 },
];

export default function Dashboard() {
  const { data, isLoading } = useGetDashboardMetrics(
    { period: "week" },
    { request: { headers: getAuthHeaders() } }
  );

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Page Title */}
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '42px', color: '#E8E0D0', margin: 0, lineHeight: 1.1 }}>Dashboard</h1>
          <p style={{ fontFamily: "'DM Mono', monospace", fontWeight: 300, fontSize: '13px', color: '#888780', marginTop: '6px' }}>Overview of operations for the current week.</p>
        </div>

        {/* Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <MetricCard
            label="Total Revenue"
            value={`$${(data?.total_revenue || 0).toLocaleString()}`}
            sub="+12% from last week"
            subPositive
            icon={<DollarSign size={16} strokeWidth={1.5} />}
          />
          <MetricCard
            label="Jobs Completed"
            value={data?.jobs_completed || 0}
            sub={`${data?.jobs_in_progress || 0} in progress`}
            icon={<CheckCircle2 size={16} strokeWidth={1.5} />}
          />
          <MetricCard
            label="Active Employees"
            value={data?.active_employees || 0}
            sub={`Avg score: ${(data?.avg_job_score || 0).toFixed(1)}/4.0`}
            subPositive
            icon={<Users size={16} strokeWidth={1.5} />}
          />
          <MetricCard
            label="Flagged Clock-Ins"
            value={data?.flagged_clock_ins || 0}
            sub="Requires review"
            subNegative={!!data?.flagged_clock_ins}
            icon={<AlertTriangle size={16} strokeWidth={1.5} />}
          />
        </div>

        {/* Chart + Top Employees */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          {/* Revenue Chart */}
          <div style={{ backgroundColor: '#1A1A1A', borderRadius: '8px', padding: '24px' }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '18px', color: '#E8E0D0', margin: '0 0 4px 0' }}>Revenue Trend</h3>
            <p style={{ fontFamily: "'DM Mono', monospace", fontWeight: 300, fontSize: '11px', color: '#888780', margin: '0 0 20px 0' }}>7 day rolling volume</p>
            <div style={{ height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--tenant-color)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="var(--tenant-color)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252525" vertical={false} />
                  <XAxis dataKey="name" stroke="#555550" fontSize={11} tickLine={false} axisLine={false} fontFamily="'DM Mono', monospace" />
                  <YAxis stroke="#555550" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} fontFamily="'DM Mono', monospace" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161616', border: '1px solid #252525', borderRadius: '6px', fontFamily: "'DM Mono', monospace", fontSize: '12px' }}
                    itemStyle={{ color: '#E8E0D0' }}
                    labelStyle={{ color: '#888780' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="var(--tenant-color)" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Employees */}
          <div style={{ backgroundColor: '#161616', border: '1px solid #252525', borderRadius: '8px', padding: '24px' }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '18px', color: '#E8E0D0', margin: '0 0 20px 0' }}>Top Employees</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data?.top_employees?.length ? data.top_employees.slice(0, 5).map((emp, i) => (
                <div key={emp.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#0D0D0D', borderRadius: '6px', border: '1px solid #252525' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: 'var(--tenant-color)', fontWeight: 400, minWidth: '14px' }}>{i + 1}</span>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'rgba(var(--tenant-color-rgb), 0.20)', color: 'var(--tenant-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontFamily: "'DM Mono', monospace" }}>
                      {emp.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontFamily: "'DM Mono', monospace", fontWeight: 400, color: '#E8E0D0', margin: 0 }}>{emp.name}</p>
                      <p style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: '#888780', margin: 0 }}>{emp.jobs_completed} jobs</p>
                    </div>
                  </div>
                  {emp.avg_score != null && (
                    <span style={{ backgroundColor: '#EAF3DE', color: '#27500A', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontFamily: "'DM Mono', monospace" }}>
                      ★ {emp.avg_score.toFixed(1)}
                    </span>
                  )}
                </div>
              )) : (
                <p style={{ fontSize: '13px', color: '#888780', textAlign: 'center', padding: '24px 0', fontFamily: "'DM Mono', monospace" }}>No data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Jobs Table */}
        <div style={{ backgroundColor: '#161616', border: '1px solid #252525', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '18px', color: '#E8E0D0', margin: 0 }}>Recent & Upcoming Jobs</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#0D0D0D', borderBottom: '1px solid #252525' }}>
                  {['Client', 'Date & Time', 'Service', 'Assigned', 'Status'].map(h => (
                    <th key={h} style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontFamily: "'DM Mono', monospace", fontWeight: 400, color: '#555550', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.recent_jobs?.slice(0, 6).map(job => (
                  <tr key={job.id} style={{ borderBottom: '1px solid #252525' }} className="hover:bg-[#1A1A1A] transition-colors">
                    <td style={{ padding: '14px 24px', fontSize: '13px', fontFamily: "'DM Mono', monospace", fontWeight: 400, color: '#E8E0D0' }}>{job.client_name}</td>
                    <td style={{ padding: '14px 24px' }}>
                      <p style={{ fontSize: '13px', fontFamily: "'DM Mono', monospace", fontWeight: 400, color: '#E8E0D0', margin: 0 }}>{new Date(job.scheduled_date).toLocaleDateString()}</p>
                      <p style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: '#888780', margin: 0 }}>{job.scheduled_time || 'Anytime'}</p>
                    </td>
                    <td style={{ padding: '14px 24px' }}>
                      <span style={{ border: '1px solid #252525', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontFamily: "'DM Mono', monospace", color: '#888780', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {job.service_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 24px', fontSize: '13px', fontFamily: "'DM Mono', monospace", color: '#888780' }}>{job.assigned_user_name || 'Unassigned'}</td>
                    <td style={{ padding: '14px 24px' }}><StatusBadge status={job.status as any} /></td>
                  </tr>
                )) || (
                  <tr><td colSpan={5} style={{ padding: '32px 24px', textAlign: 'center', color: '#888780', fontSize: '13px', fontFamily: "'DM Mono', monospace" }}>No recent jobs</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ label, value, sub, subPositive, subNegative, icon }: {
  label: string; value: any; sub?: string; subPositive?: boolean; subNegative?: boolean; icon?: React.ReactNode;
}) {
  const subColor = subNegative ? '#FCEBEB' : subPositive ? '#EAF3DE' : '#888780';
  return (
    <div style={{ backgroundColor: '#1A1A1A', borderRadius: '8px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <p style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", fontWeight: 400, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{label}</p>
        {icon && (
          <div style={{ padding: '6px', backgroundColor: '#161616', borderRadius: '6px', border: '1px solid #252525', color: 'rgba(var(--tenant-color-rgb), 0.6)', display: 'flex' }}>
            {icon}
          </div>
        )}
      </div>
      <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: '28px', color: '#E8E0D0', margin: '0 0 6px 0', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", fontWeight: 300, color: subColor, margin: 0 }}>{sub}</p>}
    </div>
  );
}
