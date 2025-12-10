import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Zap, AlertCircle } from "lucide-react";
import { DeployedSimulation } from "../types/simulation";

interface AIAssistantProps {
  deployedSimulations: DeployedSimulation[];
}

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function AIAssistant({ deployedSimulations }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "assistant",
      content: "Hello! I'm your NICSSIM AI Assistant. I can help you with:\n\n• Analyzing ICS security simulation data and metrics\n• Troubleshooting reactor configurations and vulnerabilities\n• Optimizing PLC and sensor security setups\n• Interpreting penetration test results\n• Providing cyber-security recommendations for nuclear systems\n\nHow can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Deployment-related queries
    if (lowerMessage.includes("deployment") || lowerMessage.includes("fleet")) {
      const activeCount = deployedSimulations.filter(s => s.status === "running").length;
      return `You currently have ${deployedSimulations.length} total deployment${deployedSimulations.length !== 1 ? 's' : ''}, with ${activeCount} actively running. ${deployedSimulations.length > 0 ? `Your most recent deployment is "${deployedSimulations[0].id}" which is ${deployedSimulations[0].status}.` : ''}\n\nWould you like me to provide more details about any specific deployment?`;
    }
    
    // Performance queries
    if (lowerMessage.includes("performance") || lowerMessage.includes("metric")) {
      return "Based on your current simulations, here are the key performance insights:\n\n• Average reactor power output: 82.5% (within optimal range)\n• System uptime: 98.7% (excellent reliability)\n• Sensor accuracy: 99.2% (exceeding standards)\n• Response time: 2.3s average (well below 5s threshold)\n\nAll metrics are performing within expected parameters. Would you like a detailed analysis of any specific metric?";
    }
    
    // Temperature queries
    if (lowerMessage.includes("temperature") || lowerMessage.includes("temp")) {
      return "Reactor core temperatures are currently nominal:\n\n• Average temperature: 342°C\n• Operating range: 320-360°C\n• Safety threshold: 400°C\n• Current status: ✓ Optimal\n\nTemperature control systems are functioning correctly. All cooling systems are operational with no anomalies detected.";
    }
    
    // Safety queries
    if (lowerMessage.includes("safety") || lowerMessage.includes("alert") || lowerMessage.includes("warning")) {
      return "Safety System Status Report:\n\n✓ All emergency shutdown systems operational\n✓ Redundant cooling systems active\n✓ Sensor arrays reporting accurately\n✓ PLC communication stable\n✓ No active warnings or alerts\n\nThe simulation environment maintains multiple layers of safety protocols. All systems are green and operating within safe parameters.";
    }
    
    // Optimization queries
    if (lowerMessage.includes("optimize") || lowerMessage.includes("improve")) {
      return "Based on your current configurations, here are optimization recommendations:\n\n1. **Sensor Distribution**: Consider adding 2-3 more sensors to the coolant section for improved monitoring granularity\n\n2. **PLC Load Balancing**: Distribute PLC loads more evenly across fleets to improve response times\n\n3. **Power Output**: You have capacity to increase power output by 8-12% while maintaining safety margins\n\n4. **Test Frequency**: Schedule weekly diagnostic tests to maintain optimal performance\n\nWould you like detailed steps for any of these optimizations?";
    }
    
    // Configuration queries
    if (lowerMessage.includes("config") || lowerMessage.includes("setup") || lowerMessage.includes("plc") || lowerMessage.includes("sensor")) {
      return "Configuration Best Practices:\n\n**PLCs**: Recommended 3-5 PLCs per reactor fleet for optimal control and redundancy\n\n**Sensors**: Distribute across all three sections:\n• Core: 30-40% (critical monitoring)\n• Coolant: 30-40% (heat management)\n• Turbine: 20-30% (power generation)\n\n**Fleet Size**: 2-4 reactors per fleet provides good balance between efficiency and manageability\n\nNeed help configuring a specific component?";
    }
    
    // Test scenarios
    if (lowerMessage.includes("test") || lowerMessage.includes("scenario")) {
      return "Recent ICS Security Test Results:\n\n✓ ICS Network Intrusion Detection - Passed (45m)\n✓ SCADA System Load Balancing - Passed (1h 20m)\n✓ Reactor Emergency SCRAM - Passed (2h 15m)\n✗ PLC Denial of Service Attack - Failed (35m)\n✓ Sensor Tampering Detection - Passed (1h 5m)\n\nThe PLC DoS attack test revealed vulnerabilities in network redundancy. I recommend implementing additional firewall rules and rate limiting. Would you like me to generate a detailed security analysis?";
    }
    
    // Security queries
    if (lowerMessage.includes("security") || lowerMessage.includes("cyber") || lowerMessage.includes("attack") || lowerMessage.includes("vulnerability")) {
      return "ICS Security Status:\n\n🔒 **Network Security**: Firewalls active, IDS monitoring enabled\n🛡️ **Access Control**: Role-based authentication enforced\n🔍 **Threat Detection**: Real-time monitoring of anomalies\n⚠️ **Recent Threats**: 3 intrusion attempts blocked in last 24h\n📋 **Recommendations**: \n  • Update PLC firmware to latest security patches\n  • Enable multi-factor authentication for operator access\n  • Conduct weekly vulnerability scans\n\nThe simulation environment is hardened against common ICS attack vectors. Need details on a specific security concern?";
    }
    
    // PLC/SCADA queries
    if (lowerMessage.includes("plc") || lowerMessage.includes("scada")) {
      return "PLC & SCADA System Status:\n\n**Network Configuration:**\n• 12 PLCs distributed across 4 reactor fleets\n• Redundant communication paths active\n• Average response latency: 2.3ms\n\n**Security Posture:**\n• All PLCs running in secure mode\n• Network segmentation properly configured\n• No unauthorized connection attempts detected\n\n**Best Practices:**\n1. Maintain air-gapped backup systems\n2. Use encrypted communication protocols\n3. Implement least-privilege access control\n4. Regular security audits and penetration testing\n\nNeed help with PLC hardening or SCADA security configuration?";
    }
    
    // Help/capabilities
    if (lowerMessage.includes("help") || lowerMessage.includes("can you") || lowerMessage.includes("what")) {
      return "I can assist you with:\n\n🔍 **Analysis**: Review simulation data, performance metrics, and trends\n\n⚙️ **Configuration**: Guidance on PLC, sensor, and fleet setup\n\n🛡️ **Safety**: Monitor safety systems and provide recommendations\n\n📊 **Optimization**: Suggest improvements for better performance\n\n🧪 **Testing**: Interpret test results and troubleshoot issues\n\n📈 **Reporting**: Generate insights from your simulation data\n\nJust ask me a question about any of these topics!";
    }
    
    // Default response
    return "I understand you're asking about your nuclear reactor simulation. While I can provide general guidance, I need more specific information to give you the most helpful answer.\n\nCould you clarify if you're interested in:\n• Performance metrics and analytics\n• Configuration and setup guidance\n• Safety system status\n• Optimization recommendations\n• Test scenario results\n\nOr feel free to ask me a specific question!";
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const response = generateResponse(inputMessage);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickActions = [
    { icon: Zap, label: "Check Performance", query: "Show me current performance metrics" },
    { icon: AlertCircle, label: "Safety Status", query: "What is the current safety status?" },
    { icon: Sparkles, label: "Optimize Setup", query: "How can I optimize my configuration?" },
  ];

  return (
    <div className="flex-1 overflow-hidden bg-background flex flex-col">
      {/* Header */}
      <div className="p-8 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-foreground">AI Assistant</h1>
            <p className="text-muted-foreground">Intelligent support for your reactor simulations</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-8 pb-4">
        <div className="flex items-center gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => {
                  setInputMessage(action.query);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-secondary/50 transition-colors text-sm"
              >
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-foreground">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-auto px-8 pb-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.type === "user" ? "justify-end" : ""}`}
            >
              {message.type === "assistant" && (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div
                className={`flex-1 max-w-[80%] ${
                  message.type === "user" ? "text-right" : ""
                }`}
              >
                <div
                  className={`inline-block px-4 py-3 rounded-xl ${
                    message.type === "user"
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-card border border-border shadow-sm"
                  }`}
                >
                  <div className={`whitespace-pre-wrap ${message.type === "assistant" ? "text-foreground" : ""}`}>
                    {message.content}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1 px-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {message.type === "user" && (
                <div className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-foreground" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="inline-block px-4 py-3 bg-card border border-border rounded-xl shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-8 pt-4 bg-card/50 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your reactor simulations..."
              className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>
          <div className="text-xs text-muted-foreground mt-2 text-center">
            AI Assistant provides guidance based on your simulation data. Always verify critical decisions with safety protocols.
          </div>
        </div>
      </div>
    </div>
  );
}