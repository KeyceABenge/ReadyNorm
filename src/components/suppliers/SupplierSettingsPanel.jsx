import { useState, useEffect } from "react";
import { SupplierSettingsRepo } from "@/lib/adapters/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toast } from "sonner";
import { Plus, X, Bell, Shield, UserCheck, Trash2 } from "lucide-react";

export default function SupplierSettingsPanel({ settings, organizationId, employees, onRefresh }) {
  const [formData, setFormData] = useState({
    auto_suspend_on_critical_nc: true, auto_escalate_to_capa: true, nc_escalation_threshold: 3,
    default_review_frequency_months: 12, default_audit_frequency_months: 12,
    document_expiration_warning_days: [30, 14, 7],
    required_document_types: ["specification", "coa", "food_safety_cert", "insurance", "allergen_statement"],
    supplier_categories: ["Raw Materials", "Packaging", "Chemicals", "Services", "Equipment"],
    notification_emails: [], qualified_approvers: []
  });
  const [newEmail, setNewEmail] = useState("");
  const [newDocType, setNewDocType] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [selectedApprover, setSelectedApprover] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setFormData({
        auto_suspend_on_critical_nc: settings.auto_suspend_on_critical_nc !== false,
        auto_escalate_to_capa: settings.auto_escalate_to_capa !== false,
        nc_escalation_threshold: settings.nc_escalation_threshold || 3,
        default_review_frequency_months: settings.default_review_frequency_months || 12,
        default_audit_frequency_months: settings.default_audit_frequency_months || 12,
        document_expiration_warning_days: settings.document_expiration_warning_days || [30, 14, 7],
        required_document_types: settings.required_document_types || ["specification", "coa", "food_safety_cert"],
        supplier_categories: settings.supplier_categories || ["Raw Materials", "Packaging"],
        notification_emails: settings.notification_emails || [],
        qualified_approvers: settings.qualified_approvers || []
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (settings?.id) await SupplierSettingsRepo.update(settings.id, { ...formData, organization_id: organizationId });
      else await SupplierSettingsRepo.create({ ...formData, organization_id: organizationId });
      toast.success("Settings saved"); onRefresh();
    } catch (e) { toast.error("Failed to save"); }
    setIsSaving(false);
  };

  const addEmail = () => { if (newEmail && !formData.notification_emails.includes(newEmail)) { setFormData(prev => ({ ...prev, notification_emails: [...prev.notification_emails, newEmail] })); setNewEmail(""); } };
  const removeEmail = (email) => setFormData(prev => ({ ...prev, notification_emails: prev.notification_emails.filter(e => e !== email) }));

  const addDocType = () => { if (newDocType && !formData.required_document_types.includes(newDocType)) { setFormData(prev => ({ ...prev, required_document_types: [...prev.required_document_types, newDocType] })); setNewDocType(""); } };
  const removeDocType = (type) => setFormData(prev => ({ ...prev, required_document_types: prev.required_document_types.filter(t => t !== type) }));

  const addCategory = () => { if (newCategory && !formData.supplier_categories.includes(newCategory)) { setFormData(prev => ({ ...prev, supplier_categories: [...prev.supplier_categories, newCategory] })); setNewCategory(""); } };
  const removeCategory = (cat) => setFormData(prev => ({ ...prev, supplier_categories: prev.supplier_categories.filter(c => c !== cat) }));

  const addApprover = () => {
    if (!selectedApprover) return;
    const emp = employees.find(e => e.email === selectedApprover);
    if (!emp || formData.qualified_approvers.some(a => a.email === selectedApprover)) return;
    setFormData(prev => ({ ...prev, qualified_approvers: [...prev.qualified_approvers, { email: emp.email, name: emp.name }] }));
    setSelectedApprover("");
  };
  const removeApprover = (email) => setFormData(prev => ({ ...prev, qualified_approvers: prev.qualified_approvers.filter(a => a.email !== email) }));

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-cyan-500" />Automation Rules</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><div><span className="text-sm font-medium">Auto-suspend on Critical NC</span><p className="text-xs text-slate-500">Automatically suspend suppliers with critical nonconformances</p></div><Switch checked={formData.auto_suspend_on_critical_nc} onCheckedChange={(v) => setFormData(prev => ({ ...prev, auto_suspend_on_critical_nc: v }))} /></label>
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><div><span className="text-sm font-medium">Auto-escalate to CAPA</span><p className="text-xs text-slate-500">Create CAPA when NC threshold is reached</p></div><Switch checked={formData.auto_escalate_to_capa} onCheckedChange={(v) => setFormData(prev => ({ ...prev, auto_escalate_to_capa: v }))} /></label>
          <div><Label>NC Escalation Threshold</Label><Input type="number" value={formData.nc_escalation_threshold} onChange={(e) => setFormData(prev => ({ ...prev, nc_escalation_threshold: parseInt(e.target.value) || 3 }))} className="w-32" /></div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base">Default Frequencies</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Review Frequency (months)</Label><Input type="number" value={formData.default_review_frequency_months} onChange={(e) => setFormData(prev => ({ ...prev, default_review_frequency_months: parseInt(e.target.value) || 12 }))} /></div>
            <div><Label>Audit Frequency (months)</Label><Input type="number" value={formData.default_audit_frequency_months} onChange={(e) => setFormData(prev => ({ ...prev, default_audit_frequency_months: parseInt(e.target.value) || 12 }))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base">Required Document Types</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3"><Input value={newDocType} onChange={(e) => setNewDocType(e.target.value)} placeholder="Add document type..." onKeyDown={(e) => e.key === "Enter" && addDocType()} /><Button onClick={addDocType} disabled={!newDocType}><Plus className="w-4 h-4" /></Button></div>
          <div className="flex flex-wrap gap-2">{formData.required_document_types.map((type, idx) => (<Badge key={idx} variant="secondary" className="flex items-center gap-1 pr-1 capitalize">{type.replace(/_/g, " ")}<button onClick={() => removeDocType(type)} className="ml-1 hover:text-rose-600"><X className="w-3 h-3" /></button></Badge>))}</div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base">Supplier Categories</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3"><Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Add category..." onKeyDown={(e) => e.key === "Enter" && addCategory()} /><Button onClick={addCategory} disabled={!newCategory}><Plus className="w-4 h-4" /></Button></div>
          <div className="flex flex-wrap gap-2">{formData.supplier_categories.map((cat, idx) => (<Badge key={idx} variant="secondary" className="flex items-center gap-1 pr-1">{cat}<button onClick={() => removeCategory(cat)} className="ml-1 hover:text-rose-600"><X className="w-3 h-3" /></button></Badge>))}</div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCheck className="w-4 h-4 text-teal-500" />Qualified Approvers</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Select value={selectedApprover} onValueChange={setSelectedApprover}><SelectTrigger className="flex-1"><SelectValue placeholder="Select approver" /></SelectTrigger><SelectContent>{employees.filter(e => !formData.qualified_approvers.some(a => a.email === e.email)).map(emp => (<SelectItem key={emp.id} value={emp.email}>{emp.name}</SelectItem>))}</SelectContent></Select>
            <Button onClick={addApprover} disabled={!selectedApprover}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-2">{formData.qualified_approvers.map((approver, idx) => (<div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"><span className="text-sm">{approver.name}</span><Button variant="ghost" size="icon" onClick={() => removeApprover(approver.email)}><Trash2 className="w-4 h-4 text-rose-500" /></Button></div>))}</div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-amber-500" />Notification Emails</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3"><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Add email..." onKeyDown={(e) => e.key === "Enter" && addEmail()} /><Button onClick={addEmail} disabled={!newEmail}><Plus className="w-4 h-4" /></Button></div>
          <div className="flex flex-wrap gap-2">{formData.notification_emails.map((email, idx) => (<Badge key={idx} variant="secondary" className="flex items-center gap-1 pr-1">{email}<button onClick={() => removeEmail(email)} className="ml-1 hover:text-rose-600"><X className="w-3 h-3" /></button></Badge>))}</div>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button onClick={handleSave} disabled={isSaving} className="bg-cyan-600 hover:bg-cyan-700">{isSaving ? "Saving..." : "Save Settings"}</Button></div>
    </div>
  );
}