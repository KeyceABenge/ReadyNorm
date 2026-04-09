import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Clock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'];

export default function TrainingDashboard({ trainingRecords, competencyRecords, matrices, employees, trainingDocs }) {
  const today = new Date();

  // Training status distribution
  const statusCounts = {
    completed: trainingRecords.filter(r => r.status === "completed").length,
    in_progress: trainingRecords.filter(r => r.status === "in_progress").length,
    assigned: trainingRecords.filter(r => r.status === "assigned").length,
    expired: trainingRecords.filter(r => r.status === "expired").length,
    failed: trainingRecords.filter(r => r.status === "failed").length
  };

  const statusData = [
    { name: "Completed", value: statusCounts.completed, color: "#10b981" },
    { name: "In Progress", value: statusCounts.in_progress, color: "#3b82f6" },
    { name: "Assigned", value: statusCounts.assigned, color: "#f59e0b" },
    { name: "Expired", value: statusCounts.expired, color: "#6b7280" },
    { name: "Failed", value: statusCounts.failed, color: "#ef4444" }
  ].filter(d => d.value > 0);

  // Competency level distribution
  const competencyLevels = {
    trainee: competencyRecords.filter(r => r.level === "trainee").length,
    competent: competencyRecords.filter(r => r.level === "competent").length,
    proficient: competencyRecords.filter(r => r.level === "proficient").length,
    expert: competencyRecords.filter(r => r.level === "expert").length,
    trainer: competencyRecords.filter(r => r.level === "trainer").length
  };

  const levelData = [
    { name: "Trainee", value: competencyLevels.trainee },
    { name: "Competent", value: competencyLevels.competent },
    { name: "Proficient", value: competencyLevels.proficient },
    { name: "Expert", value: competencyLevels.expert },
    { name: "Trainer", value: competencyLevels.trainer }
  ];

  // Overdue and expiring
  const overdueRecords = trainingRecords.filter(r => 
    (r.status === "assigned" || r.status === "in_progress") && 
    r.due_date && new Date(r.due_date) < today
  );

  const expiringRecords = trainingRecords.filter(r => {
    if (r.status !== "completed" || !r.expiration_date) return false;
    const expDate = new Date(r.expiration_date);
    const daysUntil = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    return daysUntil > 0 && daysUntil <= 30;
  });

  // Training by document
  const docStats = trainingDocs.map(doc => {
    const records = trainingRecords.filter(r => r.training_document_id === doc.id);
    const completed = records.filter(r => r.status === "completed").length;
    return {
      name: doc.title?.substring(0, 20) + (doc.title?.length > 20 ? "..." : ""),
      total: records.length,
      completed,
      rate: records.length > 0 ? Math.round((completed / records.length) * 100) : 0
    };
  }).filter(d => d.total > 0).slice(0, 8);

  // Employee compliance
  const employeeCompliance = employees.map(emp => {
    const empRecords = trainingRecords.filter(r => r.employee_id === emp.id);
    const completed = empRecords.filter(r => r.status === "completed").length;
    const overdue = empRecords.filter(r => 
      (r.status === "assigned" || r.status === "in_progress") && 
      r.due_date && new Date(r.due_date) < today
    ).length;
    return {
      id: emp.id,
      name: emp.name,
      total: empRecords.length,
      completed,
      overdue,
      compliance: empRecords.length > 0 ? Math.round((completed / empRecords.length) * 100) : 100
    };
  }).sort((a, b) => a.compliance - b.compliance);

  const lowCompliance = employeeCompliance.filter(e => e.compliance < 80 && e.total > 0);

  // Calculate overall compliance rate
  const totalRequired = trainingRecords.length;
  const totalCompleted = statusCounts.completed;
  const overallCompliance = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Overall Compliance</p>
                <p className="text-3xl font-bold text-slate-800">{overallCompliance}%</p>
              </div>
              <div className={`p-3 rounded-xl ${overallCompliance >= 90 ? 'bg-emerald-100' : overallCompliance >= 70 ? 'bg-amber-100' : 'bg-rose-100'}`}>
                <TrendingUp className={`w-6 h-6 ${overallCompliance >= 90 ? 'text-emerald-600' : overallCompliance >= 70 ? 'text-amber-600' : 'text-rose-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Matrices</p>
                <p className="text-3xl font-bold text-slate-800">{matrices.filter(m => m.status === "active").length}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Overdue Training</p>
                <p className="text-3xl font-bold text-rose-600">{overdueRecords.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-rose-100">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Expiring (30 days)</p>
                <p className="text-3xl font-bold text-amber-600">{expiringRecords.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-100">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Training Status Distribution */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader>
            <CardTitle className="text-base">Training Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {statusData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-xs text-slate-600">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                No training data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Competency Levels */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader>
            <CardTitle className="text-base">Competency Level Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={levelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training by Document */}
      {docStats.length > 0 && (
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader>
            <CardTitle className="text-base">Training Completion by Document</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={docStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completed" name="Completed" fill="#10b981" />
                  <Bar dataKey="total" name="Total Assigned" fill="#e5e7eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Training */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600" />
              Overdue Training
            </CardTitle>
            <Badge variant="destructive">{overdueRecords.length}</Badge>
          </CardHeader>
          <CardContent>
            {overdueRecords.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {overdueRecords.slice(0, 10).map((record, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-rose-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{record.employee_name}</p>
                      <p className="text-xs text-slate-500">{record.document_title}</p>
                    </div>
                    <Badge variant="outline" className="text-rose-600 border-rose-300">
                      {Math.abs(Math.ceil((new Date(record.due_date) - today) / (1000 * 60 * 60 * 24)))} days overdue
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                <p className="text-sm">No overdue training</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Compliance Employees */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Low Compliance Employees
            </CardTitle>
            <Badge className="bg-amber-100 text-amber-700">{lowCompliance.length}</Badge>
          </CardHeader>
          <CardContent>
            {lowCompliance.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lowCompliance.slice(0, 10).map((emp, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                      <p className="text-xs text-slate-500">{emp.completed}/{emp.total} completed</p>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      {emp.compliance}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                <p className="text-sm">All employees above 80% compliance</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}