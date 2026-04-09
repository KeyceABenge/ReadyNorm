/**
 * Mobile-First Task Card
 * Optimized for one-handed phone operation with large touch targets
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, Clock, CheckCircle2, Play, ChevronRight, CloudOff, GraduationCap 
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslation, useContentTranslation } from "@/components/i18n";
import ProxiedImage from "@/components/ui/ProxiedImage";

const priorityConfig = {
  low: { color: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  medium: { color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  high: { color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  critical: { color: "bg-rose-100 text-rose-700", dot: "bg-rose-500" }
};

export default function MobileTaskCard({ 
  task, 
  onStart, 
  onComplete, 
  onTap,
  needsTraining = false,
  showStatus = true,
  requiredTrainingTitle = null
}) {
  const { t, language } = useTranslation();
  
  // Translate dynamic content
  const contentToTranslate = {
    title: task.title,
    area: task.area
  };
  const { translatedContent } = useContentTranslation(contentToTranslate, language);
  
  const displayTitle = translatedContent.title || task.title;
  const displayArea = translatedContent.area || task.area;

  const statusConfig = {
    pending: { color: "bg-slate-100 text-slate-700", label: t("cleaning", "pending", "Pending") },
    in_progress: { color: "bg-blue-100 text-blue-700", label: t("status", "inProgress", "In Progress") },
    completed: { color: "bg-emerald-100 text-emerald-700", label: t("status", "completed", "Completed") },
    overdue: { color: "bg-rose-100 text-rose-700", label: t("status", "overdue", "Overdue") },
    verified: { color: "bg-purple-100 text-purple-700", label: t("status", "verified", "Verified") }
  };

  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const status = statusConfig[task.status] || statusConfig.pending;
  
  const isPending = task.status === "pending";
  const isInProgress = task.status === "in_progress";
  const isCompleted = task.status === "completed" || task.status === "verified";

  const handleAction = (e) => {
    e.stopPropagation();
    if (needsTraining) {
      if (onTap) onTap(task);
      return;
    }
    
    if (isPending && onStart) {
      onStart(task);
    } else if (isInProgress && onComplete) {
      onComplete(task);
    }
  };

  return (
    <Card 
      className={cn(
        "active:scale-[0.98] transition-all duration-150 touch-manipulation",
        "border-l-4 overflow-hidden",
        isCompleted && "opacity-70 border-l-emerald-500",
        needsTraining && "border-l-amber-500 bg-amber-50/50",
        !isCompleted && !needsTraining && priority.dot.replace("bg-", "border-l-"),
        task._pending_sync && "border-r-4 border-r-amber-400"
      )}
      onClick={() => onTap?.(task)}
    >
      <div className="p-4">
        {/* Top Row: Title + Action */}
        <div className="flex items-start gap-3">
          {/* Task Image or Priority Dot */}
          <div className="flex-shrink-0 mt-1">
            {task.image_url ? (
              <ProxiedImage 
                src={task.image_url} 
                alt="" 
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className={cn("w-3 h-3 rounded-full mt-1.5", priority.dot)} />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className={cn(
              "font-semibold text-base leading-tight line-clamp-2",
              isCompleted && "text-slate-500 line-through"
            )}>
              {displayTitle}
            </h3>
            
            {/* Meta Info */}
            <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate max-w-[100px]">{displayArea}</span>
              </div>
              {task.due_date && !isCompleted && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{format(new Date(task.due_date), "MMM d")}</span>
                </div>
              )}
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {showStatus && (
                <Badge className={cn("text-xs px-2 py-0.5", status.color)}>
                  {status.label}
                </Badge>
              )}
              {task._pending_sync && (
                <Badge className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 gap-1">
                  <CloudOff className="w-3 h-3" />
                  {t("status", "syncing", "Syncing")}
                </Badge>
              )}
              {needsTraining && (
                <Badge className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 gap-1">
                  <GraduationCap className="w-3 h-3" />
                  {requiredTrainingTitle || task.required_training_title || t("training", "training", "Training")}
                </Badge>
              )}
            </div>
          </div>

          {/* Action Button - Large Touch Target */}
          {!isCompleted && (
            <Button
              size="lg"
              onClick={handleAction}
              className={cn(
                "h-14 w-14 rounded-xl flex-shrink-0 p-0",
                "touch-manipulation active:scale-95",
                isPending && !needsTraining && "bg-blue-600 hover:bg-blue-700",
                isInProgress && "bg-emerald-600 hover:bg-emerald-700",
                needsTraining && "bg-amber-500 hover:bg-amber-600"
              )}
            >
              {needsTraining ? (
                <GraduationCap className="w-6 h-6" />
              ) : isPending ? (
                <Play className="w-6 h-6" />
              ) : isInProgress ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <ChevronRight className="w-6 h-6" />
              )}
            </Button>
          )}
          
          {isCompleted && (
            <div className="h-14 w-14 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}