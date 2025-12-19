// NICSSIM UI Design/src/components/FileChangeDetail.tsx
import { useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { ArrowLeft, FileCode, AlertTriangle, CheckCircle2, Shield, Swords, Info } from "lucide-react";

interface FileChange {
  file: string;
  status: string;
  description: string;
}

interface VulnIssue {
  id: string;
  title: string;
  severity: string;
  cwe?: string;
  description: string;
  start_line?: number;
  end_line?: number;
  vulnerable_code?: string;
  fixed_code?: string;
  impact?: string;
  recommendation?: string;
}

interface VulnFileResult {
  file_path: string;
  file_risk_percent: number;
  issues: VulnIssue[];
}

interface FileChangeDetailProps {
  fileChange: FileChange;
  agentType: "red" | "blue";
  onBack: () => void;
}

export function FileChangeDetail({ fileChange, agentType, onBack }: FileChangeDetailProps) {
  const [data, setData] = useState<VulnFileResult | null>(null);
  const [topIssue, setTopIssue] = useState<VulnIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/vulns/file?path=${encodeURIComponent(fileChange.file)}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch file vuln: ${res.statusText}`);
        }
        const json: VulnFileResult = await res.json();
        setData(json);
        setTopIssue(json.issues?.[0] ?? null);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load vulnerability details");
      } finally {
        setLoading(false);
      }
    };

    fetchFile();
  }, [fileChange.file]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "high":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "resolved":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  // Derived view model with fallbacks so UI doesn't explode
  const severity = topIssue?.severity || (fileChange.status === "vulnerable" ? "high" : "resolved");
  const cweRef = topIssue?.cwe || "N/A";
  const affectedLines =
    topIssue?.start_line && topIssue?.end_line
      ? `Lines ${topIssue.start_line}–${topIssue.end_line}`
      : "Unknown";
  const vulnerableCode = topIssue?.vulnerable_code || "// No vulnerable code snippet available";
  const fixedCode = topIssue?.fixed_code || "// No recommended fix available";
  const impact =
    topIssue?.impact ||
    "Impact details not provided. Review the vulnerable code and assess impact based on your environment.";
  const recommendation =
    topIssue?.recommendation ||
    "No specific recommendation available. Follow secure coding guidelines and relevant CWE documentation.";

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-8">
        <Button variant="ghost" onClick={onBack} className="mb-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Agent Results
        </Button>
        <div className="text-muted-foreground">Loading vulnerability details...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-8">
        <Button variant="ghost" onClick={onBack} className="mb-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Agent Results
        </Button>
        <div className="text-red-500">Error: {error || "No data found for this file"}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Agent Results
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {agentType === "red" ? (
                <Swords className="h-6 w-6 text-red-500 flex-shrink-0" />
              ) : (
                <Shield className="h-6 w-6 text-blue-500 flex-shrink-0" />
              )}
              <h1 className="text-foreground">File Change Analysis</h1>
            </div>
            <p className="text-muted-foreground font-mono break-all">{data.file_path}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Badge className={getSeverityColor(severity)}>
              {agentType === "red" ? severity : "resolved"}
            </Badge>
            <Badge className={
              fileChange.status === "vulnerable" || fileChange.status === "exposed"
                ? "bg-red-500/10 text-red-500 border-red-500/20"
                : "bg-green-500/10 text-green-500 border-green-500/20"
            }>
              {fileChange.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Summary Card */}
        <div className={`border-2 rounded-2xl p-6 ${
          agentType === "red" 
            ? "bg-red-500/5 border-red-500/20" 
            : "bg-blue-500/5 border-blue-500/20"
        }`}>
          <div className="flex items-start gap-3">
            <FileCode className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-[#9AA6B2] mb-2">Description</h3>
              <p className="text-foreground mb-4">
                {topIssue?.title || fileChange.description}
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-secondary/30 border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <div className="text-muted-foreground">CWE Reference</div>
                  </div>
                  <div className="text-foreground">{cweRef}</div>
                </div>
                
                <div className="bg-secondary/30 border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <div className="text-muted-foreground">Affected Lines</div>
                  </div>
                  <div className="text-foreground">{affectedLines}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Code Comparison */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <Tabs defaultValue="comparison" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-[#131C2E] mb-6">
              <TabsTrigger value="comparison">Code Comparison</TabsTrigger>
              <TabsTrigger value="impact">Impact Analysis</TabsTrigger>
              <TabsTrigger value="recommendation">Recommendations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="comparison">
              <ScrollArea className="h-[calc(100vh-28rem)]">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Before */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {agentType === "red" ? (
                        <>
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          <h3 className="text-[#9AA6B2]">Vulnerable Code</h3>
                        </>
                      ) : (
                        <>
                          <FileCode className="h-5 w-5 text-muted-foreground" />
                          <h3 className="text-[#9AA6B2]">Before</h3>
                        </>
                      )}
                    </div>
                    <div className="bg-red-500/5 border-2 border-red-500/20 rounded-lg p-4">
                      <pre className="text-foreground overflow-x-auto">
                        <code>{vulnerableCode}</code>
                      </pre>
                    </div>
                  </div>
                  
                  {/* After */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {agentType === "blue" ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <h3 className="text-[#9AA6B2]">Patched Code</h3>
                        </>
                      ) : (
                        <>
                          <FileCode className="h-5 w-5 text-muted-foreground" />
                          <h3 className="text-[#9AA6B2]">Recommended Fix</h3>
                        </>
                      )}
                    </div>
                    <div className="bg-green-500/5 border-2 border-green-500/20 rounded-lg p-4">
                      <pre className="text-foreground overflow-x-auto">
                        <code>{fixedCode}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="impact">
              <ScrollArea className="h-[calc(100vh-28rem)]">
                <div className="bg-secondary/20 border border-border rounded-lg p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className={`h-6 w-6 flex-shrink-0 ${
                      agentType === "red" ? "text-red-500" : "text-green-500"
                    }`} />
                    <div>
                      <h3 className="text-[#9AA6B2] mb-2">Security Impact</h3>
                      <p className="text-foreground leading-relaxed">{impact}</p>
                    </div>
                  </div>

                  {/* Keep the existing exploitation/protection blocks, unchanged */}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="recommendation">
              <ScrollArea className="h-[calc(100vh-28rem)]">
                <div className="space-y-4">
                  <div className="bg-secondary/20 border border-border rounded-lg p-6">
                    <div className="flex items-start gap-3">
                      <Info className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-[#9AA6B2] mb-2">
                          {agentType === "red" ? "Remediation Steps" : "Next Steps"}
                        </h3>
                        <p className="text-foreground leading-relaxed">{recommendation}</p>
                      </div>
                    </div>
                  </div>

                  {/* Keep “Additional Resources” section as-is */}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
