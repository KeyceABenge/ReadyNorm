import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { subMonths, startOfMonth, endOfMonth, isAfter, isBefore } from "date-fns";
import { TrendingUp } from "lucide-react";

export default function SupplierAnalytics({ suppliers, nonconformances, materials }) {
  const approvedSuppliers = suppliers.filter(s => s.status === "approved");
  const avgPerformance = approvedSuppliers.filter(s => s.performance_score).length > 0
    ? Math.round(approvedSuppliers.filter(s => s.performance_score).reduce((sum, s) => sum + s.performance_score, 0) / approvedSuppliers.filter(s => s.performance_score).length)
    : 0;

  const riskData = useMemo(() => [
    { name: "Low", value: suppliers.filter(s => s.risk_rating === "low" && s.status === "approved").length, color: "#10b981" },
    { name: "Medium", value: suppliers.filter(s => s.risk_rating === "medium" && s.status === "approved").length, color: "#eab308" },
    { name: "High", value: suppliers.filter(s => s.risk_rating === "high" && s.status === "approved").length, color: "#f97316" },
    { name: "Critical", value: suppliers.filter(s => s.risk_rating === "critical" && s.status === "approved").length, color: "#ef4444" }
  ].filter(d => d.value > 0), [suppliers]);

  const typeData = useMemo(() => {
    const types = { ingredient: 0, packaging: 0, service: 0, equipment: 0, chemical: 0, other: 0 };
    approvedSuppliers.forEach(s => { if (types[s.supplier_type] !== undefined) types[s.supplier_type]++; });
    return Object.entries(types).filter(([, v]) => v > 0).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [approvedSuppliers]);

  const ncBySupplier = useMemo(() => {
    const counts = {};
    nonconformances.forEach(nc => { counts[nc.supplier_name] = (counts[nc.supplier_name] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [nonconformances]);

  const ncBySeverity = useMemo(() => [
    { name: "Critical", value: nonconformances.filter(nc => nc.severity === "critical").length, color: "#ef4444" },
    { name: "Major", value: nonconformances.filter(nc => nc.severity === "major").length, color: "#f59e0b" },
    { name: "Moderate", value: nonconformances.filter(nc => nc.severity === "moderate").length, color: "#eab308" },
    { name: "Minor", value: nonconformances.filter(nc => nc.severity === "minor").length, color: "#64748b" }
  ].filter(d => d.value > 0), [nonconformances]);

  const monthRanges = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return { month: date.toLocaleDateString('en-US', { month: 'short' }), start: startOfMonth(date), end: endOfMonth(date) };
  }), []);

  const ncTrend = useMemo(() => monthRanges.map(({ month, start, end }) => ({
    month, count: nonconformances.filter(nc => { const d = new Date(nc.created_date); return isAfter(d, start) && isBefore(d, end); }).length
  })), [nonconformances, monthRanges]);

  const topPerformers = approvedSuppliers.filter(s => s.performance_score).sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Approved Suppliers</p><p className="text-2xl font-bold text-slate-800">{approvedSuppliers.length}</p></CardContent></Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Avg Performance</p><p className="text-2xl font-bold text-emerald-600">{avgPerformance}%</p></CardContent></Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Total NCs</p><p className="text-2xl font-bold text-amber-600">{nonconformances.length}</p></CardContent></Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Materials</p><p className="text-2xl font-bold text-blue-600">{materials.length}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader><CardTitle className="text-base">Risk Distribution</CardTitle></CardHeader>
          <CardContent>
            {riskData.length > 0 ? (
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={riskData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">{riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-center text-slate-500 py-8">No data</p>}
            <div className="flex flex-wrap justify-center gap-3 mt-2">{riskData.map((d, i) => (<div key={i} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} /><span className="text-xs text-slate-600">{d.name}: {d.value}</span></div>))}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader><CardTitle className="text-base">NC Trend (6 Months)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ncTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} /></LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader><CardTitle className="text-base">NCs by Supplier</CardTitle></CardHeader>
          <CardContent>
            {ncBySupplier.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ncBySupplier} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} /></BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-center text-slate-500 py-8">No NCs recorded</p>}
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" />Top Performers</CardTitle></CardHeader>
          <CardContent>
            {topPerformers.length > 0 ? (
              <div className="space-y-2">
                {topPerformers.map((s, idx) => (
                  <div key={s.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                      <span className="text-sm text-slate-700">{s.name}</span>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700">{s.performance_score}%</Badge>
                  </div>
                ))}
              </div>
            ) : <p className="text-center text-slate-500 py-8">No performance data</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base">Suppliers by Type</CardTitle></CardHeader>
        <CardContent>
          {typeData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-center text-slate-500 py-8">No data</p>}
        </CardContent>
      </Card>
    </div>
  );
}