import {
  Home, Briefcase, Users, UsersRound, FileText, DollarSign, BookOpen, Star,
  Settings, LogOut, LayoutDashboard, X, Tag, ClipboardList, Clock, TrendingUp,
  BarChart2, ChevronDown, ChevronRight, ReceiptText, Calendar, UserCheck,
  AlertTriangle, Activity, Clipboard, LayoutList, Banknote,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { useTenantBrand } from "@/lib/tenant-brand";
import { useState } from "react";

const REPORT_ITEMS = [
  { title: "Reports Home",          url: "/reports",                    icon: BarChart2 },
  { title: "Performance Insights",  url: "/reports/insights",           icon: TrendingUp },
  { title: "Revenue Summary",       url: "/reports/revenue",            icon: DollarSign },
  { title: "Payroll Summary",       url: "/reports/payroll",            icon: Banknote },
  { title: "Payroll % Revenue",     url: "/reports/payroll-to-revenue", icon: Activity },
  { title: "Employee Stats",        url: "/reports/employee-stats",     icon: UserCheck },
  { title: "Tips Report",           url: "/reports/tips",               icon: Star },
  { title: "Accounts Receivable",   url: "/reports/receivables",        icon: ReceiptText },
  { title: "Job Costing",           url: "/reports/job-costing",        icon: Clipboard },
  { title: "Schedule Efficiency",   url: "/reports/efficiency",         icon: Calendar },
  { title: "Week in Review",        url: "/reports/week-review",        icon: LayoutList },
  { title: "Scorecards",            url: "/reports/scorecards",         icon: ClipboardList },
  { title: "Cancellations",         url: "/reports/cancellations",      icon: AlertTriangle },
  { title: "Contact Tickets",       url: "/reports/contact-tickets",    icon: FileText },
  { title: "Hot Sheet",             url: "/reports/hot-sheet",          icon: Home },
  { title: "First Time In",         url: "/reports/first-time",         icon: Users },
];

const NAV_SECTIONS = [
  {
    label: "Operations",
    items: [
      { title: "Dashboard",      url: "/dashboard",        icon: LayoutDashboard },
      { title: "My Jobs",        url: "/my-jobs",           icon: ClipboardList },
      { title: "Jobs",           url: "/jobs",              icon: Briefcase },
      { title: "Employees",      url: "/employees",         icon: Users },
      { title: "Clock Monitor",  url: "/employees/clocks",  icon: Clock, roles: ["owner", "admin"] },
      { title: "Customers",      url: "/customers",         icon: UsersRound },
      { title: "Invoices",       url: "/invoices",          icon: FileText },
      { title: "Payroll",        url: "/payroll",           icon: DollarSign, roles: ["owner", "admin"] },
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
      { title: "Loyalty",    url: "/loyalty",    icon: Star,     roles: ["owner", "admin"] },
      { title: "Discounts",  url: "/discounts",  icon: Tag,      roles: ["owner", "admin"] },
      { title: "Company",    url: "/company",    icon: Settings, roles: ["owner", "admin"] },
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
  const [reportsOpen, setReportsOpen] = useState(location.startsWith("/reports"));

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

  const isReportActive = location.startsWith("/reports");
  const isAdminRole = userInfo && ["owner", "admin", "office"].includes(userInfo.role);

  const navItemStyle = (active: boolean): React.CSSProperties => ({
    height: '34px',
    padding: '0 12px',
    margin: '1px 8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    backgroundColor: active ? 'var(--brand-soft)' : 'transparent',
    color: active ? 'var(--brand)' : '#6B7280',
    fontWeight: active ? 500 : 400,
    fontSize: '13px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    textDecoration: 'none',
  });

  const sidebarContent = (
    <div style={{
      width: mobile ? 264 : 220,
      minWidth: mobile ? 264 : 220,
      backgroundColor: '#FFFFFF',
      borderRight: '1px solid #EEECE7',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Top — Logo */}
      <div style={{ padding: '18px 16px 12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {logoUrl ? (
            <div>
              <div style={{ backgroundColor: '#F7F6F3', borderRadius: '6px', padding: '4px 8px', display: 'inline-block', marginBottom: '6px', border: '1px solid #EEECE7' }}>
                <img src={logoUrl} alt={companyName} style={{ height: '26px', width: 'auto', objectFit: 'contain', objectPosition: 'left', display: 'block' }} />
              </div>
              <p style={{ fontSize: '11px', fontWeight: 500, color: '#9E9B94', letterSpacing: '0.06em', margin: 0 }}>CleanOps Pro</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#1A1917', margin: '0 0 4px 0' }}>{companyName}</p>
              <p style={{ fontSize: '11px', fontWeight: 500, color: '#9E9B94', letterSpacing: '0.06em', margin: 0 }}>CleanOps Pro</p>
            </div>
          )}
        </div>
        {mobile && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4, display: 'flex', alignItems: 'center' }}>
            <X size={18} />
          </button>
        )}
      </div>

      <div style={{ borderTop: '1px solid #EEECE7', margin: '0 0 4px 0' }} />

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: '8px' }}>
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <p style={{ fontSize: '10px', fontWeight: 600, color: '#9E9B94', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '16px 16px 6px', margin: 0 }}>
              {section.label}
            </p>
            {section.items.filter(item => !item.roles || (userInfo && item.roles.includes(userInfo.role))).map(item => {
              const isActive = location === item.url || (item.url !== '/dashboard' && location.startsWith(item.url));
              const Icon = item.icon;
              return (
                <Link key={item.url} href={item.url}>
                  <div
                    style={navItemStyle(isActive)}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = '#F0EEE9'; e.currentTarget.style.color = '#1A1917'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6B7280'; } }}
                  >
                    <Icon size={15} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}

        {/* Reports section — collapsible, admin/office only */}
        {isAdminRole && (
          <div>
            <p style={{ fontSize: '10px', fontWeight: 600, color: '#9E9B94', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '16px 16px 6px', margin: 0 }}>Reports</p>
            <button
              onClick={() => setReportsOpen(p => !p)}
              style={{
                ...navItemStyle(isReportActive),
                width: 'calc(100% - 16px)',
                background: isReportActive ? 'var(--brand-soft)' : 'transparent',
                border: 'none',
                justifyContent: 'space-between',
              }}
              onMouseEnter={e => { if (!isReportActive) { e.currentTarget.style.backgroundColor = '#F0EEE9'; e.currentTarget.style.color = '#1A1917'; } }}
              onMouseLeave={e => { if (!isReportActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6B7280'; } }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <BarChart2 size={15} style={{ flexShrink: 0 }} />
                <span>All Reports</span>
              </span>
              {reportsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>

            {reportsOpen && REPORT_ITEMS.map(item => {
              const isActive = location === item.url;
              const Icon = item.icon;
              return (
                <Link key={item.url} href={item.url}>
                  <div
                    style={{
                      ...navItemStyle(isActive),
                      paddingLeft: '28px',
                      height: '30px',
                      fontSize: '12px',
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = '#F0EEE9'; e.currentTarget.style.color = '#1A1917'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6B7280'; } }}
                  >
                    <Icon size={13} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div style={{ borderTop: '1px solid #EEECE7' }} />
      {/* User footer */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'var(--brand-soft)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#1A1917', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userInfo?.firstName} {userInfo?.lastName}
          </p>
          <p style={{ margin: 0, fontSize: '10px', color: '#9E9B94', textTransform: 'capitalize' }}>{userInfo?.role}</p>
        </div>
        <button
          onClick={() => logout()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E9B94', padding: 4, display: 'flex', alignItems: 'center' }}
          title="Sign out"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <>
        {open && (
          <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 40 }}
            onClick={onClose}
          />
        )}
        <div style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
        }}>
          {sidebarContent}
        </div>
      </>
    );
  }

  return sidebarContent;
}
