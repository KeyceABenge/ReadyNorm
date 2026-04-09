import { useState, useMemo } from "react";

import { TrainingDocumentRepo, EmployeeTrainingRepo, TaskRepo } from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileText, Search, CheckCircle, BookOpen, 
  AlertTriangle, ClipboardList, GraduationCap, ExternalLink, Calendar,
  Shield, Clock, Send
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import TrainingDocumentViewer from "./TrainingDocumentViewer";
import { useTranslation, useContentTranslation } from "@/components/i18n";

const documentTypes = {
  ssop: { label: "SSOP", icon: ClipboardList, color: "bg-blue-100 text-blue-700" },
  sds: { label: "SDS", icon: AlertTriangle, color: "bg-red-100 text-red-700" },
  one_point_lesson: { label: "One Point Lesson", icon: BookOpen, color: "bg-emerald-100 text-emerald-700" },
  training_material: { label: "Training Material", icon: GraduationCap, color: "bg-purple-100 text-purple-700" },
  other: { label: "Other", icon: FileText, color: "bg-slate-100 text-slate-700" }
};

export default function EmployeeTrainingTab({ employee, organizationId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const queryClient = useQueryClient();
  const { t, language } = useTranslation();

  // Get employee's preferred language
  const lang = employee?.preferred_language || language;

  const { data: documents = [] } = useQuery({
    queryKey: ["training_documents", organizationId],
    queryFn: () => TrainingDocumentRepo.filter({ 
      organization_id: organizationId, 
      status: "active" 
    }, "-created_date"),
    enabled: !!organizationId
  });

  const { data: completedTrainings = [], refetch: refetchTrainings } = useQuery({
    queryKey: ["employee_trainings", employee?.id, organizationId],
    queryFn: () => EmployeeTrainingRepo.filter({ 
      organization_id: organizationId,
      employee_id: employee?.id 
    }),
    enabled: !!employee?.id && !!organizationId
  });

  // Fetch competency evaluations for this employee
  const { data: competencyEvaluations = [], refetch: refetchEvaluations } = useQuery({
    queryKey: ["competency_evaluations", employee?.id, organizationId],
    queryFn: () => CompetencyEvaluationRepo.filter({ 
      organization_id: organizationId,
      employee_id: employee?.id 
    }),
    enabled: !!employee?.id && !!organizationId
  });

  // Fetch tasks that require competency
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks_competency", organizationId],
    queryFn: () => TaskRepo.filter({ 
      organization_id: organizationId,
      requires_competency: true 
    }),
    enabled: !!organizationId
  });

  // Request evaluation mutation
  const requestEvaluationMutation = useMutation({
    mutationFn: async ({ trainingId, trainingTitle, taskId, taskTitle }) => {
      // Check if evaluation already exists and is in a non-final state
      const existing = competencyEvaluations.find(e => 
        e.training_id === trainingId && 
        e.status !== "not_competent" && 
        e.status !== "not_evaluated"
      );
      if (existing) {
        throw new Error("Evaluation already requested or in progress");
      }
      
      const training = completedTrainings.find(t => t.document_id === trainingId);
      
      // If there's an existing not_competent or not_evaluated record, update it instead of creating new
      const existingRecord = competencyEvaluations.find(e => e.training_id === trainingId);
      if (existingRecord) {
        return CompetencyEvaluationRepo.update(existingRecord.id, {
          status: "evaluation_required",
          training_completed_at: training?.completed_at,
          task_id: taskId,
          task_title: taskTitle
        });
      }
      
      return CompetencyEvaluationRepo.create({
        organization_id: organizationId,
        employee_id: employee.id,
        employee_email: employee.email,
        employee_name: employee.name,
        task_id: taskId,
        task_title: taskTitle,
        training_id: trainingId,
        training_title: trainingTitle,
        training_completed_at: training?.completed_at,
        status: "evaluation_required"
      });
    },
    onSuccess: () => {
      refetchEvaluations();
      queryClient.invalidateQueries({ queryKey: ["competency_evaluations"] });
      toast.success("Evaluation requested! A qualified evaluator will be notified.");
    },
    onError: (error) => {
      console.error("Evaluation request failed:", error);
      toast.error(error.message || "Failed to request evaluation. Please try again.");
    }
  });

  // Get competency status for a document
  const getCompetencyStatus = (docId) => {
    const evaluation = competencyEvaluations.find(e => e.training_id === docId);
    const task = tasks.find(t => t.required_training_id === docId);
    const requiresCompetency = task?.requires_competency;
    
    if (!requiresCompetency) return null;
    
    if (!evaluation) {
      return { status: "evaluation_required", label: "Evaluation Required", color: "bg-amber-100 text-amber-700" };
    }
    
    switch (evaluation.status) {
      case "competent":
        if (evaluation.expires_at && new Date(evaluation.expires_at) < new Date()) {
          return { status: "expired", label: "Competency Expired", color: "bg-rose-100 text-rose-700" };
        }
        return { status: "competent", label: "Fully Qualified", color: "bg-emerald-100 text-emerald-700" };
      case "evaluation_required":
        return { status: "pending", label: "Awaiting Evaluation", color: "bg-amber-100 text-amber-700" };
      case "scheduled":
        return { status: "scheduled", label: "Evaluation Scheduled", color: "bg-blue-100 text-blue-700" };
      case "needs_coaching":
        return { status: "coaching", label: "Needs Coaching", color: "bg-amber-100 text-amber-700" };
      case "not_competent":
        return { status: "not_competent", label: "Retraining Required", color: "bg-rose-100 text-rose-700" };
      default:
        return { status: "evaluation_required", label: "Evaluation Required", color: "bg-amber-100 text-amber-700" };
    }
  };

  const completedDocIds = new Set(completedTrainings.map(t => t.document_id));
  const getCompletionDate = (docId) => {
    const training = completedTrainings.find(t => t.document_id === docId);
    return training?.completed_at;
  };

  const filteredDocuments = documents.filter(doc => 
    !searchQuery || 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completedCount = filteredDocuments.filter(d => completedDocIds.has(d.id)).length;
  const totalCount = filteredDocuments.length;

  // Prepare content for translation - build object with titles and categories
  const contentToTranslate = useMemo(() => {
    if (lang === "en") return {};
    const content = {};
    filteredDocuments.forEach(doc => {
      if (doc.title) content[`title_${doc.id}`] = doc.title;
      if (doc.category) content[`cat_${doc.id}`] = doc.category;
    });
    return content;
  }, [filteredDocuments, lang]);

  const { translatedContent, isTranslating } = useContentTranslation(contentToTranslate, lang);

  if (selectedDocument) {
    return (
      <TrainingDocumentViewer
        document={selectedDocument}
        employee={employee}
        organizationId={organizationId}
        isCompleted={completedDocIds.has(selectedDocument.id)}
        onBack={() => setSelectedDocument(null)}
        onComplete={() => {
          refetchTrainings();
          setSelectedDocument(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">{t("training", "trainingProgress", "Training Progress")}</span>
            <span className="text-sm text-slate-500">{completedCount} / {totalCount} {t("status", "completed", "completed").toLowerCase()}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder={t("training", "searchTraining", "Search training materials...")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Documents */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <GraduationCap className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p>{t("training", "noTrainingMaterials", "No training materials available")}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredDocuments.map(doc => {
            const typeConfig = documentTypes[doc.type] || documentTypes.other;
            const TypeIcon = typeConfig.icon;
            const isCompleted = completedDocIds.has(doc.id);
            const completionDate = getCompletionDate(doc.id);
            const competencyStatus = isCompleted ? getCompetencyStatus(doc.id) : null;
            const task = tasks.find(t => t.required_training_id === doc.id);

            return (
              <Card 
                key={doc.id} 
                className={cn(
                  "cursor-pointer hover:shadow-md transition-shadow",
                  isCompleted && !competencyStatus && "border-emerald-200 bg-emerald-50/30",
                  isCompleted && competencyStatus?.status === "competent" && "border-emerald-200 bg-emerald-50/30",
                  isCompleted && competencyStatus?.status === "pending" && "border-amber-200 bg-amber-50/30",
                  isCompleted && competencyStatus?.status === "evaluation_required" && "border-amber-200 bg-amber-50/30"
                )}
                onClick={() => setSelectedDocument(doc)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg flex-shrink-0", isCompleted ? "bg-emerald-100 text-emerald-700" : typeConfig.color)}>
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : <TypeIcon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("font-medium truncate", isCompleted ? "text-emerald-700" : "text-slate-900")}>{translatedContent[`title_${doc.id}`] || doc.title}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{typeConfig.label}</Badge>
                        {doc.category && (
                          <span className="text-xs text-slate-500">{translatedContent[`cat_${doc.id}`] || doc.category}</span>
                        )}
                        {isCompleted && completionDate && (
                          <span className="text-xs text-emerald-600 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {t("status", "completed", "Completed")} {format(parseISO(completionDate), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                      
                      {/* Training completion status */}
                      {isCompleted && !competencyStatus && (
                        <p className="text-xs text-emerald-600 mt-1 font-medium">
                          ✓ {t("training", "trainingComplete", "Great job! Training complete")}
                        </p>
                      )}
                      
                      {/* Competency evaluation section */}
                      {isCompleted && competencyStatus && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              <Shield className="w-3 h-3 text-slate-500 flex-shrink-0" />
                              <span className="text-xs text-slate-600">{t("training", "performanceEvaluation", "Performance Evaluation")}:</span>
                              <Badge className={cn("text-xs py-0", competencyStatus.color)}>
                                {competencyStatus.label}
                              </Badge>
                            </div>
                            
                            {competencyStatus.status === "evaluation_required" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 flex-shrink-0 min-h-[44px] px-3"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  requestEvaluationMutation.mutate({
                                    trainingId: doc.id,
                                    trainingTitle: doc.title,
                                    taskId: task?.id,
                                    taskTitle: task?.title
                                  });
                                }}
                                disabled={requestEvaluationMutation.isPending}
                              >
                                {requestEvaluationMutation.isPending ? (
                                  <Clock className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3 mr-1" />
                                )}
                                {t("training", "requestEvaluation", "Request Evaluation")}
                              </Button>
                            )}
                          </div>
                          
                          {competencyStatus.status === "pending" && (
                            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {t("training", "awaitingEvaluator", "A qualified evaluator must observe you performing this task")}
                            </p>
                          )}
                          
                          {competencyStatus.status === "competent" && (
                            <p className="text-xs text-emerald-600 mt-1 font-medium">
                              ✓ {t("training", "fullyQualified", "Fully qualified to perform this task independently")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}