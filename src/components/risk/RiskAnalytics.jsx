import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { subMonths, startOfMonth, endOfMonth, isAfter, isBefore } from "date-fns";
import { TrendingUp, TrendingDown, Shield } from "lucide-react";

export default function RiskAnalytics({ risks, reviews }) {
  const activeRisks = risks.filter(r => !["closed", "accepted"].includes(r.status));

  const levelData = useMemo(() => [
    { name: "Critical", value: activeRisks.filter(r => r.risk_level === "critical").length, color: "#ef4444" },
    { name: "High", value: activeRisks.filter(r => r.risk_level === "high").length, color: "#f97316" },
    { name: "Medium", value: activeRisks.filter(r => r.risk_level === "medium").length, color: "#eab308" },
    { name: "Low", value: activeRisks.filter(r => r.risk_level === "low").length, color: "#10b981" }
  ].filter(d => d.value > 0), [activeRisks]);

  const categoryData = useMemo(() => {
    const cats = {};
    activeRisks.forEach(r => { cats[r.category] = (cats[r.category] || 0) + 1; });
    return Object.entries(cats).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })).sort((a, b) => b.value - a.value);
  }, [activeRisks]);

  const sourceData = useMemo(() => {
    const sources = {};
    activeRisks.forEach(r => { sources[r.source] = (sources[r.source] || 0) + 1; });
    return Object.entries(sources).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })).sort((a, b) => b.value - a.value);
  }, [activeRisks]);

  const trendData = useMemo(() => {
    const improving = activeRisks.filter(r => r.trend === "improving").length;
    const stable = activeRisks.filter(r => r.trend === "stable").length;
    const worsening = activeRisks.filter(r => r.trend === "worsening").length;
    return [
      { name: "Improving", value: improving, color: "#10b981" },
      { name: "Stable", value: stable, color: "#64748b" },
      { name: "Worsening", value: worsening, color: "#ef4444" }
    ].filter(d => d.value > 0);
  }, [activeRisks]);

  const monthRanges = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return { month: date.toLocaleDateString('en-US', { month: 'short' }), start: startOfMonth(date), end: endOfMonth(date) };
  }), []);

  const riskTrend = useMemo(() => monthRanges.map(({ month, start, end }) => ({
    month, count: risks.filter(r => { const d = new Date(r.created_date); return isAfter(d, start) && isBefore(d, end); }).length
  })), [risks, monthRanges]);

  const avgScore = activeRisks.length > 0 ? Math.round(activeRisks.reduce((sum, r) => sum + (r.risk_score || 0), 0) / activeRisks.length) : 0;
  const completedReviews = reviews.filter(r => r.status === "completed").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Active Risks</p><p className="text-2xl font-bold text-slate-800">{activeRisks.length}</p></CardContent></Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Avg Risk Score</p><p className="text-2xl font-bold text-purple-600">{avgScore}</p></CardContent></Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Mgmt Reviews</p><p className="text-2xl font-bold text-blue-600">{completedReviews}</p></CardContent></Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80"><CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Improving</p><p className="text-2xl font-bold text-emerald-600">{activeRisks.filter(r => r.trend === "improving").length}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader><CardTitle className="text-base">Risk Level Distribution</CardTitle></CardHeader>
          <CardContent>
            {levelData.length > 0 ? (
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={levelData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">{levelData.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-center text-slate-500 py-8">No data</p>}
            <div className="flex flex-wrap justify-center gap-3 mt-2">{levelData.map((d, i) => (<div key={i} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} /><span className="text-xs text-slate-600">{d.name}: {d.value}</span></div>))}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader><CardTitle className="text-base">New Risks Trend (6 Months)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} /></LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader><CardTitle className="text-base">Risks by Category</CardTitle></CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} /></BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-center text-slate-500 py-8">No data</p>}
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader><CardTitle className="text-base">Risks by Source</CardTitle></CardHeader>
          <CardContent>
            {sourceData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourceData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} /></BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-center text-slate-500 py-8">No data</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base">Risk Trend Direction</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-center gap-6">
            {trendData.map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                {d.name === "Improving" ? <TrendingDown className="w-6 h-6 text-emerald-500" /> : d.name === "Worsening" ? <TrendingUp className="w-6 h-6 text-rose-500" /> : <Shield className="w-6 h-6 text-slate-400" />}
                <div>
                  <p className="text-2xl font-bold text-slate-800">{d.value}</p>
                  <p className="text-sm text-slate-500">{d.name}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}