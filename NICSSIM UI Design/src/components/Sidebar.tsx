import { Activity, LayoutDashboard, User, Atom, Radio, BarChart3, Database } from "lucide-react";
import { cn } from "./ui/utils";

interface SidebarProps {
  currentView: "dashboard" | "wizard" | "simulator" | "deployment-detail" | "file-change-detail" | "deployments" | "monitoring" | "analytics";
  onNavigate: (view: "dashboard" | "wizard" | "simulator" | "deployments" | "monitoring" | "analytics") => void;
  currentUser: string | null;
}

export function Sidebar({ currentView, onNavigate, currentUser }: SidebarProps) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "simulator", label: "Visual Simulation", icon: Atom },
    { id: "deployments", label: "Active Deployments", icon: Database },
    { id: "monitoring", label: "Live Monitoring", icon: Radio },
    { id: "analytics", label: "Analytics & Reports", icon: BarChart3 },
  ];

  return (
    <aside className="w-60 min-w-[240px] flex-shrink-0 bg-card border-r border-border flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <Activity className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <div className="text-foreground tracking-tight" style={{ fontSize: '1.125rem', fontWeight: 600 }}>NICSSIM</div>
            <div className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>v1.0.0</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === currentView;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "dashboard") {
                  onNavigate("dashboard");
                } else if (item.id === "simulator") {
                  onNavigate("simulator");
                } else if (item.id === "deployments") {
                  onNavigate("deployments");
                } else if (item.id === "monitoring") {
                  onNavigate("monitoring");
                } else if (item.id === "analytics") {
                  onNavigate("analytics");
                }
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        {currentUser && (
          <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg">
            <User className="w-4 h-4 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Operator</div>
              <div className="text-sm text-foreground">{currentUser}</div>
            </div>
          </div>
        )}
        <div className="text-muted-foreground text-center" style={{ fontSize: '0.75rem' }}>
          © 2025 UTEP NICSSIM
        </div>
      </div>
    </aside>
  );
}