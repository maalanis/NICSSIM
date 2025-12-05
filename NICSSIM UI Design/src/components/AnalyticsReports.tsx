import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, FileText, TrendingUp, Zap, Clock, Database } from "lucide-react";
import { DeployedSimulation } from "../types/simulation";
import jsPDF from "jspdf";
import { MOCK_DEPLOYMENTS, getDeploymentStats } from "../data/mockDeployments";

interface AnalyticsReportsProps {
  deployedSimulations: DeployedSimulation[];
  onViewDeployment: (id: string) => void;
}

const performanceData = [
  { time: "00:00", power: 65, temp: 320, efficiency: 92 },
  { time: "04:00", power: 72, temp: 335, efficiency: 94 },
  { time: "08:00", power: 85, temp: 342, efficiency: 96 },
  { time: "12:00", power: 88, temp: 348, efficiency: 95 },
  { time: "16:00", power: 82, temp: 338, efficiency: 94 },
  { time: "20:00", power: 75, temp: 328, efficiency: 93 },
  { time: "24:00", power: 68, temp: 322, efficiency: 92 },
];

const fleetComparisonData = [
  { fleet: "Security Test Fleet", avgPower: 85, avgTemp: 342, uptime: 99.2 },
  { fleet: "PLC Redundancy Fleet", avgPower: 78, avgTemp: 328, uptime: 98.5 },
  { fleet: "SCRAM Procedure Fleet", avgPower: 92, avgTemp: 355, uptime: 99.8 },
  { fleet: "Cyber Response Fleet", avgPower: 70, avgTemp: 315, uptime: 97.3 },
];

const testScenarios = [
  { id: "test-001", name: "ICS Network Intrusion Detection", status: "Passed", duration: "45m", date: "2025-12-04" },
  { id: "test-002", name: "SCADA System Load Balancing", status: "Passed", duration: "1h 20m", date: "2025-12-03" },
  { id: "test-003", name: "Reactor Emergency SCRAM", status: "Passed", duration: "2h 15m", date: "2025-12-02" },
  { id: "test-004", name: "PLC Denial of Service Attack", status: "Failed", duration: "35m", date: "2025-12-01" },
  { id: "test-005", name: "Sensor Tampering Detection", status: "Passed", duration: "1h 5m", date: "2025-11-30" },
];

