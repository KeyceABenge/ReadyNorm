import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { Clock, TrendingDown, Factory, AlertTriangle, DollarSign } from "lucide-react";

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

const REASON_LABELS = {
  equipment_contamination: "Equipment Contamination",
  foreign_material: "Foreign Material",
  allergen_control: "Allergen Control",
  pest_activity: "Pest Activity",
  chemical_issue: "Chemical Issue",
  drain_backup: "Drain Backup",
  water_leak: "Water Leak",
  cleaning_failure: "Cleaning Failure",
  employee_error: "Employee Error",
  training_gap: "Training Gap",
  ssop_deviation: "SSOP Deviation",
  equipment_failure: "Equipment Failure",
  other: "Other"
};

export default function DowntimeAnalytics({ events = [], capas = [], productionLines = [] }) {
  const [timeRange, setTimeRange] = useState("90");

  const cutoffDate = subDays(new Date(), parseInt(timeRange));
  const filteredEvents = events.filter(e => new Date(e.event_date) >= cutoffDate);

  // Total downtime
  const totalDowntimeMinutes = filteredEvents.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  const totalDowntimeHours = Math.round(totalDowntimeMinutes / 60);

  // Total cost impact
  const totalCostImpact = filteredEvents.reduce((sum, e) => sum + (e.impact_cost_estimate || 0), 0);

  // Events by reason category
  const byReasonCategory = filteredEvents.reduce((acc, e) => {
    const cat = e.reason_category || "other";
    if (!acc[cat]) acc[cat] = { count: 0, minutes: 0 };
    acc[cat].count++;
    acc[cat].minutes += e.duration_minutes || 0;
    return acc;
  }, {});

  const reasonCategoryData = Object.entries(byReasonCategory)
    .map(([category, data]) => ({
      name: REASON_LABELS[category] || category,
      category,
      count: data.count,
      hours: Math.round(data.minutes / 60 * 10) / 10
    }))
    .sort((a, b) => b.count - a.count);

  // Events by line
  const byLine = filteredEvents.reduce((acc, e) => {
    const line = e.production_line_name || "Unknown";
    if (!acc[line]) acc[line] = { count: 0, minutes: 0 };
    acc[line].count++;
    acc[line].minutes += e.duration_minutes || 0;
    return acc;
  }, {});

  const lineData = Object.entries(byLine)
    .map(([line, data]) => ({
      name: line,
      count: data.count,
      hours: Math.round(data.minutes / 60 * 10) / 10
    }))
    .sort((a, b) => b.hours - a.hours);

  // Monthly trend
  const sixMonthsAgo = subMonths(new Date(), 6);
  const months = eachMonthOfInterval({ start: sixMonthsAgo, end: new Date() });
  const monthlyTrend = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const monthEvents = events.filter(e => {
      const eventDate = new Date(e.event_date);
      return eventDate >= monthStart && eventDate <= monthEnd;
    });
    return {
      month: format(month, "MMM"),
      events: monthEvents.length,
      hours: Math.round(monthEvents.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60)
    };
  });

  // CAPA effectiveness
  const closedCapas = capas.filter(c => c.status === "closed" || c.status === "effective");
  const effectiveCapas = capas.filter(c => c.verification_result === "effective");
  const capaEffectivenessRate = closedCapas.length > 0 
    ? Math.round((effectiveCapas.length / closedCapas.length) * 100) 
    : 0;

  // Recurring issues
  const recurringEvents = filteredEvents.filter(e => e.is_recurring);

  // Root cause distribution
  const byRootCause = filteredEvents.reduce((acc, e) => {
    const cat = e.root_cause_category || "unknown";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const rootCauseData = Object.entries(byRootCause)
    .map(([category, count]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: count
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
            <SelectItem value="180">Last 6 Months</SelectItem>
            <SelectItem value="365">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalDowntimeHours}h</p>
                <p className="text-xs text-slate-500">Total Downtime</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{filteredEvents.length}</p>
                <p className="text-xs text-slate-500">Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">${totalCostImpact.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Est. Impact</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{recurringEvents.length}</p>
                <p className="text-xs text-slate-500">Recurring</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Factory className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{capaEffectivenessRate}%</p>
                <p className="text-xs text-slate-500">CAPA Effective</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Downtime Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="events" stroke="#3b82f6" name="Events" />
                <Line yAxisId="right" type="monotone" dataKey="hours" stroke="#ef4444" name="Hours" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Reason Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Events by Reason Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={reasonCategoryData.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" name="Events" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* By Line */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Downtime by Production Line</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={lineData.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="#ef4444" name="Hours" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Root Cause Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Root Cause Distribution (5M+E)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={rootCauseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {rootCauseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Issues Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Recurring Issues</CardTitle>
        </CardHeader>
        <CardContent>
          {recurringEvents.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No recurring issues detected</p>
          ) : (
            <div className="space-y-2">
              {recurringEvents.slice(0, 5).map(event => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">
                      {REASON_LABELS[event.reason_category] || event.reason_category}
                    </p>
                    <p className="text-sm text-slate-600">{event.production_line_name}</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-amber-100 text-amber-800">
                      {event.recurrence_count}x in 90 days
                    </Badge>
                    <p className="text-sm text-slate-500 mt-1">
                      {Math.round((event.duration_minutes || 0) / 60)}h total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}