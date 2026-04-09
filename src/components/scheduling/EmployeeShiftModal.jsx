import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function EmployeeShiftModal({ open, onOpenChange, employee, shiftDate, crewSchedules, shift, onSave, onDelete, isLoading }) {
  const [formData, setFormData] = useState({
    crew_schedule_id: "",
    crew_name: "",
    shift_start_time: "",
    shift_end_time: "",
    status: "scheduled",
    notes: ""
  });

  useEffect(() => {
    if (shift) {
      setFormData({
        crew_schedule_id: shift.crew_schedule_id || "",
        crew_name: shift.crew_name || "",
        shift_start_time: shift.shift_start_time || "",
        shift_end_time: shift.shift_end_time || "",
        status: shift.status || "scheduled",
        notes: shift.notes || ""
      });
    } else {
      setFormData({
        crew_schedule_id: "",
        crew_name: "",
        shift_start_time: "",
        shift_end_time: "",
        status: "scheduled",
        notes: ""
      });
    }
  }, [shift, open]);

  const handleCrewSelect = (crewId) => {
    const selectedCrew = crewSchedules.find(c => c.id === crewId);
    if (selectedCrew) {
      setFormData(prev => ({
        ...prev,
        crew_schedule_id: crewId,
        crew_name: selectedCrew.crew_name,
        shift_start_time: selectedCrew.shift_start_time,
        shift_end_time: selectedCrew.shift_end_time
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      employee_id: employee?.id,
      employee_email: employee?.email,
      employee_name: employee?.name,
      shift_date: shiftDate,
      ...formData
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {shift ? "Edit Shift" : "Assign Shift"} - {employee?.name} ({shiftDate})
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="crew">Select Crew *</Label>
            <Select value={formData.crew_schedule_id} onValueChange={handleCrewSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a crew..." />
              </SelectTrigger>
              <SelectContent>
                {crewSchedules.filter(c => c.status === "active").map(crew => (
                  <SelectItem key={crew.id} value={crew.id}>
                    {crew.crew_name} ({crew.shift_start_time} - {crew.shift_end_time})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Start Time</Label>
              <Input
                id="start"
                type="time"
                value={formData.shift_start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, shift_start_time: e.target.value }))}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End Time</Label>
              <Input
                id="end"
                type="time"
                value={formData.shift_end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, shift_end_time: e.target.value }))}
                disabled
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any notes about this shift..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {shift && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  onDelete(shift.id);
                  onOpenChange(false);
                }}
                className="text-rose-600 hover:text-rose-700"
              >
                Delete
              </Button>
            )}
            <Button type="submit" disabled={isLoading || !formData.crew_schedule_id} className="bg-slate-900 hover:bg-slate-800">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {shift ? "Update Shift" : "Assign Shift"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}