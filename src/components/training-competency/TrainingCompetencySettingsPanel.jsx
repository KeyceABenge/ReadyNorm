import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toast } from "sonner";
import { Settings, Plus, X, UserCheck, Bell, Shield, Trash2 } from "lucide-react";
import { TrainingCompetencySettingsRepo } from "@/lib/adapters/database";

export default function TrainingCompetencySettingsPanel({ settings, organizationId, employees, onRefresh }) {
  const [formData, setFormData] = useState({
    job_roles: [],
    departments: [],
    competency_levels: [],
    default_recertification_months: 12,
    expiration_warning_days: [30, 14, 7],
    quiz_passing_score: 80,
    max_quiz_attempts: 3,
    practical_passing_score: 70,
    qualified_evaluators: [],
    auto_assign_on_hire: true,
    auto_retrain_on_document_revision: true,
    auto_retrain_on_capa: true,
    auto_retrain_on_audit_finding: true,
    auto_retrain_on_incident: true,
    send_expiration_reminders: true,
    escalation_days_overdue: 7,
    escalation_emails: []
  });

  const [newRole, setNewRole] = useState("");
  const [newDept, setNewDept] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [selectedEvaluator, setSelectedEvaluator] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        job_roles: settings.job_roles || [],
        departments: settings.departments || [],
        competency_levels: settings.competency_levels || [],
        default_recertification_months: settings.default_recertification_months || 12,
        expiration_warning_days: settings.expiration_warning_days || [30, 14, 7],
        quiz_passing_score: settings.quiz_passing_score || 80,
        max_quiz_attempts: settings.max_quiz_attempts || 3,
        practical_passing_score: settings.practical_passing_score || 70,
        qualified_evaluators: settings.qualified_evaluators || [],
        auto_assign_on_hire: settings.auto_assign_on_hire !== false,
        auto_retrain_on_document_revision: settings.auto_retrain_on_document_revision !== false,
        auto_retrain_on_capa: settings.auto_retrain_on_capa !== false,
        auto_retrain_on_audit_finding: settings.auto_retrain_on_audit_finding !== false,
        auto_retrain_on_incident: settings.auto_retrain_on_incident !== false,
        send_expiration_reminders: settings.send_expiration_reminders !== false,
        escalation_days_overdue: settings.escalation_days_overdue || 7,
        escalation_emails: settings.escalation_emails || []
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (settings?.id) {
        await TrainingCompetencySettingsRepo.update(settings.id, {
          ...formData,
          organization_id: organizationId
        });
      } else {
        await TrainingCompetencySettingsRepo.create({
          ...formData,
          organization_id: organizationId
        });
      }
      toast.success("Settings saved");
      onRefresh();
    } catch (e) {
      toast.error("Failed to save settings");
    }
    setIsSaving(false);
  };

  const addRole = () => {
    if (newRole && !formData.job_roles.includes(newRole)) {
      setFormData(prev => ({ ...prev, job_roles: [...prev.job_roles, newRole] }));
      setNewRole("");
    }
  };

  const removeRole = (role) => {
    setFormData(prev => ({ ...prev, job_roles: prev.job_roles.filter(r => r !== role) }));
  };

  const addDepartment = () => {
    if (newDept && !formData.departments.includes(newDept)) {
      setFormData(prev => ({ ...prev, departments: [...prev.departments, newDept] }));
      setNewDept("");
    }
  };

  const removeDepartment = (dept) => {
    setFormData(prev => ({ ...prev, departments: prev.departments.filter(d => d !== dept) }));
  };

  const addEscalationEmail = () => {
    if (newEmail && !formData.escalation_emails.includes(newEmail)) {
      setFormData(prev => ({ ...prev, escalation_emails: [...prev.escalation_emails, newEmail] }));
      setNewEmail("");
    }
  };

  const removeEscalationEmail = (email) => {
    setFormData(prev => ({ ...prev, escalation_emails: prev.escalation_emails.filter(e => e !== email) }));
  };

  const addEvaluator = () => {
    if (!selectedEvaluator) return;
    const emp = employees.find(e => e.id === selectedEvaluator);
    if (!emp) return;
    if (formData.qualified_evaluators.some(e => e.employee_id === selectedEvaluator)) {
      toast.error("Already added");
      return;
    }
    setFormData(prev => ({
      ...prev,
      qualified_evaluators: [...prev.qualified_evaluators, {
        employee_id: emp.id,
        name: emp.name,
        email: emp.email,
        qualified_for: []
      }]
    }));
    setSelectedEvaluator("");
  };

  const removeEvaluator = (empId) => {
    setFormData(prev => ({
      ...prev,
      qualified_evaluators: prev.qualified_evaluators.filter(e => e.employee_id !== empId)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Job Roles */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-600" />
            Job Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <Input
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="Add job role..."
              onKeyDown={(e) => e.key === "Enter" && addRole()}
            />
            <Button onClick={addRole} disabled={!newRole}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.job_roles.map((role, idx) => (
              <Badge key={idx} variant="secondary" className="flex items-center gap-1 pr-1">
                {role}
                <button onClick={() => removeRole(role)} className="ml-1 hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Departments */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader>
          <CardTitle className="text-base">Departments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <Input
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              placeholder="Add department..."
              onKeyDown={(e) => e.key === "Enter" && addDepartment()}
            />
            <Button onClick={addDepartment} disabled={!newDept}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.departments.map((dept, idx) => (
              <Badge key={idx} variant="secondary" className="flex items-center gap-1 pr-1">
                {dept}
                <button onClick={() => removeDepartment(dept)} className="ml-1 hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Training Settings */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader>
          <CardTitle className="text-base">Training Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Default Recertification (months)</Label>
              <Input
                type="number"
                value={formData.default_recertification_months}
                onChange={(e) => setFormData(prev => ({ ...prev, default_recertification_months: parseInt(e.target.value) || 12 }))}
              />
            </div>
            <div>
              <Label>Quiz Passing Score (%)</Label>
              <Input
                type="number"
                value={formData.quiz_passing_score}
                onChange={(e) => setFormData(prev => ({ ...prev, quiz_passing_score: parseInt(e.target.value) || 80 }))}
              />
            </div>
            <div>
              <Label>Max Quiz Attempts</Label>
              <Input
                type="number"
                value={formData.max_quiz_attempts}
                onChange={(e) => setFormData(prev => ({ ...prev, max_quiz_attempts: parseInt(e.target.value) || 3 }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Practical Passing Score (%)</Label>
              <Input
                type="number"
                value={formData.practical_passing_score}
                onChange={(e) => setFormData(prev => ({ ...prev, practical_passing_score: parseInt(e.target.value) || 70 }))}
              />
            </div>
            <div>
              <Label>Escalation Days (after overdue)</Label>
              <Input
                type="number"
                value={formData.escalation_days_overdue}
                onChange={(e) => setFormData(prev => ({ ...prev, escalation_days_overdue: parseInt(e.target.value) || 7 }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automation Settings */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            Automation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm">Auto-assign training on hire</span>
              <Switch
                checked={formData.auto_assign_on_hire}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, auto_assign_on_hire: v }))}
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm">Retrain on document revision</span>
              <Switch
                checked={formData.auto_retrain_on_document_revision}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, auto_retrain_on_document_revision: v }))}
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm">Retrain on CAPA</span>
              <Switch
                checked={formData.auto_retrain_on_capa}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, auto_retrain_on_capa: v }))}
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm">Retrain on audit finding</span>
              <Switch
                checked={formData.auto_retrain_on_audit_finding}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, auto_retrain_on_audit_finding: v }))}
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm">Retrain on incident</span>
              <Switch
                checked={formData.auto_retrain_on_incident}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, auto_retrain_on_incident: v }))}
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm">Send expiration reminders</span>
              <Switch
                checked={formData.send_expiration_reminders}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, send_expiration_reminders: v }))}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Qualified Evaluators */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-teal-600" />
            Qualified Evaluators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <Select value={selectedEvaluator} onValueChange={setSelectedEvaluator}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addEvaluator} disabled={!selectedEvaluator}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {formData.qualified_evaluators.map((eval_, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{eval_.name}</p>
                  <p className="text-xs text-slate-500">{eval_.email}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeEvaluator(eval_.employee_id)}>
                  <Trash2 className="w-4 h-4 text-rose-500" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Escalation Emails */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-600" />
            Escalation Emails
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Add email..."
              onKeyDown={(e) => e.key === "Enter" && addEscalationEmail()}
            />
            <Button onClick={addEscalationEmail} disabled={!newEmail}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.escalation_emails.map((email, idx) => (
              <Badge key={idx} variant="secondary" className="flex items-center gap-1 pr-1">
                {email}
                <button onClick={() => removeEscalationEmail(email)} className="ml-1 hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700">
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}