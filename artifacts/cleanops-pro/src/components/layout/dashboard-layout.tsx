import { ReactNode, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { useAuthStore } from "@/lib/auth";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const token = useAuthStore(state => state.token);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!token) {
      setLocation("/login");
    }
    // Force dark mode on body per rules
    document.documentElement.classList.add('dark');
  }, [token, setLocation]);

  const { data: user, isLoading } = useGetMe({
    request: { headers: getAuthHeaders() },
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  if (!token) return null;
  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <SidebarProvider style={{ "--sidebar-width": "16rem" } as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 w-full overflow-hidden">
          <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm z-10 shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <h1 className="font-display font-bold text-xl hidden sm:block">PHES Cleaning Operations</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-primary uppercase tracking-wider">{user?.role.replace('_', ' ')}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-white uppercase border border-border hover-elevate">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
