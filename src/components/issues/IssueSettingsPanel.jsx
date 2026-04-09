// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, X, Bell, Shield, UserCheck, Trash2 } from "lucide-react";

const CATEGORIES = ["quality", "food_safety", "sanitation", "pest", "environmental", "audit", "customer", "operational", "other"];
const categoryLabels = { quality: "Quality", food_safety: "Food Safety", sanitation: "Sanitation", pest: "Pest Control", environmental: "Environmental", audit: "Audit", customer: "Customer", operational: "Operational", other: "Other" };

export default function IssueSettingsPanel({ settings, organizationId, employees, onRefresh }) {
  const [formData, setFormData] = useState({
    auto_escalate_critical: true, auto_escalate_major: false, escalation_threshold_days: 7,
    default_due_days_by_severity: { minor: 14, moderate: 7, major: 3, critical: 1 },
    require_containment_for_major: true, require_root_cause_for_major: true, require_verification_for_closure: true,
    notification_emails: [], category_owners: []
  });
  const [newEmail, setNewEmail] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setFormData({
        auto_escalate_critical: settings.auto_escalate_critical !== false, auto_escalate_major: settings.auto_escalate_major || false,
        escalation_threshold_days: settings.escalation_threshold_days || 7,
        default_due_days_by_severity: settings.default_due_days_by_severity || { minor: 14, moderate: 7, major: 3, critical: 1 },
        require_containment_for_major: settings.require_containment_for_major !== false, require_root_cause_for_major: settings.require_root_cause_for_major !== false,
        require_verification_for_closure: settings.require_verification_for_closure !== false,
        notification_emails: settings.notification_emails || [], category_owners: settings.category_owners || []
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (settings?.id) await IssueSettingsRepo.update(settings.id, { ...formData, organization_id: organizationId });
      else await IssueSettingsRepo.create({ ...formData, organization_id: organizationId });
      toast.success("Settings saved"); onRefresh();
    } catch (e) { toast.error("Failed to save settings"); }
    setIsSaving(false);
  };

  const addNotificationEmail = () => { if (newEmail && !formData.notification_emails.includes(newEmail)) { setFormData(prev => ({ ...prev, notification_emails: [...prev.notification_emails, newEmail] })); setNewEmail(""); } };
  const removeNotificationEmail = (email) => setFormData(prev => ({ ...prev, notification_emails: prev.notification_emails.filter(e => e !== email) }));

  const addCategoryOwner = () => {
    if (!selectedCategory || !selectedOwner) return;
    const emp = employees.find(e => e.email === selectedOwner);
    if (!emp || formData.category_owners.some(o => o.category === selectedCategory)) { toast.error("This category already has an owner"); return; }
    setFormData(prev => ({ ...prev, category_owners: [...prev.category_owners, { category: selectedCategory, owner_email: emp.email, owner_name: emp.name }] }));
    setSelectedCategory(""); setSelectedOwner("");
  };
  const removeCategoryOwner = (category) => setFormData(prev => ({ ...prev, category_owners: prev.category_owners.filter(o => o.category !== category) }));

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-rose-500" />Auto-Escalation Rules</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><div><span className="text-sm font-medium">Auto-escalate Critical issues to CAPA</span><p className="text-xs text-slate-500">Critical issues will automatically create a CAPA</p></div><Switch checked={formData.auto_escalate_critical} onCheckedChange={(v) => setFormData(prev => ({ ...prev, auto_escalate_critical: v }))} /></label>
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><div><span className="text-sm font-medium">Auto-escalate Major issues to CAPA</span><p className="text-xs text-slate-500">Major issues will automatically create a CAPA</p></div><Switch checked={formData.auto_escalate_major} onCheckedChange={(v) => setFormData(prev => ({ ...prev, auto_escalate_major: v }))} /></label>
          <div><Label>Escalation Threshold (days overdue)</Label><Input type="number" value={formData.escalation_threshold_days} onChange={(e) => setFormData(prev => ({ ...prev, escalation_threshold_days: parseInt(e.target.value) || 7 }))} className="w-32" /></div>
        </CardContent>
      </Card>
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base">Default Due Days by Severity</CardTitle></CardHeader>
        <CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{["minor", "moderate", "major", "critical"].map(sev => (<div key={sev}><Label className="capitalize">{sev}</Label><Input type="number" value={formData.default_due_days_by_severity[sev]} onChange={(e) => setFormData(prev => ({ ...prev, default_due_days_by_severity: { ...prev.default_due_days_by_severity, [sev]: parseInt(e.target.value) || 1 } }))} /></div>))}</div></CardContent>
      </Card>
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base">Requirements</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><span className="text-sm">Require containment for Major/Critical issues</span><Switch checked={formData.require_containment_for_major} onCheckedChange={(v) => setFormData(prev => ({ ...prev, require_containment_for_major: v }))} /></label>
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><span className="text-sm">Require root cause for Major/Critical issues</span><Switch checked={formData.require_root_cause_for_major} onCheckedChange={(v) => setFormData(prev => ({ ...prev, require_root_cause_for_major: v }))} /></label>
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><span className="text-sm">Require verification before closure</span><Switch checked={formData.require_verification_for_closure} onCheckedChange={(v) => setFormData(prev => ({ ...prev, require_verification_for_closure: v }))} /></label>
        </CardContent>
      </Card>
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCheck className="w-4 h-4 text-teal-500" />Category Owners</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}><SelectTrigger className="flex-1"><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{CATEGORIES.filter(c => !formData.category_owners.some(o => o.category === c)).map(cat => (<SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>))}</SelectContent></Select>
            <Select value={selectedOwner} onValueChange={setSelectedOwner}><SelectTrigger className="flex-1"><SelectValue placeholder="Select owner" /></SelectTrigger><SelectContent>{employees.map(emp => (<SelectItem key={emp.id} value={emp.email}>{emp.name}</SelectItem>))}</SelectContent></Select>
            <Button onClick={addCategoryOwner} disabled={!selectedCategory || !selectedOwner}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-2">{formData.category_owners.map((owner, idx) => (<div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"><div><p className="text-sm font-medium">{categoryLabels[owner.category]}</p><p className="text-xs text-slate-500">{owner.owner_name}</p></div><Button variant="ghost" size="icon" onClick={() => removeCategoryOwner(owner.category)}><Trash2 className="w-4 h-4 text-rose-500" /></Button></div>))}</div>
        </CardContent>
      </Card>
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-amber-500" />Notification Emails</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3"><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Add email..." onKeyDown={(e) => e.key === "Enter" && addNotificationEmail()} /><Button onClick={addNotificationEmail} disabled={!newEmail}><Plus className="w-4 h-4" /></Button></div>
          <div className="flex flex-wrap gap-2">{formData.notification_emails.map((email, idx) => (<Badge key={idx} variant="secondary" className="flex items-center gap-1 pr-1">{email}<button onClick={() => removeNotificationEmail(email)} className="ml-1 hover:text-rose-600"><X className="w-3 h-3" /></button></Badge>))}</div>
        </CardContent>
      </Card>
      <div className="flex justify-end"><Button onClick={handleSave} disabled={isSaving} className="bg-rose-600 hover:bg-rose-700">{isSaving ? "Saving..." : "Save Settings"}</Button></div>
    </div>
  );
}