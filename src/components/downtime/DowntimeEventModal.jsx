import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload, X, Link2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SanitationDowntimeRepo } from "@/lib/adapters/database";

const REASON_CATEGORIES = [
  { value: "equipment_contamination", label: "Equipment Contamination" },
  { value: "foreign_material", label: "Foreign Material" },
  { value: "allergen_control", label: "Allergen Control Failure" },
  { value: "pest_activity", label: "Pest Activity" },
  { value: "chemical_issue", label: "Chemical Issue" },
  { value: "drain_backup", label: "Drain Backup/Issue" },
  { value: "water_leak", label: "Water Leak" },
  { value: "cleaning_failure", label: "Cleaning Failure" },
  { value: "employee_error", label: "Employee Error" },
  { value: "training_gap", label: "Training Gap" },
  { value: "ssop_deviation", label: "SSOP Deviation" },
  { value: "equipment_failure", label: "Equipment Failure" },
  { value: "other", label: "Other" }
];

const ROOT_CAUSE_CATEGORIES = [
  { value: "method", label: "Method - Process/procedure issue" },
  { value: "machine", label: "Machine - Equipment issue" },
  { value: "material", label: "Material - Raw material/chemical issue" },
  { value: "manpower", label: "Manpower - Training/skill issue" },
  { value: "measurement", label: "Measurement - Monitoring issue" },
  { value: "environment", label: "Environment - Facility/environmental issue" },
  { value: "unknown", label: "Unknown - Requires investigation" }
];

const IMPACT_TYPES = [
  { value: "production_stop", label: "Production Stop" },
  { value: "line_slowdown", label: "Line Slowdown" },
  { value: "product_hold", label: "Product Hold" },
  { value: "product_disposal", label: "Product Disposal" },
  { value: "rework_required", label: "Rework Required" },
  { value: "regulatory_concern", label: "Regulatory Concern" }
];

const SEVERITIES = [
  { value: "minor", label: "Minor", color: "bg-slate-100 text-slate-800" },
  { value: "moderate", label: "Moderate", color: "bg-amber-100 text-amber-800" },
  { value: "major", label: "Major", color: "bg-orange-100 text-orange-800" },
  { value: "critical", label: "Critical", color: "bg-rose-100 text-rose-800" }
];

