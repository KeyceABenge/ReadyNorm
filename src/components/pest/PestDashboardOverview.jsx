import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Bug, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, 
  FileText, Clock, ArrowRight, Shield, Filter
} from "lucide-react";
import { format, subDays, parseISO, subMonths, endOfMonth, eachMonthOfInterval, eachWeekOfInterval, endOfWeek } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const RISK_COLORS = {
  low: "#22c55e",
  moderate: "#eab308",
  elevated: "#f97316",
  high: "#ef4444",
  critical: "#dc2626"
};

const PEST_COLORS = {
  rodents: "#8b5cf6",
  flies: "#3b82f6",
  stored_product_insects: "#f59e0b",
  cockroaches: "#ef4444",
  ants: "#10b981",
  birds: "#6366f1",
  other: "#64748b"
};

const PEST_TYPES = [
  { value: "all", label: "All Pests" },
  { value: "rodents", label: "Rodents" },
  { value: "flies", label: "Flies" },
  { value: "stored_product_insects", label: "Stored Product Insects" },
  { value: "cockroaches", label: "Cockroaches" },
  { value: "ants", label: "Ants" },
  { value: "birds", label: "Birds" },
  { value: "other", label: "Other" }
];

const DATE_PRESETS = [
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "6m", label: "Last 6 Months" },
  { value: "12m", label: "Last 12 Months" },
  { value: "custom", label: "Custom Range" }
];

