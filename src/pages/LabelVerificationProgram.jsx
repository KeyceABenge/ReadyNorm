// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrainingRecordRepo as LabelVerificationRepo } from "@/lib/adapters/database";
import useOrganization from "@/components/auth/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Tag, Loader2, Pencil, CheckCircle2, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function LabelVerificationProgram() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const { organizationId: orgId, isLoading: orgLoading } = useOrganization();
  const queryClient = useQueryClient();

  const { data: verifications = [], isLoading } = useQuery({
    queryKey: ["label_verifications", orgId],
    queryFn: () => LabelVerificationRepo.filter({ organization_id: orgId }, "-verification_date"),
    enabled: !!orgId, staleTime: 60000
  });

  const mutation = useMutation({
    mutationFn: data => editing?.id ? LabelVerificationRepo.update(editing.id, data) : LabelVerificationRepo.create({ ...data, organization_id: orgId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["label_verifications"] }); setFormOpen(false); toast.success(editing ? "Updated" : "Verification recorded"); }
  });

  const openForm = (v = null) => {
    setEditing(v);
    setForm(v || { verification_type: "pre_run", overall_result: "pass", verification_date: new Date().toISOString(), allergen_statement_correct: true, nutrition_facts_correct: true, net_weight_correct: true, upc_code_correct: true, best_by_date_correct: true });
    setFormOpen(true);
  };

  const failures = verifications.filter(v => v.overall_result === "fail");

  if (orgLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 max-w-7xl mx-auto py-4 sm:py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2"><Tag className="w-6 h-6 text-teal-500" /> Label Verification</h1><p className="text-slate-500 text-sm mt-1">Pre-run, changeover, and allergen label verification</p></div>
        <Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> New Verification</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-teal-100 rounded-lg"><Tag className="w-5 h-5 text-teal-600" /></div><div><p className="text-2xl font-bold">{verifications.length}</p><p className="text-xs text-slate-500">Total</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-emerald-100 rounded-lg"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{verifications.filter(v => v.overall_result === "pass").length}</p><p className="text-xs text-slate-500">Passed</p></div></CardContent></Card>
        <Card className={failures.length > 0 ? "border-rose-200" : ""}><CardContent className="p-4 flex items-center gap-3"><div className={cn("p-2 rounded-lg", failures.length > 0 ? "bg-rose-100" : "bg-slate-100")}><XCircle className={cn("w-5 h-5", failures.length > 0 ? "text-rose-600" : "text-slate-400")} /></div><div><p className="text-2xl font-bold">{failures.length}</p><p className="text-xs text-slate-500">Failed</p></div></CardContent></Card>
      </div>

      <div className="space-y-3">
        {verifications.length === 0 ? (
          <Card className="p-12 text-center"><Tag className="w-12 h-12 text-slate-300 mx-auto mb-4" /><h3 className="font-semibold mb-2">No verifications recorded</h3><Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> Record First Verification</Button></Card>
        ) : verifications.map(v => (
          <Card key={v.id} className={cn("p-4", v.overall_result === "fail" && "border-rose-200 bg-rose-50/30")}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={v.overall_result === "pass" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>{v.overall_result}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{v.verification_type?.replace(/_/g, " ")}</Badge>
                </div>
                <h3 className="font-semibold">{v.product_name}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {!v.allergen_statement_correct && <Badge className="bg-rose-100 text-rose-700 text-xs">Allergen ✗</Badge>}
                  {!v.nutrition_facts_correct && <Badge className="bg-rose-100 text-rose-700 text-xs">Nutrition ✗</Badge>}
                  {!v.net_weight_correct && <Badge className="bg-rose-100 text-rose-700 text-xs">Weight ✗</Badge>}
                  {!v.upc_code_correct && <Badge className="bg-rose-100 text-rose-700 text-xs">UPC ✗</Badge>}
                  {!v.best_by_date_correct && <Badge className="bg-rose-100 text-rose-700 text-xs">Date ✗</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  {v.lot_number && <span>Lot: {v.lot_number}</span>}
                  {v.production_line_name && <span>{v.production_line_name}</span>}
                  {v.verification_date && <span>{format(parseISO(v.verification_date), "MMM d, yyyy h:mm a")}</span>}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(v)}><Pencil className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Label Verification</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Product Name *</Label><Input value={form.product_name || ""} onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Verification Type</Label><Select value={form.verification_type || "pre_run"} onValueChange={v => setForm(p => ({ ...p, verification_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pre_run">Pre-Run</SelectItem><SelectItem value="changeover">Changeover</SelectItem><SelectItem value="random_check">Random Check</SelectItem><SelectItem value="new_label_approval">New Label Approval</SelectItem></SelectContent></Select></div>
              <div><Label>Lot Number</Label><Input value={form.lot_number || ""} onChange={e => setForm(p => ({ ...p, lot_number: e.target.value }))} /></div>
            </div>
            <div className="space-y-2 border-t pt-3">
              <p className="text-sm font-medium">Label Checks</p>
              {[["allergen_statement_correct", "Allergen Statement Correct"], ["nutrition_facts_correct", "Nutrition Facts Correct"], ["net_weight_correct", "Net Weight Correct"], ["upc_code_correct", "UPC/Barcode Correct"], ["best_by_date_correct", "Best By Date Correct"]].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between"><Label className="text-sm">{label}</Label><Switch checked={form[key] ?? true} onCheckedChange={v => setForm(p => ({ ...p, [key]: v }))} /></div>
              ))}
            </div>
            <div><Label>Overall Result</Label><Select value={form.overall_result || "pass"} onValueChange={v => setForm(p => ({ ...p, overall_result: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pass">Pass</SelectItem><SelectItem value="fail">Fail</SelectItem></SelectContent></Select></div>
            <div><Label>Verified By</Label><Input value={form.verified_by_name || ""} onChange={e => setForm(p => ({ ...p, verified_by_name: e.target.value }))} /></div>
            {form.overall_result === "fail" && <div><Label>Corrective Action</Label><Textarea value={form.corrective_action || ""} onChange={e => setForm(p => ({ ...p, corrective_action: e.target.value }))} rows={2} /></div>}
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editing ? "Update" : "Create"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}