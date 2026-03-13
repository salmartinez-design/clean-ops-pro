import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetDashboardMetrics } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Briefcase, CheckCircle2, DollarSign, AlertTriangle, Users } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatusBadge } from "@/components/ui/status-badge";

// Mock chart data for visual polish
const mockChartData = [
  { name: 'Mon', revenue: 4000 },
  { name: 'Tue', revenue: 3000 },
  { name: 'Wed', revenue: 5500 },
  { name: 'Thu', revenue: 4500 },
  { name: 'Fri', revenue: 6000 },
  { name: 'Sat', revenue: 2000 },
  { name: 'Sun', revenue: 1500 },
];

export default function Dashboard() {
  const { data, isLoading } = useGetDashboardMetrics(
    { period: "week" },
    { request: { headers: getAuthHeaders() } }
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of operations for the current week.</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Total Revenue" 
            value={`$${(data?.total_revenue || 0).toLocaleString()}`} 
            icon={<DollarSign className="w-5 h-5 text-primary" />} 
            trend="+12% from last week"
            isPositive
          />
          <MetricCard 
            title="Jobs Completed" 
            value={data?.jobs_completed || 0} 
            icon={<CheckCircle2 className="w-5 h-5 text-status-success" />} 
            trend={`${data?.jobs_in_progress || 0} in progress`}
            isNeutral
          />
          <MetricCard 
            title="Active Employees" 
            value={data?.active_employees || 0} 
            icon={<Users className="w-5 h-5 text-secondary" />} 
            trend="Avg score: 3.8/4.0"
            isPositive
          />
          <MetricCard 
            title="Flagged Clock-ins" 
            value={data?.flagged_clock_ins || 0} 
            icon={<AlertTriangle className="w-5 h-5 text-status-danger" />} 
            trend="Requires review"
            isNegative={data?.flagged_clock_ins ? data.flagged_clock_ins > 0 : false}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue Chart */}
          <Card className="lg:col-span-2 p-6 bg-[#1A1A1A] border-transparent">
            <div className="mb-6">
              <h3 className="text-lg font-bold font-display">Revenue Trend</h3>
              <p className="text-sm text-muted-foreground">7 day rolling volume</p>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Top Employees */}
          <Card className="p-6">
            <h3 className="text-lg font-bold font-display mb-6">Top Employees</h3>
            <div className="space-y-4">
              {data?.top_employees?.length ? data.top_employees.map((emp, i) => (
                <div key={emp.user_id} className="flex items-center justify-between p-3 rounded-lg bg-background hover-elevate border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-secondary/20 text-secondary flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.jobs_completed} jobs</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 bg-[#EAF3DE]/10 text-[#EAF3DE] px-2 py-1 rounded text-xs font-bold border border-[#3B6D11]/30">
                      ★ {emp.avg_score?.toFixed(1)}
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
              )}
            </div>
          </Card>
        </div>

        {/* Recent Jobs */}
        <Card className="p-0 overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center bg-card">
            <h3 className="text-lg font-bold font-display">Recent & Upcoming Jobs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-background text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Client</th>
                  <th className="px-6 py-4 font-semibold">Date & Time</th>
                  <th className="px-6 py-4 font-semibold">Service</th>
                  <th className="px-6 py-4 font-semibold">Assigned</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.recent_jobs?.length ? data.recent_jobs.slice(0, 5).map(job => (
                  <tr key={job.id} className="border-b border-border hover:bg-background/50 transition-colors">
                    <td className="px-6 py-4 font-bold">{job.client_name}</td>
                    <td className="px-6 py-4">
                      {new Date(job.scheduled_date).toLocaleDateString()} <br/>
                      <span className="text-muted-foreground">{job.scheduled_time || 'Anytime'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-background px-2 py-1 rounded border border-border text-xs">
                        {job.service_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{job.assigned_user_name || 'Unassigned'}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={job.status} />
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No recent jobs</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ title, value, icon, trend, isPositive, isNegative, isNeutral }: any) {
  let trendColor = "text-muted-foreground";
  if (isPositive) trendColor = "text-status-success";
  if (isNegative) trendColor = "text-status-danger";

  return (
    <Card className="p-6 bg-[#1A1A1A] border-transparent hover-elevate transition-all">
      <div className="flex justify-between items-start mb-4">
        <p className="text-muted-foreground font-semibold text-sm tracking-wider uppercase">{title}</p>
        <div className="p-2 bg-background rounded-lg border border-border">
          {icon}
        </div>
      </div>
      <h3 className="text-3xl font-bold font-display text-white mb-2">{value}</h3>
      <p className={`text-xs font-medium ${trendColor}`}>{trend}</p>
    </Card>
  );
}
