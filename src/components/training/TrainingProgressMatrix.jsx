// @ts-nocheck
import { useState, useMemo } from "react";
import { EmployeeRepo, TrainingDocumentRepo, EmployeeTrainingRepo, TrainingRecordRepo } from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Search, CheckCircle2, Clock, AlertCircle, Minus, Users, BookOpen,
  ChevronDown, ChevronRight, Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

export default function TrainingProgressMatrix({ organizationId }) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("employees"); // "employees" or "documents"
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState({});

  const qc = { enabled: !!organizationId, staleTime: 60000 };

  const { data: employees = [] } = useQuery({
    queryKey: ["employees_training", organizationId],
    queryFn: () => EmployeeRepo.filter({ organization_id: organizationId }),
    ...qc
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["training_docs_progress", organizationId],
    queryFn: () => TrainingDocumentRepo.filter({ organization_id: organizationId, status: "active" }),
    ...qc
  });

  const { data: employeeTrainings = [] } = useQuery({
    queryKey: ["employee_trainings_progress", organizationId],
    queryFn: () => EmployeeTrainingRepo.filter({ organization_id: organizationId }),
    ...qc
  });

  const { data: trainingRecords = [] } = useQuery({
    queryKey: ["training_records_progress", organizationId],
    queryFn: () => TrainingRecordRepo.filter({ organization_id: organizationId }),
    ...qc
  });

  // Build a lookup: { `${employeeId}_${documentId}` => status info }
  const progressMap = useMemo(() => {
    const map = {};

    // TrainingRecords (more detailed) take priority
    trainingRecords.forEach(r => {
      const key = `${r.employee_id}_${r.training_document_id}`;
      map[key] = {
        status: r.status,
        completedAt: r.completed_at,
        dueDate: r.due_date,
        quizPassed: r.quiz_passed,
        quizScore: r.quiz_score,
        source: "record"
      };
    });

    // EmployeeTraining (simple completion) fills gaps
    employeeTrainings.forEach(t => {
      const key = `${t.employee_id}_${t.document_id}`;
      if (!map[key]) {
        map[key] = {
          status: "completed",
          completedAt: t.completed_at,
          source: "legacy"
        };
      }
    });

    return map;
  }, [trainingRecords, employeeTrainings]);

  const activeEmployees = employees.filter(e => e.status !== "inactive");
  const activeDocs = documents;

  // Employee-centric stats
  const employeeStats = useMemo(() => {
    return activeEmployees.map(emp => {
      let completed = 0, inProgress = 0, assigned = 0, overdue = 0, notStarted = 0;

      activeDocs.forEach(doc => {
        const key = `${emp.id}_${doc.id}`;
        const info = progressMap[key];
        if (!info) {
          notStarted++;
        } else if (info.status === "completed") {
          completed++;
        } else if (info.status === "in_progress") {
          inProgress++;
        } else if (info.status === "expired" || info.status === "failed") {
          overdue++;
        } else {
          assigned++;
        }
      });

      const total = activeDocs.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { employee: emp, completed, inProgress, assigned, overdue, notStarted, total, pct };
    });
  }, [activeEmployees, activeDocs, progressMap]);

  // Document-centric stats
  const documentStats = useMemo(() => {
    return activeDocs.map(doc => {
      let completed = 0, inProgress = 0, assigned = 0, overdue = 0, notStarted = 0;

      activeEmployees.forEach(emp => {
        const key = `${emp.id}_${doc.id}`;
        const info = progressMap[key];
        if (!info) {
          notStarted++;
        } else if (info.status === "completed") {
          completed++;
        } else if (info.status === "in_progress") {
          inProgress++;
        } else if (info.status === "expired" || info.status === "failed") {
          overdue++;
        } else {
          assigned++;
        }
      });

      const total = activeEmployees.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { document: doc, completed, inProgress, assigned, overdue, notStarted, total, pct };
    });
  }, [activeEmployees, activeDocs, progressMap]);

  // Summary
  const summary = useMemo(() => {
    const totalPairs = activeEmployees.length * activeDocs.length;
    let completed = 0, inProgress = 0, notStarted = 0;
    activeEmployees.forEach(emp => {
      activeDocs.forEach(doc => {
        const key = `${emp.id}_${doc.id}`;
        const info = progressMap[key];
        if (info?.status === "completed") completed++;
        else if (info?.status === "in_progress") inProgress++;
        else if (!info) notStarted++;
      });
    });
    return {
      totalPairs,
      completed,
      inProgress,
      notStarted,
      pct: totalPairs > 0 ? Math.round((completed / totalPairs) * 100) : 0
    };
  }, [activeEmployees, activeDocs, progressMap]);

  const q = search.toLowerCase();

  const filteredEmployeeStats = employeeStats.filter(s => {
    const matchSearch = s.employee.name?.toLowerCase().includes(q) ||
      s.employee.role?.toLowerCase().includes(q) ||
      s.employee.department?.toLowerCase().includes(q);
    if (statusFilter === "complete") return matchSearch && s.pct === 100;
    if (statusFilter === "incomplete") return matchSearch && s.pct < 100;
    if (statusFilter === "zero") return matchSearch && s.completed === 0;
    return matchSearch;
  }).sort((a, b) => a.pct - b.pct);

  const filteredDocumentStats = documentStats.filter(s => {
    const matchSearch = s.document.title?.toLowerCase().includes(q) ||
      s.document.category?.toLowerCase().includes(q);
    if (statusFilter === "complete") return matchSearch && s.pct === 100;
    if (statusFilter === "incomplete") return matchSearch && s.pct < 100;
    if (statusFilter === "zero") return matchSearch && s.completed === 0;
    return matchSearch;
  }).sort((a, b) => a.pct - b.pct);

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const StatusIcon = ({ status }) => {
    if (status === "completed") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === "in_progress") return <Clock className="w-4 h-4 text-blue-500" />;
    if (status === "expired" || status === "failed") return <AlertCircle className="w-4 h-4 text-rose-500" />;
    if (status === "assigned" || status === "waived") return <Clock className="w-4 h-4 text-amber-500" />;
    return <Minus className="w-3.5 h-3.5 text-slate-300" />;
  };

  const statusLabel = (status) => {
    if (!status) return "Not Started";
    const labels = {
      completed: "Completed", in_progress: "In Progress", assigned: "Assigned",
      expired: "Expired", failed: "Failed", waived: "Waived"
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-slate-900">{activeEmployees.length}</div>
          <div className="text-xs text-slate-500">Employees</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-slate-900">{activeDocs.length}</div>
          <div className="text-xs text-slate-500">Training Docs</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600">{summary.pct}%</div>
          <div className="text-xs text-slate-500">Overall Completion</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{summary.notStarted}</div>
          <div className="text-xs text-slate-500">Not Started</div>
        </Card>
      </div>

      {/* Overall progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>{summary.completed} of {summary.totalPairs} training completions</span>
          <span>{summary.pct}%</span>
        </div>
        <Progress value={summary.pct} className="h-2" />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === "employees" ? "default" : "outline"}
            onClick={() => { setViewMode("employees"); setExpandedRows({}); }}
            className={viewMode === "employees" ? "bg-slate-900" : ""}
          >
            <Users className="w-3.5 h-3.5 mr-1.5" /> By Employee
          </Button>
          <Button
            size="sm"
            variant={viewMode === "documents" ? "default" : "outline"}
            onClick={() => { setViewMode("documents"); setExpandedRows({}); }}
            className={viewMode === "documents" ? "bg-slate-900" : ""}
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5" /> By Document
          </Button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder={viewMode === "employees" ? "Search employees..." : "Search documents..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="complete">100% Complete</SelectItem>
            <SelectItem value="incomplete">Incomplete</SelectItem>
            <SelectItem value="zero">No Progress</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <Card className="overflow-hidden">
        {viewMode === "employees" ? (
          <div className="divide-y divide-slate-100">
            {filteredEmployeeStats.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-500">No employees match your filter</div>
            ) : filteredEmployeeStats.map(({ employee, completed, inProgress, overdue, notStarted, total, pct }) => {
              const isExpanded = expandedRows[employee.id];
              return (
                <div key={employee.id}>
                  <button
                    onClick={() => toggleRow(employee.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {employee.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-900 truncate">{employee.name}</span>
                        <Badge className="bg-slate-100 text-slate-600 text-[10px] capitalize">{employee.role}</Badge>
                      </div>
                      {employee.department && <span className="text-xs text-slate-400">{employee.department}</span>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="hidden sm:flex items-center gap-1.5 text-xs">
                        {completed > 0 && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{completed} done</Badge>}
                        {inProgress > 0 && <Badge className="bg-blue-100 text-blue-700 text-[10px]">{inProgress} in progress</Badge>}
                        {overdue > 0 && <Badge className="bg-rose-100 text-rose-700 text-[10px]">{overdue} overdue</Badge>}
                        {notStarted > 0 && <Badge variant="outline" className="text-[10px]">{notStarted} pending</Badge>}
                      </div>
                      <div className="w-20 text-right">
                        <span className={cn(
                          "text-sm font-semibold",
                          pct === 100 ? "text-emerald-600" : pct > 50 ? "text-blue-600" : pct > 0 ? "text-amber-600" : "text-slate-400"
                        )}>
                          {pct}%
                        </span>
                        <Progress value={pct} className="h-1.5 mt-1" />
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="bg-slate-50 px-4 pb-3 pt-1 ml-12 mr-4 mb-2 rounded-lg">
                      <div className="divide-y divide-slate-200">
                        {activeDocs.map(doc => {
                          const key = `${employee.id}_${doc.id}`;
                          const info = progressMap[key];
                          return (
                            <div key={doc.id} className="flex items-center gap-3 py-2 text-sm">
                              <StatusIcon status={info?.status} />
                              <span className="flex-1 truncate text-slate-700">{doc.title}</span>
                              <span className={cn("text-xs", info?.status === "completed" ? "text-emerald-600" : "text-slate-400")}>
                                {info?.completedAt ? format(parseISO(info.completedAt), "MMM d, yyyy") : statusLabel(info?.status)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDocumentStats.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-500">No documents match your filter</div>
            ) : filteredDocumentStats.map(({ document: doc, completed, inProgress, overdue, notStarted, total, pct }) => {
              const isExpanded = expandedRows[doc.id];
              return (
                <div key={doc.id}>
                  <button
                    onClick={() => toggleRow(doc.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                    <BookOpen className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm text-slate-900 truncate block">{doc.title}</span>
                      {doc.category && <span className="text-xs text-slate-400">{doc.category}</span>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="hidden sm:flex items-center gap-1.5 text-xs">
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{completed}/{total}</Badge>
                        {notStarted > 0 && <Badge variant="outline" className="text-[10px]">{notStarted} pending</Badge>}
                      </div>
                      <div className="w-20 text-right">
                        <span className={cn(
                          "text-sm font-semibold",
                          pct === 100 ? "text-emerald-600" : pct > 50 ? "text-blue-600" : pct > 0 ? "text-amber-600" : "text-slate-400"
                        )}>
                          {pct}%
                        </span>
                        <Progress value={pct} className="h-1.5 mt-1" />
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="bg-slate-50 px-4 pb-3 pt-1 ml-12 mr-4 mb-2 rounded-lg">
                      <div className="divide-y divide-slate-200">
                        {activeEmployees.map(emp => {
                          const key = `${emp.id}_${doc.id}`;
                          const info = progressMap[key];
                          return (
                            <div key={emp.id} className="flex items-center gap-3 py-2 text-sm">
                              <StatusIcon status={info?.status} />
                              <span className="flex-1 truncate text-slate-700">{emp.name}</span>
                              <span className={cn("text-xs", info?.status === "completed" ? "text-emerald-600" : "text-slate-400")}>
                                {info?.completedAt ? format(parseISO(info.completedAt), "MMM d, yyyy") : statusLabel(info?.status)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}