// Shared mock deployment data for consistency across all tabs

export interface DeploymentData {
  id: string;
  name: string;
  status: "running" | "paused" | "stopped" | "error";
  fleetSize: number;
  plcCount: number;
  sensorCount: number;
  uptime: string;
  reactorPower: number;
  temperature: number;
  startedAt: string;
}

export const MOCK_DEPLOYMENTS: DeploymentData[] = [
  {
    id: "dep-001",
    name: "Security Penetration Test - Red Team",
    status: "running",
    fleetSize: 4,
    plcCount: 12,
    sensorCount: 48,
    uptime: "3h 24m",
    reactorPower: 85,
    temperature: 342,
    startedAt: "2025-12-05 09:15:00"
  },
  {
    id: "dep-002",
    name: "PLC Communication Redundancy Test",
    status: "paused",
    fleetSize: 2,
    plcCount: 6,
    sensorCount: 24,
    uptime: "1h 12m",
    reactorPower: 0,
    temperature: 120,
    startedAt: "2025-12-05 11:30:00"
  },
  {
    id: "dep-003",
    name: "Emergency SCRAM Procedure Drill",
    status: "running",
    fleetSize: 3,
    plcCount: 9,
    sensorCount: 36,
    uptime: "45m",
    reactorPower: 92,
    temperature: 378,
    startedAt: "2025-12-05 12:00:00"
  },
  {
    id: "dep-004",
    name: "Cyber Attack Response Simulation",
    status: "error",
    fleetSize: 1,
    plcCount: 3,
    sensorCount: 12,
    uptime: "12m",
    reactorPower: 45,
    temperature: 215,
    startedAt: "2025-12-05 12:33:00"
  },
];

// Calculate aggregated stats from deployments
export const getDeploymentStats = (deployments: DeploymentData[]) => {
  const runningCount = deployments.filter(d => d.status === "running").length;
  const pausedCount = deployments.filter(d => d.status === "paused").length;
  const errorCount = deployments.filter(d => d.status === "error").length;
  const totalReactors = deployments.reduce((sum, d) => sum + d.fleetSize, 0);
  const totalPLCs = deployments.reduce((sum, d) => sum + d.plcCount, 0);
  const totalSensors = deployments.reduce((sum, d) => sum + d.sensorCount, 0);
  
  // Calculate average power from running deployments only
  const runningDeployments = deployments.filter(d => d.status === "running");
  const avgPower = runningDeployments.length > 0
    ? Math.round(runningDeployments.reduce((sum, d) => sum + d.reactorPower, 0) / runningDeployments.length)
    : 0;
  
  // Calculate average temperature from running deployments
  const avgTemperature = runningDeployments.length > 0
    ? Math.round(runningDeployments.reduce((sum, d) => sum + d.temperature, 0) / runningDeployments.length)
    : 0;

  return {
    runningCount,
    pausedCount,
    errorCount,
    totalReactors,
    totalPLCs,
    totalSensors,
    avgPower,
    avgTemperature,
    totalDeployments: deployments.length,
  };
};
