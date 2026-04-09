// @ts-nocheck
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Clock, Sun, Moon, Settings2 } from "lucide-react";

const DEFAULT_SHIFTS = [
  { id: "shift_1", name: "Day Shift", start_time: "05:00", end_time: "17:00", buffer_before_minutes: 30, buffer_after_minutes: 30 },
  { id: "shift_2", name: "Night Shift", start_time: "17:00", end_time: "05:00", buffer_before_minutes: 30, buffer_after_minutes: 30 }
];

const DEFAULT_AUTO_END = {
  enabled: true,
  grace_period_minutes: 60,
  idle_threshold_minutes: 30,
  reopen_incomplete_tasks: true
};

export default function ShiftSettingsPanel({ settings, onSave, isLoading }) {
  const [shifts, setShifts] = useState(settings?.shifts || DEFAULT_SHIFTS);
  const [autoEndSettings, setAutoEndSettings] = useState(settings?.auto_end_settings || DEFAULT_AUTO_END);
  const [hasChanges, setHasChanges] = useState(false);
  
  const handleShiftChange = (index, field, value) => {
    const updated = [...shifts];
    updated[index] = { ...updated[index], [field]: value };
    setShifts(updated);
    setHasChanges(true);
  };
  
  const handleAddShift = () => {
    const newId = `shift_${Date.now()}`;
    setShifts([...shifts, {
      id: newId,
      name: `Shift ${shifts.length + 1}`,
      start_time: "08:00",
      end_time: "16:00",
      buffer_before_minutes: 30,
      buffer_after_minutes: 30
    }]);
    setHasChanges(true);
  };
  
  const handleRemoveShift = (index) => {
    if (shifts.length <= 1) return;
    setShifts(shifts.filter((_, i) => i !== index));
    setHasChanges(true);
  };
  
  const handleAutoEndChange = (field, value) => {
    setAutoEndSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };
  
  const handleSave = () => {
    onSave({
      shifts,
      auto_end_settings: autoEndSettings
    });
    setHasChanges(false);
  };
  
  const getShiftIcon = (shift) => {
    const startHour = parseInt(shift.start_time?.split(":")[0] || 0);
    return startHour >= 5 && startHour < 17 ? Sun : Moon;
  };
  
  return (
    <div className="space-y-6">
      {/* Shift Windows */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Shift Windows
          </CardTitle>
          <p className="text-xs text-slate-500">
            Define shift schedules. Employees signing in will be automatically assigned to the current shift.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {shifts.map((shift, index) => {
            const Icon = getShiftIcon(shift);
            return (
              <div key={shift.id} className="p-3 bg-slate-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-500" />
                    <Input
                      value={shift.name}
                      onChange={(e) => handleShiftChange(index, "name", e.target.value)}
                      className="h-8 w-40 text-sm font-medium"
                      placeholder="Shift name"
                    />
                  </div>
                  {shifts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-rose-600"
                      onClick={() => handleRemoveShift(index)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500">Start Time</Label>
                    <Input
                      type="time"
                      value={shift.start_time}
                      onChange={(e) => handleShiftChange(index, "start_time", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">End Time</Label>
                    <Input
                      type="time"
                      value={shift.end_time}
                      onChange={(e) => handleShiftChange(index, "end_time", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500">Early Sign-in Buffer</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={shift.buffer_before_minutes}
                        onChange={(e) => handleShiftChange(index, "buffer_before_minutes", parseInt(e.target.value) || 0)}
                        className="h-8 text-sm w-16"
                        min={0}
                      />
                      <span className="text-xs text-slate-500">min</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Late Sign-in Buffer</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={shift.buffer_after_minutes}
                        onChange={(e) => handleShiftChange(index, "buffer_after_minutes", parseInt(e.target.value) || 0)}
                        className="h-8 text-sm w-16"
                        min={0}
                      />
                      <span className="text-xs text-slate-500">min</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          <Button variant="outline" size="sm" onClick={handleAddShift} className="w-full">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Shift
          </Button>
        </CardContent>
      </Card>
      
      {/* Auto-End Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Smart Auto-End Engine
          </CardTitle>
          <p className="text-xs text-slate-500">
            Automatically end sessions for employees who are no longer working, without requiring manual action.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Enable Auto-End</Label>
              <p className="text-xs text-slate-500">Automatically close idle sessions after shift ends</p>
            </div>
            <Switch
              checked={autoEndSettings.enabled}
              onCheckedChange={(checked) => handleAutoEndChange("enabled", checked)}
            />
          </div>
          
          {autoEndSettings.enabled && (
            <>
              <div className="border-t pt-4 space-y-4">
                <div>
                  <Label className="text-sm">Grace Period After Shift End</Label>
                  <p className="text-xs text-slate-500 mb-2">
                    Wait this long after shift ends before checking for auto-end
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={autoEndSettings.grace_period_minutes}
                      onChange={(e) => handleAutoEndChange("grace_period_minutes", parseInt(e.target.value) || 0)}
                      className="h-8 w-24"
                      min={0}
                    />
                    <span className="text-sm text-slate-500">minutes</span>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm">Idle Threshold (Post-Shift Only)</Label>
                  <p className="text-xs text-slate-500 mb-2">
                    After the shift + grace period has passed, employee must remain inactive for this long before auto-ending. This does NOT apply during the shift — employees can clean for hours without the app.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={autoEndSettings.idle_threshold_minutes}
                      onChange={(e) => handleAutoEndChange("idle_threshold_minutes", parseInt(e.target.value) || 0)}
                      className="h-8 w-24"
                      min={5}
                    />
                    <span className="text-sm text-slate-500">minutes</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Reopen Incomplete Tasks</Label>
                    <p className="text-xs text-slate-500">
                      Return unfinished tasks to the available pool when session auto-ends
                    </p>
                  </div>
                  <Switch
                    checked={autoEndSettings.reopen_incomplete_tasks}
                    onCheckedChange={(checked) => handleAutoEndChange("reopen_incomplete_tasks", checked)}
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                <p className="text-xs text-blue-800">
                  <strong>How it works:</strong> Sessions are <strong>never</strong> auto-ended during or before a shift. 
                  Only after the shift ends + the {autoEndSettings.grace_period_minutes}-minute grace period does the idle 
                  timer begin. If the employee has no app activity for {autoEndSettings.idle_threshold_minutes} minutes 
                  <em> after that point</em>, their session will automatically close.
                </p>
                <p className="text-xs text-blue-700">
                  <strong>Example:</strong> An employee cleaning for 3 hours without using the app will NOT be auto-ended — 
                  the idle check only starts after their shift is over. They can come back and sign off on everything at the end.
                  {autoEndSettings.reopen_incomplete_tasks 
                    ? " Any incomplete tasks will be returned to the task pool for others to select." 
                    : " Incomplete tasks will remain assigned but marked incomplete."}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}