import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, ChevronDown, ChevronRight, Folder, Droplets, Star, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, subDays } from "date-fns";

export default function AddTasksModal({ 
  open, 
  onOpenChange, 
  tasks, 
  onConfirm, 
  isLoading, 
  currentEmployeeEmail,
  diverterSettings = null,
  recentDiverterInspections = [],
  onAddDiverterTask = null,
  completedTasksForDay = 0,
  totalTasksForDay = 0
}) {
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [selectedDiverterTask, setSelectedDiverterTask] = useState(false);
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expandedFolders, setExpandedFolders] = useState({});

  // Check if diverter task is already completed this period
  const diverterAlreadyDone = useMemo(() => {
    if (!diverterSettings?.is_enabled) return false;
    
    const now = new Date();
    const freq = (diverterSettings.frequency || "weekly").toLowerCase();
    
    if (recentDiverterInspections.length > 0) {
      const weekStart = startOfWeek(now, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const today = now.toISOString().split("T")[0];
      
      return recentDiverterInspections.some(inspection => {
        if (!inspection.inspection_date) return false;
        const inspDate = parseISO(inspection.inspection_date);
        
        if (freq === "daily") {
          return inspDate.toISOString().split("T")[0] === today;
        } else if (freq === "weekly") {
          return isWithinInterval(inspDate, { start: weekStart, end: weekEnd });
        } else if (freq === "bi-weekly") {
          const twoWeeksAgo = subDays(now, 14);
          return inspDate >= twoWeeksAgo;
        } else if (freq === "monthly") {
          return isWithinInterval(inspDate, { start: monthStart, end: monthEnd });
        }
        return false;
      });
    }
    
    return false;
  }, [diverterSettings, recentDiverterInspections]);

  const toggleFolder = (folderKey) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderKey]: !prev[folderKey]
    }));
  };

  // Group similar standalone tasks into folders (e.g., "Stickies 1", "Stickies 2" -> "Stickies")
  const groupSimilarTasks = (tasksList) => {
    const folders = {};
    const ungrouped = [];
    
    tasksList.forEach(task => {
      // Check if task title matches pattern like "Name 1", "Name 2", etc.
      const match = task.title.match(/^(.+?)\s*(\d+)$/);
      if (match) {
        const baseName = match[1].trim();
        if (!folders[baseName]) {
          folders[baseName] = [];
        }
        folders[baseName].push(task);
      } else {
        ungrouped.push(task);
      }
    });
    
    // Only keep folders with multiple items, move singles back to ungrouped
    const finalFolders = {};
    Object.entries(folders).forEach(([name, items]) => {
      if (items.length > 1) {
        finalFolders[name] = items;
      } else {
        ungrouped.push(...items);
      }
    });
    
    return { folders: finalFolders, ungrouped };
  };

  const uniqueFrequencies = [...new Set(tasks.map(t => t.frequency).filter(Boolean))];
  const uniqueCategories = [...new Set(tasks.map(t => t.category).filter(Boolean))];

  // Organize tasks by parent/subtask relationship
  // Support both: tasks with is_group=true as headers, and tasks with parent_task_id as subtasks
  const subtasksByParent = {};
  const groupTasks = tasks.filter(t => t.is_group === true);
  
  tasks.forEach(task => {
    if (task.parent_task_id) {
      if (!subtasksByParent[task.parent_task_id]) {
        subtasksByParent[task.parent_task_id] = [];
      }
      subtasksByParent[task.parent_task_id].push(task);
    }
  });

  // Get parent tasks (is_group=true or has subtasks) and standalone tasks (not subtasks, not groups)
  const parentTasks = tasks.filter(t => 
    !t.parent_task_id && (t.is_group === true || subtasksByParent[t.id]?.length > 0)
  );
  const standaloneTasks = tasks.filter(t => 
    !t.parent_task_id && t.is_group !== true && !subtasksByParent[t.id]?.length
  );

  // Helper to check if task is assigned to someone else
  const isAssignedToOther = (task) => {
    return task?.assigned_to && task.assigned_to !== currentEmployeeEmail;
  };

  // Filter tasks - exclude tasks assigned to other employees
  const filterTask = (task) => {
    if (isAssignedToOther(task)) return false; // Don't show tasks assigned to others
    const freqMatch = frequencyFilter === "all" || task.frequency === frequencyFilter;
    const catMatch = categoryFilter === "all" || task.category === categoryFilter;
    return freqMatch && catMatch;
  };

  const filteredParentTasks = parentTasks.filter(filterTask);
  const filteredStandaloneTasks = standaloneTasks.filter(filterTask);

  // Organize by frequency
  const allFilteredTasks = [...filteredParentTasks, ...filteredStandaloneTasks];
  const tasksByFrequency = {};
  
  allFilteredTasks.forEach(task => {
    const freq = task.frequency || "Other";
    if (!tasksByFrequency[freq]) {
      tasksByFrequency[freq] = [];
    }
    tasksByFrequency[freq].push(task);
  });

  // Sort frequencies (daily first, then weekly, etc.)
  const frequencyOrder = ["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"];
  const sortedFrequencies = Object.keys(tasksByFrequency).sort((a, b) => {
    const aIndex = frequencyOrder.findIndex(f => a.toLowerCase().includes(f));
    const bIndex = frequencyOrder.findIndex(f => b.toLowerCase().includes(f));
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Sort tasks within each frequency: incomplete first
  sortedFrequencies.forEach(freq => {
    tasksByFrequency[freq].sort((a, b) => {
      const aComplete = a.status === "completed" || a.status === "verified";
      const bComplete = b.status === "completed" || b.status === "verified";
      if (aComplete && !bComplete) return 1;
      if (!aComplete && bComplete) return -1;
      return 0;
    });
  });

  const toggleParentTask = (parentTaskId) => {
    const subtasks = subtasksByParent[parentTaskId] || [];
    const subtaskIds = subtasks.map(t => t.id);
    
    // Check if all subtasks are currently selected
    const allSubtasksSelected = subtaskIds.every(id => selectedTasks.includes(id));
    
    if (allSubtasksSelected) {
      // Deselect all subtasks
      setSelectedTasks(prev => prev.filter(id => !subtaskIds.includes(id)));
    } else {
      // Select all subtasks
      setSelectedTasks(prev => [...new Set([...prev, ...subtaskIds])]);
    }
  };

  const handleToggle = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedTasks, selectedDiverterTask);
    setSelectedTasks([]);
    setSelectedDiverterTask(false);
  };

  const handleCancel = () => {
    setSelectedTasks([]);
    setSelectedDiverterTask(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add More Tasks</DialogTitle>
          <DialogDescription>
            Select additional tasks to add to your agenda
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Smart status banner */}
          {totalTasksForDay > 0 && completedTasksForDay >= totalTasksForDay ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-900 text-sm">Great work — you've completed all your tasks! ⭐</p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Adding more tasks to your agenda helps us reach our goals. We appreciate your excellence and dedication to the team!
                  </p>
                </div>
              </div>
            </div>
          ) : totalTasksForDay > 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 text-sm">You still have {totalTasksForDay - completedTasksForDay} task{totalTasksForDay - completedTasksForDay !== 1 ? 's' : ''} to complete today</p>
                  <p className="text-xs text-amber-700 mt-1">
                    We encourage you to finish your current tasks first! You can still add more below, but keep in mind it may affect your completion percentage if you can't finish them all. You've got this! 💪
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Rain Diverter Task */}
          {diverterSettings?.is_enabled && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-600" />
                Rain Diverter Inspection
              </h3>
              <div
                className={cn(
                  "border rounded-lg cursor-pointer transition-all p-3",
                  selectedDiverterTask
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                )}
                onClick={() => setSelectedDiverterTask(!selectedDiverterTask)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox checked={selectedDiverterTask} />
                  <Droplets className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-slate-900">
                      {diverterSettings.task_title || "Rain Diverter Bucket Check"}
                    </p>
                    <p className="text-xs text-blue-600 capitalize">
                      {diverterSettings.frequency || "weekly"} task
                    </p>
                  </div>
                  {diverterAlreadyDone && (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">Already done this period</Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Filter by Frequency</label>
              <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Frequencies</SelectItem>
                  {uniqueFrequencies.map(freq => (
                    <SelectItem key={freq} value={freq}>
                      {freq}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Filter by Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tasks List */}
          {sortedFrequencies.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              No tasks match the selected filters
            </p>
          ) : (
            <div className="space-y-6">
              {sortedFrequencies.map(freq => {
              const freqTasks = tasksByFrequency[freq];
              const parentTasksInFreq = freqTasks.filter(t => t.is_group === true || subtasksByParent[t.id]?.length > 0);
              const standaloneTasksInFreq = freqTasks.filter(t => t.is_group !== true && !subtasksByParent[t.id]?.length);
                const { folders, ungrouped } = groupSimilarTasks(standaloneTasksInFreq);
                
                return (
                  <div key={freq}>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 capitalize">{freq} Tasks</h3>
                    <div className="space-y-2">
                      {/* Parent/Group tasks with subtasks */}
                      {parentTasksInFreq.map(task => {
                        const subtasks = subtasksByParent[task.id] || [];
                        const subtaskIds = subtasks.map(t => t.id);
                        const allSubtasksSelected = subtaskIds.length > 0 && subtaskIds.every(id => selectedTasks.includes(id));
                        const someSubtasksSelected = subtaskIds.some(id => selectedTasks.includes(id));
                        const isCompleted = task.status === "completed" || task.status === "verified";
                        const folderKey = `group-${task.id}`;
                        const isExpanded = expandedFolders[folderKey];
                        
                        return (
                          <div key={task.id} className={cn("border rounded-lg", task.is_group ? "bg-emerald-50 border-emerald-200" : isCompleted ? "bg-slate-100 opacity-60" : "bg-slate-50")}>
                            <div
                              className="flex items-center gap-3 p-3 cursor-pointer"
                              onClick={() => toggleFolder(folderKey)}
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-emerald-600" /> : <ChevronRight className="w-4 h-4 text-emerald-600" />}
                              <Folder className="w-4 h-4 text-emerald-600" />
                              <div className="flex-1">
                                <p className={cn("font-medium text-sm", isCompleted ? "text-slate-500 line-through" : "text-slate-900")}>{task.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {task.area && (
                                    <span className="text-xs text-slate-500">{task.area}</span>
                                  )}
                                </div>
                                <p className="text-xs text-emerald-600 mt-1 font-medium">
                                  {subtasks.length} subtask{subtasks.length !== 1 ? 's' : ''}
                                  {someSubtasksSelected && ` • ${subtaskIds.filter(id => selectedTasks.includes(id)).length} selected`}
                                </p>
                              </div>
                              <Checkbox
                                checked={allSubtasksSelected}
                                onCheckedChange={() => toggleParentTask(task.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="mr-2"
                              />
                            </div>
                            {isExpanded && subtasks.length > 0 && (
                              <div className="border-t border-emerald-200 p-2 max-h-48 overflow-y-auto space-y-1">
                                {subtasks.map(subtask => {
                                  const isSubCompleted = subtask.status === "completed" || subtask.status === "verified";
                                  return (
                                    <label
                                      key={subtask.id}
                                      className={cn(
                                        "flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                                        selectedTasks.includes(subtask.id)
                                          ? "bg-blue-50"
                                          : isSubCompleted
                                            ? "bg-slate-100 opacity-60"
                                            : "bg-white hover:bg-slate-50"
                                      )}
                                    >
                                      <Checkbox
                                        checked={selectedTasks.includes(subtask.id)}
                                        onCheckedChange={() => handleToggle(subtask.id)}
                                        className="mt-0.5"
                                      />
                                      <div className="flex-1">
                                        <p className={cn("text-sm", isSubCompleted ? "text-slate-500 line-through" : "text-slate-900")}>{subtask.title}</p>
                                        {subtask.description && (
                                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{subtask.description}</p>
                                        )}
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Folders of similar tasks */}
                      {Object.entries(folders).map(([folderName, folderTasks]) => {
                        const folderKey = `${freq}-${folderName}`;
                        const isExpanded = expandedFolders[folderKey];
                        const sortedFolderTasks = [...folderTasks].sort((a, b) => {
                          const aComplete = a.status === "completed" || a.status === "verified";
                          const bComplete = b.status === "completed" || b.status === "verified";
                          if (aComplete && !bComplete) return 1;
                          if (!aComplete && bComplete) return -1;
                          return 0;
                        });
                        const incompleteCount = sortedFolderTasks.filter(t => t.status !== "completed" && t.status !== "verified").length;
                        const selectedInFolder = sortedFolderTasks.filter(t => selectedTasks.includes(t.id)).length;
                        
                        return (
                          <div key={folderKey} className="border rounded-lg bg-amber-50 border-amber-200">
                            <div 
                              className="flex items-center gap-3 p-3 cursor-pointer"
                              onClick={() => toggleFolder(folderKey)}
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-amber-600" /> : <ChevronRight className="w-4 h-4 text-amber-600" />}
                              <Folder className="w-4 h-4 text-amber-600" />
                              <div className="flex-1">
                                <p className="font-medium text-sm text-slate-900">{folderName}</p>
                                <p className="text-xs text-slate-500">
                                  {folderTasks.length} tasks • {incompleteCount} incomplete
                                  {selectedInFolder > 0 && <span className="text-blue-600"> • {selectedInFolder} selected</span>}
                                </p>
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="border-t border-amber-200 p-2 max-h-48 overflow-y-auto space-y-1">
                                {sortedFolderTasks.map(task => {
                                  const isCompleted = task.status === "completed" || task.status === "verified";
                                  return (
                                    <label
                                      key={task.id}
                                      className={cn(
                                        "flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                                        selectedTasks.includes(task.id)
                                          ? "bg-blue-50"
                                          : isCompleted
                                            ? "bg-slate-100 opacity-60"
                                            : "bg-white hover:bg-slate-50"
                                      )}
                                    >
                                      <Checkbox
                                        checked={selectedTasks.includes(task.id)}
                                        onCheckedChange={() => handleToggle(task.id)}
                                        className="mt-0.5"
                                      />
                                      <p className={cn("text-sm", isCompleted ? "text-slate-500 line-through" : "text-slate-900")}>{task.title}</p>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Ungrouped standalone tasks */}
                      {ungrouped.map(task => {
                        const isCompleted = task.status === "completed" || task.status === "verified";
                        return (
                          <label
                            key={task.id}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                              selectedTasks.includes(task.id)
                                ? "bg-blue-50 border-blue-200"
                                : isCompleted
                                  ? "bg-slate-100 border-slate-200 opacity-60"
                                  : "bg-white border-slate-200 hover:border-slate-300"
                            )}
                          >
                            <Checkbox
                              checked={selectedTasks.includes(task.id)}
                              onCheckedChange={() => handleToggle(task.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <p className={cn("font-medium text-sm", isCompleted ? "text-slate-500 line-through" : "text-slate-900")}>{task.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {task.area && (
                                  <span className="text-xs text-slate-500">{task.area}</span>
                                )}
                              </div>
                              {task.description && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-slate-600">
            {(selectedTasks.length > 0 || selectedDiverterTask) ? (
              <span>
                {selectedTasks.length + (selectedDiverterTask ? 1 : 0)} task{(selectedTasks.length + (selectedDiverterTask ? 1 : 0)) > 1 ? 's' : ''} selected
              </span>
            ) : (
              <span>Select tasks to add</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              disabled={isLoading}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={(selectedTasks.length === 0 && !selectedDiverterTask) || isLoading}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Tasks
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}