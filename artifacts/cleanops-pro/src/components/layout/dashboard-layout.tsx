import { ReactNode, useEffect, useState, useCallback } from "react";
import { AppSidebar } from "./app-sidebar";
import { useAuthStore } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { useTenantBrand } from "@/lib/tenant-brand";
import { useIsMobile } from "@/hooks/use-mobile";
import { GlobalSearch } from "@/components/global-search";
import { ChatPanel } from "@/components/chat-panel";
import { KeyboardShortcutsOverlay, useKeyboardShortcuts } from "@/components/keyboard-shortcuts";
import {
  Menu, Bell, LayoutDashboard, Briefcase,
  UserCircle, FileText, DollarSign, Search, MessageSquare,
} from "lucide-react";
import { getAuthHeaders as _h } from "@/lib/auth";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  fullBleed?: boolean;
  onNewJob?: () => void;
}

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard':         'Dashboard',
  '/jobs':              'Job Dispatch',
  '/employees':         'Employees',
  '/customers':         'Customers',
  '/invoices':          'Invoices',
  '/payroll':           'Payroll',
  '/cleancyclopedia':   'Cleancyclopedia',
  '/loyalty':           'Loyalty',
  '/discounts':         'Discounts',
  '/company':           'Company Settings',
  '/reports/insights':  'Performance Insights',
};

const BOTTOM_TABS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/jobs',      icon: Briefcase,       label: 'Jobs' },
  { href: '/customers', icon: UserCircle,      label: 'Clients' },
  { href: '/invoices',  icon: FileText,        label: 'Invoices' },
  { href: '/payroll',   icon: DollarSign,      label: 'Payroll' },
];

function useUnreadCount(userId: number | undefined) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!userId) return;
    const fetch_ = async () => {
      try {
        const r = await fetch(`${API}/api/messages/unread`, { headers: getAuthHeaders() });
        const d = await r.json();
        setCount(d.unread || 0);
      } catch {}
    };
    fetch_();
    const iv = setInterval(fetch_, 15000);
    return () => clearInterval(iv);
  }, [userId]);
  return count;
}

