import { useState, useEffect } from "react";

import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, Loader2, Mail, Clock, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { HandoffSettingsRepo } from "@/lib/adapters/database";

export default function HandoffSettingsPanel({ organizationId, settings, onSaved }) {
  const [formData, setFormData] = useState({
    default_hours: 12,
    email_recipients: [],
    auto_generate: false,
    auto_generate_times: ["05:00", "17:00"],
    auto_email: false,
    include_sections: {
      team_summary: true,
      performance_metrics: true,
      quality_signals: true,
      completed_items: true,
      incomplete_items: true,
      critical_carryovers: true,
      top_priorities: true
    }
  });
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    if (settings?.id) {
      setFormData({
        default_hours: settings.default_hours || 12,
        email_recipients: settings.email_recipients || [],
        auto_generate: settings.auto_generate || false,
        auto_generate_times: settings.auto_generate_times || ["05:00", "17:00"],
        auto_email: settings.auto_email || false,
        include_sections: settings.include_sections || {
          team_summary: true,
          performance_metrics: true,
          quality_signals: true,
          completed_items: true,
          incomplete_items: true,
          critical_carryovers: true,
          top_priorities: true
        }
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return HandoffSettingsRepo.update(settings.id, data);
      } else {
        return HandoffSettingsRepo.create({ ...data, organization_id: organizationId });
      }
    },
    onSuccess: () => {
      onSaved();
      toast.success("Settings saved");
    }
  });

  const addEmail = () => {
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    if (formData.email_recipients.includes(newEmail)) {
      toast.error("Email already added");
      return;
    }
    setFormData(prev => ({
      ...prev,
      email_recipients: [...prev.email_recipients, newEmail]
    }));
    setNewEmail("");
  };

  const removeEmail = (email) => {
    setFormData(prev => ({
      ...prev,
      email_recipients: prev.email_recipients.filter(e => e !== email)
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5 text-slate-600" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Default Hours to Cover</Label>
            <Select 
              value={String(formData.default_hours)} 
              onValueChange={v => setFormData({...formData, default_hours: Number(v)})}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 hours</SelectItem>
                <SelectItem value="8">8 hours</SelectItem>
                <SelectItem value="10">10 hours</SelectItem>
                <SelectItem value="12">12 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">Default time period for handoff generation</p>
          </div>
        </CardContent>
      </Card>

      {/* Email Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="w-5 h-5 text-slate-600" />
            Email Distribution List
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Recipients</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="manager@example.com"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
              />
              <Button type="button" variant="outline" onClick={addEmail}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {formData.email_recipients.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {formData.email_recipients.map(email => (
                <Badge key={email} variant="secondary" className="pl-3 pr-1 py-1">
                  {email}
                  <button onClick={() => removeEmail(email)} className="ml-2 hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No recipients added. Add email addresses to enable distribution.</p>
          )}

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <Label className="text-base">Auto-Email Handoffs</Label>
              <p className="text-sm text-slate-500">Automatically email when handoff is finalized</p>
            </div>
            <Switch 
              checked={formData.auto_email} 
              onCheckedChange={v => setFormData({...formData, auto_email: v})}
              disabled={formData.email_recipients.length === 0}
            />
          </div>
        </CardContent>
      </Card>

      {/* Auto Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-slate-600" />
            Auto Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <Label className="text-base">Auto-Generate Handoffs</Label>
              <p className="text-sm text-slate-500">Automatically generate handoffs at shift changes</p>
            </div>
            <Switch 
              checked={formData.auto_generate} 
              onCheckedChange={v => setFormData({...formData, auto_generate: v})}
            />
          </div>

          {formData.auto_generate && (
            <div>
              <Label>Generation Times</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.auto_generate_times.map((time, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => {
                        const newTimes = [...formData.auto_generate_times];
                        newTimes[idx] = e.target.value;
                        setFormData({...formData, auto_generate_times: newTimes});
                      }}
                      className="w-28"
                    />
                    {formData.auto_generate_times.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          const newTimes = formData.auto_generate_times.filter((_, i) => i !== idx);
                          setFormData({...formData, auto_generate_times: newTimes});
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({
                    ...formData, 
                    auto_generate_times: [...formData.auto_generate_times, "12:00"]
                  })}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Time
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} className="w-full" disabled={saveMutation.isPending}>
        {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save Settings
      </Button>
    </div>
  );
}