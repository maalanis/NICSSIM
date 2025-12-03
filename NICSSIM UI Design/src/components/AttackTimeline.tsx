import { AttackEvent } from "./types";
import { AlertTriangle, Shield, Zap, Clock } from "lucide-react";
import { PERFORMANCE_STATS } from "./mockData";

interface AttackTimelineProps {
  events: AttackEvent[];
  state: 'normal' | 'attack' | 'learning';
}

export function AttackTimeline({ events, state }: AttackTimelineProps) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    
    if (diffMin < 1) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    return `${Math.floor(diffMin / 60)}h ago`;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'attack_start':
        return { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' };
      case 'detection':
        return { icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10' };
      case 'response':
        return { icon: Zap, color: 'text-green-500', bg: 'bg-green-500/10' };
      default:
        return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-500/10' };
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'attack_start':
        return 'Attack Initiated';
      case 'detection':
        return 'Threat Detected';
      case 'response':
        return 'Response Activated';
      default:
        return 'Event';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">Attack Timeline</h3>
        <span className="text-xs text-muted-foreground">Last 5 minutes</span>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-secondary/20 border border-border rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Avg Detection</div>
          <div className="text-xl font-semibold text-foreground">
            {PERFORMANCE_STATS.avgDetectionTime}s
          </div>
        </div>
        <div className="bg-secondary/20 border border-border rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Accuracy</div>
          <div className="text-xl font-semibold text-green-500">
            {PERFORMANCE_STATS.accuracy}%
          </div>
        </div>
        <div className="bg-secondary/20 border border-border rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">False Positive</div>
          <div className="text-xl font-semibold text-foreground">
            {PERFORMANCE_STATS.falsePositiveRate}%
          </div>
        </div>
        <div className="bg-secondary/20 border border-border rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Attacks Detected</div>
          <div className="text-xl font-semibold text-foreground">
            {PERFORMANCE_STATS.totalAttacksDetected}
          </div>
        </div>
      </div>

      {/* Timeline Events */}
      <div className="bg-secondary/20 border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-4">Recent Events</h4>
        
        <div className="space-y-3">
          {events.map((event, index) => {
            const eventStyle = getEventIcon(event.type);
            const EventIcon = eventStyle.icon;
            
            return (
              <div key={event.id} className="flex items-start gap-3 relative">
                {/* Timeline line */}
                {index < events.length - 1 && (
                  <div className="absolute left-[18px] top-[36px] w-0.5 h-full bg-border" />
                )}
                
                {/* Icon */}
                <div className={`w-9 h-9 rounded-lg ${eventStyle.bg} flex items-center justify-center flex-shrink-0 relative z-10`}>
                  <EventIcon className={`w-4 h-4 ${eventStyle.color}`} />
                </div>
                
                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {getEventLabel(event.type)}
                      </div>
                      {event.attackType && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {event.attackType}
                        </div>
                      )}
                      {event.detectionTime && (
                        <div className="text-xs text-blue-400 mt-0.5">
                          Detected in {event.detectionTime}s
                        </div>
                      )}
                      {event.confidence && (
                        <div className="text-xs text-green-400 mt-0.5">
                          {event.confidence}% confidence
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(event.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {events.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No recent events
          </div>
        )}
      </div>

      {/* Data Collection Status */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Samples Collected: <span className="font-semibold text-foreground">
              {PERFORMANCE_STATS.totalSamplesCollected.toLocaleString()}
            </span>
          </div>
          <div className="text-xs text-primary font-medium">
            Target: 50,000+
          </div>
        </div>
      </div>
    </div>
  );
}
