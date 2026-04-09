// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ReceivingInspectionRepo } from "@/lib/adapters/database";
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
import { Plus, Truck, CheckCircle2, XCircle, Loader2, Pencil, ClipboardCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_CONFIG = { pending: { color: "bg-blue-100 text-blue-700", label: "Pending" }, accepted: { color: "bg-emerald-100 text-emerald-700", label: "Accepted" }, accepted_with_conditions: { color: "bg-amber-100 text-amber-700", label: "Conditional" }, rejected: { color: "bg-rose-100 text-rose-700", label: "Rejected" }, on_hold: { color: "bg-purple-100 text-purple-700", label: "On Hold" } };

export default function ReceivingInspections() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const { organizationId: orgId, isLoading: orgLoading } = useOrganization();
  const queryClient = useQueryClient();

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ["receiving_inspections", orgId],
    queryFn: () => ReceivingInspectionRepo.filter({ organization_id: orgId }, "-received_date"),
    enabled: !!orgId, staleTime: 60000
  });

  const mutation = useMutation({
    mutationFn: data => editing?.id ? ReceivingInspectionRepo.update(editing.id, data) : ReceivingInspectionRepo.create({ ...data, organization_id: orgId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["receiving_inspections"] }); setFormOpen(false); toast.success(editing ? "Updated" : "Inspection recorded"); }
  });

  const openForm = (insp = null) => {
    setEditing(insp);
    setForm(insp || { status: "pending", received_date: new Date().toISOString(), seal_intact: true, temperature_acceptable: true, packaging_intact: true, pest_evidence: false, foreign_material_found: false, coa_received: false, unit: "cases" });
    setFormOpen(true);
  };

  const rejected = inspections.filter(i => i.status === "rejected");
  const today = format(new Date(), "yyyy-MM-dd");
  const todayCount = inspections.filter(i => i.received_date?.startsWith(today)).length;

  if (orgLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 max-w-7xl mx-auto py-4 sm:py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2"><Truck className="w-6 h-6 text-cyan-500" /> Receiving Inspections</h1>
          <p className="text-slate-500 text-sm mt-1">Incoming material inspection, temperature checks, and COA review</p>
        </div>
        <Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> New Inspection</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><ClipboardCheck className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{todayCount}</p><p className="text-xs text-slate-500">Today</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-emerald-100 rounded-lg"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{inspections.filter(i => i.status === "accepted").length}</p><p className="text-xs text-slate-500">Accepted</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-rose-100 rounded-lg"><XCircle className="w-5 h-5 text-rose-600" /></div><div><p className="text-2xl font-bold">{rejected.length}</p><p className="text-xs text-slate-500">Rejected</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-slate-100 rounded-lg"><Truck className="w-5 h-5 text-slate-600" /></div><div><p className="text-2xl font-bold">{inspections.length}</p><p className="text-xs text-slate-500">Total</p></div></CardContent></Card>
      </div>

      <div className="space-y-3">
        {inspections.length === 0 ? (
          <Card className="p-12 text-center"><Truck className="w-12 h-12 text-slate-300 mx-auto mb-4" /><h3 className="font-semibold mb-2">No receiving inspections</h3><Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> Record First Inspection</Button></Card>
        ) : inspections.map(insp => (
          <Card key={insp.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge className={cn("text-xs", STATUS_CONFIG[insp.status]?.color)}>{STATUS_CONFIG[insp.status]?.label}</Badge>
                  {!insp.temperature_acceptable && <Badge className="bg-rose-100 text-rose-700 text-xs">Temp Fail</Badge>}
                  {insp.pest_evidence && <Badge className="bg-rose-100 text-rose-700 text-xs">Pest Evidence</Badge>}
                </div>
                <h3 className="font-semibold">{insp.material_name}</h3>
                <p className="text-sm text-slate-500">{insp.supplier_name}{insp.lot_number ? ` — Lot: ${insp.lot_number}` : ""}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  {insp.quantity_received && <span>{insp.quantity_received} {insp.unit}</span>}
                  {insp.temperature_check != null && <span>Temp: {insp.temperature_check}{insp.temperature_unit || "°F"}</span>}
                  {insp.received_date && <span>{format(parseISO(insp.received_date), "MMM d, yyyy h:mm a")}</span>}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(insp)}><Pencil className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Receiving Inspection</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Supplier Name *</Label><Input value={form.supplier_name || ""} onChange={e => setForm(p => ({ ...p, supplier_name: e.target.value }))} /></div>
            <div><Label>Material Name *</Label><Input value={form.material_name || ""} onChange={e => setForm(p => ({ ...p, material_name: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Lot Number</Label><Input value={form.lot_number || ""} onChange={e => setForm(p => ({ ...p, lot_number: e.target.value }))} /></div>
              <div><Label>Qty Received</Label><Input type="number" value={form.quantity_received || ""} onChange={e => setForm(p => ({ ...p, quantity_received: parseFloat(e.target.value) || null }))} /></div>
              <div><Label>PO Number</Label><Input value={form.po_number || ""} onChange={e => setForm(p => ({ ...p, po_number: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Temperature</Label><Input type="number" step="0.1" value={form.temperature_check ?? ""} onChange={e => setForm(p => ({ ...p, temperature_check: parseFloat(e.target.value) || null }))} placeholder="°F" /></div>
              <div><Label>Status</Label><Select value={form.status || "pending"} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Carrier</Label><Input value={form.carrier_name || ""} onChange={e => setForm(p => ({ ...p, carrier_name: e.target.value }))} /></div>
              <div><Label>Seal Number</Label><Input value={form.seal_number || ""} onChange={e => setForm(p => ({ ...p, seal_number: e.target.value }))} /></div>
            </div>
            <div className="space-y-2 border-t pt-3">
              {[["seal_intact", "Seal Intact"], ["temperature_acceptable", "Temperature Acceptable"], ["packaging_intact", "Packaging Intact"], ["coa_received", "COA Received"]].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between"><Label className="text-sm">{label}</Label><Switch checked={form[key] ?? false} onCheckedChange={v => setForm(p => ({ ...p, [key]: v }))} /></div>
              ))}
              {[["pest_evidence", "Pest Evidence Found"], ["foreign_material_found", "Foreign Material Found"]].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between"><Label className="text-sm text-rose-600">{label}</Label><Switch checked={form[key] ?? false} onCheckedChange={v => setForm(p => ({ ...p, [key]: v }))} /></div>
              ))}
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}