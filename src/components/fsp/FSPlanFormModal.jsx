import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { addMonths, format } from "date-fns";

export default function FSPlanFormModal({ open, onOpenChange, organizationId, user, employees, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "", plan_type: "harpc", product_category: "", product_description: "",
    intended_use: "", target_consumer: "", scope: "", team_leader_email: "",
    review_frequency_months: 12
  });

  const handleSubmit = async () => {
    if (!formData.title) { toast.error("Enter a title"); return; }
    setIsSubmitting(true);
    try {
      const leader = employees.find(e => e.email === formData.team_leader_email);
      await FoodSafetyPlanRepo.create({
        organization_id: organizationId,
        plan_number: `FSP-${Math.floor(Math.random() * 9000) + 1000}`,
        title: formData.title,
        plan_type: formData.plan_type,
        product_category: formData.product_category,
        product_description: formData.product_description,
        intended_use: formData.intended_use,
        target_consumer: formData.target_consumer,
        scope: formData.scope,
        status: "draft",
        version: "1.0",
        team_leader_email: formData.team_leader_email,
        team_leader_name: leader?.name,
        review_frequency_months: formData.review_frequency_months,
        next_review_date: format(addMonths(new Date(), formData.review_frequency_months), "yyyy-MM-dd"),
        regulatory_basis: formData.plan_type === "harpc" ? ["21 CFR 117 - FSMA Preventive Controls"] : ["21 CFR 120 - HACCP"],
        revision_history: [{ version: "1.0", date: new Date().toISOString(), description: "Initial creation", changed_by: user?.full_name }],
        activity_log: [{ timestamp: new Date().toISOString(), action: "created", user_email: user?.email, user_name: user?.full_name, details: "Plan created" }]
      });
      toast.success("Plan created"); onOpenChange(false);
      setFormData({ title: "", plan_type: "harpc", product_category: "", product_description: "", intended_use: "", target_consumer: "", scope: "", team_leader_email: "", review_frequency_months: 12 });
      onSuccess();
    } catch (e) { toast.error("Failed to create"); }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Food Safety Plan</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div><Label>Plan Title *</Label><Input value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g., Ready-to-Eat Salads Food Safety Plan" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Plan Type</Label>
              <Select value={formData.plan_type} onValueChange={(v) => setFormData(prev => ({ ...prev, plan_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="harpc">HARPC (FSMA)</SelectItem>
                  <SelectItem value="haccp">HACCP</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Product Category</Label><Input value={formData.product_category} onChange={(e) => setFormData(prev => ({ ...prev, product_category: e.target.value }))} placeholder="e.g., Ready-to-Eat Foods" /></div>
          </div>
          <div><Label>Product Description</Label><Textarea value={formData.product_description} onChange={(e) => setFormData(prev => ({ ...prev, product_description: e.target.value }))} placeholder="Describe the product(s) covered..." rows={2} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Intended Use</Label><Input value={formData.intended_use} onChange={(e) => setFormData(prev => ({ ...prev, intended_use: e.target.value }))} placeholder="e.g., Ready-to-eat, no further cooking" /></div>
            <div><Label>Target Consumer</Label><Input value={formData.target_consumer} onChange={(e) => setFormData(prev => ({ ...prev, target_consumer: e.target.value }))} placeholder="e.g., General public including susceptible populations" /></div>
          </div>
          <div><Label>Scope</Label><Textarea value={formData.scope} onChange={(e) => setFormData(prev => ({ ...prev, scope: e.target.value }))} placeholder="Define the scope of this plan..." rows={2} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Team Leader (PCQI)</Label>
              <Select value={formData.team_leader_email} onValueChange={(v) => setFormData(prev => ({ ...prev, team_leader_email: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{employees.map(e => (<SelectItem key={e.id} value={e.email}>{e.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Review Frequency (months)</Label><Input type="number" value={formData.review_frequency_months} onChange={(e) => setFormData(prev => ({ ...prev, review_frequency_months: parseInt(e.target.value) || 12 }))} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">{isSubmitting ? "Creating..." : "Create Plan"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}