# CleanOps Pro — Key Codebase Reference

Auto-generated snapshot of 10 core files.

---

## 1. artifacts/cleanops-pro/src/index.css

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--bg-base);
  --color-foreground: #F0EDE8;
  --color-border: var(--border);
  --color-input: var(--bg-input);
  --color-ring: var(--brand);

  --color-card: var(--bg-card);
  --color-card-foreground: #F0EDE8;

  --color-popover: var(--bg-card);
  --color-popover-foreground: #F0EDE8;

  --color-primary: var(--brand);
  --color-primary-foreground: #0A0A0A;

  --color-secondary: #1C1C1C;
  --color-secondary-foreground: #F0EDE8;

  --color-muted: #1A1A1A;
  --color-muted-foreground: #7A7873;

  --color-accent: var(--brand);
  --color-accent-foreground: #0A0A0A;

  --color-destructive: #F87171;
  --color-destructive-foreground: #0A0A0A;

  --color-sidebar: var(--bg-raised);
  --color-sidebar-foreground: #F0EDE8;
  --color-sidebar-border: var(--border-sub);
  --color-sidebar-primary: var(--brand);
  --color-sidebar-primary-foreground: #0A0A0A;
  --color-sidebar-accent: var(--bg-hover);
  --color-sidebar-accent-foreground: #F0EDE8;
  --color-sidebar-ring: var(--brand);

  --color-chart-1: var(--brand);
  --color-chart-2: #60A5FA;
  --color-chart-3: #4ADE80;
  --color-chart-4: #FBBF24;
  --color-chart-5: #A78BFA;

  --font-sans: 'Plus Jakarta Sans', sans-serif;
  --font-serif: 'Plus Jakarta Sans', sans-serif;
  --font-display: 'Plus Jakarta Sans', sans-serif;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 10px;
  --radius: 8px;
}

:root {
  color-scheme: dark;

  /* === BACKGROUND SYSTEM === */
  --bg-base:    #0A0A0A;
  --bg-raised:  #111111;
  --bg-card:    #161616;
  --bg-hover:   #1C1C1C;
  --bg-input:   #1A1A1A;

  /* === BORDER SYSTEM === */
  --border:     #222222;
  --border-sub: #1A1A1A;

  /* === BRAND (overridden by JS on login) === */
  --brand:      #00C9A7;
  --brand-rgb:  0, 201, 167;
  --brand-dim:  rgba(0, 201, 167, 0.15);
  --brand-soft: rgba(0, 201, 167, 0.08);

  /* === LEGACY ALIASES === */
  --tenant-color:     #00C9A7;
  --tenant-color-rgb: 0, 201, 167;
  --background:       var(--bg-base);
  --foreground:       #F0EDE8;

  /* No shadows */
  --shadow-2xs: none;
  --shadow-xs:  none;
  --shadow-sm:  none;
  --shadow:     none;
  --shadow-md:  none;
  --shadow-lg:  none;
  --shadow-xl:  none;
  --shadow-2xl: none;
}

@layer base {
  * {
    box-sizing: border-box;
    font-family: 'Plus Jakarta Sans', sans-serif;
    border-color: var(--border);
  }

  html, body {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 400;
    font-size: 13px;
    background-color: var(--bg-base);
    color: #F0EDE8;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    margin: 0;
    padding: 0;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 700;
    color: #F0EDE8;
    margin: 0;
  }

  /* Focus rings */
  *:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(var(--brand-rgb), 0.4);
  }

  /* Scrollbars */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: #3A3A3A; }

  /* Universal inputs */
  input, textarea, select {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px;
    color: #F0EDE8;
    background: var(--bg-input);
    border: 1px solid #2A2A2A;
    border-radius: 8px;
    outline: none;
    transition: border-color 0.15s;
  }
  input::placeholder, textarea::placeholder { color: #4A4845; }
  input:hover, textarea:hover, select:hover { border-color: #333; }
  input:focus, textarea:focus, select:focus { border-color: var(--brand); }
}

@layer utilities {
  input[type="search"]::-webkit-search-cancel-button { display: none; }

  /* Brand utilities */
  .text-brand       { color: var(--brand); }
  .bg-brand         { background-color: var(--brand); }
  .border-brand     { border-color: var(--brand); }
  .bg-brand-dim     { background-color: var(--brand-dim); }
  .bg-brand-soft    { background-color: var(--brand-soft); }
  .ring-brand       { box-shadow: 0 0 0 2px rgba(var(--brand-rgb), 0.4); }

  /* Legacy aliases still used in some pages */
  .text-tenant      { color: var(--brand); }
  .bg-tenant        { background-color: var(--brand); }
  .bg-tenant-12     { background-color: rgba(var(--brand-rgb), 0.12); }
  .bg-tenant-15     { background-color: var(--brand-dim); }
  .font-display     { font-family: 'Plus Jakarta Sans', sans-serif; }
}

/* ============================================================
   BADGE SYSTEM — UNIVERSAL
   ============================================================ */

.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-family: 'Plus Jakarta Sans', sans-serif;
  white-space: nowrap;
}

.badge-complete, .badge-paid {
  background: #0F2A1A; color: #4ADE80; border: 1px solid #166534;
}
.badge-scheduled, .badge-sent {
  background: #0F1E2A; color: #60A5FA; border: 1px solid #1D4ED8;
}
.badge-in_progress {
  background: #2A1F0A; color: #FBBF24; border: 1px solid #92400E;
}
.badge-overdue, .badge-flagged, .badge-cancelled {
  background: #2A0F0F; color: #F87171; border: 1px solid #991B1B;
}
.badge-draft {
  background: #1A1A1A; color: #7A7873; border: 1px solid #333;
}
.badge-owner {
  background: var(--brand-dim); color: var(--brand); border: 1px solid rgba(var(--brand-rgb), 0.3);
}
.badge-admin {
  background: #1A1227; color: #A78BFA; border: 1px solid #5B21B6;
}
.badge-technician, .badge-active {
  background: #0F2A1A; color: #4ADE80; border: 1px solid #166534;
}

