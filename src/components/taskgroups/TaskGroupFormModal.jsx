// @ts-nocheck
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

const colors = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e"
];

export default function TaskGroupFormModal({ open, onOpenChange, group, dailyTasks, allGroups, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: colors[0],
    task_ids: [],
    status: "active"
  });

  // Get parent/group tasks (is_group=true) and their subtasks, plus standalone tasks
  const groupTasks = dailyTasks.filter(t => t.is_group === true);
  const subtasksByParent = dailyTasks.filter(t => t.parent_task_id || t.group_title).reduce((acc, task) => {
    const parentKey = task.parent_task_id || task.group_title;
    if (!acc[parentKey]) {
      acc[parentKey] = [];
    }
    acc[parentKey].push(task);
    return acc;
  }, {});
  
  // Standalone tasks: no parent_task_id, no group_title, and not a group header (is_group !== true)
  const standaloneTasks = dailyTasks.filter(t => !t.parent_task_id && !t.group_title && !t.is_group);

  useEffect(() => {
    if (group) {
      setFormData(group);
    } else if (open) {
      setFormData({
        name: "",
        description: "",
        color: colors[0],
        task_ids: [],
        status: "active"
      });
    }
  }, [group, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const toggleTask = (taskId) => {
    setFormData(prev => ({
      ...prev,
      task_ids: prev.task_ids.includes(taskId)
        ? prev.task_ids.filter(id => id !== taskId)
        : [...prev.task_ids, taskId]
    }));
  };

  const toggleGroupTask = (groupTask) => {
    // Look for subtasks by parent_task_id or by group_title matching the group task's title
    const subtasks = subtasksByParent[groupTask.id] || subtasksByParent[groupTask.title] || [];
    const subtaskIds = subtasks.map(t => t.id);
    
    setFormData(prev => {
      const allSubtasksSelected = subtaskIds.every(id => prev.task_ids.includes(id));
      
      if (allSubtasksSelected) {
        // Deselect: remove only subtasks (not parent)
        return {
          ...prev,
          task_ids: prev.task_ids.filter(id => !subtaskIds.includes(id))
        };
      } else {
        // Select: add only subtasks (not parent)
        return {
          ...prev,
          task_ids: [...new Set([...prev.task_ids, ...subtaskIds])]
        };
      }
    });
  };

  // Get tasks that are already in other groups
  const tasksInOtherGroups = (allGroups || [])
    .filter(g => g.id !== group?.id)
    .flatMap(g => g.task_ids || []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{group ? "Edit Task Group" : "Create Task Group"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Group Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Morning Shift Tasks"
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this task group"
              rows={2}
            />
          </div>

          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {colors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color ? "border-slate-900 scale-110" : "border-slate-200"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>Daily Tasks</Label>
            <p className="text-xs text-slate-500 mb-2">Select individual tasks or entire groups (all subtasks included)</p>
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              {dailyTasks.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No daily tasks available</p>
              ) : (
                <>
                  {/* Group Tasks with subtasks */}
                  {groupTasks.map(groupTask => {
                    const isInOtherGroup = tasksInOtherGroups.includes(groupTask.id);
                    const subtasks = subtasksByParent[groupTask.id] || subtasksByParent[groupTask.title] || [];
                    const subtaskIds = subtasks.map(t => t.id);
                    const isSelected = subtaskIds.length > 0 && subtaskIds.every(id => formData.task_ids.includes(id));

                    return (
                      <div key={groupTask.id}>
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleGroupTask(groupTask)}
                            disabled={isInOtherGroup || subtaskIds.length === 0}
                          />
                          <button
                            type="button"
                            onClick={() => toggleGroupTask(groupTask)}
                            disabled={isInOtherGroup || subtaskIds.length === 0}
                            className="flex-1 text-left"
                          >
                            <p className={`text-sm font-medium ${isInOtherGroup ? 'text-slate-400' : 'text-slate-900'}`}>
                              {groupTask.title}
                              {isInOtherGroup && <span className="text-xs ml-2">(In another group)</span>}
                            </p>
                            <p className="text-xs text-slate-500">{groupTask.area}</p>
                            {subtasks.length > 0 && (
                              <p className="text-xs text-slate-600 mt-1">Includes {subtasks.length} subtask{subtasks.length !== 1 ? 's' : ''}</p>
                            )}
                          </button>
                        </div>

                        {/* Subtasks */}
                        {subtasks.length > 0 && (
                          <div className="ml-6 mt-2 space-y-2 pl-3 border-l-2 border-slate-200">
                            {subtasks.map(subtask => {
                              const isSubtaskInOtherGroup = tasksInOtherGroups.includes(subtask.id);
                              return (
                                <div key={subtask.id} className="flex items-start gap-2">
                                  <Checkbox
                                    checked={formData.task_ids.includes(subtask.id)}
                                    onCheckedChange={() => toggleTask(subtask.id)}
                                    disabled={isSubtaskInOtherGroup}
                                  />
                                  <div className="flex-1">
                                    <p className={`text-sm ${isSubtaskInOtherGroup ? 'text-slate-400' : 'text-slate-900'}`}>
                                      {subtask.title}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Standalone Tasks (no parent, no group) */}
                  {standaloneTasks.length > 0 && (
                    <div className="border-t pt-3 mt-3">
                      <p className="text-xs text-slate-500 mb-2 font-medium">Individual Tasks</p>
                      {standaloneTasks.map(task => {
                        const isInOtherGroup = tasksInOtherGroups.includes(task.id);
                        return (
                          <div key={task.id} className="flex items-start gap-2 py-1">
                            <Checkbox
                              checked={formData.task_ids.includes(task.id)}
                              onCheckedChange={() => toggleTask(task.id)}
                              disabled={isInOtherGroup}
                            />
                            <button
                              type="button"
                              onClick={() => toggleTask(task.id)}
                              disabled={isInOtherGroup}
                              className="flex-1 text-left"
                            >
                              <p className={`text-sm font-medium ${isInOtherGroup ? 'text-slate-400' : 'text-slate-900'}`}>
                                {task.title}
                                {isInOtherGroup && <span className="text-xs ml-2">(In another group)</span>}
                              </p>
                              <p className="text-xs text-slate-500">{task.area}</p>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || formData.task_ids.length === 0}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {group ? "Update Group" : "Create Group"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}