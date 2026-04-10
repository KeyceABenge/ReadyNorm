// @ts-nocheck
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, MapPin } from "lucide-react";
import { uploadFile } from "@/lib/adapters/storage";
import { RainDiverterRepo } from "@/lib/adapters/database";

export default function DiverterFormModal({
  open,
  onOpenChange,
  diverter,
  areas = [],
  productionLines = [],
  organizationId,
  markerPosition,
  onSave
}) {
  const [formData, setFormData] = useState({
    diverter_id: "",
    location_description: "",
    area_id: "",
    area_name: "",
    production_line_id: "",
    production_line_name: "",
    bucket_present: false,
    wo_tag_attached: false,
    wo_number: "",
    date_installed: "",
    notes: "",
    marker_x: null,
    marker_y: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    if (open) {
      if (diverter) {
        setFormData({
          diverter_id: diverter.diverter_id || "",
          location_description: diverter.location_description || "",
          area_id: diverter.area_id || "",
          area_name: diverter.area_name || "",
          production_line_id: diverter.production_line_id || "",
          production_line_name: diverter.production_line_name || "",
          bucket_present: diverter.bucket_present || false,
          wo_tag_attached: diverter.wo_tag_attached || false,
          wo_number: diverter.wo_number || "",
          date_installed: diverter.date_installed || "",
          notes: diverter.notes || "",
          marker_x: diverter.marker_x,
          marker_y: diverter.marker_y
        });
        setPhotoPreview(diverter.photo_url);
      } else {
        setFormData({
          diverter_id: "",
          location_description: "",
          area_id: "",
          area_name: "",
          production_line_id: "",
          production_line_name: "",
          bucket_present: false,
          wo_tag_attached: false,
          wo_number: "",
          date_installed: new Date().toISOString().split("T")[0],
          notes: "",
          marker_x: markerPosition?.x ?? null,
          marker_y: markerPosition?.y ?? null
        });
        setPhotoPreview(null);
      }
      setPhotoFile(null);
    }
  }, [open, diverter, markerPosition]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleAreaChange = (areaId) => {
    const resolved = areaId === "__none__" ? "" : areaId;
    const area = areas.find(a => a.id === resolved);
    setFormData(prev => ({
      ...prev,
      area_id: resolved,
      area_name: area?.name || ""
    }));
  };

  const handleLineChange = (lineId) => {
    const resolved = lineId === "__none__" ? "" : lineId;
    const line = productionLines.find(l => l.id === resolved);
    setFormData(prev => ({
      ...prev,
      production_line_id: resolved,
      production_line_name: line?.name || ""
    }));
  };

  const handleSubmit = async () => {
    if (!formData.diverter_id || !formData.location_description) return;

    setIsSubmitting(true);
    try {
      let photo_url = diverter?.photo_url;

      if (photoFile) {
        const { file_url } = await uploadFile(photoFile);
        photo_url = file_url;
      }

      const data = {
        organization_id: organizationId,
        ...formData,
        photo_url,
        status: "active"
      };

      if (diverter?.id) {
        await RainDiverterRepo.update(diverter.id, data);
      } else {
        data.consecutive_dry_days = 0;
        data.eligible_for_removal = false;
        await RainDiverterRepo.create(data);
      }

      onSave?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to save diverter:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {diverter ? "Edit Rain Diverter" : "Add Rain Diverter"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Diverter ID */}
          <div className="space-y-2">
            <Label>Diverter ID / Code *</Label>
            <Input
              value={formData.diverter_id}
              onChange={(e) => setFormData(prev => ({ ...prev, diverter_id: e.target.value }))}
              placeholder="e.g., RD-001, TARP-A1"
            />
          </div>

          {/* Location Description */}
          <div className="space-y-2">
            <Label>Location Description *</Label>
            <Textarea
              value={formData.location_description}
              onChange={(e) => setFormData(prev => ({ ...prev, location_description: e.target.value }))}
              placeholder="Describe the location..."
              rows={2}
            />
          </div>

          {/* Area & Line */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Area</Label>
              <Select value={formData.area_id || "__none__"} onValueChange={handleAreaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {areas.filter(a => a.id).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Production Line</Label>
              <Select value={formData.production_line_id || "__none__"} onValueChange={handleLineChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select line" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {productionLines.filter(l => l.id).map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Map Position */}
          {(formData.marker_x !== null && formData.marker_y !== null) && (
            <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-slate-500" />
              <span>Map position set: ({formData.marker_x?.toFixed(1)}%, {formData.marker_y?.toFixed(1)}%)</span>
            </div>
          )}

          {/* Date Installed */}
          <div className="space-y-2">
            <Label>Date Installed</Label>
            <Input
              type="date"
              value={formData.date_installed}
              onChange={(e) => setFormData(prev => ({ ...prev, date_installed: e.target.value }))}
            />
          </div>

          {/* Bucket Present */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="bucket_present"
              checked={formData.bucket_present}
              onCheckedChange={(v) => setFormData(prev => ({ ...prev, bucket_present: v }))}
            />
            <Label htmlFor="bucket_present">Bucket Present</Label>
          </div>

          {/* WO Tag */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="wo_tag"
                checked={formData.wo_tag_attached}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, wo_tag_attached: v, wo_number: v ? prev.wo_number : "" }))}
              />
              <Label htmlFor="wo_tag">Work Order Tag Attached</Label>
            </div>
            {formData.wo_tag_attached && (
              <Input
                value={formData.wo_number}
                onChange={(e) => setFormData(prev => ({ ...prev, wo_number: e.target.value }))}
                placeholder="Work Order Number *"
              />
            )}
          </div>

          {/* Photo */}
          <div className="space-y-2">
            <Label>Photo</Label>
            {photoPreview && (
              <img src={photoPreview} alt="Diverter" className="w-full h-32 object-cover rounded-lg" />
            )}
            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
              <Upload className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Upload Photo</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !formData.diverter_id || !formData.location_description || (formData.wo_tag_attached && !formData.wo_number)}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {diverter ? "Save Changes" : "Add Diverter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}