/* ============================================================
   FREQUENCY COLORS FOR JOB CARDS
   ============================================================ */
.freq-weekly     { border-left-color: var(--brand) !important; }
.freq-biweekly   { border-left-color: #60A5FA !important; }
.freq-triweekly  { border-left-color: #FBBF24 !important; }
.freq-monthly    { border-left-color: #A78BFA !important; }
.freq-on_demand  { border-left-color: #4A4845 !important; }
.freq-other      { border-left-color: #F87171 !important; }
```

---

## 2. artifacts/cleanops-pro/src/components/layout/app-sidebar.tsx

```tsx
import { Home, Briefcase, Users, UsersRound, FileText, DollarSign, BookOpen, Star, Settings, LogOut, LayoutDashboard, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { useTenantBrand } from "@/lib/tenant-brand";

const NAV_SECTIONS = [
  {
    label: "Operations",
    items: [
      { title: "Dashboard",    url: "/dashboard",    icon: LayoutDashboard },
      { title: "Jobs",         url: "/jobs",          icon: Briefcase },
      { title: "Employees",    url: "/employees",     icon: Users },
      { title: "Customers",    url: "/customers",     icon: UsersRound },
      { title: "Invoices",     url: "/invoices",      icon: FileText },
      { title: "Payroll",      url: "/payroll",       icon: DollarSign },
    ],
  },
  {
    label: "Tools",
    items: [
      { title: "Cleancyclopedia", url: "/cleancyclopedia", icon: BookOpen },
    ],
  },
  {
    label: "Configuration",
    items: [
      { title: "Loyalty",  url: "/loyalty",  icon: Star },
      { title: "Company",  url: "/company",  icon: Settings },
    ],
  },
];

interface AppSidebarProps {
  mobile?: boolean;
  open?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ mobile = false, open = false, onClose }: AppSidebarProps) {
  const [location] = useLocation();
  const logout = useAuthStore(state => state.logout);
  const { logoUrl, companyName } = useTenantBrand();

  const token = useAuthStore(state => state.token);
  let userInfo: { email: string; role: string; firstName: string; lastName: string } | null = null;
  if (token) {
    try {
      const p = JSON.parse(atob(token.split('.')[1]));
      userInfo = {
        email: p.email,
        role: p.role,
        firstName: p.first_name || p.email?.split('@')[0] || '',
        lastName: p.last_name || '',
      };
    } catch { /* empty */ }
  }

  const initials = userInfo
    ? `${userInfo.firstName[0] || ''}${userInfo.lastName[0] || ''}`.toUpperCase()
    : '??';

  const sidebarContent = (
    <div style={{
      width: mobile ? 264 : 216,
      minWidth: mobile ? 264 : 216,
      backgroundColor: '#111111',
      borderRight: '1px solid #1A1A1A',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Top — Logo + close (mobile only) */}
      <div style={{ padding: '18px 16px 12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {logoUrl ? (
            <div>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '6px', padding: '4px 8px', display: 'inline-block', marginBottom: '6px' }}>
                <img src={logoUrl} alt={companyName} style={{ height: '26px', width: 'auto', objectFit: 'contain', objectPosition: 'left', display: 'block' }} />
              </div>
              <p style={{ fontSize: '11px', fontWeight: 500, color: '#4A4845', letterSpacing: '0.06em', margin: 0 }}>CleanOps Pro</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#F0EDE8', margin: '0 0 4px 0' }}>{companyName}</p>
              <p style={{ fontSize: '11px', fontWeight: 500, color: '#4A4845', letterSpacing: '0.06em', margin: 0 }}>CleanOps Pro</p>
            </div>
          )}
        </div>
        {mobile && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A7873', padding: 4, display: 'flex', alignItems: 'center' }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div style={{ borderTop: '1px solid #1A1A1A', margin: '0 0 4px 0' }} />

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: '8px' }}>
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <p style={{
              fontSize: '10px', fontWeight: 600, color: '#4A4845',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '16px 16px 6px', margin: 0,
            }}>
              {section.label}
            </p>
            {section.items.map(item => {
              const isActive = location === item.url || (item.url !== '/dashboard' && location.startsWith(item.url));
              const Icon = item.icon;
              return (
                <Link key={item.url} href={item.url}>
                  <div
                    style={{
                      height: '36px',
                      padding: '0 12px',
                      margin: '1px 8px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      backgroundColor: isActive ? 'var(--brand-soft)' : 'transparent',
                      color: isActive ? 'var(--brand)' : '#7A7873',
                      fontWeight: isActive ? 500 : 400,
                      fontSize: '13px',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '#1C1C1C';
                        e.currentTarget.style.color = '#F0EDE8';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#7A7873';
                      }
                    }}
                  >
                    <Icon size={16} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                    <span>{item.title}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer — User */}
      <div style={{ borderTop: '1px solid #1A1A1A', flexShrink: 0 }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            backgroundColor: 'var(--brand-dim)', color: 'var(--brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 600, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#F0EDE8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userInfo?.firstName} {userInfo?.lastName}
            </p>
            <span style={{
              fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
              color: 'var(--brand)', backgroundColor: 'var(--brand-dim)',
              padding: '1px 6px', borderRadius: '4px', letterSpacing: '0.05em',
            }}>
              {userInfo?.role}
            </span>
          </div>
          <button
            onClick={logout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A4845', padding: '4px', borderRadius: '4px', display: 'flex', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#F0EDE8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4A4845')}
            title="Sign Out"
          >
            <LogOut size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <>
        {/* Overlay */}
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            backgroundColor: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(2px)',
            opacity: open ? 1 : 0,
            pointerEvents: open ? 'auto' : 'none',
            transition: 'opacity 0.28s ease',
          }}
        />
        {/* Drawer */}
        <aside style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          zIndex: 50,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {sidebarContent}
        </aside>
      </>
    );
  }

  return sidebarContent;
}
```

---

## 3. artifacts/cleanops-pro/src/App.tsx

```tsx
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import JobsPage from "@/pages/jobs";
import EmployeesPage from "@/pages/employees";
import CustomersPage from "@/pages/customers";
import InvoicesPage from "@/pages/invoices";
import CompanyPage from "@/pages/company";
import LoyaltyPage from "@/pages/loyalty";
import PayrollPage from "@/pages/payroll";
import CleancyclopediaPage from "@/pages/cleancyclopedia";
import NotFound from "@/pages/not-found";

import AdminDashboard from "@/pages/admin/index";
import AdminCompanies from "@/pages/admin/companies";
import AdminBilling from "@/pages/admin/billing";
import AdminCleancyclopedia from "@/pages/admin/cleancyclopedia";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: false },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/employees" component={EmployeesPage} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/invoices" component={InvoicesPage} />
      <Route path="/payroll" component={PayrollPage} />
      <Route path="/cleancyclopedia" component={CleancyclopediaPage} />
      <Route path="/company" component={CompanyPage} />
      <Route path="/loyalty" component={LoyaltyPage} />

      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/companies" component={AdminCompanies} />
      <Route path="/admin/billing" component={AdminBilling} />
      <Route path="/admin/cleancyclopedia" component={AdminCleancyclopedia} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
```

---

## 4. artifacts/cleanops-pro/src/pages/dashboard.tsx

```tsx
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetDashboardMetrics } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  DollarSign, CheckCircle2, Users, AlertTriangle, ChevronRight, TrendingUp,
} from "lucide-react";

