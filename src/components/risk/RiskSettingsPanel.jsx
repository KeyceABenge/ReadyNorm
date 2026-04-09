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

const CATEGORIES = ["food_safety", "quality", "operational", "regulatory", "supplier", "environmental", "personnel", "equipment"];

export default function RiskSettingsPanel({ settings, organizationId, employees, onRefresh }) {
  const [formData, setFormData] = useState({
    risk_matrix: { low_max: 4, medium_max: 9, high_max: 16 },
    auto_generate_from_sources: {
      sanitation_failures: true, emp_positives: true, pest_exceedances: true,
      audit_major_findings: true, critical_capas: true, customer_complaints: true,
      supplier_issues: true, incidents: true
    },
    default_review_frequency: "quarterly",
    management_review_frequency: "quarterly",
    escalation_threshold: 16,
    notification_emails: [],
    risk_owners: [],
    management_review_attendees: []
  });
  const [newEmail, setNewEmail] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("");
  const [selectedAttendee, setSelectedAttendee] = useState("");
  const [attendeeRole, setAttendeeRole] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setFormData({
        risk_matrix: settings.risk_matrix || { low_max: 4, medium_max: 9, high_max: 16 },
        auto_generate_from_sources: settings.auto_generate_from_sources || {},
        default_review_frequency: settings.default_review_frequency || "quarterly",
        management_review_frequency: settings.management_review_frequency || "quarterly",
        escalation_threshold: settings.escalation_threshold || 16,
        notification_emails: settings.notification_emails || [],
        risk_owners: settings.risk_owners || [],
        management_review_attendees: settings.management_review_attendees || []
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (settings?.id) await RiskSettingsRepo.update(settings.id, { ...formData, organization_id: organizationId });
      else await RiskSettingsRepo.create({ ...formData, organization_id: organizationId });
      toast.success("Settings saved"); onRefresh();
    } catch (e) { toast.error("Failed to save"); }
    setIsSaving(false);
  };

  const addEmail = () => { if (newEmail && !formData.notification_emails.includes(newEmail)) { setFormData(prev => ({ ...prev, notification_emails: [...prev.notification_emails, newEmail] })); setNewEmail(""); } };
  const removeEmail = (email) => setFormData(prev => ({ ...prev, notification_emails: prev.notification_emails.filter(e => e !== email) }));

  const addRiskOwner = () => {
    if (!selectedCategory || !selectedOwner) return;
    const emp = employees.find(e => e.email === selectedOwner);
    if (!emp || formData.risk_owners.some(o => o.category === selectedCategory)) { toast.error("Category already has owner"); return; }
    setFormData(prev => ({ ...prev, risk_owners: [...prev.risk_owners, { category: selectedCategory, owner_email: emp.email, owner_name: emp.name }] }));
    setSelectedCategory(""); setSelectedOwner("");
  };
  const removeRiskOwner = (cat) => setFormData(prev => ({ ...prev, risk_owners: prev.risk_owners.filter(o => o.category !== cat) }));

  const addAttendee = () => {
    if (!selectedAttendee) return;
    const emp = employees.find(e => e.email === selectedAttendee);
    if (!emp || formData.management_review_attendees.some(a => a.email === selectedAttendee)) return;
    setFormData(prev => ({ ...prev, management_review_attendees: [...prev.management_review_attendees, { email: emp.email, name: emp.name, role: attendeeRole, required: true }] }));
    setSelectedAttendee(""); setAttendeeRole("");
  };
  const removeAttendee = (email) => setFormData(prev => ({ ...prev, management_review_attendees: prev.management_review_attendees.filter(a => a.email !== email) }));

  const toggleSource = (source) => {
    setFormData(prev => ({
      ...prev,
      auto_generate_from_sources: { ...prev.auto_generate_from_sources, [source]: !prev.auto_generate_from_sources[source] }
    }));
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base">Risk Matrix Thresholds</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500 mb-4">Define score boundaries for risk levels (score = likelihood × severity, max 25)</p>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Low Max (≤)</Label><Input type="number" value={formData.risk_matrix.low_max} onChange={(e) => setFormData(prev => ({ ...prev, risk_matrix: { ...prev.risk_matrix, low_max: parseInt(e.target.value) || 4 } }))} /></div>
            <div><Label>Medium Max (≤)</Label><Input type="number" value={formData.risk_matrix.medium_max} onChange={(e) => setFormData(prev => ({ ...prev, risk_matrix: { ...prev.risk_matrix, medium_max: parseInt(e.target.value) || 9 } }))} /></div>
            <div><Label>High Max (≤)</Label><Input type="number" value={formData.risk_matrix.high_max} onChange={(e) => setFormData(prev => ({ ...prev, risk_matrix: { ...prev.risk_matrix, high_max: parseInt(e.target.value) || 16 } }))} /></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Above High Max = Critical</p>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-purple-500" />Auto-Generate Risks From</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "sanitation_failures", label: "Sanitation Failures" },
            { key: "emp_positives", label: "EMP Positive Results" },
            { key: "pest_exceedances", label: "Pest Threshold Exceedances" },
            { key: "audit_major_findings", label: "Audit Major/Critical Findings" },
            { key: "critical_capas", label: "Critical CAPAs" },
            { key: "customer_complaints", label: "Customer Complaints" },
            { key: "supplier_issues", label: "Supplier Nonconformances" },
            { key: "incidents", label: "Incidents" }
          ].map(source => (
            <label key={source.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm">{source.label}</span>
              <Switch checked={formData.auto_generate_from_sources[source.key] !== false} onCheckedChange={() => toggleSource(source.key)} />
            </label>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base">Review Settings</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Default Risk Review</Label>
              <Select value={formData.default_review_frequency} onValueChange={(v) => setFormData(prev => ({ ...prev, default_review_frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="semi_annual">Semi-Annual</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Management Review</Label>
              <Select value={formData.management_review_frequency} onValueChange={(v) => setFormData(prev => ({ ...prev, management_review_frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="semi_annual">Semi-Annual</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Escalation Threshold</Label><Input type="number" value={formData.escalation_threshold} onChange={(e) => setFormData(prev => ({ ...prev, escalation_threshold: parseInt(e.target.value) || 16 }))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCheck className="w-4 h-4 text-teal-500" />Risk Category Owners</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>{CATEGORIES.filter(c => !formData.risk_owners.some(o => o.category === c)).map(c => (<SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>))}</SelectContent>
            </Select>
            <Select value={selectedOwner} onValueChange={setSelectedOwner}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Owner" /></SelectTrigger>
              <SelectContent>{employees.map(e => (<SelectItem key={e.id} value={e.email}>{e.name}</SelectItem>))}</SelectContent>
            </Select>
            <Button onClick={addRiskOwner} disabled={!selectedCategory || !selectedOwner}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-2">{formData.risk_owners.map((o, idx) => (<div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"><div><p className="text-sm font-medium capitalize">{o.category.replace(/_/g, " ")}</p><p className="text-xs text-slate-500">{o.owner_name}</p></div><Button variant="ghost" size="icon" onClick={() => removeRiskOwner(o.category)}><Trash2 className="w-4 h-4 text-rose-500" /></Button></div>))}</div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base">Management Review Attendees</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Select value={selectedAttendee} onValueChange={setSelectedAttendee}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Select person" /></SelectTrigger>
              <SelectContent>{employees.filter(e => !formData.management_review_attendees.some(a => a.email === e.email)).map(e => (<SelectItem key={e.id} value={e.email}>{e.name}</SelectItem>))}</SelectContent>
            </Select>
            <Input value={attendeeRole} onChange={(e) => setAttendeeRole(e.target.value)} placeholder="Role" className="w-40" />
            <Button onClick={addAttendee} disabled={!selectedAttendee}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-2">{formData.management_review_attendees.map((a, idx) => (<div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"><div><p className="text-sm">{a.name}</p>{a.role && <p className="text-xs text-slate-500">{a.role}</p>}</div><Button variant="ghost" size="icon" onClick={() => removeAttendee(a.email)}><Trash2 className="w-4 h-4 text-rose-500" /></Button></div>))}</div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-amber-500" />Notification Emails</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3"><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Add email..." onKeyDown={(e) => e.key === "Enter" && addEmail()} /><Button onClick={addEmail} disabled={!newEmail}><Plus className="w-4 h-4" /></Button></div>
          <div className="flex flex-wrap gap-2">{formData.notification_emails.map((email, idx) => (<Badge key={idx} variant="secondary" className="flex items-center gap-1 pr-1">{email}<button onClick={() => removeEmail(email)} className="ml-1 hover:text-rose-600"><X className="w-3 h-3" /></button></Badge>))}</div>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700">{isSaving ? "Saving..." : "Save Settings"}</Button></div>
    </div>
  );
}