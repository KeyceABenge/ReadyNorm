import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Loader2, Clock, Calendar, Search } from "lucide-react";
import SchedulePatternEditor from "./SchedulePatternEditor";
import { format } from "date-fns";

const DEFAULT_FORM = {
  name: "",
  description: "",
  color: "#3b82f6",
  members: [],
  shift_id: "",
  shift_hours: "",
  shift_start_time: "",
  shift_end_time: "",
  schedule_pattern: [[false, false, true, true, true, true, true]],
  schedule_pattern_start_date: format(new Date(), "yyyy-MM-dd"),
};

export default function CrewFormModal({ open, onOpenChange, crew, employees, crews = [], shifts = [], onSubmit, isLoading }) {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    if (crew) {
      setFormData({
        ...DEFAULT_FORM,
        ...crew,
        shift_hours: crew.shift_hours || "",
        shift_start_time: crew.shift_start_time || "",
        shift_end_time: crew.shift_end_time || "",
        schedule_pattern: crew.schedule_pattern?.length > 0
          ? crew.schedule_pattern
          : DEFAULT_FORM.schedule_pattern,
        schedule_pattern_start_date: crew.schedule_pattern_start_date || format(new Date(), "yyyy-MM-dd"),
        members: crew.members || [],
      });
    } else {
      setFormData(DEFAULT_FORM);
    }
  }, [crew, open]);

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const handleAddMember = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    if (emp && !formData.members.includes(emp.email)) {
      set("members", [...formData.members, emp.email]);
      setMemberSearch("");
    }
  };

  const handleRemoveMember = (email) => {
    set("members", formData.members.filter(m => m !== email));
  };

  const handleSubmit = () => {
    const data = { ...formData };
    // Clean up numeric/empty fields before submit
    if (data.shift_hours !== "" && data.shift_hours != null) {
      data.shift_hours = Number(data.shift_hours);
    } else {
      delete data.shift_hours;
    }
    if (!data.shift_id) delete data.shift_id;
    if (!data.shift_start_time) delete data.shift_start_time;
    if (!data.shift_end_time) delete data.shift_end_time;
    if (!data.schedule_pattern_start_date) delete data.schedule_pattern_start_date;
    onSubmit(data);
  };

  // Only show active employees not already in THIS crew or ANY other crew
  const otherCrewMembers = new Set(
    (crews || []).filter(c => c.id !== crew?.id).flatMap(c => c.members || [])
  );
  const availableEmployees = employees
    .filter(e => e.status === "active" && !formData.members.includes(e.email) && !otherCrewMembers.has(e.email))
    .filter(e => {
      if (!memberSearch) return true;
      const q = memberSearch.toLowerCase();
      return e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q) || e.role?.toLowerCase().includes(q);
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{crew ? "Edit Crew" : "Create Crew"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Name */}
          <div>
            <Label htmlFor="name">Crew Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g., A-Team, Crew 1"
              className="rounded-xl"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional description"
              rows={2}
              className="rounded-xl"
            />
          </div>

          {/* Color */}
          <div>
            <Label htmlFor="color">Color</Label>
            <div className="flex gap-2 items-center">
              <input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) => set("color", e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200"
              />
              <Input
                type="text"
                value={formData.color}
                onChange={(e) => set("color", e.target.value)}
                placeholder="#3b82f6"
                className="flex-1 rounded-xl"
              />
            </div>
          </div>

          {/* Dashboard Shift Tab */}
          {shifts.length > 0 && (
            <div>
              <Label>Dashboard Shift Tab</Label>
              <Select value={formData.shift_id || ""} onValueChange={(val) => set("shift_id", val === "_none" ? "" : val)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select a shift tab" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No specific shift</SelectItem>
                  {shifts.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.start_time} – {s.end_time})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-400 mt-1">Groups this crew under a shift tab on the manager dashboard.</p>
            </div>
          )}

          {/* Work Hours */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-slate-500" />
              <Label className="text-sm font-semibold mb-0">Work Hours</Label>
            </div>
            <p className="text-xs text-slate-500 -mt-1">The actual start/end time and duration for this crew's shifts.</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Start Time</Label>
                <Input
                  type="time"
                  value={formData.shift_start_time}
                  onChange={(e) => set("shift_start_time", e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">End Time</Label>
                <Input
                  type="time"
                  value={formData.shift_end_time}
                  onChange={(e) => set("shift_end_time", e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Total Hours</Label>
                <Input
                  type="number"
                  value={formData.shift_hours}
                  onChange={(e) => set("shift_hours", e.target.value)}
                  placeholder="8"
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Schedule Pattern */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-slate-500" />
              <Label className="text-sm font-semibold mb-0">Schedule Pattern</Label>
            </div>
            <p className="text-xs text-slate-500 -mt-1">
              Toggle work days for each week. The pattern repeats from the start date.
            </p>

            <SchedulePatternEditor
              weeks={formData.schedule_pattern}
              onChange={(weeks) => set("schedule_pattern", weeks)}
            />

            <div>
              <Label className="text-xs text-slate-500">Pattern Start Date</Label>
              <Input
                type="date"
                value={formData.schedule_pattern_start_date}
                onChange={(e) => set("schedule_pattern_start_date", e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Members */}
          <div>
            <Label htmlFor="members">Add Members</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search employees by name or role..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="rounded-xl pl-9"
              />
            </div>
            {(memberSearch || availableEmployees.length <= 10) && availableEmployees.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto border rounded-xl bg-white divide-y divide-slate-100">
                {availableEmployees.slice(0, 20).map(emp => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleAddMember(emp.id)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-sm transition-colors"
                  >
                    <span className="font-medium text-slate-700">{emp.name}</span>
                    <span className="text-xs text-slate-400">{emp.role || "No role"}</span>
                  </button>
                ))}
              </div>
            )}
            {memberSearch && availableEmployees.length === 0 && (
              <p className="text-xs text-slate-400 mt-2">No matching employees found.</p>
            )}
          </div>

          {formData.members.length > 0 && (
            <div>
              <Label>Team Members ({formData.members.length})</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {formData.members.map(email => {
                  const emp = employees.find(e => e.email === email);
                  return (
                    <Badge key={email} variant="secondary" className="pl-3 pr-1 rounded-full">
                      {emp?.name || email}
                      <button
                        onClick={() => handleRemoveMember(email)}
                        className="ml-1 hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="rounded-full bg-slate-900 hover:bg-slate-800" onClick={handleSubmit} disabled={isLoading || !formData.name}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {crew ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}