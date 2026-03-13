import { ReactNode, useEffect } from "react";
import { AppSidebar } from "./app-sidebar";
import { useAuthStore } from "@/lib/auth";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { useTenantBrand } from "@/lib/tenant-brand";
import { Menu } from "lucide-react";
import { useState } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const token = useAuthStore(state => state.token);
  const setToken = useAuthStore(state => state.setToken);
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    if (!token) {
      setLocation("/login");
    }
  }, [token, setLocation]);

  const { data: user, isLoading, isError, error } = useGetMe({
    request: { headers: getAuthHeaders() },
    query: { enabled: !!token, retry: false }
  });

  // Load tenant brand (injects CSS vars)
  useTenantBrand();

  useEffect(() => {
    if (isError) {
      const status = (error as any)?.status;
      if (status === 401 || status === 403) {
        setToken(null);
        setLocation("/login");
      }
    }
  }, [isError, error, setToken, setLocation]);

  if (!token) return null;

  if (isLoading) {
    return (
      <div style={{ height: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D0D0D' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #252525', borderTopColor: 'var(--tenant-color)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#0D0D0D', overflow: 'hidden' }}>
      {/* Sidebar */}
      {sidebarOpen && <AppSidebar />}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: '56px',
          backgroundColor: '#111111',
          borderBottom: '1px solid #252525',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setSidebarOpen(v => !v)}
            style={{ color: '#888780', padding: '4px', borderRadius: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
            className="hover:text-[#E8E0D0] transition-colors"
          >
            <Menu size={18} strokeWidth={1.5} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user && (
              <>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '13px', fontFamily: "'DM Mono', monospace", fontWeight: 400, color: '#E8E0D0', lineHeight: 1.3 }}>{user.first_name} {user.last_name}</p>
                  <p style={{ fontSize: '10px', fontFamily: "'DM Mono', monospace", color: 'var(--tenant-color)', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.3 }}>{user.role.replace('_', ' ')}</p>
                </div>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(var(--tenant-color-rgb), 0.20)',
                  color: 'var(--tenant-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'DM Mono', monospace",
                  fontWeight: 400,
                  fontSize: '12px',
                  border: '1px solid #252525',
                }}>
                  {user.first_name?.[0]}{user.last_name?.[0]}
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '32px', backgroundColor: '#0D0D0D' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
