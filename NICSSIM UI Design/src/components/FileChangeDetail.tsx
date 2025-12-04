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

interface FileChangeDetailProps {
  fileChange: FileChange;
  agentType: "red" | "blue";
  onBack: () => void;
}

export function FileChangeDetail({ fileChange, agentType, onBack }: FileChangeDetailProps) {
  // Mock code before/after based on the file
  const getCodeComparison = () => {
    const fileName = fileChange.file.split('/').pop() || '';
    
    if (fileName === 'reactor_controller.py') {
      return {
        before: `def get_reactor_data(reactor_id):
    # Vulnerable: Direct string interpolation
    query = "SELECT * FROM reactors WHERE id = '" + reactor_id + "'"
    cursor.execute(query)
    return cursor.fetchall()

def update_reactor_status(reactor_id, status):
    query = f"UPDATE reactors SET status = '{status}' WHERE id = '{reactor_id}'"
    cursor.execute(query)
    db.commit()`,
        after: `def get_reactor_data(reactor_id):
    # Fixed: Parameterized query prevents SQL injection
    query = "SELECT * FROM reactors WHERE id = ?"
    cursor.execute(query, (reactor_id,))
    return cursor.fetchall()

def update_reactor_status(reactor_id, status):
    query = "UPDATE reactors SET status = ? WHERE id = ?"
    cursor.execute(query, (status, reactor_id))
    db.commit()`,
        severity: agentType === "red" ? "critical" : "resolved",
        impact: agentType === "red" 
          ? "Attackers can execute arbitrary SQL commands, potentially accessing, modifying, or deleting sensitive reactor data."
          : "SQL injection vulnerability has been eliminated using parameterized queries.",
        recommendation: agentType === "red"
          ? "Implement parameterized queries immediately. Use ORM frameworks or prepared statements to prevent SQL injection attacks."
          : "Continue monitoring database query patterns. Consider implementing database activity monitoring (DAM).",
        cveReference: "CWE-89: SQL Injection",
        affectedLines: [2, 3, 7, 8],
      };
    } else if (fileName === 'authentication.py') {
      return {
        before: `import hashlib

def hash_password(password):
    # Weak: MD5 is cryptographically broken
    return hashlib.md5(password.encode()).hexdigest()

def verify_password(password, hash):
    return hash_password(password) == hash`,
        after: `import bcrypt

def hash_password(password):
    # Strong: bcrypt with appropriate work factor
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode(), salt)

def verify_password(password, hash):
    return bcrypt.checkpw(password.encode(), hash)`,
        severity: agentType === "red" ? "high" : "resolved",
        impact: agentType === "red"
          ? "Weak password hashing allows attackers to crack passwords using rainbow tables or brute force attacks."
          : "Upgraded to bcrypt with sufficient work factor, making password cracking computationally infeasible.",
        recommendation: agentType === "red"
          ? "Migrate to bcrypt, scrypt, or Argon2. Implement password policies requiring complexity and rotation."
          : "Enforce password complexity requirements and implement multi-factor authentication.",
        cveReference: "CWE-327: Use of a Broken or Risky Cryptographic Algorithm",
        affectedLines: [4, 5],
      };
    } else if (fileName === 'network_config.yaml') {
      return {
        before: `database:\n  host: 10.0.0.15\n  port: 5432\n  username: reactor_admin\n  password: \"R3act0r_P@ssw0rd_2024\"\n  \napi:\n  key: \"sk_live_51HqJ9K2eZvKYlo2CqwN8xYz\"\n  secret: \"whsec_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6\"`,
        after: `database:\n  host: \${DB_HOST}\n  port: \${DB_PORT}\n  username: \${DB_USERNAME}\n  password: \${DB_PASSWORD}\n  \napi:\n  key: \${API_KEY}\n  secret: \${API_SECRET}`,
        severity: agentType === "red" ? "critical" : "resolved",
        impact: agentType === "red"
          ? "Hardcoded credentials exposed in configuration files can be extracted by anyone with repository access."
          : "Credentials moved to environment variables with proper secret management.",
        recommendation: agentType === "red"
          ? "Immediately rotate all exposed credentials. Use environment variables or secret management systems like HashiCorp Vault."
          : "Implement secret rotation policies. Use AWS Secrets Manager or similar for production environments.",
        cveReference: "CWE-798: Use of Hard-coded Credentials",
        affectedLines: [5, 8, 9],
      };
    } else {
      return {
        before: `def process_sensor_data(data):
    # Missing validation
    reactor_id = data['reactor_id']
    sensor_value = data['value']
    
    return update_database(reactor_id, sensor_value)`,
        after: `def process_sensor_data(data):
    # Added input validation and sanitization
    if not isinstance(data, dict):
        raise ValueError("Invalid data format")
    
    reactor_id = validate_reactor_id(data.get('reactor_id'))
    sensor_value = sanitize_sensor_value(data.get('value'))
    
    # Rate limiting check
    if not check_rate_limit(reactor_id):
        raise RateLimitExceeded("Too many requests")
    
    return update_database(reactor_id, sensor_value)`,
        severity: agentType === "red" ? "high" : "resolved",
        impact: agentType === "red"
          ? "Missing input validation allows injection of malicious data, potentially causing system instability or data corruption."
          : "Input validation and rate limiting implemented to prevent abuse and ensure data integrity.",
        recommendation: agentType === "red"
          ? "Implement comprehensive input validation, sanitization, and rate limiting on all API endpoints."
          : "Monitor API usage patterns and adjust rate limits based on legitimate traffic patterns.",
        cveReference: "CWE-20: Improper Input Validation",
        affectedLines: [2, 3, 4],
      };
    }
  };

  const codeData = getCodeComparison();

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
            <p className="text-muted-foreground font-mono break-all">{fileChange.file}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Badge className={getSeverityColor(codeData.severity)}>
              {codeData.severity}
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
              <p className="text-foreground mb-4">{fileChange.description}</p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-secondary/30 border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <div className="text-muted-foreground">CWE Reference</div>
                  </div>
                  <div className="text-foreground">{codeData.cveReference}</div>
                </div>
                
                <div className="bg-secondary/30 border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <div className="text-muted-foreground">Affected Lines</div>
                  </div>
                  <div className="text-foreground">Lines {codeData.affectedLines.join(', ')}</div>
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
                        <code>{codeData.before}</code>
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
                        <code>{codeData.after}</code>
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
                      <p className="text-foreground leading-relaxed">{codeData.impact}</p>
                    </div>
                  </div>
                  
                  {agentType === "red" && (
                    <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <div className="text-red-500">Exploitation Potential</div>
                      </div>
                      <ul className="text-foreground space-y-2 ml-7">
                        <li>• Unauthorized data access or modification</li>
                        <li>• Potential system compromise</li>
                        <li>• Data exfiltration risk</li>
                        <li>• Compliance violations (NERC CIP, NIST 800-82)</li>
                      </ul>
                    </div>
                  )}
                  
                  {agentType === "blue" && (
                    <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <div className="text-green-500">Protection Applied</div>
                      </div>
                      <ul className="text-foreground space-y-2 ml-7">
                        <li>• Vulnerability successfully mitigated</li>
                        <li>• Security controls implemented</li>
                        <li>• Compliance requirements met</li>
                        <li>• Continuous monitoring enabled</li>
                      </ul>
                    </div>
                  )}
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
                        <p className="text-foreground leading-relaxed">{codeData.recommendation}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-secondary/20 border border-border rounded-lg p-6">
                    <h3 className="text-[#9AA6B2] mb-4">Additional Resources</h3>
                    <div className="space-y-3">
                      <a 
                        href="#" 
                        className="block p-3 bg-secondary/30 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <div className="text-primary mb-1">OWASP Guidelines</div>
                        <div className="text-muted-foreground">Best practices for secure coding</div>
                      </a>
                      <a 
                        href="#" 
                        className="block p-3 bg-secondary/30 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <div className="text-primary mb-1">NIST 800-82 Compliance</div>
                        <div className="text-muted-foreground">Industrial control systems security</div>
                      </a>
                      <a 
                        href="#" 
                        className="block p-3 bg-secondary/30 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <div className="text-primary mb-1">CWE Database</div>
                        <div className="text-muted-foreground">Common weakness enumeration details</div>
                      </a>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}