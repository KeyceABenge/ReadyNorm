import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Save, Loader2 } from "lucide-react";

import { toast } from "sonner";
import { CAPASettingsRepo } from "@/lib/adapters/database";

export default function CAPASettingsPanel({ organization, settings, onUpdate }) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    categories: settings?.categories || [
      "Sanitation", "Equipment", "Process", "Training", "Documentation", 
      "Safety", "Quality", "Pest Control", "Environmental", "Other"
    ],
    departments: settings?.departments || [
      "Sanitation", "Quality Assurance", "Maintenance", "Production", 
      "Warehouse", "R&D", "Management"
    ],
    reminder_days: settings?.reminder_days || [14, 7, 3, 1],
    overdue_reminder_frequency: settings?.overdue_reminder_frequency || "daily",
    escalation_days: settings?.escalation_days || 7,
    escalation_emails: settings?.escalation_emails || [],
    require_containment_high_severity: settings?.require_containment_high_severity ?? true,
    require_attachments_high_severity: settings?.require_attachments_high_severity ?? false,
    default_effectiveness_days: settings?.default_effectiveness_days || [30],
    auto_create_from_emp: settings?.auto_create_from_emp ?? false,
    auto_create_from_pest: settings?.auto_create_from_pest ?? false,
    auto_create_from_downtime: settings?.auto_create_from_downtime ?? false,
  });

  const [newCategory, setNewCategory] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newEscalationEmail, setNewEscalationEmail] = useState("");

  const handleSave = async () => {
    if (!organization?.id) return;
    
    setIsLoading(true);
    try {
      if (settings?.id) {
        await CAPASettingsRepo.update(settings.id, {
          ...formData,
          organization_id: organization.id
        });
      } else {
        await CAPASettingsRepo.create({
          ...formData,
          organization_id: organization.id
        });
      }
      toast.success("Settings saved");
      onUpdate?.();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  const addCategory = () => {
    if (newCategory && !formData.categories.includes(newCategory)) {
      setFormData(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory]
      }));
      setNewCategory("");
    }
  };

  const removeCategory = (cat) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== cat)
    }));
  };

  const addDepartment = () => {
    if (newDepartment && !formData.departments.includes(newDepartment)) {
      setFormData(prev => ({
        ...prev,
        departments: [...prev.departments, newDepartment]
      }));
      setNewDepartment("");
    }
  };

  const removeDepartment = (dept) => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.filter(d => d !== dept)
    }));
  };

  const addEscalationEmail = () => {
    if (newEscalationEmail && !formData.escalation_emails.includes(newEscalationEmail)) {
      setFormData(prev => ({
        ...prev,
        escalation_emails: [...prev.escalation_emails, newEscalationEmail]
      }));
      setNewEscalationEmail("");
    }
  };

  const removeEscalationEmail = (email) => {
    setFormData(prev => ({
      ...prev,
      escalation_emails: prev.escalation_emails.filter(e => e !== email)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CAPA Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {formData.categories.map(cat => (
              <Badge key={cat} variant="secondary" className="gap-1">
                {cat}
                <button onClick={() => removeCategory(cat)}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Add category..."
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
            <Button variant="outline" onClick={addCategory}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Departments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Departments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {formData.departments.map(dept => (
              <Badge key={dept} variant="secondary" className="gap-1">
                {dept}
                <button onClick={() => removeDepartment(dept)}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
              placeholder="Add department..."
              onKeyDown={(e) => e.key === "Enter" && addDepartment()}
            />
            <Button variant="outline" onClick={addDepartment}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reminder Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reminder & Escalation Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Reminder Days Before Due</Label>
            <p className="text-sm text-slate-500 mb-2">
              Send reminders at: {formData.reminder_days.join(", ")} days before due date
            </p>
          </div>

          <div>
            <Label>Overdue Reminder Frequency</Label>
            <Select 
              value={formData.overdue_reminder_frequency}
              onValueChange={(v) => setFormData({...formData, overdue_reminder_frequency: v})}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="every_3_days">Every 3 days</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Escalation After (days overdue)</Label>
            <Input
              type="number"
              value={formData.escalation_days}
              onChange={(e) => setFormData({...formData, escalation_days: parseInt(e.target.value)})}
              className="w-24"
            />
          </div>

          <div>
            <Label>Escalation Emails</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.escalation_emails.map(email => (
                <Badge key={email} variant="secondary" className="gap-1">
                  {email}
                  <button onClick={() => removeEscalationEmail(email)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                value={newEscalationEmail}
                onChange={(e) => setNewEscalationEmail(e.target.value)}
                placeholder="Add email..."
                onKeyDown={(e) => e.key === "Enter" && addEscalationEmail()}
              />
              <Button variant="outline" onClick={addEscalationEmail}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Require Containment for High/Critical Severity</Label>
              <p className="text-sm text-slate-500">Force immediate containment actions entry</p>
            </div>
            <Switch
              checked={formData.require_containment_high_severity}
              onCheckedChange={(v) => setFormData({...formData, require_containment_high_severity: v})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Require Attachments for High/Critical Severity</Label>
              <p className="text-sm text-slate-500">Force photo/document attachments</p>
            </div>
            <Switch
              checked={formData.require_attachments_high_severity}
              onCheckedChange={(v) => setFormData({...formData, require_attachments_high_severity: v})}
            />
          </div>

          <div>
            <Label>Default Effectiveness Check (days after closure)</Label>
            <Select 
              value={formData.default_effectiveness_days[0]?.toString()}
              onValueChange={(v) => setFormData({...formData, default_effectiveness_days: [parseInt(v)]})}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Create Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auto-Create CAPAs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>From EMP Positives</Label>
              <p className="text-sm text-slate-500">Auto-create CAPA when EMP test is positive</p>
            </div>
            <Switch
              checked={formData.auto_create_from_emp}
              onCheckedChange={(v) => setFormData({...formData, auto_create_from_emp: v})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>From Pest Threshold Exceedances</Label>
              <p className="text-sm text-slate-500">Auto-create CAPA when pest threshold exceeded</p>
            </div>
            <Switch
              checked={formData.auto_create_from_pest}
              onCheckedChange={(v) => setFormData({...formData, auto_create_from_pest: v})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>From Unplanned Downtime</Label>
              <p className="text-sm text-slate-500">Auto-create CAPA for sanitation downtime events</p>
            </div>
            <Switch
              checked={formData.auto_create_from_downtime}
              onCheckedChange={(v) => setFormData({...formData, auto_create_from_downtime: v})}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}