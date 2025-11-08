import { useState, useEffect } from "react";
import { Stepper } from "./Stepper";
import { FleetConfiguration } from "./wizard/FleetConfiguration";
import { PLCConfiguration } from "./wizard/PLCConfiguration";
import { SensorConfiguration } from "./wizard/SensorConfiguration";
import { ReviewDeploy } from "./wizard/ReviewDeploy";
import { SimulationConfig, ReactorConfig, SENSOR_SECTIONS } from "../types/simulation";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { toast } from "sonner@2.0.3";

interface SimulationWizardProps {
  onClose: () => void;
  onDeploy: (config: SimulationConfig) => void;
}

export function SimulationWizard({ onClose, onDeploy }: SimulationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<SimulationConfig>({
    project: {
      name: `NICSSIM-${new Date().toISOString().split('T')[0]}-001`,
      reactorPrefix: "rx",
      zeroPad: 3,
      reactorCount: 1,
    },
    reactors: [],
  });

  const [samePLCCount, setSamePLCCount] = useState(true);
  const [plcsPerReactor, setPlcsPerReactor] = useState(1);

  const steps = [
    { id: 1, label: "Fleet", description: "Configure reactors" },
    { id: 2, label: "PLCs", description: "Set controllers" },
    { id: 3, label: "Sensors", description: "Configure sensors" },
    { id: 4, label: "Review", description: "Deploy simulation" },
  ];

  // Initialize reactors when count changes
  useEffect(() => {
    const reactors: ReactorConfig[] = [];
    for (let i = 1; i <= config.project.reactorCount; i++) {
      const number = config.project.zeroPad
        ? String(i).padStart(config.project.zeroPad, "0")
        : String(i);
      const reactorId = `${config.project.reactorPrefix}${number}`;

      const plcCount = samePLCCount ? plcsPerReactor : (config.reactors.find(r => r.id === reactorId)?.plcCount || 2);
      const plcs = Array.from({ length: plcCount }, (_, j) => ({
        id: `PLC-${j + 1}`,
      }));

      // Initialize sensor sections
      const sections: ReactorConfig['sections'] = {
        fuel_primary_heat_removal: {},
        primary_loop_instrumentation: {},
        steam_generator_heat_transfer: {},
      };

      Object.entries(SENSOR_SECTIONS).forEach(([sectionKey, sectionData]) => {
        const section = sections[sectionKey as keyof typeof sections];
        sectionData.sensors.forEach((sensor) => {
          section[sensor.id] = {
            count: 1,
            redundancy: "None",
            plcOrder: [],
            instances: [{ plcIds: ['PLC-1'] }],
          };
        });
      });

      reactors.push({
        id: reactorId,
        plcCount,
        plcs,
        sections,
      });
    }

    setConfig((prev) => ({ ...prev, reactors }));
  }, [config.project.reactorCount, config.project.reactorPrefix, config.project.zeroPad, samePLCCount, plcsPerReactor]);

  const handleReactorCountChange = (count: number) => {
    setConfig((prev) => ({
      ...prev,
      project: { ...prev.project, reactorCount: count },
    }));
  };

  const handleReactorPrefixChange = (prefix: string) => {
    setConfig((prev) => ({
      ...prev,
      project: { ...prev.project, reactorPrefix: prefix },
    }));
  };

  const handleZeroPadChange = (enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      project: { ...prev.project, zeroPad: enabled ? 3 : 0 },
    }));
  };

  const handlePLCsPerReactorChange = (count: number) => {
    setPlcsPerReactor(count);
  };

  const handleReactorPLCCountChange = (reactorId: string, count: number) => {
    setConfig((prev) => ({
      ...prev,
      reactors: prev.reactors.map((r) =>
        r.id === reactorId 
          ? { 
              ...r, 
              plcCount: count,
              plcs: Array.from({ length: count }, (_, j) => ({
                id: `PLC-${j + 1}`,
              }))
            } 
          : r
      ),
    }));
  };

  const handleSensorConfigChange = (
    reactorId: string,
    section: string,
    sensorId: string,
    sensorConfig: any
  ) => {
    setConfig((prev) => ({
      ...prev,
      reactors: prev.reactors.map((r) =>
        r.id === reactorId
          ? {
              ...r,
              sections: {
                ...r.sections,
                [section]: {
                  ...r.sections[section as keyof typeof r.sections],
                  [sensorId]: sensorConfig,
                },
              },
            }
          : r
      ),
    }));
  };

  const handleDeploy = () => {
    toast.success("Simulation deployed successfully!", {
      description: `${config.project.name} is now running`,
    });
    setTimeout(() => {
      onClose();
    }, 2000);
    onDeploy(config);
  };

  const handleSaveTemplate = () => {
    toast.success("Template saved successfully!", {
      description: "You can reuse this configuration later",
    });
  };

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem("nicssim-wizard-state", JSON.stringify({ currentStep, config, samePLCCount, plcsPerReactor }));
  }, [currentStep, config, samePLCCount, plcsPerReactor]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2>New Simulation Wizard</h2>
              <p className="text-muted-foreground mt-1">
                Step {currentStep} of {steps.length}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <Stepper steps={steps} currentStep={currentStep} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {currentStep === 1 && (
          <FleetConfiguration
            reactorCount={config.project.reactorCount}
            reactorPrefix={config.project.reactorPrefix}
            zeroPad={config.project.zeroPad > 0}
            onReactorCountChange={handleReactorCountChange}
            onReactorPrefixChange={handleReactorPrefixChange}
            onZeroPadChange={handleZeroPadChange}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <PLCConfiguration
            reactors={config.reactors}
            samePLCCount={samePLCCount}
            plcsPerReactor={plcsPerReactor}
            onSamePLCCountChange={setSamePLCCount}
            onPLCsPerReactorChange={handlePLCsPerReactorChange}
            onReactorPLCCountChange={handleReactorPLCCountChange}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <SensorConfiguration
            reactors={config.reactors}
            onSensorConfigChange={handleSensorConfigChange}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 4 && (
          <ReviewDeploy
            config={config}
            onDeploy={handleDeploy}
            onSaveTemplate={handleSaveTemplate}
            onBack={() => setCurrentStep(3)}
            onCancel={onClose}
          />
        )}
      </div>
    </div>
  );
}