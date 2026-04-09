import { AnimatePresence, motion } from "framer-motion";
import TaskCard from "@/components/dashboard/TaskCard";
import { ChevronDown, Sun, Calendar, Clock, BarChart3, Zap, Target, AlertCircle, CheckSquare, Square, Edit, SprayCan, Building2, Wrench, Bath, Flame, ClipboardList } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { classifyTask, getCategoryConfig, getAllCategories, getAllCategoryOrder } from "./taskCategoryClassifier";
import FrequencyTotalsSummary from "./FrequencyTotalsSummary";

const CATEGORY_ICONS = {
  SprayCan, Building2, Wrench, Bath, Flame, ClipboardList
};

const frequencyConfig = {
  Daily: { color: "bg-blue-50", textColor: "text-blue-900", borderColor: "border-blue-200", badgeColor: "bg-blue-100 text-blue-800", icon: Sun },
  Weekly: { color: "bg-emerald-50", textColor: "text-emerald-900", borderColor: "border-emerald-200", badgeColor: "bg-emerald-100 text-emerald-800", icon: Calendar },
  "Bi-weekly": { color: "bg-purple-50", textColor: "text-purple-900", borderColor: "border-purple-200", badgeColor: "bg-purple-100 text-purple-800", icon: BarChart3 },
  Bimonthly: { color: "bg-teal-50", textColor: "text-teal-900", borderColor: "border-teal-200", badgeColor: "bg-teal-100 text-teal-800", icon: Calendar },
  Monthly: { color: "bg-amber-50", textColor: "text-amber-900", borderColor: "border-amber-200", badgeColor: "bg-amber-100 text-amber-800", icon: Clock },
  Quarterly: { color: "bg-rose-50", textColor: "text-rose-900", borderColor: "border-rose-200", badgeColor: "bg-rose-100 text-rose-800", icon: Target },
  Annually: { color: "bg-indigo-50", textColor: "text-indigo-900", borderColor: "border-indigo-200", badgeColor: "bg-indigo-100 text-indigo-800", icon: Zap },
  Other: { color: "bg-slate-50", textColor: "text-slate-900", borderColor: "border-slate-200", badgeColor: "bg-slate-100 text-slate-800", icon: AlertCircle }
};

const normalizeFreqLabel = (f) => {
  if (!f) return "Other";
  const lower = f.toLowerCase().trim().replace(/[-_\s]+/g, "");
  if (lower === "daily") return "Daily";
  if (lower === "weekly") return "Weekly";
  if (lower === "biweekly") return "Bi-weekly";
  if (lower === "monthly") return "Monthly";
  if (lower === "bimonthly") return "Bimonthly";
  if (lower === "quarterly") return "Quarterly";
  if (lower === "annually" || lower === "annual") return "Annually";
  return f;
};

const frequencyOrder = ["Daily", "Weekly", "Bi-weekly", "Monthly", "Bimonthly", "Quarterly", "Annually", "Other"];

