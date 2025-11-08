import { useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ReactorConfig, SENSOR_SECTIONS } from "../../types/simulation";
import { Badge } from "../ui/badge";

interface SensorConfigurationProps {
  reactors: ReactorConfig[];
  onSensorConfigChange: (reactorId: string, section: string, sensorId: string, config: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export function SensorConfiguration({
  reactors,
  onSensorConfigChange,
  onNext,
  onBack,
}: SensorConfigurationProps) {
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    fuel_primary_heat_removal: true,
  });

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const calculateTotals = () => {
    let totalSensors = 0;
    reactors.forEach((reactor) => {
      Object.values(reactor.sections).forEach((section) => {
        Object.values(section).forEach((sensor) => {
          totalSensors += sensor.count;
        });
      });
    });
    return totalSensors;
  };

  return (
    <div className="space-y-6">
      <Card className="p-8 bg-card border border-border rounded-2xl">
        <div className="space-y-6">
          <div>
            <h3>Sensor Configuration</h3>
            <p className="text-muted-foreground mt-1">
              Configure sensors for each reactor section with redundancy and PLC assignment.
            </p>
          </div>

          <Tabs defaultValue={reactors[0]?.id} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-secondary">
              {reactors.map((reactor) => (
                <TabsTrigger 
                  key={reactor.id} 
                  value={reactor.id} 
                  className="font-mono data-[state=active]:bg-[#FF8200] data-[state=active]:text-white"
                >
                  {reactor.id}
                </TabsTrigger>
              ))}
            </TabsList>

            {reactors.map((reactor) => (
              <TabsContent key={reactor.id} value={reactor.id} className="space-y-4 mt-6">
                {Object.entries(SENSOR_SECTIONS).map(([sectionKey, sectionData]) => {
                  const sectionId = sectionKey as keyof typeof reactor.sections;
                  const isOpen = openSections[sectionId];

                  return (
                    <Collapsible
                      key={sectionId}
                      open={isOpen}
                      onOpenChange={() => toggleSection(sectionId)}
                    >
                      <Card className="bg-secondary border-border">
                        <CollapsibleTrigger className="w-full p-6 flex items-center justify-between hover:bg-card/50 transition-colors rounded-t-2xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <span className="text-primary" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                {sectionData.sensors.length}
                              </span>
                            </div>
                            <div className="text-left">
                              <h4>{sectionData.label}</h4>
                              <p className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>
                                {sectionData.sensors.length} sensor types
                              </p>
                            </div>
                          </div>
                          {isOpen ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="p-6 pt-0 space-y-4">
                            {sectionData.sensors.map((sensor) => {
                              const sensorConfig = reactor.sections[sectionId]?.[sensor.id] || {
                                count: 1,
                                redundancy: "None",
                                plcOrder: [],
                                instances: [],
                              };

                              // Ensure instances array matches count
                              if (!sensorConfig.instances || sensorConfig.instances.length !== sensorConfig.count) {
                                sensorConfig.instances = Array.from({ length: sensorConfig.count }, () => ({ plcIds: [] }));
                              }

                              return (
                                <div
                                  key={sensor.id}
                                  className="p-4 bg-card rounded-xl border border-border space-y-4"
                                >
                                  <div className="flex items-center justify-between">
                                    <Label>{sensor.label}</Label>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label style={{ fontSize: '0.75rem' }} className="text-muted-foreground">
                                        Sensor Count
                                      </Label>
                                      <Input
                                        type="number"
                                        min={1}
                                        max={5}
                                        value={sensorConfig.count}
                                        onChange={(e) => {
                                          const newCount = Math.min(5, Math.max(1, parseInt(e.target.value) || 1));
                                          const newInstances = Array.from({ length: newCount }, (_, i) => 
                                            sensorConfig.instances?.[i] || { plcIds: [] }
                                          );
                                          onSensorConfigChange(reactor.id, sectionId, sensor.id, {
                                            ...sensorConfig,
                                            count: newCount,
                                            instances: newInstances,
                                          });
                                        }}
                                        className="bg-secondary border-border"
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <Label style={{ fontSize: '0.75rem' }} className="text-muted-foreground">
                                        PLC Assignment
                                      </Label>
                                      <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
                                        Click badges below to assign PLCs to each sensor instance
                                      </p>
                                    </div>
                                  </div>

                                  {/* Individual sensor instances */}
                                  <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                                    {sensorConfig.instances.map((instance, instanceIndex) => (
                                      <div key={instanceIndex} className="space-y-2">
                                        <Label style={{ fontSize: '0.75rem' }}>
                                          {sensor.label} #{instanceIndex + 1}
                                        </Label>
                                        <div className="flex flex-wrap gap-1">
                                          {reactor.plcs.map((plc) => {
                                            const isAssigned = instance.plcIds?.includes(plc.id) || false;
                                            return (
                                              <Badge
                                                key={plc.id}
                                                className={`cursor-pointer transition-all ${
                                                  isAssigned
                                                    ? 'bg-primary text-primary-foreground border-primary'
                                                    : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'
                                                }`}
                                                style={{ fontSize: '0.75rem' }}
                                                onClick={() => {
                                                  const currentPLCs = instance.plcIds || [];
                                                  const newPLCs = isAssigned
                                                    ? currentPLCs.filter((id: string) => id !== plc.id)
                                                    : [...currentPLCs, plc.id];
                                                  
                                                  const newInstances = [...sensorConfig.instances];
                                                  newInstances[instanceIndex] = { plcIds: newPLCs };
                                                  
                                                  onSensorConfigChange(reactor.id, sectionId, sensor.id, {
                                                    ...sensorConfig,
                                                    instances: newInstances,
                                                  });
                                                }}
                                              >
                                                {plc.id}
                                              </Badge>
                                            );
                                          })}
                                        </div>
                                        {instance.plcIds && instance.plcIds.length > 0 && (
                                          <p className="text-muted-foreground" style={{ fontSize: '0.625rem' }}>
                                            Monitored by: {instance.plcIds.join(', ')}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </Card>

      {/* Summary Panel */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>Total Sensors</div>
            <div className="mt-1" style={{ fontSize: '2rem', fontWeight: 600 }}>{calculateTotals()}</div>
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
          Next: Review & Deploy
        </Button>
      </div>
    </div>
  );
}