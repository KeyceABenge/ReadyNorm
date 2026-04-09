// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ForeignMaterialIncidentRepo } from "@/lib/adapters/database";
import useOrganization from "@/components/auth/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Shield, Loader2, Pencil, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DETECTION_LABELS = { metal_detector: "Metal Detector", xray: "X-Ray", visual_inspection: "Visual", sieve_screen: "Sieve/Screen", magnet: "Magnet", filter: "Filter", customer_complaint: "Customer Complaint", other: "Other" };
const MATERIAL_LABELS = { metal: "Metal", plastic: "Plastic", glass: "Glass", wood: "Wood", stone: "Stone", bone: "Bone", rubber: "Rubber", insect: "Insect", hair: "Hair", fiber: "Fiber", other: "Other" };

export default function ForeignMaterialControl() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const { organizationId: orgId, isLoading: orgLoading } = useOrganization();
  const queryClient = useQueryClient();

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["foreign_material_incidents", orgId],
    queryFn: () => ForeignMaterialIncidentRepo.filter({ organization_id: orgId }, "-incident_date"),
    enabled: !!orgId, staleTime: 60000
  });

  const mutation = useMutation({
    mutationFn: data => editing?.id ? ForeignMaterialIncidentRepo.update(editing.id, data) : ForeignMaterialIncidentRepo.create({ ...data, organization_id: orgId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["foreign_material_incidents"] }); setFormOpen(false); toast.success(editing ? "Updated" : "Incident recorded"); }
  });

  const openForm = (inc = null) => { setEditing(inc); setForm(inc || { detection_method: "metal_detector", material_type: "metal", product_disposition: "on_hold", status: "open", incident_date: new Date().toISOString() }); setFormOpen(true); };
  const openIncidents = incidents.filter(i => i.status !== "closed");

  if (orgLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 max-w-7xl mx-auto py-4 sm:py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2"><Shield className="w-6 h-6 text-orange-500" /> Foreign Material Control</h1><p className="text-slate-500 text-sm mt-1">Metal detection rejects, foreign material incidents, and investigations</p></div>
        <Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> Report Incident</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><Shield className="w-5 h-5 text-orange-600" /></div><div><p className="text-2xl font-bold">{incidents.length}</p><p className="text-xs text-slate-500">Total Incidents</p></div></CardContent></Card>
        <Card className={openIncidents.length > 0 ? "border-rose-200" : ""}><CardContent className="p-4 flex items-center gap-3"><div className={cn("p-2 rounded-lg", openIncidents.length > 0 ? "bg-rose-100" : "bg-slate-100")}><AlertTriangle className={cn("w-5 h-5", openIncidents.length > 0 ? "text-rose-600" : "text-slate-400")} /></div><div><p className="text-2xl font-bold">{openIncidents.length}</p><p className="text-xs text-slate-500">Open</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-emerald-100 rounded-lg"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{incidents.filter(i => i.status === "closed").length}</p><p className="text-xs text-slate-500">Closed</p></div></CardContent></Card>
      </div>

      <div className="space-y-3">
        {incidents.length === 0 ? (
          <Card className="p-12 text-center"><Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" /><h3 className="font-semibold mb-2">No incidents recorded</h3><Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> Report First Incident</Button></Card>
        ) : incidents.map(inc => (
          <Card key={inc.id} className={cn("p-4", inc.status !== "closed" && "border-amber-200 bg-amber-50/30")}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={inc.status === "closed" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700"}>{inc.status}</Badge>
                  <Badge variant="outline" className="text-xs">{DETECTION_LABELS[inc.detection_method]}</Badge>
                  <Badge variant="outline" className="text-xs">{MATERIAL_LABELS[inc.material_type]}</Badge>
                  {inc.size_mm && <Badge variant="outline" className="text-xs">{inc.size_mm}mm</Badge>}
                </div>
                <h3 className="font-semibold">{inc.material_description || `${MATERIAL_LABELS[inc.material_type]} via ${DETECTION_LABELS[inc.detection_method]}`}</h3>
                {inc.product_name && <p className="text-sm text-slate-500">Product: {inc.product_name}{inc.lot_number ? ` (Lot: ${inc.lot_number})` : ""}</p>}
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  {inc.production_line_name && <span>{inc.production_line_name}</span>}
                  <span>{inc.incident_date && format(parseISO(inc.incident_date), "MMM d, yyyy")}</span>
                  {inc.reported_by_name && <span>By: {inc.reported_by_name}</span>}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(inc)}><Pencil className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Report"} Foreign Material Incident</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Detection Method</Label><Select value={form.detection_method || "metal_detector"} onValueChange={v => setForm(p => ({ ...p, detection_method: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(DETECTION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Material Type</Label><Select value={form.material_type || "metal"} onValueChange={v => setForm(p => ({ ...p, material_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(MATERIAL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.material_description || ""} onChange={e => setForm(p => ({ ...p, material_description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Size (mm)</Label><Input type="number" value={form.size_mm ?? ""} onChange={e => setForm(p => ({ ...p, size_mm: parseFloat(e.target.value) || null }))} /></div>
              <div><Label>Product</Label><Input value={form.product_name || ""} onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))} /></div>
              <div><Label>Lot Number</Label><Input value={form.lot_number || ""} onChange={e => setForm(p => ({ ...p, lot_number: e.target.value }))} /></div>
            </div>
            <div><Label>Disposition</Label><Select value={form.product_disposition || "on_hold"} onValueChange={v => setForm(p => ({ ...p, product_disposition: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="released">Released</SelectItem><SelectItem value="on_hold">On Hold</SelectItem><SelectItem value="reworked">Reworked</SelectItem><SelectItem value="destroyed">Destroyed</SelectItem></SelectContent></Select></div>
            <div><Label>Root Cause</Label><Textarea value={form.root_cause || ""} onChange={e => setForm(p => ({ ...p, root_cause: e.target.value }))} rows={2} /></div>
            <div><Label>Corrective Action</Label><Textarea value={form.corrective_action || ""} onChange={e => setForm(p => ({ ...p, corrective_action: e.target.value }))} rows={2} /></div>
            <div><Label>Status</Label><Select value={form.status || "open"} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editing ? "Update" : "Create"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}