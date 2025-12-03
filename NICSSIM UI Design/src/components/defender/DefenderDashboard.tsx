import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ReactorStatusPanel } from "./ReactorStatusPanel";
import { DefenderMonitor } from "./DefenderMonitor";
import { VarianceAnalysis } from "./VarianceAnalysis";
import { AttackTimeline } from "./AttackTimeline";
import { SCENARIOS } from "./mockData";
import { ScenarioState } from "./types";
import { Shield, Activity, Brain } from "lucide-react";

export function DefenderDashboard() {
  const [currentScenario, setCurrentScenario] = useState<ScenarioState>('normal');
  const data = SCENARIOS[currentScenario];

  const scenarios = [
    {
      id: 'normal' as ScenarioState,
      label: 'Normal Operations',
      icon: Shield,
      badgeClass: 'bg-green-500/10 text-green-500 border-green-500/20'
    },
    {
      id: 'attack' as ScenarioState,
      label: 'Active Attack',
      icon: Activity,
      badgeClass: 'bg-red-500/10 text-red-500 border-red-500/20'
    },
    {
      id: 'learning' as ScenarioState,
      label: 'Learning Mode',
      icon: Brain,
      badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-foreground">Defender AI Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time cyber-attack detection and adaptive defense system
          </p>
        </div>
      </div>

      {/* Scenario Selector */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-foreground mb-1">Simulation Mode</h3>
            <p className="text-xs text-muted-foreground">
              Switch between scenarios to demonstrate defender capabilities
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {scenarios.map((scenario) => {
              const Icon = scenario.icon;
              const isActive = currentScenario === scenario.id;
              
              return (
                <Button
                  key={scenario.id}
                  onClick={() => setCurrentScenario(scenario.id)}
                  variant={isActive ? "default" : "outline"}
                  className={isActive ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md" : ""}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {scenario.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4-Quadrant Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Left - Reactor Status */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <ReactorStatusPanel metrics={data.metrics} />
        </div>

        {/* Top Right - Defender Monitor */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <DefenderMonitor defender={data.defender} state={data.state} />
        </div>

        {/* Bottom Left - Variance Analysis */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <VarianceAnalysis 
            varianceComparison={data.varianceComparison} 
            state={data.state}
          />
        </div>

        {/* Bottom Right - Attack Timeline */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <AttackTimeline events={data.events} state={data.state} />
        </div>
      </div>

    </div>
  );
}
