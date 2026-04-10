// @ts-nocheck
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PolicyRepo } from "@/lib/adapters/database";

export default function SOC2PolicyModal({ open, onOpenChange, policy, orgId }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (policy) {
      setForm({ ...policy });
    } else {
      setForm({ category: "security_governance", status: "draft", version: "1.0", owner: "Founder / System Administrator" });
    }
  }, [policy, open]);

  const handleSave = async () => {
    if (!form.policy_name) { toast.error("Policy name required"); return; }
    setSaving(true);
    try {
      if (policy?.id) {
        const { id, created_date, updated_date, created_by, ...data } = form;
        await SOC2PolicyRepo.update(policy.id, data);
      } else {
        await SOC2PolicyRepo.create({ ...form, organization_id: orgId });
      }
      queryClient.invalidateQueries({ queryKey: ["soc2_policies"] });
      toast.success("Policy saved");
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
          <DialogTitle>{policy ? "Edit Policy" : "Add Policy"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Policy Name</Label>
            <Input value={form.policy_name || ""} onChange={e => setForm(f => ({ ...f, policy_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category || ""} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="security_governance">Security & Governance</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="hr_people">HR & People</SelectItem>
                  <SelectItem value="data_management">Data Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status || "draft"} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Version</Label>
              <Input value={form.version || ""} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
            </div>
            <div>
              <Label>Owner</Label>
              <Input value={form.owner || ""} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Next Review Date</Label>
            <Input type="date" value={form.next_review_date || ""} onChange={e => setForm(f => ({ ...f, next_review_date: e.target.value }))} />
          </div>
          <div>
            <Label>Content (Markdown)</Label>
            <textarea
              className="w-full border rounded-lg p-3 text-sm min-h-[200px] font-mono"
              value={form.content || ""}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Policy content in markdown format..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}