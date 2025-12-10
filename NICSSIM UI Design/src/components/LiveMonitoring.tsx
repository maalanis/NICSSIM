import { Activity, Thermometer, Droplet, Gauge, Zap, Wind, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { useState, useEffect } from "react";
import { DeployedSimulation } from "../types/simulation";
import { MOCK_DEPLOYMENTS, getDeploymentStats } from "../data/mockDeployments";

interface LiveMonitoringProps {
  deployedSimulations: DeployedSimulation[];
  onViewDeployment: (id: string) => void;
}

interface SensorReading {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: "normal" | "warning" | "critical";
  trend: "up" | "down" | "stable";
  lastUpdate: string;
}

export function LiveMonitoring({ deployedSimulations, onViewDeployment }: LiveMonitoringProps) {
  // Get stats from shared deployment data
  const stats = getDeploymentStats(MOCK_DEPLOYMENTS);
  
  const [sensors, setSensors] = useState<SensorReading[]>([
    {
      id: "temp-core-01",
      name: "Core Temperature",
      value: 342,
      unit: "°C",
      status: "normal",
      trend: "stable",
      lastUpdate: new Date().toLocaleTimeString()
    },
    {
      id: "pressure-01",
      name: "Primary Loop Pressure",
      value: 15.2,
      unit: "MPa",
      status: "normal",
      trend: "up",
      lastUpdate: new Date().toLocaleTimeString()
    },
    {
      id: "flow-01",
      name: "Coolant Flow Rate",
      value: 2340,
      unit: "L/min",
      status: "normal",
      trend: "stable",
      lastUpdate: new Date().toLocaleTimeString()
    },
    {
      id: "power-01",
      name: "Reactor Power Output",
      value: 85,
      unit: "%",
      status: "normal",
      trend: "stable",
      lastUpdate: new Date().toLocaleTimeString()
    },
    {
      id: "temp-sec-01",
      name: "Secondary Loop Temp",
      value: 285,
      unit: "°C",
      status: "normal",
      trend: "down",
      lastUpdate: new Date().toLocaleTimeString()
    },
    {
      id: "radiation-01",
      name: "Containment Radiation",
      value: 0.12,
      unit: "mSv/h",
      status: "normal",
      trend: "stable",
      lastUpdate: new Date().toLocaleTimeString()
    },
    {
      id: "rod-pos-01",
      name: "Control Rod Position",
      value: 65,
      unit: "%",
      status: "normal",
      trend: "stable",
      lastUpdate: new Date().toLocaleTimeString()
    },
    {
      id: "turbine-rpm-01",
      name: "Turbine Speed",
      value: 2850,
      unit: "RPM",
      status: "warning",
      trend: "up",
      lastUpdate: new Date().toLocaleTimeString()
    },
    {
      id: "steam-press-01",
      name: "Steam Pressure",
      value: 7.8,
      unit: "MPa",
      status: "normal",
      trend: "stable",
      lastUpdate: new Date().toLocaleTimeString()
    },
  ]);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSensors(prev => prev.map(sensor => {
        const variation = (Math.random() - 0.5) * 0.1;
        const newValue = sensor.value + (sensor.value * variation);
        
        return {
          ...sensor,
          value: Math.max(0, parseFloat(newValue.toFixed(2))),
          lastUpdate: new Date().toLocaleTimeString()
        };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: SensorReading["status"]) => {
    switch (status) {
      case "normal": return "text-green-500";
      case "warning": return "text-yellow-500";
      case "critical": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  const getStatusBg = (status: SensorReading["status"]) => {
    switch (status) {
      case "normal": return "bg-green-500/10 border-green-500/20";
      case "warning": return "bg-yellow-500/10 border-yellow-500/20";
      case "critical": return "bg-red-500/10 border-red-500/20";
      default: return "bg-gray-500/10 border-gray-500/20";
    }
  };

  const getSensorIcon = (id: string) => {
    if (id.includes("temp")) return <Thermometer className="w-5 h-5" />;
    if (id.includes("pressure") || id.includes("press")) return <Gauge className="w-5 h-5" />;
    if (id.includes("flow")) return <Droplet className="w-5 h-5" />;
    if (id.includes("power")) return <Zap className="w-5 h-5" />;
    if (id.includes("turbine") || id.includes("rpm")) return <Wind className="w-5 h-5" />;
    return <Activity className="w-5 h-5" />;
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-foreground mb-2">Live Monitoring</h1>
              <p className="text-muted-foreground">Real-time sensor data and telemetry</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-500">Live</span>
            </div>
          </div>
        </div>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="text-3xl text-foreground mb-1">{stats.totalDeployments}</div>
            <div className="text-sm text-muted-foreground">Deployments Active</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
            <div className="text-3xl text-foreground mb-1">1</div>
            <div className="text-sm text-muted-foreground">Warnings</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="text-3xl text-foreground mb-1">{stats.avgPower}%</div>
            <div className="text-sm text-muted-foreground">Avg Power Output</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Thermometer className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="text-3xl text-foreground mb-1">{stats.avgTemperature}°C</div>
            <div className="text-sm text-muted-foreground">Avg Core Temp</div>
          </div>
        </div>

        {/* Sensor Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sensors.map((sensor) => (
            <div 
              key={sensor.id} 
              className={`bg-card border rounded-xl p-6 shadow-lg transition-all ${getStatusBg(sensor.status)}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg ${getStatusBg(sensor.status)} flex items-center justify-center ${getStatusColor(sensor.status)}`}>
                  {getSensorIcon(sensor.id)}
                </div>
                <div className="flex items-center gap-1">
                  {sensor.trend === "up" && <TrendingUp className="w-4 h-4 text-green-500" />}
                  {sensor.trend === "down" && <TrendingDown className="w-4 h-4 text-blue-500" />}
                  {sensor.trend === "stable" && <div className="w-4 h-0.5 bg-gray-500 rounded" />}
                </div>
              </div>

              <div className="text-sm text-muted-foreground mb-2">{sensor.name}</div>
              
              <div className="flex items-baseline gap-2 mb-3">
                <div className="text-3xl text-foreground">{sensor.value}</div>
                <div className="text-sm text-muted-foreground">{sensor.unit}</div>
              </div>

              <div className="flex items-center justify-between">
                <div className={`text-xs px-2 py-1 rounded ${getStatusBg(sensor.status)} ${getStatusColor(sensor.status)}`}>
                  {sensor.status.toUpperCase()}
                </div>
                <div className="text-xs text-muted-foreground">{sensor.lastUpdate}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Alerts */}
        <div className="mt-8 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-foreground">Recent Alerts</h2>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-foreground">Turbine Speed Elevated</div>
                <div className="text-xs text-muted-foreground">Turbine RPM at 2850, approaching maximum threshold</div>
                <div className="text-xs text-muted-foreground mt-1">12:45:23 PM</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-green-500 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-foreground">System Check Completed</div>
                <div className="text-xs text-muted-foreground">All systems operating within normal parameters</div>
                <div className="text-xs text-muted-foreground mt-1">12:30:00 PM</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}