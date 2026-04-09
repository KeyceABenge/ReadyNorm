import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// @ts-nocheck
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { subMonths, startOfMonth, endOfMonth, isAfter, isBefore } from "date-fns";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";

const CATEGORY_LABELS = { quality: "Quality", food_safety: "Food Safety", sanitation: "Sanitation", pest: "Pest Control", environmental: "Environmental", audit: "Audit", customer: "Customer", operational: "Operational", other: "Other" };

export default function IssueAnalytics({ issues, capas }) {
  const [timeRange, setTimeRange] = useState("6months");
  const today = new Date();
  const months = timeRange === "3months" ? 3 : timeRange === "6months" ? 6 : 12;

  const monthRanges = useMemo(() => Array.from({ length: months }, (_, i) => {
    const date = subMonths(today, months - 1 - i);
    return { month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), start: startOfMonth(date), end: endOfMonth(date) };
  }), [months]);

  const issuesTrend = useMemo(() => monthRanges.map(({ month, start, end }) => {
    const periodIssues = issues.filter(i => { const created = new Date(i.created_date); return isAfter(created, start) && isBefore(created, end); });
    return { month, total: periodIssues.length, critical: periodIssues.filter(i => i.severity === "critical").length, closed: periodIssues.filter(i => i.status === "closed").length };
  }), [issues, monthRanges]);

  const categoryData = useMemo(() => Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ name: label, value: issues.filter(i => i.category === key).length })).filter(d => d.value > 0).sort((a, b) => b.value - a.value), [issues]);

  const severityData = useMemo(() => [
    { name: "Critical", value: issues.filter(i => i.severity === "critical").length, color: "#ef4444" },
    { name: "Major", value: issues.filter(i => i.severity === "major").length, color: "#f59e0b" },
    { name: "Moderate", value: issues.filter(i => i.severity === "moderate").length, color: "#eab308" },
    { name: "Minor", value: issues.filter(i => i.severity === "minor").length, color: "#64748b" }
  ].filter(d => d.value > 0), [issues]);

  const resolutionStats = useMemo(() => {
    const closedIssues = issues.filter(i => i.status === "closed" && i.closed_at && i.created_date);
    if (closedIssues.length === 0) return { avg: 0, min: 0, max: 0 };
    const times = closedIssues.map(i => (new Date(i.closed_at).getTime() - new Date(i.created_date).getTime()) / (1000 * 60 * 60 * 24));
    return { avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length), min: Math.round(Math.min(...times)), max: Math.round(Math.max(...times)) };
  }, [issues]);

  const capaConversionRate = issues.length > 0 ? Math.round((issues.filter(i => i.linked_capa_id).length / issues.length) * 100) : 0;
  const recurrenceRate = issues.length > 0 ? Math.round((issues.filter(i => i.is_recurring).length / issues.length) * 100) : 0;
  const momChange = issuesTrend.length >= 2 && issuesTrend[issuesTrend.length - 2].total > 0 ? Math.round(((issuesTrend[issuesTrend.length - 1].total - issuesTrend[issuesTrend.length - 2].total) / issuesTrend[issuesTrend.length - 2].total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {/* @ts-ignore */}
        <Select value={timeRange} onValueChange={setTimeRange}><SelectTrigger className="w-36 bg-white/60"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="3months">3 Months</SelectItem><SelectItem value="6months">6 Months</SelectItem><SelectItem value="12months">12 Months</SelectItem></SelectContent></Select>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Total Issues</p><div className="flex items-center gap-2"><p className="text-2xl font-bold text-slate-800">{issues.length}</p>{momChange !== 0 && <span className={`text-xs flex items-center gap-0.5 ${momChange > 0 ? "text-rose-600" : "text-emerald-600"}`}>{momChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(momChange)}%</span>}</div></CardContent></Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Avg Resolution Time</p><p className="text-2xl font-bold text-blue-600">{resolutionStats.avg} days</p></CardContent></Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">CAPA Conversion</p><p className="text-2xl font-bold text-rose-600">{capaConversionRate}%</p></CardContent></Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Recurrence Rate</p><p className="text-2xl font-bold text-amber-600">{recurrenceRate}%</p></CardContent></Card>
      </div>
      <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardHeader><CardTitle className="text-base">Issue Trend</CardTitle></CardHeader><CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={issuesTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Line type="monotone" dataKey="total" stroke="#64748b" strokeWidth={2} name="Total" /><Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} name="Critical" /><Line type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={2} name="Closed" /></LineChart></ResponsiveContainer></div></CardContent></Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardHeader><CardTitle className="text-base">Issues by Category</CardTitle></CardHeader><CardContent>{categoryData.length > 0 ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div> : <p className="text-center text-slate-500 py-8">No data</p>}</CardContent></Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardHeader><CardTitle className="text-base">Issues by Severity</CardTitle></CardHeader><CardContent>{severityData.length > 0 ? <div className="h-64 flex items-center justify-center"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={severityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">{severityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div> : <p className="text-center text-slate-500 py-8">No data</p>}<div className="flex flex-wrap justify-center gap-3 mt-2">{severityData.map((entry, idx) => <div key={idx} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} /><span className="text-xs text-slate-600">{entry.name}: {entry.value}</span></div>)}</div></CardContent></Card>
      </div>
      <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" />Resolution Time Statistics</CardTitle></CardHeader><CardContent><div className="grid grid-cols-3 gap-6"><div className="text-center p-4 bg-blue-50 rounded-lg"><p className="text-xs text-blue-600 mb-1">Minimum</p><p className="text-2xl font-bold text-blue-700">{resolutionStats.min} days</p></div><div className="text-center p-4 bg-slate-50 rounded-lg"><p className="text-xs text-slate-600 mb-1">Average</p><p className="text-2xl font-bold text-slate-700">{resolutionStats.avg} days</p></div><div className="text-center p-4 bg-amber-50 rounded-lg"><p className="text-xs text-amber-600 mb-1">Maximum</p><p className="text-2xl font-bold text-amber-700">{resolutionStats.max} days</p></div></div></CardContent></Card>
    </div>
  );
}