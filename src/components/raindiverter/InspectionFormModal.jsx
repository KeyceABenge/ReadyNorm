import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Droplets, Sun, Camera } from "lucide-react";
import { uploadFile } from "@/lib/adapters/storage";
import { DiverterInspectionRepo, RainDiverterRepo } from "@/lib/adapters/database";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import { toast } from "sonner";

export default function InspectionFormModal({
  open,
  onOpenChange,
  diverter,
  inspector,
  organizationId,
  onComplete
}) {
  const [formData, setFormData] = useState({
    finding: null,
    bucket_emptied: false,
    cleaned: false,
    sanitized: false,
    wo_tag_attached: false,
    wo_number: "",
    notes: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photoFiles, setPhotoFiles] = useState([]);

  useEffect(() => {
    if (open && diverter) {
      setFormData({
        finding: null,
        bucket_emptied: false,
        cleaned: false,
        sanitized: false,
        wo_tag_attached: diverter.wo_tag_attached || false,
        wo_number: diverter.wo_number || "",
        notes: ""
      });
      setPhotos([]);
      setPhotoFiles([]);
    }
  }, [open, diverter]);

  const handlePhotoAdd = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      setPhotoFiles(prev => [...prev, file]);
      setPhotos(prev => [...prev, URL.createObjectURL(file)]);
    });
  };

  const handleSubmit = async () => {
    if (!formData.finding) return;

    setIsSubmitting(true);
    try {
      // Upload photos
      const photo_urls = [];
      for (const file of photoFiles) {
        const { file_url } = await uploadFile(file);
        photo_urls.push(file_url);
      }

      // Create inspection log
      await DiverterInspectionRepo.create({
        organization_id: organizationId,
        diverter_id: diverter.id,
        diverter_code: diverter.diverter_id,
        inspection_date: new Date().toISOString(),
        inspector_email: inspector?.email || "",
        inspector_name: inspector?.name || inspector?.full_name || "Unknown",
        inspector_type: inspector?.role === "admin" ? "manager" : "employee",
        finding: formData.finding,
        bucket_emptied: formData.bucket_emptied,
        cleaned: formData.cleaned,
        sanitized: formData.sanitized,
        wo_tag_attached: formData.wo_tag_attached,
        wo_number: formData.wo_number,
        notes: formData.notes,
        photo_urls
      });

      // Calculate new dry streak
      let newDryDays = diverter.consecutive_dry_days || 0;
      let dryStreakStart = diverter.dry_streak_start_date;
      
      if (formData.finding === "wet") {
        newDryDays = 0;
        dryStreakStart = null;
      } else {
        // Dry finding
        if (!dryStreakStart) {
          dryStreakStart = new Date().toISOString().split("T")[0];
          newDryDays = 1;
        } else {
          newDryDays = differenceInDays(new Date(), new Date(dryStreakStart)) + 1;
        }
      }

      // Check eligibility for removal
      const eligibleForRemoval = diverter.wo_completed || newDryDays >= 30;
      const removalReason = diverter.wo_completed ? "wo_completed" : (newDryDays >= 30 ? "dry_30_days" : null);

      // Update diverter
      await RainDiverterRepo.update(diverter.id, {
        last_inspection_date: new Date().toISOString(),
        last_finding: formData.finding,
        consecutive_dry_days: newDryDays,
        dry_streak_start_date: dryStreakStart,
        eligible_for_removal: eligibleForRemoval,
        removal_criteria_reason: removalReason,
        wo_tag_attached: formData.wo_tag_attached,
        wo_number: formData.wo_number
      });

      // Force a small delay to ensure data is propagated before closing
      await new Promise(resolve => setTimeout(resolve, 100));
      toast.success("Inspection submitted");
      onComplete?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to submit inspection:", err);
      toast.error(`Failed to submit: ${err?.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!diverter) return null;

  const isComplete = formData.finding && formData.bucket_emptied && formData.cleaned && formData.sanitized;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-600" />
            Diverter Inspection
          </DialogTitle>
          <DialogDescription>
            {diverter.diverter_id} - {diverter.location_description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Finding - Wet or Dry */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Finding *</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, finding: "wet" }))}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all text-center",
                  formData.finding === "wet"
                    ? "border-amber-500 bg-amber-50"
                    : "border-slate-200 hover:border-amber-300"
                )}
              >
                <Droplets className={cn(
                  "w-10 h-10 mx-auto mb-2",
                  formData.finding === "wet" ? "text-amber-600" : "text-slate-400"
                )} />
                <p className="font-semibold">Wet</p>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, finding: "dry" }))}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all text-center",
                  formData.finding === "dry"
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:border-emerald-300"
                )}
              >
                <Sun className={cn(
                  "w-10 h-10 mx-auto mb-2",
                  formData.finding === "dry" ? "text-emerald-600" : "text-slate-400"
                )} />
                <p className="font-semibold">Dry</p>
              </button>
            </div>
          </div>

          {/* Required Actions */}
          <Card className="p-4 space-y-3">
            <Label className="text-base font-semibold">Required Actions</Label>
            
            <div className="flex items-center gap-3">
              <Checkbox
                id="bucket_emptied"
                checked={formData.bucket_emptied}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, bucket_emptied: v }))}
              />
              <Label htmlFor="bucket_emptied" className="font-normal">
                Bucket Emptied *
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="cleaned"
                checked={formData.cleaned}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, cleaned: v }))}
              />
              <Label htmlFor="cleaned" className="font-normal">
                Cleaned *
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="sanitized"
                checked={formData.sanitized}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, sanitized: v }))}
              />
              <Label htmlFor="sanitized" className="font-normal">
                Sanitized *
              </Label>
            </div>
          </Card>

          {/* WO Tag */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="wo_tag"
                checked={formData.wo_tag_attached}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, wo_tag_attached: v }))}
              />
              <Label htmlFor="wo_tag" className="font-normal">
                Work Order Tag Attached
              </Label>
            </div>
            {formData.wo_tag_attached && (
              <Input
                value={formData.wo_number}
                onChange={(e) => setFormData(prev => ({ ...prev, wo_number: e.target.value }))}
                placeholder="Work Order Number"
              />
            )}
          </div>

          {/* Photos */}
          <div className="space-y-3">
            <Label>Photos (Optional)</Label>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((url, idx) => (
                  <img key={idx} src={url} alt={`Photo ${idx + 1}`} className="w-full h-20 object-cover rounded" />
                ))}
              </div>
            )}
            <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
              <Camera className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Add Photo</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoAdd} />
            </label>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any observations..."
              rows={2}
            />
          </div>

          {/* Dry streak info */}
          {formData.finding === "dry" && diverter.consecutive_dry_days > 0 && (
            <div className="p-3 bg-emerald-50 rounded-lg text-sm text-emerald-700">
              Current dry streak: {diverter.consecutive_dry_days} days
              {diverter.consecutive_dry_days >= 29 && (
                <Badge className="ml-2 bg-emerald-600">Almost eligible for removal!</Badge>
              )}
            </div>
          )}

          {formData.finding === "wet" && diverter.consecutive_dry_days > 0 && (
            <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
              ⚠️ This will reset the dry streak ({diverter.consecutive_dry_days} days)
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isComplete}
            className={cn(
              formData.finding === "wet" ? "bg-amber-600 hover:bg-amber-700" :
              formData.finding === "dry" ? "bg-emerald-600 hover:bg-emerald-700" :
              "bg-slate-900"
            )}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Inspection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}