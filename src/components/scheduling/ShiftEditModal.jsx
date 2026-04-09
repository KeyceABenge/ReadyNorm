/**
 * Modal to edit a shift cell — add a work day, set vacation, mark absent, or adjust times.
 */
// @ts-nocheck
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Clock, Palmtree, UserX } from "lucide-react";
import { format, parseISO } from "date-fns";

const ACTION_OPTIONS = [
  { value: "scheduled", label: "Working", icon: Clock, description: "Add or adjust a work shift" },
  { value: "cancelled", label: "Vacation / PTO", icon: Palmtree, description: "Time off request" },
  { value: "absent", label: "Absent / Sick", icon: UserX, description: "Unplanned absence" },
];

export default function ShiftEditModal({
  open,
  onOpenChange,
  employee,
  date,
  existingEntry,
  crewSchedules,
  onSave,
  onDelete,
  isLoading,
}) {
  // Determine initial state from existing entry
  const hasExistingShift = !!existingEntry;
  const isScheduledWork = existingEntry && (existingEntry.status === "scheduled" || existingEntry.status === "closed");
  const isOverride = existingEntry?.isOverride;

  const [action, setAction] = useState("scheduled");
  const [startTime, setStartTime] = useState("05:00");
  const [endTime, setEndTime] = useState("17:00");
  const [endDate, setEndDate] = useState(date || "");
  const [crewScheduleId, setCrewScheduleId] = useState("");
  const [notes, setNotes] = useState("");

  // Reset state when modal opens with new data
  useEffect(() => {
    if (!open) return;

    const sr = existingEntry?.shiftRecord;
    const cs = existingEntry?.crewSchedule;

    if (existingEntry?.status === "cancelled") {
      setAction("cancelled");
    } else if (existingEntry?.status === "absent") {
      setAction("absent");
    } else {
      setAction("scheduled");
    }

    // Times: prefer override shift record, then crew schedule, then crew defaults
    if (sr && sr.shift_start_time && sr.shift_start_time !== "00:00") {
      setStartTime(sr.shift_start_time);
      setEndTime(sr.shift_end_time || "17:00");
    } else if (cs) {
      setStartTime(cs.shift_start_time || "05:00");
      setEndTime(cs.shift_end_time || "17:00");
    } else if (existingEntry?.crew) {
      setStartTime(existingEntry.crew.shift_start_time || "05:00");
      setEndTime(existingEntry.crew.shift_end_time || "17:00");
    } else {
      setStartTime("05:00");
      setEndTime("17:00");
    }

    setEndDate(date || "");
    setCrewScheduleId(sr?.crew_schedule_id || "");
    setNotes(sr?.notes || "");
  }, [open, existingEntry, date]);

  const handleSave = () => {
    onSave({
      action,
      startDate: date,
      endDate: action !== "scheduled" ? (endDate || date) : date,
      startTime: action === "scheduled" ? startTime : "00:00",
      endTime: action === "scheduled" ? endTime : "00:00",
      crewScheduleId: action === "scheduled" ? crewScheduleId : "vacation",
      notes,
    });
  };

  const formattedDate = date ? format(parseISO(date), "EEEE, MMMM d, yyyy") : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Schedule</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Employee + date info */}
          <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-900 text-sm">{employee?.name}</div>
              <div className="text-xs text-slate-500">{formattedDate}</div>
            </div>
            {isScheduledWork && !isOverride && (
              <div className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                Auto-scheduled
              </div>
            )}
          </div>

          {/* Action selector — styled as cards */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Status</Label>
            <div className="grid grid-cols-3 gap-2">
              {ACTION_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const selected = action === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setAction(opt.value)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 text-xs font-medium transition-all ${
                      selected
                        ? opt.value === "scheduled"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : opt.value === "cancelled"
                          ? "border-amber-400 bg-amber-50 text-amber-700"
                          : "border-slate-400 bg-slate-100 text-slate-700"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional fields based on action */}
          {action === "scheduled" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Start Time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End Time</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              {crewSchedules.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Crew Schedule (optional)</Label>
                  <Select value={crewScheduleId} onValueChange={setCrewScheduleId}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="None — custom shift" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">None — custom shift</SelectItem>
                      {crewSchedules.map(cs => (
                        <SelectItem key={cs.id} value={cs.id}>
                          {cs.crew_name} ({cs.shift_start_time}–{cs.shift_end_time})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {action !== "scheduled" && (
            <div className="space-y-1.5">
              <Label className="text-xs">End Date (for multi-day)</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={date}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {isOverride && onDelete && (
            <Button
              variant="outline"
              size="sm"
              className="text-rose-600 hover:text-rose-700 mr-auto"
              onClick={() => onDelete(existingEntry.shiftRecord?.id)}
              disabled={isLoading}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove Override
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isLoading}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}