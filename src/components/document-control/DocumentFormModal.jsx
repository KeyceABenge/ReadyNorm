import { useState } from "react";
import { ControlledDocumentRepo } from "@/lib/adapters/database";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/lib/adapters/storage";

const DOCUMENT_TYPES = [
  { value: "policy", label: "Policy" },
  { value: "sop", label: "SOP" },
  { value: "ssop", label: "SSOP" },
  { value: "work_instruction", label: "Work Instruction" },
  { value: "form", label: "Form" },
  { value: "customer_requirement", label: "Customer Requirement" },
  { value: "audit_standard", label: "Audit Standard" },
  { value: "specification", label: "Specification" },
  { value: "manual", label: "Manual" },
  { value: "procedure", label: "Procedure" },
  { value: "guideline", label: "Guideline" },
  { value: "other", label: "Other" }
];

const CATEGORIES = [
  "Food Safety", "Quality Assurance", "Sanitation", "Operations", 
  "HR", "Maintenance", "R&D", "Regulatory", "Customer"
];

export default function DocumentFormModal({ open, onOpenChange, document, organizationId, user, settings, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    document_number: document?.document_number || "",
    title: document?.title || "",
    document_type: document?.document_type || "sop",
    category: document?.category || "",
    department: document?.department || "",
    description: document?.description || "",
    file_url: document?.file_url || "",
    effective_date: document?.effective_date || "",
    review_frequency_months: document?.review_frequency_months || 12,
    requires_training: document?.requires_training || false,
    confidentiality_level: document?.confidentiality_level || "internal",
    keywords: document?.keywords?.join(", ") || "",
    regulatory_references: document?.regulatory_references?.join(", ") || ""
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await uploadFile(file);
      setForm(prev => ({ ...prev, file_url }));
      toast.success("File uploaded");
    } catch (err) {
      toast.error("Upload failed");
    }
    setUploading(false);
  };

  const generateDocNumber = () => {
    const prefix = settings?.number_prefixes?.[form.document_type] || form.document_type.toUpperCase().slice(0, 3);
    const year = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    return `${prefix}-${year}-${seq}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.document_type) {
      toast.error("Title and type are required");
      return;
    }

    setSaving(true);
    try {
      const docNumber = form.document_number || generateDocNumber();
      const data = {
        ...form,
        document_number: docNumber,
        organization_id: organizationId,
        author_email: user?.email,
        author_name: user?.full_name,
        keywords: form.keywords.split(",").map(k => k.trim()).filter(Boolean),
        regulatory_references: form.regulatory_references.split(",").map(r => r.trim()).filter(Boolean),
        current_version: document?.current_version || "1.0",
        status: document?.status || "draft"
      };

      // Calculate next review date if effective date is set
      if (data.effective_date && data.review_frequency_months) {
        const effectiveDate = new Date(data.effective_date);
        effectiveDate.setMonth(effectiveDate.getMonth() + data.review_frequency_months);
        data.next_review_date = effectiveDate.toISOString().split("T")[0];
      }

      if (document?.id) {
        await ControlledDocumentRepo.update(document.id, data);
        toast.success("Document updated");
      } else {
        await ControlledDocumentRepo.create(data);
        toast.success("Document created");
      }
      onSaved();
    } catch (err) {
      toast.error("Failed to save document");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{document ? "Edit Document" : "New Controlled Document"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Document Number</Label>
              <Input
                value={form.document_number}
                onChange={(e) => setForm(prev => ({ ...prev, document_number: e.target.value }))}
                placeholder="Auto-generated if blank"
              />
            </div>
            <div>
              <Label>Document Type *</Label>
              <Select value={form.document_type} onValueChange={(v) => setForm(prev => ({ ...prev, document_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Document title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm(prev => ({ ...prev, category: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(settings?.document_categories || CATEGORIES).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department</Label>
              <Select value={form.department} onValueChange={(v) => setForm(prev => ({ ...prev, department: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {(settings?.departments || ["Quality", "Sanitation", "Production", "Maintenance"]).map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of document purpose"
              rows={3}
            />
          </div>

          {/* File Upload */}
          <div>
            <Label>Document File</Label>
            <div className="mt-1.5 border-2 border-dashed rounded-lg p-4 text-center">
              {form.file_url ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm text-slate-600">File uploaded</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm(prev => ({ ...prev, file_url: "" }))}>
                    Remove
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.docx,.xlsx,.doc,.xls" />
                  {uploading ? (
                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-slate-400" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                      <p className="text-sm text-slate-600">Click to upload document</p>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={form.effective_date}
                onChange={(e) => setForm(prev => ({ ...prev, effective_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Review Frequency (months)</Label>
              <Input
                type="number"
                value={form.review_frequency_months}
                onChange={(e) => setForm(prev => ({ ...prev, review_frequency_months: parseInt(e.target.value) || 12 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Confidentiality Level</Label>
              <Select value={form.confidentiality_level} onValueChange={(v) => setForm(prev => ({ ...prev, confidentiality_level: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="confidential">Confidential</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={form.requires_training}
                onCheckedChange={(v) => setForm(prev => ({ ...prev, requires_training: v }))}
              />
              <Label>Requires Training Acknowledgment</Label>
            </div>
          </div>

          <div>
            <Label>Keywords (comma separated)</Label>
            <Input
              value={form.keywords}
              onChange={(e) => setForm(prev => ({ ...prev, keywords: e.target.value }))}
              placeholder="sanitation, cleaning, hygiene"
            />
          </div>

          <div>
            <Label>Regulatory References (comma separated)</Label>
            <Input
              value={form.regulatory_references}
              onChange={(e) => setForm(prev => ({ ...prev, regulatory_references: e.target.value }))}
              placeholder="21 CFR 117, SQF 11.2.1"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {document ? "Update Document" : "Create Document"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}