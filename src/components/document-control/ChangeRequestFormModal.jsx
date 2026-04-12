import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Search, Check, X, FileText, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DocumentChangeRequestRepo } from "@/lib/adapters/database";

export default function ChangeRequestFormModal({ open, onOpenChange, changeRequest, documents, trainingDocuments = [], organizationId, user, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [docSearch, setDocSearch] = useState("");
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
  const selectedTrainingDoc = !selectedDoc ? trainingDocuments.find(d => d.id === form.document_id) : null;
  const selectedAny = selectedDoc || selectedTrainingDoc;

  // Build a unified list: controlled docs + training docs not already linked
  const linkedControlledIds = new Set(documents.filter(d => d.training_document_id).map(d => d.training_document_id));
  const unlinkedTrainingDocs = trainingDocuments.filter(td => !linkedControlledIds.has(td.id));

  const allDocOptions = [
    ...documents.map(d => ({
      id: d.id,
      label: `${d.document_number ? d.document_number + " - " : ""}${d.title}`,
      title: d.title,
      document_number: d.document_number,
      source: "controlled",
      status: d.status,
    })),
    ...unlinkedTrainingDocs.map(d => ({
      id: d.id,
      label: `[Training] ${d.title}`,
      title: d.title,
      document_number: null,
      source: "training",
      status: d.status || "active",
    })),
  ];

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
        document_title: selectedAny?.title || null,
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
              {/* Selected document display */}
              {form.document_id && selectedAny ? (
                <div className="flex items-center gap-2 mt-1 p-2 bg-slate-50 border rounded-lg">
                  {selectedDoc ? <FileText className="w-4 h-4 text-slate-500 shrink-0" /> : <GraduationCap className="w-4 h-4 text-violet-500 shrink-0" />}
                  <span className="text-sm truncate flex-1">{allDocOptions.find(o => o.id === form.document_id)?.label}</span>
                  <button
                    type="button"
                    onClick={() => { setForm(prev => ({ ...prev, document_id: "" })); setDocSearch(""); }}
                    className="text-slate-400 hover:text-slate-600 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="mt-1 border rounded-lg overflow-hidden">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search documents by name..."
                      value={docSearch}
                      onChange={(e) => setDocSearch(e.target.value)}
                      className="pl-9 border-0 border-b rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {allDocOptions.filter(o => !docSearch || o.label.toLowerCase().includes(docSearch.toLowerCase())).length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">No documents found</p>
                    ) : (
                      <>
                        {allDocOptions.filter(o => o.source === "controlled" && (!docSearch || o.label.toLowerCase().includes(docSearch.toLowerCase()))).length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold px-3 py-1.5 bg-slate-50">Controlled Documents</p>
                            {allDocOptions.filter(o => o.source === "controlled" && (!docSearch || o.label.toLowerCase().includes(docSearch.toLowerCase()))).map(opt => (
                              <button
                                type="button"
                                key={opt.id}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2 transition-colors"
                                onClick={() => { setForm(prev => ({ ...prev, document_id: opt.id })); setDocSearch(""); }}
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{opt.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {allDocOptions.filter(o => o.source === "training" && (!docSearch || o.label.toLowerCase().includes(docSearch.toLowerCase()))).length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-violet-400 font-semibold px-3 py-1.5 bg-violet-50">Training Documents</p>
                            {allDocOptions.filter(o => o.source === "training" && (!docSearch || o.label.toLowerCase().includes(docSearch.toLowerCase()))).map(opt => (
                              <button
                                type="button"
                                key={opt.id}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 flex items-center gap-2 transition-colors"
                                onClick={() => { setForm(prev => ({ ...prev, document_id: opt.id })); setDocSearch(""); }}
                              >
                                <GraduationCap className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                                <span className="truncate">{opt.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
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