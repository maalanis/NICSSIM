import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { SimulationWizard } from "./components/SimulationWizard";
import { DeploymentDetail } from "./components/DeploymentDetail";
import { FileChangeDetail } from "./components/FileChangeDetail";
import { LandingPage } from "./components/LandingPage";
import { StartHere } from "./components/StartHere";
import { Toaster } from "./components/ui/sonner";
import { DeployedSimulation, SimulationConfig, AgentResults } from "./types/simulation";

type ViewType =
  | "start-here"
  | "dashboard"
  | "wizard"
  | "deployment-detail"
  | "file-change-detail"
  | "simulator";

interface FileChange {
  file: string;
  status: string;
  description: string;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>("start-here");
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string | null>(null);
  const [selectedFileChange, setSelectedFileChange] = useState<FileChange | null>(null);
  const [selectedAgentType, setSelectedAgentType] = useState<"red" | "blue" | null>(null);
  const [deployedSimulations, setDeployedSimulations] = useState<DeployedSimulation[]>([]);
  const [returnToTab, setReturnToTab] = useState<string | undefined>(undefined);
  const [returnToAgent, setReturnToAgent] = useState<
    { agentType: "red" | "blue"; results: AgentResults } | undefined
  >(undefined);
  const [selectedRedVersion, setSelectedRedVersion] = useState<string | null>(null);
  const [selectedBlueVersion, setSelectedBlueVersion] = useState<string | null>(null);

  const handleSimulationDeploy = (config: SimulationConfig) => {
    const newDeployment: DeployedSimulation = {
      id: config.project.name,
      config,
      status: "building",
      deployedAt: new Date(),
      lastUpdated: new Date(),
    };

    setDeployedSimulations((prev) => [newDeployment, ...prev]);

    // Simulate status transition to running after 3 seconds
    setTimeout(() => {
      setDeployedSimulations((prev) =>
        prev.map((sim) =>
          sim.id === newDeployment.id
            ? { ...sim, status: "running", lastUpdated: new Date() }
            : sim
        )
      );
    }, 3000);
  };

  const handleViewDeployment = (deploymentId: string) => {
    setSelectedDeploymentId(deploymentId);
    setCurrentView("deployment-detail");
  };

  const handleViewFileChange = (
    fileChange: FileChange,
    agentType: "red" | "blue",
    currentResults: AgentResults
  ) => {
    setSelectedFileChange(fileChange);
    setSelectedAgentType(agentType);
    setReturnToAgent({ agentType, results: currentResults });
    setCurrentView("file-change-detail");
  };

  const handleBackFromFileChange = () => {
    setCurrentView("deployment-detail");
    setReturnToTab("agents");
  };

  const handleSaveAgentRun = (
    deploymentId: string,
    agentType: "red" | "blue",
    results: AgentResults
  ) => {
    setDeployedSimulations((prev) =>
      prev.map((sim) => {
        if (sim.id === deploymentId) {
          const newRun = {
            id: `${agentType}-${Date.now()}`,
            agentType,
            timestamp: new Date(),
            results,
          };
          return {
            ...sim,
            agentHistory: [...(sim.agentHistory || []), newRun],
          };
        }
        return sim;
      })
    );
    setReturnToAgent({ agentType, results });
  };

  const handleLogin = (username: string) => {
    setCurrentUser(username);
    setIsAuthenticated(true);
    setCurrentView("dashboard"); // Go directly to dashboard after login
  };

  const selectedDeployment = deployedSimulations.find((d) => d.id === selectedDeploymentId);

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="dark">
        <LandingPage onLogin={handleLogin} />
        <Toaster />
      </div>
    );
  }

  // Main application with sidebar
  return (
    <div className="dark min-h-screen bg-background flex h-screen overflow-hidden">
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        currentUser={currentUser}
      />

      {/* Conditional layout based on view */}
      {currentView === "simulator" ? (
        // Simulator view - no wrapper, direct flex child
        <StartHere
          currentUser={currentUser}
          onContinue={() => setCurrentView("dashboard")}
          deployedSimulations={deployedSimulations}
          onNewSimulation={handleSimulationDeploy}
        />
      ) : (
        // Other views - wrapped in flex column container with original ml-60 offset
        <div className="ml-60 flex-1 flex flex-col overflow-hidden">
          {currentView === "dashboard" ? (
            <div className="max-w-7xl mx-auto px-8 py-8 overflow-y-auto w-full">
              <Dashboard
                onNewSimulation={() => setCurrentView("wizard")}
                deployedSimulations={deployedSimulations}
                onViewDeployment={handleViewDeployment}
              />
            </div>
          ) : currentView === "wizard" ? (
            <div className="overflow-y-auto w-full">
              <SimulationWizard
                onClose={() => setCurrentView("dashboard")}
                onDeploy={handleSimulationDeploy}
              />
            </div>
          ) : currentView === "deployment-detail" && selectedDeployment ? (
            <div className="overflow-y-auto w-full">
              <DeploymentDetail
                deployment={selectedDeployment}
                onBack={() => setCurrentView("dashboard")}
                onViewFileChange={handleViewFileChange}
                onSaveAgentRun={handleSaveAgentRun}
                returnToTab={returnToTab}
                returnToAgent={returnToAgent}
              />
            </div>
          ) : currentView === "file-change-detail" && selectedFileChange ? (
            <div className="overflow-y-auto w-full">
              <FileChangeDetail
                fileChange={selectedFileChange}
                onBack={handleBackFromFileChange}
                agentType={selectedAgentType}
              />
            </div>
          ) : null}
        </div>
      )}

      <Toaster />
    </div>
  );
}
