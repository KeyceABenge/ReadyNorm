import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, GraduationCap, Lock, ChevronDown, ChevronRight, Folder
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

// Group tasks by similar names (e.g., "Stickle 1", "Stickle 2" -> "Stickles")
function groupSimilarTasks(tasks) {
  const groups = {};
  const standalone = [];
  
  // Pattern to match items with numbers at the end
  const numberPattern = /^(.+?)\s*(\d+)$/;
  
  tasks.forEach(task => {
    const match = task.title.match(numberPattern);
    if (match) {
      const baseName = match[1].trim();
      // Pluralize the base name
      const groupKey = baseName.endsWith('s') ? baseName : 
                       baseName.endsWith('h') || baseName.endsWith('ch') || baseName.endsWith('sh') || baseName.endsWith('x') ? baseName + 'es' :
                       baseName + 's';
      if (!groups[groupKey]) {
        groups[groupKey] = { baseName, tasks: [] };
      }
      groups[groupKey].tasks.push(task);
    } else {
      standalone.push(task);
    }
  });
  
  // Convert groups with only 1 item to standalone
  Object.entries(groups).forEach(([key, group]) => {
    if (group.tasks.length === 1) {
      standalone.push(group.tasks[0]);
      delete groups[key];
    }
  });
  
  return { groups, standalone };
}

// Group tasks by frequency
function groupByFrequency(tasks) {
  const frequencyOrder = ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly'];
  const grouped = {};
  
  tasks.forEach(task => {
    const freq = task.frequency?.toLowerCase() || 'other';
    if (!grouped[freq]) {
      grouped[freq] = [];
    }
    grouped[freq].push(task);
  });
  
  // Sort by frequency order
  const sorted = {};
  frequencyOrder.forEach(freq => {
    if (grouped[freq]) {
      sorted[freq] = grouped[freq];
    }
  });
  // Add any remaining
  Object.keys(grouped).forEach(freq => {
    if (!sorted[freq]) {
      sorted[freq] = grouped[freq];
    }
  });
  
  return sorted;
}

function TaskGroupCard({ groupName, tasks, onSelectTask, checkTrainingRequirement }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Card className="border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Folder className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-left">
            <span className="font-medium text-slate-900">{groupName}</span>
            <span className="text-slate-500 ml-2">({tasks.length})</span>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400" />
        )}
      </button>
      {expanded && (
        <div className="border-t divide-y">
          {tasks.map(task => (
            <TaskRow 
              key={task.id} 
              task={task} 
              onSelect={onSelectTask}
              checkTrainingRequirement={checkTrainingRequirement}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function TaskRow({ task, onSelect, checkTrainingRequirement }) {
  const trainingCheck = checkTrainingRequirement(task);
  const isBlocked = trainingCheck.isBlocked;
  
  return (
    <div className={cn(
      "p-3 flex items-center justify-between gap-3",
      isBlocked ? "bg-slate-50 opacity-75" : "hover:bg-slate-50"
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-800 text-sm">{task.title}</span>
          {task.priority && (task.priority === "critical" || task.priority === "high") && (
            <Badge className={cn(
              "text-xs",
              task.priority === "critical" && "bg-red-100 text-red-800",
              task.priority === "high" && "bg-orange-100 text-orange-800"
            )}>
              {task.priority}
            </Badge>
          )}
          {trainingCheck.required && (
            <Badge className={cn(
              "text-xs",
              isBlocked ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"
            )}>
              {isBlocked ? <Lock className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
          <span>{task.area}</span>
          {task.duration && (
            <>
              <span>•</span>
              <Clock className="w-3 h-3" />
              <span>{task.duration} min</span>
            </>
          )}
        </div>
      </div>
      <Button 
        size="sm" 
        onClick={() => onSelect(task)}
        disabled={isBlocked}
        className={cn(
          "text-xs h-7",
          isBlocked ? "bg-slate-400" : "bg-amber-600 hover:bg-amber-700"
        )}
      >
        {isBlocked ? "Locked" : "Select"}
      </Button>
    </div>
  );
}

function SingleTaskCard({ task, onSelect, checkTrainingRequirement }) {
  const trainingCheck = checkTrainingRequirement(task);
  const isBlocked = trainingCheck.isBlocked;
  
  return (
    <Card className={cn(
      "p-3 border transition-all",
      isBlocked ? "opacity-75 border-slate-200" : "hover:border-amber-300"
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-900 text-sm">{task.title}</span>
            {task.priority && (task.priority === "critical" || task.priority === "high") && (
              <Badge className={cn(
                "text-xs",
                task.priority === "critical" && "bg-red-100 text-red-800",
                task.priority === "high" && "bg-orange-100 text-orange-800"
              )}>
                {task.priority}
              </Badge>
            )}
            {trainingCheck.required && (
              <Badge className={cn(
                "text-xs",
                isBlocked ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"
              )}>
                {isBlocked ? <Lock className="w-3 h-3 mr-1" /> : <GraduationCap className="w-3 h-3 mr-1" />}
                {isBlocked ? "Blocked" : "Training"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
            <span>{task.area}</span>
            {task.duration && (
              <>
                <span>•</span>
                <Clock className="w-3 h-3" />
                <span>{task.duration} min</span>
              </>
            )}
          </div>
        </div>
        <Button 
          size="sm" 
          onClick={() => onSelect(task)}
          disabled={isBlocked}
          className={cn(
            "text-xs h-7",
            isBlocked ? "bg-slate-400" : "bg-amber-600 hover:bg-amber-700"
          )}
        >
          {isBlocked ? "Locked" : "Select"}
        </Button>
      </div>
    </Card>
  );
}

export default function HelperTaskList({ tasks, onSelectTask, checkTrainingRequirement }) {
  // First group by frequency
  const byFrequency = groupByFrequency(tasks);
  
  return (
    <div className="space-y-6">
      {Object.entries(byFrequency).map(([frequency, freqTasks]) => {
        // Within each frequency, group similar items
        const { groups, standalone } = groupSimilarTasks(freqTasks);
        
        return (
          <div key={frequency}>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {frequency.charAt(0).toUpperCase() + frequency.slice(1)} Tasks
              <span className="text-slate-400 font-normal">({freqTasks.length})</span>
            </h3>
            <div className="space-y-2">
              {/* Render grouped tasks */}
              {Object.entries(groups).map(([groupName, group]) => (
                <TaskGroupCard
                  key={groupName}
                  groupName={groupName}
                  tasks={group.tasks}
                  onSelectTask={onSelectTask}
                  checkTrainingRequirement={checkTrainingRequirement}
                />
              ))}
              {/* Render standalone tasks */}
              {standalone.map(task => (
                <SingleTaskCard
                  key={task.id}
                  task={task}
                  onSelect={onSelectTask}
                  checkTrainingRequirement={checkTrainingRequirement}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}