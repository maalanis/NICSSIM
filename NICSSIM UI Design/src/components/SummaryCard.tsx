import { LucideIcon } from "lucide-react";
import { Card } from "./ui/card";

interface SummaryCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: string;
  color?: string;
}

export function SummaryCard({ title, value, icon: Icon, trend, color = "primary" }: SummaryCardProps) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-blue-500/10 text-blue-500",
    warning: "bg-yellow-500/10 text-yellow-500",
    danger: "bg-red-500/10 text-red-500",
  };

  return (
    <Card className="p-6 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>{title}</p>
          <div className="mt-2 text-foreground" style={{ fontSize: '2rem', fontWeight: 600 }}>{value}</div>
          {trend && (
            <p className="text-muted-foreground mt-1" style={{ fontSize: '0.75rem' }}>{trend}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}