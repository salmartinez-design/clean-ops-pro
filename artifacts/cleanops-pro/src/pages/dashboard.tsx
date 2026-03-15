import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetDashboardMetrics } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  DollarSign, CheckCircle2, Users, AlertTriangle, ChevronRight,
  TrendingUp, X,
} from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const mockChartData = [
  { name: 'Mon', revenue: 3200 }, { name: 'Tue', revenue: 2800 },
  { name: 'Wed', revenue: 4800 }, { name: 'Thu', revenue: 4100 },
  { name: 'Fri', revenue: 5600 }, { name: 'Sat', revenue: 2100 }, { name: 'Sun', revenue: 1400 },
];

const CARD: React.CSSProperties = { backgroundColor: '#FFFFFF', border: '1px solid #E5E2DC', borderRadius: '10px' };

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E5E2DC', borderRadius: 8, padding: '8px 12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <p style={{ fontSize: 11, color: '#9E9B94', margin: '0 0 2px' }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 600, color: '#1A1917', margin: 0 }}>${payload[0].value.toLocaleString()}</p>
    </div>
  );
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  in_progress: { color: '#1D4ED8', bg: '#DBEAFE', label: 'In Progress' },
  scheduled:   { color: '#6B7280', bg: '#F3F4F6', label: 'Scheduled'   },
  complete:    { color: '#166534', bg: '#DCFCE7', label: 'Complete'     },
  en_route:    { color: '#7C3AED', bg: '#EDE9FE', label: 'En Route'     },
};

