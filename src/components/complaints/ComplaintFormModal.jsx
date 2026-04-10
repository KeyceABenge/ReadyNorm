import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { toast } from "sonner";
import { addDays, format } from "date-fns";
import { Upload, X, Loader2 } from "lucide-react";
import { CustomerComplaintRepo } from "@/lib/adapters/database";

const COMPLAINT_TYPES = [
  { value: "foreign_material", label: "Foreign Material" },
  { value: "quality_defect", label: "Quality Defect" },
  { value: "food_safety", label: "Food Safety Concern" },
  { value: "allergen", label: "Allergen Issue" },
  { value: "labeling", label: "Labeling Error" },
  { value: "packaging", label: "Packaging Issue" },
  { value: "taste_odor", label: "Taste/Odor" },
  { value: "appearance", label: "Appearance" },
  { value: "short_weight", label: "Short Weight" },
  { value: "spoilage", label: "Spoilage" },
  { value: "other", label: "Other" }
];

const CUSTOMER_TYPES = [
  { value: "consumer", label: "Consumer" },
  { value: "retailer", label: "Retailer" },
  { value: "distributor", label: "Distributor" },
  { value: "foodservice", label: "Foodservice" },
  { value: "regulatory", label: "Regulatory Agency" },
  { value: "other", label: "Other" }
];

const SEVERITIES = [
  { value: "minor", label: "Minor", description: "Cosmetic/minor quality issue" },
  { value: "moderate", label: "Moderate", description: "Customer dissatisfaction" },
  { value: "major", label: "Major", description: "Potential food safety risk" },
  { value: "critical", label: "Critical", description: "Illness, injury, or regulatory" }
];

const CUSTOMER_IMPACTS = [
  { value: "none", label: "No Impact" },
  { value: "inconvenience", label: "Inconvenience" },
  { value: "illness_claimed", label: "Illness Claimed" },
  { value: "illness_confirmed", label: "Illness Confirmed" },
  { value: "injury", label: "Injury" },
  { value: "hospitalization", label: "Hospitalization" }
];

const RECEIVED_VIA = [
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "website", label: "Website Form" },
  { value: "social_media", label: "Social Media" },
  { value: "in_person", label: "In Person" },
  { value: "retailer", label: "Through Retailer" },
  { value: "regulatory", label: "Regulatory Agency" }
];

