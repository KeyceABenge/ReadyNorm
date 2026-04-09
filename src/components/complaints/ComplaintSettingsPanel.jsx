import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toast } from "sonner";
import { Plus, X, Bell, Shield, UserCheck, Trash2, Building2 } from "lucide-react";

const COMPLAINT_TYPES = ["foreign_material", "quality_defect", "food_safety", "allergen", "labeling", "packaging", "taste_odor", "appearance", "short_weight", "spoilage", "other"];
const typeLabels = { foreign_material: "Foreign Material", quality_defect: "Quality Defect", food_safety: "Food Safety", allergen: "Allergen", labeling: "Labeling", packaging: "Packaging", taste_odor: "Taste/Odor", appearance: "Appearance", short_weight: "Short Weight", spoilage: "Spoilage", other: "Other" };

export default function ComplaintSettingsPanel({ settings, organizationId, employees, onRefresh }) {
  const [formData, setFormData] = useState({
    auto_escalate_critical: true, auto_escalate_illness: true, auto_escalate_recurring: true, recurrence_threshold: 3,
    response_due_days_by_severity: { minor: 7, moderate: 5, major: 3, critical: 1 },
    closure_due_days_by_severity: { minor: 30, moderate: 21, major: 14, critical: 7 },
    require_root_cause_for_closure: true, require_corrective_action_for_major: true, require_customer_response: true,
    effectiveness_check_days: 30, notification_emails: [], complaint_type_owners: [], customer_accounts: []
  });
  const [newEmail, setNewEmail] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("");
  const [newCustomer, setNewCustomer] = useState({ name: "", type: "retailer", contact_name: "", contact_email: "", contact_phone: "" });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setFormData({
        auto_escalate_critical: settings.auto_escalate_critical !== false,
        auto_escalate_illness: settings.auto_escalate_illness !== false,
        auto_escalate_recurring: settings.auto_escalate_recurring !== false,
        recurrence_threshold: settings.recurrence_threshold || 3,
        response_due_days_by_severity: settings.response_due_days_by_severity || { minor: 7, moderate: 5, major: 3, critical: 1 },
        closure_due_days_by_severity: settings.closure_due_days_by_severity || { minor: 30, moderate: 21, major: 14, critical: 7 },
        require_root_cause_for_closure: settings.require_root_cause_for_closure !== false,
        require_corrective_action_for_major: settings.require_corrective_action_for_major !== false,
        require_customer_response: settings.require_customer_response !== false,
        effectiveness_check_days: settings.effectiveness_check_days || 30,
        notification_emails: settings.notification_emails || [],
        complaint_type_owners: settings.complaint_type_owners || [],
        customer_accounts: settings.customer_accounts || []
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (settings?.id) await ComplaintSettingsRepo.update(settings.id, { ...formData, organization_id: organizationId });
      else await ComplaintSettingsRepo.create({ ...formData, organization_id: organizationId });
      toast.success("Settings saved"); onRefresh();
    } catch (e) { toast.error("Failed to save settings"); }
    setIsSaving(false);
  };

  const addNotificationEmail = () => { if (newEmail && !formData.notification_emails.includes(newEmail)) { setFormData(prev => ({ ...prev, notification_emails: [...prev.notification_emails, newEmail] })); setNewEmail(""); } };
  const removeNotificationEmail = (email) => setFormData(prev => ({ ...prev, notification_emails: prev.notification_emails.filter(e => e !== email) }));

  const addTypeOwner = () => {
    if (!selectedType || !selectedOwner) return;
    const emp = employees.find(e => e.email === selectedOwner);
    if (!emp || formData.complaint_type_owners.some(o => o.complaint_type === selectedType)) { toast.error("This type already has an owner"); return; }
    setFormData(prev => ({ ...prev, complaint_type_owners: [...prev.complaint_type_owners, { complaint_type: selectedType, owner_email: emp.email, owner_name: emp.name }] }));
    setSelectedType(""); setSelectedOwner("");
  };
  const removeTypeOwner = (type) => setFormData(prev => ({ ...prev, complaint_type_owners: prev.complaint_type_owners.filter(o => o.complaint_type !== type) }));

  const addCustomerAccount = () => {
    if (!newCustomer.name) { toast.error("Customer name required"); return; }
    setFormData(prev => ({ ...prev, customer_accounts: [...prev.customer_accounts, { ...newCustomer }] }));
    setNewCustomer({ name: "", type: "retailer", contact_name: "", contact_email: "", contact_phone: "" });
  };
  const removeCustomerAccount = (name) => setFormData(prev => ({ ...prev, customer_accounts: prev.customer_accounts.filter(c => c.name !== name) }));

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-purple-500" />Auto-Escalation Rules</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><div><span className="text-sm font-medium">Auto-escalate Critical complaints to CAPA</span><p className="text-xs text-slate-500">Critical severity complaints create CAPA automatically</p></div><Switch checked={formData.auto_escalate_critical} onCheckedChange={(v) => setFormData(prev => ({ ...prev, auto_escalate_critical: v }))} /></label>
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><div><span className="text-sm font-medium">Auto-escalate Illness/Injury complaints to CAPA</span><p className="text-xs text-slate-500">Complaints with illness or injury claims create CAPA</p></div><Switch checked={formData.auto_escalate_illness} onCheckedChange={(v) => setFormData(prev => ({ ...prev, auto_escalate_illness: v }))} /></label>
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><div><span className="text-sm font-medium">Auto-escalate Recurring complaints to CAPA</span><p className="text-xs text-slate-500">Complaints flagged as recurring create CAPA</p></div><Switch checked={formData.auto_escalate_recurring} onCheckedChange={(v) => setFormData(prev => ({ ...prev, auto_escalate_recurring: v }))} /></label>
          <div><Label>Recurrence Threshold (similar complaints)</Label><Input type="number" value={formData.recurrence_threshold} onChange={(e) => setFormData(prev => ({ ...prev, recurrence_threshold: parseInt(e.target.value) || 3 }))} className="w-32" /></div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base">Response Due Days by Severity</CardTitle></CardHeader>
        <CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{["minor", "moderate", "major", "critical"].map(sev => (<div key={sev}><Label className="capitalize">{sev}</Label><Input type="number" value={formData.response_due_days_by_severity[sev]} onChange={(e) => setFormData(prev => ({ ...prev, response_due_days_by_severity: { ...prev.response_due_days_by_severity, [sev]: parseInt(e.target.value) || 1 } }))} /></div>))}</div></CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base">Closure Due Days by Severity</CardTitle></CardHeader>
        <CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{["minor", "moderate", "major", "critical"].map(sev => (<div key={sev}><Label className="capitalize">{sev}</Label><Input type="number" value={formData.closure_due_days_by_severity[sev]} onChange={(e) => setFormData(prev => ({ ...prev, closure_due_days_by_severity: { ...prev.closure_due_days_by_severity, [sev]: parseInt(e.target.value) || 7 } }))} /></div>))}</div></CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base">Requirements</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><span className="text-sm">Require root cause for closure</span><Switch checked={formData.require_root_cause_for_closure} onCheckedChange={(v) => setFormData(prev => ({ ...prev, require_root_cause_for_closure: v }))} /></label>
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><span className="text-sm">Require corrective action for Major/Critical</span><Switch checked={formData.require_corrective_action_for_major} onCheckedChange={(v) => setFormData(prev => ({ ...prev, require_corrective_action_for_major: v }))} /></label>
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><span className="text-sm">Require customer response before closure</span><Switch checked={formData.require_customer_response} onCheckedChange={(v) => setFormData(prev => ({ ...prev, require_customer_response: v }))} /></label>
          <div><Label>Effectiveness Check (days after closure)</Label><Input type="number" value={formData.effectiveness_check_days} onChange={(e) => setFormData(prev => ({ ...prev, effectiveness_check_days: parseInt(e.target.value) || 30 }))} className="w-32" /></div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCheck className="w-4 h-4 text-teal-500" />Complaint Type Owners</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Select value={selectedType} onValueChange={setSelectedType}><SelectTrigger className="flex-1"><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent>{COMPLAINT_TYPES.filter(t => !formData.complaint_type_owners.some(o => o.complaint_type === t)).map(type => (<SelectItem key={type} value={type}>{typeLabels[type]}</SelectItem>))}</SelectContent></Select>
            <Select value={selectedOwner} onValueChange={setSelectedOwner}><SelectTrigger className="flex-1"><SelectValue placeholder="Select owner" /></SelectTrigger><SelectContent>{employees.map(emp => (<SelectItem key={emp.id} value={emp.email}>{emp.name}</SelectItem>))}</SelectContent></Select>
            <Button onClick={addTypeOwner} disabled={!selectedType || !selectedOwner}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-2">{formData.complaint_type_owners.map((owner, idx) => (<div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"><div><p className="text-sm font-medium">{typeLabels[owner.complaint_type]}</p><p className="text-xs text-slate-500">{owner.owner_name}</p></div><Button variant="ghost" size="icon" onClick={() => removeTypeOwner(owner.complaint_type)}><Trash2 className="w-4 h-4 text-rose-500" /></Button></div>))}</div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-purple-500" />Customer Accounts</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            <Input placeholder="Customer name" value={newCustomer.name} onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))} />
            <Select value={newCustomer.type} onValueChange={(v) => setNewCustomer(prev => ({ ...prev, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="retailer">Retailer</SelectItem><SelectItem value="distributor">Distributor</SelectItem><SelectItem value="foodservice">Foodservice</SelectItem><SelectItem value="consumer">Consumer</SelectItem></SelectContent></Select>
            <Input placeholder="Contact name" value={newCustomer.contact_name} onChange={(e) => setNewCustomer(prev => ({ ...prev, contact_name: e.target.value }))} />
            <Input placeholder="Email" value={newCustomer.contact_email} onChange={(e) => setNewCustomer(prev => ({ ...prev, contact_email: e.target.value }))} />
            <Button onClick={addCustomerAccount}><Plus className="w-4 h-4 mr-1" />Add</Button>
          </div>
          <div className="space-y-2">{formData.customer_accounts.map((cust, idx) => (<div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"><div><p className="text-sm font-medium">{cust.name}</p><p className="text-xs text-slate-500">{cust.type} {cust.contact_name && `• ${cust.contact_name}`}</p></div><Button variant="ghost" size="icon" onClick={() => removeCustomerAccount(cust.name)}><Trash2 className="w-4 h-4 text-rose-500" /></Button></div>))}</div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-amber-500" />Notification Emails</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3"><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Add email..." onKeyDown={(e) => e.key === "Enter" && addNotificationEmail()} /><Button onClick={addNotificationEmail} disabled={!newEmail}><Plus className="w-4 h-4" /></Button></div>
          <div className="flex flex-wrap gap-2">{formData.notification_emails.map((email, idx) => (<Badge key={idx} variant="secondary" className="flex items-center gap-1 pr-1">{email}<button onClick={() => removeNotificationEmail(email)} className="ml-1 hover:text-rose-600"><X className="w-3 h-3" /></button></Badge>))}</div>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700">{isSaving ? "Saving..." : "Save Settings"}</Button></div>
    </div>
  );
}