const EMP_STATUS: Record<string, { color: string; bg: string; dot: string }> = {
  'ON JOB':    { color: '#166534', bg: '#DCFCE7', dot: '#22C55E' },
  'EN ROUTE':  { color: '#1D4ED8', bg: '#DBEAFE', dot: '#3B82F6' },
  'SCHEDULED': { color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF' },
  'COMPLETE':  { color: '#0F766E', bg: '#CCFBF1', dot: '#14B8A6' },
  'OFF TODAY': { color: '#9E9B94', bg: '#F9F9F9', dot: '#E5E2DC' },
};

function useToday() {
  const [data, setData] = useState<any>(null);

  const fetchToday = async () => {
    try {
      const r = await fetch(`${API}/api/dashboard/today`, { headers: getAuthHeaders() });
      if (r.ok) setData(await r.json());
    } catch {}
  };

  useEffect(() => {
    fetchToday();
    const iv = setInterval(fetchToday, 60000);
    return () => clearInterval(iv);
  }, []);

  return data;
}

export default function Dashboard() {
  const isMobile = useIsMobile();
  const [, navigate] = useLocation();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set());

  const { data } = useGetDashboardMetrics(
    { period: "week" },
    { request: { headers: getAuthHeaders() } }
  );
  const today = useToday();

  const metrics = [
    { label: 'Total Revenue', value: `$${(data?.total_revenue || 0).toLocaleString()}`, sub: '↑ 12% from last week', subColor: '#16A34A', icon: TrendingUp },
    { label: 'Jobs Today', value: today ? (today.counts.in_progress + today.counts.scheduled + today.counts.complete) : (data?.jobs_completed ?? 0), sub: `${today?.counts?.in_progress || 0} in progress`, icon: CheckCircle2 },
    { label: 'Active Employees', value: data?.active_employees ?? 0, sub: `Avg score: ${(data?.avg_job_score || 0).toFixed(1)}/4.0`, icon: Users },
    { label: 'Flagged Clock-Ins', value: data?.flagged_clock_ins ?? 0, sub: 'Needs review', subColor: '#DC2626', icon: AlertTriangle },
  ];

  const recentJobs = data?.recent_jobs?.slice(0, 5) ?? [];
  const counts = today?.counts || {};
  const rawAlerts: any[] = today?.alerts || [];
  const alerts = rawAlerts.filter((_, i) => !dismissedAlerts.has(i));
  const employeeBoard: any[] = today?.employee_board || [];
  const dailyGoal = 2000;
  const todayRevenue = today?.today_revenue || 0;
  const pct = Math.min(Math.round((todayRevenue / dailyGoal) * 100), 100);

  function alertAction(a: any) {
    if (a.action === 'call_employee') return { label: 'View Employee', fn: () => navigate('/employees') };
    if (a.action === 'send_invoice') return { label: 'Go to Invoices', fn: () => navigate('/invoices') };
    if (a.action === 'review_clock') return { label: 'Review Clock-In', fn: () => navigate('/employees/clocks') };
    return { label: 'View', fn: () => {} };
  }

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* TODAY AT A GLANCE BAR */}
        {today && (
          <div style={{ background: 'var(--brand-dim, #EBF4FF)', border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)', borderRadius: 12, padding: '14px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand, #5B9BD5)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Today at a Glance · Auto-refreshes every 60s
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(counts).map(([k, v]) => {
                  const cfg = STATUS_CONFIG[k];
                  if (!cfg) return null;
                  return (
                    <button key={k} onClick={() => navigate('/jobs')}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: cfg.bg, border: `1px solid ${cfg.color}30`, borderRadius: 20, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      <span style={{ fontSize: 13 }}>{cfg.emoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{v as number}</span>
                      <span style={{ fontSize: 11, color: cfg.color, opacity: 0.8 }}>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* REVENUE + ALERTS */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: 16 }}>

          {/* Revenue progress */}
          <div style={{ ...CARD, padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1917', margin: 0 }}>Today's Revenue Goal</p>
              <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>${todayRevenue.toFixed(0)} / ${dailyGoal.toLocaleString()}</p>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: '#F3F4F6', overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--brand, #5B9BD5)', borderRadius: 5, transition: 'width 0.6s' }}/>
            </div>
            <p style={{ fontSize: 12, color: '#9E9B94', margin: '0 0 20px 0' }}>{pct}% to daily goal</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {metrics.map(m => (
                <div key={m.label}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#1A1917', margin: '0 0 3px 0' }}>{m.value}</p>
                  <p style={{ fontSize: 11, color: '#9E9B94', margin: 0 }}>{m.label}</p>
                  {m.sub && <p style={{ fontSize: 11, color: m.subColor || '#9E9B94', margin: '2px 0 0 0' }}>{m.sub}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div style={{ ...CARD, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              {alerts.length > 0 && <span style={{ width: 8, height: 8, borderRadius: 4, background: '#EF4444', flexShrink: 0 }}/>}
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1917', margin: 0, flex: 1 }}>Needs Attention</p>
              {alerts.length > 0 && <span style={{ fontSize: 11, background: '#FEE2E2', color: '#991B1B', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>{alerts.length}</span>}
            </div>
            {alerts.length === 0 && (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>All clear — no issues today.</p>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
              {alerts.map((a: any, i: number) => {
                const action = alertAction(a);
                const realIdx = rawAlerts.indexOf(a);
                return (
                  <div key={i} style={{ background: '#FFF7F0', border: '1px solid #FED7AA', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <p style={{ fontSize: 12, color: '#1A1917', margin: '0 0 7px 0', lineHeight: 1.45, flex: 1 }}>{a.message}</p>
                      <button onClick={() => setDismissedAlerts(p => new Set([...p, realIdx]))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E9B94', padding: 0, flexShrink: 0 }}><X size={12}/></button>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={action.fn}
                        style={{ fontSize: 11, fontWeight: 600, color: '#7C3AED', background: '#EDE9FE', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {action.label}
                      </button>
                      <button onClick={() => setDismissedAlerts(p => new Set([...p, realIdx]))}
                        style={{ fontSize: 11, color: '#9E9B94', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* EMPLOYEE STATUS BOARD */}
        {employeeBoard.length > 0 && (
          <div style={{ ...CARD, padding: '18px 20px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1917', margin: '0 0 14px 0' }}>Team Status Today</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {employeeBoard.map((emp: any) => {
                const cfg = EMP_STATUS[emp.status] || EMP_STATUS['OFF TODAY'];
                return (
                  <div key={emp.id} onClick={() => navigate(`/employees/${emp.id}`)} style={{ background: cfg.bg, border: `1px solid ${cfg.color}20`, borderRadius: 10, padding: '11px 13px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                      {emp.avatar_url
                        ? <img src={emp.avatar_url} style={{ width: 26, height: 26, borderRadius: 13, objectFit: 'cover', flexShrink: 0 }}/>
                        : <div style={{ width: 26, height: 26, borderRadius: 13, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#6B7280', flexShrink: 0 }}>
                            {emp.first_name?.[0]}{emp.last_name?.[0]}
                          </div>
                      }
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#1A1917', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.first_name} {emp.last_name}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: cfg.dot, flexShrink: 0 }}/>
                      <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color }}>{emp.status}</span>
                    </div>
                    {emp.detail && <p style={{ fontSize: 10, color: '#6B7280', margin: '3px 0 0 10px', lineHeight: 1.3 }}>{emp.detail}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CHART + RECENT JOBS */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          <div style={{ ...CARD, padding: '20px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1917', margin: '0 0 16px 0' }}>Revenue This Week</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={mockChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand, #5B9BD5)" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="var(--brand, #5B9BD5)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9E9B94', fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: '#9E9B94', fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Area type="monotone" dataKey="revenue" stroke="var(--brand, #5B9BD5)" strokeWidth={2} fill="url(#revGrad)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ ...CARD, padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1917', margin: 0 }}>Recent Jobs</p>
              <button onClick={() => navigate('/jobs')} style={{ fontSize: 12, color: 'var(--brand, #5B9BD5)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3 }}>
                View all <ChevronRight size={13}/>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentJobs.length === 0 && <p style={{ fontSize: 12, color: '#9E9B94', textAlign: 'center', padding: '16px 0' }}>No recent jobs</p>}
              {recentJobs.map((j: any) => (
                <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#1A1917', margin: '0 0 2px 0' }}>{j.client_name}</p>
                    <p style={{ fontSize: 11, color: '#9E9B94', margin: 0 }}>{j.scheduled_date}</p>
                  </div>
                  <StatusBadge status={j.status}/>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
