import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ChangeRequestFormModal({ open, onOpenChange, changeRequest, documents, organizationId, user, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    document_id: changeRequest?.document_id || "",
    request_type: changeRequest?.request_type || "revision",
    priority: changeRequest?.priority || "medium",
    description: changeRequest?.description || "",
    justification: changeRequest?.justification || "",
    target_effective_date: changeRequest?.target_effective_date || "",
    training_impact: changeRequest?.impact_assessment?.training_impact || false,
    process_impact: changeRequest?.impact_assessment?.process_impact || false,
    regulatory_impact: changeRequest?.impact_assessment?.regulatory_impact || false,
    customer_impact: changeRequest?.impact_assessment?.customer_impact || false,
    risk_assessment: changeRequest?.impact_assessment?.risk_assessment || ""
  });

  const selectedDoc = documents.find(d => d.id === form.document_id);

  const generateRequestNumber = () => {
    const year = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    return `DCR-${year}-${seq}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description) {
      toast.error("Description is required");
      return;
    }

    setSaving(true);
    try {
      const data = {
        organization_id: organizationId,
        request_number: changeRequest?.request_number || generateRequestNumber(),
        document_id: form.document_id || null,
        document_number: selectedDoc?.document_number || null,
        document_title: selectedDoc?.title || null,
        request_type: form.request_type,
        priority: form.priority,
        description: form.description,
        justification: form.justification,
        target_effective_date: form.target_effective_date || null,
        requestor_email: user?.email,
        requestor_name: user?.full_name,
        status: changeRequest?.status || "draft",
        impact_assessment: {
          training_impact: form.training_impact,
          process_impact: form.process_impact,
          regulatory_impact: form.regulatory_impact,
          customer_impact: form.customer_impact,
          risk_assessment: form.risk_assessment
        }
      };

      if (changeRequest?.id) {
        await DocumentChangeRequestRepo.update(changeRequest.id, data);
        toast.success("Change request updated");
      } else {
        await DocumentChangeRequestRepo.create(data);
        toast.success("Change request created");
      }
      onSaved();
    } catch (err) {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{changeRequest ? "Edit Change Request" : "New Document Change Request"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Request Type *</Label>
              <Select value={form.request_type} onValueChange={(v) => setForm(prev => ({ ...prev, request_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_document">New Document</SelectItem>
                  <SelectItem value="revision">Revision</SelectItem>
                  <SelectItem value="editorial">Editorial Change</SelectItem>
                  <SelectItem value="obsolete">Make Obsolete</SelectItem>
                  <SelectItem value="reactivate">Reactivate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm(prev => ({ ...prev, priority: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.request_type !== "new_document" && (
            <div>
              <Label>Document to Change</Label>
              <Select value={form.document_id} onValueChange={(v) => setForm(prev => ({ ...prev, document_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document" />
                </SelectTrigger>
                <SelectContent>
                  {documents.filter(d => d.status === "effective").map(doc => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.document_number} - {doc.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Description of Change *</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what needs to be changed..."
              rows={4}
            />
          </div>

          <div>
            <Label>Justification / Business Reason</Label>
            <Textarea
              value={form.justification}
              onChange={(e) => setForm(prev => ({ ...prev, justification: e.target.value }))}
              placeholder="Why is this change needed?"
              rows={3}
            />
          </div>

          <div>
            <Label>Target Effective Date</Label>
            <Input
              type="date"
              value={form.target_effective_date}
              onChange={(e) => setForm(prev => ({ ...prev, target_effective_date: e.target.value }))}
            />
          </div>

          {/* Impact Assessment */}
          <div className="border rounded-lg p-4 space-y-3">
            <p className="font-medium text-sm">Impact Assessment</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.training_impact}
                  onCheckedChange={(v) => setForm(prev => ({ ...prev, training_impact: v }))}
                />
                <Label className="text-sm">Training Impact</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.process_impact}
                  onCheckedChange={(v) => setForm(prev => ({ ...prev, process_impact: v }))}
                />
                <Label className="text-sm">Process Impact</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.regulatory_impact}
                  onCheckedChange={(v) => setForm(prev => ({ ...prev, regulatory_impact: v }))}
                />
                <Label className="text-sm">Regulatory Impact</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.customer_impact}
                  onCheckedChange={(v) => setForm(prev => ({ ...prev, customer_impact: v }))}
                />
                <Label className="text-sm">Customer Impact</Label>
              </div>
            </div>
            <div>
              <Label className="text-sm">Risk Assessment Notes</Label>
              <Textarea
                value={form.risk_assessment}
                onChange={(e) => setForm(prev => ({ ...prev, risk_assessment: e.target.value }))}
                placeholder="Any risks associated with this change?"
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {changeRequest ? "Update" : "Create Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}