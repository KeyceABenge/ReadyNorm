// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Users, Bell, Save, Loader2, Plus, Trash2, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export default function AuditSettings({ organization }) {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    reminder_days_before: [14, 7, 3, 1],
    send_overdue_reminders: true,
    overdue_reminder_frequency: "daily",
    escalation_days: 7,
    escalation_emails: [],
    qualified_auditors: [],
    require_evidence_for_gaps: true,
    require_corrective_action_for_major: true,
    default_audit_frequency: "quarterly"
  });
  const [newEscalationEmail, setNewEscalationEmail] = useState("");
  const [newReminderDay, setNewReminderDay] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", organization?.id],
    queryFn: () => EmployeeRepo.filter({ organization_id: organization.id, status: "active" }),
    enabled: !!organization?.id,
  });

  const { data: existingSettings = [], refetch: refetchSettings } = useQuery({
    queryKey: ["audit_settings", organization?.id],
    queryFn: async () => {
      // Store settings in SiteSettings or a dedicated entity
      const siteSettings = await SiteSettingsRepo.list();
      if (siteSettings.length > 0 && siteSettings[0].audit_settings) {
        return siteSettings[0].audit_settings;
      }
      return null;
    },
    enabled: !!organization?.id,
  });

  useEffect(() => {
    if (existingSettings) {
      setSettings(prev => ({ ...prev, ...existingSettings }));
    }
  }, [existingSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const siteSettings = await SiteSettingsRepo.list();
      if (siteSettings.length > 0) {
        await SiteSettingsRepo.update(siteSettings[0].id, {
          audit_settings: settings
        });
      }
      toast.success("Settings saved successfully");
      refetchSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const addEscalationEmail = () => {
    if (newEscalationEmail && !settings.escalation_emails.includes(newEscalationEmail)) {
      setSettings(prev => ({
        ...prev,
        escalation_emails: [...prev.escalation_emails, newEscalationEmail]
      }));
      setNewEscalationEmail("");
    }
  };

  const removeEscalationEmail = (email) => {
    setSettings(prev => ({
      ...prev,
      escalation_emails: prev.escalation_emails.filter(e => e !== email)
    }));
  };

  const addReminderDay = () => {
    const day = parseInt(newReminderDay);
    if (day > 0 && !settings.reminder_days_before.includes(day)) {
      setSettings(prev => ({
        ...prev,
        reminder_days_before: [...prev.reminder_days_before, day].sort((a, b) => b - a)
      }));
      setNewReminderDay("");
    }
  };

  const removeReminderDay = (day) => {
    setSettings(prev => ({
      ...prev,
      reminder_days_before: prev.reminder_days_before.filter(d => d !== day)
    }));
  };

  const addAuditor = () => {
    if (!selectedEmployee) return;
    const emp = employees.find(e => e.id === selectedEmployee);
    if (!emp) return;
    
    const auditor = { email: emp.email, name: emp.name };
    if (settings.qualified_auditors.some(a => a.email === auditor.email)) {
      toast.error("Auditor already added");
      return;
    }
    
    setSettings(prev => ({
      ...prev,
      qualified_auditors: [...prev.qualified_auditors, auditor]
    }));
    setSelectedEmployee("");
  };

  const removeAuditor = (email) => {
    setSettings(prev => ({
      ...prev,
      qualified_auditors: prev.qualified_auditors.filter(a => a.email !== email)
    }));
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Audit Program Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Default Audit Frequency</Label>
              <Select 
                value={settings.default_audit_frequency} 
                onValueChange={(v) => setSettings(prev => ({ ...prev, default_audit_frequency: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">Default frequency for new audit sections</p>
            </div>

            <div className="space-y-2">
              <Label>Escalation After (Days Overdue)</Label>
              <Input 
                type="number" 
                value={settings.escalation_days}
                onChange={(e) => setSettings(prev => ({ ...prev, escalation_days: parseInt(e.target.value) || 7 }))}
                min={1}
              />
              <p className="text-xs text-slate-500">Days after due date to escalate</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Evidence for Gaps</Label>
                <p className="text-xs text-slate-500">Auditors must attach evidence when recording gaps</p>
              </div>
              <Switch 
                checked={settings.require_evidence_for_gaps}
                onCheckedChange={(v) => setSettings(prev => ({ ...prev, require_evidence_for_gaps: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Require Corrective Action for Major/Critical</Label>
                <p className="text-xs text-slate-500">Automatically flag major and critical gaps for corrective action</p>
              </div>
              <Switch 
                checked={settings.require_corrective_action_for_major}
                onCheckedChange={(v) => setSettings(prev => ({ ...prev, require_corrective_action_for_major: v }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Reminder Days */}
          <div className="space-y-3">
            <Label>Send Reminders (Days Before Due)</Label>
            <div className="flex flex-wrap gap-2">
              {settings.reminder_days_before.map(day => (
                <Badge key={day} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                  {day} day{day !== 1 ? 's' : ''}
                  <button onClick={() => removeReminderDay(day)} className="ml-1 hover:text-red-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="Days before"
                value={newReminderDay}
                onChange={(e) => setNewReminderDay(e.target.value)}
                className="w-32"
                min={1}
              />
              <Button variant="outline" size="sm" onClick={addReminderDay}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Overdue Reminders */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Send Overdue Reminders</Label>
                <p className="text-xs text-slate-500">Automatically remind auditors of overdue audits</p>
              </div>
              <Switch 
                checked={settings.send_overdue_reminders}
                onCheckedChange={(v) => setSettings(prev => ({ ...prev, send_overdue_reminders: v }))}
              />
            </div>

            {settings.send_overdue_reminders && (
              <div className="space-y-2 ml-4">
                <Label>Overdue Reminder Frequency</Label>
                <Select 
                  value={settings.overdue_reminder_frequency} 
                  onValueChange={(v) => setSettings(prev => ({ ...prev, overdue_reminder_frequency: v }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="every_3_days">Every 3 Days</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Escalation Emails */}
          <div className="space-y-3">
            <Label>Escalation Notification Recipients</Label>
            <p className="text-xs text-slate-500">These people will be notified when audits are escalated</p>
            <div className="flex flex-wrap gap-2">
              {settings.escalation_emails.map(email => (
                <Badge key={email} variant="outline" className="flex items-center gap-1 px-3 py-1">
                  <Mail className="w-3 h-3 mr-1" />
                  {email}
                  <button onClick={() => removeEscalationEmail(email)} className="ml-1 hover:text-red-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {settings.escalation_emails.length === 0 && (
                <span className="text-sm text-slate-400">No escalation recipients configured</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input 
                type="email" 
                placeholder="email@example.com"
                value={newEscalationEmail}
                onChange={(e) => setNewEscalationEmail(e.target.value)}
                className="w-64"
              />
              <Button variant="outline" size="sm" onClick={addEscalationEmail}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auditor Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Qualified Auditors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            Add employees who are qualified to conduct internal audits.
          </p>

          {/* Add Auditor */}
          <div className="flex gap-2">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select an employee..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} {emp.email && `(${emp.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={addAuditor}>
              <Plus className="w-4 h-4 mr-2" />
              Add Auditor
            </Button>
          </div>

          {/* Auditor List */}
          <div className="space-y-2">
            {settings.qualified_auditors.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No qualified auditors configured</p>
                <p className="text-xs text-slate-400 mt-1">Add employees who can conduct audits</p>
              </div>
            ) : (
              settings.qualified_auditors.map(auditor => (
                <div key={auditor.email} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium">
                      {auditor.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{auditor.name}</p>
                      <p className="text-xs text-slate-500">{auditor.email}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeAuditor(auditor.email)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}