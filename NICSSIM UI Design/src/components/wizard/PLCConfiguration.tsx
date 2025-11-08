import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

interface PLCConfigurationProps {
  reactors: Array<{ id: string; plcCount: number }>;
  samePLCCount: boolean;
  plcsPerReactor: number;
  onSamePLCCountChange: (enabled: boolean) => void;
  onPLCsPerReactorChange: (count: number) => void;
  onReactorPLCCountChange: (reactorId: string, count: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PLCConfiguration({
  reactors,
  samePLCCount,
  plcsPerReactor,
  onSamePLCCountChange,
  onPLCsPerReactorChange,
  onReactorPLCCountChange,
  onNext,
  onBack,
}: PLCConfigurationProps) {
  const totalPLCs = reactors.reduce((sum, r) => sum + r.plcCount, 0);

  return (
    <div className="space-y-6">
      <Card className="p-8 bg-card border border-border rounded-2xl">
        <div className="space-y-6">
          <div>
            <h3>PLC Configuration</h3>
            <p className="text-muted-foreground mt-1">
              Configure the number of Programmable Logic Controllers for each reactor.
            </p>
          </div>

          {/* Same PLC Count Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary rounded-xl border border-border">
              <div>
                <Label>Same PLC count for all reactors</Label>
                <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>
                  Apply uniform PLC configuration across the fleet
                </p>
              </div>
              <Switch
                checked={samePLCCount}
                onCheckedChange={onSamePLCCountChange}
              />
            </div>

            {samePLCCount ? (
              <div className="space-y-2">
                <Label>PLCs per Reactor</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={plcsPerReactor}
                  onChange={(e) => onPLCsPerReactorChange(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="max-w-[200px] bg-secondary border-border"
                />
                <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
                  Each reactor will have {plcsPerReactor} PLC{plcsPerReactor !== 1 ? 's' : ''}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Individual PLC Configuration</Label>
                <div className="bg-secondary border border-border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead>Reactor ID</TableHead>
                        <TableHead>PLC Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reactors.map((reactor) => (
                        <TableRow key={reactor.id} className="border-border hover:bg-card/50">
                          <TableCell className="font-mono">{reactor.id}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={reactor.plcCount}
                              onChange={(e) =>
                                onReactorPLCCountChange(
                                  reactor.id,
                                  Math.min(10, Math.max(1, parseInt(e.target.value) || 1))
                                )
                              }
                              className="max-w-[150px] bg-card border-border"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Summary Panel */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>Total PLCs</div>
            <div className="mt-1" style={{ fontSize: '2rem', fontWeight: 600 }}>{totalPLCs}</div>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>Across Reactors</div>
            <div className="mt-1" style={{ fontSize: '2rem', fontWeight: 600 }}>{reactors.length}</div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-between gap-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={onNext}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
        >
          Next: Sensor Configuration
        </Button>
      </div>
    </div>
  );
}
