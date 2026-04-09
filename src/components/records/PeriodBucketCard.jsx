// @ts-nocheck
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, ChevronUp, Calendar, CheckCircle2, XCircle, MapPin
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import TaskRecordCard from "@/components/dashboard/TaskRecordCard";

/**
 * A single task row for missed tasks (no full task record available)
 */
function MissedTaskRow({ item, onViewTask }) {
  return (
    <div 
      className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
      onClick={() => onViewTask?.(item)}
    >
      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
          {item.area && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />{item.area}
            </span>
          )}
          {item.due_date && (
            <span>Due: {format(parseISO(item.due_date), "MMM d")}</span>
          )}
        </div>
      </div>
      <Badge className="bg-red-100 text-red-700 text-xs rounded-full">Missed</Badge>
    </div>
  );
}

/**
 * A single task row used in "all" mode
 */
function AllTaskRow({ item, onAddComment, onViewTask }) {
  if (item._status === "missed") {
    return <MissedTaskRow item={item} onViewTask={onViewTask} />;
  }
  // Completed task — use the existing TaskRecordCard
  return <TaskRecordCard task={item} onAddComment={onAddComment} isManager={true} />;
}

/**
 * Renders a collapsible card for a time period bucket (week, month, etc.)
 * Shows day-by-day breakdown for daily tasks.
 */
export default function PeriodBucketCard({
  bucket,
  frequency,
  expanded,
  onToggle,
  mode = "all", // "all" or "missed"
  onAddComment,
  onViewTask,
  hideHeader = false,
}) {
  const [expandedDays, setExpandedDays] = useState({});
  const isDaily = frequency === "daily" && bucket.dayBreakdowns;
  
  const items = mode === "missed" ? bucket.missedTasks : bucket.allTasks;
  const completedCount = bucket.completed;
  const missedCount = bucket.missed;
  const expectedCount = bucket.expected;
  const rate = expectedCount > 0 ? Math.round((completedCount / expectedCount) * 100) : 100;

  const toggleDay = (dayLabel) => {
    setExpandedDays(prev => ({ ...prev, [dayLabel]: !prev[dayLabel] }));
  };

  return (
    <Card className={cn(
      "overflow-hidden",
      missedCount > 0 ? "border-amber-200" : "border-slate-200"
    )}>
      {/* Header */}
      {!hideHeader && (
        <button
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          onClick={onToggle}
        >
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-900 text-sm">{bucket.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Badge className="bg-emerald-100 text-emerald-700 rounded-full">{completedCount} ✓</Badge>
              {missedCount > 0 && (
                <Badge className="bg-red-100 text-red-700 rounded-full">{missedCount} ✗</Badge>
              )}
              <span className="text-slate-400">/ {expectedCount}</span>
            </div>
            <span className={cn(
              "text-sm font-bold",
              rate >= 90 ? "text-emerald-600" : rate >= 70 ? "text-amber-600" : "text-red-600"
            )}>
              {rate}%
            </span>
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>
      )}

      {/* Content */}
      {expanded && (
        <CardContent className="pt-0 space-y-2 pb-4">
          {isDaily ? (
            // Day-by-day breakdown
            bucket.dayBreakdowns.map(day => {
              const dayItems = mode === "missed" ? day.missedTasks : day.allItems;
              if (mode === "missed" && day.missed === 0) return null;
              const dayExpanded = expandedDays[day.label] !== false;
              
              return (
                <div key={day.label} className="border border-slate-100 rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors"
                    onClick={() => toggleDay(day.label)}
                  >
                    <span className="text-sm text-slate-700 font-medium">{day.label}</span>
                    <div className="flex items-center gap-2 text-xs">
                      {day.completed > 0 && (
                        <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />{day.completed}
                        </span>
                      )}
                      {day.missed > 0 && (
                        <span className="text-red-600 font-semibold flex items-center gap-0.5">
                          <XCircle className="w-3 h-3" />{day.missed}
                        </span>
                      )}
                      <span className="text-slate-400">/ {day.expected}</span>
                      {dayExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                    </div>
                  </button>
                  {dayExpanded && dayItems.length > 0 && (
                    <div className="px-3 pb-3 space-y-1.5">
                      {dayItems.map((item, idx) => (
                        <AllTaskRow 
                          key={item.id || `${item.title}-${item.area}-${idx}`}
                          item={item}
                          onAddComment={onAddComment}
                          onViewTask={onViewTask}
                        />
                      ))}
                    </div>
                  )}
                  {dayExpanded && dayItems.length === 0 && day.expected > 0 && (
                    <div className="px-3 pb-3">
                      <p className="text-xs text-slate-400 text-center py-2">
                        {mode === "missed" ? "No missed tasks" : "No records for this day"}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            // Non-daily: flat list of items
            items.length > 0 ? (
              <div className="space-y-1.5">
                {items.map((item, idx) => (
                  <AllTaskRow 
                    key={item.id || `${item.title}-${item.area}-${idx}`}
                    item={item}
                    onAddComment={onAddComment}
                    onViewTask={onViewTask}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                {mode === "missed" ? "No missed tasks in this period" : "No records in this period"}
              </p>
            )
          )}
        </CardContent>
      )}
    </Card>
  );
}