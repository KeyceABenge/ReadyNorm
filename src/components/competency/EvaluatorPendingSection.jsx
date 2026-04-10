import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Shield, User, FileText, 
  ClipboardCheck
} from "lucide-react";
import { parseISO, differenceInDays } from "date-fns";
import CompetencyEvaluationModal from "./CompetencyEvaluationModal";
import { CompetencyEvaluationRepo, EvaluatorSettingsRepo, SSOPRepo } from "@/lib/adapters/database";

export default function EvaluatorPendingSection({ employee, organizationId }) {
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);

  // Fetch evaluator settings to check if employee can evaluate
  const { data: evaluatorSettings } = useQuery({
    queryKey: ["evaluator_settings", organizationId],
    queryFn: async () => {
      const settings = await EvaluatorSettingsRepo.filter({ 
        organization_id: organizationId 
      });
      return settings[0] || null;
    },
    enabled: !!organizationId
  });

  // Fetch pending evaluations
  const { data: pendingEvaluations = [], refetch } = useQuery({
    queryKey: ["pending_evaluations_for_evaluator", organizationId],
    queryFn: () => CompetencyEvaluationRepo.filter({ 
      organization_id: organizationId,
      status: "evaluation_required"
    }, "-created_date"),
    enabled: !!organizationId
  });

  // Fetch SSOPs for evaluation checklist
  const { data: ssops = [] } = useQuery({
    queryKey: ["ssops", organizationId],
    queryFn: () => SSOPRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  // Check if current employee can be an evaluator
  const canEvaluate = () => {
    if (!employee?.evaluator_role || employee.evaluator_role === "none") {
      return false;
    }
    
    if (!evaluatorSettings) {
      // Default: supervisors and managers can evaluate
      return ["supervisor", "manager"].includes(employee.evaluator_role);
    }
    
    const eligibleRoles = evaluatorSettings.eligible_roles || ["supervisor", "manager"];
    return eligibleRoles.includes(employee.evaluator_role);
  };

  // Don't show section if employee can't evaluate
  if (!canEvaluate()) {
    return null;
  }

  // Filter evaluations - don't show self-evaluations
  const availableEvaluations = pendingEvaluations.filter(e => 
    e.employee_email !== employee.email
  );

  if (availableEvaluations.length === 0) {
    return null;
  }

  const handleStartEvaluation = (evaluation) => {
    setSelectedEvaluation(evaluation);
    setEvaluationModalOpen(true);
  };

  const handleEvaluationComplete = () => {
    setEvaluationModalOpen(false);
    setSelectedEvaluation(null);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-slate-900">Pending Evaluations</h2>
        <Badge className="bg-amber-100 text-amber-700">{availableEvaluations.length}</Badge>
      </div>
      
      <p className="text-sm text-slate-500">
        Employees awaiting competency evaluation from you
      </p>

      <div className="space-y-3">
        {availableEvaluations.slice(0, 5).map(evaluation => {
          const waitDays = differenceInDays(new Date(), parseISO(evaluation.created_date));
          
          return (
            <Card 
              key={evaluation.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleStartEvaluation(evaluation)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-slate-900 truncate">
                        {evaluation.employee_name}
                      </p>
                      {waitDays > 3 && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs">
                          Waiting {waitDays}d
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <FileText className="w-3 h-3" />
                      <span className="truncate">{evaluation.training_title}</span>
                    </div>
                    
                    {evaluation.task_title && (
                      <p className="text-xs text-slate-400 mt-1">
                        Task: {evaluation.task_title}
                      </p>
                    )}
                  </div>
                  
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 flex-shrink-0">
                    <ClipboardCheck className="w-4 h-4 mr-1" />
                    Evaluate
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {availableEvaluations.length > 5 && (
          <p className="text-sm text-slate-500 text-center">
            +{availableEvaluations.length - 5} more pending evaluations
          </p>
        )}
      </div>

      {/* Evaluation Modal */}
      <CompetencyEvaluationModal
        open={evaluationModalOpen}
        onOpenChange={setEvaluationModalOpen}
        evaluation={selectedEvaluation}
        evaluator={employee}
        ssops={ssops}
        onComplete={handleEvaluationComplete}
      />
    </div>
  );
}