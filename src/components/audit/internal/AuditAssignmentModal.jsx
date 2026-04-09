// @ts-nocheck
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, User, Mail, Bell } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AuditAssignmentModal({ open, onClose, audit, employees = [], onSuccess }) {
  const [formData, setFormData] = useState({
    auditor_email: audit?.auditor_email || "",
    auditor_name: audit?.auditor_name || "",
    due_date: audit?.due_date || "",
    status: audit?.status || "scheduled"
  });
  const [isSaving, setIsSaving] = useState(false);
  const [sendReminder, setSendReminder] = useState(false);

  // Reset form when audit changes
  useEffect(() => {
    if (audit) {
      setFormData({
        auditor_email: audit.auditor_email || "",
        auditor_name: audit.auditor_name || "",
        due_date: audit.due_date || "",
        status: audit.status || "scheduled"
      });
    }
  }, [audit]);

  const handleEmployeeSelect = (id) => {
    const selectedEmployee = employees.find(e => e.id === id);
    if (selectedEmployee) {
      setFormData({
        ...formData,
        auditor_email: selectedEmployee.email || "",
        auditor_name: selectedEmployee.name || ""
      });
    }
  };

  const handleSave = async () => {
    if (!formData.auditor_email) {
      toast.error("Auditor email is required");
      return;
    }

    setIsSaving(true);
    try {
      await ScheduledAuditRepo.update(audit.id, formData);
      
      // Send reminder email if requested
      if (sendReminder && formData.auditor_email) {
        try {
          await sendEmail({
            to: formData.auditor_email,
            subject: `Audit Assignment: ${audit.section_title}`,
            body: `
Hello ${formData.auditor_name || "Auditor"},

You have been assigned an internal audit:

Section: ${audit.section_title}
Standard: ${audit.standard_name}
Due Date: ${formData.due_date ? format(new Date(formData.due_date), "MMMM d, yyyy") : "Not set"}

Please complete this audit by the due date.

Thank you.
            `.trim()
          });
          toast.success("Audit updated and reminder sent");
        } catch (emailError) {
          console.error("Email error:", emailError);
          toast.success("Audit updated (reminder failed to send)");
        }
      } else {
        toast.success("Audit updated");
      }
      
      onSuccess();
    } catch (error) {
      toast.error("Failed to update");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this scheduled audit?")) return;
    
    try {
      await ScheduledAuditRepo.delete(audit.id);
      toast.success("Audit deleted");
      onSuccess();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Scheduled Audit</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="font-medium">{audit.section_title}</p>
            <p className="text-sm text-slate-600">{audit.standard_name}</p>
            <p className="text-xs text-slate-500 mt-1">Section {audit.section_number}</p>
          </div>

          {/* Employee Selection */}
          {employees.length > 0 && (
            <div>
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Select Auditor
              </Label>
              <Select 
                onValueChange={handleEmployeeSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center gap-2">
                        <span>{emp.name}</span>
                        {emp.email && <span className="text-xs text-slate-500">({emp.email})</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Auditor Email *
              </Label>
              <Input 
                type="email"
                value={formData.auditor_email}
                onChange={(e) => setFormData({ ...formData, auditor_email: e.target.value })}
                placeholder="auditor@company.com"
              />
            </div>
            <div>
              <Label>Auditor Name</Label>
              <Input 
                value={formData.auditor_name}
                onChange={(e) => setFormData({ ...formData, auditor_name: e.target.value })}
                placeholder="Full name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Due Date</Label>
              <Input 
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Send Reminder Option */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <input
              type="checkbox"
              id="sendReminder"
              checked={sendReminder}
              onChange={(e) => setSendReminder(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="sendReminder" className="flex items-center gap-2 text-sm cursor-pointer">
              <Bell className="w-4 h-4 text-blue-600" />
              Send email reminder to auditor
            </label>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button variant="ghost" onClick={handleDelete} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {sendReminder ? "Save & Send Reminder" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}