const mockChartData = [
  { name: 'Mon', revenue: 3200 },
  { name: 'Tue', revenue: 2800 },
  { name: 'Wed', revenue: 4800 },
  { name: 'Thu', revenue: 4100 },
  { name: 'Fri', revenue: 5600 },
  { name: 'Sat', revenue: 2100 },
  { name: 'Sun', revenue: 1400 },
];

const CARD: React.CSSProperties = {
  backgroundColor: '#161616',
  border: '1px solid #222222',
  borderRadius: '10px',
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#161616', border: '1px solid #222222', borderRadius: 8, padding: '8px 12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <p style={{ fontSize: 11, color: '#4A4845', margin: '0 0 2px' }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 600, color: '#F0EDE8', margin: 0 }}>
        ${payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const isMobile = useIsMobile();
  const { data } = useGetDashboardMetrics(
    { period: "week" },
    { request: { headers: getAuthHeaders() } }
  );

  const metrics = [
    {
      label: 'Total Revenue',
      value: `$${(data?.total_revenue || 0).toLocaleString()}`,
      sub: '↑ 12% from last week',
      subColor: '#4ADE80',
      icon: TrendingUp,
    },
    {
      label: 'Jobs Today',
      value: data?.jobs_completed ?? 0,
      sub: `${data?.jobs_in_progress || 0} in progress`,
      icon: CheckCircle2,
    },
    {
      label: 'Active Employees',
      value: data?.active_employees ?? 0,
      sub: `Avg score: ${(data?.avg_job_score || 0).toFixed(1)}/4.0`,
      icon: Users,
    },
    {
      label: 'Flagged Clock-Ins',
      value: data?.flagged_clock_ins ?? 0,
      sub: 'Needs review',
      subColor: '#F87171',
      icon: AlertTriangle,
    },
  ];

  const recentJobs = data?.recent_jobs?.slice(0, 5) ?? [];
  const topEmployees = data?.top_employees?.slice(0, 5) ?? [];

  if (isMobile) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Metric cards — 2 per row on mobile */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {metrics.map(({ label, value, sub, subColor, icon: Icon }) => (
              <div key={label} style={{ ...CARD, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#4A4845', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0, lineHeight: 1.3 }}>
                    {label}
                  </p>
                  <Icon size={13} color="var(--brand)" style={{ flexShrink: 0 }} />
                </div>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#F0EDE8', margin: '0 0 4px' }}>{value}</p>
                {sub && (
                  <p style={{ fontSize: 11, color: subColor || '#7A7873', margin: 0 }}>{sub}</p>
                )}
              </div>
            ))}
          </div>

          {/* Revenue chart */}
          <div style={{ ...CARD, padding: 16 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#F0EDE8', margin: '0 0 2px' }}>Revenue Trend</p>
            <p style={{ fontSize: 12, color: '#7A7873', margin: '0 0 16px' }}>7-day rolling volume</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={mockChartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="brandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--brand)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1A1A1A" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4A4845', fontFamily: "'Plus Jakarta Sans'" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#4A4845', fontFamily: "'Plus Jakarta Sans'" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="var(--brand)" strokeWidth={2} fill="url(#brandGrad)" dot={false} activeDot={{ r: 4, fill: 'var(--brand)', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Today's jobs */}
          <div style={{ ...CARD, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#F0EDE8', margin: 0 }}>Today's Jobs</p>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontSize: 12, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 2, padding: 0 }}>
                View all <ChevronRight size={13} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentJobs.length > 0 ? recentJobs.map((job, i) => (
                <div key={job.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 0',
                  borderBottom: i < recentJobs.length - 1 ? '1px solid #222222' : 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#F0EDE8', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.client_name}
                    </p>
                    <p style={{ fontSize: 11, color: '#7A7873', margin: 0 }}>
                      {job.service_type?.replace(/_/g, ' ')} · {job.scheduled_time || 'Anytime'}
                    </p>
                  </div>
                  <StatusBadge status={job.status as any} />
                </div>
              )) : (
                <p style={{ fontSize: 13, color: '#7A7873', textAlign: 'center', padding: '24px 0', margin: 0 }}>No jobs today</p>
              )}
            </div>
          </div>

          {/* Top employees */}
          <div style={{ ...CARD, padding: 16, marginBottom: 4 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#F0EDE8', margin: '0 0 12px' }}>Top Employees</p>
            {topEmployees.length > 0 ? topEmployees.map((emp, i) => (
              <div key={emp.user_id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0',
                borderBottom: i < topEmployees.length - 1 ? '1px solid #222222' : 'none',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  backgroundColor: 'var(--brand-dim)', border: '1px solid var(--brand-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--brand)',
                }}>
                  {emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#F0EDE8', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {emp.name}
                  </p>
                  <p style={{ fontSize: 11, color: '#7A7873', margin: 0 }}>{emp.jobs_completed} jobs</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#F0EDE8', margin: '0 0 1px' }}>
                    {typeof emp.avg_score === 'number' ? emp.avg_score.toFixed(1) : '—'}
                  </p>
                  <p style={{ fontSize: 10, color: '#4A4845', margin: 0 }}>score</p>
                </div>
              </div>
            )) : (
              <p style={{ fontSize: 13, color: '#7A7873', textAlign: 'center', padding: '24px 0', margin: 0 }}>No data available</p>
            )}
          </div>

        </div>
      </DashboardLayout>
    );
  }

  // ── DESKTOP LAYOUT ──────────────────────────────────────────────────
  const S = {
    label: {
      fontSize: '11px', fontWeight: 500, color: '#4A4845',
      textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0,
    } as React.CSSProperties,
    value: {
      fontSize: '22px', fontWeight: 700, color: '#F0EDE8',
      marginTop: '12px', marginBottom: '4px',
    } as React.CSSProperties,
    sub: {
      fontSize: '12px', fontWeight: 400, color: '#7A7873', margin: 0,
    } as React.CSSProperties,
    th: {
      padding: '12px 20px', textAlign: 'left' as const,
      fontSize: '11px', fontWeight: 500, color: '#4A4845',
      textTransform: 'uppercase' as const, letterSpacing: '0.06em',
      borderBottom: '1px solid #1A1A1A',
    } as React.CSSProperties,
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* 4-column metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {metrics.map(({ label, value, sub, subColor, icon: Icon }) => (
            <div
              key={label}
              style={{ ...CARD, padding: '20px', position: 'relative', transition: 'border-color 0.2s', cursor: 'default' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(var(--brand-rgb), 0.4)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#222222')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={S.label}>{label}</p>
                <Icon size={18} style={{ color: 'var(--brand)', opacity: 0.5, position: 'absolute', top: '20px', right: '20px' }} strokeWidth={1.5} />
              </div>
              <p style={S.value}>{value}</p>
              <p style={{ ...S.sub, color: subColor || '#7A7873' }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        <div style={{ ...CARD, padding: '24px' }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#F0EDE8', margin: 0 }}>Revenue Trend</p>
          <p style={{ fontSize: '12px', color: '#7A7873', margin: '2px 0 20px 0' }}>7 day rolling volume</p>
          <div style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                <XAxis dataKey="name" stroke="transparent" tick={{ fill: '#4A4845', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke="transparent" tick={{ fill: '#4A4845', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1C1C1C', border: '1px solid #333', borderRadius: '6px', fontSize: '12px', color: '#F0EDE8' }}
                  itemStyle={{ color: 'var(--brand)' }}
                  labelStyle={{ color: '#7A7873' }}
                  cursor={{ stroke: '#333', strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--brand)" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: 'var(--brand)', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Two-column: Jobs + Top Employees */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px' }}>
          {/* Recent Jobs table */}
          <div style={{ ...CARD, overflow: 'hidden' }}>
            <div style={{ padding: '20px 20px 0' }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#F0EDE8', margin: 0 }}>Recent & Upcoming Jobs</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
              <thead>
                <tr>
                  {['Client', 'Date & Time', 'Service', 'Assigned', 'Status'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.recent_jobs?.slice(0, 6).map(job => (
                  <tr
                    key={job.id}
                    style={{ borderBottom: '1px solid #0F0F0F', cursor: 'default' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1C1C1C')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '12px 20px', fontSize: '13px', fontWeight: 600, color: '#F0EDE8' }}>{job.client_name}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <p style={{ fontSize: '12px', color: '#7A7873', margin: 0 }}>{new Date(job.scheduled_date).toLocaleDateString()}</p>
                      <p style={{ fontSize: '12px', color: '#7A7873', margin: 0 }}>{job.scheduled_time || 'Anytime'}</p>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: '12px', color: '#7A7873', textTransform: 'capitalize' }}>{job.service_type?.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '12px 20px', fontSize: '12px', color: '#7A7873' }}>{job.assigned_user_name || 'Unassigned'}</td>
                    <td style={{ padding: '12px 20px' }}><StatusBadge status={job.status as any} /></td>
                  </tr>
                )) || (
                  <tr><td colSpan={5} style={{ padding: '32px 20px', textAlign: 'center', fontSize: '13px', color: '#7A7873' }}>No recent jobs</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Top Employees */}
          <div style={CARD}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#F0EDE8', padding: '20px', margin: 0 }}>Top Employees</p>
            {data?.top_employees?.length ? data.top_employees.slice(0, 6).map((emp, i) => (
              <div
                key={emp.user_id}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', borderBottom: '1px solid #0F0F0F', cursor: 'default' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1C1C1C')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brand)', width: '20px', flexShrink: 0 }}>{i + 1}</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--brand-dim)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>
                  {emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#F0EDE8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</p>
                  <p style={{ fontSize: '12px', color: '#7A7873', margin: 0 }}>{emp.jobs_completed} jobs</p>
                </div>
              </div>
            )) : (
              <p style={{ padding: '32px 20px', textAlign: 'center', fontSize: '13px', color: '#7A7873' }}>No data available</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
```

---

## 5. artifacts/cleanops-pro/src/pages/company.tsx

```tsx
import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetMyCompany, useUpdateMyCompany } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { applyTenantColor } from "@/lib/tenant-brand";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, ImageIcon } from "lucide-react";

type Tab = 'general' | 'branding' | 'integrations' | 'payroll';

const TABS: { id: Tab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'branding', label: 'Branding' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'payroll', label: 'Payroll Options' },
];

export default function CompanyPage() {
  const [activeTab, setActiveTab] = useState<Tab>('branding');

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '42px', color: '#F0EDE8', margin: 0, lineHeight: 1.1 }}>Company Settings</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300, fontSize: '13px', color: '#7A7873', marginTop: '6px' }}>Manage your company profile, branding, and integrations.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid #252525', paddingBottom: '0' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: activeTab === tab.id ? 400 : 300,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? 'var(--brand)' : '#7A7873',
                borderBottom: `2px solid ${activeTab === tab.id ? 'var(--brand)' : 'transparent'}`,
                marginBottom: '-1px',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'branding' && <BrandingTab />}
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'integrations' && <PlaceholderTab title="Integrations" desc="Connect QuickBooks, Stripe, and other services." />}
        {activeTab === 'payroll' && <PlaceholderTab title="Payroll Options" desc="Configure pay cadence and export settings." />}
      </div>
    </DashboardLayout>
  );
}

function BrandingTab() {
  const { data: company } = useGetMyCompany({ request: { headers: getAuthHeaders() } });
  const updateCompany = useUpdateMyCompany({ request: { headers: getAuthHeaders() } });
  const { toast } = useToast();

  const [brandColor, setBrandColor] = useState('#00C9A7');
  const [logoUrl, setLogoUrl] = useState('');
  const [previewColor, setPreviewColor] = useState('#00C9A7');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (company) {
      const c = (company as any).brand_color || '#00C9A7';
      setBrandColor(c);
      setPreviewColor(c);
      setLogoUrl((company as any).logo_url || '');
    }
  }, [company]);

  const handleColorChange = (hex: string) => {
    setBrandColor(hex);
    setPreviewColor(hex);
    applyTenantColor(hex);
  };

  const handleSave = () => {
    updateCompany.mutate(
      { data: { brand_color: brandColor } as any },
      {
        onSuccess: () => {
          applyTenantColor(brandColor);
          toast({ title: "Brand updated", description: "Color is live across the app." });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "Failed to save brand settings." });
        }
      }
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      toast({ variant: "destructive", title: "Invalid file type", description: "Please choose a PNG, JPG, or WebP file." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Maximum file size is 2MB." });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/companies/logo', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      const freshUrl = `${data.logo_url}?t=${Date.now()}`;
      setLogoUrl(freshUrl);
      setSelectedFile(null);
      setUploadPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast({ title: "Logo uploaded", description: "Refreshing to apply changes..." });
      setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    } finally {
      setUploading(false);
    }
  };

  const hexToRgb = (hex: string) => {
    const c = hex.replace('#', '');
    return `${parseInt(c.slice(0,2),16)}, ${parseInt(c.slice(2,4),16)}, ${parseInt(c.slice(4,6),16)}`;
  };

  const previewRgb = hexToRgb(previewColor);
  const displayLogoUrl = uploadPreview || logoUrl;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
      {/* Left: Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Brand Color */}
        <Section title="Brand Color" desc="Applied across all accents, buttons, and highlights.">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="color"
              value={brandColor}
              onChange={e => handleColorChange(e.target.value)}
              style={{ width: '48px', height: '48px', padding: '2px', backgroundColor: '#161616', border: '1px solid #252525', borderRadius: '8px', cursor: 'pointer' }}
            />
            <input
              type="text"
              value={brandColor}
              onChange={e => {
                if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                  setBrandColor(e.target.value);
                  if (e.target.value.length === 7) handleColorChange(e.target.value);
                }
              }}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', color: '#F0EDE8', backgroundColor: '#161616', border: '1px solid #252525', borderRadius: '6px', padding: '8px 14px', width: '120px', letterSpacing: '0.08em', outline: 'none' }}
            />
          </div>
          <p style={{ fontSize: '11px', color: '#7A7873', marginTop: '8px' }}>Affects sidebar, buttons, badges, charts.</p>
          <button
            onClick={handleSave}
            disabled={updateCompany.isPending}
            style={{ marginTop: '12px', padding: '8px 20px', backgroundColor: 'var(--brand)', color: '#0A0A0A', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', opacity: updateCompany.isPending ? 0.7 : 1 }}
          >
            {updateCompany.isPending ? 'Saving...' : 'Save Color'}
          </button>
        </Section>

        {/* Logo Upload */}
        <Section title="Company Logo" desc="PNG or JPG, transparent background recommended, max 2MB.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Current / preview on both backgrounds */}
            {displayLogoUrl && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ backgroundColor: '#161616', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <img src={displayLogoUrl} alt="Logo dark" style={{ maxHeight: '40px', maxWidth: '100%', objectFit: 'contain' }} />
                  <span style={{ fontSize: '10px', color: '#4A4845' }}>Dark bg</span>
                </div>
                <div style={{ backgroundColor: '#F0EDE8', border: '1px solid #DDD', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <img src={displayLogoUrl} alt="Logo light" style={{ maxHeight: '40px', maxWidth: '100%', objectFit: 'contain' }} />
                  <span style={{ fontSize: '10px', color: '#888' }}>Light bg</span>
                </div>
              </div>
            )}

            {/* No logo state */}
            {!displayLogoUrl && (
              <div style={{ backgroundColor: '#161616', border: '1px dashed #2A2A2A', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <ImageIcon size={24} color="#4A4845" />
                <span style={{ fontSize: '12px', color: '#4A4845' }}>No logo uploaded yet</span>
              </div>
            )}

            {/* File picker */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  flex: 1, height: '38px', backgroundColor: '#1A1A1A',
                  border: '1px solid #2A2A2A', borderRadius: '8px',
                  color: '#F0EDE8', fontSize: '12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                <Upload size={13} />
                {selectedFile ? selectedFile.name : 'Choose file...'}
              </button>
              {selectedFile && (
                <button
                  onClick={() => { setSelectedFile(null); setUploadPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  style={{ width: '38px', height: '38px', backgroundColor: '#2A0F0F', border: '1px solid #991B1B', borderRadius: '8px', color: '#F87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {selectedFile && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{ height: '40px', backgroundColor: 'var(--brand)', color: '#0A0A0A', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: uploading ? 0.7 : 1 }}
              >
                {uploading ? 'Uploading...' : 'Upload Logo'}
              </button>
            )}

            <p style={{ fontSize: '11px', color: '#4A4845', margin: 0 }}>
              PNG with transparent background works best. The logo appears in the sidebar header on all dark backgrounds.
            </p>
          </div>
        </Section>
      </div>

      {/* Right: Preview */}
      <div style={{ backgroundColor: '#111111', border: '1px solid #252525', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #252525' }}>
          <p style={{ fontSize: '11px', color: '#7A7873', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Sidebar Preview</p>
        </div>
        <div style={{ padding: '16px' }}>
          {/* Company header */}
          <div style={{ paddingBottom: '12px', borderBottom: '1px solid #252525', marginBottom: '12px' }}>
            {displayLogoUrl ? (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '6px', padding: '4px 8px', display: 'inline-block', marginBottom: '4px' }}>
                <img src={displayLogoUrl} alt="Logo" style={{ height: '26px', width: 'auto', objectFit: 'contain', display: 'block' }} />
              </div>
            ) : (
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '14px', color: '#F0EDE8', margin: '0 0 4px 0' }}>{(company as any)?.name || 'Your Company'}</p>
            )}
            <p style={{ fontSize: '11px', color: '#4A4845', margin: 0 }}>CleanOps Pro</p>
          </div>
          {[
            { label: 'Dashboard', active: false },
            { label: 'Jobs', active: true },
            { label: 'Employees', active: false },
            { label: 'Customers', active: false },
          ].map(item => (
            <div key={item.label} style={{
              height: '34px', padding: '0 10px', margin: '2px 0',
              borderRadius: '6px', display: 'flex', alignItems: 'center',
              backgroundColor: item.active ? `rgba(${previewRgb}, 0.1)` : 'transparent',
              color: item.active ? previewColor : '#7A7873',
              fontSize: '13px', fontWeight: item.active ? 500 : 400,
            }}>
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GeneralTab() {
  const { data: company } = useGetMyCompany({ request: { headers: getAuthHeaders() } });
  const updateCompany = useUpdateMyCompany({ request: { headers: getAuthHeaders() } });
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [payCadence, setPayCadence] = useState('biweekly');

  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setPayCadence(company.pay_cadence || 'biweekly');
    }
  }, [company]);

  const handleSave = () => {
    updateCompany.mutate(
      { data: { name, pay_cadence: payCadence as any } as any },
      {
        onSuccess: () => toast({ title: "Settings saved", description: "Company profile updated." }),
        onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to save settings." }),
      }
    );
  };

  return (
    <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Section title="Company Name" desc="">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: '100%', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#F0EDE8', backgroundColor: '#161616', border: '1px solid #252525', borderRadius: '6px', padding: '10px 14px', outline: 'none' }}
        />
      </Section>
      <Section title="Pay Cadence" desc="How often payroll is processed.">
        <div style={{ display: 'flex', gap: '8px' }}>
          {[{ id: 'weekly', label: 'Weekly' }, { id: 'biweekly', label: 'Bi-weekly' }, { id: 'semimonthly', label: 'Semi-monthly' }].map(opt => (
            <button key={opt.id} onClick={() => setPayCadence(opt.id)} style={{ padding: '7px 16px', borderRadius: '6px', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer', border: payCadence === opt.id ? 'none' : '1px solid #252525', backgroundColor: payCadence === opt.id ? 'var(--brand)' : 'transparent', color: payCadence === opt.id ? '#0A0A0A' : '#7A7873' }}>
              {opt.label}
            </button>
          ))}
        </div>
      </Section>
      <button onClick={handleSave} disabled={updateCompany.isPending} style={{ alignSelf: 'flex-start', padding: '10px 24px', backgroundColor: 'var(--brand)', color: '#0A0A0A', borderRadius: '6px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400, border: 'none', cursor: 'pointer', opacity: updateCompany.isPending ? 0.7 : 1 }}>
        {updateCompany.isPending ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400, fontSize: '13px', color: '#F0EDE8', margin: '0 0 4px 0' }}>{title}</h3>
      {desc && <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300, fontSize: '12px', color: '#7A7873', margin: '0 0 12px 0' }}>{desc}</p>}
      {children}
    </div>
  );
}

function PlaceholderTab({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ padding: '48px 0', textAlign: 'center', border: '1px dashed #252525', borderRadius: '8px' }}>
      <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '24px', color: '#F0EDE8', margin: '0 0 8px 0' }}>{title}</h3>
      <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300, fontSize: '13px', color: '#7A7873', margin: 0 }}>{desc}</p>
    </div>
  );
}
```

---

## 6. artifacts/cleanops-pro/src/pages/loyalty.tsx

```tsx
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetLoyaltySettings, useUpdateLoyaltySettings } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const PROGRAM_STYLES = [
  { id: 'points', label: 'Points-Based', desc: 'Earn points per cleaning and per dollar spent.' },
  { id: 'punch_card', label: 'Punch Card', desc: '10 cleanings = 1 free cleaning.' },
  { id: 'tiered', label: 'Tiered VIP', desc: 'Silver / Gold / Platinum tiers.' },
];

const EARN_RULES = [
  { id: 'per_cleaning', label: 'Per completed cleaning', pts: 50, type: 'toggle' },
  { id: 'per_dollar', label: 'Per dollar spent', pts: 5, type: 'slider' },
  { id: 'referral', label: 'Referral', pts: 200, type: 'toggle' },
  { id: 'google_review', label: 'Google review', pts: 100, type: 'toggle' },
  { id: 'auto_pay', label: 'Auto-pay enrollment', pts: 25, type: 'toggle' },
  { id: 'birthday', label: 'Birthday', pts: 50, type: 'toggle' },
];

const REWARDS = [
  { id: 'r5off', label: '$5 off', pts: 250 },
  { id: 'r10off', label: '$10 off', pts: 500 },
  { id: 'free_addon', label: 'Free add-on', pts: 400 },
  { id: 'free_cleaning', label: 'Free cleaning', pts: 1200 },
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: '40px', height: '22px', borderRadius: '11px',
        backgroundColor: on ? 'var(--brand)' : '#222222',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background-color 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#F0EDE8',
        position: 'absolute', top: '3px', left: on ? '21px' : '3px',
        transition: 'left 0.2s',
      }} />
    </button>
  );
}

export default function LoyaltyPage() {
  const { data: settings } = useGetLoyaltySettings({ request: { headers: getAuthHeaders() } });
  const updateSettings = useUpdateLoyaltySettings({ request: { headers: getAuthHeaders() } });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [programStyle, setProgramStyle] = useState<string>((settings as any)?.program_style || 'points');
  const [earnToggles, setEarnToggles] = useState<Record<string, boolean>>({
    per_cleaning: true, per_dollar: true, referral: true,
    google_review: true, auto_pay: false, birthday: true,
  });
  const [ptsPerDollar, setPtsPerDollar] = useState(5);
  const [rewardToggles, setRewardToggles] = useState<Record<string, boolean>>({
    r5off: true, r10off: true, free_addon: true, free_cleaning: false,
  });

  const handleSave = () => {
    updateSettings.mutate(
      { data: { program_style: programStyle as any, points_per_cleaning: 50, points_per_dollar: ptsPerDollar } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/loyalty/settings'] });
          toast({ title: "Loyalty settings saved", description: "Changes are now live for your clients." });
        },
        onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to save loyalty settings." }),
      }
    );
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Header */}
        <div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '42px', color: '#F0EDE8', margin: 0, lineHeight: 1.1 }}>Loyalty Program</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300, fontSize: '13px', color: '#7A7873', marginTop: '6px' }}>Configure your CleanRewards program style, earn rules, and rewards.</p>
        </div>

        {/* Section 1: Program Style */}
        <div>
          <SectionTitle>Program Style</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '12px' }}>
            {PROGRAM_STYLES.map(style => (
              <button
                key={style.id}
                onClick={() => setProgramStyle(style.id)}
                style={{
                  padding: '20px',
                  borderRadius: '10px',
                  border: `2px solid ${programStyle === style.id ? 'var(--brand)' : '#222222'}`,
                  backgroundColor: programStyle === style.id ? 'rgba(var(--tenant-color-rgb), 0.08)' : '#161616',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '16px', color: programStyle === style.id ? 'var(--brand)' : '#F0EDE8', margin: '0 0 6px 0' }}>{style.label}</p>
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300, fontSize: '12px', color: '#7A7873', margin: 0 }}>{style.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Earn Rules */}
        <div>
          <SectionTitle>Earn Rules</SectionTitle>
          <div style={{ backgroundColor: '#161616', border: '1px solid #252525', borderRadius: '8px', overflow: 'hidden', marginTop: '12px' }}>
            {EARN_RULES.map((rule, i) => (
              <div key={rule.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: i < EARN_RULES.length - 1 ? '1px solid #252525' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Toggle on={earnToggles[rule.id]} onChange={v => setEarnToggles(prev => ({ ...prev, [rule.id]: v }))} />
                  <span style={{ fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300, color: earnToggles[rule.id] ? '#F0EDE8' : '#7A7873' }}>{rule.label}</span>
                </div>
                {rule.type === 'slider' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--brand)', minWidth: '100px', textAlign: 'right' }}>{ptsPerDollar} pts per $1</span>
                    <input
                      type="range" min="1" max="10" value={ptsPerDollar}
                      onChange={e => setPtsPerDollar(Number(e.target.value))}
                      style={{ width: '100px', accentColor: 'var(--brand)' }}
                    />
                  </div>
                ) : (
                  <span style={{ backgroundColor: 'rgba(var(--tenant-color-rgb), 0.15)', color: 'var(--brand)', padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {rule.pts} pts
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Rewards */}
        <div>
          <SectionTitle>Rewards</SectionTitle>
          <div style={{ backgroundColor: '#161616', border: '1px solid #252525', borderRadius: '8px', overflow: 'hidden', marginTop: '12px' }}>
            {REWARDS.map((reward, i) => (
              <div key={reward.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: i < REWARDS.length - 1 ? '1px solid #252525' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Toggle on={rewardToggles[reward.id]} onChange={v => setRewardToggles(prev => ({ ...prev, [reward.id]: v }))} />
                  <span style={{ fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300, color: rewardToggles[reward.id] ? '#F0EDE8' : '#7A7873' }}>{reward.label}</span>
                </div>
                <span style={{ backgroundColor: '#1A1A1A', border: '1px solid #252525', color: '#7A7873', padding: '3px 12px', borderRadius: '4px', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {reward.pts.toLocaleString()} pts
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div>
          <button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            style={{ padding: '10px 28px', backgroundColor: 'var(--brand)', color: '#0D0D0D', borderRadius: '6px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400, border: 'none', cursor: 'pointer', opacity: updateSettings.isPending ? 0.7 : 1 }}
          >
            {updateSettings.isPending ? 'Saving...' : 'Save Loyalty Settings'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '22px', color: '#F0EDE8', margin: 0 }}>{children}</h2>
  );
}
```

---

## 7. artifacts/cleanops-pro/src/lib/tenant-brand.ts

```ts
import { useEffect } from 'react';
import { useGetMyCompany } from '@workspace/api-client-react';
import { getAuthHeaders, useAuthStore } from '@/lib/auth';

function hexToRgb(hex: string): string {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export function applyTenantColor(hex: string) {
  const rgb = hexToRgb(hex);
  const el = document.documentElement;
  el.style.setProperty('--brand', hex);
  el.style.setProperty('--brand-rgb', rgb);
  el.style.setProperty('--brand-dim', `rgba(${rgb}, 0.15)`);
  el.style.setProperty('--brand-soft', `rgba(${rgb}, 0.08)`);
  // Legacy aliases for any remaining references
  el.style.setProperty('--tenant-color', hex);
  el.style.setProperty('--tenant-color-rgb', rgb);
}

export function useTenantBrand() {
  const token = useAuthStore(state => state.token);

  const { data: company } = useGetMyCompany({
    request: { headers: getAuthHeaders() },
    query: { enabled: !!token, retry: false, staleTime: 60_000 }
  });

  useEffect(() => {
    const color = (company as any)?.brand_color || '#00C9A7';
    applyTenantColor(color);
  }, [(company as any)?.brand_color]);

  return {
    company,
    brandColor: (company as any)?.brand_color || '#00C9A7',
    logoUrl: (company as any)?.logo_url || null,
    companyName: company?.name || 'CleanOps Pro',
  };
}
```

---

## 8. artifacts/api-server/src/routes/companies.ts

```ts
import { Router } from "express";
import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import { mkdirSync } from "fs";
import { requireAuth } from "../lib/auth.js";

function getLogosDir(): string {
  const base = process.env.UPLOADS_DIR || path.resolve(process.cwd(), "uploads");
  const dir = path.join(base, "logos");
  mkdirSync(dir, { recursive: true });
  return dir;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => { cb(null, getLogosDir()); },
  filename: (req, _file, cb) => {
    cb(null, `company_${req.auth!.companyId}_logo.jpg`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPG, and WebP files are allowed"));
    }
  },
});

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  try {
    if (!req.auth!.companyId) {
      return res.status(404).json({ error: "Not Found", message: "No company for this user" });
    }
    const company = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.id, req.auth!.companyId))
      .limit(1);

    if (!company[0]) {
      return res.status(404).json({ error: "Not Found", message: "Company not found" });
    }

    return res.json(company[0]);
  } catch (err) {
    console.error("Get company error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to get company" });
  }
});

router.put("/me", requireAuth, async (req, res) => {
  try {
    if (!req.auth!.companyId) {
      return res.status(403).json({ error: "Forbidden", message: "No company to update" });
    }
    const { name, logo_url, pay_cadence, geo_fence_threshold_ft, brand_color } = req.body;

    const updated = await db
      .update(companiesTable)
      .set({
        ...(name && { name }),
        ...(logo_url !== undefined && { logo_url }),
        ...(pay_cadence && { pay_cadence }),
        ...(geo_fence_threshold_ft !== undefined && { geo_fence_threshold_ft }),
        ...(brand_color && { brand_color }),
      })
      .where(eq(companiesTable.id, req.auth!.companyId))
      .returning();

    return res.json(updated[0]);
  } catch (err) {
    console.error("Update company error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to update company" });
  }
});

router.post("/logo", requireAuth, (req, res) => {
  if (!req.auth!.companyId) {
    return res.status(403).json({ error: "Forbidden", message: "No company for this user" });
  }

  upload.single("file")(req, res, async (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum 2MB allowed." });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const logoUrl = `/api/uploads/logos/${req.file.filename}`;
    try {
      await db
        .update(companiesTable)
        .set({ logo_url: logoUrl })
        .where(eq(companiesTable.id, req.auth!.companyId!));
      return res.json({ logo_url: logoUrl });
    } catch (dbErr) {
      console.error("Logo DB update error:", dbErr);
      return res.status(500).json({ error: "Failed to update company logo" });
    }
  });
});

export default router;
```

---

## 9. artifacts/api-server/src/routes/auth.ts

```ts
import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, companiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAuth, signToken } from "../lib/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Bad Request", message: "Email and password required" });
    }

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (!user[0]) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    }

    if (!user[0].is_active) {
      return res.status(401).json({ error: "Unauthorized", message: "Account is inactive" });
    }

    const token = signToken({
      userId: user[0].id,
      companyId: user[0].company_id,
      role: user[0].role,
      email: user[0].email,
    });

    return res.json({
      token,
      user: {
        id: user[0].id,
        email: user[0].email,
        first_name: user[0].first_name,
        last_name: user[0].last_name,
        role: user[0].role,
        company_id: user[0].company_id,
        avatar_url: user[0].avatar_url,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Login failed" });
  }
});

router.post("/logout", requireAuth, (_req, res) => {
  res.json({ success: true, message: "Logged out" });
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.auth!.userId))
      .limit(1);

    if (!user[0]) {
      return res.status(404).json({ error: "Not Found", message: "User not found" });
    }

    return res.json({
      id: user[0].id,
      email: user[0].email,
      first_name: user[0].first_name,
      last_name: user[0].last_name,
      role: user[0].role,
      company_id: user[0].company_id,
      avatar_url: user[0].avatar_url,
    });
  } catch (err) {
    console.error("Get me error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to get user" });
  }
});

export default router;
```

---

## 10. lib/db/src/schema/companies.ts

```ts
import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active", "past_due", "canceled", "trialing"
]);

export const planEnum = pgEnum("plan", [
  "starter", "growth", "enterprise"
]);

export const payCadenceEnum = pgEnum("pay_cadence", [
  "weekly", "biweekly", "semimonthly"
]);

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo_url: text("logo_url"),
  stripe_customer_id: text("stripe_customer_id"),
  stripe_subscription_id: text("stripe_subscription_id"),
  square_oauth_token: text("square_oauth_token"),
  subscription_status: subscriptionStatusEnum("subscription_status").notNull().default("trialing"),
  plan: planEnum("plan").notNull().default("starter"),
  employee_count: integer("employee_count").notNull().default(0),
  pay_cadence: payCadenceEnum("pay_cadence").notNull().default("biweekly"),
  geo_fence_threshold_ft: integer("geo_fence_threshold_ft").notNull().default(500),
  brand_color: text("brand_color").notNull().default("#00C9A7"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({ id: true, created_at: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
```
