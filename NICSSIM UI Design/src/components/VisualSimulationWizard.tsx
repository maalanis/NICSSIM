import { useState } from "react";
import { ChevronRight, Check } from "lucide-react";
import { Button } from "./ui/button";
import { SimulationConfig, ReactorConfig, SENSOR_SECTIONS } from "../types/simulation";

interface VisualSimulationWizardProps {
  onDeploy: (config: SimulationConfig) => void;
  onCancel: () => void;
}

export function VisualSimulationWizard({ onDeploy, onCancel }: VisualSimulationWizardProps) {
  const [step, setStep] = useState(1);
  
  // Step 1: Project Setup
  const [projectName, setProjectName] = useState("");
  const [reactorPrefix, setReactorPrefix] = useState("REACTOR");
  const [zeroPad, setZeroPad] = useState(2);
  const [reactorCount, setReactorCount] = useState(1);
  
  // Step 2: PLC Configuration
  const [plcCount, setPlcCount] = useState(2);
  
  // Step 3: Sensor Configuration (simplified for sidebar)
  const [sensorCounts, setSensorCounts] = useState<Record<string, number>>({
    neutron_flux: 1,
    control_rod_position: 1,
    primary_pressure: 1,
    coolant_flow: 1,
    coolant_temp_in: 1,
    coolant_temp_out: 1,
    sg_inlet_pressure: 1,
    primary_loop_valve_position: 1,
    primary_piping_radiation: 1,
    sg_temp_in: 1,
    sg_temp_out: 1,
    sg_pressure: 1,
    sg_level: 1,
    feedwater_flow: 1,
  });

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleDeploy = () => {
    // Build the simulation config
    const reactors: ReactorConfig[] = [];
    
    for (let i = 0; i < reactorCount; i++) {
      const plcs = Array.from({ length: plcCount }, (_, idx) => ({
        id: `plc-${i}-${idx}`,
      }));
      
      const reactor: ReactorConfig = {
        id: `reactor-${i}`,
        plcCount,
        plcs,
        sections: {
          fuel_primary_heat_removal: {
            neutron_flux: {
              count: sensorCounts.neutron_flux,
              redundancy: "None",
              plcOrder: plcs.map(p => p.id),
            },
            control_rod_position: {
              count: sensorCounts.control_rod_position,
              redundancy: "None",
              plcOrder: plcs.map(p => p.id),
            },
            primary_pressure: {
              count: sensorCounts.primary_pressure,
              redundancy: "None",
              plcOrder: plcs.map(p => p.id),
            },
            coolant_flow: {
              count: sensorCounts.coolant_flow,
              redundancy: "None",
              plcOrder: plcs.map(p => p.id),
            },
            coolant_temp_in: {
              count: sensorCounts.coolant_temp_in,
              redundancy: "None",
              plcOrder: plcs.map(p => p.id),
            },
            coolant_temp_out: {
              count: sensorCounts.coolant_temp_out,
              redundancy: "None",
              plcOrder: plcs.map(p => p.id),
            },
          },
          primary_loop_instrumentation: {
            sg_inlet_pressure: {
              count: sensorCounts.sg_inlet_pressure,
              redundancy: "None",
              plcOrder: plcs.map(p => p.id),
            },
            primary_loop_valve_position: {
              count: sensorCounts.primary_loop_valve_position,
              redundancy: "None",
              plcOrder: plcs.map(p => p.id),
            },
            primary_piping_radiation: {
              count: sensorCounts.primary_piping_radiation,
              redundancy: "None",
              plcOrder: plcs.map(p => p.id),
            },
          },
          steam_generator_heat_transfer: {
            sg_temp_in: {
              count: sensorCounts.sg_temp_in,
              redundancy: "None",
              plcOrder: plcs.map(p => p.id),
            },
            sg_temp_out: {
              count: sensorCounts.sg_temp_out,
              redundancy: "None",
              plcOrder: plcs.map(p => p.id),
            },
            sg_pressure: {
              count: sensorCounts.sg_pressure,
              redundancy: "None",
              plcOrder: plcs.map(p => p.id),
            },
            sg_level: {
              count: sensorCounts.sg_level,
              redundancy: "None",
              plcOrder: plcs.map(p => p.id),
            },
            feedwater_flow: {
              count: sensorCounts.feedwater_flow,
              redundancy: "None",
              plcOrder: plcs.map(p => p.id),
            },
          },
        },
      };
      
      reactors.push(reactor);
    }
    
    const config: SimulationConfig = {
      project: {
        name: projectName,
        reactorPrefix,
        zeroPad,
        reactorCount,
      },
      reactors,
    };
    
    onDeploy(config);
  };

  const canProceed = () => {
    if (step === 1) return projectName.trim() !== "" && reactorCount > 0;
    if (step === 2) return plcCount > 0;
    if (step === 3) return true;
    return true;
  };

  return (
    <div className="space-y-4">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-[10px]">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`flex-1 h-1 rounded-full transition-colors ${
              s <= step ? "bg-white" : "bg-white/20"
            }`}
          />
        ))}
      </div>

      <div className="text-xs text-white/70">
        Step {step} of 4: {
          step === 1 ? "Project Setup" :
          step === 2 ? "PLC Configuration" :
          step === 3 ? "Sensor Assignment" :
          "Review & Deploy"
        }
      </div>

      {/* Step 1: Project Setup */}
      {step === 1 && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1 text-white">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., NRC-Training-Fleet"
              className="w-full px-2 py-1.5 text-xs rounded bg-white/10 border border-white/30 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/50"
            />
          </div>
          
          <div>
            <label className="block text-xs mb-1 text-white">Reactor Prefix</label>
            <input
              type="text"
              value={reactorPrefix}
              onChange={(e) => setReactorPrefix(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded bg-white/10 border border-white/30 text-white focus:outline-none focus:ring-1 focus:ring-white/50"
            />
          </div>
          
          <div>
            <label className="block text-xs mb-1 text-white">Zero Padding</label>
            <input
              type="number"
              min="1"
              max="4"
              value={zeroPad}
              onChange={(e) => setZeroPad(Number(e.target.value))}
              className="w-full px-2 py-1.5 text-xs rounded bg-white/10 border border-white/30 text-white focus:outline-none focus:ring-1 focus:ring-white/50"
            />
          </div>
          
          <div>
            <label className="block text-xs mb-1 text-white">Number of Reactors</label>
            <input
              type="number"
              min="1"
              max="10"
              value={reactorCount}
              onChange={(e) => setReactorCount(Number(e.target.value))}
              className="w-full px-2 py-1.5 text-xs rounded bg-white/10 border border-white/30 text-white focus:outline-none focus:ring-1 focus:ring-white/50"
            />
          </div>
        </div>
      )}

      {/* Step 2: PLC Configuration */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-black/20 border border-white/20">
            <p className="text-xs text-white mb-2">Configure PLCs for each reactor</p>
            <p className="text-[10px] text-white/70">
              Each of your {reactorCount} reactor(s) will have the same PLC configuration.
            </p>
          </div>
          
          <div>
            <label className="block text-xs mb-1 text-white">PLCs per Reactor</label>
            <input
              type="number"
              min="1"
              max="10"
              value={plcCount}
              onChange={(e) => setPlcCount(Number(e.target.value))}
              className="w-full px-2 py-1.5 text-xs rounded bg-white/10 border border-white/30 text-white focus:outline-none focus:ring-1 focus:ring-white/50"
            />
            <p className="text-[10px] text-white/60 mt-1">
              Total PLCs: {reactorCount * plcCount}
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Sensor Configuration */}
      {step === 3 && (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
          <div className="p-3 rounded-lg bg-black/20 border border-white/20">
            <p className="text-xs text-white mb-1">Sensor Assignment</p>
            <p className="text-[10px] text-white/70">
              Set sensor counts for each type
            </p>
          </div>

          {Object.entries(SENSOR_SECTIONS).map(([sectionKey, section]) => (
            <div key={sectionKey} className="space-y-2">
              <h3 className="text-[10px] text-white/80 uppercase tracking-wider border-b border-white/10 pb-1">
                {section.label}
              </h3>
              {section.sensors.map((sensor) => (
                <div key={sensor.id} className="flex items-center justify-between text-[10px]">
                  <span className="text-white/80 text-[9px]">{sensor.label}</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={sensorCounts[sensor.id] || 1}
                    onChange={(e) => setSensorCounts({ ...sensorCounts, [sensor.id]: Number(e.target.value) })}
                    className="w-14 px-1 py-0.5 text-[10px] rounded bg-white/10 border border-white/30 text-white focus:outline-none focus:ring-1 focus:ring-white/50"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-black/20 border border-white/20 space-y-2 text-[10px]">
            <div className="flex justify-between">
              <span className="text-white/70">Project:</span>
              <span className="text-white font-medium">{projectName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Reactors:</span>
              <span className="text-white font-medium">{reactorCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">PLCs per Reactor:</span>
              <span className="text-white font-medium">{plcCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Total PLCs:</span>
              <span className="text-white font-medium">{reactorCount * plcCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Total Sensors:</span>
              <span className="text-white font-medium">
                {Object.values(sensorCounts).reduce((sum, count) => sum + count, 0) * reactorCount}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-green-900/30 border border-green-400/30">
            <p className="text-xs text-white">Ready to deploy simulation</p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-2 pt-2 border-t border-white/20">
        {step > 1 && (
          <Button
            onClick={handleBack}
            variant="outline"
            size="sm"
            className="flex-1 text-xs border-white/30 text-white hover:bg-white/10"
          >
            Back
          </Button>
        )}
        
        {step === 1 && (
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
            className="flex-1 text-xs border-white/30 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
        )}
        
        {step < 4 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            size="sm"
            className="flex-1 text-xs bg-white text-orange-600 hover:bg-white/90 disabled:opacity-50"
          >
            Next <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleDeploy}
            size="sm"
            className="flex-1 text-xs bg-white text-orange-600 hover:bg-white/90"
          >
            <Check className="w-3 h-3 mr-1" /> Deploy
          </Button>
        )}
      </div>
    </div>
  );
}
