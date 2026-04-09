// @ts-nocheck
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Shield, User, Calendar, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import ManagerSignaturePad from "../verification/ManagerSignaturePad";

export default function VerifyTaskModal({ 
  open, 
  onClose, 
  task, 
  onVerify,
  onReject,
  isLoading 
}) {
  const [verificationNotes, setVerificationNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [mode, setMode] = useState("review"); // review, verify, reject
  const [managerSignature, setManagerSignature] = useState(null);

  if (!task) return null;

  const handleVerify = () => {
    onVerify(task.id, verificationNotes, managerSignature);
  };

  const handleReject = () => {
    onReject(task.id, rejectionReason);
  };

  const resetAndClose = () => {
    setVerificationNotes("");
    setRejectionReason("");
    setMode("review");
    setManagerSignature(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Verify Task Completion
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Info */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-3">
            <div>
              <h3 className="font-semibold text-slate-900">{task.title}</h3>
              <p className="text-sm text-slate-500">{task.area}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">
                  {task.assigned_to_name || "Unknown"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">
                  {task.completed_at ? format(parseISO(task.completed_at), "MMM d, h:mm a") : "Not completed"}
                </span>
              </div>
            </div>

            {task.completion_notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-slate-500 mb-1">Completion Notes:</p>
                <p className="text-sm text-slate-700">{task.completion_notes}</p>
              </div>
            )}

            {/* Signature */}
            <div className="pt-2 border-t">
              <p className="text-xs text-slate-500 mb-2">Employee Signature:</p>
              {task.signature_data ? (
                <div className="border rounded-lg p-2 bg-white inline-block">
                  <img 
                    src={task.signature_data} 
                    alt="Signature" 
                    className="h-12 w-auto"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  No signature provided
                </div>
              )}
            </div>
          </div>

          {/* Verification Status */}
          {task.verified_by && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Already Verified</span>
              </div>
              <p className="text-sm text-emerald-600 mt-1">
                By {task.verified_by} on {task.verified_at ? format(parseISO(task.verified_at), "MMM d, h:mm a") : ""}
              </p>
            </div>
          )}

          {/* Action Modes */}
          {!task.verified_by && mode === "review" && (
            <div className="flex gap-3">
              <Button 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setMode("verify")}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Verify as Complete
              </Button>
              <Button 
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => setMode("reject")}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject / Reopen
              </Button>
            </div>
          )}

          {/* Verify Form */}
          {mode === "verify" && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Verification Notes (Optional)
                </label>
                <Textarea 
                  placeholder="Add any notes about this verification..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <ManagerSignaturePad 
                onSignatureChange={setManagerSignature}
                label="Manager Signature to Verify"
              />
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setMode("review")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleVerify}
                  disabled={isLoading || !managerSignature}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Verification
                </Button>
              </div>
            </div>
          )}

          {/* Reject Form */}
          {mode === "reject" && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Reason for Rejection <span className="text-red-500">*</span>
                </label>
                <Textarea 
                  placeholder="Explain why this task is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-slate-500 mt-1">
                  This will reopen the task for the employee to redo.
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setMode("review")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1"
                  onClick={handleReject}
                  disabled={isLoading || !rejectionReason.trim()}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Task
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}