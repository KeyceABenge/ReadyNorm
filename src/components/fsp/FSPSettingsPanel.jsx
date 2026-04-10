import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, X, Bell, UserCheck, Trash2, Shield } from "lucide-react";
import { FSPSettingsRepo } from "@/lib/adapters/database";

export default function FSPSettingsPanel({ settings, organizationId, employees, onRefresh }) {
  const [formData, setFormData] = useState({
    default_review_frequency_months: 12,
    verification_frequency_days: 7,
    significance_threshold: 9,
    revalidation_triggers: ["process_change", "equipment_change", "ingredient_change", "positive_emp", "customer_complaint", "audit_finding", "capa"],
    qualified_individuals: [],
    notification_emails: [],
    auto_flag_review_on: { emp_positive: true, pest_finding: true, customer_complaint: true, audit_finding: true, supplier_nc: true }
  });
  const [newEmail, setNewEmail] = useState("");
  const [selectedQI, setSelectedQI] = useState("");
  const [qiQualifications, setQiQualifications] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setFormData({
        default_review_frequency_months: settings.default_review_frequency_months || 12,
        verification_frequency_days: settings.verification_frequency_days || 7,
        significance_threshold: settings.significance_threshold || 9,
        revalidation_triggers: settings.revalidation_triggers || [],
        qualified_individuals: settings.qualified_individuals || [],
        notification_emails: settings.notification_emails || [],
        auto_flag_review_on: settings.auto_flag_review_on || {}
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (settings?.id) await FSPSettingsRepo.update(settings.id, { ...formData, organization_id: organizationId });
      else await FSPSettingsRepo.create({ ...formData, organization_id: organizationId });
      toast.success("Settings saved"); onRefresh();
    } catch (e) { toast.error("Failed to save"); }
    setIsSaving(false);
  };

  const addEmail = () => { if (newEmail && !formData.notification_emails.includes(newEmail)) { setFormData(prev => ({ ...prev, notification_emails: [...prev.notification_emails, newEmail] })); setNewEmail(""); } };
  const removeEmail = (email) => setFormData(prev => ({ ...prev, notification_emails: prev.notification_emails.filter(e => e !== email) }));

  const addQI = () => {
    if (!selectedQI) return;
    const emp = employees.find(e => e.email === selectedQI);
    if (!emp || formData.qualified_individuals.some(q => q.email === selectedQI)) return;
    setFormData(prev => ({ ...prev, qualified_individuals: [...prev.qualified_individuals, { email: emp.email, name: emp.name, qualifications: qiQualifications }] }));
    setSelectedQI(""); setQiQualifications("");
  };
  const removeQI = (email) => setFormData(prev => ({ ...prev, qualified_individuals: prev.qualified_individuals.filter(q => q.email !== email) }));

  const toggleTrigger = (trigger) => {
    setFormData(prev => ({
      ...prev,
      revalidation_triggers: prev.revalidation_triggers.includes(trigger)
        ? prev.revalidation_triggers.filter(t => t !== trigger)
        : [...prev.revalidation_triggers, trigger]
    }));
  };

  const toggleAutoFlag = (key) => {
    setFormData(prev => ({
      ...prev,
      auto_flag_review_on: { ...prev.auto_flag_review_on, [key]: !prev.auto_flag_review_on[key] }
    }));
  };

  const TRIGGERS = [
    { key: "process_change", label: "Process Change" },
    { key: "equipment_change", label: "Equipment Change" },
    { key: "ingredient_change", label: "Ingredient/Supplier Change" },
    { key: "positive_emp", label: "Positive EMP Result" },
    { key: "customer_complaint", label: "Customer Complaint" },
    { key: "audit_finding", label: "Audit Finding" },
    { key: "capa", label: "CAPA Completion" }
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base">General Settings</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Plan Review Frequency (months)</Label><Input type="number" value={formData.default_review_frequency_months} onChange={(e) => setFormData(prev => ({ ...prev, default_review_frequency_months: parseInt(e.target.value) || 12 }))} /></div>
            <div><Label>Verification Frequency (days)</Label><Input type="number" value={formData.verification_frequency_days} onChange={(e) => setFormData(prev => ({ ...prev, verification_frequency_days: parseInt(e.target.value) || 7 }))} /></div>
            <div><Label>Significance Threshold (L×S)</Label><Input type="number" value={formData.significance_threshold} onChange={(e) => setFormData(prev => ({ ...prev, significance_threshold: parseInt(e.target.value) || 9 }))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-500" />Revalidation Triggers</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">Select events that should trigger plan revalidation review</p>
          {TRIGGERS.map(trigger => (
            <label key={trigger.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm">{trigger.label}</span>
              <Switch checked={formData.revalidation_triggers.includes(trigger.key)} onCheckedChange={() => toggleTrigger(trigger.key)} />
            </label>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base">Auto-Flag Plan Review On</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "emp_positive", label: "EMP Positive Result" },
            { key: "pest_finding", label: "Pest Finding" },
            { key: "customer_complaint", label: "Customer Complaint" },
            { key: "audit_finding", label: "Audit Finding" },
            { key: "supplier_nc", label: "Supplier Nonconformance" }
          ].map(item => (
            <label key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm">{item.label}</span>
              <Switch checked={formData.auto_flag_review_on[item.key] !== false} onCheckedChange={() => toggleAutoFlag(item.key)} />
            </label>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCheck className="w-4 h-4 text-teal-500" />Qualified Individuals (PCQI)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Select value={selectedQI} onValueChange={setSelectedQI}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Select person" /></SelectTrigger>
              <SelectContent>{employees.filter(e => !formData.qualified_individuals.some(q => q.email === e.email)).map(e => (<SelectItem key={e.id} value={e.email}>{e.name}</SelectItem>))}</SelectContent>
            </Select>
            <Input value={qiQualifications} onChange={(e) => setQiQualifications(e.target.value)} placeholder="Qualifications" className="w-48" />
            <Button onClick={addQI} disabled={!selectedQI}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-2">{formData.qualified_individuals.map((qi, idx) => (<div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"><div><p className="text-sm font-medium">{qi.name}</p>{qi.qualifications && <p className="text-xs text-slate-500">{qi.qualifications}</p>}</div><Button variant="ghost" size="icon" onClick={() => removeQI(qi.email)}><Trash2 className="w-4 h-4 text-rose-500" /></Button></div>))}</div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-amber-500" />Notification Emails</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3"><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Add email..." onKeyDown={(e) => e.key === "Enter" && addEmail()} /><Button onClick={addEmail} disabled={!newEmail}><Plus className="w-4 h-4" /></Button></div>
          <div className="flex flex-wrap gap-2">{formData.notification_emails.map((email, idx) => (<Badge key={idx} variant="secondary" className="flex items-center gap-1 pr-1">{email}<button onClick={() => removeEmail(email)} className="ml-1 hover:text-rose-600"><X className="w-3 h-3" /></button></Badge>))}</div>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">{isSaving ? "Saving..." : "Save Settings"}</Button></div>
    </div>
  );
}