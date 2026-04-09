import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Download, TrendingUp, Users, Award } from "lucide-react";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function TrainingReports({ trainingRecords, competencyRecords, employees, matrices, trainingDocs }) {
  const [reportType, setReportType] = useState("compliance");
  const [dateRange, setDateRange] = useState("6months");

  const today = new Date();

  // Get date range
  const getDateRange = () => {
    const months = dateRange === "3months" ? 3 : dateRange === "6months" ? 6 : 12;
    return Array.from({ length: months }, (_, i) => {
      const date = subMonths(today, months - 1 - i);
      return {
        month: format(date, "MMM yyyy"),
        start: startOfMonth(date),
        end: endOfMonth(date)
      };
    });
  };

  const dateRanges = getDateRange();

  // Compliance trend over time
  const complianceTrend = dateRanges.map(({ month, start, end }) => {
    const periodRecords = trainingRecords.filter(r => {
      const created = new Date(r.created_date);
      return created >= start && created <= end;
    });
    const completed = periodRecords.filter(r => r.status === "completed").length;
    const total = periodRecords.length || 1;
    return {
      month,
      compliance: Math.round((completed / total) * 100),
      completed,
      total: periodRecords.length
    };
  });

  // Training completion by document
  const docCompletion = trainingDocs.slice(0, 10).map(doc => {
    const records = trainingRecords.filter(r => r.training_document_id === doc.id);
    const completed = records.filter(r => r.status === "completed").length;
    return {
      name: doc.title?.substring(0, 25) + (doc.title?.length > 25 ? "..." : ""),
      fullName: doc.title,
      completed,
      pending: records.filter(r => r.status === "assigned" || r.status === "in_progress").length,
      expired: records.filter(r => r.status === "expired").length,
      total: records.length
    };
  }).filter(d => d.total > 0);

  // Competency distribution
  const competencyDist = [
    { name: "Trainee", value: competencyRecords.filter(r => r.level === "trainee").length, color: "#94a3b8" },
    { name: "Competent", value: competencyRecords.filter(r => r.level === "competent").length, color: "#10b981" },
    { name: "Proficient", value: competencyRecords.filter(r => r.level === "proficient").length, color: "#3b82f6" },
    { name: "Expert", value: competencyRecords.filter(r => r.level === "expert").length, color: "#8b5cf6" },
    { name: "Trainer", value: competencyRecords.filter(r => r.level === "trainer").length, color: "#f59e0b" }
  ].filter(d => d.value > 0);

  // Training by trigger source
  const triggerSources = {
    initial: trainingRecords.filter(r => r.trigger_source === "initial").length,
    recertification: trainingRecords.filter(r => r.trigger_source === "recertification").length,
    document_revision: trainingRecords.filter(r => r.trigger_source === "document_revision").length,
    capa: trainingRecords.filter(r => r.trigger_source === "capa").length,
    audit_finding: trainingRecords.filter(r => r.trigger_source === "audit_finding").length,
    manual: trainingRecords.filter(r => r.trigger_source === "manual" || !r.trigger_source).length
  };

  const triggerData = Object.entries(triggerSources)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name: name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
      value
    }));

  // Quiz performance
  const quizRecords = trainingRecords.filter(r => r.quiz_required && r.quiz_score !== undefined);
  const avgQuizScore = quizRecords.length > 0 
    ? Math.round(quizRecords.reduce((sum, r) => sum + (r.quiz_score || 0), 0) / quizRecords.length)
    : 0;
  const quizPassRate = quizRecords.length > 0
    ? Math.round((quizRecords.filter(r => r.quiz_passed).length / quizRecords.length) * 100)
    : 0;

  // Employee stats
  const employeeStats = employees.map(emp => {
    const empRecords = trainingRecords.filter(r => r.employee_id === emp.id);
    const completed = empRecords.filter(r => r.status === "completed").length;
    const empCompetencies = competencyRecords.filter(r => r.employee_id === emp.id);
    
    return {
      name: emp.name,
      role: emp.role || "—",
      trainingsCompleted: completed,
      totalTrainings: empRecords.length,
      compliance: empRecords.length > 0 ? Math.round((completed / empRecords.length) * 100) : 100,
      competencies: empCompetencies.length,
      avgLevel: empCompetencies.length > 0 
        ? empCompetencies.reduce((sum, c) => {
            const levels = { trainee: 1, competent: 2, proficient: 3, expert: 4, trainer: 5 };
            return sum + (levels[c.level] || 0);
          }, 0) / empCompetencies.length
        : 0
    };
  }).sort((a, b) => b.compliance - a.compliance);

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-48 bg-white/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compliance">Compliance Report</SelectItem>
              <SelectItem value="competency">Competency Report</SelectItem>
              <SelectItem value="employee">Employee Report</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36 bg-white/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="12months">12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {reportType === "compliance" && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white/60 backdrop-blur-xl border-white/80">
              <CardContent className="pt-4">
                <p className="text-xs text-slate-500 mb-1">Total Training Records</p>
                <p className="text-2xl font-bold text-slate-800">{trainingRecords.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-white/60 backdrop-blur-xl border-white/80">
              <CardContent className="pt-4">
                <p className="text-xs text-slate-500 mb-1">Avg Quiz Score</p>
                <p className="text-2xl font-bold text-blue-600">{avgQuizScore}%</p>
              </CardContent>
            </Card>
            <Card className="bg-white/60 backdrop-blur-xl border-white/80">
              <CardContent className="pt-4">
                <p className="text-xs text-slate-500 mb-1">Quiz Pass Rate</p>
                <p className="text-2xl font-bold text-emerald-600">{quizPassRate}%</p>
              </CardContent>
            </Card>
            <Card className="bg-white/60 backdrop-blur-xl border-white/80">
              <CardContent className="pt-4">
                <p className="text-xs text-slate-500 mb-1">Active Matrices</p>
                <p className="text-2xl font-bold text-purple-600">{matrices.filter(m => m.status === "active").length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Compliance Trend */}
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                Compliance Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={complianceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="compliance" stroke="#14b8a6" strokeWidth={2} dot={{ fill: "#14b8a6" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Training by Document */}
            <Card className="bg-white/60 backdrop-blur-xl border-white/80">
              <CardHeader>
                <CardTitle className="text-base">Training by Document</CardTitle>
              </CardHeader>
              <CardContent>
                {docCompletion.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={docCompletion} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" />
                        <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" />
                        <Bar dataKey="expired" stackId="a" fill="#6b7280" name="Expired" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-72 flex items-center justify-center text-slate-400">
                    No training data
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Training by Trigger */}
            <Card className="bg-white/60 backdrop-blur-xl border-white/80">
              <CardHeader>
                <CardTitle className="text-base">Training by Source</CardTitle>
              </CardHeader>
              <CardContent>
                {triggerData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={triggerData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {triggerData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                      {triggerData.map((entry, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-xs text-slate-600">{entry.name}: {entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-72 flex items-center justify-center text-slate-400">
                    No data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {reportType === "competency" && (
        <>
          {/* Competency Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white/60 backdrop-blur-xl border-white/80">
              <CardContent className="pt-4">
                <p className="text-xs text-slate-500 mb-1">Total Competencies</p>
                <p className="text-2xl font-bold text-slate-800">{competencyRecords.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-white/60 backdrop-blur-xl border-white/80">
              <CardContent className="pt-4">
                <p className="text-xs text-slate-500 mb-1">Competent+</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {competencyRecords.filter(r => ["competent", "proficient", "expert", "trainer"].includes(r.level)).length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white/60 backdrop-blur-xl border-white/80">
              <CardContent className="pt-4">
                <p className="text-xs text-slate-500 mb-1">Expert/Trainer</p>
                <p className="text-2xl font-bold text-purple-600">
                  {competencyRecords.filter(r => ["expert", "trainer"].includes(r.level)).length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white/60 backdrop-blur-xl border-white/80">
              <CardContent className="pt-4">
                <p className="text-xs text-slate-500 mb-1">Pending Evals</p>
                <p className="text-2xl font-bold text-amber-600">
                  {competencyRecords.filter(r => r.status === "pending").length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Competency Distribution */}
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                Competency Level Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {competencyDist.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={competencyDist}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {competencyDist.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-72 flex items-center justify-center text-slate-400">
                  No competency data
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {reportType === "employee" && (
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Employee Training Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 font-medium text-slate-600">Employee</th>
                    <th className="text-left py-2 font-medium text-slate-600">Role</th>
                    <th className="text-center py-2 font-medium text-slate-600">Trainings</th>
                    <th className="text-center py-2 font-medium text-slate-600">Compliance</th>
                    <th className="text-center py-2 font-medium text-slate-600">Competencies</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeStats.slice(0, 20).map((emp, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-2 font-medium text-slate-800">{emp.name}</td>
                      <td className="py-2 text-slate-600">{emp.role}</td>
                      <td className="py-2 text-center text-slate-600">
                        {emp.trainingsCompleted}/{emp.totalTrainings}
                      </td>
                      <td className="py-2 text-center">
                        <Badge className={
                          emp.compliance >= 90 ? "bg-emerald-100 text-emerald-700" :
                          emp.compliance >= 70 ? "bg-amber-100 text-amber-700" :
                          "bg-rose-100 text-rose-700"
                        }>
                          {emp.compliance}%
                        </Badge>
                      </td>
                      <td className="py-2 text-center text-slate-600">{emp.competencies}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}