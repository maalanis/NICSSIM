import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { DeployedSimulation, SENSOR_SECTIONS, AgentResults } from "../types/simulation";
import {
  ArrowLeft,
  Shield,
  Swords,
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";

interface FileVulnSummary {
  file_path: string;
  file_risk_percent: number;
  issue_count: number;
  worst_severity: string; // "critical" | "high" | "medium" | "low" | "info" | etc.
}

interface DeploymentDetailProps {
  deployment: DeployedSimulation;
  onBack: () => void;
  onViewFileChange: (
    fileChange: { file: string; status: string; description: string },
    agentType: "red" | "blue",
    currentResults: AgentResults
  ) => void;
  onSaveAgentRun: (deploymentId: string, agentType: "red" | "blue", results: AgentResults) => void;
  returnToTab?: string;
  returnToAgent?: { agentType: "red" | "blue"; results: AgentResults };
}

const severityRank: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

const getFileChangeBadgeColor = (status: string) => {
  switch (status) {
    case "vulnerable":
    case "exposed":
    case "critical":
    case "high":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "warning":
    case "medium":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "patched":
    case "hardened":
    case "secured":
    case "validated":
    case "low":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    default:
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  }
};

// ---------- Helpers to build AgentResults from /api/vulns/files ----------

function buildRedAgentResultsFromVulns(files: FileVulnSummary[]): AgentResults {
  const vulnerableFiles = files.filter((f) => (f.issue_count ?? 0) > 0);

  const totalIssues = vulnerableFiles.reduce((sum, f) => sum + (f.issue_count || 0), 0);
  const criticalFiles = vulnerableFiles.filter((f) => f.worst_severity === "critical").length;
  const highFiles = vulnerableFiles.filter((f) => f.worst_severity === "high").length;
  const avgRisk = vulnerableFiles.length
    ? Math.round(
        vulnerableFiles.reduce((sum, f) => sum + (f.file_risk_percent || 0), 0) /
          vulnerableFiles.length
      )
    : 0;

  const metrics: AgentResults["metrics"] = [
    {
      label: "Vulnerabilities Found",
      value: totalIssues,
      status: totalIssues > 0 ? "critical" : "success",
    },
    {
      label: "Files with Issues",
      value: vulnerableFiles.length,
      status: vulnerableFiles.length > 0 ? "warning" : "success",
    },
    {
      label: "Critical / High Files",
      value: `${criticalFiles} critical, ${highFiles} high`,
      status: criticalFiles > 0 ? "critical" : highFiles > 0 ? "warning" : "success",
    },
    {
      label: "Average Risk",
      value: `${avgRisk}/100`,
      status: avgRisk > 70 ? "critical" : avgRisk > 40 ? "warning" : "success",
    },
  ];

  const sortedFiles = [...vulnerableFiles].sort((a, b) => {
    const sa = severityRank[a.worst_severity] ?? 0;
    const sb = severityRank[b.worst_severity] ?? 0;
    if (sa !== sb) return sb - sa;
    return (b.file_risk_percent ?? 0) - (a.file_risk_percent ?? 0);
  });

  const fileChanges: AgentResults["fileChanges"] = sortedFiles.slice(0, 50).map((file) => ({
    file: file.file_path,
    status: "vulnerable",
    description: `${file.issue_count} issue(s), worst severity ${file.worst_severity || "unknown"}, risk score ${Math.round(
      file.file_risk_percent ?? 0
    )}%`,
  }));

  return {
    name: "Agent Red",
    description:
      "Adversarial AI agent using the latest vulnerability scan results from the NICSSIM codebase.",
    metrics,
    fileChanges,
  };
}

function buildBlueAgentResultsFromVulns(files: FileVulnSummary[]): AgentResults {
  const vulnerableFiles = files.filter((f) => (f.issue_count ?? 0) > 0);
  const totalIssues = vulnerableFiles.reduce((sum, f) => sum + (f.issue_count || 0), 0);
  const avgRisk = vulnerableFiles.length
    ? Math.round(
        vulnerableFiles.reduce((sum, f) => sum + (f.file_risk_percent || 0), 0) /
          vulnerableFiles.length
      )
    : 0;

  const metrics: AgentResults["metrics"] = [
    {
      label: "Files Requiring Hardening",
      value: vulnerableFiles.length,
      status: vulnerableFiles.length > 0 ? "success" : "info",
    },
    {
      label: "Issues to Address",
      value: totalIssues,
      status: totalIssues > 0 ? "warning" : "success",
    },
    {
      label: "Overall Hardening Priority",
      value: avgRisk > 70 ? "High" : avgRisk > 40 ? "Medium" : "Low",
      status: avgRisk > 70 ? "critical" : avgRisk > 40 ? "warning" : "success",
    },
    {
      label: "Average Risk (Pre-Patch)",
      value: `${avgRisk}/100`,
      status: avgRisk > 70 ? "critical" : avgRisk > 40 ? "warning" : "success",
    },
  ];

  const fileChanges: AgentResults["fileChanges"] = vulnerableFiles.slice(0, 50).map((file) => {
    const risk = file.file_risk_percent ?? 0;
    let status: string = "hardened";
    if (risk > 70) status = "patched";
    else if (risk > 40) status = "hardened";
    else status = "secured";

    return {
      file: file.file_path,
      status,
      description: `Planned remediation for ${file.issue_count} issue(s) (${file.worst_severity}, risk ${Math.round(
        risk
      )}%).`,
    };
  });

  return {
    name: "Agent Blue",
    description:
      "Defensive AI agent proposing hardening actions based on the vulnerability scan results.",
    metrics,
    fileChanges,
  };
}

// ---------- Fallback: your original hard-coded AgentResults ----------

const getMockAgentResults = (agent: "red" | "blue"): AgentResults => {
  if (agent === "red") {
    return {
      name: "Agent Red",
      description:
        "Adversarial AI agent conducting penetration testing and vulnerability assessment (mock data fallback)",
      metrics: [
        { label: "Vulnerabilities Found", value: 12, status: "critical" },
        { label: "Attack Vectors Tested", value: 45, status: "info" },
        { label: "Successful Exploits", value: 3, status: "warning" },
        { label: "Security Score", value: "6.5/10", status: "warning" },
      ],
      fileChanges: [
        {
          file: "/src/controllers/reactor_controller.py",
          status: "vulnerable",
          description: "SQL injection vulnerability in reactor query endpoint",
        },
        {
          file: "/src/auth/authentication.py",
          status: "vulnerable",
          description: "Weak password hashing algorithm detected",
        },
        {
          file: "/config/network_config.yaml",
          status: "exposed",
          description: "Sensitive credentials found in configuration file",
        },
        {
          file: "/src/api/sensor_api.py",
          status: "vulnerable",
          description: "Missing input validation on sensor data endpoints",
        },
      ],
    };
  } else {
    return {
      name: "Agent Blue",
      description:
        "Defensive AI agent conducting security hardening and protection testing (mock data fallback)",
      metrics: [
        { label: "Security Patches Applied", value: 8, status: "success" },
        { label: "Firewall Rules Added", value: 15, status: "success" },
        { label: "Threats Mitigated", value: 11, status: "success" },
        { label: "Security Score", value: "8.9/10", status: "success" },
      ],
      fileChanges: [
        {
          file: "/src/controllers/reactor_controller.py",
          status: "patched",
          description: "Added parameterized queries to prevent SQL injection",
        },
        {
          file: "/src/auth/authentication.py",
          status: "hardened",
          description: "Upgraded to bcrypt with increased work factor",
        },
        {
          file: "/config/network_config.yaml",
          status: "secured",
          description: "Moved credentials to environment variables",
        },
        {
          file: "/src/api/sensor_api.py",
          status: "validated",
          description: "Implemented input sanitization and rate limiting",
        },
      ],
    };
  }
};

// ---------- Main component ----------

export function DeploymentDetail({
  deployment,
  onBack,
  onViewFileChange,
  onSaveAgentRun,
  returnToTab,
  returnToAgent,
}: DeploymentDetailProps) {
  const [selectedAgent, setSelectedAgent] = useState<"red" | "blue" | null>(null);
  const [agentRunning, setAgentRunning] = useState(false);
  const [currentResults, setCurrentResults] = useState<AgentResults | null>(null);
  const [selectedRedVersion, setSelectedRedVersion] = useState<string>("");
  const [selectedBlueVersion, setSelectedBlueVersion] = useState<string>("");
  const [redHistoryLength, setRedHistoryLength] = useState(0);
  const [blueHistoryLength, setBlueHistoryLength] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("summary");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "building":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "failed":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "stopped":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "Just now";
  };

  const calculateStats = () => {
    const reactorCount = deployment.config.reactors.length;
    const plcCount = deployment.config.reactors.reduce((sum, r) => sum + r.plcCount, 0);

    let sensorCount = 0;
    deployment.config.reactors.forEach((reactor) => {
      Object.values(reactor.sections).forEach((section) => {
        Object.values(section).forEach((sensor) => {
          sensorCount += sensor.count;
        });
      });
    });

    return { reactorCount, plcCount, sensorCount };
  };

  const stats = calculateStats();

  // Auto-select the latest version when NEW agent runs are added (history length increases)
  useEffect(() => {
    if (deployment.agentHistory) {
      // Handle Red agent history
      const redRuns = deployment.agentHistory.filter((r) => r.agentType === "red");
      const currentRedLength = redRuns.length;

      // If history grew (new run added) OR no selection yet, update to latest
      if (currentRedLength > redHistoryLength) {
        // History grew - new run was added
        const latestRed = redRuns.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0];
        setSelectedRedVersion(latestRed.id);
        setRedHistoryLength(currentRedLength);

        // If this is the selected agent, update current results too
        if (selectedAgent === "red") {
          setCurrentResults(latestRed.results);
        }
      } else if (currentRedLength > 0 && !selectedRedVersion) {
        // No selection yet, but history exists - select latest
        const latestRed = redRuns.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0];
        setSelectedRedVersion(latestRed.id);
        setRedHistoryLength(currentRedLength);
      }

      // Handle Blue agent history
      const blueRuns = deployment.agentHistory.filter((r) => r.agentType === "blue");
      const currentBlueLength = blueRuns.length;

      // If history grew (new run added) OR no selection yet, update to latest
      if (currentBlueLength > blueHistoryLength) {
        // History grew - new run was added
        const latestBlue = blueRuns.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0];
        setSelectedBlueVersion(latestBlue.id);
        setBlueHistoryLength(currentBlueLength);

        // If this is the selected agent, update current results too
        if (selectedAgent === "blue") {
          setCurrentResults(latestBlue.results);
        }
      } else if (currentBlueLength > 0 && !selectedBlueVersion) {
        // No selection yet, but history exists - select latest
        const latestBlue = blueRuns.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0];
        setSelectedBlueVersion(latestBlue.id);
        setBlueHistoryLength(currentBlueLength);
      }
    }
  }, [deployment.agentHistory]);

  // Call the vulnerability API and derive AgentResults.
  const getAgentResults = async (
    deploymentId: string,
    agent: "red" | "blue"
  ): Promise<AgentResults> => {
    try {
      const params = new URLSearchParams({
        deploymentId,
        agent,
      });
      const res = await fetch(`/api/vulns/files?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Vuln API returned HTTP ${res.status}`);
      }
      const files = (await res.json()) as FileVulnSummary[];

      if (!Array.isArray(files) || files.length === 0) {
        console.warn("Vulnerability API returned no data; using mock results instead.");
        return getMockAgentResults(agent);
      }

      if (agent === "red") {
        return buildRedAgentResultsFromVulns(files);
      } else {
        return buildBlueAgentResultsFromVulns(files);
      }
    } catch (err) {
      console.error("Error loading vulnerability data for agent", agent, err);
      return getMockAgentResults(agent);
    }
  };

  const handleRunAgent = async (agent: "red" | "blue") => {
    setSelectedAgent(agent);
    setAgentRunning(true);

    try {
      const results = await getAgentResults(deployment.id, agent);
      setCurrentResults(results);
      // Save to history - the useEffect will handle updating the selected version
      onSaveAgentRun(deployment.id, agent, results);
    } finally {
      setAgentRunning(false);
    }
  };

  const handleViewHistoricalRun = (agentType: "red" | "blue", results: AgentResults) => {
    setSelectedAgent(agentType);
    setCurrentResults(results);
  };

  // Restore agent state when returning from file change detail
  useEffect(() => {
    if (returnToTab) {
      setActiveTab(returnToTab);
    }
    if (returnToAgent) {
      setSelectedAgent(returnToAgent.agentType);
      setCurrentResults(returnToAgent.results);
    }
  }, [returnToTab, returnToAgent]);

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-foreground mb-2">Simulation Details</h1>
            <p className="text-muted-foreground font-mono">{deployment.id}</p>
          </div>
          <Badge className={getStatusColor(deployment.status)}>{deployment.status}</Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-[#131C2E] mb-6">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="json">Configuration JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            <ScrollArea className="h-[calc(100vh-20rem)] pr-4">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-3">
                  <h3 className="text-[#9AA6B2]">Basic Information</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-secondary/20 border border-border rounded-lg p-4">
                      <div className="text-muted-foreground mb-2">Project Name</div>
                      <div className="text-foreground font-mono">
                        {deployment.config.project.name}
                      </div>
                    </div>
                    <div className="bg-secondary/20 border border-border rounded-lg p-4">
                      <div className="text-muted-foreground mb-2">Total Reactors</div>
                      <div className="text-foreground">{stats.reactorCount}</div>
                    </div>
                    <div className="bg-secondary/20 border border-border rounded-lg p-4">
                      <div className="text-muted-foreground mb-2">Total PLCs</div>
                      <div className="text-foreground">{stats.plcCount}</div>
                    </div>
                    <div className="bg-secondary/20 border border-border rounded-lg p-4">
                      <div className="text-muted-foreground mb-2">Total Sensors</div>
                      <div className="text-foreground">{stats.sensorCount}</div>
                    </div>
                    <div className="bg-secondary/20 border border-border rounded-lg p-4">
                      <div className="text-muted-foreground mb-2 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>Deployed</span>
                      </div>
                      <div className="text-foreground">
                        {getTimeAgo(new Date(deployment.deployedAt))}
                      </div>
                    </div>
                    <div className="bg-secondary/20 border border-border rounded-lg p-4">
                      <div className="text-muted-foreground mb-2 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>Last Updated</span>
                      </div>
                      <div className="text-foreground">
                        {getTimeAgo(new Date(deployment.lastUpdated))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reactor Details */}
                <div className="space-y-3">
                  <h3 className="text-[#9AA6B2]">Reactor Configuration</h3>
                  <div className="grid gap-4">
                    {deployment.config.reactors.map((reactor) => (
                      <div
                        key={reactor.id}
                        className="bg-secondary/30 border border-border rounded-lg p-5"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="font-mono text-foreground">{reactor.id}</div>
                          <div className="text-muted-foreground">{reactor.plcCount} PLCs</div>
                        </div>

                        {/* Sensor breakdown by section */}
                        <div className="space-y-3">
                          {Object.entries(reactor.sections).map(([sectionKey, sectionData]) => {
                            const sectionInfo =
                              SENSOR_SECTIONS[sectionKey as keyof typeof SENSOR_SECTIONS];
                            const sensorCount = Object.values(sectionData).reduce(
                              (sum, s) => sum + s.count,
                              0
                            );

                            if (sensorCount === 0) return null;

                            return (
                              <div
                                key={sectionKey}
                                className="bg-secondary/20 border border-border rounded-lg p-3"
                              >
                                <div className="text-foreground mb-2">{sectionInfo.label}</div>
                                <div className="text-muted-foreground">
                                  {sensorCount} sensors configured
                                </div>

                                {/* Show individual sensor types */}
                                <div className="mt-2 space-y-1">
                                  {Object.entries(sectionData).map(
                                    ([sensorKey, sensorData]) => {
                                      if (sensorData.count === 0) return null;

                                      // Find the sensor label from SENSOR_SECTIONS
                                      const sensorInfo = sectionInfo.sensors.find(
                                        (s: { id: string; label: string }) => s.id === sensorKey
                                      );
                                      const sensorLabel = sensorInfo
                                        ? sensorInfo.label
                                        : sensorKey;

                                      return (
                                        <div
                                          key={sensorKey}
                                          className="text-muted-foreground flex justify-between"
                                        >
                                          <span>{sensorLabel}</span>
                                          <span>×{sensorData.count}</span>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="agents">
            <ScrollArea className="h-[calc(100vh-20rem)]">
              <div className="space-y-6">
                {/* Description */}
                <div className="bg-secondary/20 border border-border rounded-lg p-4">
                  <h3 className="text-[#9AA6B2] mb-2">AI Security Agents</h3>
                  <p className="text-muted-foreground">
                    Deploy AI-powered agents to conduct red team (offensive) or blue team (defensive)
                    operations on your simulation deployment. Red/Blue results will be derived from
                    the latest vulnerability scan when available.
                  </p>
                </div>

                {/* Version History - Always Visible */}
                <div className="space-y-3">
                  <h3 className="text-[#9AA6B2]">Version History</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Agent Red History */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Swords className="h-4 w-4 text-red-500" />
                        <span className="text-muted-foreground">Agent Red</span>
                      </div>
                      {deployment.agentHistory &&
                      deployment.agentHistory.filter((r) => r.agentType === "red").length > 0 ? (
                        <Select
                          value={selectedRedVersion}
                          onValueChange={(value) => {
                            setSelectedRedVersion(value);
                            const run = deployment.agentHistory?.find((r) => r.id === value);
                            if (run) {
                              handleViewHistoricalRun(run.agentType, run.results);
                            }
                          }}
                        >
                          <SelectTrigger
                            className="w-full bg-secondary/20 border-border text-foreground"
                            onClick={(e) => {
                              // If the dropdown is being opened and there's a selected version, show those results
                              if (selectedRedVersion && selectedAgent !== "red") {
                                e.stopPropagation();
                                const run = deployment.agentHistory?.find(
                                  (r) => r.id === selectedRedVersion
                                );
                                if (run) {
                                  handleViewHistoricalRun(run.agentType, run.results);
                                }
                              }
                            }}
                          >
                            <SelectValue placeholder="Select a version" />
                          </SelectTrigger>
                          <SelectContent>
                            {deployment.agentHistory
                              .filter((run) => run.agentType === "red")
                              .slice()
                              .reverse()
                              .map((run, index) => {
                                const totalCount = deployment.agentHistory!.filter(
                                  (r) => r.agentType === "red"
                                ).length;
                                const versionNumber = totalCount - index;
                                const isCurrent = index === 0;
                                return (
                                  <SelectItem key={run.id} value={run.id}>
                                    Red results #{versionNumber}
                                    {isCurrent ? " (Latest)" : ""} -{" "}
                                    {getTimeAgo(new Date(run.timestamp))}
                                  </SelectItem>
                                );
                              })}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="bg-secondary/10 border border-border rounded-lg p-3 text-center text-muted-foreground">
                          No history yet
                        </div>
                      )}
                    </div>

                    {/* Agent Blue History */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-500" />
                        <span className="text-muted-foreground">Agent Blue</span>
                      </div>
                      {deployment.agentHistory &&
                      deployment.agentHistory.filter((r) => r.agentType === "blue").length > 0 ? (
                        <Select
                          value={selectedBlueVersion}
                          onValueChange={(value) => {
                            setSelectedBlueVersion(value);
                            const run = deployment.agentHistory?.find((r) => r.id === value);
                            if (run) {
                              handleViewHistoricalRun(run.agentType, run.results);
                            }
                          }}
                        >
                          <SelectTrigger
                            className="w-full bg-secondary/20 border-border text-foreground"
                            onClick={(e) => {
                              // If the dropdown is being opened and there's a selected version, show those results
                              if (selectedBlueVersion && selectedAgent !== "blue") {
                                e.stopPropagation();
                                const run = deployment.agentHistory?.find(
                                  (r) => r.id === selectedBlueVersion
                                );
                                if (run) {
                                  handleViewHistoricalRun(run.agentType, run.results);
                                }
                              }
                            }}
                          >
                            <SelectValue placeholder="Select a version" />
                          </SelectTrigger>
                          <SelectContent>
                            {deployment.agentHistory
                              .filter((run) => run.agentType === "blue")
                              .slice()
                              .reverse()
                              .map((run, index) => {
                                const totalCount = deployment.agentHistory!.filter(
                                  (r) => r.agentType === "blue"
                                ).length;
                                const versionNumber = totalCount - index;
                                const isCurrent = index === 0;
                                return (
                                  <SelectItem key={run.id} value={run.id}>
                                    Blue results #{versionNumber}
                                    {isCurrent ? " (Latest)" : ""} -{" "}
                                    {getTimeAgo(new Date(run.timestamp))}
                                  </SelectItem>
                                );
                              })}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="bg-secondary/10 border border-border rounded-lg p-3 text-center text-muted-foreground">
                          No history yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Agent Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => handleRunAgent("red")}
                    className={`h-32 flex-col gap-3 ${
                      selectedAgent === "red"
                        ? "bg-red-500/20 border-red-500/50 hover:bg-red-500/30"
                        : "bg-secondary/20 border-border hover:bg-secondary/30"
                    } border-2 transition-all`}
                    disabled={agentRunning}
                  >
                    <Swords className="h-8 w-8 text-red-500" />
                    <div className="space-y-1">
                      <div className="text-foreground">Agent Red</div>
                      <div className="text-muted-foreground">Red Team Operations</div>
                    </div>
                  </Button>

                  <Button
                    onClick={() => handleRunAgent("blue")}
                    className={`h-32 flex-col gap-3 ${
                      selectedAgent === "blue"
                        ? "bg-blue-500/20 border-blue-500/50 hover:bg-blue-500/30"
                        : "bg-secondary/20 border-border hover:bg-secondary/30"
                    } border-2 transition-all`}
                    disabled={agentRunning}
                  >
                    <Shield className="h-8 w-8 text-blue-500" />
                    <div className="space-y-1">
                      <div className="text-foreground">Agent Blue</div>
                      <div className="text-muted-foreground">Blue Team Operations</div>
                    </div>
                  </Button>
                </div>

                {/* Agent Status */}
                {agentRunning && (
                  <div className="bg-secondary/30 border border-border rounded-lg p-6 text-center">
                    <Activity className="h-8 w-8 text-primary mx-auto mb-3 animate-pulse" />
                    <div className="text-foreground mb-2">Agent Running...</div>
                    <div className="text-muted-foreground">
                      Analyzing simulation deployment against latest vulnerability data
                    </div>
                  </div>
                )}

                {/* Agent Results */}
                {selectedAgent && !agentRunning && currentResults && (
                  <div className="space-y-4">
                    {/* Agent Header */}
                    <div
                      className={`border-2 rounded-lg p-4 ${
                        selectedAgent === "red"
                          ? "bg-red-500/10 border-red-500/30"
                          : "bg-blue-500/10 border-blue-500/30"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {selectedAgent === "red" ? (
                          <Swords className="h-6 w-6 text-red-500" />
                        ) : (
                          <Shield className="h-6 w-6 text-blue-500" />
                        )}
                        <h3 className="text-[#9AA6B2]">{currentResults.name}</h3>
                      </div>
                      <p className="text-muted-foreground">{currentResults.description}</p>
                    </div>

                    {/* Metrics */}
                    <div className="space-y-3">
                      <h3 className="text-[#9AA6B2]">Metrics</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {currentResults.metrics.map((metric, idx) => (
                          <div
                            key={idx}
                            className="bg-secondary/20 border border-border rounded-lg p-4"
                          >
                            <div className="text-muted-foreground mb-2">{metric.label}</div>
                            <div className="flex items-center gap-2">
                              <div className="text-foreground">{metric.value}</div>
                              {metric.status === "critical" && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                              {metric.status === "warning" && (
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              )}
                              {metric.status === "success" && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* File Changes */}
                    <div className="space-y-3">
                      <h3 className="text-[#9AA6B2]">File Changes</h3>
                      <div className="space-y-2">
                        {currentResults.fileChanges.map((change, idx) => (
                          <button
                            key={idx}
                            onClick={() => onViewFileChange(change, selectedAgent, currentResults)}
                            className="w-full bg-secondary/20 border border-border rounded-lg p-4 hover:bg-secondary/30 hover:border-primary/50 transition-all text-left cursor-pointer"
                          >
                            <div className="flex items-start gap-3">
                              <FileCode className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-foreground font-mono mb-1 break-all">
                                  {change.file}
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getFileChangeBadgeColor(change.status)}>
                                    {change.status}
                                  </Badge>
                                </div>
                                <div className="text-muted-foreground">
                                  {change.description}
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Initial State */}
                {!selectedAgent && !agentRunning && (
                  <div className="bg-secondary/20 border border-border rounded-lg p-8 text-center">
                    <div className="text-muted-foreground">
                      Select an agent above to begin security operations
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="json">
            <ScrollArea className="h-[calc(100vh-20rem)]">
              <pre className="bg-secondary/30 border border-border rounded-lg p-4 text-foreground overflow-x-auto">
                <code>{JSON.stringify(deployment.config, null, 2)}</code>
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
