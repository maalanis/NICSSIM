import { TrendingUp, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Legend } from "recharts";

interface VarianceAnalysisProps {
  varianceComparison: {
    baseline: { temperature: number; flow: number; pressure: number };
    current: { temperature: number; flow: number; pressure: number };
  };
  state: 'normal' | 'attack' | 'learning';
}

export function VarianceAnalysis({ varianceComparison, state }: VarianceAnalysisProps) {
  const { baseline, current } = varianceComparison;
  
  // Calculate multipliers
  const tempMultiplier = (current.temperature / baseline.temperature).toFixed(1);
  const flowMultiplier = (current.flow / baseline.flow).toFixed(1);
  const pressureMultiplier = (current.pressure / baseline.pressure).toFixed(1);
  
  const chartData = [
    {
      name: 'Temperature',
      baseline: baseline.temperature,
      current: current.temperature,
      multiplier: tempMultiplier
    },
    {
      name: 'Coolant Flow',
      baseline: baseline.flow,
      current: current.flow,
      multiplier: flowMultiplier
    },
    {
      name: 'Pressure',
      baseline: baseline.pressure,
      current: current.pressure,
      multiplier: pressureMultiplier
    }
  ];

  const getBarColor = (value: number, baseline: number) => {
    const ratio = value / baseline;
    if (ratio > 2.5) return '#ef4444'; // red
    if (ratio > 1.5) return '#f59e0b'; // yellow
    return '#10b981'; // green
  };

  const maxMultiplier = Math.max(
    parseFloat(tempMultiplier),
    parseFloat(flowMultiplier),
    parseFloat(pressureMultiplier)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">Variance Analysis</h3>
        <TrendingUp className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Key Finding Callout */}
      {state === 'attack' && maxMultiplier > 2 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-500 mb-1">Anomaly Detected</h4>
              <p className="text-xs text-muted-foreground">
                Flow variance increased by <span className="font-semibold text-red-400">{flowMultiplier}x</span> over baseline
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-secondary/20 border border-border rounded-lg p-6">
        <div className="mb-4">
          <h4 className="text-sm font-medium text-foreground mb-1">Baseline vs Current Variance</h4>
          <p className="text-xs text-muted-foreground">
            Real-time comparison of system variability
          </p>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#9AA6B2', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(154, 166, 178, 0.2)' }}
            />
            <YAxis 
              tick={{ fill: '#9AA6B2', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(154, 166, 178, 0.2)' }}
              label={{ value: 'Variance', angle: -90, position: 'insideLeft', fill: '#9AA6B2', fontSize: 12 }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px', color: '#9AA6B2' }}
            />
            <Bar 
              dataKey="baseline" 
              fill="#3B82F6" 
              radius={[8, 8, 0, 0]}
              name="Baseline"
            />
            <Bar 
              dataKey="current" 
              radius={[8, 8, 0, 0]}
              name="Current"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry.current, entry.baseline)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Multiplier Display */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
          {chartData.map((item) => (
            <div key={item.name} className="text-center">
              <div className="text-xs text-muted-foreground mb-1">{item.name}</div>
              <div className={`text-lg font-semibold ${
                parseFloat(item.multiplier) > 2.5 ? 'text-red-500' :
                parseFloat(item.multiplier) > 1.5 ? 'text-yellow-500' :
                'text-green-500'
              }`}>
                {item.multiplier}x
              </div>
            </div>
          ))}
        </div>
      </div>


    </div>
  );
}
