// @ts-nocheck
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };

export default function CrewScheduleFormModal({ open, onOpenChange, schedule, crews = [], onSave, isLoading }) {
  const [formData, setFormData] = useState({
  crew_id: "",
  crew_name: "",
  crew_color: "#3b82f6",
  shift_start_time: "05:00",
  shift_end_time: "17:00",
  shift_duration: 8,
  allows_overtime: false,
  meal_break_minutes: 30,
  break_minutes: 15,
  notes: "",
  schedule_pattern: [["monday", "tuesday", "friday", "saturday", "sunday"], ["wednesday", "thursday"]],
  status: "active"
  });

  useEffect(() => {
    if (schedule) {
      // Convert old format (week_a_days/week_b_days) to new format (schedule_pattern)
      const pattern = schedule.schedule_pattern || (schedule.week_a_days || schedule.week_b_days 
        ? [schedule.week_a_days || [], schedule.week_b_days || []]
        : [["monday", "tuesday", "friday", "saturday", "sunday"], ["wednesday", "thursday"]]);

      setFormData({
        ...schedule,
        schedule_pattern: pattern
      });
    } else {
        setFormData({
          crew_id: "",
          crew_name: "",
          crew_color: "#3b82f6",
          shift_start_time: "05:00",
          shift_end_time: "17:00",
          shift_duration: 8,
          allows_overtime: false,
          meal_break_minutes: 30,
          break_minutes: 15,
          notes: "",
          schedule_pattern: [["monday", "tuesday", "friday", "saturday", "sunday"], ["wednesday", "thursday"]],
          status: "active"
        });
      }
  }, [schedule, open]);

  const handleCrewSelect = (crewId) => {
    const selectedCrew = crews.find(c => c.id === crewId);
    if (selectedCrew) {
      // Auto-populate from crew's schedule data if available
      const updates = {
        crew_id: crewId,
        crew_name: selectedCrew.name,
        crew_color: selectedCrew.color || "#3b82f6"
      };
      
      // Pull shift times from crew if set
      if (selectedCrew.shift_start_time) updates.shift_start_time = selectedCrew.shift_start_time;
      if (selectedCrew.shift_end_time) updates.shift_end_time = selectedCrew.shift_end_time;
      if (selectedCrew.shift_hours) updates.shift_duration = selectedCrew.shift_hours;
      
      // Convert crew's boolean-based schedule_pattern to day-name-based pattern
      if (selectedCrew.schedule_pattern?.length > 0) {
        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        updates.schedule_pattern = selectedCrew.schedule_pattern.map(week =>
          week.map((isOn, idx) => isOn ? dayNames[idx] : null).filter(Boolean)
        );
      }
      
      setFormData(prev => ({ ...prev, ...updates }));
    }
  };

  const toggleDay = (day, weekIndex) => {
    setFormData(prev => {
      const newPattern = prev.schedule_pattern.map((week, idx) => {
        if (idx === weekIndex) {
          return week.includes(day)
            ? week.filter(d => d !== day)
            : [...week, day];
        }
        return week;
      });
      return { ...prev, schedule_pattern: newPattern };
    });
  };

  const addWeek = () => {
    setFormData(prev => ({
      ...prev,
      schedule_pattern: [...prev.schedule_pattern, []]
    }));
  };

  const removeWeek = (weekIndex) => {
    setFormData(prev => ({
      ...prev,
      schedule_pattern: prev.schedule_pattern.filter((_, idx) => idx !== weekIndex)
    }));
  };

  const isValid = formData.crew_id && formData.schedule_pattern && formData.schedule_pattern.length > 0 && formData.schedule_pattern.every(week => week.length > 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    console.log('Submitting form data:', formData);
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{schedule ? "Edit Crew Schedule" : "Create Crew Schedule"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="crew_select">Select Crew *</Label>
            <Select value={formData.crew_id || ""} onValueChange={handleCrewSelect}>
              <SelectTrigger id="crew_select">
                <SelectValue placeholder="Choose a crew" />
              </SelectTrigger>
              <SelectContent>
                {crews.map(crew => (
                  <SelectItem key={crew.id} value={crew.id}>
                    {crew.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Shift Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.shift_start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, shift_start_time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Shift End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.shift_end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, shift_end_time: e.target.value }))}
              />
            </div>
          </div>



          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allows_ot"
                checked={formData.allows_overtime || false}
                onChange={(e) => setFormData(prev => ({ ...prev, allows_overtime: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="allows_ot" className="mb-0">Allow Overtime</Label>
            </div>
            <p className="text-xs text-slate-500">Allow employees on this shift to work overtime</p>
          </div>



          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Schedule Pattern</Label>
              <button
                type="button"
                onClick={addWeek}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-white px-2 py-1 rounded"
              >
                + Add Week
              </button>
            </div>
            <div className="space-y-3">
              {formData.schedule_pattern && formData.schedule_pattern.map((week, weekIndex) => (
                <div key={weekIndex} className="p-3 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold">Week {weekIndex + 1}</Label>
                    {formData.schedule_pattern.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeWeek(weekIndex)}
                        className="text-xs bg-rose-100 hover:bg-rose-200 text-rose-600 px-2 py-1 rounded"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {DAYS.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day, weekIndex)}
                        className={cn(
                          "py-2 px-3 rounded-lg font-medium text-sm transition-colors",
                          week.includes(day)
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        {DAY_LABELS[day]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !isValid} className="bg-slate-900 hover:bg-slate-800">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {schedule ? "Update Schedule" : "Create Schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}