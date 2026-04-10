import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ControlRepo } from "@/lib/adapters/database";

export default function SOC2ControlModal({ open, onOpenChange, control, orgId }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (control) {
      setForm({ ...control });
    } else {
      setForm({ category: "access_control", frequency: "monthly", status: "not_started", responsible_role: "Founder / System Administrator" });
    }
  }, [control, open]);

  const handleSave = async () => {
    if (!form.control_name) { toast.error("Control name required"); return; }
    setSaving(true);
    try {
      if (control?.id) {
        const { id, created_date, updated_date, created_by, ...data } = form;
        await SOC2ControlRepo.update(control.id, data);
      } else {
        await SOC2ControlRepo.create({ ...form, organization_id: orgId });
      }
      queryClient.invalidateQueries({ queryKey: ["soc2_controls"] });
      toast.success("Control saved");
      onOpenChange(false);
    } catch (e) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{control ? "Edit Control" : "Add Control"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Control Name</Label>
            <Input value={form.control_name || ""} onChange={e => setForm(f => ({ ...f, control_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category || ""} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="access_control">Access Control</SelectItem>
                  <SelectItem value="change_management">Change Management</SelectItem>
                  <SelectItem value="logging_monitoring">Logging & Monitoring</SelectItem>
                  <SelectItem value="backups">Backups</SelectItem>
                  <SelectItem value="incident_response">Incident Response</SelectItem>
                  <SelectItem value="risk_management">Risk Management</SelectItem>
                  <SelectItem value="vendor_management">Vendor Management</SelectItem>
                  <SelectItem value="multi_tenant_security">Multi-Tenant Security</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={form.frequency || ""} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                  <SelectItem value="per_event">Per Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <textarea className="w-full border rounded-lg p-3 text-sm min-h-[80px]" value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <Label>Responsible Role</Label>
            <Input value={form.responsible_role || ""} onChange={e => setForm(f => ({ ...f, responsible_role: e.target.value }))} />
          </div>
          <div>
            <Label>Evidence Description</Label>
            <Input value={form.evidence_description || ""} onChange={e => setForm(f => ({ ...f, evidence_description: e.target.value }))} placeholder="What evidence is saved for this control?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Last Performed</Label>
              <Input type="date" value={form.last_performed_date || ""} onChange={e => setForm(f => ({ ...f, last_performed_date: e.target.value }))} />
            </div>
            <div>
              <Label>Next Due</Label>
              <Input type="date" value={form.next_due_date || ""} onChange={e => setForm(f => ({ ...f, next_due_date: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}