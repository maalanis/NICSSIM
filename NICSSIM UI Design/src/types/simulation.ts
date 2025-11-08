export interface SimulationConfig {
  project: {
    name: string;
    reactorPrefix: string;
    zeroPad: number;
    reactorCount: number;
  };
  reactors: ReactorConfig[];
}

export interface DeployedSimulation {
  id: string;
  config: SimulationConfig;
  status: "running" | "building" | "failed" | "stopped";
  deployedAt: Date;
  lastUpdated: Date;
}

export interface ReactorConfig {
  id: string;
  plcCount: number;
  plcs: PLC[];
  sections: {
    fuel_primary_heat_removal: SensorSection;
    primary_loop_instrumentation: SensorSection;
    steam_generator_heat_transfer: SensorSection;
  };
}

export interface PLC {
  id: string;
}

export interface SensorSection {
  [key: string]: SensorConfig;
}

export interface SensorConfig {
  count: number;
  redundancy: "None" | "N+1" | "N+2";
  plcOrder: string[];
  instances?: Array<{ plcIds: string[] }>;
}

export type SensorType = {
  id: string;
  label: string;
};

export const SENSOR_SECTIONS = {
  fuel_primary_heat_removal: {
    label: "Fuel & Primary Heat Removal",
    sensors: [
      { id: "neutron_flux", label: "Neutron Flux" },
      { id: "control_rod_position", label: "Control Rod Position" },
      { id: "primary_pressure", label: "Primary Pressure" },
      { id: "coolant_flow", label: "Coolant Flow" },
      { id: "coolant_temp_in", label: "Coolant Temp (In)" },
      { id: "coolant_temp_out", label: "Coolant Temp (Out)" },
    ],
  },
  primary_loop_instrumentation: {
    label: "Primary-Loop Instrumentation",
    sensors: [
      { id: "sg_inlet_pressure", label: "SG Inlet Pressure" },
      { id: "primary_loop_valve_position", label: "Primary Loop Valve Position" },
      { id: "primary_piping_radiation", label: "Primary Piping Radiation" },
    ],
  },
  steam_generator_heat_transfer: {
    label: "Heat Transfer in Steam Generator",
    sensors: [
      { id: "sg_temp_in", label: "SG Temp (In)" },
      { id: "sg_temp_out", label: "SG Temp (Out)" },
      { id: "sg_pressure", label: "SG Pressure" },
      { id: "sg_level", label: "SG Level" },
      { id: "feedwater_flow", label: "Feedwater Flow" },
    ],
  },
};