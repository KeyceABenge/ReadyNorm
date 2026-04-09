import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GraduationCap, AlertTriangle } from "lucide-react";

export default function TaskTrainingPopup({ open, onOpenChange, task, onGoToTraining }) {
  if (!open || !task) return null;

  const trainingTitle = task.required_training_title || "Required Training";

  const handleGoToTraining = () => {
    onGoToTraining?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            Training Required
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-slate-600">
            You need to complete training before you can start this task:
          </p>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="font-semibold text-slate-900 mb-2">{task.title}</p>
            <div className="flex items-center gap-2 text-amber-700">
              <GraduationCap className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{trainingTitle}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={handleGoToTraining}>
            <GraduationCap className="w-4 h-4 mr-2" />
            Go to Training
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}