export function DashboardLayout({ children, title, fullBleed, onNewJob }: DashboardLayoutProps) {
  const token = useAuthStore(state => state.token);
  const setToken = useAuthStore(state => state.setToken);
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    if (!token) setLocation("/login");
  }, [token, setLocation]);

  const { data: user, isLoading, isError, error } = useGetMe({
    request: { headers: getAuthHeaders() },
    query: { enabled: !!token, retry: false },
  });

  useTenantBrand();
  const unreadCount = useUnreadCount(user?.id);

  useEffect(() => {
    if (isError) {
      const status = (error as any)?.status;
      if (status === 401 || status === 403) {
        setToken(null);
        setLocation("/login");
      }
    }
  }, [isError, error, setToken, setLocation]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location]);

  // Keyboard shortcut: "?" opens overlay
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '?') { setShortcutsOpen(p => !p); }
      if (e.key === 'Escape') { setSearchOpen(false); setChatOpen(false); setShortcutsOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useKeyboardShortcuts({
    onOpenSearch: useCallback(() => setSearchOpen(true), []),
    onNewJob,
  });

  if (!token) return null;

  if (isLoading) {
    return (
      <div style={{ height: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6F3' }}>
        <div style={{ width: '28px', height: '28px', border: '2px solid #E5E2DC', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const pageTitle = title || ROUTE_TITLES[location] || 'CleanOps Pro';
  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : '';

  if (isMobile) {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: '#F7F6F3', minHeight: '100dvh', color: '#1A1917', position: 'relative' }}>
        <AppSidebar mobile open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} userId={user?.id || 0} />}
        {shortcutsOpen && <KeyboardShortcutsOverlay onClose={() => setShortcutsOpen(false)} />}

        <header style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#FFFFFF', borderBottom: '1px solid #E5E2DC', padding: '0 16px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px', display: 'flex', alignItems: 'center' }}>
            <Menu size={22} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: 'var(--brand)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1917' }}>CleanOps Pro</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <button onClick={() => setSearchOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px' }}>
              <Search size={18} />
            </button>
            <button onClick={() => setChatOpen(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px', position: 'relative' }}>
              <MessageSquare size={18} />
              {unreadCount > 0 && <span style={{ position:'absolute', top:2, right:2, width:8, height:8, borderRadius:4, background:'#EF4444', border:'1px solid #fff' }}/>}
            </button>
          </div>
        </header>

        <main style={{ padding: '16px 14px 88px' }}>{children}</main>

        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, backgroundColor: '#FFFFFF', borderTop: '1px solid #E5E2DC', display: 'flex', justifyContent: 'space-around', padding: '8px 0 max(10px, env(safe-area-inset-bottom))' }}>
          {BOTTOM_TABS.map(tab => {
            const isActive = location === tab.href || (tab.href !== '/dashboard' && location.startsWith(tab.href));
            const Icon = tab.icon;
            return (
              <Link key={tab.href} href={tab.href}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 12px', cursor: 'pointer', color: isActive ? 'var(--brand)' : '#9E9B94' }}>
                  <Icon size={21} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{tab.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#F7F6F3', overflow: 'hidden' }}>
      <AppSidebar />

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
      {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} userId={user?.id || 0} />}
      {shortcutsOpen && <KeyboardShortcutsOverlay onClose={() => setShortcutsOpen(false)} />}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <header style={{ height: '56px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #EEECE7', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1917', letterSpacing: '-0.02em', lineHeight: 1, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {pageTitle}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Search trigger */}
            <button onClick={() => setSearchOpen(true)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', background:'#F7F6F3', border:'1px solid #E5E2DC', borderRadius:8, cursor:'pointer', color:'#9E9B94', fontSize:13, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
              <Search size={14}/>
              <span>Search</span>
              <kbd style={{ fontSize:10, border:'1px solid #E5E2DC', borderRadius:3, padding:'1px 5px', color:'#C0BDB8' }}>/</kbd>
            </button>

            {/* Chat */}
            <button onClick={() => setChatOpen(p => !p)} title="Team Chat"
              style={{ background: chatOpen?'var(--brand-dim)':'none', border:'none', cursor:'pointer', color: chatOpen?'var(--brand)':'#6B7280', padding:6, borderRadius:8, display:'flex', alignItems:'center', position:'relative' } as any}>
              <MessageSquare size={20}/>
              {unreadCount > 0 && (
                <span style={{ position:'absolute', top:2, right:2, width:9, height:9, borderRadius:5, background:'#EF4444', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#fff', fontWeight:700 }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Keyboard shortcuts */}
            <button onClick={() => setShortcutsOpen(true)} title="Keyboard Shortcuts (?)"
              style={{ background:'none', border:'none', cursor:'pointer', color:'#9E9B94', padding:6, borderRadius:8, fontSize:13, display:'flex', alignItems:'center', fontFamily:'inherit' }}>
              <span style={{ fontSize:12, border:'1px solid #E5E2DC', borderRadius:3, padding:'1px 6px', color:'#9E9B94' }}>?</span>
            </button>

            {user && (
              <>
                <div style={{ width: 1, height: 24, background: '#E5E2DC' }}/>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#1A1917', margin: 0 }}>{user.first_name} {user.last_name}</p>
                <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--brand)', backgroundColor: 'var(--brand-dim)', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.05em' }}>
                  {user.role}
                </span>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--brand-dim)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600 }}>
                  {initials}
                </div>
              </>
            )}
          </div>
        </header>

        {fullBleed ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{children}</div>
        ) : (
          <main style={{ flex: 1, overflowY: 'auto', padding: '28px 28px', backgroundColor: '#F7F6F3' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>{children}</div>
          </main>
        )}
      </div>
    </div>
  );
}