export default function TasksByFrequency({ tasks, onViewTask, onDeleteTask, hideStatus = false, onBulkEdit, expectedTargets = null, customCategories = [] }) {
  const [expandedFrequencies, setExpandedFrequencies] = useState({});
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());

  // Filter out group header tasks
  const workTasks = tasks.filter(t => !t.is_group);

  // Deduplicate recurring tasks
  const deduplicatedTasks = (() => {
    const taskMap = new Map();
    workTasks.forEach(task => {
      const key = `${(task.title || '').toLowerCase().trim()}|${(task.frequency || '').toLowerCase().trim()}|${(task.area || '').toLowerCase().trim()}`;
      const isPending = task.status === 'pending' || task.status === 'in_progress';
      const isChildTask = !!task.parent_task_id;
      if (!taskMap.has(key)) {
        taskMap.set(key, task);
      } else {
        const existing = taskMap.get(key);
        const existingIsPending = existing.status === 'pending' || existing.status === 'in_progress';
        const existingIsChild = !!existing.parent_task_id;
        if (isPending && !existingIsPending) {
          taskMap.set(key, task);
        } else if (!isPending && existingIsPending) {
          // keep existing
        } else if (!isChildTask && existingIsChild) {
          taskMap.set(key, task);
        }
      }
    });
    return Array.from(taskMap.values());
  })();

  // Merge built-in + custom categories
  const allCategories = getAllCategories(customCategories);
  const allCategoryOrder = getAllCategoryOrder(customCategories);

  // Resolve category for each task (use saved or auto-classify)
  const getTaskCategory = (task) => {
    if (task.category && allCategories[task.category]) return task.category;
    // Legacy/free-text categories — try to map them
    if (task.category) {
      const lower = task.category.toLowerCase();
      if (lower.includes("routine") || lower.includes("mss") || lower.includes("daily")) return "MSS";
      if (lower.includes("infra") || lower.includes("pic") || lower.includes("periodic inf")) return "PIC";
      if (lower.includes("equipment") || lower.includes("pec") || lower.includes("deep")) return "PEC";
      if (lower.includes("ameniti") || lower.includes("restroom") || lower.includes("break room") || lower.includes("breakroom")) return "AMENITIES";
      if (lower.includes("fire")) return "FIRE";
      if (lower.includes("one-off") || lower.includes("one off") || lower.includes("corrective") || lower.includes("temp")) return "ONE_OFF";
      // Check if it matches a custom category id
      if (allCategories[task.category]) return task.category;
    }
    return classifyTask(task);
  };

  // Group tasks: category → frequency → area → tasks
  const groupedByCategory = {};
  deduplicatedTasks.forEach(task => {
    const catId = getTaskCategory(task);
    if (!groupedByCategory[catId]) groupedByCategory[catId] = [];
    groupedByCategory[catId].push(task);
  });

  // Sort categories by defined order, then any custom ones at the end
  const sortedCategoryIds = [
    ...allCategoryOrder.filter(id => groupedByCategory[id]),
    ...Object.keys(groupedByCategory).filter(id => !allCategoryOrder.includes(id))
  ];

  const toggleFrequency = (key) => setExpandedFrequencies(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleTaskSelection = (taskId) => setSelectedTaskIds(prev => { const s = new Set(prev); s.has(taskId) ? s.delete(taskId) : s.add(taskId); return s; });

  const selectAllInCategory = (catId) => {
    const catTasks = groupedByCategory[catId] || [];
    const allSelected = catTasks.every(t => selectedTaskIds.has(t.id));
    setSelectedTaskIds(prev => {
      const s = new Set(prev);
      catTasks.forEach(t => allSelected ? s.delete(t.id) : s.add(t.id));
      return s;
    });
  };

  const clearSelection = () => { setSelectedTaskIds(new Set()); setSelectionMode(false); };

  const handleBulkEdit = () => {
    const selected = deduplicatedTasks.filter(t => selectedTaskIds.has(t.id));
    if (onBulkEdit && selected.length > 0) onBulkEdit(selected);
  };

  if (deduplicatedTasks.length === 0) {
    return <p className="text-slate-500 py-8 text-center">No tasks found</p>;
  }

  return (
    <div className="space-y-4">
      {/* Selection Mode Controls */}
      {onBulkEdit && (
        <div className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant={selectionMode ? "default" : "outline"}
              size="sm"
              onClick={() => selectionMode ? clearSelection() : setSelectionMode(true)}
              className={selectionMode ? "bg-slate-900" : ""}
            >
              {selectionMode ? <CheckSquare className="w-4 h-4 mr-2" /> : <Square className="w-4 h-4 mr-2" />}
              {selectionMode ? "Cancel Selection" : "Select Tasks"}
            </Button>
            {selectionMode && selectedTaskIds.size > 0 && (
              <span className="text-sm text-slate-600">{selectedTaskIds.size} selected</span>
            )}
          </div>
          {selectionMode && selectedTaskIds.size > 0 && (
            <Button onClick={handleBulkEdit} className="bg-blue-600 hover:bg-blue-700">
              <Edit className="w-4 h-4 mr-2" /> Edit Selected
            </Button>
          )}
        </div>
      )}

      {/* Category Tabs */}
      <CategoryTabs
        sortedCategoryIds={sortedCategoryIds}
        groupedByCategory={groupedByCategory}
        expandedFrequencies={expandedFrequencies}
        toggleFrequency={toggleFrequency}
        selectionMode={selectionMode}
        selectedTaskIds={selectedTaskIds}
        selectAllInCategory={selectAllInCategory}
        toggleTaskSelection={toggleTaskSelection}
        onViewTask={onViewTask}
        onDeleteTask={onDeleteTask}
        hideStatus={hideStatus}
        expectedTargets={expectedTargets}
        customCategories={customCategories}
      />

      {/* Frequency Totals Summary */}
      <FrequencyTotalsSummary
        deduplicatedTasks={deduplicatedTasks}
        customCategories={customCategories}
      />
    </div>
  );
}

