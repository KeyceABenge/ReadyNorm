import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, GraduationCap, CheckCircle2, FileText, ExternalLink } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function HelperTrainingModal({ open, onOpenChange, helper, task, onComplete }) {
  const [viewingDoc, setViewingDoc] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const queryClient = useQueryClient();

  const { data: trainingDoc, isLoading } = useQuery({
    queryKey: ["training-doc", task?.required_training_id],
    queryFn: async () => {
      if (!task?.required_training_id) return null;
      const docs = await TrainingDocumentRepo.filter({ id: task.required_training_id });
      return docs[0] || null;
    },
    enabled: !!task?.required_training_id && open
  });

  const { data: existingTraining } = useQuery({
    queryKey: ["helper-training-check", helper?.id, task?.required_training_id],
    queryFn: async () => {
      const trainings = await HelperTrainingRepo.filter({
        helper_id: helper?.id,
        document_id: task?.required_training_id
      });
      return trainings[0] || null;
    },
    enabled: !!helper?.id && !!task?.required_training_id && open
  });

  const handleCompleteTraining = async () => {
    if (!helper || !trainingDoc) return;
    
    setIsCompleting(true);
    try {
      await HelperTrainingRepo.create({
        organization_id: helper.organization_id,
        helper_id: helper.id,
        helper_name: helper.name,
        document_id: trainingDoc.id,
        document_title: trainingDoc.title,
        completed_at: new Date().toISOString(),
        status: "completed"
      });
      
      queryClient.invalidateQueries({ queryKey: ["helper-trainings"] });
      queryClient.invalidateQueries({ queryKey: ["helper-training-check"] });
      onComplete?.();
    } catch (error) {
      console.error("Error completing training:", error);
      toast.error("Failed to record training completion");
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (existingTraining) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Training Already Completed
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              You have already completed the required training for this task. You can proceed with the task.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => { onOpenChange(false); onComplete?.(); }}>
              Continue to Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-amber-600" />
            Training Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Task:</strong> {task?.title}
            </p>
            <p className="text-sm text-amber-700 mt-1">
              You must complete the following training before you can sign off on this task.
            </p>
          </div>

          {trainingDoc ? (
            <Card className="p-4 border-2">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900">{trainingDoc.title}</h3>
                  {trainingDoc.description && (
                    <p className="text-sm text-slate-600 mt-1">{trainingDoc.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{trainingDoc.type?.replace("_", " ")}</Badge>
                    {trainingDoc.category && (
                      <Badge variant="outline">{trainingDoc.category}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {trainingDoc.file_url && (
                <div className="mt-4 pt-4 border-t">
                  <a 
                    href={trainingDoc.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Training Document
                  </a>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-4 text-center text-slate-500">
              Training document not found. Please contact a manager.
            </Card>
          )}

          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-3">
              After reviewing the training material, click below to confirm completion:
            </p>
            <Button 
              onClick={handleCompleteTraining}
              disabled={isCompleting || !trainingDoc}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {isCompleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              I Have Completed This Training
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}