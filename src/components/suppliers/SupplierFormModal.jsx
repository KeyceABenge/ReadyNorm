import { useState } from "react";
import { SupplierRepo } from "@/lib/adapters/database";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toast } from "sonner";
import { addMonths, format } from "date-fns";

const SUPPLIER_TYPES = [
  { value: "ingredient", label: "Ingredient Supplier" },
  { value: "packaging", label: "Packaging Supplier" },
  { value: "service", label: "Service Provider" },
  { value: "equipment", label: "Equipment Supplier" },
  { value: "chemical", label: "Chemical Supplier" },
  { value: "other", label: "Other" }
];

const RISK_RATINGS = [
  { value: "low", label: "Low Risk" },
  { value: "medium", label: "Medium Risk" },
  { value: "high", label: "High Risk" },
  { value: "critical", label: "Critical Risk" }
];

export default function SupplierFormModal({ open, onOpenChange, organizationId, user, settings, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "", supplier_type: "ingredient", risk_rating: "medium", category: "",
    contact_name: "", contact_email: "", contact_phone: "",
    address: "", city: "", state: "", country: "",
    review_frequency_months: 12, audit_frequency_months: 12, notes: ""
  });

  const generateSupplierCode = () => `SUP-${Math.floor(Math.random() * 9000) + 1000}`;

  const handleSubmit = async () => {
    if (!formData.name || !formData.supplier_type) {
      toast.error("Please fill in required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      const reviewFreq = formData.review_frequency_months || settings?.default_review_frequency_months || 12;
      const auditFreq = formData.audit_frequency_months || settings?.default_audit_frequency_months || 12;

      await SupplierRepo.create({
        organization_id: organizationId,
        supplier_code: generateSupplierCode(),
        name: formData.name,
        status: "pending_approval",
        supplier_type: formData.supplier_type,
        risk_rating: formData.risk_rating,
        category: formData.category,
        contact_name: formData.contact_name,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        review_frequency_months: reviewFreq,
        audit_frequency_months: auditFreq,
        next_review_date: format(addMonths(new Date(), reviewFreq), "yyyy-MM-dd"),
        notes: formData.notes,
        required_documents: (settings?.required_document_types || ["specification", "coa", "food_safety_cert"]).map(type => ({
          document_type: type, required: true, on_file: false
        })),
        activity_log: [{
          timestamp: new Date().toISOString(),
          action: "created",
          user_email: user?.email,
          user_name: user?.full_name,
          details: "Supplier created"
        }]
      });

      toast.success("Supplier added successfully");
      onOpenChange(false);
      setFormData({
        name: "", supplier_type: "ingredient", risk_rating: "medium", category: "",
        contact_name: "", contact_email: "", contact_phone: "",
        address: "", city: "", state: "", country: "",
        review_frequency_months: 12, audit_frequency_months: 12, notes: ""
      });
      onSuccess();
    } catch (e) {
      toast.error("Failed to add supplier");
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Supplier</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">Basic Information</h3>
            <div>
              <Label>Supplier Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Company name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Supplier Type *</Label>
                <Select value={formData.supplier_type} onValueChange={(v) => setFormData(prev => ({ ...prev, supplier_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SUPPLIER_TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Risk Rating</Label>
                <Select value={formData.risk_rating} onValueChange={(v) => setFormData(prev => ({ ...prev, risk_rating: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RISK_RATINGS.map(r => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Input value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))} placeholder="e.g., Raw Materials, Packaging" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Name</Label>
                <Input value={formData.contact_name} onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))} placeholder="Primary contact" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.contact_email} onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))} placeholder="email@supplier.com" />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={formData.contact_phone} onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))} placeholder="Phone number" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">Address</h3>
            <div>
              <Label>Street Address</Label>
              <Input value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} placeholder="Street address" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>City</Label>
                <Input value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} />
              </div>
              <div>
                <Label>State/Province</Label>
                <Input value={formData.state} onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))} />
              </div>
              <div>
                <Label>Country</Label>
                <Input value={formData.country} onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">Review Schedule</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Review Frequency (months)</Label>
                <Input type="number" value={formData.review_frequency_months} onChange={(e) => setFormData(prev => ({ ...prev, review_frequency_months: parseInt(e.target.value) || 12 }))} />
              </div>
              <div>
                <Label>Audit Frequency (months)</Label>
                <Input type="number" value={formData.audit_frequency_months} onChange={(e) => setFormData(prev => ({ ...prev, audit_frequency_months: parseInt(e.target.value) || 12 }))} />
              </div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Additional notes..." rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-cyan-600 hover:bg-cyan-700">
              {isSubmitting ? "Adding..." : "Add Supplier"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}