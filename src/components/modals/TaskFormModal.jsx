// @ts-nocheck
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, X, FileText, Image, Info, GraduationCap, Camera, Plus, AlertTriangle } from "lucide-react";
import { RoleConfigRepo } from "@/lib/adapters/database";
import { uploadFile } from "@/lib/adapters/storage";
import { format, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import TrainingDocumentSelector from "./TrainingDocumentSelector";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { classifyTask } from "@/components/tasks/taskCategoryClassifier";
import CategorySelector from "@/components/tasks/CategorySelector";
import ProxiedImage from "@/components/ui/ProxiedImage";

export default function TaskFormModal({ open, onOpenChange, task, employees, onSave, isLoading, organizationId, customCategories = [], onAddCategory }) {
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkStartNum, setBulkStartNum] = useState(1);
  const [bulkEndNum, setBulkEndNum] = useState(10);
  const [bulkNamePrefix, setBulkNamePrefix] = useState("");
  const [isGroupTask, setIsGroupTask] = useState(false);
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isUploadingSsop, setIsUploadingSsop] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showTrainingSelector, setShowTrainingSelector] = useState(false);
  const [customFrequency, setCustomFrequency] = useState("");
  const [showCustomFrequency, setShowCustomFrequency] = useState(false);
  const [frequencyChangeReason, setFrequencyChangeReason] = useState("");
  const [originalFrequency, setOriginalFrequency] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    area: "",
    frequency: "",
    cycle_start_date: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    days_of_week: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    duration: "",
    ssop_url: "",
    image_url: "",
    priority: "medium",
    status: "pending",
    is_recurring: true,
    eligible_roles: []
  });

  const { data: roleConfigs = [] } = useQuery({
    queryKey: ["role_configs_taskform", organizationId],
    queryFn: () => RoleConfigRepo.filter({ organization_id: organizationId, is_active: true }),
    enabled: !!organizationId
  });

  useEffect(() => {
    if (task) {
      setOriginalFrequency(task.frequency || "");
      setFrequencyChangeReason("");
      setFormData({
        title: task.title || "",
        description: task.description || "",
        category: task.category || "",
        area: task.area || "",
        frequency: task.frequency || "",
        cycle_start_date: task.cycle_start_date || format(startOfMonth(new Date()), "yyyy-MM-dd"),
        days_of_week: task.days_of_week || ["monday", "tuesday", "wednesday", "thursday", "friday"],
        duration: task.duration || "",
        ssop_url: task.ssop_url || "",
        image_url: task.image_url || "",
        priority: task.priority || "medium",
        status: task.status || "pending",
        is_recurring: task.is_recurring !== undefined ? task.is_recurring : true,
        required_training_id: task.required_training_id || "",
        required_training_title: task.required_training_title || "",
        requires_competency: task.requires_competency || false,
        competency_re_eval_frequency: task.competency_re_eval_frequency || "none",
        risk_level: task.risk_level || "medium",
        requires_photo_before: task.requires_photo_before || false,
        requires_photo_after: task.requires_photo_after || false,
        eligible_roles: task.eligible_roles || []
      });
    } else {
      setOriginalFrequency("");
      setFrequencyChangeReason("");
      setFormData({
        title: "",
        description: "",
        category: "",
        area: "",
        frequency: "",
        cycle_start_date: format(startOfMonth(new Date()), "yyyy-MM-dd"),
        days_of_week: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        duration: "",
        ssop_url: "",
        image_url: "",
        priority: "medium",
        status: "pending",
        is_recurring: true,
        required_training_id: "",
        required_training_title: "",
        requires_competency: false,
        competency_re_eval_frequency: "none",
        risk_level: "medium",
        requires_photo_before: false,
        requires_photo_after: false,
        eligible_roles: []
      });
      setIsGroupTask(false);
      setSubtasks([]);
      setNewSubtaskTitle("");
    }
  }, [task, open]);

  const handleTrainingSelect = (doc) => {
    if (doc) {
      setFormData(prev => ({ 
        ...prev, 
        required_training_id: doc.id,
        required_training_title: doc.title
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        required_training_id: "",
        required_training_title: ""
      }));
    }
  };

  const handleEmployeeChange = (email) => {
    const emp = employees.find(e => e.email === email);
    setFormData(prev => ({
      ...prev,
      assigned_to: email,
      assigned_to_name: emp?.name || ""
    }));
  };

  const toggleDayOfWeek = (day) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
  };

  const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayLabels = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };

  const bulkCount = Math.max(0, bulkEndNum - bulkStartNum + 1);

  const isFrequencyChanged = task && originalFrequency && formData.frequency !== originalFrequency;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate frequency change reason
    if (isFrequencyChanged && !frequencyChangeReason.trim()) {
      return; // The required attribute on the textarea will handle the visual cue
    }

    // Include frequency_change_reason in formData if frequency changed
    const saveData = isFrequencyChanged 
      ? { ...formData, frequency_change_reason: frequencyChangeReason.trim() }
      : formData;

    if (isBulkMode && bulkCount > 0) {
      const tasksToCreate = [];
      for (let i = bulkStartNum; i <= bulkEndNum; i++) {
        tasksToCreate.push({
          ...formData,
          title: bulkNamePrefix ? `${bulkNamePrefix} ${i}` : `${formData.title} ${i}`
        });
      }
      // Create tasks sequentially but in larger batches
      for (const taskData of tasksToCreate) {
        await onSave(taskData);
      }
    } else if (isGroupTask && subtasks.length > 0) {
      const parentData = { ...saveData, is_group: true };
      const parentTask = await onSave(parentData);

      for (const subtask of subtasks) {
        await onSave({
          ...saveData,
          title: subtask.title,
          parent_task_id: parentTask?.id || null,
          group_title: saveData.title,
          is_group: false,
          description: subtask.description || saveData.description
        });
      }
    } else {
      await onSave(saveData);
    }
    onOpenChange(false);
  };

  const addSubtask = () => {
    if (newSubtaskTitle.trim()) {
      setSubtasks([...subtasks, { title: newSubtaskTitle, description: "" }]);
      setNewSubtaskTitle("");
    }
  };

  const removeSubtask = (index) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleSsopUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingSsop(true);
    const { file_url } = await uploadFile(file);
    setFormData(prev => ({ ...prev, ssop_url: file_url }));
    setIsUploadingSsop(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingImage(true);
    const { file_url } = await uploadFile(file);
    setFormData(prev => ({ ...prev, image_url: file_url }));
    setIsUploadingImage(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {task ? "Edit Task" : "Create New Task"}
          </DialogTitle>
        </DialogHeader>

        {!task && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                id="bulk_mode"
                checked={isBulkMode}
                onChange={(e) => {
                  setIsBulkMode(e.target.checked);
                  setIsGroupTask(false);
                }}
                className="w-4 h-4 text-slate-600 rounded focus:ring-2 focus:ring-slate-500"
              />
              <label htmlFor="bulk_mode" className="text-sm font-medium text-slate-900 cursor-pointer">
                Create multiple tasks at once (e.g., 100 trash cans)
              </label>
            </div>
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <input
                type="checkbox"
                id="group_task"
                checked={isGroupTask}
                onChange={(e) => {
                  setIsGroupTask(e.target.checked);
                  setIsBulkMode(false);
                }}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
              />
              <label htmlFor="group_task" className="text-sm font-medium text-emerald-900 cursor-pointer">
                Create group task with subtasks (e.g., Big Blue Area with multiple items)
              </label>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={isBulkMode ? "e.g., Trash Can" : "e.g., Clean and sanitize kitchen surfaces"}
              required
            />
            {isBulkMode && (
              <p className="text-xs text-slate-500">
                Will create tasks as: "Trash Can 1", "Trash Can 2", etc.
              </p>
            )}
          </div>

          {isGroupTask && (
            <p className="text-xs text-slate-500">
              Create a parent task with multiple subtasks. Each subtask counts separately toward completion.
            </p>
          )}

          {isBulkMode && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk_start">Start Number *</Label>
                  <Input
                     id="bulk_start"
                     type="number"
                     min="1"
                     value={bulkStartNum}
                     onChange={(e) => setBulkStartNum(Math.max(1, parseInt(e.target.value) || 1))}
                     required
                   />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulk_end">End Number *</Label>
                  <Input
                     id="bulk_end"
                     type="number"
                     min="1"
                     value={bulkEndNum}
                     onChange={(e) => setBulkEndNum(Math.max(1, parseInt(e.target.value) || 1))}
                     required
                   />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulk_prefix">Custom Prefix</Label>
                  <Input
                    id="bulk_prefix"
                    value={bulkNamePrefix}
                    onChange={(e) => setBulkNamePrefix(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Will create {bulkCount} task{bulkCount !== 1 ? 's' : ''}: "{bulkNamePrefix || formData.title || 'Task'} {bulkStartNum}" through "{bulkNamePrefix || formData.title || 'Task'} {bulkEndNum}"
              </p>
            </div>
          )}

          {isGroupTask && (
            <div className="space-y-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <Label className="text-slate-900 font-semibold">Subtasks</Label>
              <div className="flex gap-2">
                <Input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addSubtask()}
                  placeholder="e.g., Overheads, Walls, Floors"
                  className="text-sm"
                />
                <Button
                  type="button"
                  onClick={addSubtask}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                >
                  Add
                </Button>
              </div>
              
              {subtasks.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {subtasks.map((subtask, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-emerald-200">
                      <span className="text-sm text-slate-700">{subtask.title}</span>
                      <button
                        type="button"
                        onClick={() => removeSubtask(idx)}
                        className="text-rose-600 hover:text-rose-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-emerald-700">{subtasks.length} subtask{subtasks.length !== 1 ? "s" : ""} added</p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed instructions..."
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <CategorySelector
              value={formData.category}
              onChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
              customCategories={customCategories}
              onAddCategory={onAddCategory}
              onAutoDetect={() => {
                const suggested = classifyTask({ title: formData.title, description: formData.description, frequency: formData.frequency, is_recurring: formData.is_recurring });
                setFormData(prev => ({ ...prev, category: suggested }));
              }}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="area">Area *</Label>
            <Input
              id="area"
              value={formData.area}
              onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
              placeholder="e.g., Kitchen, Lobby"
              required
            />
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                {showCustomFrequency ? (
                  <div className="flex gap-2">
                    <Input
                      value={customFrequency}
                      onChange={(e) => setCustomFrequency(e.target.value)}
                      placeholder="e.g., Every 3 days"
                      className="flex-1"
                      autoFocus
                    />
                    <Button type="button" size="sm" className="bg-slate-900 hover:bg-slate-800" onClick={() => {
                      if (customFrequency.trim()) {
                        setFormData(prev => ({ ...prev, frequency: customFrequency.trim() }));
                        setShowCustomFrequency(false);
                      }
                    }}>Save</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowCustomFrequency(false)}>Cancel</Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select 
                      value={["daily","weekly","bi-weekly","monthly","bimonthly","quarterly","annually"].includes(formData.frequency) ? formData.frequency : ""} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, frequency: v }))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={formData.frequency || "Select frequency"} />
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
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowCustomFrequency(true)} title="Add custom frequency">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g., 30"
                />
              </div>
            </div>

            {/* Cycle Start Date */}
            {formData.frequency && formData.frequency !== "daily" && (
              <div className="space-y-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Label htmlFor="cycle_start_date" className="text-amber-900">Cycle Start Date</Label>
                <Input
                  id="cycle_start_date"
                  type="date"
                  value={formData.cycle_start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, cycle_start_date: e.target.value }))}
                />
                <div className="flex items-start gap-2 text-xs text-amber-700">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    {formData.frequency === "weekly" && "Task due by end of each week starting from this date."}
                    {formData.frequency === "bi-weekly" && "Task due every 2 weeks from this date."}
                    {formData.frequency === "monthly" && "Task due by end of each month. Cycle starts from 1st of this month."}
                    {formData.frequency === "bimonthly" && "Task due every 2 months. E.g., Jan-Feb cycle, Mar-Apr cycle."}
                    {formData.frequency === "quarterly" && "Task due by end of each quarter (Mar, Jun, Sep, Dec)."}
                    {formData.frequency === "annually" && "Task due once per year by this date."}
                  </div>
                </div>
              </div>
            )}

            {/* Frequency Change Reason - Required when editing and frequency changed */}
            {task && originalFrequency && formData.frequency !== originalFrequency && (
              <div className="space-y-2 p-3 bg-rose-50 rounded-lg border border-rose-200">
                <Label htmlFor="freq_change_reason" className="text-rose-900 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Reason for Frequency Change *
                </Label>
                <Textarea
                  id="freq_change_reason"
                  value={frequencyChangeReason}
                  onChange={(e) => setFrequencyChangeReason(e.target.value)}
                  placeholder="Explain why the frequency is being changed (required for audit trail)..."
                  rows={2}
                  required
                  className="border-rose-300 focus:border-rose-500"
                />
                <p className="text-xs text-rose-600">
                  Changed from "{originalFrequency}" to "{formData.frequency}". This will be logged in the audit trail.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="checkbox"
                id="is_recurring"
                checked={formData.is_recurring}
                onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <Label htmlFor="is_recurring" className="text-sm font-medium text-blue-900 cursor-pointer">
                Auto-regenerate this task when completed (based on frequency)
              </Label>
            </div>
          </div>

          {formData.frequency === "daily" && (
            <div className="space-y-2">
              <Label>Days of Week (for daily tasks)</Label>
              <div className="grid grid-cols-4 gap-2">
                {daysOfWeek.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDayOfWeek(day)}
                    className={cn(
                      "py-2 px-3 rounded-lg font-medium text-sm transition-colors",
                      formData.days_of_week.includes(day)
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {dayLabels[day]}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}
              >
                <SelectTrigger>
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
            
            <div className="space-y-2">
              <Label>SSOP Document</Label>
              {formData.ssop_url ? (
                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <a 
                    href={formData.ssop_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline truncate flex-1"
                  >
                    {formData.ssop_url.split('/').pop() || "View Document"}
                  </a>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, ssop_url: "" }))}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={formData.ssop_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, ssop_url: e.target.value }))}
                    placeholder="Paste URL"
                    className="flex-1"
                  />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleSsopUpload}
                      className="hidden"
                    />
                    <Button type="button" variant="outline" disabled={isUploadingSsop} asChild>
                      <span>
                        {isUploadingSsop ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      </span>
                    </Button>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Task Image */}
          <div className="space-y-2">
            <Label>Task Image/Icon {(isBulkMode || isGroupTask) && <span className="text-xs text-slate-500 font-normal">(shared across all tasks)</span>}</Label>
            {formData.image_url ? (
              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border">
                <ProxiedImage 
                  src={formData.image_url} 
                  alt="Task" 
                  className="w-16 h-16 object-cover rounded-lg border"
                />
                <div className="flex-1">
                  <p className="text-sm text-slate-600 truncate">{formData.image_url.split('/').pop()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, image_url: "" }))}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="Paste image URL"
                  className="flex-1"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" disabled={isUploadingImage} asChild>
                    <span>
                      {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                    </span>
                  </Button>
                </label>
              </div>
            )}
            <p className="text-xs text-slate-500">Upload an image of the object or area to help employees identify it</p>
          </div>

          {/* Photo Evidence Requirements */}
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4 text-blue-600" />
              <Label className="text-blue-900 font-medium">Photo Evidence Requirements</Label>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_photo_before"
                  checked={formData.requires_photo_before}
                  onChange={(e) => setFormData(prev => ({ ...prev, requires_photo_before: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="requires_photo_before" className="text-sm text-blue-900 cursor-pointer">
                  Require "Before" photo
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_photo_after"
                  checked={formData.requires_photo_after}
                  onChange={(e) => setFormData(prev => ({ ...prev, requires_photo_after: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="requires_photo_after" className="text-sm text-blue-900 cursor-pointer">
                  Require "After" photo
                </label>
              </div>
            </div>
            <p className="text-xs text-blue-700">
              Recommended for high-risk tasks or areas requiring visual verification
            </p>
          </div>

          {/* Required Training */}
          <div className="space-y-2">
            <Label>Required Training</Label>
            {formData.required_training_id ? (
              <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <GraduationCap className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-900 flex-1">{formData.required_training_title}</span>
                <button
                  type="button"
                  onClick={() => handleTrainingSelect(null)}
                  className="text-purple-400 hover:text-purple-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowTrainingSelector(true)}
                className="w-full justify-start text-slate-600"
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                Link Required Training (Optional)
              </Button>
            )}
            <p className="text-xs text-slate-500">
              Employees will be prompted to complete this training before performing the task
            </p>
          </div>

          {/* Eligible Roles */}
          {roleConfigs.length > 0 && (
            <div className="space-y-3 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-indigo-600" />
                <Label className="text-indigo-900 font-medium">Eligible Roles</Label>
              </div>
              <p className="text-xs text-indigo-700 mb-2">
                Which roles can be assigned this task? Leave all unchecked to allow any role.
              </p>
              <div className="flex flex-wrap gap-2">
                {roleConfigs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(role => {
                  const isSelected = formData.eligible_roles.includes(role.role_name);
                  return (
                    <label
                      key={role.id}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm",
                        isSelected
                          ? "bg-white border-indigo-400 ring-1 ring-indigo-400"
                          : "bg-white/50 border-indigo-200 hover:border-indigo-300"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          setFormData(prev => ({
                            ...prev,
                            eligible_roles: checked
                              ? [...prev.eligible_roles, role.role_name]
                              : prev.eligible_roles.filter(r => r !== role.role_name)
                          }));
                        }}
                      />
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: role.color || "#64748b" }}
                      />
                      <span className="text-slate-900">{role.role_name}</span>
                    </label>
                  );
                })}
              </div>
              {formData.eligible_roles.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  <span className="text-xs text-indigo-600 font-medium">Selected:</span>
                  {formData.eligible_roles.map(r => (
                    <Badge key={r} variant="outline" className="text-xs border-indigo-300 text-indigo-700">{r}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Competency Evaluation Settings */}
          {formData.required_training_id && (
            <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-amber-900 font-medium">Requires Competency Evaluation</Label>
                  <p className="text-xs text-amber-700">
                    Employee must pass a hands-on evaluation after training to be fully qualified
                  </p>
                </div>
                <Switch
                  checked={formData.requires_competency}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_competency: checked }))}
                />
              </div>

              {formData.requires_competency && (
                <>
                  <div className="space-y-2">
                    <Label className="text-amber-900">Risk Level</Label>
                    <Select 
                      value={formData.risk_level} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, risk_level: v }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="medium">Medium Risk</SelectItem>
                        <SelectItem value="high">High Risk (strict enforcement)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-amber-900">Re-Evaluation Frequency</Label>
                    <Select 
                      value={formData.competency_re_eval_frequency} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, competency_re_eval_frequency: v }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Re-Evaluation Required</SelectItem>
                        <SelectItem value="6_months">Every 6 Months</SelectItem>
                        <SelectItem value="annual">Annually</SelectItem>
                        <SelectItem value="2_years">Every 2 Years</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-amber-600">
                      How often employees must be re-evaluated to maintain qualification
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || (isGroupTask && subtasks.length === 0) || (isFrequencyChanged && !frequencyChangeReason.trim())} className="bg-slate-900 hover:bg-slate-800">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {task ? "Update Task" : isBulkMode ? `Create ${bulkCount} Tasks` : isGroupTask ? `Create Group (${subtasks.length} subtasks)` : "Create Task"}
            </Button>
          </div>
        </form>

        <TrainingDocumentSelector
          open={showTrainingSelector}
          onOpenChange={setShowTrainingSelector}
          organizationId={organizationId}
          selectedId={formData.required_training_id}
          onSelect={handleTrainingSelect}
        />
      </DialogContent>
    </Dialog>
  );
}