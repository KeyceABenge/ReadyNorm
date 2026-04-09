import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, Brain, Lightbulb, TrendingUp, Target, UserCheck } from "lucide-react";

export default function TrainingGapAnalysis({ employees, trainingRecords, competencyRecords, matrices, areas, tasks, organizationId, settings }) {
  const [analysisType, setAnalysisType] = useState("byRole");

  const today = new Date();
  const jobRoles = settings?.job_roles || ["Sanitation Technician", "Lead Sanitation", "Quality Technician"];
  const departments = settings?.departments || ["Sanitation", "Quality", "Production"];

  // Calculate gaps by role
  const gapsByRole = jobRoles.map(role => {
    const roleEmployees = employees.filter(e => e.role === role);
    const roleMatrices = matrices.filter(m => m.roles?.includes(role) && m.status === "active");
    
    let totalRequired = 0;
    let totalCompleted = 0;
    let gaps = [];

    roleEmployees.forEach(emp => {
      roleMatrices.forEach(matrix => {
        (matrix.required_trainings || []).forEach(req => {
          totalRequired++;
          const record = trainingRecords.find(r => 
            r.employee_id === emp.id && 
            r.training_document_id === req.training_document_id &&
            r.status === "completed"
          );
          if (record) {
            totalCompleted++;
          } else {
            gaps.push({
              employee: emp.name,
              training: req.document_title
            });
          }
        });
      });
    });

    return {
      name: role,
      employees: roleEmployees.length,
      required: totalRequired,
      completed: totalCompleted,
      gapCount: totalRequired - totalCompleted,
      compliance: totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 100,
      gaps
    };
  }).filter(r => r.employees > 0);

  // Calculate gaps by area
  const gapsByArea = areas.map(area => {
    const areaEmployees = employees.filter(e => e.area_id === area.id || e.default_area === area.name);
    const areaCompetencies = competencyRecords.filter(r => 
      r.competency_type === "area" && r.reference_id === area.id
    );
    
    const competentEmployees = areaEmployees.filter(emp => 
      areaCompetencies.some(c => c.employee_id === emp.id && c.status === "competent")
    );

    return {
      name: area.name,
      total: areaEmployees.length,
      competent: competentEmployees.length,
      gap: areaEmployees.length - competentEmployees.length,
      coverage: areaEmployees.length > 0 ? Math.round((competentEmployees.length / areaEmployees.length) * 100) : 0
    };
  }).filter(a => a.total > 0);

  // AI Recommendations
  const generateRecommendations = () => {
    const recommendations = [];

    // Check for critical coverage gaps
    gapsByArea.forEach(area => {
      if (area.coverage < 50 && area.total >= 2) {
        recommendations.push({
          type: "critical",
          icon: AlertTriangle,
          title: `Low coverage in ${area.name}`,
          description: `Only ${area.coverage}% of employees are competent. Consider cross-training ${area.gap} additional employee(s).`,
          action: "Schedule cross-training"
        });
      }
    });

    // Check for single points of failure
    gapsByArea.forEach(area => {
      if (area.competent === 1 && area.total > 1) {
        recommendations.push({
          type: "warning",
          icon: UserCheck,
          title: `Single point of failure: ${area.name}`,
          description: "Only one competent employee. Cross-train at least one more for backup coverage.",
          action: "Identify backup candidate"
        });
      }
    });

    // Check for expiring certifications
    const expiringCount = trainingRecords.filter(r => {
      if (r.status !== "completed" || !r.expiration_date) return false;
      const daysUntil = Math.ceil((new Date(r.expiration_date) - today) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 30;
    }).length;

    if (expiringCount > 0) {
      recommendations.push({
        type: "warning",
        icon: TrendingUp,
        title: `${expiringCount} certifications expiring soon`,
        description: "Schedule recertification to maintain compliance.",
        action: "View expiring trainings"
      });
    }

    // Check for low compliance roles
    gapsByRole.forEach(role => {
      if (role.compliance < 70 && role.required > 0) {
        recommendations.push({
          type: "critical",
          icon: Target,
          title: `${role.name} compliance at ${role.compliance}%`,
          description: `${role.gapCount} training gap(s) need to be addressed.`,
          action: "Assign missing trainings"
        });
      }
    });

    // Suggest cross-training opportunities
    const highPerformers = employees.filter(emp => {
      const empCompetencies = competencyRecords.filter(c => c.employee_id === emp.id);
      return empCompetencies.filter(c => c.level === "expert" || c.level === "trainer").length >= 2;
    });

    if (highPerformers.length > 0) {
      recommendations.push({
        type: "opportunity",
        icon: Lightbulb,
        title: "Cross-training opportunity",
        description: `${highPerformers.length} employee(s) with expert-level skills could train others.`,
        action: "View potential trainers"
      });
    }

    return recommendations.slice(0, 5);
  };

  const recommendations = generateRecommendations();

  const chartData = analysisType === "byRole" 
    ? gapsByRole.map(r => ({ name: r.name, value: r.compliance, gap: r.gapCount }))
    : gapsByArea.map(a => ({ name: a.name, value: a.coverage, gap: a.gap }));

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Brain className="w-5 h-5 text-teal-600" />
          Training Gap Analysis
        </h2>
        <Select value={analysisType} onValueChange={setAnalysisType}>
          <SelectTrigger className="w-40 bg-white/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="byRole">By Role</SelectItem>
            <SelectItem value="byArea">By Area</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 mb-1">Total Employees</p>
            <p className="text-2xl font-bold text-slate-800">{employees.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 mb-1">Active Matrices</p>
            <p className="text-2xl font-bold text-blue-600">{matrices.filter(m => m.status === "active").length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 mb-1">Total Gaps</p>
            <p className="text-2xl font-bold text-rose-600">
              {analysisType === "byRole" 
                ? gapsByRole.reduce((sum, r) => sum + r.gapCount, 0)
                : gapsByArea.reduce((sum, a) => sum + a.gap, 0)
              }
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 mb-1">Avg. Coverage</p>
            <p className="text-2xl font-bold text-emerald-600">
              {analysisType === "byRole"
                ? Math.round(gapsByRole.reduce((sum, r) => sum + r.compliance, 0) / (gapsByRole.length || 1))
                : Math.round(gapsByArea.reduce((sum, a) => sum + a.coverage, 0) / (gapsByArea.length || 1))
              }%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gap Chart */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader>
            <CardTitle className="text-base">
              {analysisType === "byRole" ? "Compliance by Role" : "Coverage by Area"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === "value" ? `${value}%` : value,
                        name === "value" ? "Coverage" : "Gaps"
                      ]}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.value >= 80 ? '#10b981' : entry.value >= 60 ? '#f59e0b' : '#ef4444'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-slate-400">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.map((rec, idx) => {
                  const Icon = rec.icon;
                  const bgColor = rec.type === "critical" ? "bg-rose-50" : 
                                  rec.type === "warning" ? "bg-amber-50" : "bg-emerald-50";
                  const iconColor = rec.type === "critical" ? "text-rose-600" : 
                                    rec.type === "warning" ? "text-amber-600" : "text-emerald-600";
                  
                  return (
                    <div key={idx} className={`p-3 rounded-lg ${bgColor}`}>
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 ${iconColor} mt-0.5`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">{rec.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{rec.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No recommendations at this time</p>
                <p className="text-xs mt-1">All training requirements are met</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Gap List */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader>
          <CardTitle className="text-base">
            {analysisType === "byRole" ? "Gaps by Role" : "Coverage by Area"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 font-medium text-slate-600">
                    {analysisType === "byRole" ? "Role" : "Area"}
                  </th>
                  <th className="text-center py-2 font-medium text-slate-600">Employees</th>
                  <th className="text-center py-2 font-medium text-slate-600">
                    {analysisType === "byRole" ? "Required" : "Total"}
                  </th>
                  <th className="text-center py-2 font-medium text-slate-600">
                    {analysisType === "byRole" ? "Completed" : "Competent"}
                  </th>
                  <th className="text-center py-2 font-medium text-slate-600">Gaps</th>
                  <th className="text-center py-2 font-medium text-slate-600">
                    {analysisType === "byRole" ? "Compliance" : "Coverage"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(analysisType === "byRole" ? gapsByRole : gapsByArea).map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-2 font-medium text-slate-800">{item.name}</td>
                    <td className="py-2 text-center text-slate-600">
                      {analysisType === "byRole" ? item.employees : item.total}
                    </td>
                    <td className="py-2 text-center text-slate-600">
                      {analysisType === "byRole" ? item.required : item.total}
                    </td>
                    <td className="py-2 text-center text-slate-600">
                      {analysisType === "byRole" ? item.completed : item.competent}
                    </td>
                    <td className="py-2 text-center">
                      <Badge className={item.gapCount > 0 || item.gap > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}>
                        {analysisType === "byRole" ? item.gapCount : item.gap}
                      </Badge>
                    </td>
                    <td className="py-2 text-center">
                      <Badge className={
                        (item.compliance || item.coverage) >= 80 ? "bg-emerald-100 text-emerald-700" :
                        (item.compliance || item.coverage) >= 60 ? "bg-amber-100 text-amber-700" :
                        "bg-rose-100 text-rose-700"
                      }>
                        {analysisType === "byRole" ? item.compliance : item.coverage}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}