function CategoryTabs({
  sortedCategoryIds, groupedByCategory, expandedFrequencies, toggleFrequency,
  selectionMode, selectedTaskIds, selectAllInCategory, toggleTaskSelection,
  onViewTask, onDeleteTask, hideStatus, expectedTargets, customCategories = []
}) {
  const [activeTab, setActiveTab] = useState(sortedCategoryIds[0] || "MSS");

  return (
    <div className="space-y-4">
      {/* Pill tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {sortedCategoryIds.map(catId => {
          const catConfig = getCategoryConfig(catId, customCategories);
          const catTasks = groupedByCategory[catId];
          const isActive = activeTab === catId;
          return (
            <button
              key={catId}
              onClick={() => setActiveTab(catId)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
                isActive
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {(() => {
                const CatIcon = catConfig.iconName ? CATEGORY_ICONS[catConfig.iconName] : null;
                return CatIcon ? <CatIcon className="w-4 h-4" /> : null;
              })()}
              {catConfig.shortLabel}
              <span className={cn(
                "text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[22px] text-center",
                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              )}>
                {catTasks.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      {sortedCategoryIds.filter(id => id === activeTab).map(catId => {
        const catConfig = getCategoryConfig(catId, customCategories);
        const catTasks = groupedByCategory[catId];
        const allCatSelected = catTasks.every(t => selectedTaskIds.has(t.id));

        const freqGroups = {};
        catTasks.forEach(task => {
          const freq = normalizeFreqLabel(task.frequency);
          if (!freqGroups[freq]) freqGroups[freq] = [];
          freqGroups[freq].push(task);
        });
        const sortedFreqs = Object.keys(freqGroups).sort((a, b) => {
          const ai = frequencyOrder.indexOf(a);
          const bi = frequencyOrder.indexOf(b);
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        });

        return (
          <motion.div
            key={catId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            {/* Subtle category description */}
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">{catConfig.description}</p>
              {selectionMode && (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-slate-500">Select all</span>
                  <Checkbox checked={allCatSelected} onCheckedChange={() => selectAllInCategory(catId)} />
                </div>
              )}
            </div>

            {/* Frequency rows */}
            {sortedFreqs.map(freq => {
              const fConfig = frequencyConfig[freq] || frequencyConfig.Other;
              const Icon = fConfig.icon;
              const freqTasks = freqGroups[freq];
              const freqKey = `${catId}_${freq}`;
              const isFreqExpanded = expandedFrequencies[freqKey];

              const tasksByArea = {};
              freqTasks.forEach(t => {
                const area = t.area || "Other";
                if (!tasksByArea[area]) tasksByArea[area] = [];
                tasksByArea[area].push(t);
              });
              const sortedAreas = Object.keys(tasksByArea).sort();

              return (
                <div key={freqKey} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleFrequency(freqKey)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", fConfig.badgeColor)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm text-slate-900">{freq}</span>
                      <span className="text-xs text-slate-400 ml-2">
                        {freqTasks.length} task{freqTasks.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-slate-400 transition-transform duration-200",
                      isFreqExpanded && "rotate-180"
                    )} />
                  </button>

                  <AnimatePresence>
                    {isFreqExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-100"
                      >
                        <div className="p-3 space-y-4">
                          {sortedAreas.map(area => (
                            <div key={area} className="space-y-2">
                              <div className="flex items-center gap-2 px-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                <h4 className="font-medium text-slate-500 text-xs">{area}</h4>
                                <span className="text-[10px] text-slate-400">{tasksByArea[area].length}</span>
                              </div>
                              <div className="space-y-2">
                                {tasksByArea[area].map(task => (
                                  <div key={task.id} className="flex items-start gap-2">
                                    {selectionMode && (
                                      <div className="pt-4">
                                        <Checkbox checked={selectedTaskIds.has(task.id)} onCheckedChange={() => toggleTaskSelection(task.id)} />
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <TaskCard task={task} onView={onViewTask} onDelete={onDeleteTask} hideStatus={hideStatus} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        );
      })}
    </div>
  );
}