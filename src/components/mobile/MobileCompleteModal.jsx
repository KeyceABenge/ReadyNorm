/**
 * Mobile Complete Task Modal
 * Full-screen slide-up modal optimized for one-handed phone use
 */

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle2, X, Loader2, CloudOff, FileText, 
  ChevronDown
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { cn } from "@/lib/utils";
import useOfflineStatus from "@/components/offline/useOfflineStatus";
import { format } from "date-fns";

export default function MobileCompleteModal({ 
  open, 
  onClose, 
  task, 
  onComplete, 
  isLoading 
}) {
  const [step, setStep] = useState(1); // 1: Notes, 2: Signature
  const [notes, setNotes] = useState("");
  const [offlineQueued, setOfflineQueued] = useState(false);
  const sigCanvas = useRef(null);
  const { isOffline, queueOfflineAction } = useOfflineStatus();

  useEffect(() => {
    if (!open) {
      setStep(1);
      setNotes("");
      setOfflineQueued(false);
      if (sigCanvas.current) {
        sigCanvas.current.clear();
      }
    }
  }, [open]);

  const handleSubmit = async () => {
    const signatureData = sigCanvas.current?.toDataURL() || "";
    const completionTimestamp = new Date().toISOString();
    
    if (isOffline) {
      await queueOfflineAction({
        entity: 'Task',
        operation: 'update',
        entityId: task.id,
        data: {
          status: 'completed',
          completed_at: completionTimestamp,
          completion_notes: notes,
          signature_data: signatureData,
          _completed_offline: true,
          _offline_completed_at: completionTimestamp,
          _verification_confidence: 'offline'
        }
      });
      
      setOfflineQueued(true);
      onComplete(task, notes, signatureData, {
        _pending_sync: true,
        _offline_timestamp: completionTimestamp
      });
      
      setTimeout(() => onClose(), 1500);
      return;
    }
    
    await onComplete(task, notes, signatureData);
    onClose();
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="flex items-start justify-between px-5 pb-4 border-b">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-lg">Complete Task</span>
            </div>
            <p className="text-sm text-slate-500 line-clamp-2">{task?.title}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 -mr-2 touch-manipulation"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[60vh]">
          {/* Offline Status */}
          {isOffline && !offlineQueued && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <CloudOff className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Offline Mode</p>
                <p className="text-sm text-amber-700">
                  Your completion will sync when connected
                </p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {offlineQueued && (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-emerald-800">Saved!</p>
                <p className="text-sm text-emerald-700">
                  Recorded at {format(new Date(), 'h:mm a')}
                </p>
              </div>
            </div>
          )}

          {/* SSOP Link */}
          {task?.ssop_url && (
            <a 
              href={task.ssop_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 mb-4 bg-purple-50 border border-purple-200 rounded-xl touch-manipulation active:bg-purple-100"
            >
              <FileText className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-700">View SSOP</span>
            </a>
          )}

          {/* Step 1: Notes */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Completion Notes (optional)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes about the task..."
                  className="min-h-[100px] text-base"
                />
              </div>
              
              <Button
                onClick={() => setStep(2)}
                className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 touch-manipulation"
              >
                Continue to Sign
                <ChevronDown className="w-5 h-5 ml-2 rotate-[-90deg]" />
              </Button>
            </div>
          )}

          {/* Step 2: Signature */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">
                    Sign to Confirm
                  </label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearSignature}
                    className="h-8 touch-manipulation"
                  >
                    Clear
                  </Button>
                </div>
                <div className="border-2 border-slate-300 rounded-xl bg-white overflow-hidden">
                  <SignatureCanvas
                    ref={sigCanvas}
                    canvasProps={{
                      className: "w-full h-[180px] cursor-crosshair touch-none"
                    }}
                    backgroundColor="rgb(255, 255, 255)"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Sign above to confirm completion
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 h-14 text-base touch-manipulation"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || offlineQueued}
                  className={cn(
                    "flex-1 h-14 text-base touch-manipulation",
                    "bg-emerald-600 hover:bg-emerald-700"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : offlineQueued ? (
                    "Done!"
                  ) : isOffline ? (
                    <>
                      <CloudOff className="w-5 h-5 mr-2" />
                      Save Offline
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Complete
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Safe Area Spacer */}
        <div className="h-safe-area-bottom" />
      </div>
    </div>,
    document.body
  );
}