import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Shield, Users, Settings } from "lucide-react";
import { EvaluatorSettingsRepo } from "@/lib/adapters/database";
import { toast } from "sonner";

const EVALUATOR_ROLES = [
  { id: "qualified_peer", label: "Qualified Peer", description: "Employee already competent on the same task" },
  { id: "team_leader", label: "Team Leader", description: "Designated team leads" },
  { id: "process_technician", label: "Process Technician", description: "Technical specialists" },
  { id: "supervisor", label: "Supervisor", description: "Shift supervisors" },
  { id: "manager", label: "Manager", description: "Department managers and above" }
];

export default function EvaluatorSettingsPanel({ organizationId }) {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [organizationId]);

  const loadSettings = async () => {
    try {
      const results = await EvaluatorSettingsRepo.filter({ 
        organization_id: organizationId 
      });
      
      if (results.length > 0) {
        setSettings(results[0]);
      } else {
        // Create default settings
        const defaultSettings = {
          organization_id: organizationId,
          eligible_roles: ["supervisor", "manager"],
          same_shift_only: false,
          same_area_only: false,
          competency_expiration_months: 12,
          default_re_eval_frequency: "annual",
          strict_enforcement: false,
          allow_controlled_exception: true
        };
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load evaluator settings");
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      if (settings.id) {
        await EvaluatorSettingsRepo.update(settings.id, settings);
      } else {
        const created = await EvaluatorSettingsRepo.create(settings);
        setSettings(created);
      }
      toast.success("Settings saved");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRole = (roleId) => {
    if (!settings) return;
    const currentRoles = settings.eligible_roles || [];
    const newRoles = currentRoles.includes(roleId)
      ? currentRoles.filter(r => r !== roleId)
      : [...currentRoles, roleId];
    setSettings({ ...settings, eligible_roles: newRoles });
  };

  if (isLoading || !settings) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-600" />
          Evaluator Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Eligible Roles */}
        <div className="space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Who Can Evaluate Competency
          </Label>
          <p className="text-sm text-slate-500">
            Select which roles are authorized to perform competency evaluations
          </p>
          <div className="space-y-2">
            {EVALUATOR_ROLES.map(role => (
              <div 
                key={role.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-slate-50 transition-colors"
              >
                <Checkbox
                  id={role.id}
                  checked={settings.eligible_roles?.includes(role.id)}
                  onCheckedChange={() => toggleRole(role.id)}
                />
                <div className="flex-1">
                  <Label htmlFor={role.id} className="font-medium cursor-pointer">
                    {role.label}
                  </Label>
                  <p className="text-xs text-slate-500">{role.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Restrictions */}
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Evaluation Restrictions</Label>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Same Shift Only</Label>
              <p className="text-xs text-slate-500">
                Evaluators must be on the same shift as the employee
              </p>
            </div>
            <Switch
              checked={settings.same_shift_only}
              onCheckedChange={(checked) => setSettings({ ...settings, same_shift_only: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Same Area/Line Only</Label>
              <p className="text-xs text-slate-500">
                Evaluators must work in the same area or production line
              </p>
            </div>
            <Switch
              checked={settings.same_area_only}
              onCheckedChange={(checked) => setSettings({ ...settings, same_area_only: checked })}
            />
          </div>
        </div>

        {/* Expiration Settings */}
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Competency Expiration</Label>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expiration Period</Label>
              <Select
                value={String(settings.competency_expiration_months || 0)}
                onValueChange={(v) => setSettings({ ...settings, competency_expiration_months: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Never Expires</SelectItem>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="12">12 Months</SelectItem>
                  <SelectItem value="24">24 Months</SelectItem>
                  <SelectItem value="36">36 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Default Re-Evaluation</Label>
              <Select
                value={settings.default_re_eval_frequency}
                onValueChange={(v) => setSettings({ ...settings, default_re_eval_frequency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="6_months">Every 6 Months</SelectItem>
                  <SelectItem value="annual">Annually</SelectItem>
                  <SelectItem value="2_years">Every 2 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Enforcement Settings */}
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Enforcement Rules
          </Label>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Strict Enforcement</Label>
              <p className="text-xs text-slate-500">
                Block task sign-off for employees who are not competent
              </p>
            </div>
            <Switch
              checked={settings.strict_enforcement}
              onCheckedChange={(checked) => setSettings({ ...settings, strict_enforcement: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Controlled Exceptions</Label>
              <p className="text-xs text-slate-500">
                Allow sign-off with evaluator verification when not competent
              </p>
            </div>
            <Switch
              checked={settings.allow_controlled_exception}
              onCheckedChange={(checked) => setSettings({ ...settings, allow_controlled_exception: checked })}
              disabled={!settings.strict_enforcement}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t">
          <Button onClick={saveSettings} disabled={isSaving} className="w-full">
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}