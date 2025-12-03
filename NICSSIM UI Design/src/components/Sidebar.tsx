import { Activity, Database, FileText, LayoutDashboard, Settings } from "lucide-react";
import { cn } from "./ui/utils";
import { Shield } from "lucide-react";
interface SidebarProps {
  currentView: "dashboard" | "wizard";
  onNavigate: (view: "dashboard" | "wizard") => void;
}

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "defender", label: "Defender AI", icon: Shield },
    { id: "deployments", label: "Deployments", icon: Database },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-60 bg-card border-r border-border flex flex-col h-screen fixed left-0 top-0">
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
                } else if (item.id === "defender") {
                  onNavigate("defender"); // ← Add this
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
      <div className="p-4 border-t border-border">
        <div className="text-muted-foreground text-center" style={{ fontSize: '0.75rem' }}>
          © 2025 UTEP NICSSIM
        </div>
      </div>
    </aside>
  );
}
