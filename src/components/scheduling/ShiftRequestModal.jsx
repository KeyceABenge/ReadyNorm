import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Palmtree, Clock, ArrowRightLeft, Loader2, User, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const REQUEST_TYPES = [
  { id: "vacation", label: "Request Day Off", icon: Palmtree, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", description: "Request vacation or personal time off" },
  { id: "overtime", label: "Request Overtime", icon: Clock, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", description: "Volunteer to work on your day off" },
  { id: "shift_cover", label: "Request Shift Cover", icon: ArrowRightLeft, color: "text-purple-600", bg: "bg-purple-50 border-purple-200", description: "Ask a teammate to cover your shift" },
];

export default function ShiftRequestModal({ open, onOpenChange, date, isScheduled, allEmployees = [], employee, onSubmit, isLoading }) {
  const [requestType, setRequestType] = useState(null);
  const [coverMode, setCoverMode] = useState(null); // "direct" or "open_bid"
  const [coverEmployee, setCoverEmployee] = useState("");
  const [notes, setNotes] = useState("");

  const handleClose = () => {
    setRequestType(null);
    setCoverMode(null);
    setCoverEmployee("");
    setNotes("");
    onOpenChange(false);
  };

  const handleSubmit = () => {
    const data = {
      request_type: requestType,
      target_date: date,
      notes,
    };
    if (requestType === "shift_cover") {
      data.cover_mode = coverMode;
      if (coverMode === "direct" && coverEmployee) {
        const emp = allEmployees.find(e => e.email === coverEmployee);
        data.cover_employee_email = coverEmployee;
        data.cover_employee_name = emp?.name || coverEmployee;
      }
    }
    onSubmit(data);
    handleClose();
  };

  const availableTypes = REQUEST_TYPES.filter(t => {
    if (t.id === "vacation" && !isScheduled) return false;
    if (t.id === "overtime" && isScheduled) return false;
    if (t.id === "shift_cover" && !isScheduled) return false;
    return true;
  });

  const otherMembers = allEmployees.filter(e => e.email !== employee?.email && e.status === "active");

  const canSubmit = () => {
    if (requestType === "shift_cover") {
      if (!coverMode) return false;
      if (coverMode === "direct" && !coverEmployee) return false;
    }
    return !!requestType;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Schedule Request — {date ? format(new Date(date + "T12:00:00"), "EEE, MMM d") : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Request Type */}
          {!requestType ? (
            <div className="space-y-2">
              <Label className="text-sm text-slate-600">What would you like to do?</Label>
              {availableTypes.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setRequestType(type.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all hover:shadow-sm",
                      type.bg
                    )}
                  >
                    <Icon className={cn("w-5 h-5 flex-shrink-0", type.color)} />
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{type.label}</p>
                      <p className="text-xs text-slate-500">{type.description}</p>
                    </div>
                  </button>
                );
              })}
              {availableTypes.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No actions available for this day.</p>
              )}
            </div>
          ) : (
            <>
              {/* Selected type badge */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {REQUEST_TYPES.find(t => t.id === requestType)?.label}
                </Badge>
                <button onClick={() => { setRequestType(null); setCoverMode(null); setCoverEmployee(""); }} className="text-xs text-slate-400 hover:text-slate-600">Change</button>
              </div>

              {/* Step 2 for shift_cover: Choose mode */}
              {requestType === "shift_cover" && !coverMode && (
                <div className="space-y-2">
                  <Label className="text-sm text-slate-600">How do you want to find coverage?</Label>
                  <button
                    onClick={() => setCoverMode("direct")}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border-2 bg-indigo-50 border-indigo-200 text-left transition-all hover:shadow-sm"
                  >
                    <User className="w-5 h-5 flex-shrink-0 text-indigo-600" />
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">Ask a specific person</p>
                      <p className="text-xs text-slate-500">Pick a team member to cover your shift</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setCoverMode("open_bid")}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border-2 bg-teal-50 border-teal-200 text-left transition-all hover:shadow-sm"
                  >
                    <Megaphone className="w-5 h-5 flex-shrink-0 text-teal-600" />
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">Post open bid</p>
                      <p className="text-xs text-slate-500">Anyone on the team can volunteer to cover</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Step 3a: Direct — pick employee */}
              {requestType === "shift_cover" && coverMode === "direct" && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-indigo-100 text-indigo-800 text-xs">Ask specific person</Badge>
                    <button onClick={() => { setCoverMode(null); setCoverEmployee(""); }} className="text-xs text-slate-400 hover:text-slate-600">Change</button>
                  </div>
                  <Label className="text-sm">Who should cover?</Label>
                  <Select value={coverEmployee} onValueChange={setCoverEmployee}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a teammate..." />
                    </SelectTrigger>
                    <SelectContent>
                      {otherMembers.map(emp => (
                        <SelectItem key={emp.email} value={emp.email}>
                          {emp.name} {emp.role ? `(${emp.role})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Step 3b: Open bid — just confirm */}
              {requestType === "shift_cover" && coverMode === "open_bid" && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-teal-100 text-teal-800 text-xs">Open bid</Badge>
                    <button onClick={() => setCoverMode(null)} className="text-xs text-slate-400 hover:text-slate-600">Change</button>
                  </div>
                  <div className="p-3 rounded-lg bg-teal-50 border border-teal-200">
                    <p className="text-sm text-teal-800">
                      Your shift will be posted for all team members to see. Anyone can volunteer to pick it up. Manager approval is still required.
                    </p>
                  </div>
                </div>
              )}

              {/* Notes (shown once mode is selected for shift_cover, or immediately for other types) */}
              {(requestType !== "shift_cover" || coverMode) && (
                <>
                  <div>
                    <Label className="text-sm">Notes (optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any details..."
                      className="mt-1 min-h-[60px]"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="outline" onClick={handleClose}>Cancel</Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isLoading || !canSubmit()}
                      className="bg-slate-900 hover:bg-slate-800"
                    >
                      {isLoading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                      Submit Request
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}