export function AnalyticsReports({ deployedSimulations, onViewDeployment }: AnalyticsReportsProps) {
  const handleDownloadReport = () => {
    // Generate report content
    const reportDate = new Date().toLocaleDateString();
    const reportTime = new Date().toLocaleTimeString();
    
    let reportContent = `NICSSIM Analytics Report\n`;
    reportContent += `Generated: ${reportDate} ${reportTime}\n`;
    reportContent += `${'='.repeat(60)}\n\n`;
    
    reportContent += `PERFORMANCE SUMMARY\n`;
    reportContent += `-`.repeat(60) + `\n`;
    reportContent += `Average Power Output: 82.5%\n`;
    reportContent += `Average Uptime: 98.7%\n`;
    reportContent += `Total Data Points: 1.2M\n`;
    reportContent += `Total Tests Run: 47\n\n`;
    
    reportContent += `PERFORMANCE OVER TIME (24h)\n`;
    reportContent += `-`.repeat(60) + `\n`;
    performanceData.forEach(row => {
      reportContent += `${row.time.padEnd(10)} Power: ${row.power}%  Temp: ${row.temp}°C  Efficiency: ${row.efficiency}%\n`;
    });
    reportContent += `\n`;
    
    reportContent += `FLEET COMPARISON\n`;
    reportContent += `-`.repeat(60) + `\n`;
    fleetComparisonData.forEach(fleet => {
      reportContent += `${fleet.fleet.padEnd(10)} Avg Power: ${fleet.avgPower}%  Avg Temp: ${fleet.avgTemp}°C  Uptime: ${fleet.uptime}%\n`;
    });
    reportContent += `\n`;
    
    reportContent += `TEST SCENARIOS\n`;
    reportContent += `-`.repeat(60) + `\n`;
    testScenarios.forEach(test => {
      reportContent += `${test.id.padEnd(12)} ${test.name.padEnd(30)} ${test.status.padEnd(10)} ${test.duration.padEnd(10)} ${test.date}\n`;
    });
    
    // Create blob and download
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NICSSIM_Analytics_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDFReport = () => {
    // Create a new jsPDF instance
    const doc = new jsPDF();

    // Add report content to the PDF
    const reportDate = new Date().toLocaleDateString();
    const reportTime = new Date().toLocaleTimeString();
    
    doc.setFontSize(16);
    doc.text(`NICSSIM Analytics Report`, 10, 10);
    doc.setFontSize(12);
    doc.text(`Generated: ${reportDate} ${reportTime}`, 10, 20);
    doc.line(10, 25, 190, 25);
    doc.setFontSize(14);
    doc.text(`PERFORMANCE SUMMARY`, 10, 35);
    doc.setFontSize(12);
    doc.text(`Average Power Output: 82.5%`, 10, 45);
    doc.text(`Average Uptime: 98.7%`, 10, 55);
    doc.text(`Total Data Points: 1.2M`, 10, 65);
    doc.text(`Total Tests Run: 47`, 10, 75);
    doc.line(10, 80, 190, 80);
    doc.setFontSize(14);
    doc.text(`PERFORMANCE OVER TIME (24h)`, 10, 90);
    doc.setFontSize(12);
    performanceData.forEach((row, index) => {
      doc.text(`${row.time.padEnd(10)} Power: ${row.power}%  Temp: ${row.temp}°C  Efficiency: ${row.efficiency}%`, 10, 100 + index * 10);
    });
    doc.line(10, 160, 190, 160);
    doc.setFontSize(14);
    doc.text(`FLEET COMPARISON`, 10, 170);
    doc.setFontSize(12);
    fleetComparisonData.forEach((fleet, index) => {
      doc.text(`${fleet.fleet.padEnd(10)} Avg Power: ${fleet.avgPower}%  Avg Temp: ${fleet.avgTemp}°C  Uptime: ${fleet.uptime}%`, 10, 180 + index * 10);
    });
    doc.line(10, 220, 190, 220);
    doc.setFontSize(14);
    doc.text(`TEST SCENARIOS`, 10, 230);
    doc.setFontSize(12);
    testScenarios.forEach((test, index) => {
      doc.text(`${test.id.padEnd(12)} ${test.name.padEnd(30)} ${test.status.padEnd(10)} ${test.duration.padEnd(10)} ${test.date}`, 10, 240 + index * 10);
    });

    // Save the PDF
    doc.save(`NICSSIM_Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleViewTestReport = (test: typeof testScenarios[0]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const reportDate = new Date().toLocaleDateString();
    const reportTime = new Date().toLocaleTimeString();
    
    // Header with NICSSIM branding
    doc.setFillColor(4, 30, 66); // Navy blue #041E42
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('NICSSIM', 15, 15);
    
    doc.setFontSize(12);
    doc.text('Nuclear Micro-Reactor Simulation Platform', 15, 25);
    
    // Reset text color for body
    doc.setTextColor(0, 0, 0);
    
    // Title Section
    doc.setFontSize(20);
    doc.text('Test Scenario Report', 15, 50);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${reportDate} at ${reportTime}`, 15, 57);
    
    // Divider
    doc.setDrawColor(255, 130, 0); // Orange #FF8200
    doc.setLineWidth(0.5);
    doc.line(15, 62, pageWidth - 15, 62);
    
    // Test Information
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('Test Information', 15, 72);
    
    doc.setFontSize(11);
    let yPos = 82;
    
    // Test ID
    doc.setFont('helvetica', 'bold');
    doc.text('Test ID:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(test.id, 60, yPos);
    yPos += 8;
    
    // Scenario Name
    doc.setFont('helvetica', 'bold');
    doc.text('Scenario Name:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(test.name, 60, yPos);
    yPos += 8;
    
    // Status with colored badge
    doc.setFont('helvetica', 'bold');
    doc.text('Status:', 20, yPos);
    if (test.status === "Passed") {
      doc.setFillColor(34, 197, 94); // Green
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(239, 68, 68); // Red
      doc.setTextColor(255, 255, 255);
    }
    doc.roundedRect(58, yPos - 4, 20, 6, 1, 1, 'F');
    doc.text(test.status, 60, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 8;
    
    // Duration
    doc.setFont('helvetica', 'bold');
    doc.text('Duration:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(test.duration, 60, yPos);
    yPos += 8;
    
    // Execution Date
    doc.setFont('helvetica', 'bold');
    doc.text('Execution Date:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(test.date, 60, yPos);
    yPos += 15;
    
    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 10;
    
    // Test Objectives
    doc.setFontSize(14);
    doc.text('Test Objectives', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    const objectives = [
      'Validate reactor response to scenario conditions',
      'Verify PLC communication integrity during test',
      'Monitor sensor accuracy and reliability',
      'Assess system recovery and fail-safe mechanisms'
    ];
    
    objectives.forEach((objective, index) => {
      doc.text(`${index + 1}. ${objective}`, 20, yPos);
      yPos += 6;
    });
    yPos += 10;
    
    // Test Results Summary
    doc.setFontSize(14);
    doc.text('Performance Metrics', 15, yPos);
    yPos += 10;
    
    // Create a simple table for metrics
    const metrics = [
      ['Metric', 'Value', 'Target', 'Result'],
      ['Reactor Power Output', '85%', '80-95%', '✓ Pass'],
      ['Core Temperature', '342°C', '320-360°C', '✓ Pass'],
      ['Response Time', '2.3s', '< 5s', '✓ Pass'],
      ['Sensor Accuracy', '99.2%', '> 95%', '✓ Pass']
    ];
    
    doc.setFontSize(9);
    metrics.forEach((row, index) => {
      const xPositions = [20, 70, 120, 160];
      row.forEach((cell, cellIndex) => {
        if (index === 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFillColor(240, 240, 240);
          doc.rect(xPositions[cellIndex] - 2, yPos - 4, 45, 7, 'F');
        } else {
          doc.setFont('helvetica', 'normal');
        }
        doc.text(cell, xPositions[cellIndex], yPos);
      });
      yPos += 8;
    });
    yPos += 10;
    
    // Observations
    doc.setFontSize(14);
    doc.text('Observations', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.text('All systems performed within expected parameters. No anomalies detected', 20, yPos);
    yPos += 6;
    doc.text('during the test execution. Reactor safety systems responded appropriately.', 20, yPos);
    yPos += 15;
    
    // Recommendations
    doc.setFontSize(14);
    doc.text('Recommendations', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.text('• Continue monitoring during extended operations', 20, yPos);
    yPos += 6;
    doc.text('• Schedule follow-up test in 30 days', 20, yPos);
    yPos += 6;
    doc.text('• Review sensor calibration logs weekly', 20, yPos);
    
    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(240, 240, 240);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('NICSSIM - Nuclear Micro-Reactor Simulation Platform', pageWidth / 2, pageHeight - 7, { align: 'center' });
    doc.text(`Page 1 of 1`, pageWidth - 20, pageHeight - 7);
    
    // Save the PDF
    doc.save(`NICSSIM_Test_Report_${test.id}_${test.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-foreground mb-2">Analytics & Reports</h1>
              <p className="text-muted-foreground">Performance metrics, historical data, and test results</p>
            </div>
            {/* Export buttons removed but functionality preserved for future use */}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div className="flex items-center gap-1 text-blue-500 text-sm">
                <TrendingUp className="w-4 h-4" />
                +5.2%
              </div>
            </div>
            <div className="text-3xl text-foreground mb-1">82.5%</div>
            <div className="text-sm text-muted-foreground">Avg Power Output</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="text-3xl text-foreground mb-1">98.7%</div>
            <div className="text-sm text-muted-foreground">Avg Uptime</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Database className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="text-3xl text-foreground mb-1">1.2M</div>
            <div className="text-sm text-muted-foreground">Data Points</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
            <div className="text-3xl text-foreground mb-1">47</div>
            <div className="text-sm text-muted-foreground">Tests Run</div>
          </div>
        </div>

        {/* Performance Over Time Chart */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg mb-8">
          <h2 className="text-foreground mb-6">Performance Over Time (24h)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF8200" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#FF8200" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              <Area type="monotone" dataKey="power" stroke="#FF8200" fillOpacity={1} fill="url(#colorPower)" name="Power (%)" />
              <Area type="monotone" dataKey="temp" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTemp)" name="Temperature (°C)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Fleet Comparison Chart */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg mb-8">
          <h2 className="text-foreground mb-6">Fleet Performance Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fleetComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="fleet" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              <Bar dataKey="avgPower" fill="#FF8200" name="Avg Power (%)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="uptime" fill="#041E42" name="Uptime (%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Test Scenarios Table */}
        <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-foreground">Recent Test Scenarios</h2>
            <button className="text-sm text-primary hover:text-primary/80 transition-colors">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left p-4 text-sm text-muted-foreground">Test ID</th>
                  <th className="text-left p-4 text-sm text-muted-foreground">Scenario Name</th>
                  <th className="text-left p-4 text-sm text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm text-muted-foreground">Duration</th>
                  <th className="text-left p-4 text-sm text-muted-foreground">Date</th>
                  <th className="text-left p-4 text-sm text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {testScenarios.map((test) => (
                  <tr key={test.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="p-4 text-muted-foreground text-sm">{test.id}</td>
                    <td className="p-4 text-foreground">{test.name}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs ${
                        test.status === "Passed" 
                          ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" 
                          : "bg-red-500/10 text-red-500 border border-red-500/20"
                      }`}>
                        {test.status}
                      </span>
                    </td>
                    <td className="p-4 text-foreground">{test.duration}</td>
                    <td className="p-4 text-muted-foreground">{test.date}</td>
                    <td className="p-4">
                      <button className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors" onClick={() => handleViewTestReport(test)}>
                        <FileText className="w-4 h-4" />
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}