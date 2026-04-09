// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Shield, CheckCircle2, Search, User, Calendar, ChevronRight, AlertTriangle, Users
} from "lucide-react";
import { format, parseISO, differenceInHours } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PendingVerificationList({ 
  tasks, 
  onVerifyTask,
  onBulkVerifyShift,
  areas = [],
  shifts = []
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterArea, setFilterArea] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [viewMode, setViewMode] = useState("grouped"); // "grouped" or "list"

  // Filter for completed but not verified tasks
  const pendingVerification = tasks.filter(t => 
    t.status === "completed" && !t.verified_by
  );

  // Apply filters
  const filteredTasks = pendingVerification.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.assigned_to_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArea = filterArea === "all" || task.area === filterArea;
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    return matchesSearch && matchesArea && matchesPriority;
  });

  // Sort by completion time (oldest first - needs verification soonest)
  const sortedTasks = [...filteredTasks].sort((a, b) => 
    new Date(a.completed_at) - new Date(b.completed_at)
  );

  // Get unique areas from tasks
  const uniqueAreas = [...new Set(tasks.map(t => t.area).filter(Boolean))];

  // Group tasks by shift
  const groupedByShift = useMemo(() => {
    const groups = {};
    
    sortedTasks.forEach(task => {
      if (!task.completed_at) return;
      
      const completedDate = parseISO(task.completed_at);
      const completedHour = completedDate.getHours();
      const dateKey = format(completedDate, "yyyy-MM-dd");
      
      // Determine shift based on completion time
      let shiftName = "Day Shift";
      let shiftId = "day";
      
      if (shifts.length > 0) {
        // Use configured shifts
        for (const shift of shifts) {
          const [startH] = (shift.start_time || "05:00").split(":").map(Number);
          const [endH] = (shift.end_time || "17:00").split(":").map(Number);
          
          if (startH < endH) {
            // Normal shift (e.g., 5AM - 5PM)
            if (completedHour >= startH && completedHour < endH) {
              shiftName = shift.name;
              shiftId = shift.id;
              break;
            }
          } else {
            // Overnight shift (e.g., 5PM - 5AM)
            if (completedHour >= startH || completedHour < endH) {
              shiftName = shift.name;
              shiftId = shift.id;
              break;
            }
          }
        }
      } else {
        // Default shift detection
        if (completedHour >= 17 || completedHour < 5) {
          shiftName = "Night Shift";
          shiftId = "night";
        }
      }
      
      const groupKey = `${dateKey}-${shiftId}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          date: completedDate,
          dateLabel: format(completedDate, "EEEE, MMM d"),
          shiftName,
          shiftId,
          tasks: []
        };
      }
      
      groups[groupKey].tasks.push(task);
    });
    
    // Sort groups by date (most recent first)
    return Object.values(groups).sort((a, b) => b.date - a.date);
  }, [sortedTasks, shifts]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Pending Verification
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              {pendingVerification.length} tasks awaiting manager verification
            </p>
          </div>
          {pendingVerification.length > 0 && (
            <Badge className="bg-amber-100 text-amber-700 text-sm px-3 py-1">
              {pendingVerification.length} Pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search tasks or employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Areas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Areas</SelectItem>
              {uniqueAreas.map(area => (
                <SelectItem key={area} value={area}>{area}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grouped">By Shift</SelectItem>
              <SelectItem value="list">All Tasks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task List */}
        {sortedTasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
            <p className="text-slate-500">
              {pendingVerification.length === 0 
                ? "All tasks have been verified!" 
                : "No tasks match your filters"}
            </p>
          </div>
        ) : viewMode === "grouped" ? (
          /* Grouped by Shift View */
          <div className="space-y-4">
            {groupedByShift.map(group => {
              const tasksWithSignature = group.tasks.filter(t => t.signature_data).length;
              
              return (
                <div key={group.key} className="border rounded-lg overflow-hidden">
                  {/* Shift Header */}
                  <div className="bg-slate-100 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{group.shiftName}</h4>
                        <p className="text-sm text-slate-500">{group.dateLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-700">{group.tasks.length} tasks</p>
                        <p className="text-xs text-slate-500">
                          {tasksWithSignature} with signature
                        </p>
                      </div>
                      <Button 
                        onClick={() => onBulkVerifyShift(group)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Verify Shift
                      </Button>
                    </div>
                  </div>
                  
                  {/* Task Preview List */}
                  <div className="divide-y divide-slate-100">
                    {group.tasks.slice(0, 3).map(task => (
                      <div 
                        key={task.id}
                        onClick={() => onVerifyTask(task)}
                        className="p-3 flex items-center gap-3 hover:bg-slate-50 cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700 truncate">
                              {task.title}
                            </span>
                            {!task.signature_data && (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {task.assigned_to_name} • {task.area}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                    {group.tasks.length > 3 && (
                      <div className="p-2 text-center text-xs text-slate-500 bg-slate-50">
                        +{group.tasks.length - 3} more tasks
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Individual Task List View */
          <div className="space-y-2">
            {sortedTasks.map(task => {
              const hoursSinceCompletion = task.completed_at 
                ? differenceInHours(new Date(), parseISO(task.completed_at))
                : 0;
              const isUrgent = hoursSinceCompletion > 24;
              const hasSignature = !!task.signature_data;

              return (
                <div
                  key={task.id}
                  onClick={() => onVerifyTask(task)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                    isUrgent ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    isUrgent ? "bg-amber-200" : "bg-blue-100"
                  )}>
                    <Shield className={cn(
                      "w-5 h-5",
                      isUrgent ? "text-amber-700" : "text-blue-600"
                    )} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-slate-900 truncate">{task.title}</h4>
                      {task.priority === "critical" && (
                        <Badge className="bg-rose-100 text-rose-700 text-xs">Critical</Badge>
                      )}
                      {task.priority === "high" && (
                        <Badge className="bg-orange-100 text-orange-700 text-xs">High</Badge>
                      )}
                      {!hasSignature && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          No Signature
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {task.assigned_to_name || "Unknown"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {task.completed_at ? format(parseISO(task.completed_at), "MMM d, h:mm a") : "—"}
                      </span>
                      <span className="text-slate-400">{task.area}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {isUrgent && (
                      <div className="text-right">
                        <p className="text-xs text-amber-600 font-medium">
                          {hoursSinceCompletion}h ago
                        </p>
                        <p className="text-xs text-amber-500">Needs review</p>
                      </div>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}