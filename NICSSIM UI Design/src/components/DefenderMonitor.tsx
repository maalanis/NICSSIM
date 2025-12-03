import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { DefenderStatus } from "./types";
import { Shield, AlertTriangle, CheckCircle, Clock, Brain } from "lucide-react";

interface DefenderMonitorProps {
  defender: DefenderStatus;
  state: 'normal' | 'attack' | 'learning';
}

export function DefenderMonitor({ defender, state }: DefenderMonitorProps) {
  const getStatusDisplay = () => {
    if (state === 'attack' && defender.attackType) {
      return {
        icon: AlertTriangle,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/50',
        title: 'ATTACK DETECTED',
        message: defender.attackType,
        badgeClass: 'bg-red-500/10 text-red-500 border-red-500/20'
      };
    }
    
    if (state === 'learning') {
      return {
        icon: Brain,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/50',
        title: 'LEARNING MODE',
        message: 'Training adaptive models',
        badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      };
    }
    
    return {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/50',
      title: 'ALL SYSTEMS NOMINAL',
      message: 'No threats detected',
      badgeClass: 'bg-green-500/10 text-green-500 border-green-500/20'
    };
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">Defender AI Monitor</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">Active</span>
        </div>
      </div>

      {/* Main Alert Card */}
      <div className={`bg-secondary/20 border-2 ${status.borderColor} rounded-lg p-6`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-lg ${status.bgColor} flex items-center justify-center flex-shrink-0`}>
            <StatusIcon className={`w-6 h-6 ${status.color}`} />
          </div>
          <div className="flex-1">
            <h4 className={`font-semibold ${status.color} mb-1`}>{status.title}</h4>
            <p className="text-sm text-muted-foreground">{status.message}</p>
          </div>
        </div>

        {/* Confidence Score */}
        {defender.confidence !== null && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Detection Confidence</span>
              <span className="text-lg font-semibold text-foreground">{defender.confidence}%</span>
            </div>
            <Progress 
              value={defender.confidence} 
              className="h-2"
            />
          </div>
        )}

        {/* Detection Time */}
        {defender.detectionTime !== null && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Detection Time:</span>
            <span className="font-semibold text-foreground">{defender.detectionTime}s</span>
          </div>
        )}
      </div>

      {/* Active Models */}
      <div className="bg-secondary/20 border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Active Defense Models
        </h4>
        <div className="space-y-2">
          {Object.entries(defender.modelsActive).map(([model, isActive]) => {
            const modelNames = {
              baseline: 'Baseline Statistics',
              isolationForest: 'Isolation Forest',
              lstm: 'LSTM Temporal'
            };
            
            return (
              <div key={model} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{modelNames[model as keyof typeof modelNames]}</span>
                <Badge className={
                  isActive 
                    ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                    : 'bg-muted text-muted-foreground'
                }>
                  {isActive ? 'Active' : 'Standby'}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