export default function ComplaintFormModal({ open, onOpenChange, organizationId, user, employees, settings, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: "", customer_contact_name: "", customer_email: "", customer_phone: "",
    customer_type: "consumer", complaint_type: "", severity: "moderate", customer_impact: "none",
    product_name: "", product_code: "", lot_number: "", production_date: "", best_by_date: "",
    purchase_location: "", purchase_date: "", complaint_description: "", illness_details: "",
    sample_available: false, received_via: "email", assigned_to_email: "", evidence_urls: []
  });

  const generateComplaintNumber = () => `CC-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;

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
    if (!formData.customer_name || !formData.complaint_type || !formData.complaint_description) {
      toast.error("Please fill in required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      const assignee = employees.find(e => e.email === formData.assigned_to_email);
      const responseDueDays = settings?.response_due_days_by_severity?.[formData.severity] || 5;
      const closureDueDays = settings?.closure_due_days_by_severity?.[formData.severity] || 21;

      let status = "received";
      const shouldEscalate = (
        (formData.severity === "critical" && settings?.auto_escalate_critical) ||
        (["illness_claimed", "illness_confirmed", "injury", "hospitalization"].includes(formData.customer_impact) && settings?.auto_escalate_illness)
      );

      await CustomerComplaintRepo.create({
        organization_id: organizationId,
        complaint_number: generateComplaintNumber(),
        status,
        priority: formData.severity === "critical" ? "critical" : formData.severity === "major" ? "high" : "medium",
        customer_name: formData.customer_name,
        customer_contact_name: formData.customer_contact_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        customer_type: formData.customer_type,
        complaint_type: formData.complaint_type,
        severity: formData.severity,
        customer_impact: formData.customer_impact,
        illness_details: formData.illness_details,
        product_name: formData.product_name,
        product_code: formData.product_code,
        lot_number: formData.lot_number,
        production_date: formData.production_date || null,
        best_by_date: formData.best_by_date || null,
        purchase_location: formData.purchase_location,
        purchase_date: formData.purchase_date || null,
        complaint_description: formData.complaint_description,
        sample_available: formData.sample_available,
        received_via: formData.received_via,
        received_date: new Date().toISOString(),
        received_by_email: user?.email,
        received_by_name: user?.full_name,
        assigned_to_email: formData.assigned_to_email,
        assigned_to_name: assignee?.name,
        evidence_urls: formData.evidence_urls,
        response_due_date: format(addDays(new Date(), responseDueDays), "yyyy-MM-dd"),
        closure_due_date: format(addDays(new Date(), closureDueDays), "yyyy-MM-dd"),
        regulatory_reportable: ["illness_confirmed", "injury", "hospitalization"].includes(formData.customer_impact),
        recall_assessment_required: formData.severity === "critical" || ["illness_confirmed", "injury", "hospitalization"].includes(formData.customer_impact),
        activity_log: [{
          timestamp: new Date().toISOString(),
          action: "created",
          user_email: user?.email,
          user_name: user?.full_name,
          details: "Complaint logged"
        }]
      });

      toast.success("Complaint logged successfully");
      if (shouldEscalate) {
        toast.info("This complaint will require CAPA escalation based on severity/impact");
      }
      onOpenChange(false);
      setFormData({
        customer_name: "", customer_contact_name: "", customer_email: "", customer_phone: "",
        customer_type: "consumer", complaint_type: "", severity: "moderate", customer_impact: "none",
        product_name: "", product_code: "", lot_number: "", production_date: "", best_by_date: "",
        purchase_location: "", purchase_date: "", complaint_description: "", illness_details: "",
        sample_available: false, received_via: "email", assigned_to_email: "", evidence_urls: []
      });
      onSuccess();
    } catch (e) {
      toast.error("Failed to log complaint");
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Customer Complaint</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer/Company Name *</Label>
                <Input value={formData.customer_name} onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))} placeholder="Customer or company name" />
              </div>
              <div>
                <Label>Customer Type</Label>
                <Select value={formData.customer_type} onValueChange={(v) => setFormData(prev => ({ ...prev, customer_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CUSTOMER_TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Contact Name</Label>
                <Input value={formData.customer_contact_name} onChange={(e) => setFormData(prev => ({ ...prev, customer_contact_name: e.target.value }))} placeholder="Contact person" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.customer_email} onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))} placeholder="email@example.com" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={formData.customer_phone} onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))} placeholder="Phone number" />
              </div>
            </div>
          </div>

          {/* Complaint Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">Complaint Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Complaint Type *</Label>
                <Select value={formData.complaint_type} onValueChange={(v) => setFormData(prev => ({ ...prev, complaint_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{COMPLAINT_TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity *</Label>
                <Select value={formData.severity} onValueChange={(v) => setFormData(prev => ({ ...prev, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SEVERITIES.map(s => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Received Via</Label>
                <Select value={formData.received_via} onValueChange={(v) => setFormData(prev => ({ ...prev, received_via: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RECEIVED_VIA.map(r => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Complaint Description *</Label>
              <Textarea value={formData.complaint_description} onChange={(e) => setFormData(prev => ({ ...prev, complaint_description: e.target.value }))} placeholder="Detailed description of the complaint..." rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer Impact</Label>
                <Select value={formData.customer_impact} onValueChange={(v) => setFormData(prev => ({ ...prev, customer_impact: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CUSTOMER_IMPACTS.map(i => (<SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              {["illness_claimed", "illness_confirmed", "injury", "hospitalization"].includes(formData.customer_impact) && (
                <div>
                  <Label>Illness/Injury Details</Label>
                  <Input value={formData.illness_details} onChange={(e) => setFormData(prev => ({ ...prev, illness_details: e.target.value }))} placeholder="Symptoms, medical attention, etc." />
                </div>
              )}
            </div>
          </div>

          {/* Product Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">Product Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Product Name</Label>
                <Input value={formData.product_name} onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))} placeholder="Product name" />
              </div>
              <div>
                <Label>Product Code/SKU</Label>
                <Input value={formData.product_code} onChange={(e) => setFormData(prev => ({ ...prev, product_code: e.target.value }))} placeholder="Product code" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Lot Number</Label>
                <Input value={formData.lot_number} onChange={(e) => setFormData(prev => ({ ...prev, lot_number: e.target.value }))} placeholder="Lot/batch number" />
              </div>
              <div>
                <Label>Production Date</Label>
                <Input type="date" value={formData.production_date} onChange={(e) => setFormData(prev => ({ ...prev, production_date: e.target.value }))} />
              </div>
              <div>
                <Label>Best By Date</Label>
                <Input type="date" value={formData.best_by_date} onChange={(e) => setFormData(prev => ({ ...prev, best_by_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Purchase Location</Label>
                <Input value={formData.purchase_location} onChange={(e) => setFormData(prev => ({ ...prev, purchase_location: e.target.value }))} placeholder="Where purchased" />
              </div>
              <div>
                <Label>Purchase Date</Label>
                <Input type="date" value={formData.purchase_date} onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))} />
              </div>
            </div>
            <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg cursor-pointer">
              <Switch checked={formData.sample_available} onCheckedChange={(v) => setFormData(prev => ({ ...prev, sample_available: v }))} />
              <span className="text-sm text-slate-700">Sample available from customer</span>
            </label>
          </div>

          {/* Assignment & Evidence */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">Assignment & Evidence</h3>
            <div>
              <Label>Assign To</Label>
              <Select value={formData.assigned_to_email} onValueChange={(v) => setFormData(prev => ({ ...prev, assigned_to_email: v }))}>
                <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
                <SelectContent>{employees.map(emp => (<SelectItem key={emp.id} value={emp.email}>{emp.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Evidence / Photos from Customer</Label>
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
                      <button onClick={() => removeEvidence(url)} className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Warnings */}
          {(formData.severity === "critical" || ["illness_claimed", "illness_confirmed", "injury", "hospitalization"].includes(formData.customer_impact)) && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-sm text-rose-800">
                ⚠️ This complaint may require:
                {formData.severity === "critical" && " CAPA escalation,"}
                {["illness_confirmed", "injury", "hospitalization"].includes(formData.customer_impact) && " regulatory reporting,"}
                {" recall assessment."}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
              {isSubmitting ? "Logging..." : "Log Complaint"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}