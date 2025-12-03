export type ScenarioState = 'normal' | 'attack' | 'learning';

export interface ReactorMetric {
  name: string;
  value: number;
  unit: string;
  variance: number;
  status: 'normal' | 'warning' | 'critical';
  history: number[];
}

export interface DefenderStatus {
  isActive: boolean;
  confidence: number | null;
  attackType: string | null;
  detectionTime: number | null;
  modelsActive: {
    baseline: boolean;
    isolationForest: boolean;
    lstm: boolean;
  };
}

export interface AttackEvent {
  id: string;
  timestamp: Date;
  type: 'attack_start' | 'detection' | 'response';
  attackType?: string;
  detectionTime?: number;
  confidence?: number;
}

export interface ScenarioData {
  state: ScenarioState;
  metrics: {
    temperature: ReactorMetric;
    coolantFlow: ReactorMetric;
    pressure: ReactorMetric;
    controlRodPosition: ReactorMetric;
  };
  defender: DefenderStatus;
  events: AttackEvent[];
  varianceComparison: {
    baseline: { temperature: number; flow: number; pressure: number };
    current: { temperature: number; flow: number; pressure: number };
  };
}
