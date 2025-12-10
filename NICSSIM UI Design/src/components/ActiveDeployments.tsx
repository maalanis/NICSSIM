import { Play, Pause, Square, Activity, Zap, Gauge, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { DeployedSimulation } from "../types/simulation";
import { useState } from "react";
import { MOCK_DEPLOYMENTS, DeploymentData, getDeploymentStats } from "../data/mockDeployments";

interface ActiveDeploymentsProps {
  deployedSimulations: DeployedSimulation[];
  onViewDeployment: (id: string) => void;
}

export function ActiveDeployments({ deployedSimulations, onViewDeployment }: ActiveDeploymentsProps) {
  // State to manage deployment statuses
  const [deployments, setDeployments] = useState<DeploymentData[]>(MOCK_DEPLOYMENTS);

  // Handle status changes
  const handlePlayPause = (id: string) => {
    setDeployments(prevDeployments =>
      prevDeployments.map(dep =>
        dep.id === id
          ? { 
              ...dep, 
              status: dep.status === "running" ? "paused" : "running",
              reactorPower: dep.status === "running" ? 0 : dep.reactorPower || 85
            }
          : dep
      )
    );
  };

  const handleStop = (id: string) => {
    setDeployments(prevDeployments =>
      prevDeployments.map(dep =>
        dep.id === id
          ? { ...dep, status: "stopped", reactorPower: 0 }
          : dep
      )
    );
  };

  // Calculate summary stats from current deployments
  const runningCount = deployments.filter(d => d.status === "running").length;
  const pausedCount = deployments.filter(d => d.status === "paused").length;
  const errorCount = deployments.filter(d => d.status === "error").length;
  const totalReactors = deployments.reduce((sum, d) => sum + d.fleetSize, 0);

  const getStatusColor = (status: DeploymentData["status"]) => {
    switch (status) {
      case "running": return "text-blue-500";
      case "paused": return "text-yellow-500";
      case "stopped": return "text-gray-500";
      case "error": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  const getStatusIcon = (status: DeploymentData["status"]) => {
    switch (status) {
      case "running": return <CheckCircle className="w-5 h-5" />;
      case "paused": return <Clock className="w-5 h-5" />;
      case "stopped": return <Square className="w-5 h-5" />;
      case "error": return <AlertCircle className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getStatusBg = (status: DeploymentData["status"]) => {
    switch (status) {
      case "running": return "bg-blue-500/10 border-blue-500/20";
      case "paused": return "bg-yellow-500/10 border-yellow-500/20";
      case "stopped": return "bg-gray-500/10 border-gray-500/20";
      case "error": return "bg-red-500/10 border-red-500/20";
      default: return "bg-gray-500/10 border-gray-500/20";
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-foreground mb-2">Active Deployments</h1>
          <p className="text-muted-foreground">Monitor and manage running reactor simulations</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="text-3xl text-foreground mb-1">{runningCount}</div>
            <div className="text-sm text-muted-foreground">Running</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
            <div className="text-3xl text-foreground mb-1">{pausedCount}</div>
            <div className="text-sm text-muted-foreground">Paused</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <div className="text-3xl text-foreground mb-1">{errorCount}</div>
            <div className="text-sm text-muted-foreground">Errors</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="text-3xl text-foreground mb-1">{totalReactors}</div>
            <div className="text-sm text-muted-foreground">Total Reactors</div>
          </div>
        </div>

        {/* Deployments Table */}
        <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left p-4 text-sm text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm text-muted-foreground">Deployment Name</th>
                  <th className="text-left p-4 text-sm text-muted-foreground">Fleet</th>
                  <th className="text-left p-4 text-sm text-muted-foreground">PLCs</th>
                  <th className="text-left p-4 text-sm text-muted-foreground">Sensors</th>
                  <th className="text-left p-4 text-sm text-muted-foreground">Uptime</th>
                  <th className="text-left p-4 text-sm text-muted-foreground">Power</th>
                  <th className="text-left p-4 text-sm text-muted-foreground">Temp (°C)</th>
                  <th className="text-left p-4 text-sm text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((dep) => (
                  <tr key={dep.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="p-4">
                      <div className={`flex items-center gap-2 ${getStatusColor(dep.status)}`}>
                        {getStatusIcon(dep.status)}
                        <span className="text-sm capitalize">{dep.status}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-foreground">{dep.name}</div>
                      <div className="text-xs text-muted-foreground">{dep.id}</div>
                    </td>
                    <td className="p-4 text-foreground">{dep.fleetSize} reactors</td>
                    <td className="p-4 text-foreground">{dep.plcCount}</td>
                    <td className="p-4 text-foreground">{dep.sensorCount}</td>
                    <td className="p-4 text-foreground">{dep.uptime}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-primary transition-all"
                            style={{ width: `${dep.reactorPower}%` }}
                          />
                        </div>
                        <span className="text-sm text-foreground">{dep.reactorPower}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={dep.temperature > 350 ? "text-red-500" : "text-foreground"}>
                        {dep.temperature}°C
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {dep.status === "running" ? (
                          <button className="p-2 hover:bg-yellow-500/10 rounded-lg transition-colors" title="Pause" onClick={() => handlePlayPause(dep.id)}>
                            <Pause className="w-4 h-4 text-yellow-500" />
                          </button>
                        ) : (
                          <button className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors" title="Start" onClick={() => handlePlayPause(dep.id)}>
                            <Play className="w-4 h-4 text-blue-500" />
                          </button>
                        )}
                        <button className="p-2 hover:bg-red-500/10 rounded-lg transition-colors" title="Stop" onClick={() => handleStop(dep.id)}>
                          <Square className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}