import { Activity, AlertTriangle, Database, Play } from "lucide-react";
import { Button } from "./ui/button";
import { SummaryCard } from "./SummaryCard";
import { DeploymentsTable } from "./DeploymentsTable";
import { DeployedSimulation } from "../types/simulation";

interface DashboardProps {
  onNewSimulation: () => void;
  deployedSimulations: DeployedSimulation[];
}

export function Dashboard({ onNewSimulation, deployedSimulations }: DashboardProps) {
  // Calculate summary data from deployed simulations
  const totalSimulations = deployedSimulations.length;
  const runningCount = deployedSimulations.filter(s => s.status === "running").length;
  const buildingCount = deployedSimulations.filter(s => s.status === "building").length;
  const failedCount = deployedSimulations.filter(s => s.status === "failed").length;

  const summaryData = [
    { title: "Total Simulations", value: totalSimulations, icon: Database, color: "primary" },
    { title: "Running", value: runningCount, icon: Play, color: "success" },
    { title: "Building", value: buildingCount, icon: Activity, color: "warning" },
    { title: "Failed", value: failedCount, icon: AlertTriangle, color: "danger" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Configure and deploy nuclear micro-reactor simulations.
          </p>
        </div>
        <Button 
          onClick={onNewSimulation}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-200 glow-orange-sm"
        >
          <Activity className="w-4 h-4 mr-2" />
          New Simulation
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryData.map((card) => (
          <SummaryCard key={card.title} {...card} />
        ))}
      </div>

      {/* Deployments Table */}
      <div>
        <h2 className="mb-4 text-foreground">Recent Deployments</h2>
        <DeploymentsTable deployments={deployedSimulations} />
      </div>
    </div>
  );
}