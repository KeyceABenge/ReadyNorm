import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Download, FileText, TrendingUp,
  Calendar, Clock, CheckCircle2, AlertTriangle
} from "lucide-react";
import { format, subDays, differenceInDays, isBefore, isAfter } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { cn } from "@/lib/utils";

const COLORS = ["#f59e0b", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899"];

export default function CAPAReports({ capas, actions }) {
  const [dateRange, setDateRange] = useState("30");
  const [reportType, setReportType] = useState("summary");

  const filteredData = useMemo(() => {
    const days = parseInt(dateRange);
    const cutoff = subDays(new Date(), days);
    return {
      capas: capas.filter(c => isAfter(new Date(c.created_date), cutoff)),
      actions: actions.filter(a => isAfter(new Date(a.created_date), cutoff))
    };
  }, [capas, actions, dateRange]);

  // Summary metrics
  const metrics = useMemo(() => {
    const { capas: filtered, actions: filteredActions } = filteredData;
    const now = new Date();

    const opened = filtered.length;
    const closed = filtered.filter(c => c.status === "closed").length;
    const overdue = filteredActions.filter(a => 
      a.status !== "completed" && a.status !== "verified" &&
      a.due_date && isBefore(new Date(a.due_date), now)
    ).length;

    const avgDaysToClose = filtered
      .filter(c => c.status === "closed" && c.closed_at)
      .map(c => differenceInDays(new Date(c.closed_at), new Date(c.created_date)));
    
    const avgCloseTime = avgDaysToClose.length > 0 
      ? Math.round(avgDaysToClose.reduce((a, b) => a + b, 0) / avgDaysToClose.length)
      : 0;

    const effectiveness = filtered.filter(c => c.effectiveness_status === "effective").length;
    const ineffective = filtered.filter(c => c.effectiveness_status === "ineffective").length;

    const recurrences = filtered.filter(c => c.is_recurrence).length;

    return { opened, closed, overdue, avgCloseTime, effectiveness, ineffective, recurrences };
  }, [filteredData]);

  // Trend data by week
  const trendData = useMemo(() => {
    const days = parseInt(dateRange);
    const weeks = Math.ceil(days / 7);
    const data = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const weekEnd = subDays(new Date(), i * 7);
      const weekStart = subDays(weekEnd, 7);
      
      const opened = capas.filter(c => {
        const date = new Date(c.created_date);
        return isAfter(date, weekStart) && isBefore(date, weekEnd);
      }).length;

      const closed = capas.filter(c => {
        if (!c.closed_at) return false;
        const date = new Date(c.closed_at);
        return isAfter(date, weekStart) && isBefore(date, weekEnd);
      }).length;

      data.push({
        week: format(weekStart, "MMM d"),
        opened,
        closed
      });
    }

    return data;
  }, [capas, dateRange]);

  // Category distribution
  const categoryData = useMemo(() => {
    const counts = {};
    filteredData.capas.forEach(c => {
      const cat = c.category || "Uncategorized";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Severity distribution
  const severityData = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0, critical: 0 };
    filteredData.capas.forEach(c => {
      counts[c.severity] = (counts[c.severity] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Source distribution
  const sourceData = useMemo(() => {
    const counts = {};
    filteredData.capas.forEach(c => {
      const src = c.source || "other";
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name: name.replace("_", " "), value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Export to CSV
  const exportCSV = () => {
    const headers = ["CAPA ID", "Title", "Status", "Severity", "Category", "Source", "Owner", "Created", "Closed", "Days Open"];
    const rows = filteredData.capas.map(c => [
      c.capa_id,
      `"${c.title}"`,
      c.status,
      c.severity,
      c.category || "",
      c.source || "",
      c.owner_name || "",
      format(new Date(c.created_date), "yyyy-MM-dd"),
      c.closed_at ? format(new Date(c.closed_at), "yyyy-MM-dd") : "",
      c.closed_at ? differenceInDays(new Date(c.closed_at), new Date(c.created_date)) : differenceInDays(new Date(), new Date(c.created_date))
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capa-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Report type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Summary</SelectItem>
              <SelectItem value="trends">Trends</SelectItem>
              <SelectItem value="breakdown">Breakdown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={exportCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <MetricCard icon={FileText} label="Opened" value={metrics.opened} color="text-blue-600" />
        <MetricCard icon={CheckCircle2} label="Closed" value={metrics.closed} color="text-green-600" />
        <MetricCard icon={AlertTriangle} label="Overdue Actions" value={metrics.overdue} color="text-red-600" />
        <MetricCard icon={Clock} label="Avg Days to Close" value={metrics.avgCloseTime} color="text-amber-600" />
        <MetricCard icon={TrendingUp} label="Effective" value={metrics.effectiveness} color="text-emerald-600" />
        <MetricCard icon={AlertTriangle} label="Ineffective" value={metrics.ineffective} color="text-red-600" />
        <MetricCard icon={Calendar} label="Recurrences" value={metrics.recurrences} color="text-purple-600" />
      </div>

      {reportType === "summary" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CAPAs by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Severity Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CAPAs by Severity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={
                          entry.name === "critical" ? "#ef4444" :
                          entry.name === "high" ? "#f97316" :
                          entry.name === "medium" ? "#eab308" :
                          "#3b82f6"
                        } />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === "trends" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CAPA Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="opened" stroke="#3b82f6" strokeWidth={2} name="Opened" />
                  <Line type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={2} name="Closed" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {reportType === "breakdown" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Source Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CAPAs by Source</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sourceData.map(({ name, value }, i) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm capitalize">{name}</span>
                        <span className="text-sm font-medium">{value}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${(value / filteredData.capas.length) * 100}%`,
                            backgroundColor: COLORS[i % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["open", "in_progress", "pending_verification", "closed", "reopened"].map(status => {
                  const count = filteredData.capas.filter(c => c.status === status).length;
                  return (
                    <div key={status} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="capitalize text-sm">{status.replace("_", " ")}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Icon className={cn("w-5 h-5", color)} />
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-slate-500">{label}</div>
        </div>
      </div>
    </Card>
  );
}