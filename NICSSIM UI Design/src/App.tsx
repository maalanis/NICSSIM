import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { SimulationWizard } from "./components/SimulationWizard";
import { Toaster } from "./components/ui/sonner";
import { DeployedSimulation, SimulationConfig } from "./types/simulation";

export default function App() {
  const [currentView, setCurrentView] = useState<"dashboard" | "wizard">("dashboard");
  const [deployedSimulations, setDeployedSimulations] = useState<DeployedSimulation[]>([]);

  const handleSimulationDeploy = (config: SimulationConfig) => {
    const newDeployment: DeployedSimulation = {
      id: config.project.name,
      config,
      status: "building",
      deployedAt: new Date(),
      lastUpdated: new Date(),
    };
    
    setDeployedSimulations(prev => [newDeployment, ...prev]);
    
    // Simulate status transition to running after 3 seconds
    setTimeout(() => {
      setDeployedSimulations(prev => 
        prev.map(sim => 
          sim.id === newDeployment.id 
            ? { ...sim, status: "running", lastUpdated: new Date() }
            : sim
        )
      );
    }, 3000);
  };

  return (
    <div className="dark min-h-screen bg-background">
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
      />
      
      <div className="ml-60">
        {currentView === "dashboard" ? (
          <div className="max-w-7xl mx-auto px-8 py-8">
            <Dashboard 
              onNewSimulation={() => setCurrentView("wizard")} 
              deployedSimulations={deployedSimulations}
            />
          </div>
        ) : (
          <SimulationWizard onClose={() => setCurrentView("dashboard")} onDeploy={handleSimulationDeploy} />
        )}
      </div>

      <Toaster />
    </div>
  );
}