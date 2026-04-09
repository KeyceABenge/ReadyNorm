// @ts-nocheck
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { addMonths, format } from "date-fns";

const CATEGORIES = ["food_safety", "quality", "operational", "regulatory", "supplier", "environmental", "personnel", "equipment", "other"];
const SOURCES = ["manual", "sanitation", "emp", "pest", "audit", "capa", "complaint", "supplier", "incident", "downtime"];
const REVIEW_FREQ = ["weekly", "monthly", "quarterly", "semi_annual", "annual"];

const calculateRiskLevel = (score, settings) => {
  const matrix = settings?.risk_matrix || { low_max: 4, medium_max: 9, high_max: 16 };
  if (score <= matrix.low_max) return "low";
  if (score <= matrix.medium_max) return "medium";
  if (score <= matrix.high_max) return "high";
  return "critical";
};

export default function RiskFormModal({ open, onOpenChange, organizationId, user, settings, employees, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "", description: "", category: "food_safety", source: "manual",
    likelihood: 3, severity: 3, owner_email: "", review_frequency: "quarterly",
    controls_in_place: "", notes: ""
  });

  const riskScore = formData.likelihood * formData.severity;
  const riskLevel = calculateRiskLevel(riskScore, settings);

  const handleSubmit = async () => {
    if (!formData.title) { toast.error("Please enter a title"); return; }
    setIsSubmitting(true);
    try {
      const owner = employees.find(e => e.email === formData.owner_email);
      const freqMonths = { weekly: 0.25, monthly: 1, quarterly: 3, semi_annual: 6, annual: 12 }[formData.review_frequency] || 3;

      await RiskEntryRepo.create({
        organization_id: organizationId,
        risk_number: `RISK-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        source: formData.source,
        status: "identified",
        likelihood: formData.likelihood,
        severity: formData.severity,
        risk_score: riskScore,
        risk_level: riskLevel,
        owner_email: formData.owner_email,
        owner_name: owner?.name || "",
        review_frequency: formData.review_frequency,
        next_review_date: format(addMonths(new Date(), freqMonths), "yyyy-MM-dd"),
        identified_date: format(new Date(), "yyyy-MM-dd"),
        identified_by: user?.email,
        controls_in_place: formData.controls_in_place ? [{ control: formData.controls_in_place, effectiveness: "effective", last_verified: new Date().toISOString() }] : [],
        notes: formData.notes,
        trend: "stable",
        activity_log: [{ timestamp: new Date().toISOString(), action: "created", user_email: user?.email, user_name: user?.full_name, details: "Risk identified" }]
      });

      toast.success("Risk added"); onOpenChange(false);
      setFormData({ title: "", description: "", category: "food_safety", source: "manual", likelihood: 3, severity: 3, owner_email: "", review_frequency: "quarterly", controls_in_place: "", notes: "" });
      onSuccess();
    } catch (e) { toast.error("Failed to add risk"); }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add New Risk</DialogTitle></DialogHeader>
        <div className="space-y-6 mt-4">
          <div className="space-y-4">
            <div><Label>Risk Title *</Label><Input value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Brief risk description" /></div>
            <div><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Detailed description..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => (<SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Source</Label>
                <Select value={formData.source} onValueChange={(v) => setFormData(prev => ({ ...prev, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCES.map(s => (<SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Risk Assessment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Likelihood (1-5)</Label>
                <Select value={String(formData.likelihood)} onValueChange={(v) => setFormData(prev => ({ ...prev, likelihood: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Rare</SelectItem>
                    <SelectItem value="2">2 - Unlikely</SelectItem>
                    <SelectItem value="3">3 - Possible</SelectItem>
                    <SelectItem value="4">4 - Likely</SelectItem>
                    <SelectItem value="5">5 - Almost Certain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity (1-5)</Label>
                <Select value={String(formData.severity)} onValueChange={(v) => setFormData(prev => ({ ...prev, severity: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Negligible</SelectItem>
                    <SelectItem value="2">2 - Minor</SelectItem>
                    <SelectItem value="3">3 - Moderate</SelectItem>
                    <SelectItem value="4">4 - Major</SelectItem>
                    <SelectItem value="5">5 - Catastrophic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-white rounded-lg">
              <span className="text-sm text-slate-600">Risk Score:</span>
              <span className="text-2xl font-bold text-slate-800">{riskScore}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${riskLevel === "critical" ? "bg-rose-100 text-rose-700" : riskLevel === "high" ? "bg-orange-100 text-orange-700" : riskLevel === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-emerald-100 text-emerald-700"}`}>
                {riskLevel.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><Label>Risk Owner</Label>
              <Select value={formData.owner_email} onValueChange={(v) => setFormData(prev => ({ ...prev, owner_email: v }))}>
                <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                <SelectContent>{employees.map(e => (<SelectItem key={e.id} value={e.email}>{e.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Review Frequency</Label>
              <Select value={formData.review_frequency} onValueChange={(v) => setFormData(prev => ({ ...prev, review_frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REVIEW_FREQ.map(f => (<SelectItem key={f} value={f} className="capitalize">{f.replace(/_/g, " ")}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>

          <div><Label>Controls in Place</Label><Textarea value={formData.controls_in_place} onChange={(e) => setFormData(prev => ({ ...prev, controls_in_place: e.target.value }))} placeholder="Current controls or mitigations..." rows={2} /></div>
          <div><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} rows={2} /></div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">{isSubmitting ? "Adding..." : "Add Risk"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}