export default function PestDashboardOverview({ 
  stats, devices, findings, serviceReports, riskPredictions, thresholds, locations, onNavigate 
}) {
  // Trend chart filter state
  const [trendFilters, setTrendFilters] = useState({
    pestType: "all",
    locationId: "all",
    datePreset: "6m",
    startDate: format(subMonths(new Date(), 6), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    showExceedancesOnly: false,
    groupBy: "month" // "month" or "week"
  });
  const [showFilters, setShowFilters] = useState(false);

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    if (trendFilters.datePreset === "custom") {
      return {
        start: parseISO(trendFilters.startDate),
        end: parseISO(trendFilters.endDate)
      };
    }
    
    const presetDays = {
      "30d": 30,
      "90d": 90,
      "6m": 180,
      "12m": 365
    };
    
    return {
      start: subDays(now, presetDays[trendFilters.datePreset] || 180),
      end: now
    };
  }, [trendFilters.datePreset, trendFilters.startDate, trendFilters.endDate]);

  // Extract pest species from finding - use pest_species or parse from finding_notes
  const getPestSpecies = (finding) => {
    if (finding.pest_species) return finding.pest_species.toLowerCase();
    // Parse from finding_notes like "Small Fly(5) found in..."
    if (finding.finding_notes) {
      const match = finding.finding_notes.match(/^([A-Za-z\s]+)\s*\(/);
      if (match) return match[1].trim().toLowerCase();
    }
    return null;
  };

  // Get unique pest species from findings for dynamic coloring
  const pestSpeciesList = useMemo(() => {
    const species = new Set();
    findings.forEach(f => {
      if (f.count > 0) {
        const name = getPestSpecies(f);
        if (name) species.add(name);
      }
    });
    return Array.from(species).sort();
  }, [findings]);

  // Generate colors for each pest species
  const speciesColors = useMemo(() => {
    const baseColors = [
      "#f97316", // orange - small flies
      "#ef4444", // red - gnats
      "#3b82f6", // blue - confused flour beetles
      "#8b5cf6", // purple
      "#10b981", // emerald
      "#ec4899", // pink
      "#f59e0b", // amber
      "#6366f1", // indigo
      "#14b8a6", // teal
      "#84cc16", // lime
      "#a855f7", // violet
      "#06b6d4", // cyan
    ];
    const colors = {};
    pestSpeciesList.forEach((species, idx) => {
      colors[species] = baseColors[idx % baseColors.length];
    });
    return colors;
  }, [pestSpeciesList]);

  // Enhanced trend data with filters - now broken down by pest species
  const trendData = useMemo(() => {
    const { start, end } = dateRange;
    
    // Filter findings based on criteria
    let filteredFindings = findings.filter(f => {
      const d = new Date(f.service_date);
      if (d < start || d > end) return false;
      if (trendFilters.pestType !== "all" && f.pest_type !== trendFilters.pestType) return false;
      if (trendFilters.locationId !== "all" && f.location_id !== trendFilters.locationId) return false;
      if (trendFilters.showExceedancesOnly && !f.threshold_exceeded) return false;
      return true;
    });

    const buildPeriodData = (periodFindings, periodLabel) => {
      const data = {
        period: periodLabel,
        total: periodFindings.length,
        exceedances: periodFindings.filter(f => f.threshold_exceeded).length
      };
      
      // Add count for each pest species
      pestSpeciesList.forEach(species => {
        const speciesFindings = periodFindings.filter(f => getPestSpecies(f) === species);
        data[species] = speciesFindings.reduce((sum, f) => sum + (f.count || 0), 0);
      });
      
      return data;
    };

    // Group by month or week
    if (trendFilters.groupBy === "week") {
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      return weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekFindings = filteredFindings.filter(f => {
          const d = new Date(f.service_date);
          return d >= weekStart && d <= weekEnd;
        });
        return buildPeriodData(weekFindings, format(weekStart, "MMM d"));
      }).slice(-12); // Limit to last 12 weeks for readability
    } else {
      const months = eachMonthOfInterval({ start, end });
      return months.map(monthStart => {
        const monthEnd = endOfMonth(monthStart);
        const monthFindings = filteredFindings.filter(f => {
          const d = new Date(f.service_date);
          return d >= monthStart && d <= monthEnd;
        });
        return buildPeriodData(monthFindings, format(monthStart, "MMM yy"));
      });
    }
  }, [findings, dateRange, trendFilters.pestType, trendFilters.locationId, trendFilters.showExceedancesOnly, trendFilters.groupBy, pestSpeciesList]);

  // Recent exceedances - sorted by service_date descending
  const recentExceedances = useMemo(() => {
    return findings
      .filter(f => f.threshold_exceeded)
      .sort((a, b) => new Date(b.service_date) - new Date(a.service_date))
      .slice(0, 5);
  }, [findings]);

  // Pending reviews
  const pendingReports = serviceReports.filter(r => r.review_status === "pending_review").slice(0, 5);

  // Latest risk prediction
  const latestRisk = riskPredictions[0];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bug className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Active Devices</p>
                <p className="text-2xl font-bold">{stats.totalDevices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">30-Day Findings</p>
                <p className="text-2xl font-bold">{stats.recentFindings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.exceedances > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.exceedances > 0 ? "bg-red-100" : "bg-slate-100"}`}>
                <AlertTriangle className={`w-5 h-5 ${stats.exceedances > 0 ? "text-red-600" : "text-slate-600"}`} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Threshold Exceedances</p>
                <p className={`text-2xl font-bold ${stats.exceedances > 0 ? "text-red-600" : ""}`}>
                  {stats.exceedances}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${RISK_COLORS[stats.riskLevel]}20` }}>
                <Shield className="w-5 h-5" style={{ color: RISK_COLORS[stats.riskLevel] }} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Risk Score</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{stats.overallRiskScore}</p>
                  <Badge style={{ backgroundColor: `${RISK_COLORS[stats.riskLevel]}20`, color: RISK_COLORS[stats.riskLevel] }}>
                    {stats.riskLevel}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Enhanced Trend Chart */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Findings Trend
                {trendFilters.pestType !== "all" && (
                  <Badge variant="outline" className="ml-2 capitalize">
                    {trendFilters.pestType.replace(/_/g, " ")}
                  </Badge>
                )}
                {trendFilters.locationId !== "all" && (
                  <Badge variant="outline" className="ml-1">
                    {(locations || []).find(l => l.id === trendFilters.locationId)?.name || "Building"}
                  </Badge>
                )}
                {trendFilters.showExceedancesOnly && (
                  <Badge className="bg-red-100 text-red-800 ml-1">Exceedances Only</Badge>
                )}
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
              </Button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {/* Pest Type */}
                  <div>
                    <Label className="text-xs">Pest Type</Label>
                    <Select 
                      value={trendFilters.pestType} 
                      onValueChange={(v) => setTrendFilters({...trendFilters, pestType: v})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PEST_TYPES.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Building/Location */}
                  <div>
                    <Label className="text-xs">Building</Label>
                    <Select 
                      value={trendFilters.locationId} 
                      onValueChange={(v) => setTrendFilters({...trendFilters, locationId: v})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Buildings</SelectItem>
                        {(locations || []).map(loc => (
                          <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range Preset */}
                  <div>
                    <Label className="text-xs">Date Range</Label>
                    <Select 
                      value={trendFilters.datePreset} 
                      onValueChange={(v) => setTrendFilters({...trendFilters, datePreset: v})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_PRESETS.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Group By */}
                  <div>
                    <Label className="text-xs">Group By</Label>
                    <Select 
                      value={trendFilters.groupBy} 
                      onValueChange={(v) => setTrendFilters({...trendFilters, groupBy: v})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Exceedances Only Toggle */}
                  <div className="flex items-end pb-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={trendFilters.showExceedancesOnly}
                        onCheckedChange={(v) => setTrendFilters({...trendFilters, showExceedancesOnly: v})}
                      />
                      <Label className="text-xs">Exceedances Only</Label>
                    </div>
                  </div>
                </div>

                {/* Custom Date Range */}
                {trendFilters.datePreset === "custom" && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <Label className="text-xs">Start Date</Label>
                      <Input
                        type="date"
                        value={trendFilters.startDate}
                        onChange={(e) => setTrendFilters({...trendFilters, startDate: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">End Date</Label>
                      <Input
                        type="date"
                        value={trendFilters.endDate}
                        onChange={(e) => setTrendFilters({...trendFilters, endDate: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                {/* Quick Reset */}
                <div className="flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setTrendFilters({
                      pestType: "all",
                      locationId: "all",
                      datePreset: "6m",
                      startDate: format(subMonths(new Date(), 6), "yyyy-MM-dd"),
                      endDate: format(new Date(), "yyyy-MM-dd"),
                      showExceedancesOnly: false,
                      groupBy: "month"
                    })}
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <XAxis dataKey="period" fontSize={11} angle={-45} textAnchor="end" height={50} />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      // Filter out zero values and sort by value
                      const relevantPayload = payload
                        .filter(entry => entry.value > 0)
                        .sort((a, b) => b.value - a.value);
                      const total = relevantPayload.reduce((sum, entry) => sum + entry.value, 0);
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg max-w-xs">
                          <p className="font-medium mb-2 border-b pb-1">{label}</p>
                          <div className="space-y-1">
                            {relevantPayload.map((entry, i) => (
                              <div key={i} className="flex items-center justify-between gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-sm flex-shrink-0" 
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="truncate">{entry.name.replace(/_/g, " ")}</span>
                                </div>
                                <span className="font-medium">{entry.value}</span>
                              </div>
                            ))}
                          </div>
                          {relevantPayload.length > 0 && (
                            <div className="mt-2 pt-2 border-t flex justify-between font-medium text-sm">
                              <span>Total</span>
                              <span>{total}</span>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px' }}
                    formatter={(value) => value.replace(/_/g, " ")}
                  />
                  {/* Stacked bars by pest species */}
                  {pestSpeciesList.map((species, idx) => (
                    <Bar 
                      key={species}
                      dataKey={species} 
                      name={species}
                      stackId="pestCount"
                      fill={speciesColors[species]} 
                      radius={idx === pestSpeciesList.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {trendData.reduce((sum, d) => sum + d.total, 0)}
                </p>
                <p className="text-xs text-slate-500">Total Findings</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {trendData.reduce((sum, d) => {
                    let pestTotal = 0;
                    pestSpeciesList.forEach(s => pestTotal += (d[s] || 0));
                    return sum + pestTotal;
                  }, 0)}
                </p>
                <p className="text-xs text-slate-500">Total Pest Count</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {trendData.reduce((sum, d) => sum + d.exceedances, 0)}
                </p>
                <p className="text-xs text-slate-500">Exceedances</p>
              </div>
            </div>

            {/* Legend for pest types */}
            {pestSpeciesList.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-slate-500 mb-2">Pest Types</p>
                <div className="flex flex-wrap gap-2">
                  {pestSpeciesList.map(species => (
                    <div key={species} className="flex items-center gap-1.5 text-xs">
                      <div 
                        className="w-3 h-3 rounded-sm" 
                        style={{ backgroundColor: speciesColors[species] }}
                      />
                      <span className="capitalize">{species.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Alerts & Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Exceedances */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Recent Threshold Exceedances
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("findings")}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentExceedances.length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                No recent exceedances
              </div>
            ) : (
              <div className="space-y-2">
                {recentExceedances.map(finding => (
                  <div 
                    key={finding.id} 
                    className={`p-3 rounded-lg border ${
                      finding.exceedance_severity === "critical" 
                        ? "bg-red-50 border-red-200" 
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{finding.device_code}</span>
                          <Badge className={
                            finding.exceedance_severity === "critical"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }>
                            {finding.exceedance_severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          {finding.pest_type?.replace(/_/g, " ")} - Count: {finding.count}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500">
                        {format(parseISO(finding.service_date), "MMM d")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Reviews */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Pending Report Reviews
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("reports")}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {pendingReports.length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                All reports reviewed
              </div>
            ) : (
              <div className="space-y-2">
                {pendingReports.map(report => (
                  <div key={report.id} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{report.vendor_name || "Service Report"}</p>
                        <p className="text-sm text-slate-600">
                          {report.total_findings} findings • {report.threshold_exceedances} exceedances
                        </p>
                      </div>
                      <span className="text-xs text-slate-500">
                        {format(parseISO(report.service_date), "MMM d")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Risk Summary */}
      {latestRisk && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Risk Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Overall Risk</p>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={latestRisk.risk_score} 
                    className="flex-1 h-3"
                  />
                  <span className="font-bold" style={{ color: RISK_COLORS[latestRisk.risk_level] }}>
                    {latestRisk.risk_score}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Trend</p>
                <Badge className={
                  latestRisk.trend_direction === "improving" ? "bg-emerald-100 text-emerald-800" :
                  latestRisk.trend_direction === "worsening" ? "bg-red-100 text-red-800" :
                  "bg-slate-100 text-slate-800"
                }>
                  {latestRisk.trend_direction === "improving" && <TrendingDown className="w-3 h-3 mr-1" />}
                  {latestRisk.trend_direction === "worsening" && <TrendingUp className="w-3 h-3 mr-1" />}
                  {latestRisk.trend_direction}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Confidence</p>
                <span className="font-medium">{latestRisk.confidence_score}%</span>
              </div>
            </div>
            {latestRisk.ai_analysis && (
              <p className="mt-4 text-sm text-slate-700 bg-white/50 p-3 rounded-lg">
                {latestRisk.ai_analysis}
              </p>
            )}
            <Button variant="outline" size="sm" className="mt-4" onClick={() => onNavigate("risk")}>
              View Full Analysis <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}