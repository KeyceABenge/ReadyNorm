/**
 * Mobile Task Group
 * Collapsible group of related tasks with large touch targets
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Folder, ChevronDown, ChevronRight, CheckCircle2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import MobileTaskCard from "./MobileTaskCard";

export default function MobileTaskGroup({ 
  groupName,
  tasks,
  area,
  onTaskStart,
  onTaskComplete,
  employeeTrainings = [],
  defaultExpanded = false,
  onTrainingTap
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const completedCount = tasks.filter(t => 
    t.status === "completed" || t.status === "verified"
  ).length;
  
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const allComplete = completedCount === tasks.length;

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-emerald-200 bg-emerald-50">
      {/* Header - Large Touch Target */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-3 p-4",
          "touch-manipulation active:bg-emerald-100 transition-colors",
          "text-left"
        )}
      >
        {/* Expand Icon */}
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-emerald-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-emerald-600" />
          )}
        </div>
        
        {/* Group Icon */}
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          allComplete ? "bg-emerald-500" : "bg-emerald-600"
        )}>
          {allComplete ? (
            <CheckCircle2 className="w-5 h-5 text-white" />
          ) : (
            <Folder className="w-5 h-5 text-white" />
          )}
        </div>
        
        {/* Group Info */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-semibold text-base line-clamp-1",
            allComplete && "text-emerald-700"
          )}>
            {groupName}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {area && (
              <span className="text-sm text-slate-500 truncate">{area}</span>
            )}
          </div>
        </div>
        
        {/* Progress Badge */}
        <div className="flex flex-col items-end gap-1">
          <Badge className={cn(
            "text-sm px-2.5 py-1",
            allComplete ? "bg-emerald-600" : "bg-emerald-500"
          )}>
            {completedCount}/{tasks.length}
          </Badge>
          {/* Mini Progress Bar */}
          <div className="w-16 h-1.5 bg-emerald-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </button>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-emerald-200 bg-white p-3 space-y-2">
          {tasks.map(task => {
            const needsTraining = task.required_training_id && 
              !employeeTrainings.some(t => t.document_id === task.required_training_id);
              
            return (
              <MobileTaskCard
                key={task.id}
                task={task}
                onStart={onTaskStart}
                onComplete={onTaskComplete}
                needsTraining={needsTraining}
                requiredTrainingTitle={needsTraining ? task.required_training_title : null}
                showStatus={false}
                onTap={needsTraining ? onTrainingTap : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}