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
  agentHistory?: AgentRunHistory[];
}

export interface AgentRunHistory {
  id: string;
  agentType: "red" | "blue";
  timestamp: Date;
  results: AgentResults;
}

export interface AgentResults {
  name: string;
  description: string;
  metrics: Array<{
    label: string;
    value: string | number;
    status: string;
  }>;
  fileChanges: Array<{
    file: string;
    status: string;
    description: string;
  }>;
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
    title: "Fuel & Primary Heat Removal",
    description: "Configure sensors for reactor core and primary heat removal system",
    sensors: [
      { id: "neutron_flux", label: "Neutron Flux", type: "neutron_flux" },
      { id: "control_rod_position", label: "Control Rod Position", type: "control_rod_position" },
      { id: "primary_pressure", label: "Primary Pressure", type: "primary_pressure" },
      { id: "coolant_flow", label: "Coolant Flow", type: "coolant_flow" },
      { id: "coolant_temp_in", label: "Coolant Temp (In)", type: "coolant_temp_in" },
      { id: "coolant_temp_out", label: "Coolant Temp (Out)", type: "coolant_temp_out" },
    ],
  },
  primary_loop_instrumentation: {
    label: "Primary-Loop Instrumentation",
    title: "Primary-Loop Instrumentation",
    description: "Configure sensors for primary loop monitoring and control",
    sensors: [
      { id: "sg_inlet_pressure", label: "SG Inlet Pressure", type: "sg_inlet_pressure" },
      { id: "primary_loop_valve_position", label: "Primary Loop Valve Position", type: "primary_loop_valve_position" },
      { id: "primary_piping_radiation", label: "Primary Piping Radiation", type: "primary_piping_radiation" },
    ],
  },
  steam_generator_heat_transfer: {
    label: "Heat Transfer in Steam Generator",
    title: "Heat Transfer in Steam Generator",
    description: "Configure sensors for steam generator heat transfer monitoring",
    sensors: [
      { id: "sg_temp_in", label: "SG Temp (In)", type: "sg_temp_in" },
      { id: "sg_temp_out", label: "SG Temp (Out)", type: "sg_temp_out" },
      { id: "sg_pressure", label: "SG Pressure", type: "sg_pressure" },
      { id: "sg_level", label: "SG Level", type: "sg_level" },
      { id: "feedwater_flow", label: "Feedwater Flow", type: "feedwater_flow" },
    ],
  },
};