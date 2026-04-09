import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export default function FrameworkFormModal({ 
  open, 
  onOpenChange, 
  framework, 
  templates,
  onSave, 
  isLoading 
}) {
  const [formData, setFormData] = useState({
    name: "",
    code: "custom",
    description: "",
    version: "",
    is_active: true,
    audit_frequency: "annual",
    next_audit_date: "",
    certifying_body: "",
    certificate_number: "",
    certificate_expiry: "",
    status: "not_assessed"
  });

  useEffect(() => {
    if (framework) {
      setFormData({
        name: framework.name || "",
        code: framework.code || "custom",
        description: framework.description || "",
        version: framework.version || "",
        is_active: framework.is_active !== false,
        audit_frequency: framework.audit_frequency || "annual",
        next_audit_date: framework.next_audit_date || "",
        certifying_body: framework.certifying_body || "",
        certificate_number: framework.certificate_number || "",
        certificate_expiry: framework.certificate_expiry || "",
        status: framework.status || "not_assessed"
      });
    } else {
      setFormData({
        name: "",
        code: "custom",
        description: "",
        version: "",
        is_active: true,
        audit_frequency: "annual",
        next_audit_date: "",
        certifying_body: "",
        certificate_number: "",
        certificate_expiry: "",
        status: "not_assessed"
      });
    }
  }, [framework, open]);

  const handleCodeChange = (code) => {
    const template = templates[code];
    if (template) {
      setFormData(prev => ({
        ...prev,
        code,
        name: template.name,
        description: template.description,
        version: template.version
      }));
    } else {
      setFormData(prev => ({ ...prev, code }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{framework?.id ? "Edit Framework" : "Add Compliance Framework"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Framework Type</Label>
            <Select value={formData.code} onValueChange={handleCodeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(templates).map(([code, template]) => (
                  <SelectItem key={code} value={code}>{template.name}</SelectItem>
                ))}
                <SelectItem value="custom">Custom Framework</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Version</Label>
              <Input
                value={formData.version}
                onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Audit Frequency</Label>
              <Select 
                value={formData.audit_frequency} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, audit_frequency: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="as_needed">As Needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Next Audit Date</Label>
              <Input
                type="date"
                value={formData.next_audit_date}
                onChange={(e) => setFormData(prev => ({ ...prev, next_audit_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Certifying Body</Label>
              <Input
                value={formData.certifying_body}
                onChange={(e) => setFormData(prev => ({ ...prev, certifying_body: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Certificate Number</Label>
              <Input
                value={formData.certificate_number}
                onChange={(e) => setFormData(prev => ({ ...prev, certificate_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Certificate Expiry</Label>
              <Input
                type="date"
                value={formData.certificate_expiry}
                onChange={(e) => setFormData(prev => ({ ...prev, certificate_expiry: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Current Status</Label>
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
                <SelectItem value="minor_nc">Minor Non-Conformance</SelectItem>
                <SelectItem value="major_nc">Major Non-Conformance</SelectItem>
                <SelectItem value="critical_nc">Critical Non-Conformance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>Active Framework</Label>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {framework?.id ? "Update" : "Create"} Framework
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}