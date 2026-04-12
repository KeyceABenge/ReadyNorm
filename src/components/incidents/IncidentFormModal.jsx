import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { uploadFile } from "@/lib/adapters/storage";

const CATEGORIES = [
  { value: "missed_task", label: "Missed Task" },
  { value: "chemical_misapplication", label: "Chemical Misapplication" },
  { value: "allergen_control", label: "Allergen Control Lapse" },
  { value: "equipment_failure", label: "Equipment Failure" },
  { value: "contamination_risk", label: "Contamination Risk" },
  { value: "wet_finding", label: "Unexpected Wet Finding" },
  { value: "drain_issue", label: "Drain Issue" },
  { value: "pest_activity", label: "Pest Activity" },
  { value: "foreign_material", label: "Foreign Material" },
  { value: "employee_error", label: "Employee Error" },
  { value: "procedure_deviation", label: "Procedure Deviation" },
  { value: "other", label: "Other" }
];

export default function IncidentFormModal({
  incident,
  employees,
  areas,
  tasks,
  drainLocations,
  rainDiverters,
  ssops,
  trainingDocuments,
  organizationId,
  currentUser,
  onSave,
  onClose
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: incident?.title || "",
    type: incident?.type || "incident",
    category: incident?.category || "",
    severity: incident?.severity || "medium",
    description: incident?.description || "",
    location: incident?.location || "",
    area_id: incident?.area_id || "",
    assigned_to: incident?.assigned_to || "",
    linked_task_ids: incident?.linked_task_ids || [],
    linked_asset_ids: incident?.linked_asset_ids || [],
    linked_ssop_ids: incident?.linked_ssop_ids || [],
    linked_training_ids: incident?.linked_training_ids || [],
    linked_employee_ids: incident?.linked_employee_ids || []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [photoUrls, setPhotoUrls] = useState(incident?.photo_urls || []);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.category || !formData.description) {
      toast.error("Please fill in required fields");
      return;
    }

    const selectedArea = areas.find(a => a.id === formData.area_id);
    const assignee = employees.find(e => e.email === formData.assigned_to);
    
    const incidentData = {
      ...formData,
      organization_id: organizationId,
      incident_number: `INC-${Date.now().toString(36).toUpperCase()}`,
      area_name: selectedArea?.name || "",
      assigned_to_name: assignee?.name || "",
      reported_by: currentUser?.email,
      reported_by_name: currentUser?.full_name,
      discovered_at: new Date().toISOString(),
      status: "open",
      photo_urls: photoUrls
    };

    // Optimistic update - add to cache immediately
    const tempId = `temp_${Date.now()}`;
    const optimisticIncident = {
      ...incidentData,
      id: tempId,
      created_date: new Date().toISOString(),
      _isOptimistic: true
    };
    
    // Update cache optimistically
    queryClient.setQueryData(["incidents", organizationId], (old) => {
      if (!old) return [optimisticIncident];
      return [optimisticIncident, ...old];
    });

    // Close immediately for snappy feel
    toast.success("Incident reported successfully");
    onClose();
    
    // Save in background and update with real data
    try {
      const savedIncident = await onSave(incidentData);
      // Replace optimistic entry with real one
      queryClient.setQueryData(["incidents", organizationId], (old) => {
        if (!old) return old;
        return old.map(inc => inc.id === tempId ? savedIncident : inc);
      });
    } catch (error) {
      console.error("Error saving incident:", error);
      // Remove optimistic entry on failure
      queryClient.setQueryData(["incidents", organizationId], (old) => {
        if (!old) return old;
        return old.filter(inc => inc.id !== tempId);
      });
      toast.error("Failed to save incident - please try again");
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await uploadFile({ file });
      setPhotoUrls(prev => [...prev, file_url]);
    } catch (error) {
      toast.error("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            Report Incident / Near Miss
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selection */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant={formData.type === "incident" ? "default" : "outline"}
              onClick={() => setFormData(prev => ({ ...prev, type: "incident" }))}
              className={formData.type === "incident" ? "bg-rose-600 hover:bg-rose-700" : ""}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Incident
            </Button>
            <Button
              type="button"
              variant={formData.type === "near_miss" ? "default" : "outline"}
              onClick={() => setFormData(prev => ({ ...prev, type: "near_miss" }))}
              className={formData.type === "near_miss" ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              Near Miss
            </Button>
          </div>

          {/* Title */}
          <div>
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Brief description of what happened"
              className="mt-1"
            />
          </div>

          {/* Category and Severity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select 
                value={formData.severity} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}
              >
                <SelectTrigger className="mt-1">
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
          </div>

          {/* Description */}
          <div>
            <Label>Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of the incident..."
              rows={4}
              className="mt-1"
            />
          </div>

          {/* Location and Area */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Specific location"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Area</Label>
              <Select 
                value={formData.area_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, area_id: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map(area => (
                    <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assign To */}
          <div>
            <Label>Assign To</Label>
            <Select 
              value={formData.assigned_to} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                {employees.filter(e => e.status === "active").map(emp => (
                  <SelectItem key={emp.email} value={emp.email}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Photos */}
          <div>
            <Label>Photos</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {photoUrls.map((url, idx) => (
                <div key={idx} className="relative w-20 h-20">
                  <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute -top-2 -right-2 p-1 bg-rose-500 text-white rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-slate-400">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                ) : (
                  <Upload className="w-5 h-5 text-slate-400" />
                )}
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-rose-600 hover:bg-rose-700">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Report Incident
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}