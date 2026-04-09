import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Settings, Droplets, GraduationCap, X } from "lucide-react";
import { DiverterTaskSettingsRepo } from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import TrainingDocumentSelector from "@/components/modals/TrainingDocumentSelector";

const DAYS_OF_WEEK = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

export default function DiverterTaskSettingsPanel({ organizationId }) {
  const queryClient = useQueryClient();
  const [showTrainingSelector, setShowTrainingSelector] = useState(false);
  
  const [formData, setFormData] = useState({
    is_enabled: true,
    frequency: "weekly",
    days_of_week: ["monday", "wednesday", "friday"],
    task_title: "Rain Diverter Bucket Check",
    required_training_id: "",
    required_training_title: ""
  });

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["diverter_task_settings", organizationId],
    queryFn: () => DiverterTaskSettingsRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  useEffect(() => {
    if (settings.length > 0) {
      const s = settings[0];
      setFormData({
        is_enabled: s.is_enabled ?? true,
        frequency: s.frequency || "weekly",
        days_of_week: s.days_of_week || ["monday", "wednesday", "friday"],
        task_title: s.task_title || "Rain Diverter Bucket Check",
        required_training_id: s.required_training_id || "",
        required_training_title: s.required_training_title || ""
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
      if (settings.length > 0) {
        return DiverterTaskSettingsRepo.update(settings[0].id, data);
      } else {
        return DiverterTaskSettingsRepo.create({
          organization_id: organizationId,
          ...data
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diverter_task_settings"] });
      toast.success("Settings saved");
    }
  });

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-slate-600" />
          Task Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplets className="w-5 h-5 text-blue-600" />
            <div>
              <Label className="text-base font-medium">Rain Diverter Task</Label>
              <p className="text-sm text-slate-500">
                Add diverter inspection to employee task selection
              </p>
            </div>
          </div>
          <Switch
            checked={formData.is_enabled}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked }))}
          />
        </div>

        {formData.is_enabled && (
          <>
            {/* Task Title */}
            <div className="space-y-2">
              <Label>Task Title</Label>
              <Input
                value={formData.task_title}
                onChange={(e) => setFormData(prev => ({ ...prev, task_title: e.target.value }))}
                placeholder="Rain Diverter Bucket Check"
              />
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select 
                value={formData.frequency} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Days of Week (for daily frequency) */}
            {formData.frequency === "daily" && (
              <div className="space-y-2">
                <Label>Days of Week</Label>
                <p className="text-xs text-slate-500 mb-2">Select which days the task should appear</p>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <Badge
                      key={day.value}
                      variant={formData.days_of_week.includes(day.value) ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1"
                      onClick={() => toggleDay(day.value)}
                    >
                      {day.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

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
                Employees will be prompted to complete this training before performing inspections
              </p>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Employees will see:</strong> "{formData.task_title}" task in their task selection 
                {formData.frequency === "daily" 
                  ? ` on ${formData.days_of_week.length} day(s) per week`
                  : formData.frequency === "weekly"
                    ? " once per week"
                    : formData.frequency === "bi-weekly"
                      ? " once every two weeks"
                      : " once per month"
                }.
              </p>
            </div>
          </>
        )}

        <TrainingDocumentSelector
          open={showTrainingSelector}
          onOpenChange={setShowTrainingSelector}
          organizationId={organizationId}
          selectedId={formData.required_training_id}
          onSelect={handleTrainingSelect}
        />

        <Button 
          onClick={handleSave} 
          disabled={saveMutation.isPending}
          className="w-full"
        >
          {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}