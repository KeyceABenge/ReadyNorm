import React, { useState, useMemo } from "react";
import { TrainingQuizRepo, EmployeeTrainingRepo } from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, ExternalLink, CheckCircle, Loader2,
  FileText, AlertTriangle, BookOpen, ClipboardList, GraduationCap, HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import TrainingQuizModal from "./TrainingQuizModal";
import { useTranslation, useContentTranslation } from "@/components/i18n";
import ProxiedImage from "@/components/ui/ProxiedImage";
import ProxiedIframe from "@/components/ui/ProxiedIframe";
import { getProxiedFileUrl } from "@/lib/imageProxy";

const documentTypes = {
  ssop: { label: "SSOP", icon: ClipboardList, color: "bg-blue-100 text-blue-700" },
  sds: { label: "SDS", icon: AlertTriangle, color: "bg-red-100 text-red-700" },
  one_point_lesson: { label: "One Point Lesson", icon: BookOpen, color: "bg-emerald-100 text-emerald-700" },
  training_material: { label: "Training Material", icon: GraduationCap, color: "bg-purple-100 text-purple-700" },
  other: { label: "Other", icon: FileText, color: "bg-slate-100 text-slate-700" }
};

export default function TrainingDocumentViewer({ 
  document, 
  employee, 
  organizationId,
  isCompleted,
  onBack, 
  onComplete 
}) {
  const [hasRead, setHasRead] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();

  const typeConfig = documentTypes[document.type] || documentTypes.other;
  const TypeIcon = typeConfig.icon;

  // Get employee's preferred language
  const lang = employee?.preferred_language || "en";

  // Content to translate
  const contentToTranslate = useMemo(() => {
    if (lang === "en") return {};
    return {
      title: document.title,
      category: document.category,
      description: document.description
    };
  }, [document, lang]);

  const { translatedContent } = useContentTranslation(contentToTranslate, lang);

  // Fetch existing quiz for this document
  // Only show approved quizzes to employees
  const { data: quizzes = [], isLoading: loadingQuiz } = useQuery({
    queryKey: ["training_quiz", document.id],
    queryFn: async () => {
      const result = await TrainingQuizRepo.filter({ document_id: document.id });
      // Filter approved quizzes client-side to ensure we get results
      return result.filter(q => q.status === "approved");
    },
    enabled: !!document.id
  });

  const approvedQuiz = quizzes?.[0];

  const handleQuizPass = async () => {
    setIsSubmitting(true);
    try {
      await EmployeeTrainingRepo.create({
        organization_id: organizationId,
        employee_id: employee.id,
        employee_email: employee.email,
        employee_name: employee.name,
        document_id: document.id,
        document_title: document.title,
        completed_at: new Date().toISOString(),
        status: "completed"
      });

      toast.success("Training completed! 🎉");
      onComplete();
    } catch (error) {
      console.error("Error marking training complete:", error);
      toast.error("Failed to save completion");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(document.file_url || '');
  const isPdf = /\.pdf$/i.test(document.file_url || '');
  const isViewableDoc = isPdf || /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(document.file_url || '');
  
  // State for document viewer fallback
  const [viewerFailed, setViewerFailed] = React.useState(false);

  // If showing quiz
  if (showQuiz && approvedQuiz) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setShowQuiz(false)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="font-semibold text-lg text-slate-900">{t("training", "quiz", "Quiz")}: {translatedContent.title || document.title}</h2>
            <p className="text-sm text-slate-500">{t("training", "answerAllToComplete", "Answer all questions correctly to complete training")}</p>
          </div>
        </div>

        <TrainingQuizModal 
          quiz={approvedQuiz}
          onPass={handleQuizPass}
          onFail={() => {}}
          isSubmitting={isSubmitting}
          employeeLanguage={lang}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="font-semibold text-lg text-slate-900">{translatedContent.title || document.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
            {document.category && (
              <span className="text-sm text-slate-500">{translatedContent.category || document.category}</span>
            )}
          </div>
        </div>
        {isCompleted && (
          <Badge className="bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t("status", "completed", "Completed")}
          </Badge>
        )}
      </div>

      {/* Description */}
      {document.description && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">{translatedContent.description || document.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Document Preview */}
      <Card>
        <CardContent className="p-4">
          {isImage ? (
            <ProxiedImage 
              src={document.file_url} 
              alt={document.title}
              className="w-full max-h-[500px] object-contain rounded-lg"
            />
          ) : isPdf && !viewerFailed ? (
            /* Route PDF through first-party proxy — no Google Docs Viewer needed */
            <ProxiedIframe
              src={`${document.file_url}#toolbar=1`}
              title={document.title}
              className="w-full h-[500px] rounded-lg border"
              fallbackMessage="PDF preview couldn't load — open the document directly instead"
            />
          ) : isViewableDoc && !viewerFailed ? (
            /* Non-PDF docs (Word, Excel) — offer direct download via proxy */
            <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-slate-50 rounded-lg border">
              <FileText className="w-16 h-16 text-slate-300" />
              <div className="text-center px-4">
                <p className="font-medium text-slate-700 mb-1">{document.title}</p>
                <p className="text-sm text-slate-500 mb-4">
                  This document type needs to be opened directly
                </p>
              </div>
              <Button 
                onClick={() => window.open(getProxiedFileUrl(document.file_url), "_blank", "noopener,noreferrer")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {t("training", "openDocument", "Open Document")}
              </Button>
            </div>
          ) : (
            /* Fallback: Prominent open-in-new-tab prompt */
            <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-slate-50 rounded-lg border">
              <FileText className="w-16 h-16 text-slate-300" />
              <div className="text-center px-4">
                <p className="font-medium text-slate-700 mb-1">{document.title}</p>
                <p className="text-sm text-slate-500 mb-4">
                  Preview couldn't load — open the document directly instead
                </p>
              </div>
              <Button 
                onClick={() => window.open(getProxiedFileUrl(document.file_url), "_blank", "noopener,noreferrer")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {t("training", "openDocument", "Open Document")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open in new tab button for all types */}
      <Button 
        variant="outline" 
        className="w-full"
        onClick={() => window.open(getProxiedFileUrl(document.file_url), "_blank", "noopener,noreferrer")}
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        {t("training", "openInNewTab", "Open in New Tab")}
      </Button>

      {/* Completion Section */}
      {!isCompleted && (
        <Card className="border-slate-200">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-medium text-slate-900">{t("training", "completeTraining", "Complete Training")}</h3>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox 
                  checked={hasRead}
                  onCheckedChange={setHasRead}
                  className="mt-0.5"
                />
                <span className="text-sm text-slate-600">
                  {t("training", "haveReadMaterial", "I have read and reviewed this training material")}
                </span>
              </label>
            </div>

            {/* Quiz Section */}
            {hasRead && (
              <div className="border-t pt-4 mt-4">
                {loadingQuiz ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-500 mt-2">Loading quiz...</p>
                  </div>
                ) : approvedQuiz && approvedQuiz.questions && approvedQuiz.questions.length > 0 ? (
                  <>
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => setShowQuiz(true)}
                    >
                      <HelpCircle className="w-4 h-4 mr-2" />
                      {t("training", "takeQuizToComplete", "Take Quiz to Complete")} ({approvedQuiz.questions.length} {t("training", "questions", "questions")})
                    </Button>
                    <p className="text-xs text-slate-500 text-center mt-2">
                      {t("training", "mustPassQuiz", "You must pass the quiz to complete this training")}
                    </p>
                  </>
                ) : (
                  <>
                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleQuizPass}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      {t("training", "markAsComplete", "Mark as Complete")}
                    </Button>
                    <p className="text-xs text-slate-500 text-center mt-2">
                      {t("training", "noQuizRequired", "No quiz required for this training")}
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}