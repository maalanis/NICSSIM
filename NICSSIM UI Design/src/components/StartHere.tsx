import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { NuclearPlant3D } from "./NuclearPlant3D";
import { DeployedSimulation, SimulationConfig } from "../types/simulation";

interface StartHereProps {
  currentUser: string | null;
  onContinue: () => void;
  deployedSimulations?: DeployedSimulation[];
  onNewSimulation?: (config: SimulationConfig) => void;
}

export function StartHere({ currentUser, onContinue, deployedSimulations = [], onNewSimulation }: StartHereProps) {
  return (
    <div className="flex-1 flex">
      {/* 3D Viewer - Takes full space */}
      <NuclearPlant3D 
        deployedSimulations={deployedSimulations} 
        onNewSimulation={onNewSimulation}
      />
    </div>
  );
}