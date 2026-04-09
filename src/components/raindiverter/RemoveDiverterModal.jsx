import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2, CheckCircle2, Sun, FileText, Camera } from "lucide-react";
import { getCurrentUser } from "@/lib/adapters/auth";
import { uploadFile } from "@/lib/adapters/storage";
import { RainDiverterRepo } from "@/lib/adapters/database";
import { cn } from "@/lib/utils";

export default function RemoveDiverterModal({
  open,
  onOpenChange,
  diverter,
  organizationId,
  onComplete
}) {
  const [reason, setReason] = useState(diverter?.removal_criteria_reason || "");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!reason) return;

    setIsSubmitting(true);
    try {
      const user = await getCurrentUser();
      
      let removal_photo_url = null;
      if (photoFile) {
        const { file_url } = await uploadFile(photoFile);
        removal_photo_url = file_url;
      }

      await RainDiverterRepo.update(diverter.id, {
        status: "removed",
        removed_at: new Date().toISOString(),
        removed_by: user.full_name || user.email,
        removal_reason: reason,
        removal_photo_url,
        notes: notes ? `${diverter.notes || ""}\n\nRemoval notes: ${notes}`.trim() : diverter.notes
      });

      onComplete?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to remove diverter:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!diverter) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <Trash2 className="w-5 h-5" />
            Remove Rain Diverter
          </DialogTitle>
          <DialogDescription>
            Remove {diverter.diverter_id} from active monitoring
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Reason Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Removal Reason *</Label>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => setReason("wo_completed")}
                disabled={!diverter.wo_completed}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-all",
                  reason === "wo_completed"
                    ? "border-emerald-500 bg-emerald-50"
                    : diverter.wo_completed
                      ? "border-slate-200 hover:border-emerald-300"
                      : "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-3">
                  <FileText className={cn(
                    "w-6 h-6",
                    reason === "wo_completed" ? "text-emerald-600" : "text-slate-400"
                  )} />
                  <div>
                    <p className="font-medium">Work Order Completed</p>
                    <p className="text-sm text-slate-500">
                      {diverter.wo_completed 
                        ? `WO #${diverter.wo_number} completed`
                        : "No work order completed"}
                    </p>
                  </div>
                  {diverter.wo_completed && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 ml-auto" />
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReason("dry_30_days")}
                disabled={diverter.consecutive_dry_days < 30}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-all",
                  reason === "dry_30_days"
                    ? "border-emerald-500 bg-emerald-50"
                    : diverter.consecutive_dry_days >= 30
                      ? "border-slate-200 hover:border-emerald-300"
                      : "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-3">
                  <Sun className={cn(
                    "w-6 h-6",
                    reason === "dry_30_days" ? "text-emerald-600" : "text-slate-400"
                  )} />
                  <div>
                    <p className="font-medium">Dry 30+ Days</p>
                    <p className="text-sm text-slate-500">
                      {diverter.consecutive_dry_days >= 30 
                        ? `${diverter.consecutive_dry_days} consecutive dry days`
                        : `Only ${diverter.consecutive_dry_days || 0} dry days (need 30)`}
                    </p>
                  </div>
                  {diverter.consecutive_dry_days >= 30 && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 ml-auto" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Photo Confirmation */}
          <div className="space-y-2">
            <Label>Photo Confirmation (Optional)</Label>
            {photoPreview && (
              <img src={photoPreview} alt="Removal" className="w-full h-32 object-cover rounded-lg" />
            )}
            <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
              <Camera className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Add Photo</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about the removal..."
              rows={2}
            />
          </div>

          {/* Warning */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            ⚠️ This will mark the diverter as removed and hide it from the active map. The history will be preserved.
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || !reason}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Remove Diverter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}