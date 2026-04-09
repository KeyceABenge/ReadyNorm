import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, parseISO, subDays, startOfWeek } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, TrendingDown, Minus, FlaskConical, MapPin } from "lucide-react";

const ZONE_COLORS = {
  zone_1: "#ef4444",
  zone_2: "#f97316",
  zone_3: "#eab308",
  zone_4: "#22c55e"
};

const ZONE_LABELS = {
  zone_1: "Zone 1 - Product Contact",
  zone_2: "Zone 2 - Near Product",
  zone_3: "Zone 3 - Non-Product",
  zone_4: "Zone 4 - Outside"
};

const TEST_TYPE_LABELS = {
  listeria_spp: "Listeria spp.",
  listeria_mono: "L. mono",
  salmonella: "Salmonella",
  apc: "APC",
  eb: "Enterobacteriaceae",
  coliform: "Coliform",
  ecoli: "E. coli",
  yeast_mold: "Yeast/Mold"
};

export default function EMPDashboard({ sites, samples, thresholds, predictions, areas, onRefresh }) {
  const [dateRange, setDateRange] = useState("30");

  const cutoffDate = useMemo(() => subDays(new Date(), parseInt(dateRange)), [dateRange]);

  const filteredSamples = useMemo(() => {
    return samples.filter(s => new Date(s.collection_date) >= cutoffDate);
  }, [samples, cutoffDate]);

  // Summary metrics
  const metrics = useMemo(() => {
    const total = filteredSamples.length;
    const positives = filteredSamples.filter(s => s.overall_result === "fail").length;
    const pending = filteredSamples.filter(s => s.status === "in_lab" || s.status === "collected").length;
    const pendingReswabs = samples.filter(s => s.requires_reswab && s.status !== "closed").length;

    // Zone breakdown
    const byZone = {
      zone_1: { total: 0, positive: 0 },
      zone_2: { total: 0, positive: 0 },
      zone_3: { total: 0, positive: 0 },
      zone_4: { total: 0, positive: 0 }
    };

    filteredSamples.forEach(s => {
      if (byZone[s.zone_classification]) {
        byZone[s.zone_classification].total++;
        if (s.overall_result === "fail") {
          byZone[s.zone_classification].positive++;
        }
      }
    });

    // Test type breakdown
    const byTestType = {};
    filteredSamples.forEach(s => {
      s.test_results?.forEach(tr => {
        if (!byTestType[tr.test_type]) {
          byTestType[tr.test_type] = { total: 0, positive: 0 };
        }
        byTestType[tr.test_type].total++;
        if (tr.result === "positive") {
          byTestType[tr.test_type].positive++;
        }
      });
    });

    return { total, positives, pending, pendingReswabs, byZone, byTestType };
  }, [filteredSamples, samples]);

  // Trend data by week
  const trendData = useMemo(() => {
    const weeks = {};
    filteredSamples.forEach(s => {
      const weekStart = format(startOfWeek(parseISO(s.collection_date)), "MMM d");
      if (!weeks[weekStart]) {
        weeks[weekStart] = { week: weekStart, samples: 0, positives: 0 };
      }
      weeks[weekStart].samples++;
      if (s.overall_result === "fail") {
        weeks[weekStart].positives++;
      }
    });
    return Object.values(weeks).sort((a, b) => new Date(a.week) - new Date(b.week));
  }, [filteredSamples]);

  // Zone pie chart data
  const zonePieData = useMemo(() => {
    return Object.entries(metrics.byZone).map(([zone, data]) => ({
      name: zone.replace("_", " ").toUpperCase(),
      value: data.total,
      positives: data.positive,
      color: ZONE_COLORS[zone]
    })).filter(d => d.value > 0);
  }, [metrics.byZone]);

  // Recent positives
  const recentPositives = useMemo(() => {
    return filteredSamples
      .filter(s => s.overall_result === "fail")
      .sort((a, b) => new Date(b.collection_date) - new Date(a.collection_date))
      .slice(0, 5);
  }, [filteredSamples]);

  // Sites needing attention
  const sitesNeedingAttention = useMemo(() => {
    return sites
      .filter(s => s.status === "active" && (s.current_risk_score > 70 || s.total_positives_ytd > 2))
      .sort((a, b) => (b.current_risk_score || 0) - (a.current_risk_score || 0))
      .slice(0, 5);
  }, [sites]);

  // Latest prediction
  const latestPrediction = predictions[0];

  const positivityRate = metrics.total > 0 ? ((metrics.positives / metrics.total) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase">Samples Collected</p>
                <p className="text-2xl font-bold">{metrics.total}</p>
              </div>
              <FlaskConical className="w-8 h-8 text-slate-300" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase">Positivity Rate</p>
                <p className="text-2xl font-bold text-rose-600">{positivityRate}%</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-rose-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase">Pending Results</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase">Pending Reswabs</p>
                <p className="text-2xl font-bold text-amber-600">{metrics.pendingReswabs}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase">Zone 1 Rate</p>
                <p className="text-2xl font-bold">
                  {metrics.byZone.zone_1.total > 0 
                    ? ((metrics.byZone.zone_1.positive / metrics.byZone.zone_1.total) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
              <MapPin className="w-8 h-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sampling Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="samples" stackId="1" stroke="#3b82f6" fill="#93c5fd" name="Total Samples" />
                  <Area type="monotone" dataKey="positives" stackId="2" stroke="#ef4444" fill="#fca5a5" name="Positives" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400">
                No data for selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Zone Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Samples by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            {zonePieData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={zonePieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    >
                      {zonePieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {Object.entries(metrics.byZone).map(([zone, data]) => (
                    <div key={zone} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ZONE_COLORS[zone] }} />
                      <span className="text-slate-600">{zone.replace("_", " ").toUpperCase()}</span>
                      <span className="font-medium">{data.total}</span>
                      {data.positive > 0 && (
                        <Badge variant="destructive" className="text-xs">{data.positive} pos</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-400">
                No data for selected period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Positives */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Recent Positive Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPositives.length > 0 ? (
              <div className="space-y-3">
                {recentPositives.map(sample => (
                  <div key={sample.id} className="flex items-start justify-between p-3 bg-rose-50 rounded-lg border border-rose-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{sample.site_code}</span>
                        <Badge style={{ backgroundColor: ZONE_COLORS[sample.zone_classification] + "20", color: ZONE_COLORS[sample.zone_classification] }}>
                          {sample.zone_classification?.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{sample.site_name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span>{format(parseISO(sample.collection_date), "MMM d, yyyy")}</span>
                        {sample.test_results?.filter(t => t.result === "positive").map(t => (
                          <Badge key={t.test_type} variant="outline" className="text-xs">
                            {TEST_TYPE_LABELS[t.test_type] || t.test_type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge className={
                      sample.severity === "critical" ? "bg-rose-600" :
                      sample.severity === "major" ? "bg-orange-600" :
                      sample.severity === "moderate" ? "bg-amber-600" :
                      "bg-slate-600"
                    }>
                      {sample.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-300" />
                <p>No positive findings in this period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sites Needing Attention */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-500" />
              Sites Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sitesNeedingAttention.length > 0 ? (
              <div className="space-y-3">
                {sitesNeedingAttention.map(site => (
                  <div key={site.id} className="flex items-start justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{site.site_code}</span>
                        <Badge style={{ backgroundColor: ZONE_COLORS[site.zone_classification] + "20", color: ZONE_COLORS[site.zone_classification] }}>
                          {site.zone_classification?.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{site.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{site.total_positives_ytd} positives YTD</span>
                        {site.last_positive_date && (
                          <span>Last: {format(parseISO(site.last_positive_date), "MMM d")}</span>
                        )}
                      </div>
                    </div>
                    {site.current_risk_score && (
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Risk Score</p>
                        <p className={`text-lg font-bold ${
                          site.current_risk_score > 80 ? "text-rose-600" :
                          site.current_risk_score > 60 ? "text-amber-600" :
                          "text-slate-600"
                        }`}>
                          {site.current_risk_score}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-300" />
                <p>All sites within normal parameters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Risk Summary */}
      {latestPrediction && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Latest Risk Assessment
              <Badge variant="outline" className="ml-2">
                {format(parseISO(latestPrediction.prediction_date), "MMM d, yyyy")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-2">Overall Risk Level</p>
                <Badge className={`text-lg px-4 py-2 ${
                  latestPrediction.risk_level === "critical" ? "bg-rose-600" :
                  latestPrediction.risk_level === "high" ? "bg-orange-600" :
                  latestPrediction.risk_level === "elevated" ? "bg-amber-600" :
                  latestPrediction.risk_level === "moderate" ? "bg-yellow-600" :
                  "bg-emerald-600"
                }`}>
                  {latestPrediction.risk_level?.toUpperCase()} ({latestPrediction.risk_score}/100)
                </Badge>
                <div className="flex items-center gap-2 mt-3 text-sm">
                  <span className="text-slate-500">Trend:</span>
                  {latestPrediction.trend_direction === "improving" && (
                    <span className="flex items-center text-emerald-600"><TrendingDown className="w-4 h-4 mr-1" /> Improving</span>
                  )}
                  {latestPrediction.trend_direction === "worsening" && (
                    <span className="flex items-center text-rose-600"><TrendingUp className="w-4 h-4 mr-1" /> Worsening</span>
                  )}
                  {latestPrediction.trend_direction === "stable" && (
                    <span className="flex items-center text-slate-600"><Minus className="w-4 h-4 mr-1" /> Stable</span>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-slate-500 mb-2">AI Analysis</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {latestPrediction.ai_analysis || "No analysis available."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}