// @ts-nocheck
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Info } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { TASK_CATEGORIES, CATEGORY_ORDER } from "@/components/tasks/taskCategoryClassifier";

export default function BulkEditTasksModal({ open, onOpenChange, selectedTasks, onSave, isLoading, progress }) {
  const [fieldsToUpdate, setFieldsToUpdate] = useState({
    frequency: false,
    cycle_start_date: false,
    priority: false,
    area: false,
    category: false,
    duration: false,
    is_recurring: false
  });

  const [formData, setFormData] = useState({
    frequency: "",
    cycle_start_date: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    priority: "medium",
    area: "",
    category: "",
    duration: "",
    is_recurring: true
  });

  const toggleField = (field) => {
    setFieldsToUpdate(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Build update data with only selected fields
    const updateData = {};
    if (fieldsToUpdate.frequency) updateData.frequency = formData.frequency;
    if (fieldsToUpdate.cycle_start_date) updateData.cycle_start_date = formData.cycle_start_date;
    if (fieldsToUpdate.priority) updateData.priority = formData.priority;
    if (fieldsToUpdate.area) updateData.area = formData.area;
    if (fieldsToUpdate.category) updateData.category = formData.category;
    if (fieldsToUpdate.duration) updateData.duration = parseInt(formData.duration) || null;
    if (fieldsToUpdate.is_recurring) updateData.is_recurring = formData.is_recurring;

    if (Object.keys(updateData).length === 0) {
      return;
    }

    await onSave(updateData);
    onOpenChange(false);
  };

  const hasFieldsSelected = Object.values(fieldsToUpdate).some(v => v);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Bulk Edit {selectedTasks.length} Tasks
          </DialogTitle>
        </DialogHeader>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Select which fields to update</p>
              <p className="text-blue-600">Only checked fields will be applied to all selected tasks.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Frequency */}
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50">
            <Checkbox 
              id="update_frequency" 
              checked={fieldsToUpdate.frequency}
              onCheckedChange={() => toggleField('frequency')}
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update_frequency" className="cursor-pointer font-medium">Frequency</Label>
              <Select 
                value={formData.frequency} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, frequency: v }))}
                disabled={!fieldsToUpdate.frequency}
              >
                <SelectTrigger className={!fieldsToUpdate.frequency ? "opacity-50" : ""}>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-Weekly (every 2 weeks)</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="bimonthly">Bimonthly (every 2 months)</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cycle Start Date */}
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50">
            <Checkbox 
              id="update_cycle_start_date" 
              checked={fieldsToUpdate.cycle_start_date}
              onCheckedChange={() => toggleField('cycle_start_date')}
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update_cycle_start_date" className="cursor-pointer font-medium">Cycle Start Date</Label>
              <Input
                type="date"
                value={formData.cycle_start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, cycle_start_date: e.target.value }))}
                disabled={!fieldsToUpdate.cycle_start_date}
                className={!fieldsToUpdate.cycle_start_date ? "opacity-50" : ""}
              />
            </div>
          </div>

          {/* Priority */}
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50">
            <Checkbox 
              id="update_priority" 
              checked={fieldsToUpdate.priority}
              onCheckedChange={() => toggleField('priority')}
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update_priority" className="cursor-pointer font-medium">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}
                disabled={!fieldsToUpdate.priority}
              >
                <SelectTrigger className={!fieldsToUpdate.priority ? "opacity-50" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Area */}
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50">
            <Checkbox 
              id="update_area" 
              checked={fieldsToUpdate.area}
              onCheckedChange={() => toggleField('area')}
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update_area" className="cursor-pointer font-medium">Area</Label>
              <Input
                value={formData.area}
                onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                placeholder="e.g., Kitchen, Lobby"
                disabled={!fieldsToUpdate.area}
                className={!fieldsToUpdate.area ? "opacity-50" : ""}
              />
            </div>
          </div>

          {/* Category */}
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50">
            <Checkbox 
              id="update_category" 
              checked={fieldsToUpdate.category}
              onCheckedChange={() => toggleField('category')}
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update_category" className="cursor-pointer font-medium">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                disabled={!fieldsToUpdate.category}
              >
                <SelectTrigger className={!fieldsToUpdate.category ? "opacity-50" : ""}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map(catId => (
                    <SelectItem key={catId} value={catId}>
                      {TASK_CATEGORIES[catId].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50">
            <Checkbox 
              id="update_duration" 
              checked={fieldsToUpdate.duration}
              onCheckedChange={() => toggleField('duration')}
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update_duration" className="cursor-pointer font-medium">Duration (minutes)</Label>
              <Input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="e.g., 30"
                disabled={!fieldsToUpdate.duration}
                className={!fieldsToUpdate.duration ? "opacity-50" : ""}
              />
            </div>
          </div>

          {/* Is Recurring */}
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50">
            <Checkbox 
              id="update_is_recurring" 
              checked={fieldsToUpdate.is_recurring}
              onCheckedChange={() => toggleField('is_recurring')}
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update_is_recurring" className="cursor-pointer font-medium">Auto-Regenerate</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_recurring_value"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_recurring: checked }))}
                  disabled={!fieldsToUpdate.is_recurring}
                />
                <Label 
                  htmlFor="is_recurring_value" 
                  className={`text-sm ${!fieldsToUpdate.is_recurring ? "opacity-50" : ""}`}
                >
                  Auto-regenerate tasks when completed
                </Label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t">
            {progress?.isRunning && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-800 font-medium">Updating tasks...</span>
                  <span className="text-sm text-blue-600">{progress.current}/{progress.total}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !hasFieldsSelected} 
                className="bg-slate-900 hover:bg-slate-800"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update {selectedTasks.length} Tasks
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}