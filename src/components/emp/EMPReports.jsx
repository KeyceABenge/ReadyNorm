import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { FileText, Download, Calendar, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";

const ZONE_COLORS = {
  zone_1: "#ef4444",
  zone_2: "#f97316",
  zone_3: "#eab308",
  zone_4: "#22c55e"
};

const TEST_LABELS = {
  listeria_spp: "Listeria spp.",
  listeria_mono: "L. mono",
  salmonella: "Salmonella",
  apc: "APC",
  eb: "EB",
  coliform: "Coliform",
  ecoli: "E. coli",
  yeast_mold: "Y&M"
};

export default function EMPReports({ sites, samples, thresholds, predictions, organizationId }) {
  const [dateRange, setDateRange] = useState("90");
  const [reportType, setReportType] = useState("summary");

  const cutoffDate = useMemo(() => subDays(new Date(), parseInt(dateRange)), [dateRange]);

  const filteredSamples = useMemo(() => {
    return samples.filter(s => new Date(s.collection_date) >= cutoffDate);
  }, [samples, cutoffDate]);

  // Monthly trend data
  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 11),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthSamples = samples.filter(s => {
        const date = new Date(s.collection_date);
        return date >= monthStart && date <= monthEnd;
      });

      return {
        month: format(month, "MMM"),
        total: monthSamples.length,
        positives: monthSamples.filter(s => s.overall_result === "fail").length,
        positivity: monthSamples.length > 0 
          ? ((monthSamples.filter(s => s.overall_result === "fail").length / monthSamples.length) * 100).toFixed(1)
          : 0
      };
    });
  }, [samples]);

  // Zone breakdown
  const zoneData = useMemo(() => {
    const zones = ["zone_1", "zone_2", "zone_3", "zone_4"];
    return zones.map(zone => {
      const zoneSamples = filteredSamples.filter(s => s.zone_classification === zone);
      return {
        zone: zone.replace("_", " ").toUpperCase(),
        total: zoneSamples.length,
        positives: zoneSamples.filter(s => s.overall_result === "fail").length,
        color: ZONE_COLORS[zone]
      };
    });
  }, [filteredSamples]);

  // Test type breakdown
  const testTypeData = useMemo(() => {
    const testCounts = {};
    filteredSamples.forEach(s => {
      s.test_results?.forEach(tr => {
        if (!testCounts[tr.test_type]) {
          testCounts[tr.test_type] = { total: 0, positive: 0 };
        }
        testCounts[tr.test_type].total++;
        if (tr.result === "positive") {
          testCounts[tr.test_type].positive++;
        }
      });
    });

    return Object.entries(testCounts).map(([type, data]) => ({
      test: TEST_LABELS[type] || type,
      total: data.total,
      positive: data.positive,
      rate: data.total > 0 ? ((data.positive / data.total) * 100).toFixed(1) : 0
    }));
  }, [filteredSamples]);

  // Sampling coverage
  const coverageData = useMemo(() => {
    const activeSites = sites.filter(s => s.status === "active");
    const sampledSites = new Set(filteredSamples.map(s => s.site_id));
    const sampledCount = activeSites.filter(s => sampledSites.has(s.id)).length;

    return {
      total: activeSites.length,
      sampled: sampledCount,
      coverage: activeSites.length > 0 ? ((sampledCount / activeSites.length) * 100).toFixed(1) : 0
    };
  }, [sites, filteredSamples]);

  // Top problem sites
  const problemSites = useMemo(() => {
    const siteCounts = {};
    filteredSamples.filter(s => s.overall_result === "fail").forEach(s => {
      if (!siteCounts[s.site_id]) {
        siteCounts[s.site_id] = { count: 0, site_code: s.site_code, site_name: s.site_name, zone: s.zone_classification };
      }
      siteCounts[s.site_id].count++;
    });

    return Object.values(siteCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredSamples]);

  // Summary metrics
  const metrics = useMemo(() => {
    const total = filteredSamples.length;
    const positives = filteredSamples.filter(s => s.overall_result === "fail").length;
    const pending = filteredSamples.filter(s => s.status === "in_lab" || s.status === "collected").length;
    const reswabs = samples.filter(s => s.requires_reswab && s.status !== "closed").length;

    return { total, positives, pending, reswabs, rate: total > 0 ? ((positives / total) * 100).toFixed(1) : 0 };
  }, [filteredSamples, samples]);

  const handleExport = () => {
    // Generate CSV export
    const headers = ["Sample ID", "Site Code", "Site Name", "Zone", "Collection Date", "Result", "Severity", "Tests"];
    const rows = filteredSamples.map(s => [
      s.sample_id || s.id,
      s.site_code,
      s.site_name,
      s.zone_classification,
      s.collection_date,
      s.overall_result,
      s.severity,
      s.test_results?.map(t => `${t.test_type}:${t.result}`).join("; ")
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emp-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h2 className="text-lg font-semibold">EMP Reports & Analytics</h2>
          <p className="text-sm text-slate-500">Audit-ready reporting and trend analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase">Total Samples</p>
            <p className="text-3xl font-bold">{metrics.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase">Positivity Rate</p>
            <p className="text-3xl font-bold text-rose-600">{metrics.rate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase">Coverage</p>
            <p className="text-3xl font-bold text-blue-600">{coverageData.coverage}%</p>
            <p className="text-xs text-slate-400">{coverageData.sampled}/{coverageData.total} sites</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase">Pending</p>
            <p className="text-3xl font-bold text-amber-600">{metrics.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase">Open Reswabs</p>
            <p className="text-3xl font-bold text-orange-600">{metrics.reswabs}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends">
        <TabsList>
          <TabsTrigger value="trends">
            <TrendingUp className="w-4 h-4 mr-2" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="zones">
            Zone Analysis
          </TabsTrigger>
          <TabsTrigger value="tests">
            Test Types
          </TabsTrigger>
          <TabsTrigger value="sites">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Problem Sites
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Sampling Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#3b82f6" name="Total Samples" />
                    <Bar dataKey="positives" fill="#ef4444" name="Positives" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Positivity Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} unit="%" />
                    <Tooltip />
                    <Line type="monotone" dataKey="positivity" stroke="#ef4444" strokeWidth={2} name="Positivity %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="zones" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Samples by Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={zoneData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis type="category" dataKey="zone" fontSize={12} width={80} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#3b82f6" name="Total" />
                    <Bar dataKey="positives" fill="#ef4444" name="Positives" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Zone Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={zoneData}
                      dataKey="total"
                      nameKey="zone"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ zone, total }) => `${zone}: ${total}`}
                    >
                      {zoneData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tests" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test Type Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Test Type</th>
                      <th className="text-right py-3 px-4">Total Tests</th>
                      <th className="text-right py-3 px-4">Positives</th>
                      <th className="text-right py-3 px-4">Rate</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testTypeData.map(test => (
                      <tr key={test.test} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium">{test.test}</td>
                        <td className="text-right py-3 px-4">{test.total}</td>
                        <td className="text-right py-3 px-4">{test.positive}</td>
                        <td className="text-right py-3 px-4">{test.rate}%</td>
                        <td className="py-3 px-4">
                          {parseFloat(test.rate) === 0 ? (
                            <Badge className="bg-emerald-600">Clean</Badge>
                          ) : parseFloat(test.rate) < 5 ? (
                            <Badge className="bg-amber-600">Acceptable</Badge>
                          ) : (
                            <Badge className="bg-rose-600">High</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sites" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sites with Most Positives</CardTitle>
            </CardHeader>
            <CardContent>
              {problemSites.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
                  <p className="text-slate-500">No positive findings in this period</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {problemSites.map((site, idx) => (
                    <div key={site.site_code} className="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-200 flex items-center justify-center font-bold text-rose-700">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium">{site.site_code}</p>
                          <p className="text-sm text-slate-600">{site.site_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-rose-600">{site.count}</p>
                        <Badge style={{ backgroundColor: ZONE_COLORS[site.zone] + "20", color: ZONE_COLORS[site.zone] }}>
                          {site.zone?.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none text-slate-700">
            <p>
              Over the past {dateRange} days, <strong>{metrics.total}</strong> environmental samples were collected 
              across <strong>{coverageData.sampled}</strong> of <strong>{coverageData.total}</strong> active monitoring sites 
              ({coverageData.coverage}% coverage).
            </p>
            <p>
              The overall positivity rate was <strong>{metrics.rate}%</strong> ({metrics.positives} positives), 
              with Zone 1 (product contact) recording {zoneData[0]?.positives || 0} positive findings.
              {problemSites.length > 0 && (
                <> Site <strong>{problemSites[0]?.site_code}</strong> had the highest number of positives ({problemSites[0]?.count}) and may require additional focus.</>
              )}
            </p>
            <p>
              Currently, there are <strong>{metrics.pending}</strong> samples pending results and <strong>{metrics.reswabs}</strong> open reswab requirements.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}