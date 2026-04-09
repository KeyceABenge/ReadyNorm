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
import { 
  Loader2, CheckCircle2, FileText, ExternalLink, 
  Factory
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function HelperLineTrainingModal({ 
  open, 
  onOpenChange, 
  helper, 
  lineCleaning, 
  pendingTrainings,
  onAllComplete 
}) {
  const [completingId, setCompletingId] = useState(null);
  const [completedIds, setCompletedIds] = useState([]);
  const queryClient = useQueryClient();

  const { data: trainingDocs = [] } = useQuery({
    queryKey: ["training-docs-for-line", pendingTrainings?.map(t => t.id)],
    queryFn: async () => {
      if (!pendingTrainings?.length) return [];
      const docs = await TrainingDocumentRepo.filter({
        organization_id: helper?.organization_id,
        status: "active"
      });
      return docs.filter(d => pendingTrainings.some(t => t.id === d.id));
    },
    enabled: !!pendingTrainings?.length && open
  });

  const handleCompleteTraining = async (training) => {
    if (!helper) return;
    
    setCompletingId(training.id);
    try {
      await HelperTrainingRepo.create({
        organization_id: helper.organization_id,
        helper_id: helper.id,
        helper_name: helper.name,
        document_id: training.id,
        document_title: training.title,
        completed_at: new Date().toISOString(),
        status: "completed"
      });
      
      setCompletedIds(prev => [...prev, training.id]);
      queryClient.invalidateQueries({ queryKey: ["helper-trainings"] });
      
      // Check if all trainings are now complete
      const remaining = pendingTrainings.filter(t => 
        t.id !== training.id && !completedIds.includes(t.id)
      );
      
      if (remaining.length === 0) {
        toast.success("All training complete! You can now join the line cleaning.");
        onAllComplete?.();
      } else {
        toast.success("Training completed!");
      }
    } catch (error) {
      console.error("Error completing training:", error);
      toast.error("Failed to record training completion");
    } finally {
      setCompletingId(null);
    }
  };

  const remainingTrainings = pendingTrainings?.filter(t => !completedIds.includes(t.id)) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-600" />
            Line Cleaning Training Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="font-medium text-blue-900">{lineCleaning?.production_line_name}</p>
            <p className="text-sm text-blue-700 mt-1">
              Complete all required training before joining this line cleaning.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-200 rounded-full h-2">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ 
                  width: `${((pendingTrainings?.length - remainingTrainings.length) / pendingTrainings?.length) * 100}%` 
                }}
              />
            </div>
            <span className="text-sm text-slate-600">
              {pendingTrainings?.length - remainingTrainings.length} / {pendingTrainings?.length}
            </span>
          </div>

          {/* Training list */}
          <div className="space-y-3">
            {pendingTrainings?.map(training => {
              const isCompleted = completedIds.includes(training.id);
              const isLoading = completingId === training.id;
              const doc = trainingDocs.find(d => d.id === training.id);
              
              return (
                <Card 
                  key={training.id} 
                  className={cn(
                    "p-4 border-2 transition-all",
                    isCompleted 
                      ? "border-emerald-200 bg-emerald-50" 
                      : "border-slate-200"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      isCompleted ? "bg-emerald-100" : "bg-blue-100"
                    )}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <FileText className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{training.title}</h3>
                        {isCompleted && (
                          <Badge className="bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Complete
                          </Badge>
                        )}
                      </div>
                      {doc?.description && (
                        <p className="text-sm text-slate-600 mt-1">{doc.description}</p>
                      )}
                      {doc?.file_url && !isCompleted && (
                        <a 
                          href={doc.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm mt-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Document
                        </a>
                      )}
                    </div>
                    {!isCompleted && (
                      <Button 
                        size="sm"
                        onClick={() => handleCompleteTraining(training)}
                        disabled={isLoading}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Complete
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {remainingTrainings.length === 0 && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="font-medium text-emerald-900">All Training Complete!</p>
              <p className="text-sm text-emerald-700">You can now join the line cleaning.</p>
              <Button 
                onClick={() => { onOpenChange(false); onAllComplete?.(); }}
                className="mt-3 bg-emerald-600 hover:bg-emerald-700"
              >
                Continue to Line Cleaning
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}