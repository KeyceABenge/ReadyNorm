// @ts-nocheck
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CheckCircle2, Shield, User, AlertTriangle, 
  Clock, ChevronDown, ChevronUp, Loader2 
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import ManagerSignaturePad from "./ManagerSignaturePad";

export default function BulkShiftVerificationModal({ 
  open, 
  onClose, 
  shiftGroup,
  onBulkVerify,
  isLoading 
}) {
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [verificationNotes, setVerificationNotes] = useState("");
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [managerSignature, setManagerSignature] = useState(null);

  const tasks = shiftGroup?.tasks || [];

  // Initialize all tasks as selected when modal opens
  useMemo(() => {
    if (open && tasks.length > 0) {
      setSelectedTasks(new Set(tasks.map(t => t.id)));
    }
  }, [open, tasks]);

  const toggleTask = (taskId) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const toggleAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map(t => t.id)));
    }
  };

  const toggleExpanded = (taskId) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const handleBulkVerify = () => {
    const taskIds = Array.from(selectedTasks);
    onBulkVerify(taskIds, verificationNotes, managerSignature);
  };

  const resetAndClose = () => {
    setSelectedTasks(new Set());
    setVerificationNotes("");
    setExpandedTasks(new Set());
    setManagerSignature(null);
    onClose();
  };

  if (!shiftGroup) return null;

  const tasksWithSignature = tasks.filter(t => t.signature_data).length;
  const tasksWithoutSignature = tasks.length - tasksWithSignature;

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Bulk Verify Shift Tasks
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Shift Summary */}
          <div className="p-4 bg-slate-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-slate-900">{shiftGroup.shiftName}</h3>
                <p className="text-sm text-slate-500">{shiftGroup.dateLabel}</p>
              </div>
              <Badge className="bg-blue-100 text-blue-700">
                {tasks.length} tasks
              </Badge>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-emerald-600">
                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                {tasksWithSignature} with signature
              </span>
              {tasksWithoutSignature > 0 && (
                <span className="text-amber-600">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  {tasksWithoutSignature} without signature
                </span>
              )}
            </div>
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedTasks.size === tasks.length}
                onCheckedChange={toggleAll}
              />
              <span className="font-medium text-slate-700">
                Select All ({selectedTasks.size} of {tasks.length} selected)
              </span>
            </label>
          </div>

          {/* Task List */}
          <div className="space-y-2">
            {tasks.map(task => {
              const isSelected = selectedTasks.has(task.id);
              const isExpanded = expandedTasks.has(task.id);
              const hasSignature = !!task.signature_data;

              return (
                <div
                  key={task.id}
                  className={cn(
                    "border rounded-lg transition-all",
                    isSelected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
                  )}
                >
                  <div className="flex items-center gap-3 p-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleTask(task.id)}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-slate-900 truncate text-sm">
                          {task.title}
                        </h4>
                        {!hasSignature && (
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {task.assigned_to_name || "Unknown"}
                        </span>
                        <span>{task.area}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.completed_at ? format(parseISO(task.completed_at), "h:mm a") : "—"}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(task.id)}
                      className="flex-shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 border-t border-slate-100 mt-2">
                      <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                        {task.completion_notes && (
                          <div className="col-span-2">
                            <p className="text-xs text-slate-500 mb-1">Notes:</p>
                            <p className="text-slate-700">{task.completion_notes}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Signature:</p>
                          {hasSignature ? (
                            <div className="border rounded p-1 bg-white inline-block">
                              <img 
                                src={task.signature_data} 
                                alt="Signature" 
                                className="h-8 w-auto"
                              />
                            </div>
                          ) : (
                            <span className="text-amber-600 text-xs">No signature</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Verification Notes */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Verification Notes (applies to all selected tasks)
            </label>
            <Textarea 
              placeholder="Add notes for this bulk verification..."
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Manager Signature */}
          <ManagerSignaturePad 
            onSignatureChange={setManagerSignature}
            label="Manager Signature to Verify"
          />
        </div>

        {/* Footer */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={resetAndClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            onClick={handleBulkVerify}
            disabled={isLoading || selectedTasks.size === 0 || !managerSignature}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Verify {selectedTasks.size} Tasks
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}