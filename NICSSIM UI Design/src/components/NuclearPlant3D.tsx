import { useState } from "react";
import { DeployedSimulation, SimulationConfig, SENSOR_SECTIONS } from "../types/simulation";
import { ChevronRight, Check, ChevronLeft } from "lucide-react";
import { CustomNuclear3D } from "./CustomNuclear3D";
import { STLNuclear3D } from "./STLNuclear3D";

interface NuclearPlant3DProps {
  deployedSimulations?: DeployedSimulation[];
  onNewSimulation?: (config: SimulationConfig) => void;
  theme?: "light" | "dark";
}

export function NuclearPlant3D({ deployedSimulations = [], onNewSimulation, theme = "dark" }: NuclearPlant3DProps) {
  const [selectedSimulation, setSelectedSimulation] = useState<string | null>(null);
  const [consoleHeight, setConsoleHeight] = useState(60); // Default height in pixels
  const [isDragging, setIsDragging] = useState(false);

  // Live controls state
  const [reactorPower, setReactorPower] = useState(60);
  const [pumpRpm, setPumpRpm] = useState(2000);
  const [turbineRpm, setTurbineRpm] = useState(2500);
  const [controlRodWithdrawn, setControlRodWithdrawn] = useState(40);
  const [pumpOn, setPumpOn] = useState(true);
  const [turbineOn, setTurbineOn] = useState(true);

  // Visualization mode: 'iframe', 'custom', 'stl'
  const [vizMode, setVizMode] = useState<'iframe' | 'custom' | 'stl'>('custom');

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [sensorSubStep, setSensorSubStep] = useState(1); // Track sub-steps within sensors
  const [reactorCount, setReactorCount] = useState(1);
  const [plcCount, setPlcCount] = useState(1);
  const [samePlcForAll, setSamePlcForAll] = useState(true);
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

  const handleNextStep = () => {
    if (wizardStep === 3) {
      // Handle sensor sub-steps
      if (sensorSubStep < 3) {
        setSensorSubStep(sensorSubStep + 1);
      } else {
        setWizardStep(4);
        setSensorSubStep(1);
      }
    } else {
      setWizardStep(wizardStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (wizardStep === 3 && sensorSubStep > 1) {
      setSensorSubStep(sensorSubStep - 1);
    } else if (wizardStep > 1) {
      if (wizardStep === 4) {
        setWizardStep(3);
        setSensorSubStep(3);
      } else {
        setWizardStep(wizardStep - 1);
      }
    }
  };

  const handleDeploy = () => {
    if (onNewSimulation) {
      const config: SimulationConfig = {
        project: {
          name: `reactor-sim-${Date.now()}`,
          reactorPrefix: "SMR",
          zeroPad: 3,
          reactorCount: reactorCount,
        },
        reactors: Array.from({ length: reactorCount }, (_, i) => ({
          id: `SMR${String(i + 1).padStart(3, '0')}`,
          plcCount: samePlcForAll ? plcCount : 1,
          plcs: Array.from({ length: samePlcForAll ? plcCount : 1 }, (_, j) => ({
            id: `PLC${j + 1}`,
          })),
          sections: {
            fuel_primary_heat_removal: Object.fromEntries(
              SENSOR_SECTIONS.fuel_primary_heat_removal.sensors.map(sensor => [
                sensor.type,
                {
                  count: sensorCounts[sensor.type] || 1,
                  redundancy: "None" as const,
                  plcOrder: [],
                },
              ])
            ),
            primary_loop_instrumentation: Object.fromEntries(
              SENSOR_SECTIONS.primary_loop_instrumentation.sensors.map(sensor => [
                sensor.type,
                {
                  count: sensorCounts[sensor.type] || 1,
                  redundancy: "None" as const,
                  plcOrder: [],
                },
              ])
            ),
            steam_generator_heat_transfer: Object.fromEntries(
              SENSOR_SECTIONS.steam_generator_heat_transfer.sensors.map(sensor => [
                sensor.type,
                {
                  count: sensorCounts[sensor.type] || 1,
                  redundancy: "None" as const,
                  plcOrder: [],
                },
              ])
            ),
          },
        })),
      };
      onNewSimulation(config);
      // Reset wizard
      setWizardStep(1);
      setSensorSubStep(1);
    }
  };

  const sensorSectionsList = [
    SENSOR_SECTIONS.fuel_primary_heat_removal,
    SENSOR_SECTIONS.primary_loop_instrumentation,
    SENSOR_SECTIONS.steam_generator_heat_transfer,
  ];
  
  const currentSensorSection = sensorSectionsList[sensorSubStep - 1];

  // Handle resizing the console
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newHeight = window.innerHeight - e.clientY;
      setConsoleHeight(Math.max(60, Math.min(500, newHeight))); // Min 60px, Max 500px
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add/remove event listeners for dragging
  if (typeof window !== 'undefined') {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  }

  return (
    <div className="flex h-full w-full relative">
      {/* Main Content Area - 3D Viewport with Console */}
      <div className="flex-1 min-w-0 relative">
        {/* 3D Viewport - Center (placeholder with white box) - Full Height */}
        <div className={`absolute inset-0 flex items-center justify-center ${theme === 'dark' ? 'bg-[#0a0e1a]' : 'bg-gray-100'}`}>
          {/* Centered White Box - 3D Viewport with Embedded Simulation */}
          <div className={`rounded-lg shadow-2xl w-[1100px] h-[650px] flex items-center justify-center overflow-hidden relative ${theme === 'dark' ? 'bg-white' : 'bg-white'}`}>
            {/* Mode Switcher - Top Right */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <button
                onClick={() => setVizMode('iframe')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  vizMode === 'iframe'
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                External
              </button>
              <button
                onClick={() => setVizMode('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  vizMode === 'custom'
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Custom 3D
              </button>
              <button
                onClick={() => setVizMode('stl')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  vizMode === 'stl'
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                STL Model
              </button>
            </div>

            {/* Render appropriate visualization based on mode */}
            {vizMode === 'iframe' && (
              <iframe
                src="https://3d.energyencyclopedia.com/pwr_npp"
                title="PWR nuclear power plant — interactive 3D model"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
              />
            )}
            {vizMode === 'custom' && (
              <CustomNuclear3D 
                reactorPower={reactorPower}
                pumpRpm={pumpRpm}
                turbineRpm={turbineRpm}
                theme={theme}
              />
            )}
            {vizMode === 'stl' && (
              <STLNuclear3D 
                reactorPower={reactorPower}
                pumpRpm={pumpRpm}
                turbineRpm={turbineRpm}
                controlRodWithdrawn={controlRodWithdrawn}
                pumpOn={pumpOn}
                turbineOn={turbineOn}
                theme={theme}
              />
            )}
          </div>
        </div>

        {/* Bottom Console Panel - Resizable, Overlays viewport */}
        <div 
          className={`absolute bottom-0 left-0 right-0 border-t flex flex-col z-20 ${
            theme === 'dark' 
              ? 'bg-[#0d1117] border-gray-700' 
              : 'bg-white border-gray-300'
          }`}
          style={{ height: `${consoleHeight}px` }}
        >
          {/* Drag Handle */}
          <div
            onMouseDown={handleMouseDown}
            className={`absolute top-0 left-0 right-0 h-1 hover:bg-orange-500 cursor-ns-resize transition-colors z-10 ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
            }`}
          >
            <div className={`absolute top-1 left-1/2 transform -translate-x-1/2 w-12 h-1 rounded-full ${
              theme === 'dark' ? 'bg-gray-600' : 'bg-gray-400'
            }`} />
          </div>

          {/* Console Content */}
          <div className={`flex-1 overflow-y-auto px-4 py-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            <div className="font-mono text-sm space-y-1">
              <div className="text-green-400">✓ Active security in process</div>
              <div className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>• Initializing reactor simulation environment...</div>
              <div className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>• Loading nuclear physics models...</div>
              <div className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>• Establishing secure PLC connections...</div>
              <div className="text-green-400">✓ All systems operational</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Orange Theme */}
      <aside className="w-[280px] min-w-[280px] flex-shrink-0 bg-gradient-to-br from-[#FF8200] via-[#FF6B00] to-[#E67300] border-l border-orange-400/30 flex flex-col overflow-y-auto shadow-2xl">
        <div className="p-4 space-y-4 text-white">
          {/* Header */}
          <div className="pb-3 border-b border-white/20">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Visual Controls
            </h2>
          </div>

          {/* All Models Loaded Message */}
          <div className="p-3 rounded-lg bg-black/20 border border-white/20">
            <div className="flex items-center gap-2 text-white">
              <Check className="w-4 h-4" />
              <span className="text-xs font-semibold">All models loaded</span>
            </div>
          </div>

          {/* New Simulation Wizard Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                New Simulation
              </h3>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded text-white">
                Step {wizardStep === 3 ? `${wizardStep}.${sensorSubStep}` : wizardStep} of 4
              </span>
            </div>

            {/* Step 1: Fleet Size */}
            {wizardStep === 1 && (
              <div className="space-y-3 p-3 rounded-lg bg-black/20 border border-white/20">
                <div>
                  <h4 className="text-xs font-semibold text-white mb-1">Fleet Size</h4>
                  <p className="text-[10px] text-white/70">Configure the number of micro-reactors in your simulation fleet.</p>
                </div>
                <label className="text-xs font-medium block text-white">Number of Micro-Reactors</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReactorCount(Math.max(1, reactorCount - 1))}
                    className="w-8 h-8 rounded bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={reactorCount}
                    onChange={(e) => setReactorCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-center text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                    min="1"
                    max="10"
                  />
                  <button
                    onClick={() => setReactorCount(Math.min(10, reactorCount + 1))}
                    className="w-8 h-8 rounded bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                  >
                    +
                  </button>
                </div>
                <p className="text-[10px] text-white/60">Choose between 1 and 10 reactors</p>
                <button
                  onClick={handleNextStep}
                  className="w-full px-4 py-2 bg-white text-orange-600 rounded font-medium hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 2: PLCs */}
            {wizardStep === 2 && (
              <div className="space-y-3 p-3 rounded-lg bg-black/20 border border-white/20">
                <div>
                  <h4 className="text-xs font-semibold text-white mb-1">PLC Configuration</h4>
                  <p className="text-[10px] text-white/70">Configure the number of Programmable Logic Controllers for each reactor.</p>
                </div>
                <div className="p-2 rounded bg-white/10 border border-white/20">
                  <label className="flex items-start gap-2 text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={samePlcForAll}
                      onChange={(e) => setSamePlcForAll(e.target.checked)}
                      className="rounded mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-medium">Same PLC count for all reactors</div>
                      <div className="text-[10px] text-white/70">Apply uniform PLC configuration across the fleet</div>
                    </div>
                  </label>
                </div>
                <label className="text-xs font-medium block text-white">PLCs per Reactor</label>
                <input
                  type="number"
                  value={plcCount}
                  onChange={(e) => setPlcCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                  min="1"
                />
                <p className="text-[10px] text-white/60">Each reactor will have {plcCount} PLC{plcCount > 1 ? 's' : ''}</p>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrevStep}
                    className="flex-1 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={handleNextStep}
                    className="flex-1 px-4 py-2 bg-white text-orange-600 rounded font-medium hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Sensors (with sub-steps) */}
            {wizardStep === 3 && currentSensorSection && (
              <div className="space-y-3 p-3 rounded-lg bg-black/20 border border-white/20">
                <div>
                  <h4 className="text-xs font-semibold text-white mb-1">{currentSensorSection.title}</h4>
                  <p className="text-[10px] text-white/70">{currentSensorSection.description}</p>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {currentSensorSection.sensors.map((sensor) => (
                    <div key={sensor.type} className="flex items-center justify-between gap-2 py-1">
                      <label className="text-[11px] text-white flex-1">{sensor.label}</label>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setSensorCounts((prev) => ({
                              ...prev,
                              [sensor.type]: Math.max(1, (prev[sensor.type] || 1) - 1),
                            }))
                          }
                          className="w-6 h-6 rounded bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xs transition-colors"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-xs text-white">{sensorCounts[sensor.type] || 1}</span>
                        <button
                          onClick={() =>
                            setSensorCounts((prev) => ({
                              ...prev,
                              [sensor.type]: (prev[sensor.type] || 1) + 1,
                            }))
                          }
                          className="w-6 h-6 rounded bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xs transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrevStep}
                    className="flex-1 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={handleNextStep}
                    className="flex-1 px-4 py-2 bg-white text-orange-600 rounded font-medium hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                  >
                    {sensorSubStep < 3 ? "Next Section" : "Review"}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Review & Deploy */}
            {wizardStep === 4 && (
              <div className="space-y-3 p-3 rounded-lg bg-black/20 border border-white/20">
                <div className="space-y-2 text-xs text-white">
                  <div className="flex justify-between">
                    <span className="text-white/70">Reactors:</span>
                    <span className="font-semibold">{reactorCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">PLCs per Reactor:</span>
                    <span className="font-semibold">{plcCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Total Sensors:</span>
                    <span className="font-semibold">
                      {Object.values(sensorCounts).reduce((sum, count) => sum + count, 0)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrevStep}
                    className="flex-1 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={handleDeploy}
                    className="flex-1 px-4 py-2 bg-white text-orange-600 rounded font-medium hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Deploy
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live Controls Section */}
          <div className="space-y-3 pt-4 border-t border-white/20">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">Live Controls</h3>

            {/* Reactor Power */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-white">
                <span>Reactor Power</span>
                <span>{reactorPower}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={reactorPower}
                onChange={(e) => setReactorPower(parseInt(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Pump RPM */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-white">
                <span>Pump RPM</span>
                <span>{pumpRpm}</span>
              </div>
              <input
                type="range"
                min="0"
                max="3000"
                value={pumpRpm}
                onChange={(e) => setPumpRpm(parseInt(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Turbine RPM */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-white">
                <span>Turbine RPM</span>
                <span>{turbineRpm}</span>
              </div>
              <input
                type="range"
                min="0"
                max="4000"
                value={turbineRpm}
                onChange={(e) => setTurbineRpm(parseInt(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Control Rod */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-white">
                <span>Control Rod Withdrawn</span>
                <span>{controlRodWithdrawn}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={controlRodWithdrawn}
                onChange={(e) => setControlRodWithdrawn(parseInt(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Component toggles */}
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                <input type="checkbox" checked={pumpOn} onChange={(e) => setPumpOn(e.target.checked)} className="rounded" />
                Main Pump Running
              </label>
              <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                <input type="checkbox" checked={turbineOn} onChange={(e) => setTurbineOn(e.target.checked)} className="rounded" />
                Turbine Active
              </label>
            </div>
          </div>

          {/* Focus Buttons */}
          <div className="space-y-2 pt-4 border-t border-white/20">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">Quick Focus</h3>
            <button className="w-full px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded text-xs font-medium transition-colors">
              Focus on Reactor
            </button>
            <button className="w-full px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded text-xs font-medium transition-colors">
              Focus on Turbine
            </button>
            <button className="w-full px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded text-xs font-medium transition-colors">
              Focus on Generator
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}