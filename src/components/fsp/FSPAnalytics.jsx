import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function FSPAnalytics({ plans, processSteps, hazards, controls }) {
  const activePlans = plans.filter(p => p.status === "active");
  const significantHazards = hazards.filter(h => h.is_significant);
  const activeControls = controls.filter(c => c.status === "active");
  const validatedControls = controls.filter(c => c.validation_status === "validated");

  const hazardsByType = useMemo(() => [
    { name: "Biological", value: hazards.filter(h => h.hazard_type === "biological").length, color: "#ef4444" },
    { name: "Chemical", value: hazards.filter(h => h.hazard_type === "chemical").length, color: "#f59e0b" },
    { name: "Physical", value: hazards.filter(h => h.hazard_type === "physical").length, color: "#3b82f6" },
    { name: "Allergen", value: hazards.filter(h => h.hazard_type === "allergen").length, color: "#8b5cf6" }
  ].filter(d => d.value > 0), [hazards]);

  const controlsByType = useMemo(() => [
    { name: "Process", value: controls.filter(c => c.control_type === "process").length, color: "#3b82f6" },
    { name: "Sanitation", value: controls.filter(c => c.control_type === "sanitation").length, color: "#10b981" },
    { name: "Allergen", value: controls.filter(c => c.control_type === "allergen").length, color: "#8b5cf6" },
    { name: "Supply Chain", value: controls.filter(c => c.control_type === "supply_chain").length, color: "#f59e0b" },
    { name: "CCP", value: controls.filter(c => c.control_type === "ccp").length, color: "#ef4444" }
  ].filter(d => d.value > 0), [controls]);

  const validationStatus = useMemo(() => [
    { name: "Validated", value: controls.filter(c => c.validation_status === "validated").length, color: "#10b981" },
    { name: "Pending", value: controls.filter(c => c.validation_status === "pending").length, color: "#f59e0b" },
    { name: "Needs Revalidation", value: controls.filter(c => c.validation_status === "revalidation_required").length, color: "#ef4444" }
  ].filter(d => d.value > 0), [controls]);

  const controlledHazards = significantHazards.filter(h => h.linked_preventive_control_id).length;
  const uncontrolledHazards = significantHazards.length - controlledHazards;
  const coveragePercent = significantHazards.length > 0 ? Math.round((controlledHazards / significantHazards.length) * 100) : 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Active Plans</p><p className="text-2xl font-bold text-emerald-600">{activePlans.length}</p></CardContent>
        </Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Significant Hazards</p><p className="text-2xl font-bold text-amber-600">{significantHazards.length}</p></CardContent>
        </Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Hazard Coverage</p><p className="text-2xl font-bold text-blue-600">{coveragePercent}%</p></CardContent>
        </Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardContent className="pt-4"><p className="text-xs text-slate-500 mb-1">Validated Controls</p><p className="text-2xl font-bold text-purple-600">{validatedControls.length}/{controls.length}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader><CardTitle className="text-base">Hazards by Type</CardTitle></CardHeader>
          <CardContent>
            {hazardsByType.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hazardsByType}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]}>{hazardsByType.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Bar></BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-center text-slate-500 py-8">No hazards</p>}
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader><CardTitle className="text-base">Controls by Type</CardTitle></CardHeader>
          <CardContent>
            {controlsByType.length > 0 ? (
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={controlsByType} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">{controlsByType.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-center text-slate-500 py-8">No controls</p>}
            <div className="flex flex-wrap justify-center gap-3 mt-2">{controlsByType.map((d, i) => (<div key={i} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} /><span className="text-xs text-slate-600">{d.name}: {d.value}</span></div>))}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader><CardTitle className="text-base">Validation Status</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {validationStatus.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-slate-700">{item.name}</span>
                  </div>
                  <span className="text-lg font-bold text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader><CardTitle className="text-base">Hazard Control Coverage</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-6">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="#e2e8f0" strokeWidth="12" fill="none" />
                  <circle cx="64" cy="64" r="56" stroke="#10b981" strokeWidth="12" fill="none" strokeDasharray={`${coveragePercent * 3.52} 352`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-slate-800">{coveragePercent}%</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{controlledHazards}</p>
                <p className="text-xs text-slate-500">Controlled</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-rose-600">{uncontrolledHazards}</p>
                <p className="text-xs text-slate-500">Need Control</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}