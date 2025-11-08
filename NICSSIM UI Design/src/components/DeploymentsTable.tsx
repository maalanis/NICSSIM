import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DeployedSimulation, SENSOR_SECTIONS } from "../types/simulation";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Eye } from "lucide-react";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";

interface DeploymentsTableProps {
  deployments: DeployedSimulation[];
}

export function DeploymentsTable({ deployments }: DeploymentsTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "building":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "failed":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "stopped":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const calculateStats = (deployment: DeployedSimulation) => {
    const reactorCount = deployment.config.reactors.length;
    const plcCount = deployment.config.reactors.reduce((sum, r) => sum + r.plcCount, 0);
    
    let sensorCount = 0;
    deployment.config.reactors.forEach(reactor => {
      Object.values(reactor.sections).forEach(section => {
        Object.values(section).forEach(sensor => {
          sensorCount += sensor.count;
        });
      });
    });

    return { reactorCount, plcCount, sensorCount };
  };

  const [selectedDeployment, setSelectedDeployment] = useState<DeployedSimulation | null>(null);

  if (deployments.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-12 text-center">
        <div className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>
          No deployments yet. Create your first simulation to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead>ID</TableHead>
            <TableHead>Reactors</TableHead>
            <TableHead>PLCs</TableHead>
            <TableHead>Sensors</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deployments.map((deployment) => {
            const { reactorCount, plcCount, sensorCount } = calculateStats(deployment);
            return (
              <TableRow key={deployment.id} className="border-border hover:bg-secondary/50 transition-colors">
                <TableCell className="font-mono text-foreground">{deployment.id}</TableCell>
                <TableCell className="text-foreground">{reactorCount}</TableCell>
                <TableCell className="text-foreground">{plcCount}</TableCell>
                <TableCell className="text-foreground">{sensorCount}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(deployment.status)}>
                    {deployment.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{getTimeAgo(new Date(deployment.lastUpdated))}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => setSelectedDeployment(deployment)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={selectedDeployment !== null} onOpenChange={() => setSelectedDeployment(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] bg-[#0E1626]">
          <DialogHeader>
            <DialogTitle className="text-[#9AA6B2]">Simulation Details</DialogTitle>
          </DialogHeader>
          {selectedDeployment && (
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-[#131C2E]">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="json">Configuration JSON</TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="space-y-4 mt-4">
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-3">
                      <h3 className="text-[#9AA6B2]">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-secondary/20 border border-border rounded-lg p-3">
                          <div className="text-muted-foreground mb-1">Project Name</div>
                          <div className="text-foreground font-mono">{selectedDeployment.config.project.name}</div>
                        </div>
                        <div className="bg-secondary/20 border border-border rounded-lg p-3">
                          <div className="text-muted-foreground mb-1">Status</div>
                          <Badge className={getStatusColor(selectedDeployment.status)}>
                            {selectedDeployment.status}
                          </Badge>
                        </div>
                        <div className="bg-secondary/20 border border-border rounded-lg p-3">
                          <div className="text-muted-foreground mb-1">Total Reactors</div>
                          <div className="text-foreground">{calculateStats(selectedDeployment).reactorCount}</div>
                        </div>
                        <div className="bg-secondary/20 border border-border rounded-lg p-3">
                          <div className="text-muted-foreground mb-1">Total PLCs</div>
                          <div className="text-foreground">{calculateStats(selectedDeployment).plcCount}</div>
                        </div>
                        <div className="bg-secondary/20 border border-border rounded-lg p-3">
                          <div className="text-muted-foreground mb-1">Total Sensors</div>
                          <div className="text-foreground">{calculateStats(selectedDeployment).sensorCount}</div>
                        </div>
                        <div className="bg-secondary/20 border border-border rounded-lg p-3">
                          <div className="text-muted-foreground mb-1">Deployed</div>
                          <div className="text-foreground">{getTimeAgo(new Date(selectedDeployment.deployedAt))}</div>
                        </div>
                      </div>
                    </div>

                    {/* Reactor Details */}
                    <div className="space-y-3">
                      <h3 className="text-[#9AA6B2]">Reactor Configuration</h3>
                      {selectedDeployment.config.reactors.map((reactor) => (
                        <div key={reactor.id} className="bg-secondary/30 border border-border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-mono text-foreground">{reactor.id}</div>
                            <div className="text-muted-foreground">{reactor.plcCount} PLCs</div>
                          </div>
                          
                          {/* Sensor breakdown by section */}
                          <div className="space-y-2">
                            {Object.entries(reactor.sections).map(([sectionKey, sectionData]) => {
                              const sectionInfo = SENSOR_SECTIONS[sectionKey as keyof typeof SENSOR_SECTIONS];
                              const sensorCount = Object.values(sectionData).reduce((sum, s) => sum + s.count, 0);
                              
                              if (sensorCount === 0) return null;
                              
                              return (
                                <div key={sectionKey} className="text-muted-foreground">
                                  <span className="text-foreground">{sectionInfo.label}:</span> {sensorCount} sensors
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="json" className="mt-4">
                <ScrollArea className="h-[500px]">
                  <pre className="bg-secondary/30 border border-border rounded-lg p-4 text-foreground overflow-x-auto">
                    <code>{JSON.stringify(selectedDeployment.config, null, 2)}</code>
                  </pre>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}