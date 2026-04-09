import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronRight, ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function QualificationsMatrix({ 
  tasks = [], 
  employees = [], 
  trainings = [],
  evaluations = [],
  areas = []
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [expandedTasks, setExpandedTasks] = useState({});

  // Get tasks that require competency
  const competencyTasks = tasks.filter(t => t.requires_competency && t.required_training_id);

  // Unique areas from tasks
  const taskAreas = [...new Set(competencyTasks.map(t => t.area).filter(Boolean))];

  // Filter tasks
  const filteredTasks = competencyTasks.filter(task => {
    const matchesSearch = !searchQuery || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArea = areaFilter === "all" || task.area === areaFilter;
    return matchesSearch && matchesArea;
  });

  // Get employee qualification status for a task
  const getEmployeeQualification = (employeeId, task) => {
    // Check if employee has completed training
    const hasTraining = trainings.some(t => 
      t.employee_id === employeeId && 
      t.document_id === task.required_training_id
    );
    
    if (!hasTraining) {
      return { status: "no_training", label: "Not Trained", color: "bg-slate-100 text-slate-600" };
    }
    
    // Check competency evaluation
    const evaluation = evaluations.find(e => 
      e.employee_id === employeeId && 
      e.training_id === task.required_training_id
    );
    
    if (!evaluation) {
      return { status: "evaluation_required", label: "Eval Required", color: "bg-amber-100 text-amber-700" };
    }
    
    if (evaluation.status === "competent") {
      // Check if expired
      if (evaluation.expires_at && new Date(evaluation.expires_at) < new Date()) {
        return { status: "expired", label: "Expired", color: "bg-rose-100 text-rose-700" };
      }
      return { status: "competent", label: "Qualified", color: "bg-emerald-100 text-emerald-700" };
    }
    
    if (evaluation.status === "needs_coaching") {
      return { status: "needs_coaching", label: "Coaching", color: "bg-amber-100 text-amber-700" };
    }
    
    if (evaluation.status === "not_competent") {
      return { status: "not_competent", label: "Not Competent", color: "bg-rose-100 text-rose-700" };
    }
    
    if (evaluation.status === "scheduled") {
      return { status: "scheduled", label: "Scheduled", color: "bg-blue-100 text-blue-700" };
    }
    
    return { status: "evaluation_required", label: "Eval Required", color: "bg-amber-100 text-amber-700" };
  };

  // Calculate qualification counts for a task
  const getTaskQualificationCounts = (task) => {
    let qualified = 0;
    let pending = 0;
    let notQualified = 0;
    
    employees.forEach(emp => {
      const qual = getEmployeeQualification(emp.id, task);
      if (qual.status === "competent") qualified++;
      else if (qual.status === "evaluation_required" || qual.status === "scheduled") pending++;
      else notQualified++;
    });
    
    return { qualified, pending, notQualified };
  };

  const toggleTask = (taskId) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            {taskAreas.map(area => (
              <SelectItem key={area} value={area}>{area}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Matrix */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No tasks require competency evaluation</p>
            <p className="text-sm text-slate-400 mt-1">
              Enable "Requires Competency Evaluation" on tasks that need hands-on verification
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => {
            const counts = getTaskQualificationCounts(task);
            const isExpanded = expandedTasks[task.id];
            
            return (
              <Card key={task.id}>
                <div 
                  className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleTask(task.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900">{task.title}</p>
                        <p className="text-sm text-slate-500">{task.area}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium text-emerald-700">{counts.qualified}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span className="font-medium text-amber-700">{counts.pending}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <XCircle className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-600">{counts.notQualified}</span>
                        </div>
                      </div>
                      
                      <Badge className={cn(
                        counts.qualified === 0 ? "bg-rose-100 text-rose-700" :
                        counts.qualified < 3 ? "bg-amber-100 text-amber-700" :
                        "bg-emerald-100 text-emerald-700"
                      )}>
                        {counts.qualified} qualified
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="border-t px-4 py-3 bg-slate-50">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {employees.map(emp => {
                        const qual = getEmployeeQualification(emp.id, task);
                        return (
                          <div 
                            key={emp.id}
                            className="flex items-center gap-2 p-2 bg-white rounded border"
                          >
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-700">
                              {emp.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{emp.name}</p>
                            </div>
                            <Badge className={cn("text-xs py-0", qual.color)}>
                              {qual.status === "competent" ? <CheckCircle2 className="w-3 h-3" /> : null}
                              {qual.status === "not_competent" ? <XCircle className="w-3 h-3" /> : null}
                              {qual.status === "evaluation_required" || qual.status === "needs_coaching" || qual.status === "scheduled" ? <Clock className="w-3 h-3" /> : null}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}