export default function DowntimeEventModal({
  open,
  onOpenChange,
  event,
  organizationId,
  user,
  productionLines = [],
  areas = [],
  tasks = [],
  ssops = [],
  employees = [],
  trainingDocs = [],
  existingEvents = []
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    event_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    event_end_date: "",
    duration_minutes: "",
    production_line_id: "",
    area_id: "",
    reason_category: "",
    reason_detail: "",
    root_cause: "",
    root_cause_category: "",
    impact_type: "",
    impact_cost_estimate: "",
    product_affected: "",
    product_quantity_affected: "",
    product_disposition: "not_applicable",
    immediate_action: "",
    severity: "moderate",
    requires_capa: true,
    linked_task_ids: [],
    linked_ssop_ids: [],
    linked_employee_ids: [],
    linked_training_ids: [],
    photo_urls: []
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (event) {
      setFormData({
        event_date: event.event_date ? format(new Date(event.event_date), "yyyy-MM-dd'T'HH:mm") : "",
        event_end_date: event.event_end_date ? format(new Date(event.event_end_date), "yyyy-MM-dd'T'HH:mm") : "",
        duration_minutes: event.duration_minutes || "",
        production_line_id: event.production_line_id || "",
        area_id: event.area_id || "",
        reason_category: event.reason_category || "",
        reason_detail: event.reason_detail || "",
        root_cause: event.root_cause || "",
        root_cause_category: event.root_cause_category || "",
        impact_type: event.impact_type || "",
        impact_cost_estimate: event.impact_cost_estimate || "",
        product_affected: event.product_affected || "",
        product_quantity_affected: event.product_quantity_affected || "",
        product_disposition: event.product_disposition || "not_applicable",
        immediate_action: event.immediate_action || "",
        severity: event.severity || "moderate",
        requires_capa: event.requires_capa !== false,
        linked_task_ids: event.linked_task_ids || [],
        linked_ssop_ids: event.linked_ssop_ids || [],
        linked_employee_ids: event.linked_employee_ids || [],
        linked_training_ids: event.linked_training_ids || [],
        photo_urls: event.photo_urls || []
      });
      setStep(1);
    } else {
      setFormData({
        event_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        event_end_date: "",
        duration_minutes: "",
        production_line_id: "",
        area_id: "",
        reason_category: "",
        reason_detail: "",
        root_cause: "",
        root_cause_category: "",
        impact_type: "",
        impact_cost_estimate: "",
        product_affected: "",
        product_quantity_affected: "",
        product_disposition: "not_applicable",
        immediate_action: "",
        severity: "moderate",
        requires_capa: true,
        linked_task_ids: [],
        linked_ssop_ids: [],
        linked_employee_ids: [],
        linked_training_ids: [],
        photo_urls: []
      });
      setStep(1);
    }
  }, [event, open]);

  // Calculate duration when dates change
  useEffect(() => {
    if (formData.event_date && formData.event_end_date) {
      const start = new Date(formData.event_date);
      const end = new Date(formData.event_end_date);
      const diffMinutes = Math.round((end - start) / 60000);
      if (diffMinutes > 0) {
        setFormData(prev => ({ ...prev, duration_minutes: diffMinutes }));
      }
    }
  }, [formData.event_date, formData.event_end_date]);

  const generateEventNumber = () => {
    const year = new Date().getFullYear();
    const count = existingEvents.filter(e => 
      e.event_number?.startsWith(`SDT-${year}`)
    ).length + 1;
    return `SDT-${year}-${String(count).padStart(3, '0')}`;
  };

  const checkRecurrence = () => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const similarEvents = existingEvents.filter(e => {
      if (event && e.id === event.id) return false;
      if (new Date(e.event_date) < ninetyDaysAgo) return false;
      // Check same reason category and line
      return e.reason_category === formData.reason_category && 
             e.production_line_id === formData.production_line_id;
    });
    
    return {
      count: similarEvents.length,
      isRecurring: similarEvents.length >= 2
    };
  };

  const mutation = useMutation({
    mutationFn: async (data) => {
      const line = productionLines.find(l => l.id === data.production_line_id);
      const area = areas.find(a => a.id === data.area_id);
      const recurrence = checkRecurrence();
      
      const payload = {
        ...data,
        organization_id: organizationId,
        production_line_name: line?.name || "",
        area_name: area?.name || "",
        event_number: event?.event_number || generateEventNumber(),
        reported_by: user?.email,
        reported_by_name: user?.full_name,
        status: data.immediate_action ? "immediate_action_taken" : "open",
        immediate_action_by: data.immediate_action ? user?.full_name : null,
        immediate_action_at: data.immediate_action ? new Date().toISOString() : null,
        recurrence_count: recurrence.count,
        is_recurring: recurrence.isRecurring,
        duration_minutes: parseInt(data.duration_minutes) || 0,
        impact_cost_estimate: parseFloat(data.impact_cost_estimate) || 0,
        product_quantity_affected: parseFloat(data.product_quantity_affected) || 0
      };

      if (event?.id) {
        return SanitationDowntimeRepo.update(event.id, payload);
      }
      return SanitationDowntimeRepo.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["downtime_events"] });
      onOpenChange(false);
      toast.success(event ? "Event updated" : "Downtime event logged");
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    }
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await uploadFile({ file });
      setFormData(prev => ({
        ...prev,
        photo_urls: [...prev.photo_urls, file_url]
      }));
    } catch (error) {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photo_urls: prev.photo_urls.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    if (!formData.reason_category || !formData.reason_detail) {
      toast.error("Please fill in required fields");
      return;
    }
    mutation.mutate(formData);
  };

  const filteredAreas = areas.filter(a => 
    !formData.production_line_id || a.production_line_id === formData.production_line_id
  );

  const relatedTasks = tasks.filter(t => 
    t.area === formData.area_id || 
    productionLines.find(l => l.id === formData.production_line_id)?.name === t.area
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event ? "Edit Downtime Event" : "Log Sanitation Downtime"}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicators */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map(s => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={cn(
                "flex-1 h-2 rounded-full transition-colors",
                step >= s ? "bg-slate-900" : "bg-slate-200"
              )}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-500 mb-4">
          <span>Basic Info</span>
          <span>Details & Impact</span>
          <span>Actions & Links</span>
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Event Start *</Label>
                <Input
                  type="datetime-local"
                  value={formData.event_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Event End</Label>
                <Input
                  type="datetime-local"
                  value={formData.event_end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                  placeholder="Auto-calculated or enter manually"
                />
              </div>
              <div>
                <Label>Severity *</Label>
                <Select value={formData.severity} onValueChange={(v) => setFormData(prev => ({ ...prev, severity: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        <Badge className={s.color}>{s.label}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Production Line</Label>
                <Select value={formData.production_line_id} onValueChange={(v) => setFormData(prev => ({ ...prev, production_line_id: v, area_id: "" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select line" />
                  </SelectTrigger>
                  <SelectContent>
                    {productionLines.map(line => (
                      <SelectItem key={line.id} value={line.id}>{line.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Area</Label>
                <Select value={formData.area_id} onValueChange={(v) => setFormData(prev => ({ ...prev, area_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAreas.map(area => (
                      <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Reason Category *</Label>
              <Select value={formData.reason_category} onValueChange={(v) => setFormData(prev => ({ ...prev, reason_category: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                value={formData.reason_detail}
                onChange={(e) => setFormData(prev => ({ ...prev, reason_detail: e.target.value }))}
                placeholder="Describe what happened in detail..."
                rows={3}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>Next</Button>
            </div>
          </div>
        )}

        {/* Step 2: Details & Impact */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Root Cause Category</Label>
              <Select value={formData.root_cause_category} onValueChange={(v) => setFormData(prev => ({ ...prev, root_cause_category: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category (5M+E)" />
                </SelectTrigger>
                <SelectContent>
                  {ROOT_CAUSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Root Cause Analysis</Label>
              <Textarea
                value={formData.root_cause}
                onChange={(e) => setFormData(prev => ({ ...prev, root_cause: e.target.value }))}
                placeholder="Describe the root cause..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Impact Type</Label>
                <Select value={formData.impact_type} onValueChange={(v) => setFormData(prev => ({ ...prev, impact_type: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select impact" />
                  </SelectTrigger>
                  <SelectContent>
                    {IMPACT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estimated Cost ($)</Label>
                <Input
                  type="number"
                  value={formData.impact_cost_estimate}
                  onChange={(e) => setFormData(prev => ({ ...prev, impact_cost_estimate: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Product Affected</Label>
                <Input
                  value={formData.product_affected}
                  onChange={(e) => setFormData(prev => ({ ...prev, product_affected: e.target.value }))}
                  placeholder="Product name/SKU"
                />
              </div>
              <div>
                <Label>Quantity Affected</Label>
                <Input
                  type="number"
                  value={formData.product_quantity_affected}
                  onChange={(e) => setFormData(prev => ({ ...prev, product_quantity_affected: e.target.value }))}
                  placeholder="Units/lbs"
                />
              </div>
            </div>

            <div>
              <Label>Product Disposition</Label>
              <Select value={formData.product_disposition} onValueChange={(v) => setFormData(prev => ({ ...prev, product_disposition: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_applicable">Not Applicable</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="reworked">Reworked</SelectItem>
                  <SelectItem value="destroyed">Destroyed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Photos */}
            <div>
              <Label>Photos</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.photo_urls.map((url, i) => (
                  <div key={i} className="relative w-20 h-20">
                    <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-50">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  ) : (
                    <Upload className="w-5 h-5 text-slate-400" />
                  )}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Next</Button>
            </div>
          </div>
        )}

        {/* Step 3: Actions & Links */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label>Immediate Corrective Action Taken</Label>
              <Textarea
                value={formData.immediate_action}
                onChange={(e) => setFormData(prev => ({ ...prev, immediate_action: e.target.value }))}
                placeholder="What immediate action was taken to address the issue?"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="requires_capa"
                checked={formData.requires_capa}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_capa: checked }))}
              />
              <Label htmlFor="requires_capa" className="cursor-pointer">
                Requires formal CAPA (recommended for moderate+ severity)
              </Label>
            </div>

            {/* Linked SSOPs */}
            <div>
              <Label className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Related SSOPs
              </Label>
              <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                {ssops.map(ssop => (
                  <Badge
                    key={ssop.id}
                    variant={formData.linked_ssop_ids.includes(ssop.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        linked_ssop_ids: prev.linked_ssop_ids.includes(ssop.id)
                          ? prev.linked_ssop_ids.filter(id => id !== ssop.id)
                          : [...prev.linked_ssop_ids, ssop.id]
                      }));
                    }}
                  >
                    {ssop.title}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Linked Employees */}
            <div>
              <Label className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Employees Involved
              </Label>
              <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                {employees.filter(e => e.status === "active").map(emp => (
                  <Badge
                    key={emp.id}
                    variant={formData.linked_employee_ids.includes(emp.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        linked_employee_ids: prev.linked_employee_ids.includes(emp.id)
                          ? prev.linked_employee_ids.filter(id => id !== emp.id)
                          : [...prev.linked_employee_ids, emp.id]
                      }));
                    }}
                  >
                    {emp.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Linked Training */}
            <div>
              <Label className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Related Training Documents
              </Label>
              <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                {trainingDocs.map(doc => (
                  <Badge
                    key={doc.id}
                    variant={formData.linked_training_ids.includes(doc.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        linked_training_ids: prev.linked_training_ids.includes(doc.id)
                          ? prev.linked_training_ids.filter(id => id !== doc.id)
                          : [...prev.linked_training_ids, doc.id]
                      }));
                    }}
                  >
                    {doc.title}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Recurrence Warning */}
            {checkRecurrence().isRecurring && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-amber-800 text-sm font-medium">
                  ⚠️ Recurring Issue Detected
                </p>
                <p className="text-amber-700 text-xs mt-1">
                  {checkRecurrence().count} similar events found in the past 90 days. A formal CAPA is strongly recommended.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleSubmit} disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {event ? "Update Event" : "Log Downtime Event"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}