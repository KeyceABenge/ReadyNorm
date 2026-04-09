import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Camera, Loader2 } from "lucide-react";
import { uploadFile } from "@/lib/adapters/storage";
import { toast } from "sonner";

export default function ReportConditionModal({ 
  open, 
  onOpenChange, 
  qaEmployee, 
  organization,
  productionLines = [],
  areas = [],
  onSubmit,
  isLoading
}) {
  const [formData, setFormData] = useState({
    production_line_id: "",
    area_id: "",
    description: "",
    severity: "medium",
    photo_url: ""
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    setUploading(true);

    try {
      const { file_url } = await uploadFile(file);
      setFormData(prev => ({ ...prev, photo_url: file_url }));
      toast.success("Photo uploaded");
    } catch (error) {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      toast.error("Please describe the condition");
      return;
    }

    const line = productionLines.find(l => l.id === formData.production_line_id);
    const area = areas.find(a => a.id === formData.area_id);

    const reportData = {
      organization_id: organization.id,
      reporter_email: qaEmployee.email,
      reporter_name: qaEmployee.name,
      production_line_id: formData.production_line_id || null,
      production_line_name: line?.name || null,
      area_id: formData.area_id || null,
      area_name: area?.name || null,
      description: formData.description,
      photo_url: formData.photo_url || null,
      severity: formData.severity,
      status: "open"
    };

    await onSubmit(reportData);
    
    // Reset form
    setFormData({
      production_line_id: "",
      area_id: "",
      description: "",
      severity: "medium",
      photo_url: ""
    });
    setPhotoFile(null);
  };

  const selectedLineAreas = areas.filter(a => a.production_line_id === formData.production_line_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Report Unsanitary Condition</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Production Line (Optional)</Label>
            <Select 
              value={formData.production_line_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, production_line_id: value, area_id: "" }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select line" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {productionLines.map(line => (
                  <SelectItem key={line.id} value={line.id}>{line.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.production_line_id && (
            <div>
              <Label>Area (Optional)</Label>
              <Select 
                value={formData.area_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, area_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {selectedLineAreas.map(area => (
                    <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Severity <span className="text-rose-500">*</span></Label>
            <Select 
              value={formData.severity} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Description <span className="text-rose-500">*</span></Label>
            <Textarea
              placeholder="Describe the unsanitary condition..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="h-24"
              required
            />
          </div>

          <div>
            <Label>Photo (Optional)</Label>
            <div className="mt-2">
              {formData.photo_url ? (
                <div className="relative">
                  <img src={formData.photo_url} alt="Condition" className="w-full h-48 object-cover rounded-lg border" />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setFormData(prev => ({ ...prev, photo_url: "" }))}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col items-center">
                    {uploading ? (
                      <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-2" />
                    ) : (
                      <Camera className="w-8 h-8 text-slate-400 mb-2" />
                    )}
                    <span className="text-sm text-slate-500">
                      {uploading ? "Uploading..." : "Click to upload photo"}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-rose-600 hover:bg-rose-700"
              disabled={isLoading || uploading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}