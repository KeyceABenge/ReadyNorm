import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TrainingRequiredModal({ 
  open, 
  onOpenChange, 
  tasksWithMissingTraining = [],
  onContinue
}) {
  if (tasksWithMissingTraining.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            Training Required
          </DialogTitle>
          <DialogDescription>
            Some tasks you selected require training that you haven't completed yet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {tasksWithMissingTraining.map((item, idx) => (
            <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="font-medium text-slate-900 text-sm">{item.taskTitle}</p>
              <div className="flex items-center gap-2 mt-2">
                <GraduationCap className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-700">
                  Required: {item.trainingTitle}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-600">
            You can still proceed with these tasks, but please complete the required training as soon as possible.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <Link to={createPageUrl("EmployeeProfile") + "?tab=training"}>
            <Button className="w-full bg-amber-600 hover:bg-amber-700">
              <GraduationCap className="w-4 h-4 mr-2" />
              Go to Training
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={onContinue}
            className="w-full"
          >
            Continue Anyway
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}