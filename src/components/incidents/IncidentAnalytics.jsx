import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { TrendingDown, AlertTriangle, Target, RefreshCw } from "lucide-react";

const COLORS = ["#dc2626", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];

export default function IncidentAnalytics({ incidents }) {
  // Category breakdown
  const categoryData = useMemo(() => {
    const counts = {};
    incidents.forEach(inc => {
      counts[inc.category] = (counts[inc.category] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }))
      .sort((a, b) => b.value - a.value);
  }, [incidents]);

  // Monthly trends
  const monthlyTrends = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = endOfMonth(monthStart);
      
      const monthIncidents = incidents.filter(inc => {
        if (!inc.created_date) return false;
        const createdDate = parseISO(inc.created_date);
        return isWithinInterval(createdDate, { start: monthStart, end: monthEnd });
      });

      months.push({
        month: format(monthStart, "MMM"),
        total: monthIncidents.length,
        incidents: monthIncidents.filter(i => i.type === "incident").length,
        nearMisses: monthIncidents.filter(i => i.type === "near_miss").length,
        closed: monthIncidents.filter(i => i.status === "closed").length
      });
    }
    return months;
  }, [incidents]);

  // Severity distribution
  const severityData = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    incidents.forEach(inc => {
      counts[inc.severity] = (counts[inc.severity] || 0) + 1;
    });
    return [
      { name: "Critical", value: counts.critical, color: "#dc2626" },
      { name: "High", value: counts.high, color: "#f97316" },
      { name: "Medium", value: counts.medium, color: "#eab308" },
      { name: "Low", value: counts.low, color: "#22c55e" }
    ].filter(d => d.value > 0);
  }, [incidents]);

  // Root cause breakdown
  const rootCauseData = useMemo(() => {
    const counts = {};
    incidents.filter(i => i.root_cause_category).forEach(inc => {
      counts[inc.root_cause_category] = (counts[inc.root_cause_category] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }))
      .sort((a, b) => b.value - a.value);
  }, [incidents]);

  // Recurrence analysis
  const recurrenceStats = useMemo(() => {
    const recurring = incidents.filter(i => i.recurrence_count > 0);
    return {
      total: recurring.length,
      rate: incidents.length > 0 ? Math.round((recurring.length / incidents.length) * 100) : 0,
      topRecurring: recurring.sort((a, b) => b.recurrence_count - a.recurrence_count).slice(0, 5)
    };
  }, [incidents]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span className="text-sm text-slate-600">Total Incidents</span>
            </div>
            <p className="text-2xl font-bold">{incidents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-slate-600">Closure Rate</span>
            </div>
            <p className="text-2xl font-bold">
              {incidents.length > 0 
                ? Math.round((incidents.filter(i => i.status === "closed").length / incidents.length) * 100)
                : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-slate-600">Recurrence Rate</span>
            </div>
            <p className="text-2xl font-bold">{recurrenceStats.rate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-slate-600">This Month</span>
            </div>
            <p className="text-2xl font-bold">{monthlyTrends[monthlyTrends.length - 1]?.total || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="incidents" name="Incidents" stroke="#dc2626" strokeWidth={2} />
                  <Line type="monotone" dataKey="nearMisses" name="Near Misses" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Severity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Root Causes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Root Cause Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {rootCauseData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rootCauseData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">
                No root cause data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recurring Incidents */}
      {recurrenceStats.topRecurring.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-600" />
              Recurring Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recurrenceStats.topRecurring.map(inc => (
                <div key={inc.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">{inc.title}</p>
                    <p className="text-sm text-slate-500">{inc.category?.replace(/_/g, " ")}</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700">
                    {inc.recurrence_count} occurrences
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}