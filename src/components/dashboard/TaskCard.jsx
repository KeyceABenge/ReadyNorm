import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, User, CheckCircle2, Play, Eye, FileText, GraduationCap, AlertTriangle, CloudOff } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useTranslation, useContentTranslation } from "@/components/i18n";
import ProxiedImage from "@/components/ui/ProxiedImage";

export default function TaskCard({ task, onStart, onComplete, onView, onDelete, isEmployee = false, hideStatus = false, needsTraining = false, onTrainingTap }) {
  const { t, language } = useTranslation();
  
  // Translate dynamic content (task title, description, area)
  const contentToTranslate = {
    title: task.title,
    description: task.description,
    area: task.area,
    required_training_title: task.required_training_title
  };
  const { translatedContent, isTranslating } = useContentTranslation(contentToTranslate, language);
  
  // Use translated content or fallback to original
  const displayTitle = translatedContent.title || task.title;
  const displayDescription = translatedContent.description || task.description;
  const displayArea = translatedContent.area || task.area;
  const displayTrainingTitle = translatedContent.required_training_title || task.required_training_title;

  const priorityConfig = {
    low: { color: "bg-slate-100 text-slate-700", label: t("tasks", "priorityLow", "Low") },
    medium: { color: "bg-blue-100 text-blue-700", label: t("tasks", "priorityMedium", "Medium") },
    high: { color: "bg-amber-100 text-amber-700", label: t("tasks", "priorityHigh", "High") },
    critical: { color: "bg-rose-100 text-rose-700", label: t("tasks", "priorityCritical", "Critical") }
  };

  const statusConfig = {
    pending: { color: "bg-slate-100 text-slate-700", label: t("cleaning", "pending", "Pending") },
    in_progress: { color: "bg-blue-100 text-blue-700", label: t("status", "inProgress", "In Progress") },
    completed: { color: "bg-emerald-100 text-emerald-700", label: t("status", "completed", "Completed") },
    overdue: { color: "bg-rose-100 text-rose-700", label: t("status", "overdue", "Overdue") },
    verified: { color: "bg-purple-100 text-purple-700", label: t("status", "verified", "Verified") }
  };

  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const status = statusConfig[task.status] || statusConfig.pending;

  return (
    <Card className={cn(
      "p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group",
      needsTraining && "border-2 border-amber-300 bg-amber-50/30"
    )}>
      {/* Training Required Banner */}
      {needsTraining && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-amber-100 rounded-lg border border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">{t("training", "trainingRequired", "Training Required")}</p>
            <p className="text-xs text-amber-700">{t("training", "completeBeforeStarting", "Complete")} "{displayTrainingTitle}" {t("training", "beforeStartingTask", "before starting this task")}</p>
          </div>
          <Link to={createPageUrl("EmployeeDashboard") + "?tab=training"}>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
              <GraduationCap className="w-3 h-3 mr-1" />
              {t("training", "train", "Train")}
            </Button>
          </Link>
        </div>
      )}
      
      <div className="flex items-start justify-between gap-4">
        {/* Task Image */}
        {task.image_url && (
          <div className="flex-shrink-0">
            <ProxiedImage 
              src={task.image_url} 
              alt={task.title}
              className="w-16 h-16 object-cover rounded-lg border border-slate-200"
            />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge className={cn("font-medium text-xs", priority.color)}>
              {priority.label}
            </Badge>
            {!hideStatus && (
              <Badge className={cn("font-medium text-xs", status.color)}>
                {status.label}
              </Badge>
            )}
            {/* Offline sync indicator */}
            {task._pending_sync && (
              <Badge className="bg-amber-100 text-amber-700 font-medium text-xs gap-1">
                <CloudOff className="w-3 h-3" />
                {t("status", "pendingSync", "Pending Sync")}
              </Badge>
            )}
            {task._was_offline && !task._pending_sync && (
              <Badge className="bg-blue-100 text-blue-700 font-medium text-xs gap-1">
                <Clock className="w-3 h-3" />
                {t("status", "synced", "Synced")}
              </Badge>
            )}
            {needsTraining && (
              <Badge className="bg-amber-100 text-amber-700 font-medium text-xs">
                <GraduationCap className="w-3 h-3 mr-1" />
                {t("training", "needsTraining", "Needs Training")}
              </Badge>
            )}
          </div>
          
          <h3 className="font-semibold text-slate-900 text-lg mb-2 truncate">
            {displayTitle}
          </h3>
          
          {task.description && (
            <p className="text-sm text-slate-500 mb-3 line-clamp-2">
              {displayDescription}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>{displayArea}</span>
            </div>
            {hideStatus && task.frequency ? (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span className="capitalize">Recurring {task.frequency}</span>
              </div>
            ) : task.due_date && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{format(new Date(task.due_date), "MMM d")}</span>
              </div>
            )}
            {!hideStatus && task.assigned_to_name && (
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                <span>{task.assigned_to_name}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          {task.ssop_url && (
            <a href={task.ssop_url} target="_blank" rel="noopener noreferrer">
              <Button 
                size="sm" 
                variant="outline"
                className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-200"
              >
                <FileText className="w-4 h-4 mr-1" />
                SSOP
              </Button>
            </a>
          )}
          {isEmployee && task.status === "pending" && onStart && !needsTraining && (
            <Button 
              size="sm" 
              onClick={() => onStart(task)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Play className="w-4 h-4 mr-1" />
              {t("common", "start", "Start")}
            </Button>
          )}
          {isEmployee && task.status === "pending" && needsTraining && (
            <Button 
              size="sm" 
              onClick={() => onTrainingTap?.(task)}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <GraduationCap className="w-4 h-4 mr-1" />
              {t("training", "training", "Training")}
            </Button>
          )}
          {isEmployee && task.status === "in_progress" && onComplete && (
            <Button 
              size="sm" 
              onClick={() => onComplete(task)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {t("tasks", "completeTask", "Complete")}
            </Button>
          )}
          {onView && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onView(task)}
            >
              <Eye className="w-4 h-4 mr-1" />
              {t("common", "view", "View")}
            </Button>
          )}
          {onDelete && (
            <Button onClick={() => onDelete(task)} size="sm" variant="outline" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
              {t("common", "delete", "Delete")}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}