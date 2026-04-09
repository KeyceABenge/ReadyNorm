import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardCheck, Clock, Calendar, Play, CheckCircle2
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import CompetencyEvaluationModal from "./CompetencyEvaluationModal";

export default function PendingEvaluationsQueue({ 
  evaluations = [], 
  ssops = [],
  onRefresh 
}) {
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [evalModalOpen, setEvalModalOpen] = useState(false);

  // Filter to pending evaluations only
  const pendingEvaluations = evaluations.filter(e => 
    e.status === "evaluation_required" || e.status === "scheduled"
  );

  const getWaitingDays = (evaluation) => {
    if (!evaluation.training_completed_at) return 0;
    return differenceInDays(new Date(), parseISO(evaluation.training_completed_at));
  };

  const handleStartEvaluation = (evaluation) => {
    setSelectedEvaluation(evaluation);
    setEvalModalOpen(true);
  };

  const getSsopForEvaluation = (evaluation) => {
    return ssops.find(s => 
      s.asset_id === evaluation.task_id || 
      s.title?.toLowerCase().includes(evaluation.task_title?.toLowerCase())
    );
  };

  if (pendingEvaluations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
          <p className="text-slate-500">No pending evaluations</p>
          <p className="text-sm text-slate-400 mt-1">All employees are up to date with their competency evaluations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-amber-600" />
          Pending Evaluations ({pendingEvaluations.length})
        </h3>
      </div>

      <div className="space-y-3">
        {pendingEvaluations
          .sort((a, b) => getWaitingDays(b) - getWaitingDays(a))
          .map(evaluation => {
            const waitingDays = getWaitingDays(evaluation);
            const isUrgent = waitingDays > 14;
            
            return (
              <Card 
                key={evaluation.id}
                className={cn(
                  "transition-colors",
                  isUrgent ? "border-amber-200 bg-amber-50/50" : ""
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700">
                          {evaluation.employee_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??"}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{evaluation.employee_name}</p>
                          <p className="text-xs text-slate-500">{evaluation.employee_email}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-slate-700">
                          <span className="font-medium">Task:</span> {evaluation.task_title || "N/A"}
                        </p>
                        <p className="text-sm text-slate-700">
                          <span className="font-medium">Training:</span> {evaluation.training_title || "N/A"}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <Badge className={cn(
                          "text-xs",
                          evaluation.status === "scheduled" 
                            ? "bg-blue-100 text-blue-700" 
                            : "bg-amber-100 text-amber-700"
                        )}>
                          {evaluation.status === "scheduled" ? "Scheduled" : "Awaiting Evaluation"}
                        </Badge>
                        
                        {evaluation.training_completed_at && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Training completed {format(parseISO(evaluation.training_completed_at), "MMM d")}
                          </span>
                        )}
                        
                        <span className={cn(
                          "text-xs flex items-center gap-1",
                          isUrgent ? "text-amber-600 font-medium" : "text-slate-500"
                        )}>
                          <Clock className="w-3 h-3" />
                          {waitingDays} day{waitingDays !== 1 ? "s" : ""} waiting
                        </span>
                        
                        {evaluation.scheduled_date && (
                          <span className="text-xs text-blue-600 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Scheduled for {format(parseISO(evaluation.scheduled_date), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleStartEvaluation(evaluation)}
                      className="bg-amber-600 hover:bg-amber-700 flex-shrink-0"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Evaluate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      <CompetencyEvaluationModal
        open={evalModalOpen}
        onOpenChange={setEvalModalOpen}
        evaluation={selectedEvaluation}
        ssops={ssops}
        isManager={true}
        onComplete={() => {
          onRefresh?.();
          setSelectedEvaluation(null);
        }}
      />
    </div>
  );
}