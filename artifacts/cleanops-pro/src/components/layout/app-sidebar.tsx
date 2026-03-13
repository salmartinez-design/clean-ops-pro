import { Home, Users, UsersRound, Briefcase, FileText, BarChart3, Settings, LogOut, Medal } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/lib/auth";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Jobs", url: "/jobs", icon: Briefcase },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Customers", url: "/customers", icon: UsersRound },
  { title: "Invoices", url: "/invoices", icon: FileText },
  { title: "Payroll", url: "/payroll", icon: BarChart3 },
];

const settingsItems = [
  { title: "Loyalty", url: "/loyalty", icon: Medal },
  { title: "Company", url: "/company", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const logout = useAuthStore(state => state.logout);

  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-4 flex items-center gap-3 border-b border-border mb-4">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <img src={`${import.meta.env.BASE_URL}images/logo-mark.png`} alt="CleanOps Pro" className="w-5 h-5 object-contain invert brightness-0" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white">CleanOps Pro</span>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground uppercase tracking-wider text-xs font-semibold">Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:text-white"}
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        <item.icon className="w-4 h-4" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-muted-foreground uppercase tracking-wider text-xs font-semibold">Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                const isActive = location.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:text-white"}
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        <item.icon className="w-4 h-4" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-4">
        <button 
          onClick={() => logout()} 
          className="flex items-center gap-3 text-muted-foreground hover:text-white transition-colors w-full p-2 rounded-md hover-elevate font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
