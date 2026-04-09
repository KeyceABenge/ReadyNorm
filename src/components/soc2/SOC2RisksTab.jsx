import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, AlertTriangle, Loader2, ShieldCheck, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const RISK_COLORS = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-rose-100 text-rose-700"
};

const STATUS_COLORS = {
  open: "bg-rose-100 text-rose-700",
  mitigated: "bg-blue-100 text-blue-700",
  accepted: "bg-amber-100 text-amber-700",
  closed: "bg-slate-100 text-slate-500"
};

export default function SOC2RisksTab({ orgId, risks, evidence = [] }) {
  const evidenceMap = Object.fromEntries(evidence.map(e => [e.id, e]));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const openModal = (risk) => {
    if (risk) {
      setEditing(risk);
      setForm({ ...risk });
    } else {
      setEditing(null);
      setForm({ category: "technical", likelihood: "medium", impact: "medium", risk_level: "medium", status: "open", owner: "Founder / System Administrator" });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.risk_name) { toast.error("Risk name required"); return; }
    setSaving(true);
    try {
      if (editing?.id) {
        const { id, created_date, updated_date, created_by, ...data } = form;
        await SOC2RiskRepo.update(editing.id, data);
      } else {
        await SOC2RiskRepo.create({ ...form, organization_id: orgId });
      }
      queryClient.invalidateQueries({ queryKey: ["soc2_risks"] });
      toast.success("Risk saved");
      setModalOpen(false);
    } catch (e) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Risk Register ({risks.length})</h2>
        <Button onClick={() => openModal(null)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Risk
        </Button>
      </div>

      {risks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No risks documented yet. Conduct your first risk assessment to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {risks.map(risk => (
            <Card key={risk.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openModal(risk)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${risk.risk_level === "critical" ? "text-rose-600" : risk.risk_level === "high" ? "text-orange-600" : "text-amber-600"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-medium text-sm text-slate-900">{risk.risk_name}</h4>
                      <Badge className={RISK_COLORS[risk.risk_level]}>{risk.risk_level}</Badge>
                      <Badge className={STATUS_COLORS[risk.status]}>{risk.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">{risk.description || "—"}</p>
                    <div className="flex gap-4 text-xs text-slate-400 mt-1">
                      <span>Likelihood: {risk.likelihood}</span>
                      <span>Impact: {risk.impact}</span>
                      <span>Owner: {risk.owner || "—"}</span>
                    </div>
                    {risk.mitigation && (
                      <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                        <div className="flex items-start gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-blue-700 mb-0.5">Mitigation Strategy</p>
                            <p className="text-xs text-blue-600 leading-relaxed">{risk.mitigation}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {risk.linked_evidence_ids?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {risk.linked_evidence_ids.map(eid => {
                          const ev = evidenceMap[eid];
                          if (!ev) return null;
                          return (
                            <span key={eid} className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-2 py-0.5 rounded-full">
                              <FileText className="w-3 h-3" />
                              {ev.title}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Risk" : "Add Risk"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Risk Name</Label>
              <Input value={form.risk_name || ""} onChange={e => setForm(f => ({ ...f, risk_name: e.target.value }))} />
            </div>
            <div>
              <Label>Description</Label>
              <textarea className="w-full border rounded-lg p-3 text-sm min-h-[60px]" value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category || "technical"} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="people">People</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Likelihood</Label>
                <Select value={form.likelihood || "medium"} onValueChange={v => setForm(f => ({ ...f, likelihood: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Impact</Label>
                <Select value={form.impact || "medium"} onValueChange={v => setForm(f => ({ ...f, impact: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Risk Level</Label>
                <Select value={form.risk_level || "medium"} onValueChange={v => setForm(f => ({ ...f, risk_level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status || "open"} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="mitigated">Mitigated</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Mitigation Strategy</Label>
              <textarea className="w-full border rounded-lg p-3 text-sm min-h-[60px]" value={form.mitigation || ""} onChange={e => setForm(f => ({ ...f, mitigation: e.target.value }))} />
            </div>
            <div>
              <Label>Supporting Evidence</Label>
              <div className="mt-1 max-h-40 overflow-y-auto border rounded-lg divide-y">
                {evidence.length === 0 ? (
                  <p className="text-xs text-slate-400 p-3">No evidence records available. Add evidence in the Evidence tab first.</p>
                ) : (
                  evidence.map(ev => {
                    const selected = (form.linked_evidence_ids || []).includes(ev.id);
                    return (
                      <label key={ev.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) => {
                            setForm(f => {
                              const ids = f.linked_evidence_ids || [];
                              return {
                                ...f,
                                linked_evidence_ids: checked
                                  ? [...ids, ev.id]
                                  : ids.filter(id => id !== ev.id)
                              };
                            });
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 truncate">{ev.title}</p>
                          <p className="text-xs text-slate-400">{ev.evidence_type} · {ev.folder}</p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
            <div>
              <Label>Owner</Label>
              <Input value={form.owner || ""} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}