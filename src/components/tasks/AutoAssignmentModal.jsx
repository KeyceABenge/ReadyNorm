// @ts-nocheck
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, Users, TrendingUp, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AutoAssignmentModal({ open, onOpenChange, task, employees, allTasks, allSignOffs, onConfirm, isLoading }) {
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Calculate workload for each employee
  const getEmployeeWorkload = (employee) => {
    const activeTasks = allTasks.filter(t => 
      t.assigned_to === employee.email && 
      t.status !== "completed" && 
      t.status !== "verified"
    ).length;
    return activeTasks;
  };

  // Calculate performance score for each employee
  const getPerformanceScore = (employee) => {
    const employeeTasks = allTasks.filter(t => t.assigned_to === employee.email);
    const completedTasks = employeeTasks.filter(t => t.status === "completed" || t.status === "verified");
    
    if (completedTasks.length === 0) return 100; // New employees get benefit of the doubt
    
    const onTimeCompletions = completedTasks.filter(t => {
      if (!t.completed_at || !t.due_date) return false;
      return new Date(t.completed_at) <= new Date(t.due_date);
    });
    
    return Math.round((onTimeCompletions.length / completedTasks.length) * 100);
  };

  // Calculate ATP compliance
  const getATPCompliance = (employee) => {
    const employeeSignOffs = allSignOffs.filter(s => s.employee_email === employee.email);
    const atpTests = employeeSignOffs.filter(s => s.atp_test_result && s.atp_test_result !== "not_required");
    
    if (atpTests.length === 0) return 100;
    
    const passedTests = atpTests.filter(s => s.atp_test_result === "pass");
    return Math.round((passedTests.length / atpTests.length) * 100);
  };

  // Auto-assign logic
  const calculateBestMatch = () => {
    const activeEmployees = employees.filter(e => e.status === "active");
    
    if (activeEmployees.length === 0) return null;

    // Filter by role if task has specific role requirement
    let candidates = activeEmployees;
    if (task?.role_requirement) {
      candidates = candidates.filter(e => e.role === task.role_requirement);
    }

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    // Score each candidate
    const scoredCandidates = candidates.map(employee => {
      const workload = getEmployeeWorkload(employee);
      const performance = getPerformanceScore(employee);
      const atpCompliance = getATPCompliance(employee);
      
      // Scoring algorithm
      // Lower workload = better (max 10 tasks, inverse scoring)
      const workloadScore = Math.max(0, 100 - (workload * 10));
      
      // Performance weight
      const performanceWeight = task?.priority === "critical" || task?.priority === "high" ? 0.4 : 0.3;
      const workloadWeight = 0.5;
      const atpWeight = 0.2;
      
      const totalScore = 
        (workloadScore * workloadWeight) +
        (performance * performanceWeight) +
        (atpCompliance * atpWeight);
      
      return {
        employee,
        score: totalScore,
        workload,
        performance,
        atpCompliance
      };
    });

    // Sort by score (highest first)
    scoredCandidates.sort((a, b) => b.score - a.score);
    
    return scoredCandidates;
  };

  const recommendations = calculateBestMatch();
  const topMatch = Array.isArray(recommendations) ? recommendations[0] : recommendations;

  const handleConfirm = () => {
    if (selectedEmployee) {
      onConfirm(selectedEmployee);
    } else if (topMatch) {
      onConfirm(Array.isArray(topMatch) ? topMatch.employee : topMatch);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Auto-Assign Task</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {!recommendations || (Array.isArray(recommendations) && recommendations.length === 0) ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No eligible employees found</p>
            </div>
          ) : (
            <>
              {/* Task Info */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <h3 className="font-semibold text-slate-900 mb-2">Task: {task?.title}</h3>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  {task?.priority && (
                    <Badge className={
                      task.priority === "critical" ? "bg-rose-600" :
                      task.priority === "high" ? "bg-orange-500" :
                      task.priority === "medium" ? "bg-amber-500" :
                      "bg-slate-500"
                    }>
                      {task.priority}
                    </Badge>
                  )}
                  {task?.area && <span>Area: {task.area}</span>}
                  {task?.frequency && <span>• {task.frequency}</span>}
                </div>
              </Card>

              {/* Top Recommendation */}
              {Array.isArray(recommendations) ? (
                <>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Recommended Assignment
                    </h3>
                    <Card 
                      className={cn(
                        "p-4 cursor-pointer transition-all border-2",
                        selectedEmployee?.id === topMatch.employee.id 
                          ? "bg-emerald-50 border-emerald-500" 
                          : "hover:border-slate-300"
                      )}
                      onClick={() => setSelectedEmployee(topMatch.employee)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-900">{topMatch.employee.name}</h4>
                            <Badge className="bg-emerald-600">Best Match</Badge>
                          </div>
                          <p className="text-sm text-slate-600">{topMatch.employee.role}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-emerald-600">{Math.round(topMatch.score)}</div>
                          <div className="text-xs text-slate-500">Match Score</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Scale className="w-4 h-4 text-blue-600" />
                          <div>
                            <div className="text-xs text-slate-500">Workload</div>
                            <div className="font-semibold">{topMatch.workload} tasks</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                          <div>
                            <div className="text-xs text-slate-500">Performance</div>
                            <div className="font-semibold">{topMatch.performance}%</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-purple-600" />
                          <div>
                            <div className="text-xs text-slate-500">ATP Rate</div>
                            <div className="font-semibold">{topMatch.atpCompliance}%</div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Other Candidates */}
                  {recommendations.length > 1 && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-3">Other Candidates</h3>
                      <div className="space-y-2">
                        {recommendations.slice(1, 5).map((candidate) => (
                          <Card
                            key={candidate.employee.id}
                            className={cn(
                              "p-3 cursor-pointer transition-all border",
                              selectedEmployee?.id === candidate.employee.id 
                                ? "bg-blue-50 border-blue-500" 
                                : "hover:border-slate-300"
                            )}
                            onClick={() => setSelectedEmployee(candidate.employee)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-slate-900">{candidate.employee.name}</span>
                                  <span className="text-sm text-slate-500">• {candidate.employee.role}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-600">
                                  <span>{candidate.workload} tasks</span>
                                  <span>Performance: {candidate.performance}%</span>
                                  <span>ATP: {candidate.atpCompliance}%</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-slate-700">{Math.round(candidate.score)}</div>
                                <div className="text-xs text-slate-500">Score</div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900">{recommendations.name}</h4>
                      <p className="text-sm text-slate-600">{recommendations.role}</p>
                    </div>
                    <Badge className="bg-emerald-600">Only Match</Badge>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || (!selectedEmployee && !topMatch)}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Assign to {selectedEmployee?.name || (Array.isArray(topMatch) ? topMatch.employee.name : topMatch?.name)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}