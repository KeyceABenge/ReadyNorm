import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, ChevronDown, ChevronRight, Folder, FlaskConical, GraduationCap, User, Droplets, Droplet } from "lucide-react";
import { cn } from "@/lib/utils";
import TrainingRequiredModal from "./TrainingRequiredModal";
import TaskRecommendationAgent from "@/components/recommendations/TaskRecommendationAgent";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, subDays } from "date-fns";
import { useTranslation, getTranslation, SUPPORTED_LANGUAGES } from "@/components/i18n";
import { invokeLLM } from "@/lib/adapters/integrations";

// Normalize frequency keys to a canonical form for matching
// Handles variations: "bi-weekly"/"biweekly"/"Bi-Weekly", "bi-monthly"/"bimonthly", etc.
function normalizeFreqKey(f) {
  if (!f) return "";
  return f.toLowerCase().trim().replace(/[-_\s]+/g, "");
}

// Build a normalized quotas lookup: { normalizedKey: value }
function buildNormalizedQuotas(quotas) {
  if (!quotas) return {};
  const result = {};
  Object.entries(quotas).forEach(([key, val]) => {
    const nk = normalizeFreqKey(key);
    if (nk && nk !== "daily") {
      result[nk] = Math.max(result[nk] || 0, Number(val) || 0);
    }
  });
  return result;
}

