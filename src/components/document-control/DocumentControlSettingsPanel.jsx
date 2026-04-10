import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, Save, Users, FileText, Bell, Archive } from "lucide-react";
import { toast } from "sonner";
import { DocumentControlSettingsRepo } from "@/lib/adapters/database";

export default function DocumentControlSettingsPanel({ settings, organizationId, employees, onRefresh }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    document_categories: settings?.document_categories || ["Food Safety", "Quality Assurance", "Sanitation", "Operations", "HR", "Maintenance"],
    departments: settings?.departments || ["Quality", "Sanitation", "Production", "Maintenance", "Warehouse"],
    default_review_frequency_months: settings?.default_review_frequency_months || 12,
    require_two_approvers: settings?.require_two_approvers || false,
    require_signature: settings?.require_signature || true,
    auto_obsolete_superseded: settings?.auto_obsolete_superseded || true,
    training_due_days: settings?.training_due_days || 14,
    review_reminder_days: settings?.review_reminder_days || [30, 14, 7],
    retention_default_years: settings?.retention_policy?.default_years || 7,
    qualified_approvers: settings?.qualified_approvers || []
  });
  const [newCategory, setNewCategory] = useState("");
  const [newDepartment, setNewDepartment] = useState("");

  const addCategory = () => {
    if (newCategory && !form.document_categories.includes(newCategory)) {
      setForm(prev => ({ ...prev, document_categories: [...prev.document_categories, newCategory] }));
      setNewCategory("");
    }
  };

  const removeCategory = (cat) => {
    setForm(prev => ({ ...prev, document_categories: prev.document_categories.filter(c => c !== cat) }));
  };

  const addDepartment = () => {
    if (newDepartment && !form.departments.includes(newDepartment)) {
      setForm(prev => ({ ...prev, departments: [...prev.departments, newDepartment] }));
      setNewDepartment("");
    }
  };

  const removeDepartment = (dept) => {
    setForm(prev => ({ ...prev, departments: prev.departments.filter(d => d !== dept) }));
  };

  const addApprover = (email) => {
    const emp = employees.find(e => e.email === email);
    if (emp && !form.qualified_approvers.find(a => a.email === email)) {
      setForm(prev => ({
        ...prev,
        qualified_approvers: [...prev.qualified_approvers, { email: emp.email, name: emp.name, document_types: [] }]
      }));
    }
  };

  const removeApprover = (email) => {
    setForm(prev => ({
      ...prev,
      qualified_approvers: prev.qualified_approvers.filter(a => a.email !== email)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        organization_id: organizationId,
        document_categories: form.document_categories,
        departments: form.departments,
        default_review_frequency_months: form.default_review_frequency_months,
        require_two_approvers: form.require_two_approvers,
        require_signature: form.require_signature,
        auto_obsolete_superseded: form.auto_obsolete_superseded,
        training_due_days: form.training_due_days,
        review_reminder_days: form.review_reminder_days,
        qualified_approvers: form.qualified_approvers,
        retention_policy: {
          default_years: form.retention_default_years
        }
      };

      if (settings?.id) {
        await DocumentControlSettingsRepo.update(settings.id, data);
      } else {
        await DocumentControlSettingsRepo.create(data);
      }
      toast.success("Settings saved");
      onRefresh();
    } catch (err) {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Categories */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/80 p-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Document Categories
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {form.document_categories.map(cat => (
            <Badge key={cat} variant="secondary" className="pr-1">
              {cat}
              <button onClick={() => removeCategory(cat)} className="ml-1.5 hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category"
            onKeyPress={(e) => e.key === "Enter" && addCategory()}
          />
          <Button onClick={addCategory} variant="outline" size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Departments */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/80 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Departments</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {form.departments.map(dept => (
            <Badge key={dept} variant="secondary" className="pr-1">
              {dept}
              <button onClick={() => removeDepartment(dept)} className="ml-1.5 hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newDepartment}
            onChange={(e) => setNewDepartment(e.target.value)}
            placeholder="New department"
            onKeyPress={(e) => e.key === "Enter" && addDepartment()}
          />
          <Button onClick={addDepartment} variant="outline" size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Workflow Settings */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/80 p-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Workflow Settings
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Require Two Approvers</p>
              <p className="text-xs text-slate-500">Documents need two approvals before becoming effective</p>
            </div>
            <Switch
              checked={form.require_two_approvers}
              onCheckedChange={(v) => setForm(prev => ({ ...prev, require_two_approvers: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Require Digital Signature</p>
              <p className="text-xs text-slate-500">Approvers must provide digital signature</p>
            </div>
            <Switch
              checked={form.require_signature}
              onCheckedChange={(v) => setForm(prev => ({ ...prev, require_signature: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Auto-obsolete Superseded</p>
              <p className="text-xs text-slate-500">Automatically mark old versions as obsolete</p>
            </div>
            <Switch
              checked={form.auto_obsolete_superseded}
              onCheckedChange={(v) => setForm(prev => ({ ...prev, auto_obsolete_superseded: v }))}
            />
          </div>
        </div>
      </Card>

      {/* Timing Settings */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/80 p-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Review & Training Settings
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Default Review Frequency (months)</Label>
            <Input
              type="number"
              value={form.default_review_frequency_months}
              onChange={(e) => setForm(prev => ({ ...prev, default_review_frequency_months: parseInt(e.target.value) || 12 }))}
            />
          </div>
          <div>
            <Label>Training Due Days</Label>
            <Input
              type="number"
              value={form.training_due_days}
              onChange={(e) => setForm(prev => ({ ...prev, training_due_days: parseInt(e.target.value) || 14 }))}
            />
          </div>
        </div>
      </Card>

      {/* Retention */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/80 p-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Archive className="w-4 h-4" />
          Retention Policy
        </h3>
        <div>
          <Label>Default Retention Period (years)</Label>
          <Input
            type="number"
            value={form.retention_default_years}
            onChange={(e) => setForm(prev => ({ ...prev, retention_default_years: parseInt(e.target.value) || 7 }))}
            className="w-32"
          />
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-1.5" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}