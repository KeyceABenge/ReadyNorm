import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, Clock, AlertTriangle, XCircle, 
  GraduationCap, ClipboardCheck, Calendar, Send
} from "lucide-react";
import CoachingActionButton from "@/components/coaching/CoachingActionButton";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export default function EmployeeCompetencyCard({ 
  training,
  evaluation,
  task,
  onRequestEvaluation,
  isLoading
}) {
  // Determine status
  const hasTraining = !!training;
  const hasEvaluation = !!evaluation;
  const requiresCompetency = task?.requires_competency;

  let status = "not_started";
  let statusLabel = "Training Required";
  let statusColor = "bg-slate-100 text-slate-700";
  let statusIcon = GraduationCap;

  if (hasTraining) {
    if (!requiresCompetency) {
      status = "qualified";
      statusLabel = "Qualified (Training Only)";
      statusColor = "bg-emerald-100 text-emerald-700";
      statusIcon = CheckCircle2;
    } else if (!hasEvaluation || evaluation.status === "not_evaluated") {
      status = "evaluation_required";
      statusLabel = "Evaluation Required";
      statusColor = "bg-amber-100 text-amber-700";
      statusIcon = ClipboardCheck;
    } else if (evaluation.status === "evaluation_required") {
      status = "evaluation_required";
      statusLabel = "Awaiting Evaluation";
      statusColor = "bg-amber-100 text-amber-700";
      statusIcon = Clock;
    } else if (evaluation.status === "scheduled") {
      status = "scheduled";
      statusLabel = "Evaluation Scheduled";
      statusColor = "bg-blue-100 text-blue-700";
      statusIcon = Calendar;
    } else if (evaluation.status === "competent") {
      // Check expiration
      if (evaluation.expires_at && new Date(evaluation.expires_at) < new Date()) {
        status = "expired";
        statusLabel = "Competency Expired";
        statusColor = "bg-rose-100 text-rose-700";
        statusIcon = AlertTriangle;
      } else {
        status = "qualified";
        statusLabel = "Fully Qualified";
        statusColor = "bg-emerald-100 text-emerald-700";
        statusIcon = CheckCircle2;
      }
    } else if (evaluation.status === "needs_coaching") {
      status = "needs_coaching";
      statusLabel = "Needs Coaching";
      statusColor = "bg-amber-100 text-amber-700";
      statusIcon = AlertTriangle;
    } else if (evaluation.status === "not_competent") {
      status = "not_competent";
      statusLabel = "Not Competent - Retraining Required";
      statusColor = "bg-rose-100 text-rose-700";
      statusIcon = XCircle;
    }
  }

  const StatusIcon = statusIcon;

  return (
    <Card className={cn(
      "transition-colors",
      status === "qualified" && "border-emerald-200 bg-emerald-50/30",
      status === "evaluation_required" && "border-amber-200 bg-amber-50/30",
      status === "needs_coaching" && "border-amber-200 bg-amber-50/30",
      status === "not_competent" && "border-rose-200 bg-rose-50/30",
      status === "expired" && "border-rose-200 bg-rose-50/30"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon className={cn(
                "w-5 h-5",
                status === "qualified" && "text-emerald-600",
                (status === "evaluation_required" || status === "scheduled" || status === "needs_coaching") && "text-amber-600",
                (status === "not_competent" || status === "expired") && "text-rose-600",
                status === "not_started" && "text-slate-400"
              )} />
              <Badge className={statusColor}>{statusLabel}</Badge>
            </div>
            
            <h4 className="font-medium text-slate-900">{task?.title || training?.document_title}</h4>
            {task?.area && <p className="text-sm text-slate-500">{task.area}</p>}
            
            {/* Training completion info */}
            {hasTraining && (
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                Training completed {format(parseISO(training.completed_at), "MMM d, yyyy")}
              </p>
            )}
            
            {/* Evaluation info */}
            {hasEvaluation && evaluation.evaluated_at && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <ClipboardCheck className="w-3 h-3" />
                Evaluated {format(parseISO(evaluation.evaluated_at), "MMM d, yyyy")}
                {evaluation.evaluator_name && ` by ${evaluation.evaluator_name}`}
              </p>
            )}
            
            {/* Expiration warning */}
            {status === "qualified" && evaluation?.expires_at && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Re-evaluation due by {format(parseISO(evaluation.expires_at), "MMM d, yyyy")}
              </p>
            )}
            
            {/* Coaching notes */}
            {evaluation?.coaching_notes && status === "needs_coaching" && (
              <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                <p className="text-xs font-medium text-amber-800">Coaching Notes:</p>
                <p className="text-xs text-amber-700 mt-1">{evaluation.coaching_notes}</p>
                {evaluation.re_eval_allowed_after && (
                  <p className="text-xs text-amber-600 mt-1">
                    Re-evaluation allowed after {format(parseISO(evaluation.re_eval_allowed_after), "MMM d, yyyy")}
                  </p>
                )}
                <div className="mt-2">
                  <CoachingActionButton
                    situationType="competency"
                    title={`Coaching needed: ${evaluation.employee_name}`}
                    details={`Competency evaluation for "${task?.title || training?.document_title}" resulted in needs coaching. ${evaluation.coaching_notes || ''}`}
                    employeeName={evaluation.employee_name}
                    employeeEmail={evaluation.employee_email}
                    additionalContext={{
                      trainingTitle: task?.title || training?.document_title,
                      evaluatorNotes: evaluation.coaching_notes
                    }}
                    size="sm"
                    variant="outline"
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                  />
                </div>
              </div>
            )}
            
            {/* Retraining required */}
            {evaluation?.retraining_required && status === "not_competent" && (
              <div className="mt-2 p-2 bg-rose-50 rounded border border-rose-200">
                <p className="text-xs font-medium text-rose-800">Retraining Required</p>
                <p className="text-xs text-rose-700 mt-1">
                  Complete training again before re-evaluation
                </p>
                <div className="mt-2">
                  <CoachingActionButton
                    situationType="competency"
                    title={`Retraining needed: ${evaluation.employee_name}`}
                    details={`Failed competency evaluation for "${task?.title || training?.document_title}". Retraining required before re-evaluation.`}
                    employeeName={evaluation.employee_name}
                    employeeEmail={evaluation.employee_email}
                    additionalContext={{
                      trainingTitle: task?.title || training?.document_title,
                      evaluatorComments: evaluation.comments
                    }}
                    size="sm"
                    variant="outline"
                    className="w-full border-rose-300 text-rose-700 hover:bg-rose-100"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Actions */}
          {status === "evaluation_required" && (
            <Button
              size="sm"
              onClick={onRequestEvaluation}
              disabled={isLoading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Send className="w-4 h-4 mr-1" />
              Request Evaluation
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}