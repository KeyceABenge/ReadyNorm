import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { AuditRequirementRepo, AuditSectionRepo } from "@/lib/adapters/database";

export default function SectionEditModal({ open, onClose, section, organization, requirements, onSuccess }) {
  const [formData, setFormData] = useState({
    section_number: "",
    title: "",
    description: "",
    audit_frequency: "quarterly",
    risk_level: "medium",
    default_auditor_email: "",
    default_auditor_name: "",
    related_programs: []
  });
  const [sectionRequirements, setSectionRequirements] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newReq, setNewReq] = useState({ requirement_number: "", text: "", is_critical: false });

  const isNew = section?.isNew;

  useEffect(() => {
    if (section && !isNew) {
      setFormData({
        section_number: section.section_number || "",
        title: section.title || "",
        description: section.description || "",
        audit_frequency: section.audit_frequency || "quarterly",
        risk_level: section.risk_level || "medium",
        default_auditor_email: section.default_auditor_email || "",
        default_auditor_name: section.default_auditor_name || "",
        related_programs: section.related_programs || []
      });
      setSectionRequirements(requirements.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    }
  }, [section, requirements, isNew]);

  const handleAddRequirement = () => {
    if (!newReq.text.trim()) return;
    
    setSectionRequirements([
      ...sectionRequirements,
      {
        id: `new_${Date.now()}`,
        requirement_number: newReq.requirement_number || `${formData.section_number}.${sectionRequirements.length + 1}`,
        text: newReq.text,
        is_critical: newReq.is_critical,
        isNew: true
      }
    ]);
    setNewReq({ requirement_number: "", text: "", is_critical: false });
  };

  const handleRemoveRequirement = (req) => {
    if (req.isNew) {
      setSectionRequirements(sectionRequirements.filter(r => r.id !== req.id));
    } else {
      setSectionRequirements(sectionRequirements.map(r => 
        r.id === req.id ? { ...r, toDelete: true } : r
      ));
    }
  };

  const handleSave = async () => {
    if (!formData.title) {
      toast.error("Section title is required");
      return;
    }

    setIsSaving(true);
    try {
      let sectionId = section?.id;

      if (isNew) {
        const created = await AuditSectionRepo.create({
          organization_id: organization.id,
          standard_id: section.standard_id,
          standard_name: section.standard_name,
          ...formData,
          status: "active"
        });
        sectionId = created.id;
      } else {
        await AuditSectionRepo.update(section.id, formData);
      }

      // Handle requirements
      for (const req of sectionRequirements) {
        if (req.toDelete && !req.isNew) {
          await AuditRequirementRepo.delete(req.id);
        } else if (req.isNew && !req.toDelete) {
          await AuditRequirementRepo.create({
            organization_id: organization.id,
            standard_id: section.standard_id,
            section_id: sectionId,
            section_number: formData.section_number,
            requirement_number: req.requirement_number,
            text: req.text,
            is_critical: req.is_critical,
            sort_order: sectionRequirements.indexOf(req),
            status: "active"
          });
        }
      }

      toast.success(isNew ? "Section created" : "Section updated");
      onSuccess();
    } catch (error) {
      console.error("Error saving section:", error);
      toast.error("Failed to save section");
    } finally {
      setIsSaving(false);
    }
  };

  const programs = [
    { value: "sanitation", label: "Sanitation" },
    { value: "pest", label: "Pest Control" },
    { value: "emp", label: "EMP" },
    { value: "capa", label: "CAPA" },
    { value: "training", label: "Training" },
    { value: "maintenance", label: "Maintenance" },
    { value: "documentation", label: "Documentation" }
  ];

  const toggleProgram = (prog) => {
    const current = formData.related_programs || [];
    if (current.includes(prog)) {
      setFormData({ ...formData, related_programs: current.filter(p => p !== prog) });
    } else {
      setFormData({ ...formData, related_programs: [...current, prog] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add Section" : "Edit Section"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Section Number</Label>
              <Input 
                value={formData.section_number}
                onChange={(e) => setFormData({ ...formData, section_number: e.target.value })}
                placeholder="e.g., 2.1"
              />
            </div>
            <div className="col-span-2">
              <Label>Title *</Label>
              <Input 
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Section title"
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea 
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Section description"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Audit Frequency</Label>
              <Select 
                value={formData.audit_frequency} 
                onValueChange={(v) => setFormData({ ...formData, audit_frequency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Risk Level</Label>
              <Select 
                value={formData.risk_level} 
                onValueChange={(v) => setFormData({ ...formData, risk_level: v })}
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Default Auditor Email</Label>
              <Input 
                type="email"
                value={formData.default_auditor_email}
                onChange={(e) => setFormData({ ...formData, default_auditor_email: e.target.value })}
                placeholder="auditor@company.com"
              />
            </div>
            <div>
              <Label>Default Auditor Name</Label>
              <Input 
                value={formData.default_auditor_name}
                onChange={(e) => setFormData({ ...formData, default_auditor_name: e.target.value })}
                placeholder="Auditor name"
              />
            </div>
          </div>

          <div>
            <Label>Related Programs</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {programs.map(prog => (
                <Badge 
                  key={prog.value}
                  variant={formData.related_programs?.includes(prog.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleProgram(prog.value)}
                >
                  {prog.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div className="border-t pt-4">
            <Label className="text-base font-semibold">Requirements</Label>
            
            <div className="space-y-2 mt-3">
              {sectionRequirements.filter(r => !r.toDelete).map((req, idx) => (
                <div key={req.id} className="flex items-start gap-2 p-2 bg-slate-50 rounded">
                  <GripVertical className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{req.requirement_number}</span>
                      {req.is_critical && <Badge variant="destructive" className="text-xs">Critical</Badge>}
                    </div>
                    <p className="text-sm mt-1">{req.text}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="flex-shrink-0"
                    onClick={() => handleRemoveRequirement(req)}
                  >
                    <Trash2 className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add new requirement */}
            <div className="mt-4 p-3 border rounded-lg bg-white">
              <div className="grid grid-cols-4 gap-2">
                <Input 
                  placeholder="Number"
                  value={newReq.requirement_number}
                  onChange={(e) => setNewReq({ ...newReq, requirement_number: e.target.value })}
                  className="col-span-1"
                />
                <Input 
                  placeholder="Requirement text"
                  value={newReq.text}
                  onChange={(e) => setNewReq({ ...newReq, text: e.target.value })}
                  className="col-span-2"
                />
                <Button onClick={handleAddRequirement} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isNew ? "Create Section" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}