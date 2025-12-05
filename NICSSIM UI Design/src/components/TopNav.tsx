import { Activity, LayoutDashboard, User, Atom, Radio, BarChart3, Database, LogOut, Sun, Moon } from "lucide-react";
import { cn } from "./ui/utils";

interface TopNavProps {
  currentView: "dashboard" | "wizard" | "simulator" | "deployment-detail" | "file-change-detail" | "deployments" | "monitoring" | "analytics";
  onNavigate: (view: "dashboard" | "wizard" | "simulator" | "deployments" | "monitoring" | "analytics") => void;
  currentUser: string | null;
  onLogout: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function TopNav({ currentView, onNavigate, currentUser, onLogout, theme, onToggleTheme }: TopNavProps) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "simulator", label: "Visual Simulation", icon: Atom },
    { id: "deployments", label: "Active Deployments", icon: Database },
    { id: "monitoring", label: "Live Monitoring", icon: Radio },
    { id: "analytics", label: "Analytics & Reports", icon: BarChart3 },
  ];

  return (
    <nav className="bg-card border-b border-border shadow-lg">
      <div className="px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <Atom className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <div className="text-xl text-foreground tracking-wide">NICSSIM</div>
              <div className="text-xs text-primary">Nuclear Reactor Simulation</div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id || 
                (currentView === "deployment-detail" && item.id === "dashboard") ||
                (currentView === "file-change-detail" && item.id === "dashboard");
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* User Badge and Theme Toggle */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {currentUser && (
              <div className="flex items-center gap-3 px-4 py-2 bg-secondary rounded-lg border border-border">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Operator</div>
                  <div className="text-sm text-foreground">{currentUser}</div>
                </div>
                <button
                  onClick={onLogout}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}