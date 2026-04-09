// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HoldReleaseRepo } from "@/lib/adapters/database";
import useOrganization from "@/components/auth/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, AlertTriangle, CheckCircle2, Loader2, Search, Pencil, XCircle, ShieldAlert } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_CONFIG = { on_hold: { color: "bg-rose-100 text-rose-700", label: "On Hold" }, pending_review: { color: "bg-amber-100 text-amber-700", label: "Pending Review" }, released: { color: "bg-emerald-100 text-emerald-700", label: "Released" }, reworked: { color: "bg-blue-100 text-blue-700", label: "Reworked" }, destroyed: { color: "bg-slate-100 text-slate-600", label: "Destroyed" }, returned_to_supplier: { color: "bg-purple-100 text-purple-700", label: "Returned" } };

export default function HoldReleaseManagement() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { organizationId: orgId, isLoading: orgLoading } = useOrganization();
  const queryClient = useQueryClient();

  const { data: holds = [], isLoading } = useQuery({
    queryKey: ["hold_releases", orgId],
    queryFn: () => HoldReleaseRepo.filter({ organization_id: orgId }, "-created_date"),
    enabled: !!orgId, staleTime: 60000
  });

  const mutation = useMutation({
    mutationFn: data => editing?.id ? HoldReleaseRepo.update(editing.id, data) : HoldReleaseRepo.create({ ...data, organization_id: orgId, hold_placed_at: new Date().toISOString() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hold_releases"] }); setFormOpen(false); toast.success(editing ? "Updated" : "Hold created"); }
  });

  const openForm = (hold = null) => { setEditing(hold); setForm(hold || { status: "on_hold", hold_type: "quality_hold", priority: "medium", unit: "cases" }); setFormOpen(true); };

  const filtered = holds.filter(h => {
    const matchSearch = !searchQuery || h.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) || h.hold_number?.toLowerCase().includes(searchQuery.toLowerCase()) || h.lot_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || h.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeHolds = holds.filter(h => h.status === "on_hold" || h.status === "pending_review");
  const criticalHolds = holds.filter(h => h.priority === "critical" && (h.status === "on_hold" || h.status === "pending_review"));

  if (orgLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 max-w-7xl mx-auto py-4 sm:py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-rose-500" /> Hold & Release Management</h1>
          <p className="text-slate-500 text-sm mt-1">Product quarantine, disposition decisions, and release tracking</p>
        </div>
        <Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> Place Hold</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className={activeHolds.length > 0 ? "border-rose-200 bg-rose-50/50" : ""}><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-rose-100 rounded-lg"><Package className="w-5 h-5 text-rose-600" /></div><div><p className="text-2xl font-bold">{activeHolds.length}</p><p className="text-xs text-slate-500">Active Holds</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-amber-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{criticalHolds.length}</p><p className="text-xs text-slate-500">Critical</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-emerald-100 rounded-lg"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{holds.filter(h => h.status === "released").length}</p><p className="text-xs text-slate-500">Released</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-slate-100 rounded-lg"><XCircle className="w-5 h-5 text-slate-600" /></div><div><p className="text-2xl font-bold">{holds.filter(h => h.status === "destroyed").length}</p><p className="text-xs text-slate-500">Destroyed</p></div></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search holds..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem>{Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center"><Package className="w-12 h-12 text-slate-300 mx-auto mb-4" /><h3 className="font-semibold mb-2">No hold records</h3><Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> Place First Hold</Button></Card>
        ) : filtered.map(hold => (
          <Card key={hold.id} className={cn("p-4 hover:shadow-md transition-shadow", hold.priority === "critical" && hold.status === "on_hold" && "border-rose-300 bg-rose-50/30")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge className={cn("text-xs", STATUS_CONFIG[hold.status]?.color)}>{STATUS_CONFIG[hold.status]?.label}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{hold.hold_type?.replace(/_/g, " ")}</Badge>
                  {hold.priority === "critical" && <Badge className="bg-rose-600 text-white text-xs">Critical</Badge>}
                </div>
                <h3 className="font-semibold text-slate-900">{hold.product_name}</h3>
                <p className="text-sm text-slate-500 line-clamp-1">{hold.reason}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                  {hold.hold_number && <span>{hold.hold_number}</span>}
                  {hold.lot_number && <span>Lot: {hold.lot_number}</span>}
                  {hold.quantity && <span>{hold.quantity} {hold.unit}</span>}
                  {hold.created_date && <span>{format(parseISO(hold.created_date), "MMM d, yyyy")}</span>}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(hold)}><Pencil className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Hold" : "Place Hold"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Product Name *</Label><Input value={form.product_name || ""} onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Hold Type</Label><Select value={form.hold_type || "quality_hold"} onValueChange={v => setForm(p => ({ ...p, hold_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="quality_hold">Quality Hold</SelectItem><SelectItem value="safety_hold">Safety Hold</SelectItem><SelectItem value="regulatory_hold">Regulatory Hold</SelectItem><SelectItem value="customer_complaint">Customer Complaint</SelectItem><SelectItem value="receiving_reject">Receiving Reject</SelectItem><SelectItem value="process_deviation">Process Deviation</SelectItem></SelectContent></Select></div>
              <div><Label>Priority</Label><Select value={form.priority || "medium"} onValueChange={v => setForm(p => ({ ...p, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Reason *</Label><Textarea value={form.reason || ""} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Lot Number</Label><Input value={form.lot_number || ""} onChange={e => setForm(p => ({ ...p, lot_number: e.target.value }))} /></div>
              <div><Label>Quantity</Label><Input type="number" value={form.quantity || ""} onChange={e => setForm(p => ({ ...p, quantity: parseFloat(e.target.value) || null }))} /></div>
              <div><Label>Unit</Label><Select value={form.unit || "cases"} onValueChange={v => setForm(p => ({ ...p, unit: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="lbs">lbs</SelectItem><SelectItem value="kg">kg</SelectItem><SelectItem value="cases">Cases</SelectItem><SelectItem value="pallets">Pallets</SelectItem><SelectItem value="units">Units</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Location</Label><Input value={form.location || ""} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
            <div><Label>Status</Label><Select value={form.status || "on_hold"} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Investigation Notes</Label><Textarea value={form.investigation_notes || ""} onChange={e => setForm(p => ({ ...p, investigation_notes: e.target.value }))} rows={2} /></div>
            <div><Label>Disposition Notes</Label><Textarea value={form.disposition_notes || ""} onChange={e => setForm(p => ({ ...p, disposition_notes: e.target.value }))} rows={2} /></div>
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