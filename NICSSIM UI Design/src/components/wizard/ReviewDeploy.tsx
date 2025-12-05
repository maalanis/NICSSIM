import { useEffect, useRef, useState } from "react";  
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { SimulationConfig } from "../../types/simulation";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { Progress } from "../ui/progress";

interface ReviewDeployProps {
  config: SimulationConfig;
  onDeploy: () => void;
  onSaveTemplate: () => void;
  onBack: () => void;
  onCancel: () => void;
}

export function ReviewDeploy({
  config,
  onDeploy,
  onSaveTemplate,
  onBack,
  onCancel,
}: ReviewDeployProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const [deploymentStatus, setDeploymentStatus] = useState<
    "idle" | "queued" | "building" | "starting" | "running"
  >("idle");

  // NEW: log state
  const [showLogs, setShowLogs] = useState(true);
  const [logs, setLogs] = useState<string>("");
  const [logPath, setLogPath] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const fetchWithTimeout = async (url: string, opts: RequestInit = {}, ms = 7000) => {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      return res;
    } finally {
      clearTimeout(id);
    }
  };

  // Updated: call /deploy-sim (server returns logPath)
  const deploySim = async () => {
    let res: Response;
    try {
      res = await fetchWithTimeout("http://localhost:4545/deploy-sim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: config }),
      }, 15000);
    } catch {
      throw new Error("Could not reach deploy server. Is it running?");
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Deploy endpoint failed (HTTP ${res.status}). ${txt}`);
    }
    return res.json() as Promise<{ ok: boolean; logPath: string }>;
  };

  // Connect to SSE stream
  const startLogStream = (absLogPath: string) => {
    try {
      const url = new URL("http://localhost:4545/deploy-logs/stream");
      url.searchParams.set("log", absLogPath);
      const es = new EventSource(url.toString());

      es.addEventListener("hello", () => {
        setLogs((prev) => prev + `[INFO] Connected to log stream\n`);
      });

      es.onmessage = (evt) => {
        setLogs((prev) => prev + evt.data + "\n");
      };

      es.onerror = () => {
        setLogs((prev) => prev + `[WARN] Log stream disconnected.\n`);
        es.close();
      };

      // Return a cleanup (optional; we don't strictly need it if you navigate away)
      return () => es.close();
    } catch (e) {
      setLogs((prev) => prev + `[ERR] Failed to open log stream.\n`);
      return () => {};
    }
  };

  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      setDeploymentStatus("queued");
      setDeploymentProgress(0);
      setLogs(""); // reset logs
      setShowLogs(true);

      // Start deploy (server writes currSim/config.json, spawns init.sh, returns logPath)
      const { logPath } = await deploySim();
      setLogPath(logPath);

      // Start streaming logs ASAP
      const stop = startLogStream(logPath);

      // Simulate progress while init.sh runs
      const stages = [
        { status: "queued", progress: 25, delay: 800 },
        { status: "building", progress: 50, delay: 1600 },
        { status: "starting", progress: 75, delay: 1200 },
        { status: "running", progress: 100, delay: 800 },
      ];

      for (const stage of stages) {
        await new Promise((resolve) => setTimeout(resolve, stage.delay));
        setDeploymentStatus(stage.status as any);
        setDeploymentProgress(stage.progress);
      }

      setTimeout(() => {
        onDeploy();
      }, 500);

      // Optional: stop(); // keep streaming until user leaves page
    } catch (err: any) {
      console.error(err);
      window.alert(err?.message || "Deployment failed.");
      setIsDeploying(false);
      setDeploymentStatus("idle");
      setDeploymentProgress(0);
    }
  };

  const totalPLCs = config.reactors.reduce((sum, r) => sum + r.plcs.length, 0);
  const totalSensors = config.reactors.reduce((sum, reactor) => {
    return (
      sum +
      Object.values(reactor.sections).reduce((sectionSum, section) => {
        return (
          sectionSum +
          Object.values(section).reduce((sensorSum, sensor) => {
            return sensorSum + sensor.count;
          }, 0)
        );
      }, 0)
    );
  }, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "queued":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "building":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "starting":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "running":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="p-8 bg-card border border-border rounded-2xl">
        <div className="space-y-6">
          <div>
            <h3>Configuration Summary</h3>
            <p className="text-muted-foreground mt-1">
              Review your simulation configuration before deployment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 bg-secondary rounded-xl border border-border">
              <div className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>Fleet Size</div>
              <div className="mt-2" style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                {config.project.reactorCount}
              </div>
              <div className="text-muted-foreground mt-1" style={{ fontSize: '0.75rem' }}>
                Micro-reactors
              </div>
            </div>

            <div className="p-4 bg-secondary rounded-xl border border-border">
              <div className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>Total PLCs</div>
              <div className="mt-2" style={{ fontSize: '1.5rem', fontWeight: 600 }}>{totalPLCs}</div>
              <div className="text-muted-foreground mt-1" style={{ fontSize: '0.75rem' }}>
                Controllers
              </div>
            </div>

            <div className="p-4 bg-secondary rounded-xl border border-border">
              <div className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>Total Sensors</div>
              <div className="mt-2" style={{ fontSize: '1.5rem', fontWeight: 600 }}>{totalSensors}</div>
              <div className="text-muted-foreground mt-1" style={{ fontSize: '0.75rem' }}>
                Data points
              </div>
            </div>

            <div className="p-4 bg-secondary rounded-xl border border-border">
              <div className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>Naming</div>
              <div className="mt-2 font-mono" style={{ fontSize: '1rem', fontWeight: 600 }}>
                {config.project.reactorPrefix}
                {config.project.zeroPad ? "001" : "1"}
              </div>
              <div className="text-muted-foreground mt-1" style={{ fontSize: '0.75rem' }}>
                Format
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4>Reactor Fleet</h4>
            <div className="flex flex-wrap gap-2">
              {config.reactors.map((reactor) => (
                <Badge
                  key={reactor.id}
                  className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 font-mono"
                >
                  {reactor.id}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* JSON Preview */}
      <Card className="p-8 bg-card border border-border rounded-2xl">
        <div className="space-y-4">
          <div>
            <h4>Configuration JSON</h4>
            <p className="text-muted-foreground mt-1">
              Complete configuration for deployment
            </p>
          </div>
          <div className="bg-secondary rounded-xl p-6 border border-border overflow-x-auto">
            <pre className="text-foreground font-mono" style={{ fontSize: '0.875rem' }}>
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>
        </div>
      </Card>

      {/* Deployment Progress */}
      {isDeploying && (
        <Card className="p-8 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4>Deployment Status</h4>
              <Badge className={getStatusColor(deploymentStatus)}>
                {deploymentStatus === "idle" ? "Ready" : deploymentStatus}
              </Badge>
            </div>
            <Progress value={deploymentProgress} className="h-2" />
            <div className="flex items-center gap-2 text-muted-foreground">
              {deploymentStatus === "running" ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin" />
              )}
              <span style={{ fontSize: '0.875rem' }}>
                {deploymentStatus === "queued" && "Queuing deployment..."}
                {deploymentStatus === "building" && "Building simulation environment..."}
                {deploymentStatus === "starting" && "Starting reactors and PLCs..."}
                {deploymentStatus === "running" && "Deployment complete!"}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between gap-4">
        <Button variant="outline" onClick={onBack} disabled={isDeploying}>
          Back
        </Button>
        <div className="flex gap-4">
          <Button variant="outline" onClick={onCancel} disabled={isDeploying}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={onSaveTemplate}
            disabled={isDeploying}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Save as Template
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 gap-2"
          >
            {isDeploying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deploying...
              </>
            ) : (
              "Deploy Simulation"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}