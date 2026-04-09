// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, TrendingUp, BarChart3, 
  PieChart, FileText
} from "lucide-react";
import { format, subMonths } from "date-fns";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart as RechartsPie, Pie, Cell
} from "recharts";

export default function AuditReports({ standards, sections, results, findings, scheduledAudits }) {
  const [dateRange, setDateRange] = useState("6_months");
  const [selectedStandard, setSelectedStandard] = useState("all");

  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate;
    
    switch (dateRange) {
      case "3_months": startDate = subMonths(now, 3); break;
      case "6_months": startDate = subMonths(now, 6); break;
      case "12_months": startDate = subMonths(now, 12); break;
      default: startDate = subMonths(now, 6);
    }

    let filteredResults = results.filter(r => new Date(r.audit_date) >= startDate);
    let filteredFindings = findings.filter(f => new Date(f.audit_date) >= startDate);

    if (selectedStandard !== "all") {
      filteredResults = filteredResults.filter(r => r.standard_id === selectedStandard);
      filteredFindings = filteredFindings.filter(f => f.standard_id === selectedStandard);
    }

    return { results: filteredResults, findings: filteredFindings };
  }, [results, findings, dateRange, selectedStandard]);

  // Compliance Trend
  const complianceTrend = useMemo(() => {
    const months = {};
    filteredData.results.forEach(r => {
      const month = format(new Date(r.audit_date), "MMM yyyy");
      if (!months[month]) {
        months[month] = { scores: [], count: 0 };
      }
      months[month].scores.push(r.score_percentage);
      months[month].count++;
    });

    return Object.entries(months)
      .map(([month, data]) => ({
        month,
        compliance: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
        audits: data.count
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month));
  }, [filteredData.results]);

  // Findings by Severity
  const findingsBySeverity = useMemo(() => {
    const counts = {
      compliant: 0,
      minor_gap: 0,
      major_gap: 0,
      critical_gap: 0
    };
    filteredData.findings.forEach(f => {
      if (counts[f.compliance_status] !== undefined) {
        counts[f.compliance_status]++;
      }
    });
    return [
      { name: "Compliant", value: counts.compliant, color: "#22c55e" },
      { name: "Minor", value: counts.minor_gap, color: "#eab308" },
      { name: "Major", value: counts.major_gap, color: "#f97316" },
      { name: "Critical", value: counts.critical_gap, color: "#ef4444" }
    ];
  }, [filteredData.findings]);

  // Findings by Standard
  const findingsByStandard = useMemo(() => {
    const counts = {};
    filteredData.findings.forEach(f => {
      const result = results.find(r => r.id === f.audit_result_id);
      const standardName = result?.standard_name || "Unknown";
      if (!counts[standardName]) {
        counts[standardName] = { minor: 0, major: 0, critical: 0 };
      }
      if (f.compliance_status === "minor_gap") counts[standardName].minor++;
      if (f.compliance_status === "major_gap") counts[standardName].major++;
      if (f.compliance_status === "critical_gap") counts[standardName].critical++;
    });
    return Object.entries(counts).map(([name, data]) => ({
      standard: name.length > 15 ? name.substring(0, 15) + "..." : name,
      ...data
    }));
  }, [filteredData.findings, results]);

  // Repeat Findings
  const repeatFindings = filteredData.findings.filter(f => f.is_repeat_finding);

  // Top Problem Areas
  const topProblems = useMemo(() => {
    const sectionCounts = {};
    filteredData.findings
      .filter(f => ["minor_gap", "major_gap", "critical_gap"].includes(f.compliance_status))
      .forEach(f => {
        const key = f.section_id;
        if (!sectionCounts[key]) {
          sectionCounts[key] = { count: 0, section_id: f.section_id };
        }
        sectionCounts[key].count++;
      });
    
    return Object.values(sectionCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => {
        const section = sections.find(s => s.id === item.section_id);
        return {
          name: section?.title || "Unknown Section",
          number: section?.section_number,
          count: item.count
        };
      });
  }, [filteredData.findings, sections]);

  const exportReport = () => {
    const data = {
      generated: format(new Date(), "yyyy-MM-dd HH:mm"),
      period: dateRange,
      standard: selectedStandard === "all" ? "All Standards" : standards.find(s => s.id === selectedStandard)?.name,
      summary: {
        total_audits: filteredData.results.length,
        average_compliance: filteredData.results.length > 0 
          ? Math.round(filteredData.results.reduce((a, r) => a + (r.score_percentage || 0), 0) / filteredData.results.length)
          : 0,
        total_findings: filteredData.findings.length,
        critical_gaps: filteredData.findings.filter(f => f.compliance_status === "critical_gap").length,
        major_gaps: filteredData.findings.filter(f => f.compliance_status === "major_gap").length,
        repeat_findings: repeatFindings.length
      },
      results: filteredData.results,
      findings: filteredData.findings
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-report-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
  };

  const avgCompliance = filteredData.results.length > 0 
    ? Math.round(filteredData.results.reduce((a, r) => a + (r.score_percentage || 0), 0) / filteredData.results.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3_months">Last 3 Months</SelectItem>
              <SelectItem value="6_months">Last 6 Months</SelectItem>
              <SelectItem value="12_months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedStandard} onValueChange={setSelectedStandard}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Standards</SelectItem>
              {standards.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={exportReport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Audits Completed</p>
            <p className="text-3xl font-bold mt-1">{filteredData.results.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Avg Compliance</p>
            <p className={`text-3xl font-bold mt-1 ${avgCompliance >= 90 ? "text-green-600" : avgCompliance >= 70 ? "text-amber-600" : "text-red-600"}`}>
              {avgCompliance}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Total Findings</p>
            <p className="text-3xl font-bold mt-1">
              {filteredData.findings.filter(f => f.compliance_status !== "compliant" && f.compliance_status !== "not_applicable").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Repeat Findings</p>
            <p className={`text-3xl font-bold mt-1 ${repeatFindings.length > 0 ? "text-purple-600" : ""}`}>
              {repeatFindings.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Compliance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Compliance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {complianceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={complianceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis domain={[0, 100]} fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="compliance" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 text-center py-12">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Findings Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Findings Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {findingsBySeverity.some(s => s.value > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPie>
                  <Pie
                    data={findingsBySeverity}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : null}
                  >
                    {findingsBySeverity.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 text-center py-12">No findings data</p>
            )}
          </CardContent>
        </Card>

        {/* Findings by Standard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Gaps by Standard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {findingsByStandard.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={findingsByStandard} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="standard" width={100} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="minor" stackId="a" fill="#eab308" name="Minor" />
                  <Bar dataKey="major" stackId="a" fill="#f97316" name="Major" />
                  <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 text-center py-12">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Top Problem Areas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Top Problem Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProblems.length > 0 ? (
              <div className="space-y-3">
                {topProblems.map((problem, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{problem.name}</p>
                      <p className="text-xs text-slate-500">Section {problem.number}</p>
                    </div>
                    <Badge variant="destructive">{problem.count} gaps</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-12">No problem areas identified</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}