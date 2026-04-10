import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import { Upload, X, Loader2 } from "lucide-react";
import { IssueRepo } from "@/lib/adapters/database";

const CATEGORIES = [
  { value: "quality", label: "Quality" }, { value: "food_safety", label: "Food Safety" },
  { value: "sanitation", label: "Sanitation" }, { value: "pest", label: "Pest Control" },
  { value: "environmental", label: "Environmental" }, { value: "audit", label: "Audit Finding" },
  { value: "customer", label: "Customer Complaint" }, { value: "operational", label: "Operational" },
  { value: "other", label: "Other" }
];

const SEVERITIES = [
  { value: "minor", label: "Minor", description: "Low impact, easy fix" },
  { value: "moderate", label: "Moderate", description: "Some impact, needs attention" },
  { value: "major", label: "Major", description: "Significant impact, urgent" },
  { value: "critical", label: "Critical", description: "Severe impact, immediate action" }
];

export default function IssueFormModal({ open, onOpenChange, organizationId, user, areas, productionLines, employees, settings, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "", category: "", severity: "moderate", description: "", location_type: "",
    area_id: "", production_line_id: "", specific_location: "", containment_actions: "",
    assigned_to_email: "", evidence_urls: []
  });

  const generateIssueNumber = () => `ISS-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const results = await Promise.all(files.map(file => uploadFile({ file })));
      setFormData(prev => ({ ...prev, evidence_urls: [...prev.evidence_urls, ...results.map(r => r.file_url)] }));
    } catch (e) { toast.error("Failed to upload file"); }
    setIsUploading(false);
  };

  const removeEvidence = (url) => setFormData(prev => ({ ...prev, evidence_urls: prev.evidence_urls.filter(u => u !== url) }));

  const handleSubmit = async () => {
    if (!formData.title || !formData.category || !formData.description) { toast.error("Please fill in required fields"); return; }
    setIsSubmitting(true);
    try {
      const selectedArea = areas.find(a => a.id === formData.area_id);
      const selectedLine = productionLines.find(l => l.id === formData.production_line_id);
      const assignee = employees.find(e => e.email === formData.assigned_to_email);
      const dueDays = settings?.default_due_days_by_severity?.[formData.severity] || 7;
      let status = "open";
      if (formData.severity === "critical" && settings?.auto_escalate_critical) status = "capa_required";
      else if (formData.severity === "major" && settings?.auto_escalate_major) status = "capa_required";

      await IssueRepo.create({
        organization_id: organizationId, issue_number: generateIssueNumber(), title: formData.title,
        category: formData.category, severity: formData.severity, status, description: formData.description,
        location_type: formData.location_type, area_id: formData.area_id, area_name: selectedArea?.name,
        production_line_id: formData.production_line_id, production_line_name: selectedLine?.name,
        specific_location: formData.specific_location, containment_actions: formData.containment_actions,
        evidence_urls: formData.evidence_urls, assigned_to_email: formData.assigned_to_email,
        assigned_to_name: assignee?.name, reported_by_email: user?.email, reported_by_name: user?.full_name,
        reported_at: new Date().toISOString(), discovered_at: new Date().toISOString(),
        due_date: format(addDays(new Date(), dueDays), "yyyy-MM-dd"),
        activity_log: [{ timestamp: new Date().toISOString(), action: "created", user_email: user?.email, user_name: user?.full_name, details: "Issue reported" }]
      });
      toast.success("Issue reported successfully");
      onOpenChange(false);
      setFormData({ title: "", category: "", severity: "moderate", description: "", location_type: "", area_id: "", production_line_id: "", specific_location: "", containment_actions: "", assigned_to_email: "", evidence_urls: [] });
      onSuccess();
    } catch (e) { toast.error("Failed to create issue"); }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Report New Issue</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div><Label>Title *</Label><Input value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Brief description of the issue" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(cat => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Severity *</Label>
              <Select value={formData.severity} onValueChange={(v) => setFormData(prev => ({ ...prev, severity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEVERITIES.map(sev => (<SelectItem key={sev.value} value={sev.value}><span className="font-medium">{sev.label}</span><span className="text-xs text-slate-500 ml-2">{sev.description}</span></SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Description *</Label><Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Describe the issue in detail..." rows={4} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Area</Label>
              <Select value={formData.area_id} onValueChange={(v) => setFormData(prev => ({ ...prev, area_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
                <SelectContent>{areas.map(area => (<SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Production Line</Label>
              <Select value={formData.production_line_id} onValueChange={(v) => setFormData(prev => ({ ...prev, production_line_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select line" /></SelectTrigger>
                <SelectContent>{productionLines.map(line => (<SelectItem key={line.id} value={line.id}>{line.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Specific Location</Label><Input value={formData.specific_location} onChange={(e) => setFormData(prev => ({ ...prev, specific_location: e.target.value }))} placeholder="e.g., Near mixer #3, south wall" /></div>
          <div><Label>Immediate Containment Actions</Label><Textarea value={formData.containment_actions} onChange={(e) => setFormData(prev => ({ ...prev, containment_actions: e.target.value }))} placeholder="What actions were taken immediately to contain the issue?" rows={3} /></div>
          <div><Label>Assign To</Label>
            <Select value={formData.assigned_to_email} onValueChange={(v) => setFormData(prev => ({ ...prev, assigned_to_email: v }))}>
              <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
              <SelectContent>{employees.map(emp => (<SelectItem key={emp.id} value={emp.email}>{emp.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div><Label>Evidence / Photos</Label>
            <div className="mt-2">
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors">
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <Upload className="w-5 h-5 text-slate-400" />}
                <span className="text-sm text-slate-500">{isUploading ? "Uploading..." : "Click to upload photos or documents"}</span>
                <input type="file" multiple accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
              </label>
            </div>
            {formData.evidence_urls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.evidence_urls.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border" />
                    <button onClick={() => removeEvidence(url)} className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {(formData.severity === "critical" && settings?.auto_escalate_critical) && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg"><p className="text-sm text-rose-800">⚠️ Critical issues are automatically escalated to CAPA</p></div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700">{isSubmitting ? "Submitting..." : "Report Issue"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}