export default function TaskSelectionModal({ 
  open, 
  tasks, 
  taskGroups, 
  titrationAreas = [], 
  quotas, 
  onConfirm, 
  isLoading,
  employeeTrainings = [], // Array of completed trainings for this employee
  employee = null, // Employee object for recommendations
  taskHistory = [], // Historical tasks for the employee
  recommendationConfig = {}, // Manager configuration for recommendations
  recentTitrationRecords = [], // Recent titration records to check completion
  todaySessions = [], // Today's employee sessions to check task group claims
  diverterSettings = null, // Rain diverter task settings
  recentDiverterInspections = [], // Recent diverter inspections to check completion
  inventorySettings = null, // Chemical inventory settings
  currentInventoryRecord = null, // Current week's inventory record
  drainLocations = [], // Available drain locations
  recentDrainCleanings = [], // Recent drain cleaning records
  drainCleaningSettings = null, // Drain cleaning training settings
  titrationSettings = null, // Titration training settings
  employeeLanguage = null // Employee's preferred language
}) {
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedTitrations, setSelectedTitrations] = useState([]);
  const [selectedDiverterTask, setSelectedDiverterTask] = useState(false);
  const [selectedInventoryTask, setSelectedInventoryTask] = useState(false);
  const [selectedDrains, setSelectedDrains] = useState([]);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [tasksWithMissingTraining, setTasksWithMissingTraining] = useState([]);
  
  // Build normalized quotas (removes daily, normalizes keys like "bi-weekly" → "biweekly")
  const normalizedQuotas = buildNormalizedQuotas(quotas);

  // Check which task groups have already been claimed by other employees today
  const claimedTaskGroupIds = useMemo(() => {
    const claimed = new Set();
    todaySessions.forEach(session => {
      // Skip the current employee's session
      if (session.employee_email === employee?.email) return;
      
      // Check if the session has selected tasks that belong to any group
      const sessionSelectedTasks = session.selected_tasks || [];
      taskGroups.forEach(group => {
        const groupTaskIds = group.task_ids || [];
        // If any task from this group is in the session's selected tasks, mark as claimed
        const hasClaimedTask = groupTaskIds.some(taskId => sessionSelectedTasks.includes(taskId));
        if (hasClaimedTask) {
          claimed.add(group.id);
        }
      });
    });
    return claimed;
  }, [todaySessions, taskGroups, employee?.email]);

  // Check which titrations have been completed this week (based on their frequency)
  const completedTitrationAreaIds = useMemo(() => {
    const completed = new Set();
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    
    titrationAreas.forEach(area => {
      // Check if there's a recent record for this area within its frequency period
      const areaRecords = recentTitrationRecords.filter(r => r.titration_area_id === area.id);
      
      if (areaRecords.length > 0) {
        const freq = (area.frequency || "daily").toLowerCase();
        
        // Check based on frequency
        areaRecords.forEach(record => {
          if (!record.completed_at) return;
          const recordDate = parseISO(record.completed_at);
          
          if (freq === "daily") {
            // Check if completed today
            const today = new Date();
            if (recordDate.toDateString() === today.toDateString()) {
              completed.add(area.id);
            }
          } else if (freq === "weekly") {
            // Check if completed this week
            if (isWithinInterval(recordDate, { start: weekStart, end: weekEnd })) {
              completed.add(area.id);
            }
          } else if (freq === "bi-weekly" || freq === "biweekly") {
            // Check if completed in last 2 weeks
            const twoWeeksAgo = new Date(now);
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            if (recordDate >= twoWeeksAgo) {
              completed.add(area.id);
            }
          } else if (freq === "monthly") {
            // Check if completed this month
            if (recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear()) {
              completed.add(area.id);
            }
          }
        });
      }
    });
    
    return completed;
  }, [recentTitrationRecords, titrationAreas]);

  // Filter out already completed titrations from display
  const availableTitrationAreas = useMemo(() => {
    return titrationAreas.filter(area => !completedTitrationAreaIds.has(area.id));
  }, [titrationAreas, completedTitrationAreaIds]);

  // Check if diverter task is due based on frequency settings
  const diverterTaskDue = useMemo(() => {
    if (!diverterSettings?.is_enabled) return false;
    
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const dayOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][now.getDay()];
    const freq = (diverterSettings.frequency || "weekly").toLowerCase();
    
    // Check if task runs today based on days_of_week for daily frequency
    if (freq === "daily") {
      const allowedDays = diverterSettings.days_of_week || ["monday", "tuesday", "wednesday", "thursday", "friday"];
      if (!allowedDays.includes(dayOfWeek)) return false;
    }
    
    // Check if already completed this period
    if (recentDiverterInspections.length > 0) {
      const weekStart = startOfWeek(now, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      
      const hasRecentCompletion = recentDiverterInspections.some(inspection => {
        // Check inspection_date first, fall back to created_date
        const dateStr = inspection.inspection_date || inspection.created_date;
        if (!dateStr) return false;
        
        // Use date string comparison for "daily" to avoid timezone issues
        const inspDateStr = typeof dateStr === 'string' ? dateStr.split('T')[0] : '';
        
        if (freq === "daily") {
          return inspDateStr === today;
        }
        
        // For longer periods, parse the date
        const inspDate = parseISO(dateStr);
        if (isNaN(inspDate.getTime())) return false;
        
        if (freq === "weekly") {
          return isWithinInterval(inspDate, { start: weekStart, end: weekEnd });
        } else if (freq === "bi-weekly") {
          const twoWeeksAgo = subDays(now, 14);
          return inspDate >= twoWeeksAgo;
        } else if (freq === "monthly") {
          return isWithinInterval(inspDate, { start: monthStart, end: monthEnd });
        }
        return false;
      });
      
      if (hasRecentCompletion) return false;
    }
    
    return true;
  }, [diverterSettings, recentDiverterInspections]);

  // Check if inventory task is due based on frequency settings
  const inventoryTaskDue = useMemo(() => {
    if (!inventorySettings?.is_enabled) return false;
    
    // Check if the most recent inventory record covers the CURRENT week and is completed
    if (currentInventoryRecord) {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const weekStart = currentInventoryRecord.week_start_date;
      const weekEnd = currentInventoryRecord.week_end_date;
      
      // Only consider this record "done" if today falls within its week range
      const isCurrentWeek = weekStart && weekEnd && todayStr >= weekStart && todayStr <= weekEnd;
      
      if (isCurrentWeek && (
        currentInventoryRecord.status === "completed" || 
        currentInventoryRecord.status === "reviewed" || 
        currentInventoryRecord.status === "closed"
      )) {
        return false;
      }
    }
    
    // Always show as available if enabled and not completed for this week
    return true;
  }, [inventorySettings, currentInventoryRecord]);

  // Get drains available for cleaning (all active, non-sealed drains)
  const drainsDueForCleaning = useMemo(() => {
    if (!drainLocations || drainLocations.length === 0) return [];
    return drainLocations.filter(drain => {
      const drainData = drain.data || drain;
      if (drainData.status && drainData.status !== "active") return false;
      if (drainData.is_sealed === true) return false;
      return true;
    });
  }, [drainLocations]);

  // Organize tasks by parent/subtask relationship
  // Support both: tasks with is_group=true as headers, and tasks with parent_task_id as subtasks
  const subtasksByParent = {};
  tasks.forEach(task => {
    if (task.parent_task_id) {
      if (!subtasksByParent[task.parent_task_id]) {
        subtasksByParent[task.parent_task_id] = [];
      }
      subtasksByParent[task.parent_task_id].push(task);
    }
  });

  // Parent tasks are either is_group=true OR have subtasks linked to them
  const parentTasks = tasks.filter(t => !t.parent_task_id);

  const toggleGroup = (groupId) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

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

  // Calculate tasks from selected groups
  const tasksFromGroups = selectedGroups.flatMap(groupId => {
    const group = taskGroups?.find(g => g.id === groupId);
    return group?.task_ids || [];
  });

  // Group ALL tasks by NORMALIZED frequency (not just quota frequencies)
  const tasksByFrequency = {};
  const selectedByFrequency = {};
  
  // Collect all unique normalized frequencies from tasks
  const allNormFreqs = [...new Set(tasks.map(t => normalizeFreqKey(t.frequency)).filter(f => f && f !== "daily"))];
  
  // Also include normalized quota frequencies
  Object.keys(normalizedQuotas).forEach(nf => {
    if (!allNormFreqs.includes(nf)) allNormFreqs.push(nf);
  });

  allNormFreqs.forEach(nf => {
    tasksByFrequency[nf] = tasks.filter(t => normalizeFreqKey(t.frequency) === nf);
    selectedByFrequency[nf] = selectedTasks.filter(id => 
      tasksByFrequency[nf].some(t => t.id === id)
    ).length;
  });
  
  // Sort frequencies for display
  const frequencyOrder = ["weekly", "biweekly", "monthly", "bimonthly", "quarterly", "annually"];
  const sortedFrequencies = Object.keys(tasksByFrequency).filter(f => tasksByFrequency[f].length > 0).sort((a, b) => {
    const aIndex = frequencyOrder.indexOf(a);
    const bIndex = frequencyOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Check if all quotas are met OR if there aren't enough tasks available
  const canProceed = Object.keys(normalizedQuotas).every(nf => {
    const available = (tasksByFrequency[nf] || []).length;
    const required = normalizedQuotas[nf];
    const selected = selectedByFrequency[nf] || 0;
    return selected >= required || selected >= available;
  });

  const handleToggle = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  // Check which tasks have missing training
  const checkTrainingGaps = () => {
    const completedTrainingIds = employeeTrainings.map(t => t.document_id);
    const gaps = [];
    
    // Check individually selected tasks
    selectedTasks.forEach(taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (task?.required_training_id && !completedTrainingIds.includes(task.required_training_id)) {
        gaps.push({
          taskId: task.id,
          taskTitle: task.title,
          trainingId: task.required_training_id,
          trainingTitle: task.required_training_title
        });
      }
    });
    
    // Check tasks from selected groups
    selectedGroups.forEach(groupId => {
      const group = taskGroups?.find(g => g.id === groupId);
      (group?.task_ids || []).forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (task?.required_training_id && !completedTrainingIds.includes(task.required_training_id)) {
          if (!gaps.find(g => g.taskId === task.id)) {
            gaps.push({
              taskId: task.id,
              taskTitle: task.title,
              trainingId: task.required_training_id,
              trainingTitle: task.required_training_title
            });
          }
        }
      });
    });

    // Check rain diverter task training
    if (selectedDiverterTask && diverterSettings?.required_training_id) {
      if (!completedTrainingIds.includes(diverterSettings.required_training_id)) {
        gaps.push({
          taskId: "diverter-task",
          taskTitle: diverterSettings.task_title || "Rain Diverter Bucket Check",
          trainingId: diverterSettings.required_training_id,
          trainingTitle: diverterSettings.required_training_title
        });
      }
    }

    // Check chemical inventory task training
    if (selectedInventoryTask && inventorySettings?.required_training_id) {
      if (!completedTrainingIds.includes(inventorySettings.required_training_id)) {
        gaps.push({
          taskId: "inventory-task",
          taskTitle: inventorySettings.task_title || "Chemical Inventory Count",
          trainingId: inventorySettings.required_training_id,
          trainingTitle: inventorySettings.required_training_title
        });
      }
    }

    // Check drain cleaning task training
    if (selectedDrains.length > 0 && drainCleaningSettings?.required_training_id) {
      if (!completedTrainingIds.includes(drainCleaningSettings.required_training_id)) {
        gaps.push({
          taskId: "drain-cleaning-task",
          taskTitle: drainCleaningSettings.task_title || "Drain Cleaning",
          trainingId: drainCleaningSettings.required_training_id,
          trainingTitle: drainCleaningSettings.required_training_title
        });
      }
    }

    // Check titration task training
    if (selectedTitrations.length > 0 && titrationSettings?.required_training_id) {
      if (!completedTrainingIds.includes(titrationSettings.required_training_id)) {
        gaps.push({
          taskId: "titration-task",
          taskTitle: titrationSettings.task_title || "Chemical Titrations",
          trainingId: titrationSettings.required_training_id,
          trainingTitle: titrationSettings.required_training_title
        });
      }
    }
    
    return gaps;
  };

  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    console.log("=== CONFIRM BUTTON CLICKED ===", { confirming, isLoading });
    if (confirming || isLoading) {
      console.log("Already confirming or loading, skipping");
      return;
    }
    setConfirming(true);
    try {
      const gaps = checkTrainingGaps();
      console.log("Training gaps:", gaps.length);
      if (gaps.length > 0) {
        setTasksWithMissingTraining(gaps);
        setShowTrainingModal(true);
        return;
      }
      await proceedWithConfirm();
    } catch (err) {
      console.error("handleConfirm error:", err);
    } finally {
      setConfirming(false);
    }
  };
  
  const proceedWithConfirm = async () => {
    const groupTaskIds = selectedGroups.flatMap(groupId => {
      const group = taskGroups?.find(g => g.id === groupId);
      return group?.task_ids || [];
    });
    const allTaskIds = [...new Set([...groupTaskIds, ...selectedTasks])];
    console.log("proceedWithConfirm - calling onConfirm with", allTaskIds.length, "tasks");
    await onConfirm(allTaskIds, selectedTitrations, tasksWithMissingTraining, selectedDiverterTask, selectedInventoryTask, selectedDrains);
    setShowTrainingModal(false);
  };

  const handleSkip = () => {
    onConfirm([], []);
  };

  const toggleTitration = (titrationId) => {
    setSelectedTitrations(prev => 
      prev.includes(titrationId) 
        ? prev.filter(id => id !== titrationId)
        : [...prev, titrationId]
    );
  };

  const [expandedFolders, setExpandedFolders] = useState({});
  const [translatedContent, setTranslatedContent] = useState({});
  const [isTranslating, setIsTranslating] = useState(false);

  // Translation hook - use employee's preferred language if provided
  const { t: defaultT, language: contextLanguage } = useTranslation();

  // If employeeLanguage is passed, create a custom translation function
  const lang = employeeLanguage || employee?.preferred_language || contextLanguage;
  const t = (category, key, fallback) => {
    // Direct import at top level uses getTranslation
    const result = getTranslation(category, key, lang);
    if (result === key && fallback) return fallback;
    return result;
  };

  // Translate content using AI when language is not English
  useEffect(() => {
    if (!open || lang === "en") return;

    const contentToTranslate = [];

    // Collect task titles and descriptions
    tasks.forEach(task => {
      if (task.title) contentToTranslate.push({ id: `task_title_${task.id}`, text: task.title });
      if (task.description) contentToTranslate.push({ id: `task_desc_${task.id}`, text: task.description });
      if (task.area) contentToTranslate.push({ id: `task_area_${task.id}`, text: task.area });
    });

    // Collect drain info
    drainLocations.forEach(drain => {
      const drainData = drain.data || drain;
      if (drainData.drain_id) contentToTranslate.push({ id: `drain_id_${drain.id}`, text: drainData.drain_id });
      if (drainData.location_description) contentToTranslate.push({ id: `drain_loc_${drain.id}`, text: drainData.location_description });
    });

    // Collect titration area names
    titrationAreas.forEach(area => {
      if (area.name) contentToTranslate.push({ id: `titration_name_${area.id}`, text: area.name });
      if (area.chemical_name) contentToTranslate.push({ id: `titration_chem_${area.id}`, text: area.chemical_name });
    });

    // Task group names
    taskGroups?.forEach(group => {
      if (group.name) contentToTranslate.push({ id: `group_name_${group.id}`, text: group.name });
    });

    // Diverter/Inventory titles
    if (diverterSettings?.task_title) contentToTranslate.push({ id: "diverter_title", text: diverterSettings.task_title });
    if (inventorySettings?.task_title) contentToTranslate.push({ id: "inventory_title", text: inventorySettings.task_title });

    if (contentToTranslate.length === 0) return;

    const translateContent = async () => {
      setIsTranslating(true);
      try {
        const langName = SUPPORTED_LANGUAGES.find(l => l.code === lang)?.name || lang;
        const textsToTranslate = contentToTranslate.map(c => c.text);

        const result = await invokeLLM({
          prompt: `Translate the following texts to ${langName}. Keep them short and natural. Return a JSON object where keys are the original texts and values are the translations. Only translate, don't add explanations.\n\nTexts:\n${textsToTranslate.join("\n")}`,
          response_json_schema: {
            type: "object",
            additionalProperties: { type: "string" }
          }
        });

        const translations = {};
        contentToTranslate.forEach(item => {
          if (result[item.text]) {
            translations[item.id] = result[item.text];
          }
        });
        setTranslatedContent(translations);
      } catch (e) {
        console.error("Translation error:", e);
      } finally {
        setIsTranslating(false);
      }
    };

    translateContent();
  }, [open, lang, tasks, drainLocations, titrationAreas, taskGroups, diverterSettings, inventorySettings]);

  // Helper to get translated text
  const tr = (id, fallback) => translatedContent[id] || fallback;

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

  // Helper to check if a task has missing training
  const taskHasMissingTraining = (task) => {
    if (!task?.required_training_id) return false;
    const completedTrainingIds = employeeTrainings.map(t => t.document_id);
    return !completedTrainingIds.includes(task.required_training_id);
  };

  // Helper to get missing training title for a task
  const getMissingTrainingTitle = (task) => {
    if (!taskHasMissingTraining(task)) return null;
    return task.required_training_title || t("training", "trainingRequired", "Training Required");
  };

  // Helper to check if a task is already assigned to someone else
  const taskIsAssignedToOther = (task, currentEmployeeEmail) => {
    return task?.assigned_to && task.assigned_to !== currentEmployeeEmail;
  };

  // Helper to get translated frequency title
  const getFrequencyBadgeText = (selected, quota) => {
    return `${selected}/${quota} ${t("common", "selected", "selected")}`;
  };

  const TaskList = ({ title, taskList, quota, selected }) => {
    // Separate parent/group tasks and standalone tasks
    const parentTasksInList = taskList.filter(t => 
      !t.parent_task_id && (t.is_group === true || subtasksByParent[t.id]?.length > 0)
    );
    const standaloneTasksInList = taskList.filter(t => 
      !t.parent_task_id && t.is_group !== true && !subtasksByParent[t.id]?.length
    );
    
    // Sort: incomplete tasks first
    const sortByStatus = (a, b) => {
      const aComplete = a.status === "completed" || a.status === "verified";
      const bComplete = b.status === "completed" || b.status === "verified";
      if (aComplete && !bComplete) return 1;
      if (!aComplete && bComplete) return -1;
      return 0;
    };
    
    const sortedParentTasks = [...parentTasksInList].sort(sortByStatus);
    const sortedStandaloneTasks = [...standaloneTasksInList].sort(sortByStatus);
    
    // Group similar standalone tasks
    const { folders, ungrouped } = groupSimilarTasks(sortedStandaloneTasks);
    const sortedUngrouped = [...ungrouped].sort(sortByStatus);
    
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <Badge 
            variant={selected >= quota ? "default" : "secondary"}
            className={cn(
              selected >= quota ? "bg-emerald-600" : "bg-slate-200 text-slate-600"
            )}
          >
            {getFrequencyBadgeText(selected, quota)}
          </Badge>
        </div>
        {taskList.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">{t("tasks", "noTasksOfTypeAvailable", `No ${title.toLowerCase()} available`)}</p>
        ) : quota === 0 ? (
          // No quota set, still show tasks but without quota badge requirement
          <div className="space-y-3">
            {/* Parent/Group tasks with subtasks */}
            {sortedParentTasks.map(parentTask => {
              const subtasks = subtasksByParent[parentTask.id] || [];
              const allSubtasksSelected = subtasks.length > 0 && subtasks.every(st => selectedTasks.includes(st.id));
              const someSubtasksSelected = subtasks.some(st => selectedTasks.includes(st.id));
              const isCompleted = parentTask.status === "completed" || parentTask.status === "verified";
              const folderKey = `group-noquota-${parentTask.id}`;
              const isExpanded = expandedFolders[folderKey];
              
              return (
                <div key={parentTask.id} className={cn("border rounded-lg", parentTask.is_group ? "bg-emerald-50 border-emerald-200" : isCompleted ? "bg-slate-100 opacity-60" : "bg-slate-50")}>
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer"
                    onClick={() => toggleFolder(folderKey)}
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-emerald-600" /> : <ChevronRight className="w-4 h-4 text-emerald-600" />}
                    <Folder className="w-4 h-4 text-emerald-600" />
                    <div className="flex-1">
                      <p className={cn("font-medium text-sm", isCompleted ? "text-slate-500 line-through" : "text-slate-900")}>{tr(`task_title_${parentTask.id}`, parentTask.title)}</p>
                      {parentTask.area && (
                        <p className="text-xs text-slate-500 mt-0.5">{tr(`task_area_${parentTask.id}`, parentTask.area)}</p>
                      )}
                      <p className="text-xs text-emerald-600 mt-1 font-medium">
                        {subtasks.length} {subtasks.length !== 1 ? t("tasks", "subtasks", "subtasks") : t("tasks", "subtask", "subtask")}
                        {someSubtasksSelected && ` • ${subtasks.filter(st => selectedTasks.includes(st.id)).length} ${t("common", "selected", "selected")}`}
                      </p>
                    </div>
                    <Checkbox
                      checked={allSubtasksSelected}
                      onCheckedChange={() => toggleParentTask(parentTask.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mr-2"
                    />
                  </div>
                  {isExpanded && subtasks.length > 0 && (
                    <div className="border-t border-emerald-200 p-2 max-h-48 overflow-y-auto space-y-1">
                      {subtasks.map(subtask => {
                        const isSubCompleted = subtask.status === "completed" || subtask.status === "verified";
                        const needsTraining = taskHasMissingTraining(subtask);
                        return (
                          <label
                            key={subtask.id}
                            className={cn(
                              "flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                              selectedTasks.includes(subtask.id)
                                ? needsTraining ? "bg-amber-50 border border-amber-200" : "bg-blue-50"
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
                              <div className="flex items-center gap-2">
                                <p className={cn("text-sm", isSubCompleted ? "text-slate-500 line-through" : "text-slate-900")}>{tr(`task_title_${subtask.id}`, subtask.title)}</p>
                                {needsTraining && (
                                  <Badge className="bg-amber-100 text-amber-700 text-xs py-0" title={getMissingTrainingTitle(subtask)}>
                                    <GraduationCap className="w-3 h-3 mr-1" />
                                    {getMissingTrainingTitle(subtask)}
                                  </Badge>
                                )}
                              </div>
                              {subtask.description && (
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{tr(`task_desc_${subtask.id}`, subtask.description)}</p>
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
            
            {/* Folders of similar tasks - no quota section */}
            {Object.entries(folders).map(([folderName, folderTasks]) => {
              const folderKey = `${title}-${folderName}`;
              const isExpanded = expandedFolders[folderKey];
              const sortedFolderTasks = [...folderTasks].sort(sortByStatus);
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
                        {folderTasks.length} {t("tasks", "tasks", "tasks")} • {incompleteCount} {t("status", "incomplete", "incomplete")}
                        {selectedInFolder > 0 && <span className="text-blue-600"> • {selectedInFolder} {t("common", "selected", "selected")}</span>}
                      </p>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-amber-200 p-2 max-h-48 overflow-y-auto space-y-1">
                      {sortedFolderTasks.map(task => {
                        const isCompleted = task.status === "completed" || task.status === "verified";
                        const needsTraining = taskHasMissingTraining(task);
                        return (
                          <label
                            key={task.id}
                            className={cn(
                              "flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                              selectedTasks.includes(task.id)
                                ? needsTraining ? "bg-amber-50 border border-amber-200" : "bg-blue-50"
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
                            <div className="flex items-center gap-2 flex-1">
                              <p className={cn("text-sm", isCompleted ? "text-slate-500 line-through" : "text-slate-900")}>{tr(`task_title_${task.id}`, task.title)}</p>
                              {needsTraining && (
                                <Badge className="bg-amber-100 text-amber-700 text-xs py-0" title={getMissingTrainingTitle(task)}>
                                  <GraduationCap className="w-3 h-3 mr-1" />
                                  {getMissingTrainingTitle(task)}
                                </Badge>
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
            
            {/* Ungrouped standalone tasks - no quota section */}
            {sortedUngrouped.map(task => {
              const isCompleted = task.status === "completed" || task.status === "verified";
              const needsTraining = taskHasMissingTraining(task);
              return (
                <label
                  key={task.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedTasks.includes(task.id)
                      ? needsTraining ? "bg-amber-50 border-amber-300" : "bg-blue-50 border-blue-200"
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
                    <div className="flex items-center gap-2">
                      <p className={cn("font-medium text-sm", isCompleted ? "text-slate-500 line-through" : "text-slate-900")}>{tr(`task_title_${task.id}`, task.title)}</p>
                      {needsTraining && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs py-0" title={getMissingTrainingTitle(task)}>
                          <GraduationCap className="w-3 h-3 mr-1" />
                          {getMissingTrainingTitle(task)}
                        </Badge>
                      )}
                    </div>
                    {task.area && (
                      <p className="text-xs text-slate-500 mt-1">{tr(`task_area_${task.id}`, task.area)}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Parent/Group tasks with subtasks */}
            {sortedParentTasks.map(parentTask => {
              const subtasks = subtasksByParent[parentTask.id] || [];
              const allSubtasksSelected = subtasks.length > 0 && subtasks.every(st => selectedTasks.includes(st.id));
              const someSubtasksSelected = subtasks.some(st => selectedTasks.includes(st.id));
              const isCompleted = parentTask.status === "completed" || parentTask.status === "verified";
              const folderKey = `group-quota-${parentTask.id}`;
              const isExpanded = expandedFolders[folderKey];
              
              return (
                <div key={parentTask.id} className={cn("border rounded-lg", parentTask.is_group ? "bg-emerald-50 border-emerald-200" : isCompleted ? "bg-slate-100 opacity-60" : "bg-slate-50")}>
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer"
                    onClick={() => toggleFolder(folderKey)}
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-emerald-600" /> : <ChevronRight className="w-4 h-4 text-emerald-600" />}
                    <Folder className="w-4 h-4 text-emerald-600" />
                    <div className="flex-1">
                      <p className={cn("font-medium text-sm", isCompleted ? "text-slate-500 line-through" : "text-slate-900")}>{tr(`task_title_${parentTask.id}`, parentTask.title)}</p>
                      {parentTask.area && (
                        <p className="text-xs text-slate-500 mt-0.5">{tr(`task_area_${parentTask.id}`, parentTask.area)}</p>
                      )}
                      <p className="text-xs text-emerald-600 mt-1 font-medium">
                        {subtasks.length} {subtasks.length !== 1 ? t("tasks", "subtasks", "subtasks") : t("tasks", "subtask", "subtask")}
                        {someSubtasksSelected && ` • ${subtasks.filter(st => selectedTasks.includes(st.id)).length} ${t("common", "selected", "selected")}`}
                      </p>
                    </div>
                    <Checkbox
                      checked={allSubtasksSelected}
                      onCheckedChange={() => toggleParentTask(parentTask.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mr-2"
                    />
                  </div>
                  {isExpanded && subtasks.length > 0 && (
                    <div className="border-t border-emerald-200 p-2 max-h-48 overflow-y-auto space-y-1">
                      {subtasks.map(subtask => {
                        const isSubCompleted = subtask.status === "completed" || subtask.status === "verified";
                        const needsTraining = taskHasMissingTraining(subtask);
                        return (
                          <label
                            key={subtask.id}
                            className={cn(
                              "flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                              selectedTasks.includes(subtask.id)
                                ? needsTraining ? "bg-amber-50 border border-amber-200" : "bg-blue-50"
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
                              <div className="flex items-center gap-2">
                                <p className={cn("text-sm", isSubCompleted ? "text-slate-500 line-through" : "text-slate-900")}>{tr(`task_title_${subtask.id}`, subtask.title)}</p>
                                {needsTraining && (
                                  <Badge className="bg-amber-100 text-amber-700 text-xs py-0" title={getMissingTrainingTitle(subtask)}>
                                    <GraduationCap className="w-3 h-3 mr-1" />
                                    {getMissingTrainingTitle(subtask)}
                                  </Badge>
                                )}
                              </div>
                              {subtask.description && (
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{tr(`task_desc_${subtask.id}`, subtask.description)}</p>
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
            
            {/* Folders of similar tasks - quota section */}
            {Object.entries(folders).map(([folderName, folderTasks]) => {
              const folderKey = `${title}-${folderName}-quota`;
              const isExpanded = expandedFolders[folderKey];
              const sortedFolderTasks = [...folderTasks].sort(sortByStatus);
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
                        {folderTasks.length} {t("tasks", "tasks", "tasks")} • {incompleteCount} {t("status", "incomplete", "incomplete")}
                        {selectedInFolder > 0 && <span className="text-blue-600"> • {selectedInFolder} {t("common", "selected", "selected")}</span>}
                      </p>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-amber-200 p-2 max-h-48 overflow-y-auto space-y-1">
                      {sortedFolderTasks.map(task => {
                        const isCompleted = task.status === "completed" || task.status === "verified";
                        const needsTraining = taskHasMissingTraining(task);
                        return (
                          <label
                            key={task.id}
                            className={cn(
                              "flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                              selectedTasks.includes(task.id)
                                ? needsTraining ? "bg-amber-50 border border-amber-200" : "bg-blue-50"
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
                            <div className="flex items-center gap-2 flex-1">
                              <p className={cn("text-sm", isCompleted ? "text-slate-500 line-through" : "text-slate-900")}>{tr(`task_title_${task.id}`, task.title)}</p>
                              {needsTraining && (
                                <Badge className="bg-amber-100 text-amber-700 text-xs py-0" title={getMissingTrainingTitle(task)}>
                                  <GraduationCap className="w-3 h-3 mr-1" />
                                  {getMissingTrainingTitle(task)}
                                </Badge>
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
            
            {/* Ungrouped standalone tasks - quota section */}
            {sortedUngrouped.map(task => {
              const isCompleted = task.status === "completed" || task.status === "verified";
              const needsTraining = taskHasMissingTraining(task);
              return (
                <label
                  key={task.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedTasks.includes(task.id)
                      ? needsTraining ? "bg-amber-50 border-amber-300" : "bg-blue-50 border-blue-200"
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
                    <div className="flex items-center gap-2">
                      <p className={cn("font-medium text-sm", isCompleted ? "text-slate-500 line-through" : "text-slate-900")}>{tr(`task_title_${task.id}`, task.title)}</p>
                      {needsTraining && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs py-0" title={getMissingTrainingTitle(task)}>
                          <GraduationCap className="w-3 h-3 mr-1" />
                          {getMissingTrainingTitle(task)}
                        </Badge>
                      )}
                    </div>
                    {task.area && (
                      <p className="text-xs text-slate-500 mt-1">{tr(`task_area_${task.id}`, task.area)}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden p-0" onInteractOutside={(e) => e.preventDefault()}>
        {/* Full-screen loading overlay when confirming */}
        {(confirming || isLoading) && (
          <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 rounded-lg">
            <Loader2 className="w-10 h-10 animate-spin text-slate-700" />
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-900">{t("tasks", "settingUpTasks", "Setting up your tasks...")}</p>
              <p className="text-sm text-slate-500 mt-1">{t("common", "pleaseWait", "Please wait, this may take a moment")}</p>
            </div>
          </div>
        )}

        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{t("tasks", "selectTasksForToday", "Select Your Tasks for Today")}</DialogTitle>
          <DialogDescription>
            {t("tasks", "selectTasksDescription", "Choose tasks to meet your daily quotas, or skip if you're an extra today")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Rain Diverter Task Section */}
          {diverterSettings?.is_enabled && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-600" />
                {t("tasks", "rainDiverterInspection", "Rain Diverter Inspection")}
              </h3>
              <div
                className={cn(
                  "border rounded-lg cursor-pointer transition-all p-4",
                  selectedDiverterTask
                    ? diverterSettings.required_training_id && !employeeTrainings.some(t => t.document_id === diverterSettings.required_training_id)
                      ? "border-amber-500 bg-amber-50"
                      : "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                )}
                onClick={() => setSelectedDiverterTask(!selectedDiverterTask)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox checked={selectedDiverterTask} />
                  <Droplets className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">
                        {tr("diverter_title", diverterSettings.task_title || "Rain Diverter Bucket Check")}
                      </p>
                      {diverterSettings.required_training_id && !employeeTrainings.some(et => et.document_id === diverterSettings.required_training_id) && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs py-0">
                          <GraduationCap className="w-3 h-3 mr-1" />
                          {t("training", "trainingRequired", "Training Required")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-blue-600 capitalize">
                      {t("cleaning", (diverterSettings.frequency || "weekly").toLowerCase(), diverterSettings.frequency || "Weekly")} {t("tasks", "task", "Task")}
                    </p>
                  </div>
                  {!diverterTaskDue && (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">{t("tasks", "alreadyDoneThisPeriod", "Already done this period")}</Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Chemical Inventory Task Section */}
          {inventorySettings?.is_enabled && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-emerald-600" />
                {t("chemicals", "chemicalInventory", "Chemical Inventory")}
              </h3>
              <div
                className={cn(
                  "border rounded-lg cursor-pointer transition-all p-4",
                  selectedInventoryTask
                    ? inventorySettings.required_training_id && !employeeTrainings.some(t => t.document_id === inventorySettings.required_training_id)
                      ? "border-amber-500 bg-amber-50"
                      : "border-emerald-600 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300"
                )}
                onClick={() => setSelectedInventoryTask(!selectedInventoryTask)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox checked={selectedInventoryTask} />
                  <FlaskConical className="w-5 h-5 text-emerald-600" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">
                        {tr("inventory_title", inventorySettings.task_title || "Chemical Inventory Count")}
                      </p>
                      {inventorySettings.required_training_id && !employeeTrainings.some(et => et.document_id === inventorySettings.required_training_id) && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs py-0">
                          <GraduationCap className="w-3 h-3 mr-1" />
                          {t("training", "trainingRequired", "Training Required")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-emerald-600 capitalize">
                      {t("cleaning", (inventorySettings.frequency || "weekly").toLowerCase(), inventorySettings.frequency || "Weekly")} {t("tasks", "task", "Task")}
                    </p>
                  </div>
                  {!inventoryTaskDue && (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">{t("tasks", "alreadyDoneThisPeriod", "Already done this period")}</Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Drain Cleaning Task Section */}
          {drainLocations && drainLocations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Droplet className="w-4 h-4 text-cyan-600" />
                {t("cleaning", "drainCleaning", "Drain Cleaning")} ({drainsDueForCleaning.length > 0 ? drainsDueForCleaning.length : drainLocations.length} {t("common", "available", "available")})
                {drainCleaningSettings?.required_training_id && !employeeTrainings.some(et => et.document_id === drainCleaningSettings.required_training_id) && selectedDrains.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 text-xs py-0">
                    <GraduationCap className="w-3 h-3 mr-1" />
                    {t("training", "trainingRequired", "Training Required")}
                  </Badge>
                )}
              </h3>
              <div className="space-y-2">
                {(drainsDueForCleaning.length > 0 ? drainsDueForCleaning : drainLocations).map(drain => {
                  // Handle nested data structure from API
                  const drainData = drain.data || drain;
                  const drainId = drainData.drain_id;
                  const locationDesc = drainData.location_description;
                  const cleaningFreq = drainData.cleaning_frequency;

                  return (
                    <div
                      key={drain.id}
                      className={cn(
                        "border rounded-lg cursor-pointer transition-all p-3",
                        selectedDrains.includes(drain.id)
                          ? "border-cyan-600 bg-cyan-50"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                      onClick={() => {
                        setSelectedDrains(prev => 
                          prev.includes(drain.id)
                            ? prev.filter(id => id !== drain.id)
                            : [...prev, drain.id]
                        );
                      }}
                    >
                      <div className="flex items-center gap-3">
                              <Checkbox checked={selectedDrains.includes(drain.id)} />
                              <Droplet className="w-4 h-4 text-cyan-600" />
                              <div className="flex-1">
                                <p className="font-medium text-sm text-slate-900">{tr(`drain_id_${drain.id}`, drainId)}</p>
                                <p className="text-xs text-slate-500">{tr(`drain_loc_${drain.id}`, locationDesc)}</p>
                              </div>
                              <Badge variant="outline" className="text-xs capitalize">{t("cleaning", cleaningFreq?.toLowerCase() || "weekly", cleaningFreq || "Weekly")}</Badge>
                            </div>
                    </div>
                  );
                })}
              </div>
              {(drainsDueForCleaning.length > 0 ? drainsDueForCleaning : drainLocations).length > 3 && selectedDrains.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setSelectedDrains((drainsDueForCleaning.length > 0 ? drainsDueForCleaning : drainLocations).map(d => d.id))}
                >
                  {t("common", "selectAll", "Select All")} {(drainsDueForCleaning.length > 0 ? drainsDueForCleaning : drainLocations).length} {t("cleaning", "drains", "Drains")}
                </Button>
              )}
            </div>
          )}

          {/* AI Task Recommendations */}
          <TaskRecommendationAgent
            employee={employee}
            tasks={tasks}
            employeeTrainings={employeeTrainings}
            taskHistory={taskHistory}
            selectedTasks={selectedTasks}
            onSelectTask={(taskId) => handleToggle(taskId)}
            onSelectTraining={(trainingId, trainingTitle) => {
              // Could navigate to training or show a toast
              console.log("Training recommended:", trainingId, trainingTitle);
            }}
            config={recommendationConfig}
            translatedContent={translatedContent}
          />

          {/* Titration Areas Section - Chemical Tests (All-or-Nothing Group) */}
          {titrationAreas && titrationAreas.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-blue-600" />
                {t("chemicals", "chemicalTitrations", "Chemical Titrations")}
                {titrationSettings?.required_training_id && !employeeTrainings.some(et => et.document_id === titrationSettings.required_training_id) && selectedTitrations.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 text-xs py-0">
                    <GraduationCap className="w-3 h-3 mr-1" />
                    {t("training", "trainingRequired", "Training Required")}
                  </Badge>
                )}
              </h3>
              {availableTitrationAreas.length === 0 ? (
                <div className="border rounded-lg border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-800">{t("chemicals", "allTitrationsCompleted", "All titrations completed this period")}</p>
                      <p className="text-xs text-emerald-600">{titrationAreas.length} {t("common", "locations", "locations")} {t("status", "completed", "completed").toLowerCase()}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "border rounded-lg cursor-pointer transition-all",
                    selectedTitrations.length === availableTitrationAreas.length
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                  onClick={() => {
                    // Toggle all available titrations as a group
                    if (selectedTitrations.length === availableTitrationAreas.length) {
                      setSelectedTitrations([]);
                    } else {
                      setSelectedTitrations(availableTitrationAreas.map(a => a.id));
                    }
                  }}
                >
                  <div className="flex items-center gap-3 p-3">
                  <Checkbox checked={selectedTitrations.length === availableTitrationAreas.length && availableTitrationAreas.length > 0} />
                  <FlaskConical className="w-4 h-4 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{t("chemicals", "allChemicalTitrations", "All Chemical Titrations")}</p>
                    <p className="text-xs text-blue-600">{availableTitrationAreas.length} {t("common", "locations", "locations")} {t("common", "toComplete", "to complete")}</p>
                  </div>
                  </div>
                  {/* Show individual items inside */}
                  <div className="border-t border-slate-200 px-3 py-2 bg-slate-50/50 rounded-b-lg">
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {availableTitrationAreas.map(area => (
                            <div key={area.id} className="flex items-center justify-between text-xs py-1">
                              <span className="text-slate-700">{tr(`titration_name_${area.id}`, area.name)}</span>
                              <span className="text-slate-500">
                                {tr(`titration_chem_${area.id}`, area.chemical_name)} • {area.target_min}-{area.target_max} {area.measurement_type === "oz_gal" ? "oz/gal" : "PPM"}
                              </span>
                            </div>
                          ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Task Groups Section */}
          {taskGroups && taskGroups.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">{t("tasks", "dailyTaskGroups", "Daily Task Groups")}</h3>
              <div className="space-y-2">
                {taskGroups.filter(group => {
                  // Only show groups that have at least one available (eligible) task
                  const groupTaskIds = group.task_ids || [];
                  return groupTaskIds.some(tid => tasks.some(t => t.id === tid));
                }).map(group => {
                  const taskCount = (group.task_ids || []).filter(tid => tasks.some(t => t.id === tid)).length;
                  const isClaimed = claimedTaskGroupIds.has(group.id);
                  
                  return (
                    <div
                      key={group.id}
                      className={cn(
                        "border rounded-lg p-3 transition-all",
                        isClaimed 
                          ? "border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed"
                          : selectedGroups.includes(group.id)
                            ? "border-slate-900 bg-slate-50 cursor-pointer"
                            : "border-slate-200 hover:border-slate-300 cursor-pointer"
                      )}
                      onClick={() => !isClaimed && toggleGroup(group.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedGroups.includes(group.id)} 
                          disabled={isClaimed}
                        />
                        <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: group.color || "#64748b" }}
                            />
                            <div className="flex-1">
                              <p className={cn("font-medium", isClaimed ? "text-slate-500" : "text-slate-900")}>{tr(`group_name_${group.id}`, group.name)}</p>
                          <p className="text-xs text-slate-500">
                            {taskCount} {taskCount !== 1 ? t("tasks", "tasks", "tasks") : t("tasks", "task", "task")}
                            {isClaimed && (
                              <span className="ml-2 text-amber-600">
                                <User className="w-3 h-3 inline mr-1" />
                                {t("tasks", "alreadyClaimedToday", "Already claimed today")}
                              </span>
                            )}
                          </p>
                        </div>
                        {isClaimed && (
                          <Badge className="bg-slate-300 text-slate-600 text-xs">{t("common", "taken", "Taken")}</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              {t("tasks", "noTasksAvailable", "No tasks available to select at this time. You may proceed without selecting tasks.")}
            </p>
          ) : sortedFrequencies.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              {t("tasks", "noNonDailyTasks", "No non-daily tasks available. Select a task group above if needed.")}
            </p>
          ) : (
            sortedFrequencies.map(nf => {
              const quota = normalizedQuotas[nf] || 0;
              // Create display-friendly label from normalized key
              const displayLabel = nf === "biweekly" ? "Bi-Weekly" : nf === "bimonthly" ? "Bi-Monthly" : nf.charAt(0).toUpperCase() + nf.slice(1);
              const freqTranslated = t("cleaning", nf, displayLabel);
              return (
                <TaskList
                  key={nf}
                  title={`${freqTranslated} ${t("tasks", "tasks", "Tasks")}`}
                  taskList={tasksByFrequency[nf] || []}
                  quota={quota}
                  selected={selectedByFrequency[nf] || 0}
                />
              );
            })
          )}
        </div>

        <div className="flex-shrink-0 bg-white flex items-center justify-between px-6 pt-4 pb-4 border-t">
          <div className="text-sm">
            {canProceed && (Object.values(selectedByFrequency).some(v => v > 0) || selectedGroups.length > 0) ? (
              <p className="text-emerald-600 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {t("tasks", "readyToProceed", "Ready to proceed!")}
              </p>
            ) : Object.keys(normalizedQuotas).length === 0 ? (
              <p className="text-slate-600">{t("tasks", "selectTasksForToday", "Select tasks for today")}</p>
            ) : (
              <p className="text-slate-600">{t("tasks", "selectMoreTasks", "Select more tasks to meet quotas")}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleSkip}
              disabled={isLoading}
              variant="outline"
            >
              {t("tasks", "imAnExtraToday", "I'm an Extra Today")}
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading || confirming}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {(isLoading || confirming) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {t("common", "confirmSelection", "Confirm Selection")}
            </Button>
          </div>
        </div>
      </DialogContent>
      <TrainingRequiredModal
        open={showTrainingModal}
        onOpenChange={setShowTrainingModal}
        tasksWithMissingTraining={tasksWithMissingTraining}
        onContinue={proceedWithConfirm}
      />
    </Dialog>
  );
}