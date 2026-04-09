import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BadgeRepo, TaskRepo, TaskGroupRepo } from "@/lib/adapters/database";
import { uploadFile } from "@/lib/adapters/storage";
import { Upload, Loader2, ListChecks, Hash, Trophy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { TASK_CATEGORIES } from "@/components/tasks/taskCategoryClassifier";
import { useQuery } from "@tanstack/react-query";
import ProxiedImage from "@/components/ui/ProxiedImage";

const BADGE_TYPES = [
  { value: "total_tasks", label: "Total Tasks Completed", description: "Award when an employee completes a total number of any tasks" },
  { value: "category_completion", label: "Task Category Completions", description: "Award for completing tasks in a specific category (e.g. MSS, PIC, Equipment)" },
  { value: "task_group_completion", label: "Task Group Completions", description: "Award for completing tasks from a specific task group (e.g. Trash Cans 1-100)" },
  { value: "streak", label: "Consecutive Days Streak", description: "Award for working a set number of consecutive days" },
  { value: "top_performer", label: "Top Performer Ranking", description: "Award to the top 1st, 2nd, 3rd, 4th, or 5th ranked employee by task completions in a time period" },
];

const TOP_PERFORMER_RANKS = [
  { value: 1, label: "🥇 1st Place", description: "Top performer" },
  { value: 2, label: "🥈 2nd Place", description: "Runner-up" },
  { value: 3, label: "🥉 3rd Place", description: "Third place" },
  { value: 4, label: "4th Place", description: "Fourth place" },
  { value: 5, label: "5th Place", description: "Fifth place" },
];

const TOP_PERFORMER_PERIODS = [
  { value: "weekly", label: "Weekly", description: "Resets every week" },
  { value: "monthly", label: "Monthly", description: "Resets every month" },
  { value: "quarterly", label: "Quarterly", description: "Resets every quarter" },
];

const COUNTING_METHODS = [
  { value: "total", label: "Total Completions", description: "Count every completion, including repeats of the same task", icon: Hash },
  { value: "unique", label: "Unique Tasks", description: "Count only distinct/different tasks completed", icon: ListChecks },
  { value: "all", label: "Complete All", description: "Employee must complete every task in the group at least once", icon: Trophy },
];

const DEFAULT_FORM = {
  name: "",
  description: "",
  photo_url: "",
  badge_type: "total_tasks",
  threshold: 5,
  counting_method: "total",
  category: "",
  task_group_id: "",
  task_group_name: "",
  frequency_filter: "",
  task_area_filter: "",
  top_performer_period: "monthly",
  series_id: "",
  series_order: 0,
  status: "active"
};

export default function BadgeFormModal({ open, onOpenChange, badge, onSave, isLoading, orgId }) {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [taskAreas, setTaskAreas] = useState([]);
  const [taskFrequencies, setTaskFrequencies] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [taskGroups, setTaskGroups] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState("");

  // Load all badges to detect existing series
  const { data: allBadges = [] } = useQuery({
    queryKey: ["badges", orgId],
    queryFn: () => BadgeRepo.filter({ organization_id: orgId }),
    enabled: !!orgId && open,
    staleTime: 30000
  });

  // Build list of existing series from badges
  const existingSeries = (() => {
    const seriesMap = {};
    allBadges.forEach(b => {
      if (b.series_id) {
        if (!seriesMap[b.series_id]) {
          seriesMap[b.series_id] = { id: b.series_id, badges: [] };
        }
        seriesMap[b.series_id].badges.push(b);
      }
    });
    // Sort badges within each series by series_order
    Object.values(seriesMap).forEach(s => s.badges.sort((a, b) => (a.series_order || 0) - (b.series_order || 0)));
    return Object.values(seriesMap);
  })();

  useEffect(() => {
    if (badge) {
      setFormData({ ...DEFAULT_FORM, ...badge });
    } else {
      setFormData(DEFAULT_FORM);
    }
  }, [badge, open]);

  // Load tasks and task groups
  useEffect(() => {
    if (!open || !orgId) return;
    
    const loadData = async () => {
      setLoadingData(true);
      const [tasks, groups] = await Promise.all([
        TaskRepo.filter({ organization_id: orgId }),
        TaskGroupRepo.filter({ organization_id: orgId, status: "active" })
      ]);
      
      // Unique areas
      setTaskAreas([...new Set(tasks.map(t => t.area).filter(Boolean))].sort());

      // Unique frequencies
      setTaskFrequencies([...new Set(tasks.map(t => t.frequency).filter(Boolean))].sort());

      // Task counts per category
      const counts = {};
      for (const task of tasks) {
        const cat = task.category || "MSS";
        counts[cat] = (counts[cat] || 0) + 1;
      }
      setCategoryCounts(counts);

      // Enrich task groups with task count
      const enrichedGroups = groups.map(g => ({
        ...g,
        taskCount: (g.task_ids || []).length
      }));
      setTaskGroups(enrichedGroups);
      
      setLoadingData(false);
    };
    loadData();
  }, [open, orgId]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await uploadFile(file);
      setFormData(prev => ({ ...prev, photo_url: file_url }));
      toast.success("Photo uploaded");
    } catch (error) {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim() || !formData.photo_url) {
      toast.error("Please fill in all required fields including badge photo");
      return;
    }
    if (formData.badge_type === "category_completion" && !formData.category) {
      toast.error("Please select a task category");
      return;
    }
    if (formData.badge_type === "task_group_completion" && !formData.task_group_id) {
      toast.error("Please select a task group");
      return;
    }

    // For "all" counting, set threshold to the group's task count
    const submitData = { ...formData };
    if (submitData.counting_method === "all" && submitData.badge_type === "task_group_completion") {
      const group = taskGroups.find(g => g.id === submitData.task_group_id);
      if (group) submitData.threshold = group.taskCount;
    }

    // Resolve new series name
    if (submitData.series_id?.startsWith("__new__")) {
      const seriesName = submitData.series_id.replace("__new__", "").trim();
      if (!seriesName) {
        toast.error("Please enter a series name");
        return;
      }
      submitData.series_id = seriesName;
    }

    onSave(submitData);
  };

  const selectedGroup = taskGroups.find(g => g.id === formData.task_group_id);
  const showCountingMethod = formData.badge_type === "task_group_completion" || formData.badge_type === "category_completion";
  const isAllMode = formData.counting_method === "all";

  // Get all unique categories from actual tasks (includes custom ones)
  const allCategories = Object.keys(categoryCounts).sort();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{badge ? "Edit Badge" : "Create Badge"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <Label htmlFor="name">Badge Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Trash Can Master"
              className="mt-2"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Complete all 100 trash cans at least once"
              className="mt-2 min-h-20"
            />
          </div>

          {/* Badge Type */}
          <div>
            <Label>Badge Type *</Label>
            <Select
              value={formData.badge_type}
              onValueChange={(value) => setFormData({ 
                ...formData, 
                badge_type: value, 
                category: "", 
                task_group_id: "", 
                task_group_name: "",
                frequency_filter: "", 
                task_area_filter: "",
                counting_method: "total",
                threshold: value === "top_performer" ? 1 : 5,
                top_performer_period: "monthly"
              })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BADGE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              {BADGE_TYPES.find(t => t.value === formData.badge_type)?.description}
            </p>
          </div>

          {/* Task Group Selector */}
          {formData.badge_type === "task_group_completion" && (
            <div>
              <Label>Task Group *</Label>
              {loadingData ? (
                <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading task groups...
                </div>
              ) : taskGroups.length === 0 ? (
                <p className="text-sm text-slate-500 mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  No task groups found. Create task groups first in the task management section to group related tasks together.
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-1 gap-2">
                  {taskGroups.map(group => {
                    const isSelected = formData.task_group_id === group.id;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, task_group_id: group.id, task_group_name: group.name })}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                          isSelected 
                            ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900" 
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: group.color || "#3b82f6" }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">{group.name}</span>
                            <Badge variant="secondary" className="text-xs">{group.taskCount} tasks</Badge>
                          </div>
                          {group.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{group.description}</p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Task Category Selector */}
          {formData.badge_type === "category_completion" && (
            <div>
              <Label>Task Category *</Label>
              {loadingData ? (
                <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading categories...
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-1 gap-2">
                  {allCategories.map(catId => {
                    const builtIn = TASK_CATEGORIES[catId];
                    const count = categoryCounts[catId] || 0;
                    const isSelected = formData.category === catId;
                    const label = builtIn?.label || catId;
                    const desc = builtIn?.description || "";
                    const badgeColor = builtIn?.badgeColor?.split(" ")[0] || "bg-slate-100";
                    return (
                      <button
                        key={catId}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: catId })}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                          isSelected 
                            ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900" 
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${badgeColor}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">{label}</span>
                            <Badge variant="secondary" className="text-xs">{count} tasks</Badge>
                          </div>
                          {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Top Performer Rank Selector */}
          {formData.badge_type === "top_performer" && (
            <>
              <div>
                <Label>Rank Position *</Label>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  {TOP_PERFORMER_RANKS.map(rank => {
                    const isSelected = formData.threshold === rank.value;
                    return (
                      <button
                        key={rank.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, threshold: rank.value })}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                          isSelected 
                            ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900" 
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-slate-900">{rank.label}</span>
                          <p className="text-xs text-slate-500">{rank.description}</p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Time Period *</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {TOP_PERFORMER_PERIODS.map(period => {
                    const isSelected = formData.top_performer_period === period.value;
                    return (
                      <button
                        key={period.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, top_performer_period: period.value })}
                        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all text-center ${
                          isSelected 
                            ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900" 
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <span className="text-sm font-medium text-slate-900">{period.label}</span>
                        <p className="text-xs text-slate-500">{period.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Counting Method */}
          {showCountingMethod && (
            <div>
              <Label>Counting Method *</Label>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {COUNTING_METHODS.map(method => {
                  const isSelected = formData.counting_method === method.value;
                  const Icon = method.icon;
                  // Hide "all" option if we don't know the group size yet (category mode)
                  if (method.value === "all" && formData.badge_type === "category_completion") return null;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, counting_method: method.value })}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                        isSelected 
                          ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900" 
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isSelected ? "text-slate-900" : "text-slate-400"}`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-slate-900">{method.label}</span>
                        <p className="text-xs text-slate-500">{method.description}</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {isAllMode && selectedGroup && (
                <p className="text-xs text-emerald-600 mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                  Employee must complete all {selectedGroup.taskCount} tasks in "{selectedGroup.name}" at least once.
                </p>
              )}
            </div>
          )}

          {/* Threshold (hidden for "all" mode and top_performer) */}
          {!isAllMode && formData.badge_type !== "top_performer" && (
            <div>
              <Label htmlFor="threshold">
                {formData.badge_type === "streak" ? "Days in Streak" : 
                 formData.counting_method === "unique" ? "Unique Tasks Required" : "Completions Required"} *
              </Label>
              <Input
                id="threshold"
                type="number"
                min="1"
                value={formData.threshold}
                onChange={(e) => setFormData({ ...formData, threshold: parseInt(e.target.value) || 1 })}
                className="mt-2"
              />
              {formData.badge_type === "task_group_completion" && selectedGroup && (
                <p className="text-xs text-slate-500 mt-1">
                  This group has {selectedGroup.taskCount} tasks. 
                  {formData.counting_method === "unique" 
                    ? ` Employee must complete ${formData.threshold} different tasks.`
                    : ` Employee must complete ${formData.threshold} total (repeats count).`
                  }
                </p>
              )}
            </div>
          )}

          {/* Optional Frequency Filter */}
          {(formData.badge_type === "category_completion" || formData.badge_type === "total_tasks") && taskFrequencies.length > 0 && (
            <div>
              <Label>Frequency Filter (optional)</Label>
              <Select
                value={formData.frequency_filter || "all"}
                onValueChange={(value) => setFormData({ ...formData, frequency_filter: value === "all" ? "" : value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="All frequencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Frequencies</SelectItem>
                  {taskFrequencies.map(freq => (
                    <SelectItem key={freq} value={freq}>
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Optional Area Filter */}
          {(formData.badge_type === "category_completion" || formData.badge_type === "total_tasks") && taskAreas.length > 0 && (
            <div>
              <Label>Area Filter (optional)</Label>
              <Select
                value={formData.task_area_filter || "all"}
                onValueChange={(value) => setFormData({ ...formData, task_area_filter: value === "all" ? "" : value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="All areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {taskAreas.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Series Assignment */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
            <Label className="flex items-center gap-2 mb-1">
              <Link2 className="w-4 h-4" />
              Badge Series (optional)
            </Label>
            <p className="text-xs text-slate-500 mb-3">
              Group badges into a series that are earned one at a time in order (e.g., Bronze → Silver → Gold). Only the highest earned badge + progress to the next is shown.
            </p>

            <div className="space-y-2">
              {/* No series option */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, series_id: "", series_order: 0 })}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg border-2 transition-all text-left text-sm ${
                  !formData.series_id
                    ? "border-slate-900 bg-white ring-1 ring-slate-900"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <span className="text-slate-700">No series (standalone badge)</span>
              </button>

              {/* Existing series */}
              {existingSeries.map(series => {
                const isSelected = formData.series_id === series.id;
                const seriesBadges = series.badges.filter(b => b.id !== badge?.id);
                const seriesName = seriesBadges[0]?.series_id || "Series";
                const nextOrder = Math.max(...series.badges.map(b => b.series_order || 0)) + 1;
                return (
                  <button
                    key={series.id}
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      series_id: series.id,
                      series_order: badge?.series_id === series.id ? (badge.series_order || nextOrder) : nextOrder
                    })}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? "border-slate-900 bg-white ring-1 ring-slate-900"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex -space-x-2 flex-shrink-0">
                      {series.badges.slice(0, 4).map(b => (
                        <ProxiedImage key={b.id} src={b.photo_url} alt="" className="w-7 h-7 rounded-full border-2 border-white object-cover" />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-900">{series.id}</span>
                      <p className="text-xs text-slate-500 truncate">
                        {series.badges.map(b => b.name).join(" → ")}
                      </p>
                    </div>
                  </button>
                );
              })}

              {/* Create new series */}
              {!formData.series_id?.startsWith("__new__") ? (
                <button
                  type="button"
                  onClick={() => {
                    setNewSeriesName("");
                    setFormData({ ...formData, series_id: "__new__", series_order: 1 });
                  }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-lg border-2 border-dashed border-slate-300 hover:border-slate-400 text-left text-sm text-slate-600 hover:text-slate-800 transition-colors"
                >
                  <span>+ Create new series</span>
                </button>
              ) : (
                <div className="p-3 rounded-lg border-2 border-slate-900 bg-white ring-1 ring-slate-900">
                  <Label className="text-xs">Series Name</Label>
                  <Input
                    value={newSeriesName}
                    onChange={(e) => {
                      setNewSeriesName(e.target.value);
                      setFormData({ ...formData, series_id: "__new__" + e.target.value, series_order: 1 });
                    }}
                    placeholder="e.g., Task Master Series"
                    className="mt-1 h-8 text-sm"
                    autoFocus
                  />
                  <p className="text-xs text-slate-500 mt-1">This badge will be #1 in the new series.</p>
                </div>
              )}
            </div>

            {/* Series order (if part of a series) */}
            {formData.series_id && !formData.series_id.startsWith("__new__") && (
              <div className="mt-3">
                <Label className="text-xs">Position in Series</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.series_order}
                  onChange={(e) => setFormData({ ...formData, series_order: parseInt(e.target.value) || 1 })}
                  className="mt-1 h-8 text-sm w-24"
                />
                <p className="text-xs text-slate-500 mt-1">Lower numbers are earned first.</p>
              </div>
            )}
          </div>

          {/* Photo Upload */}
          <div>
            <Label>Badge Photo *</Label>
            <div className="mt-2 flex items-center gap-3">
              {formData.photo_url && (
                <ProxiedImage src={formData.photo_url} alt="Badge" className="w-24 h-24 rounded object-cover" />
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                  disabled={uploadingPhoto}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("photo-upload").click()}
                  disabled={uploadingPhoto}
                  className="cursor-pointer"
                >
                  {uploadingPhoto ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Upload Photo</>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {badge ? "Update Badge" : "Create Badge"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}