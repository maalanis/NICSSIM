import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { NuclearPlant3D } from "./NuclearPlant3D";
import { DeployedSimulation, SimulationConfig } from "../types/simulation";

interface StartHereProps {
  currentUser: string | null;
  onContinue: () => void;
  deployedSimulations?: DeployedSimulation[];
  onNewSimulation?: (config: SimulationConfig) => void;
  theme?: "light" | "dark";
}

export function StartHere({ currentUser, onContinue, deployedSimulations = [], onNewSimulation, theme = "dark" }: StartHereProps) {
  return (
    <div className="flex-1 flex">
      {/* 3D Viewer - Takes full space */}
      <NuclearPlant3D 
        deployedSimulations={deployedSimulations} 
        onNewSimulation={onNewSimulation}
        theme={theme}
      />
    </div>
  );
}