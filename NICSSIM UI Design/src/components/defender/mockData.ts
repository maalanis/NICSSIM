import { ScenarioData, AttackEvent } from './types';

// Generate history data for sparklines
const generateHistory = (baseValue: number, variance: number, points: number = 20): number[] => {
  return Array.from({ length: points }, () => 
    baseValue + (Math.random() - 0.5) * variance
  );
};

const normalEvents: AttackEvent[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 300000),
    type: 'detection',
    attackType: 'None',
    detectionTime: 0,
    confidence: 100
  }
];

const attackEvents: AttackEvent[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 120000),
    type: 'attack_start',
    attackType: 'Sensor Manipulation'
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 101700),
    type: 'detection',
    attackType: 'Sensor Manipulation',
    detectionTime: 18.3,
    confidence: 92
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 95000),
    type: 'response',
    attackType: 'Sensor Manipulation'
  }
];

const learningEvents: AttackEvent[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 180000),
    type: 'detection',
    attackType: 'Training Data Collection',
    detectionTime: 0,
    confidence: 85
  }
];

export const SCENARIOS: Record<string, ScenarioData> = {
  normal: {
    state: 'normal',
    metrics: {
      temperature: {
        name: 'Core Temperature',
        value: 302.5,
        unit: '°C',
        variance: 1.2,
        status: 'normal',
        history: generateHistory(302.5, 2.4)
      },
      coolantFlow: {
        name: 'Coolant Flow',
        value: 1987,
        unit: 'L/s',
        variance: 15.3,
        status: 'normal',
        history: generateHistory(1987, 30)
      },
      pressure: {
        name: 'Primary Pressure',
        value: 155.2,
        unit: 'bar',
        variance: 0.8,
        status: 'normal',
        history: generateHistory(155.2, 1.6)
      },
      controlRodPosition: {
        name: 'Control Rod Position',
        value: 45,
        unit: '%',
        variance: 2.1,
        status: 'normal',
        history: generateHistory(45, 4)
      }
    },
    defender: {
      isActive: true,
      confidence: null,
      attackType: null,
      detectionTime: null,
      modelsActive: {
        baseline: true,
        isolationForest: true,
        lstm: false
      }
    },
    events: normalEvents,
    varianceComparison: {
      baseline: { temperature: 1.2, flow: 15.3, pressure: 0.8 },
      current: { temperature: 1.2, flow: 15.3, pressure: 0.8 }
    }
  },
  
  attack: {
    state: 'attack',
    metrics: {
      temperature: {
        name: 'Core Temperature',
        value: 318.7,
        unit: '°C',
        variance: 4.2,
        status: 'critical',
        history: generateHistory(318.7, 25)
      },
      coolantFlow: {
        name: 'Coolant Flow',
        value: 1654,
        unit: 'L/s',
        variance: 99.4,
        status: 'critical',
        history: generateHistory(1654, 200)
      },
      pressure: {
        name: 'Primary Pressure',
        value: 162.1,
        unit: 'bar',
        variance: 5.1,
        status: 'warning',
        history: generateHistory(162.1, 10)
      },
      controlRodPosition: {
        name: 'Control Rod Position',
        value: 38,
        unit: '%',
        variance: 8.4,
        status: 'warning',
        history: generateHistory(38, 16)
      }
    },
    defender: {
      isActive: true,
      confidence: 92,
      attackType: 'Sensor Manipulation',
      detectionTime: 18.3,
      modelsActive: {
        baseline: true,
        isolationForest: true,
        lstm: false
      }
    },
    events: attackEvents,
    varianceComparison: {
      baseline: { temperature: 1.2, flow: 15.3, pressure: 0.8 },
      current: { temperature: 4.2, flow: 99.4, pressure: 5.1 }
    }
  },
  
  learning: {
    state: 'learning',
    metrics: {
      temperature: {
        name: 'Core Temperature',
        value: 298.3,
        unit: '°C',
        variance: 2.1,
        status: 'normal',
        history: generateHistory(298.3, 4)
      },
      coolantFlow: {
        name: 'Coolant Flow',
        value: 2010,
        unit: 'L/s',
        variance: 22.7,
        status: 'normal',
        history: generateHistory(2010, 45)
      },
      pressure: {
        name: 'Primary Pressure',
        value: 154.8,
        unit: 'bar',
        variance: 1.3,
        status: 'normal',
        history: generateHistory(154.8, 2.6)
      },
      controlRodPosition: {
        name: 'Control Rod Position',
        value: 47,
        unit: '%',
        variance: 3.2,
        status: 'normal',
        history: generateHistory(47, 6)
      }
    },
    defender: {
      isActive: true,
      confidence: 85,
      attackType: null,
      detectionTime: null,
      modelsActive: {
        baseline: true,
        isolationForest: true,
        lstm: true
      }
    },
    events: learningEvents,
    varianceComparison: {
      baseline: { temperature: 1.2, flow: 15.3, pressure: 0.8 },
      current: { temperature: 2.1, flow: 22.7, pressure: 1.3 }
    }
  }
};

export const PERFORMANCE_STATS = {
  avgDetectionTime: 22.1,
  accuracy: 94.2,
  falsePositiveRate: 1.8,
  totalAttacksDetected: 47,
  totalSamplesCollected: 5991
};
