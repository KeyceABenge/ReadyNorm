// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassBrittleItemRepo, GlassBreakageIncidentRepo } from "@/lib/adapters/database";
import useOrganization from "@/components/auth/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2, Pencil, AlertTriangle, CheckCircle2, GlassWater } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function GlassBrittleProgram() {
  const [activeTab, setActiveTab] = useState("register");
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [incidentFormOpen, setIncidentFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingIncident, setEditingIncident] = useState(null);
  const [itemForm, setItemForm] = useState({});
  const [incidentForm, setIncidentForm] = useState({});

  const { organizationId: orgId, isLoading: orgLoading } = useOrganization();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading: itemsLoading } = useQuery({ queryKey: ["glass_items", orgId], queryFn: () => GlassBrittleItemRepo.filter({ organization_id: orgId }), enabled: !!orgId, staleTime: 60000 });
  const { data: incidents = [] } = useQuery({ queryKey: ["glass_incidents", orgId], queryFn: () => GlassBreakageIncidentRepo.filter({ organization_id: orgId }, "-break_date"), enabled: !!orgId, staleTime: 60000 });

  const itemMutation = useMutation({
    mutationFn: data => {
      const payload = {
        ...data,
        name: data.item_name || data.name,
        item_name: data.item_name || data.name,
        inspection_frequency: data.audit_frequency || data.inspection_frequency,
        audit_frequency: data.audit_frequency || data.inspection_frequency,
        is_active: data.status === "active" ? true : data.status === "inactive" ? false : data.is_active ?? true,
        status: data.status || (data.is_active === false ? "inactive" : "active"),
      };
      return editingItem?.id ? GlassBrittleItemRepo.update(editingItem.id, payload) : GlassBrittleItemRepo.create({ ...payload, organization_id: orgId });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["glass_items"] }); setItemFormOpen(false); toast.success("Item saved"); }
  });

  const incidentMutation = useMutation({
    mutationFn: data => {
      const payload = {
        ...data,
        break_date: data.incident_date || data.break_date || new Date().toISOString(),
        incident_date: data.incident_date || data.break_date,
        cleanup_completed: data.cleanup_verified ?? data.cleanup_completed ?? false,
        cleanup_verified: data.cleanup_verified ?? data.cleanup_completed ?? false,
        verification_done: data.all_pieces_accounted ?? data.verification_done ?? false,
        all_pieces_accounted: data.all_pieces_accounted ?? data.verification_done ?? false,
      };
      return editingIncident?.id ? GlassBreakageIncidentRepo.update(editingIncident.id, payload) : GlassBreakageIncidentRepo.create({ ...payload, organization_id: orgId });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["glass_incidents"] }); setIncidentFormOpen(false); toast.success("Incident saved"); }
  });

  const overdue = items.filter(i => (i.status === "active" || i.is_active) && (i.next_audit_due || i.next_inspection_date) && isPast(parseISO(i.next_audit_due || i.next_inspection_date)));
  const openIncidents = incidents.filter(i => i.status !== "closed");

  if (orgLoading || itemsLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 max-w-7xl mx-auto py-4 sm:py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2"><GlassWater className="w-6 h-6 text-sky-500" /> Glass & Brittle Plastics</h1><p className="text-slate-500 text-sm mt-1">Register, audit, and track breakage incidents</p></div>
        <div className="flex gap-2">
          <Button onClick={() => { setEditingItem(null); setItemForm({ item_type: "glass", condition: "good", audit_frequency: "monthly", status: "active" }); setItemFormOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Add Item</Button>
          <Button variant="outline" onClick={() => { setEditingIncident(null); setIncidentForm({ incident_date: new Date().toISOString(), status: "open" }); setIncidentFormOpen(true); }}>Report Breakage</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-sky-100 rounded-lg"><GlassWater className="w-5 h-5 text-sky-600" /></div><div><p className="text-2xl font-bold">{items.filter(i => i.status === "active").length}</p><p className="text-xs text-slate-500">Active Items</p></div></CardContent></Card>
        <Card className={overdue.length > 0 ? "border-amber-200" : ""}><CardContent className="p-4 flex items-center gap-3"><div className={cn("p-2 rounded-lg", overdue.length > 0 ? "bg-amber-100" : "bg-slate-100")}><AlertTriangle className={cn("w-5 h-5", overdue.length > 0 ? "text-amber-600" : "text-slate-400")} /></div><div><p className="text-2xl font-bold">{overdue.length}</p><p className="text-xs text-slate-500">Audit Overdue</p></div></CardContent></Card>
        <Card className={openIncidents.length > 0 ? "border-rose-200" : ""}><CardContent className="p-4 flex items-center gap-3"><div className={cn("p-2 rounded-lg", openIncidents.length > 0 ? "bg-rose-100" : "bg-emerald-100")}>{openIncidents.length > 0 ? <AlertTriangle className="w-5 h-5 text-rose-600" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}</div><div><p className="text-2xl font-bold">{openIncidents.length}</p><p className="text-xs text-slate-500">Open Incidents</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-slate-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-slate-500" /></div><div><p className="text-2xl font-bold">{incidents.length}</p><p className="text-xs text-slate-500">Total Incidents</p></div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList><TabsTrigger value="register">Register</TabsTrigger><TabsTrigger value="incidents">Incidents ({incidents.length})</TabsTrigger></TabsList>
        <TabsContent value="register" className="space-y-3 mt-4">
          {items.map(item => (
            <Card key={item.id} className={cn("p-4", item.next_audit_due && isPast(parseISO(item.next_audit_due)) && "border-amber-200 bg-amber-50/30")}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1"><Badge variant="outline" className="text-xs capitalize">{item.item_type}</Badge><Badge className={cn("text-xs", item.condition === "good" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{item.condition}</Badge></div>
                  <h3 className="font-semibold">{item.item_name || item.name}</h3>
                  <p className="text-xs text-slate-500">{item.location}</p>
                  {(item.next_audit_due || item.next_inspection_date) && <p className={cn("text-xs mt-1", isPast(parseISO(item.next_audit_due || item.next_inspection_date)) ? "text-rose-600 font-medium" : "text-slate-400")}>Audit due: {format(parseISO(item.next_audit_due || item.next_inspection_date), "MMM d, yyyy")}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingItem(item); setItemForm(item); setItemFormOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
              </div>
            </Card>
          ))}
          {items.length === 0 && <Card className="p-12 text-center"><h3 className="font-semibold mb-2">No items registered</h3><Button onClick={() => { setEditingItem(null); setItemForm({ item_type: "glass", condition: "good", audit_frequency: "monthly", status: "active" }); setItemFormOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Add First Item</Button></Card>}
        </TabsContent>
        <TabsContent value="incidents" className="space-y-3 mt-4">
          {incidents.map(inc => (
            <Card key={inc.id} className={cn("p-4", inc.status !== "closed" && "border-rose-200 bg-rose-50/30")}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1"><Badge className={inc.status === "closed" ? "bg-slate-100 text-slate-600" : "bg-rose-100 text-rose-700"}>{inc.status}</Badge>{inc.product_affected && <Badge className="bg-rose-600 text-white text-xs">Product Affected</Badge>}</div>
                  <h3 className="font-semibold">{inc.item_name || inc.glass_item_type || "Unknown item"}</h3>
                  <p className="text-sm text-slate-500">{inc.description}</p>
                  <p className="text-xs text-slate-400 mt-1">{inc.location} — {(inc.incident_date || inc.break_date) && format(parseISO(inc.incident_date || inc.break_date), "MMM d, yyyy")}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingIncident(inc); setIncidentForm(inc); setIncidentFormOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
              </div>
            </Card>
          ))}
          {incidents.length === 0 && <Card className="p-12 text-center"><h3 className="font-semibold mb-2">No breakage incidents</h3></Card>}
        </TabsContent>
      </Tabs>

      {/* Item Modal */}
      <Dialog open={itemFormOpen} onOpenChange={setItemFormOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editingItem ? "Edit" : "Add"} Item</DialogTitle><DialogDescription className="sr-only">Glass or brittle plastic item form</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Item Name *</Label><Input value={itemForm.item_name || ""} onChange={e => setItemForm(p => ({ ...p, item_name: e.target.value }))} /></div>
            <div><Label>Location *</Label><Input value={itemForm.location || ""} onChange={e => setItemForm(p => ({ ...p, location: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><Select value={itemForm.item_type || "glass"} onValueChange={v => setItemForm(p => ({ ...p, item_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="glass">Glass</SelectItem><SelectItem value="hard_plastic">Hard Plastic</SelectItem><SelectItem value="ceramic">Ceramic</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
              <div><Label>Audit Frequency</Label><Select value={itemForm.audit_frequency || "monthly"} onValueChange={v => setItemForm(p => ({ ...p, audit_frequency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Notes</Label><Textarea value={itemForm.notes || ""} onChange={e => setItemForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setItemFormOpen(false)}>Cancel</Button><Button onClick={() => itemMutation.mutate(itemForm)} disabled={itemMutation.isPending}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Incident Modal */}
      <Dialog open={incidentFormOpen} onOpenChange={setIncidentFormOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editingIncident ? "Edit" : "Report"} Breakage Incident</DialogTitle><DialogDescription className="sr-only">Breakage incident form</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Location *</Label><Input value={incidentForm.location || ""} onChange={e => setIncidentForm(p => ({ ...p, location: e.target.value }))} /></div>
            <div><Label>Description *</Label><Textarea value={incidentForm.description || ""} onChange={e => setIncidentForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="flex items-center justify-between"><Label>Product Affected?</Label><Switch checked={incidentForm.product_affected || false} onCheckedChange={v => setIncidentForm(p => ({ ...p, product_affected: v }))} /></div>
            <div className="flex items-center justify-between"><Label>All Pieces Accounted?</Label><Switch checked={incidentForm.all_pieces_accounted || false} onCheckedChange={v => setIncidentForm(p => ({ ...p, all_pieces_accounted: v }))} /></div>
            <div className="flex items-center justify-between"><Label>Cleanup Verified?</Label><Switch checked={incidentForm.cleanup_verified || false} onCheckedChange={v => setIncidentForm(p => ({ ...p, cleanup_verified: v }))} /></div>
            <div><Label>Status</Label><Select value={incidentForm.status || "open"} onValueChange={v => setIncidentForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div>
            <div><Label>Corrective Action</Label><Textarea value={incidentForm.corrective_action || ""} onChange={e => setIncidentForm(p => ({ ...p, corrective_action: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setIncidentFormOpen(false)}>Cancel</Button><Button onClick={() => incidentMutation.mutate(incidentForm)} disabled={incidentMutation.isPending}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}