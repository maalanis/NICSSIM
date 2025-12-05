import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DeployedSimulation } from "../types/simulation";
import { Eye } from "lucide-react";
import { Button } from "./ui/button";

interface DeploymentsTableProps {
  deployments: DeployedSimulation[];
  onViewDeployment: (deploymentId: string) => void;
}

export function DeploymentsTable({ deployments, onViewDeployment }: DeploymentsTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
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
                    onClick={() => onViewDeployment(deployment.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}