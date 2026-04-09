import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap, Download, User,
  Award, FileText, Clock
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function AuditTrainingSection({ 
  employees, 
  employeeTrainings, 
  trainingDocuments, 
  competencyEvaluations,
  dateRange 
}) {
  const activeEmployees = employees.filter(e => e.status === "active");

  // Calculate training coverage per employee
  const employeeCoverage = useMemo(() => {
    return activeEmployees.map(emp => {
      const empTrainings = employeeTrainings.filter(t => t.employee_id === emp.id);
      const completedDocs = new Set(empTrainings.map(t => t.document_id));
      const coverage = trainingDocuments.length > 0 
        ? Math.round((completedDocs.size / trainingDocuments.length) * 100)
        : 100;

      const empEvaluations = competencyEvaluations.filter(e => e.employee_id === emp.id);
      const competent = empEvaluations.filter(e => e.status === "competent" || e.result === "pass").length;

      return {
        ...emp,
        trainingsCompleted: completedDocs.size,
        totalTrainings: trainingDocuments.length,
        coverage,
        competencyCount: competent,
        evaluationCount: empEvaluations.length,
        lastTraining: empTrainings.sort((a, b) => 
          new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
        )[0]
      };
    }).sort((a, b) => b.coverage - a.coverage);
  }, [activeEmployees, employeeTrainings, trainingDocuments, competencyEvaluations]);

  // Training document coverage
  const documentCoverage = useMemo(() => {
    return trainingDocuments.map(doc => {
      const completions = employeeTrainings.filter(t => t.document_id === doc.id);
      const coverage = activeEmployees.length > 0 
        ? Math.round((completions.length / activeEmployees.length) * 100)
        : 0;
      return {
        ...doc,
        completions: completions.length,
        coverage
      };
    }).sort((a, b) => b.coverage - a.coverage);
  }, [trainingDocuments, employeeTrainings, activeEmployees]);

  // Overall stats
  const overallCoverage = useMemo(() => {
    const required = activeEmployees.length * trainingDocuments.length;
    const completed = employeeTrainings.length;
    return required > 0 ? Math.round((completed / required) * 100) : 100;
  }, [activeEmployees, trainingDocuments, employeeTrainings]);

  const exportTrainingReport = () => {
    const csvContent = `Training & Competency Report\nGenerated: ${format(new Date(), "yyyy-MM-dd HH:mm")}\n\nOVERALL COVERAGE: ${overallCoverage}%\n\nEMPLOYEE TRAINING STATUS\nEmployee,Training Coverage,Trainings Completed,Competency Evaluations,Competent\n${employeeCoverage.map(e => `"${e.name}",${e.coverage}%,${e.trainingsCompleted}/${e.totalTrainings},${e.evaluationCount},${e.competencyCount}`).join('\n')}\n\nTRAINING DOCUMENT COVERAGE\nDocument,Employee Coverage,Completions\n${documentCoverage.map(d => `"${d.title}",${d.coverage}%,${d.completions}/${activeEmployees.length}`).join('\n')}`;
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `training_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-purple-600" />
            Training & Competency Records
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {activeEmployees.length} active employees • {trainingDocuments.length} training materials
          </p>
        </div>
        <Button variant="outline" onClick={exportTrainingReport}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Overall Coverage */}
      <Card className={cn(
        "border-2",
        overallCoverage >= 90 ? "border-emerald-300 bg-emerald-50" :
        overallCoverage >= 70 ? "border-amber-300 bg-amber-50" :
        "border-rose-300 bg-rose-50"
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Overall Training Coverage</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className={cn(
                  "text-4xl font-bold",
                  overallCoverage >= 90 ? "text-emerald-600" :
                  overallCoverage >= 70 ? "text-amber-600" : "text-rose-600"
                )}>
                  {overallCoverage}%
                </span>
              </div>
              {/* @ts-ignore */}
              <Progress value={overallCoverage} className="h-3 mt-3 w-64" />
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">
                {employeeTrainings.length} / {activeEmployees.length * trainingDocuments.length}
              </p>
              <p className="text-xs text-slate-500">training completions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{activeEmployees.length}</p>
                <p className="text-xs text-slate-500">Active Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{trainingDocuments.length}</p>
                <p className="text-xs text-slate-500">Training Materials</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Award className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {competencyEvaluations.filter(e => e.status === "competent" || e.result === "pass").length}
                </p>
                <p className="text-xs text-slate-500">Competent Certifications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {employeeCoverage.filter(e => e.coverage === 100).length}
                </p>
                <p className="text-xs text-slate-500">Fully Trained</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Training Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Employee Training Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {employeeCoverage.map(emp => (
              <div key={emp.id} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-medium text-slate-700">
                      {emp.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'E'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{emp.name}</p>
                      <p className="text-xs text-slate-500">{emp.role || "Employee"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {emp.competencyCount > 0 && (
                      <Badge variant="default" className="bg-emerald-100 text-emerald-700">
                        <Award className="w-3 h-3 mr-1" />
                        {emp.competencyCount} Competencies
                      </Badge>
                    )}
                    <div className="text-right">
                      <p className={cn(
                        "text-lg font-bold",
                        emp.coverage === 100 ? "text-emerald-600" :
                        emp.coverage >= 75 ? "text-amber-600" : "text-rose-600"
                      )}>
                        {emp.coverage}%
                      </p>
                      <p className="text-xs text-slate-500">
                        {emp.trainingsCompleted}/{emp.totalTrainings}
                      </p>
                    </div>
                  </div>
                </div>
                {/* @ts-ignore */}
                <Progress value={emp.coverage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Training Document Coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Training Material Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {documentCoverage.map(doc => (
              <div key={doc.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{doc.title}</p>
                  <p className="text-xs text-slate-500">{doc.completions} / {activeEmployees.length} employees</p>
                </div>
                <div className="w-32">
                  {/* @ts-ignore */}
                  <Progress value={doc.coverage} className="h-2" />
                </div>
                <Badge variant="default" className={cn(
                  "w-16 justify-center",
                  doc.coverage === 100 ? "bg-emerald-100 text-emerald-700" :
                  doc.coverage >= 75 ? "bg-amber-100 text-amber-700" :
                  "bg-rose-100 text-rose-700"
                )}>
                  {doc.coverage}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}