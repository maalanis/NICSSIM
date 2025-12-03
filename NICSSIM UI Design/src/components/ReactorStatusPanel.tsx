import { Badge } from "../../components/ui/badge";
import { ReactorMetric } from "./types";
import { Activity, Droplets, Gauge, Sliders } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface ReactorStatusPanelProps {
  metrics: {
    temperature: ReactorMetric;
    coolantFlow: ReactorMetric;
    pressure: ReactorMetric;
    controlRodPosition: ReactorMetric;
  };
}

export function ReactorStatusPanel({ metrics }: ReactorStatusPanelProps) {
  const metricsList = [
    {
      ...metrics.temperature,
      icon: Activity,
      color: "text-chart-1"
    },
    {
      ...metrics.coolantFlow,
      icon: Droplets,
      color: "text-chart-2"
    },
    {
      ...metrics.pressure,
      icon: Gauge,
      color: "text-chart-3"
    },
    {
      ...metrics.controlRodPosition,
      icon: Sliders,
      color: "text-chart-4"
    }
  ];

  const getStatusBorder = (status: string) => {
    switch (status) {
      case 'normal':
        return 'border-green-500/50';
      case 'warning':
        return 'border-yellow-500/50';
      case 'critical':
        return 'border-red-500/50';
      default:
        return 'border-border';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'normal':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">Reactor Status</h3>
        <span className="text-xs text-muted-foreground">Live Metrics</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metricsList.map((metric) => {
          const Icon = metric.icon;
          const chartData = metric.history.map((value, index) => ({ value, index }));
          
          return (
            <div 
              key={metric.name}
              className={`bg-secondary/20 border-2 ${getStatusBorder(metric.status)} rounded-lg p-4 transition-all duration-200`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${metric.color}`} />
                    <span className="text-sm text-muted-foreground">{metric.name}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-foreground">
                      {metric.value.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">{metric.unit}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      Variance: ±{metric.variance.toFixed(1)}
                    </span>
                    <Badge className={getStatusBadge(metric.status)}>
                      {metric.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={
                        metric.status === 'critical' ? '#ef4444' : 
                        metric.status === 'warning' ? '#f59e0b' : 
                        '#10b981'
                      }
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
