import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function EmployeeDayOverrideModal({ open, onOpenChange, employee, date, shift, onSave, onDelete, isLoading }) {
  const [status, setStatus] = useState("on");

  useEffect(() => {
    if (shift) {
      setStatus(shift.status || "scheduled");
    } else {
      setStatus("on");
    }
  }, [shift, open]);

  const handleSubmit = (selectedStatus) => {
    if (selectedStatus === "delete") {
      if (shift?.id) {
        onDelete(shift.id);
      }
      onOpenChange(false);
    } else {
      onSave({
        employee_id: employee?.id,
        employee_email: employee?.email,
        employee_name: employee?.name,
        shift_date: date,
        status: selectedStatus,
        crew_schedule_id: shift?.crew_schedule_id || "",
        crew_name: shift?.crew_name || "",
        shift_start_time: shift?.shift_start_time || "",
        shift_end_time: shift?.shift_end_time || ""
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {employee?.name} - {date}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Button
            onClick={() => handleSubmit("scheduled")}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 h-12"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            ✓ On (Working)
          </Button>

          <Button
            onClick={() => handleSubmit("absent")}
            disabled={isLoading}
            variant="outline"
            className="w-full h-12"
          >
            ✕ Off
          </Button>

          <Button
            onClick={() => handleSubmit("cancelled")}
            disabled={isLoading}
            variant="outline"
            className="w-full h-12"
          >
            ⛔ Vacation/Leave
          </Button>

          {shift && (
            <Button
              onClick={() => handleSubmit("delete")}
              disabled={isLoading}
              variant="outline"
              className="w-full text-rose-600 hover:text-rose-700 h-12"
            >
              🗑️ Remove Override
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}