import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, X, FileText, CloudOff, Camera } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import useOfflineStatus from "@/components/offline/useOfflineStatus";
import { format } from "date-fns";
import { uploadFile } from "@/lib/adapters/storage";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n";
import ProxiedImage from "@/components/ui/ProxiedImage";

export default function CompleteTaskModal({ open, onOpenChange, task, onComplete, isLoading, employeeLanguage }) {
  const { t } = useTranslation(employeeLanguage);
  const [notes, setNotes] = useState("");
  const [offlineQueued, setOfflineQueued] = useState(false);
  const [photoBeforeUrl, setPhotoBeforeUrl] = useState("");
  const [photoAfterUrl, setPhotoAfterUrl] = useState("");
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const sigCanvas = useRef(null);
  const { isOffline, queueOfflineAction } = useOfflineStatus();

  useEffect(() => {
    if (!open) {
      setNotes("");
      setOfflineQueued(false);
      setPhotoBeforeUrl("");
      setPhotoAfterUrl("");
      if (sigCanvas.current) {
        sigCanvas.current.clear();
      }
    }
  }, [open]);

  const handlePhotoUpload = async (type) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      if (type === 'before') setUploadingBefore(true);
      else setUploadingAfter(true);
      
      try {
        const { file_url } = await uploadFile(file);
        if (type === 'before') setPhotoBeforeUrl(file_url);
        else setPhotoAfterUrl(file_url);
        toast.success(`${type === 'before' ? 'Before' : 'After'} photo uploaded`);
      } catch (error) {
        toast.error('Failed to upload photo');
      } finally {
        if (type === 'before') setUploadingBefore(false);
        else setUploadingAfter(false);
      }
    };
    
    input.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate photo requirements
    if (task?.requires_photo_before && !photoBeforeUrl) {
      toast.error('Before photo is required');
      return;
    }
    if (task?.requires_photo_after && !photoAfterUrl) {
      toast.error('After photo is required');
      return;
    }
    
    const signatureData = sigCanvas.current?.toDataURL() || "";
    const completionTimestamp = new Date().toISOString();
    
    if (isOffline) {
      // Queue for offline sync with preserved timestamp
      await queueOfflineAction({
        entity: 'Task',
        operation: 'update',
        entityId: task.id,
        data: {
          status: 'completed',
          completed_at: completionTimestamp,
          completion_notes: notes,
          signature_data: signatureData,
          photo_before_url: photoBeforeUrl,
          photo_after_url: photoAfterUrl,
          _completed_offline: true,
          _offline_completed_at: completionTimestamp,
          _verification_confidence: 'offline'
        }
      });
      
      setOfflineQueued(true);
      
      // Still call onComplete for UI update with offline flag
      onComplete(task, notes, signatureData, {
        _pending_sync: true,
        _offline_timestamp: completionTimestamp,
        photo_before_url: photoBeforeUrl,
        photo_after_url: photoAfterUrl
      });
      
      // Close after brief delay to show success message
      setTimeout(() => onOpenChange(false), 1500);
      return;
    }
    
    onComplete(task, notes, signatureData, {
      photo_before_url: photoBeforeUrl,
      photo_after_url: photoAfterUrl
    });
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            {t("tasks", "completeTask", "Complete Task")}
          </DialogTitle>
          <DialogDescription>
            {t("tasks", "markAsCompleted", "Mark")} "{task?.title}" {t("tasks", "asCompleted", "as completed")}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Offline indicator */}
          {isOffline && !offlineQueued && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <CloudOff className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">{t("offline", "currentlyOffline", "You're currently offline")}</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {t("offline", "willSyncWhenOnline", "Your completion will be saved with a timestamp and synced when you're back online.")}
                </p>
              </div>
            </div>
          )}
          
          {/* Offline success message */}
          {offlineQueued && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-800">{t("common", "savedSuccessfully", "Saved successfully")}</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {t("offline", "completionRecordedAt", "Completion recorded at")} {format(new Date(), 'h:mm a')} — {t("offline", "willSyncOnline", "will sync when online")}
                </p>
              </div>
            </div>
          )}

          {task?.ssop_url && (
            <a 
              href={task.ssop_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-700 hover:bg-purple-100 transition-colors"
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">{t("tasks", "viewSSOPDocument", "View SSOP Document")}</span>
            </a>
          )}

          {/* Photo Evidence Section */}
          {(task?.requires_photo_before || task?.requires_photo_after) && (
            <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900 text-sm">{t("tasks", "photoEvidenceRequired", "Photo Evidence Required")}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {task?.requires_photo_before && (
                  <div className="space-y-2">
                    <Label className="text-xs text-blue-800">{t("tasks", "beforePhoto", "Before Photo")} *</Label>
                    {photoBeforeUrl ? (
                      <div className="relative">
                        <ProxiedImage src={photoBeforeUrl} alt="Before" className="w-full h-24 object-cover rounded-lg border" />
                        <button
                          type="button"
                          onClick={() => setPhotoBeforeUrl("")}
                          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-24 flex flex-col gap-1 border-dashed border-blue-300"
                        onClick={() => handlePhotoUpload('before')}
                        disabled={uploadingBefore}
                      >
                        {uploadingBefore ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Camera className="w-5 h-5 text-blue-500" />
                            <span className="text-xs">{t("tasks", "takeBefore", "Take Before")}</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
                
                {task?.requires_photo_after && (
                  <div className="space-y-2">
                    <Label className="text-xs text-blue-800">{t("tasks", "afterPhoto", "After Photo")} *</Label>
                    {photoAfterUrl ? (
                      <div className="relative">
                        <ProxiedImage src={photoAfterUrl} alt="After" className="w-full h-24 object-cover rounded-lg border" />
                        <button
                          type="button"
                          onClick={() => setPhotoAfterUrl("")}
                          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-24 flex flex-col gap-1 border-dashed border-blue-300"
                        onClick={() => handlePhotoUpload('after')}
                        disabled={uploadingAfter}
                      >
                        {uploadingAfter ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Camera className="w-5 h-5 text-blue-500" />
                            <span className="text-xs">{t("tasks", "takeAfter", "Take After")}</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">{t("tasks", "completionNotes", "Completion Notes")} ({t("common", "optional", "optional")})</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("tasks", "notesPlaceholder", "Any notes about the completed task...")}
              rows={4}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("tasks", "digitalSignature", "Digital Signature")} *</Label>
              <Button type="button" variant="ghost" size="sm" onClick={clearSignature}>
                <X className="w-4 h-4 mr-1" />
                {t("common", "clear", "Clear")}
              </Button>
            </div>
            <div className="border-2 border-slate-300 rounded-lg bg-white">
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  width: 400,
                  height: 150,
                  className: "w-full h-[150px] cursor-crosshair"
                }}
                backgroundColor="rgb(255, 255, 255)"
              />
            </div>
            <p className="text-xs text-slate-500">{t("tasks", "signToConfirm", "Please sign above to confirm task completion")}</p>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={offlineQueued}>
              {t("common", "cancel", "Cancel")}
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || offlineQueued} 
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isOffline && !offlineQueued && <CloudOff className="w-4 h-4 mr-2" />}
              {offlineQueued ? t("common", "saved", "Saved!") : isOffline ? t("offline", "saveOffline", "Save Offline") : t("tasks", "markComplete", "Mark Complete")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}