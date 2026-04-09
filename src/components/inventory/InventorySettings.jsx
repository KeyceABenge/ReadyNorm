import { useState, useEffect } from "react";
import { ChemicalInventorySettingsRepo } from "@/lib/adapters/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, Loader2, GraduationCap, X } from "lucide-react";
import { toast } from "sonner";
import TrainingDocumentSelector from "@/components/modals/TrainingDocumentSelector";

export default function InventorySettings({ organizationId, settings }) {
  const [showTrainingSelector, setShowTrainingSelector] = useState(false);
  const [formData, setFormData] = useState({
    frequency: "weekly",
    day_of_week: "monday",
    task_title: "Chemical Inventory Count",
    is_enabled: true,
    notify_on_low_stock: true,
    required_training_id: "",
    required_training_title: ""
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (settings) {
      setFormData({
        frequency: settings.frequency || "weekly",
        day_of_week: settings.day_of_week || "monday",
        task_title: settings.task_title || "Chemical Inventory Count",
        is_enabled: settings.is_enabled !== false,
        notify_on_low_stock: settings.notify_on_low_stock !== false,
        required_training_id: settings.required_training_id || "",
        required_training_title: settings.required_training_title || ""
      });
    }
  }, [settings]);

  const handleTrainingSelect = (doc) => {
    if (doc) {
      setFormData(prev => ({ 
        ...prev, 
        required_training_id: doc.id,
        required_training_title: doc.title
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        required_training_id: "",
        required_training_title: ""
      }));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return ChemicalInventorySettingsRepo.update(settings.id, data);
      } else {
        return ChemicalInventorySettingsRepo.create({ ...data, organization_id: organizationId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_settings"] });
      toast.success("Settings saved");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-slate-600" />
        <h2 className="text-lg font-semibold text-slate-900">Inventory Settings</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <Label className="text-base">Enable Inventory Task</Label>
            <p className="text-sm text-slate-500">Show inventory count as an employee task</p>
          </div>
          <Switch checked={formData.is_enabled} onCheckedChange={v => setFormData({...formData, is_enabled: v})} />
        </div>

        <div>
          <Label>Task Title</Label>
          <Input value={formData.task_title} onChange={e => setFormData({...formData, task_title: e.target.value})}
                 placeholder="Chemical Inventory Count" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Frequency</Label>
            <Select value={formData.frequency} onValueChange={v => setFormData({...formData, frequency: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Day of Week</Label>
            <Select value={formData.day_of_week} onValueChange={v => setFormData({...formData, day_of_week: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {days.map(d => (
                  <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">For weekly frequency</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <Label className="text-base">Low Stock Notifications</Label>
            <p className="text-sm text-slate-500">Alert when items fall below par level</p>
          </div>
          <Switch checked={formData.notify_on_low_stock} 
                  onCheckedChange={v => setFormData({...formData, notify_on_low_stock: v})} />
        </div>

        {/* Required Training */}
        <div className="space-y-2">
          <Label>Required Training</Label>
          {formData.required_training_id ? (
            <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-900 flex-1">{formData.required_training_title}</span>
              <button
                type="button"
                onClick={() => handleTrainingSelect(null)}
                className="text-purple-400 hover:text-purple-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowTrainingSelector(true)}
              className="w-full justify-start text-slate-600"
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              Link Required Training (Optional)
            </Button>
          )}
          <p className="text-xs text-slate-500">
            Employees will be prompted to complete this training before performing inventory counts
          </p>
        </div>

        <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </form>

      <TrainingDocumentSelector
        open={showTrainingSelector}
        onOpenChange={setShowTrainingSelector}
        organizationId={organizationId}
        selectedId={formData.required_training_id}
        onSelect={handleTrainingSelect}
      />
    </Card>
  );
}