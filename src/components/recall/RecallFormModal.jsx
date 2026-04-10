import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RecallEventRepo } from "@/lib/adapters/database";

export default function RecallFormModal({ open, onOpenChange, recall, organizationId, productionLines = [] }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({});

  useEffect(() => {
    if (open) {
      setForm(recall || {
        type: "mock_recall", status: "initiated", classification: "not_classified",
        product_name: "", reason: "", lot_numbers: [], mock_recall_target_minutes: 240
      });
    }
  }, [open, recall]);

  const mutation = useMutation({
    mutationFn: data => recall?.id
      ? RecallEventRepo.update(recall.id, data)
      : RecallEventRepo.create({ ...data, organization_id: organizationId, initiated_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recall_events"] });
      onOpenChange(false);
      toast.success(recall ? "Recall updated" : "Recall created");
    }
  });

  const handleSave = () => {
    if (!form.product_name || !form.reason) { toast.error("Product name and reason are required"); return; }
    mutation.mutate(form);
  };

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{recall ? "Edit Recall Event" : "New Recall Event"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type || "mock_recall"} onValueChange={v => update("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mock_recall">Mock Recall</SelectItem>
                  <SelectItem value="actual_recall">Actual Recall</SelectItem>
                  <SelectItem value="market_withdrawal">Market Withdrawal</SelectItem>
                  <SelectItem value="stock_recovery">Stock Recovery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status || "initiated"} onValueChange={v => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="initiated">Initiated</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Product Name *</Label>
            <Input value={form.product_name || ""} onChange={e => update("product_name", e.target.value)} />
          </div>
          <div>
            <Label>Reason *</Label>
            <Textarea value={form.reason || ""} onChange={e => update("reason", e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Product Code</Label>
              <Input value={form.product_code || ""} onChange={e => update("product_code", e.target.value)} />
            </div>
            <div>
              <Label>Lot Numbers (comma-separated)</Label>
              <Input value={(form.lot_numbers || []).join(", ")} onChange={e => update("lot_numbers", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Production Line</Label>
              <Select value={form.production_line_id || ""} onValueChange={v => { const line = productionLines.find(l => l.id === v); update("production_line_id", v); update("production_line_name", line?.name); }}>
                <SelectTrigger><SelectValue placeholder="Select line" /></SelectTrigger>
                <SelectContent>{productionLines.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Classification</Label>
              <Select value={form.classification || "not_classified"} onValueChange={v => update("classification", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_classified">Not Classified</SelectItem>
                  <SelectItem value="class_i">Class I</SelectItem>
                  <SelectItem value="class_ii">Class II</SelectItem>
                  <SelectItem value="class_iii">Class III</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.type === "mock_recall" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Target Time (minutes)</Label>
                <Input type="number" value={form.mock_recall_target_minutes || 240} onChange={e => update("mock_recall_target_minutes", parseInt(e.target.value))} />
              </div>
              <div>
                <Label>Actual Time (minutes)</Label>
                <Input type="number" value={form.mock_recall_actual_minutes || ""} onChange={e => update("mock_recall_actual_minutes", parseInt(e.target.value) || null)} />
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Qty Produced</Label><Input type="number" value={form.quantity_produced || ""} onChange={e => update("quantity_produced", parseFloat(e.target.value) || null)} /></div>
            <div><Label>Qty Distributed</Label><Input type="number" value={form.quantity_distributed || ""} onChange={e => update("quantity_distributed", parseFloat(e.target.value) || null)} /></div>
            <div><Label>Qty Recovered</Label><Input type="number" value={form.quantity_recovered || ""} onChange={e => update("quantity_recovered", parseFloat(e.target.value) || null)} /></div>
          </div>
          <div><Label>Root Cause</Label><Textarea value={form.root_cause || ""} onChange={e => update("root_cause", e.target.value)} rows={2} /></div>
          <div><Label>Corrective Actions</Label><Textarea value={form.corrective_actions || ""} onChange={e => update("corrective_actions", e.target.value)} rows={2} /></div>
          <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => update("notes", e.target.value)} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {recall ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}