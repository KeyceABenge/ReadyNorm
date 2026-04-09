import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { subMonths, startOfMonth, endOfMonth, isAfter, isBefore } from "date-fns";
import { TrendingUp, TrendingDown, Users, Package } from "lucide-react";

const COMPLAINT_TYPE_LABELS = { foreign_material: "Foreign Material", quality_defect: "Quality Defect", food_safety: "Food Safety", allergen: "Allergen", labeling: "Labeling", packaging: "Packaging", taste_odor: "Taste/Odor", appearance: "Appearance", short_weight: "Short Weight", spoilage: "Spoilage", other: "Other" };
const ROOT_CAUSE_LABELS = { equipment: "Equipment", personnel: "Personnel", process: "Process", material: "Material", environment: "Environment", supplier: "Supplier", unknown: "Unknown", not_substantiated: "Not Substantiated" };

export default function ComplaintAnalytics({ complaints, capas }) {
  const [timeRange, setTimeRange] = useState("6months");
  const today = new Date();
  const months = timeRange === "3months" ? 3 : timeRange === "6months" ? 6 : 12;

  const monthRanges = useMemo(() => Array.from({ length: months }, (_, i) => {
    const date = subMonths(today, months - 1 - i);
    return { month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), start: startOfMonth(date), end: endOfMonth(date) };
  }), [months]);

  const complaintsTrend = useMemo(() => monthRanges.map(({ month, start, end }) => {
    const periodComplaints = complaints.filter(c => { const created = new Date(c.created_date); return isAfter(created, start) && isBefore(created, end); });
    return { month, total: periodComplaints.length, critical: periodComplaints.filter(c => c.severity === "critical").length, illness: periodComplaints.filter(c => ["illness_claimed", "illness_confirmed", "injury", "hospitalization"].includes(c.customer_impact)).length, closed: periodComplaints.filter(c => c.status === "closed").length };
  }), [complaints, monthRanges]);

  const typeData = useMemo(() => Object.entries(COMPLAINT_TYPE_LABELS).map(([key, label]) => ({ name: label, value: complaints.filter(c => c.complaint_type === key).length })).filter(d => d.value > 0).sort((a, b) => b.value - a.value), [complaints]);

  const rootCauseData = useMemo(() => Object.entries(ROOT_CAUSE_LABELS).map(([key, label]) => ({ name: label, value: complaints.filter(c => c.root_cause_category === key).length })).filter(d => d.value > 0).sort((a, b) => b.value - a.value), [complaints]);

  const customerData = useMemo(() => {
    const counts = complaints.reduce((acc, c) => { if (c.customer_name) acc[c.customer_name] = (acc[c.customer_name] || 0) + 1; return acc; }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [complaints]);

  const productData = useMemo(() => {
    const counts = complaints.reduce((acc, c) => { if (c.product_name) acc[c.product_name] = (acc[c.product_name] || 0) + 1; return acc; }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [complaints]);

  const severityData = useMemo(() => [
    { name: "Critical", value: complaints.filter(c => c.severity === "critical").length, color: "#ef4444" },
    { name: "Major", value: complaints.filter(c => c.severity === "major").length, color: "#f59e0b" },
    { name: "Moderate", value: complaints.filter(c => c.severity === "moderate").length, color: "#eab308" },
    { name: "Minor", value: complaints.filter(c => c.severity === "minor").length, color: "#64748b" }
  ].filter(d => d.value > 0), [complaints]);

  const resolutionStats = useMemo(() => {
    const closedComplaints = complaints.filter(c => c.status === "closed" && c.closed_at && c.created_date);
    if (closedComplaints.length === 0) return { avg: 0, avgResponse: 0 };
    const times = closedComplaints.map(c => (new Date(c.closed_at) - new Date(c.created_date)) / (1000 * 60 * 60 * 24));
    const respondedComplaints = complaints.filter(c => c.response_sent_at && c.created_date);
    const responseTimes = respondedComplaints.map(c => (new Date(c.response_sent_at) - new Date(c.created_date)) / (1000 * 60 * 60 * 24));
    return { avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length), avgResponse: responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0 };
  }, [complaints]);

  const capaConversionRate = complaints.length > 0 ? Math.round((complaints.filter(c => c.linked_capa_id).length / complaints.length) * 100) : 0;
  const recurrenceRate = complaints.length > 0 ? Math.round((complaints.filter(c => c.is_recurring).length / complaints.length) * 100) : 0;
  const illnessRate = complaints.length > 0 ? Math.round((complaints.filter(c => ["illness_claimed", "illness_confirmed", "injury", "hospitalization"].includes(c.customer_impact)).length / complaints.length) * 100) : 0;
  const momChange = complaintsTrend.length >= 2 && complaintsTrend[complaintsTrend.length - 2].total > 0 ? Math.round(((complaintsTrend[complaintsTrend.length - 1].total - complaintsTrend[complaintsTrend.length - 2].total) / complaintsTrend[complaintsTrend.length - 2].total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Select value={timeRange} onValueChange={setTimeRange}><SelectTrigger className="w-36 bg-white/60"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="3months">3 Months</SelectItem><SelectItem value="6months">6 Months</SelectItem><SelectItem value="12months">12 Months</SelectItem></SelectContent></Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Total Complaints</p><div className="flex items-center gap-2"><p className="text-2xl font-bold text-slate-800">{complaints.length}</p>{momChange !== 0 && <span className={`text-xs flex items-center gap-0.5 ${momChange > 0 ? "text-rose-600" : "text-emerald-600"}`}>{momChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(momChange)}%</span>}</div></CardContent></Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Avg Response Time</p><p className="text-2xl font-bold text-blue-600">{resolutionStats.avgResponse} days</p></CardContent></Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Avg Closure Time</p><p className="text-2xl font-bold text-purple-600">{resolutionStats.avg} days</p></CardContent></Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">CAPA Conversion</p><p className="text-2xl font-bold text-rose-600">{capaConversionRate}%</p></CardContent></Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Illness Rate</p><p className="text-2xl font-bold text-amber-600">{illnessRate}%</p></CardContent></Card>
      </div>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardHeader><CardTitle className="text-base">Complaint Trend</CardTitle></CardHeader><CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={complaintsTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} name="Total" /><Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} name="Critical" /><Line type="monotone" dataKey="illness" stroke="#f59e0b" strokeWidth={2} name="Illness Related" /></LineChart></ResponsiveContainer></div></CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardHeader><CardTitle className="text-base">By Complaint Type</CardTitle></CardHeader><CardContent>{typeData.length > 0 ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={typeData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div> : <p className="text-center text-slate-500 py-8">No data</p>}</CardContent></Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardHeader><CardTitle className="text-base">By Severity</CardTitle></CardHeader><CardContent>{severityData.length > 0 ? <div className="h-64 flex items-center justify-center"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={severityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">{severityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div> : <p className="text-center text-slate-500 py-8">No data</p>}<div className="flex flex-wrap justify-center gap-3 mt-2">{severityData.map((entry, idx) => <div key={idx} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} /><span className="text-xs text-slate-600">{entry.name}: {entry.value}</span></div>)}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-purple-500" />Top Customers</CardTitle></CardHeader><CardContent>{customerData.length > 0 ? <div className="space-y-2">{customerData.map((c, idx) => (<div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"><span className="text-sm text-slate-700 truncate">{c.name}</span><Badge variant="secondary">{c.value}</Badge></div>))}</div> : <p className="text-center text-slate-500 py-8">No data</p>}</CardContent></Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4 text-pink-500" />Top Products</CardTitle></CardHeader><CardContent>{productData.length > 0 ? <div className="space-y-2">{productData.map((p, idx) => (<div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"><span className="text-sm text-slate-700 truncate">{p.name}</span><Badge variant="secondary">{p.value}</Badge></div>))}</div> : <p className="text-center text-slate-500 py-8">No data</p>}</CardContent></Card>
      </div>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardHeader><CardTitle className="text-base">Root Cause Analysis</CardTitle></CardHeader><CardContent>{rootCauseData.length > 0 ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={rootCauseData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Bar dataKey="value" fill="#ec4899" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="text-center text-slate-500 py-8">No root cause data available</p>}</CardContent></Card>
    </div>
  );
}