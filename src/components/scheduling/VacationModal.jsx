/**
 * Modal to add/manage vacation (time off) for an employee on a specific date or date range.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Palmtree, Trash2 } from "lucide-react";

export default function VacationModal({
  open,
  onOpenChange,
  employee,
  date,
  existingEntry,
  onSave,
  onDelete,
  isLoading,
}) {
  const [endDate, setEndDate] = useState(date || "");
  const [status, setStatus] = useState(existingEntry?.status === "cancelled" ? "cancelled" : existingEntry?.status === "absent" ? "absent" : "cancelled");
  const [notes, setNotes] = useState(existingEntry?.shiftRecord?.notes || "");

  const isExistingVacation = existingEntry?.isOverride && (existingEntry?.status === "cancelled" || existingEntry?.status === "absent");

  const handleSave = () => {
    onSave({
      startDate: date,
      endDate: endDate || date,
      status,
      notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palmtree className="w-5 h-5 text-amber-500" />
            {isExistingVacation ? "Edit Time Off" : "Add Time Off"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Employee info */}
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="font-medium text-slate-900">{employee?.name}</div>
            <div className="text-sm text-slate-500">{employee?.email}</div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={date || ""} readOnly className="bg-slate-50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={date}
              />
            </div>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cancelled">Vacation / PTO</SelectItem>
                <SelectItem value="absent">Absent / Sick</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for time off..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {isExistingVacation && onDelete && (
            <Button
              variant="outline"
              className="text-rose-600 hover:text-rose-700 mr-auto"
              onClick={() => onDelete(existingEntry.shiftRecord?.id)}
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Remove
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isExistingVacation ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}