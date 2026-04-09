import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, FileText, Calendar, User, Tag, Timer, ExternalLink, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import CoachingActionButton from "@/components/coaching/CoachingActionButton";

export default function TaskRecordCard({ task, onAddComment, isManager }) {
  const priorityConfig = {
    low: { class: "bg-blue-100 text-blue-800 border-blue-200", label: "Low" },
    medium: { class: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Medium" },
    high: { class: "bg-orange-100 text-orange-800 border-orange-200", label: "High" },
    critical: { class: "bg-rose-100 text-rose-800 border-rose-200", label: "Critical" }
  };

  const statusConfig = {
    completed: { class: "bg-emerald-100 text-emerald-800", label: "Completed", icon: CheckCircle2 },
    verified: { class: "bg-purple-100 text-purple-800", label: "Verified", icon: CheckCircle2 }
  };

  const config = statusConfig[task.status] || statusConfig.completed;
  const StatusIcon = config.icon;

  return (
    <Card className="p-6 bg-white border shadow-sm hover:shadow-md transition-shadow relative">
      {/* Manager Actions */}
      {isManager && task.status === "completed" && (
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <CoachingActionButton
            situationType="performance"
            title={`Feedback on: ${task.title}`}
            details={`Task completed by ${task.assigned_to_name} in ${task.area}. ${task.completion_notes || ''}`}
            employeeName={task.assigned_to_name}
            employeeEmail={task.assigned_to}
            additionalContext={{
              area: task.area,
              frequency: task.frequency,
              completedAt: task.completed_at
            }}
            variant="ghost"
            size="sm"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAddComment?.(task)}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Comment
          </Button>
        </div>
      )}
      
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
          <Badge className={cn("border", config.class)}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
          {task.priority && (
            <Badge className={cn("border", priorityConfig[task.priority]?.class)}>
              {priorityConfig[task.priority]?.label || task.priority}
            </Badge>
          )}
        </div>
        
        {task.description && (
          <p className="text-sm text-slate-600">{task.description}</p>
        )}
      </div>

      <div className="flex items-start gap-4">
        {/* LEFT COLUMN - Details Grid */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-2 gap-4">
            {task.area && (
              <div className="flex items-center gap-2 text-sm">
                <Tag className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Area</p>
                  <p className="font-medium text-slate-700">{task.area}</p>
                </div>
              </div>
            )}
            
            {task.category && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Category</p>
                  <p className="font-medium text-slate-700">{task.category}</p>
                </div>
              </div>
            )}
            
            {task.frequency && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Frequency</p>
                  <p className="font-medium text-slate-700">{task.frequency}</p>
                </div>
              </div>
            )}
            
            {task.duration && (
              <div className="flex items-center gap-2 text-sm">
                <Timer className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Duration</p>
                  <p className="font-medium text-slate-700">{task.duration} min</p>
                </div>
              </div>
            )}
            
            {task.assigned_to_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Completed By</p>
                  <p className="font-medium text-slate-700">{task.assigned_to_name}</p>
                </div>
              </div>
            )}
            
            {task.completed_at && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Completed On</p>
                  <p className="font-medium text-slate-700">
                    {format(parseISO(task.completed_at), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* SSOP Link */}
          {task.ssop_url && (
            <div className="mt-4 pt-4 border-t">
              <a 
                href={task.ssop_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                <FileText className="w-4 h-4" />
                View SSOP
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Completion Notes */}
          {task.completion_notes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-slate-500 mb-1">Notes:</p>
              <p className="text-sm text-slate-700">{task.completion_notes}</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - Signature */}
        <div className="w-28 shrink-0 flex-shrink-0">
          <p className="text-xs text-slate-500 mb-2">Signature:</p>
          {task.signature_data ? (
            <div className="border rounded-lg p-2 bg-slate-50">
              <img 
                src={task.signature_data} 
                alt="Signature" 
                className="h-16 w-auto"
              />
            </div>
          ) : (
            <div className="border border-dashed rounded-lg p-2 bg-slate-50 h-20 flex items-center justify-center">
              <span className="text-xs text-slate-400">No signature</span>
            </div>
          )}
          {task.completed_at && (
            <p className="text-[10px] text-slate-400 mt-1 text-center">
              {format(parseISO(task.completed_at), "MMM d, h:mm a")}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}