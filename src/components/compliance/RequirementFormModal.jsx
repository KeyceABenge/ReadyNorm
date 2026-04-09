import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const CATEGORIES = [
  { value: "sanitation", label: "Sanitation" },
  { value: "documentation", label: "Documentation" },
  { value: "training", label: "Training" },
  { value: "monitoring", label: "Monitoring" },
  { value: "verification", label: "Verification" },
  { value: "corrective_action", label: "Corrective Action" },
  { value: "recall", label: "Recall" },
  { value: "supplier", label: "Supplier" },
  { value: "allergen", label: "Allergen" },
  { value: "environmental", label: "Environmental" },
  { value: "pest_control", label: "Pest Control" },
  { value: "equipment", label: "Equipment" },
  { value: "personnel", label: "Personnel" },
  { value: "other", label: "Other" }
];

const EVIDENCE_TYPES = [
  { value: "signed_record", label: "Signed Record" },
  { value: "training_cert", label: "Training Certificate" },
  { value: "photo", label: "Photo/Image" },
  { value: "document", label: "Document" },
  { value: "log_entry", label: "Log Entry" },
  { value: "inspection_report", label: "Inspection Report" }
];

export default function RequirementFormModal({ 
  open, 
  onOpenChange, 
  requirement, 
  frameworks,
  tasks,
  onSave, 
  isLoading 
}) {
  const [formData, setFormData] = useState({
    framework_id: "",
    framework_code: "",
    section: "",
    title: "",
    description: "",
    category: "sanitation",
    criticality: "major",
    status: "not_assessed",
    evidence_required: [],
    evidence_frequency: "monthly",
    linked_entity_types: [],
    linked_task_ids: [],
    notes: "",
    corrective_action: "",
    due_date: ""
  });

  useEffect(() => {
    if (requirement) {
      setFormData({
        framework_id: requirement.framework_id || "",
        framework_code: requirement.framework_code || "",
        section: requirement.section || "",
        title: requirement.title || "",
        description: requirement.description || "",
        category: requirement.category || "sanitation",
        criticality: requirement.criticality || "major",
        status: requirement.status || "not_assessed",
        evidence_required: requirement.evidence_required || [],
        evidence_frequency: requirement.evidence_frequency || "monthly",
        linked_entity_types: requirement.linked_entity_types || [],
        linked_task_ids: requirement.linked_task_ids || [],
        notes: requirement.notes || "",
        corrective_action: requirement.corrective_action || "",
        due_date: requirement.due_date || ""
      });
    } else {
      setFormData({
        framework_id: "",
        framework_code: "",
        section: "",
        title: "",
        description: "",
        category: "sanitation",
        criticality: "major",
        status: "not_assessed",
        evidence_required: [],
        evidence_frequency: "monthly",
        linked_entity_types: [],
        linked_task_ids: [],
        notes: "",
        corrective_action: "",
        due_date: ""
      });
    }
  }, [requirement, open]);

  const toggleEvidenceType = (type) => {
    setFormData(prev => ({
      ...prev,
      evidence_required: prev.evidence_required.includes(type)
        ? prev.evidence_required.filter(t => t !== type)
        : [...prev.evidence_required, type]
    }));
  };

  const toggleLinkedTask = (taskId) => {
    setFormData(prev => ({
      ...prev,
      linked_task_ids: prev.linked_task_ids.includes(taskId)
        ? prev.linked_task_ids.filter(id => id !== taskId)
        : [...prev.linked_task_ids, taskId]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const selectedFramework = frameworks.find(f => f.id === formData.framework_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{requirement?.id ? "Edit Requirement" : "Add Requirement"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Framework *</Label>
              <Select 
                value={formData.framework_id} 
                onValueChange={(v) => {
                  const fw = frameworks.find(f => f.id === v);
                  setFormData(prev => ({ ...prev, framework_id: v, framework_code: fw?.code || "" }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select framework" />
                </SelectTrigger>
                <SelectContent>
                  {frameworks.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Section/Clause *</Label>
              <Input
                value={formData.section}
                onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value }))}
                placeholder="e.g., 117.135 or 2.5.1"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Criticality</Label>
              <Select 
                value={formData.criticality} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, criticality: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_assessed">Not Assessed</SelectItem>
                  <SelectItem value="compliant">Compliant</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                  <SelectItem value="not_applicable">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Evidence Required</Label>
            <div className="flex flex-wrap gap-2">
              {EVIDENCE_TYPES.map(type => (
                <Badge
                  key={type.value}
                  variant={formData.evidence_required.includes(type.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleEvidenceType(type.value)}
                >
                  {type.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Evidence Frequency</Label>
            <Select 
              value={formData.evidence_frequency} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, evidence_frequency: v }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Once</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="per_event">Per Event</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tasks.length > 0 && (
            <div className="space-y-2">
              <Label>Link Tasks (optional)</Label>
              <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
                {tasks.slice(0, 20).map(task => (
                  <div key={task.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.linked_task_ids.includes(task.id)}
                      onCheckedChange={() => toggleLinkedTask(task.id)}
                    />
                    <span className="text-sm text-slate-700">{task.title}</span>
                    <Badge variant="outline" className="text-xs">{task.frequency}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formData.status === "non_compliant" && (
            <>
              <div className="space-y-2">
                <Label>Corrective Action Required</Label>
                <Textarea
                  value={formData.corrective_action}
                  onChange={(e) => setFormData(prev => ({ ...prev, corrective_action: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-48"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {requirement?.id ? "Update" : "Create"} Requirement
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}