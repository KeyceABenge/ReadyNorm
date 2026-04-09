// @ts-nocheck
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Users, Search, UserPlus, UserMinus, ChevronDown, ChevronRight, Loader2,
  EyeOff, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ScheduleEmployeeManager({
  open,
  onOpenChange,
  employees,
  crews,
  organizationId,
  hiddenCrews = new Set(),
  hiddenEmployees = new Set(),
  hideUnassigned = false,
  onToggleHideCrew,
  onToggleHideEmployee,
  onToggleHideUnassigned,
  onShowAll,
}) {
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [expandedCrews, setExpandedCrews] = useState({});
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const queryClient = useQueryClient();

  // Unique departments and roles
  const departments = useMemo(() => {
    const depts = new Set(employees.filter(e => e.department).map(e => e.department));
    return [...depts].sort();
  }, [employees]);

  const roles = useMemo(() => {
    const rs = new Set(employees.filter(e => e.role).map(e => e.role));
    return [...rs].sort();
  }, [employees]);

  // Build crew membership map: email -> crew
  const emailToCrewMap = useMemo(() => {
    const map = {};
    crews.filter(c => c.status === "active").forEach(crew => {
      (crew.members || []).forEach(email => {
        map[email] = crew;
      });
    });
    return map;
  }, [crews]);

  // Active employees filtered
  const activeEmployees = useMemo(() => {
    return employees
      .filter(e => e.status === "active")
      .filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()))
      .filter(e => filterDept === "all" || e.department === filterDept)
      .filter(e => filterRole === "all" || e.role === filterRole)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, search, filterDept, filterRole]);

  // Separate assigned and unassigned
  const assignedEmployees = activeEmployees.filter(e => emailToCrewMap[e.email]);
  const unassignedEmployees = activeEmployees.filter(e => !emailToCrewMap[e.email]);

  // Group assigned by crew
  const crewGrouped = useMemo(() => {
    const groups = {};
    assignedEmployees.forEach(emp => {
      const crew = emailToCrewMap[emp.email];
      if (!crew) return;
      if (!groups[crew.id]) {
        groups[crew.id] = { crew, members: [] };
      }
      groups[crew.id].members.push(emp);
    });
    return Object.values(groups);
  }, [assignedEmployees, emailToCrewMap]);

  const toggleCrewExpanded = (crewId) => {
    setExpandedCrews(prev => ({ ...prev, [crewId]: !prev[crewId] }));
  };

  // Mutation to add employee to crew
  const addToCrewMutation = useMutation({
    mutationFn: async ({ crewId, employeeEmail }) => {
      const crew = crews.find(c => c.id === crewId);
      if (!crew) throw new Error("Crew not found");
      const updatedMembers = [...new Set([...(crew.members || []), employeeEmail])];
      await CrewRepo.update(crewId, { members: updatedMembers });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crews"] });
      setAssignModalOpen(false);
      setSelectedEmployee(null);
      toast.success("Employee added to crew");
    },
  });

  // Mutation to remove employee from crew
  const removeFromCrewMutation = useMutation({
    mutationFn: async ({ crewId, employeeEmail }) => {
      const crew = crews.find(c => c.id === crewId);
      if (!crew) throw new Error("Crew not found");
      const updatedMembers = (crew.members || []).filter(e => e !== employeeEmail);
      await CrewRepo.update(crewId, { members: updatedMembers });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crews"] });
      toast.success("Employee removed from crew");
    },
  });

  const handleAssignToCrew = (crewId) => {
    if (!selectedEmployee) return;
    // If already in another crew, remove first
    const currentCrew = emailToCrewMap[selectedEmployee.email];
    if (currentCrew) {
      removeFromCrewMutation.mutate(
        { crewId: currentCrew.id, employeeEmail: selectedEmployee.email },
        {
          onSuccess: () => {
            addToCrewMutation.mutate({ crewId, employeeEmail: selectedEmployee.email });
          },
        }
      );
    } else {
      addToCrewMutation.mutate({ crewId, employeeEmail: selectedEmployee.email });
    }
  };

  const handleRemoveFromCrew = (emp) => {
    const crew = emailToCrewMap[emp.email];
    if (!crew) return;
    removeFromCrewMutation.mutate({ crewId: crew.id, employeeEmail: emp.email });
  };

  const activeCrews = crews.filter(c => c.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5 text-slate-600" />
            Manage Schedule Roster
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Search & Filters */}
          <div className="px-4 py-3 space-y-2 border-b bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Crew Sections */}
          <div className="px-4 py-3 space-y-2">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Assigned to Crews ({assignedEmployees.length})
            </h4>

            {crewGrouped.map(({ crew, members }) => {
              const isExpanded = expandedCrews[crew.id] !== false; // default expanded
              const isCrewHidden = hiddenCrews.has(crew.id);
              return (
                <div key={crew.id} className={cn("border rounded-lg overflow-hidden", isCrewHidden && "opacity-50")}>
                  <div className="flex items-center bg-slate-50 hover:bg-slate-100 transition-colors">
                    <button
                      onClick={() => toggleCrewExpanded(crew.id)}
                      className="flex-1 flex items-center gap-2 px-3 py-2"
                      style={{ minHeight: "auto" }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: crew.color || "#64748b" }}
                      />
                      <span className="text-sm font-medium text-slate-800">{crew.name}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] h-5">
                        {members.length}
                      </Badge>
                    </button>
                    {onToggleHideCrew && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleHideCrew(crew.id); }}
                        className={cn(
                          "p-1.5 mr-2 rounded hover:bg-slate-200 transition-colors flex-shrink-0",
                          isCrewHidden ? "text-amber-500" : "text-slate-400 hover:text-red-500"
                        )}
                        style={{ minHeight: "auto", minWidth: "auto" }}
                        title={isCrewHidden ? "Show crew on schedule" : "Hide crew from schedule"}
                      >
                        {isCrewHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="divide-y">
                      {members.map(emp => {
                        const isEmpHidden = hiddenEmployees.has(emp.id);
                        return (
                          <div
                            key={emp.id}
                            className={cn("flex items-center justify-between px-3 py-1.5 pl-9 hover:bg-slate-50 group", isEmpHidden && "opacity-50")}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm text-slate-700 truncate">{emp.name}</span>
                              {emp.role && (
                                <span className="text-[10px] text-slate-400 flex-shrink-0">{emp.role}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {onToggleHideEmployee && (
                                <button
                                  onClick={() => onToggleHideEmployee(emp.id)}
                                  className={cn(
                                    "p-1 rounded transition-colors",
                                    isEmpHidden ? "text-amber-500 hover:bg-amber-50" : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                                  )}
                                  style={{ minHeight: "auto", minWidth: "auto" }}
                                  title={isEmpHidden ? "Show on schedule" : "Hide from schedule"}
                                >
                                  {isEmpHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedEmployee(emp);
                                  setAssignModalOpen(true);
                                }}
                                className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                                style={{ minHeight: "auto", minWidth: "auto" }}
                                title="Move to different crew"
                              >
                                <Users className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveFromCrew(emp)}
                                className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600"
                                style={{ minHeight: "auto", minWidth: "auto" }}
                                title="Remove from crew"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {crewGrouped.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">
                No employees match the current filters
              </p>
            )}
          </div>

          {/* Unassigned Section */}
          <div className={cn("px-4 py-3 space-y-2 border-t", hideUnassigned && "opacity-50")}>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Unassigned ({unassignedEmployees.length})
              </h4>
              {onToggleHideUnassigned && (
                <button
                  onClick={onToggleHideUnassigned}
                  className={cn(
                    "p-1 rounded transition-colors",
                    hideUnassigned ? "text-amber-500 hover:bg-amber-50" : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                  )}
                  style={{ minHeight: "auto", minWidth: "auto" }}
                  title={hideUnassigned ? "Show unassigned on schedule" : "Hide unassigned from schedule"}
                >
                  {hideUnassigned ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              )}
            </div>
            {unassignedEmployees.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-3">
                {search || filterDept !== "all" || filterRole !== "all"
                  ? "No unassigned employees match filters"
                  : "All employees are assigned to crews"}
              </p>
            ) : (
              <div className="space-y-1">
                {unassignedEmployees.map(emp => {
                  const isEmpHidden = hiddenEmployees.has(emp.id);
                  return (
                    <div
                      key={emp.id}
                      className={cn("flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-slate-50 group", isEmpHidden && "opacity-50")}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-slate-700 truncate">{emp.name}</span>
                        {emp.department && (
                          <span className="text-[10px] text-slate-400 flex-shrink-0">{emp.department}</span>
                        )}
                        {emp.role && (
                          <span className="text-[10px] text-slate-400 flex-shrink-0">• {emp.role}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {onToggleHideEmployee && (
                          <button
                            onClick={() => onToggleHideEmployee(emp.id)}
                            className={cn(
                              "p-1 rounded transition-colors",
                              isEmpHidden ? "text-amber-500 hover:bg-amber-50" : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                            )}
                            style={{ minHeight: "auto", minWidth: "auto" }}
                            title={isEmpHidden ? "Show on schedule" : "Hide from schedule"}
                          >
                            {isEmpHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          style={{ minHeight: "auto" }}
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setAssignModalOpen(true);
                          }}
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                          Assign
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Show All button */}
          {(hiddenCrews.size > 0 || hiddenEmployees.size > 0 || hideUnassigned) && onShowAll && (
            <div className="px-4 py-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onShowAll}
              >
                <Eye className="w-4 h-4 mr-1" />
                Show All Hidden ({hiddenCrews.size + hiddenEmployees.size + (hideUnassigned ? 1 : 0)})
              </Button>
            </div>
          )}
        </div>

        {/* Assign to Crew Modal */}
        <AssignCrewModal
          open={assignModalOpen}
          onOpenChange={setAssignModalOpen}
          employee={selectedEmployee}
          crews={activeCrews}
          currentCrew={selectedEmployee ? emailToCrewMap[selectedEmployee.email] : null}
          isLoading={addToCrewMutation.isPending || removeFromCrewMutation.isPending}
          onAssign={handleAssignToCrew}
        />
      </DialogContent>
    </Dialog>
  );
}

function AssignCrewModal({ open, onOpenChange, employee, crews, currentCrew, isLoading, onAssign }) {
  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Assign {employee.name} to Crew
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {crews.map(crew => {
            const isCurrent = currentCrew?.id === crew.id;
            return (
              <button
                key={crew.id}
                disabled={isCurrent || isLoading}
                onClick={() => onAssign(crew.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors",
                  isCurrent
                    ? "border-blue-200 bg-blue-50 cursor-not-allowed"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: crew.color || "#64748b" }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-800">{crew.name}</span>
                  <span className="text-xs text-slate-400 ml-2">
                    {(crew.members || []).length} members
                  </span>
                </div>
                {isCurrent && (
                  <Badge variant="secondary" className="text-[10px]">Current</Badge>
                )}
                {isLoading && !isCurrent && (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                )}
              </button>
            );
          })}
          {crews.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">
              No active crews. Create one from the Schedule page.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}