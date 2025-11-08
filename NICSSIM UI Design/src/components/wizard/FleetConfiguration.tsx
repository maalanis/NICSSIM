import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Minus, Plus } from "lucide-react";

interface FleetConfigurationProps {
  reactorCount: number;
  reactorPrefix: string;
  zeroPad: boolean;
  onReactorCountChange: (count: number) => void;
  onReactorPrefixChange: (prefix: string) => void;
  onZeroPadChange: (enabled: boolean) => void;
  onNext: () => void;
}

export function FleetConfiguration({
  reactorCount,
  reactorPrefix,
  zeroPad,
  onReactorCountChange,
  onReactorPrefixChange,
  onZeroPadChange,
  onNext,
}: FleetConfigurationProps) {
  const generateReactorNames = () => {
    const names = [];
    for (let i = 1; i <= reactorCount; i++) {
      const number = zeroPad ? String(i).padStart(3, "0") : String(i);
      names.push(`${reactorPrefix}${number}`);
    }
    return names;
  };

  const reactorNames = generateReactorNames();

  return (
    <div className="space-y-6">
      <Card className="p-8 bg-card border border-border rounded-2xl">
        <div className="space-y-6">
          <div>
            <h3>Fleet Size</h3>
            <p className="text-muted-foreground mt-1">
              Configure the number of micro-reactors in your simulation fleet.
            </p>
          </div>

          {/* Reactor Count */}
          <div className="space-y-2">
            <Label>Number of Micro-Reactors</Label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onReactorCountChange(Math.max(1, reactorCount - 1))}
                disabled={reactorCount <= 1}
                className="h-12 w-12"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="flex-1 max-w-[200px]">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={reactorCount}
                  onChange={(e) => onReactorCountChange(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="text-center bg-secondary border-border"
                  style={{ fontSize: '1.25rem', fontWeight: 600 }}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onReactorCountChange(Math.min(10, reactorCount + 1))}
                disabled={reactorCount >= 10}
                className="h-12 w-12"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
              Choose between 1 and 10 reactors
            </p>
          </div>
        </div>
      </Card>

      {/* Preview */}
      <Card className="p-8 bg-card border border-border rounded-2xl">
        <div className="space-y-4">
          <div>
            <h4>Reactor Fleet Preview</h4>
            <p className="text-muted-foreground mt-1">
              Generated reactor identifiers based on your configuration
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {reactorNames.map((name) => (
              <Badge
                key={name}
                className="bg-primary/10 text-primary border border-primary/20 px-4 py-2"
              >
                {name}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          onClick={onNext}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
        >
          Next: PLC Configuration
        </Button>
      </div>
    </div>
  );
}