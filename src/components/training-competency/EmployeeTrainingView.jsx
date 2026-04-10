import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { Search, User, Plus, Clock, CheckCircle2, AlertTriangle, XCircle, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { TrainingRecordRepo } from "@/lib/adapters/database";

export default function EmployeeTrainingView({ employees, trainingRecords, competencyRecords, matrices, trainingDocs, organizationId, settings, user, onRefresh }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [assignForm, setAssignForm] = useState({
    training_document_id: "",
    due_date: "",
    quiz_required: true,
    practical_required: false
  });

  const today = new Date();

  const getEmployeeStats = (empId) => {
    const empRecords = trainingRecords.filter(r => r.employee_id === empId);
    const completed = empRecords.filter(r => r.status === "completed").length;
    const overdue = empRecords.filter(r => 
      (r.status === "assigned" || r.status === "in_progress") && 
      r.due_date && new Date(r.due_date) < today
    ).length;
    const expiring = empRecords.filter(r => {
      if (r.status !== "completed" || !r.expiration_date) return false;
      const expDate = new Date(r.expiration_date);
      const daysUntil = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 30;
    }).length;
    const expired = empRecords.filter(r => r.status === "expired").length;
    const pending = empRecords.filter(r => r.status === "assigned" || r.status === "in_progress").length;
    
    return {
      total: empRecords.length,
      completed,
      overdue,
      expiring,
      expired,
      pending,
      compliance: empRecords.length > 0 ? Math.round((completed / empRecords.length) * 100) : 100,
      records: empRecords
    };
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    
    if (statusFilter === "all") return true;
    
    const stats = getEmployeeStats(emp.id);
    if (statusFilter === "overdue") return stats.overdue > 0;
    if (statusFilter === "expiring") return stats.expiring > 0;
    if (statusFilter === "low_compliance") return stats.compliance < 80 && stats.total > 0;
    
    return true;
  });

  const openAssignModal = (emp) => {
    setSelectedEmployee(emp);
    setAssignForm({
      training_document_id: "",
      due_date: format(addDays(today, 30), "yyyy-MM-dd"),
      quiz_required: true,
      practical_required: false
    });
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    if (!assignForm.training_document_id) {
      toast.error("Select a training document");
      return;
    }

    const doc = trainingDocs.find(d => d.id === assignForm.training_document_id);
    
    try {
      await TrainingRecordRepo.create({
        organization_id: organizationId,
        employee_id: selectedEmployee.id,
        employee_name: selectedEmployee.name,
        employee_email: selectedEmployee.email,
        training_document_id: assignForm.training_document_id,
        document_title: doc?.title,
        status: "assigned",
        assigned_date: format(today, "yyyy-MM-dd"),
        due_date: assignForm.due_date,
        quiz_required: assignForm.quiz_required,
        practical_required: assignForm.practical_required,
        trigger_source: "manual"
      });
      toast.success("Training assigned");
      setShowAssignModal(false);
      onRefresh();
    } catch (e) {
      toast.error("Failed to assign training");
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      completed: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
      in_progress: { color: "bg-blue-100 text-blue-700", icon: Clock },
      assigned: { color: "bg-amber-100 text-amber-700", icon: Clock },
      expired: { color: "bg-slate-100 text-slate-700", icon: XCircle },
      failed: { color: "bg-rose-100 text-rose-700", icon: XCircle }
    };
    const config = configs[status] || configs.assigned;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/60"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-white/60">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            <SelectItem value="overdue">With Overdue</SelectItem>
            <SelectItem value="expiring">With Expiring</SelectItem>
            <SelectItem value="low_compliance">Low Compliance (&lt;80%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Employee List */}
      <div className="space-y-3">
        {filteredEmployees.map(emp => {
          const stats = getEmployeeStats(emp.id);
          const isExpanded = expandedEmployee === emp.id;

          return (
            <Card key={emp.id} className="bg-white/60 backdrop-blur-xl border-white/80">
              <CardContent className="pt-4">
                {/* Employee Header */}
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedEmployee(isExpanded ? null : emp.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">{emp.name}</h3>
                      <p className="text-xs text-slate-500">{emp.role || emp.department || "Employee"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Stats badges */}
                    <div className="hidden sm:flex items-center gap-2">
                      {stats.overdue > 0 && (
                        <Badge className="bg-rose-100 text-rose-700">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {stats.overdue} overdue
                        </Badge>
                      )}
                      {stats.expiring > 0 && (
                        <Badge className="bg-amber-100 text-amber-700">
                          <Clock className="w-3 h-3 mr-1" />
                          {stats.expiring} expiring
                        </Badge>
                      )}
                    </div>

                    {/* Compliance */}
                    <div className="text-right min-w-[80px]">
                      <div className="text-lg font-bold" style={{ 
                        color: stats.compliance >= 90 ? '#10b981' : stats.compliance >= 70 ? '#f59e0b' : '#ef4444' 
                      }}>
                        {stats.compliance}%
                      </div>
                      <Progress 
                        value={stats.compliance} 
                        className="h-1.5 w-16"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAssignModal(emp);
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Assign
                      </Button>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Training Records (Expanded) */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    {stats.records.length > 0 ? (
                      <div className="space-y-2">
                        {stats.records.map((record, idx) => {
                          const isOverdue = (record.status === "assigned" || record.status === "in_progress") && 
                            record.due_date && new Date(record.due_date) < today;
                          
                          return (
                            <div 
                              key={idx} 
                              className={`flex items-center justify-between p-3 rounded-lg ${
                                isOverdue ? 'bg-rose-50' : 'bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-slate-400" />
                                <div>
                                  <p className="text-sm font-medium text-slate-700">{record.document_title}</p>
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    {record.due_date && (
                                      <span className={isOverdue ? 'text-rose-600' : ''}>
                                        Due: {format(new Date(record.due_date), "MMM d, yyyy")}
                                      </span>
                                    )}
                                    {record.expiration_date && record.status === "completed" && (
                                      <span>
                                        Expires: {format(new Date(record.expiration_date), "MMM d, yyyy")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {record.quiz_required && (
                                  <Badge variant="outline" className="text-[10px]">
                                    Quiz {record.quiz_passed ? '✓' : 'Required'}
                                  </Badge>
                                )}
                                {record.practical_required && (
                                  <Badge variant="outline" className="text-[10px]">
                                    Practical {record.practical_status === 'passed' ? '✓' : 'Required'}
                                  </Badge>
                                )}
                                {getStatusBadge(record.status)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No training records yet</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No employees found</p>
          </div>
        )}
      </div>

      {/* Assign Training Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Training to {selectedEmployee?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Training Document *</Label>
              <Select 
                value={assignForm.training_document_id} 
                onValueChange={(v) => setAssignForm(prev => ({ ...prev, training_document_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document" />
                </SelectTrigger>
                <SelectContent>
                  {trainingDocs.map(doc => (
                    <SelectItem key={doc.id} value={doc.id}>{doc.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={assignForm.due_date}
                onChange={(e) => setAssignForm(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={assignForm.quiz_required}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, quiz_required: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Quiz Required</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={assignForm.practical_required}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, practical_required: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Practical Required</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button onClick={handleAssign} className="bg-teal-600 hover:bg-teal-700">
              Assign Training
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}