// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChangeControlRepo } from "@/lib/adapters/database";
import useOrganization from "@/components/auth/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, GitBranch, Loader2, Search, Pencil, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_CONFIG = { draft: "bg-slate-100 text-slate-600", submitted: "bg-blue-100 text-blue-700", under_review: "bg-amber-100 text-amber-700", approved: "bg-emerald-100 text-emerald-700", in_progress: "bg-purple-100 text-purple-700", completed: "bg-emerald-100 text-emerald-700", rejected: "bg-rose-100 text-rose-700", cancelled: "bg-slate-100 text-slate-500" };

export default function ChangeControlProgram() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const { organizationId: orgId, isLoading: orgLoading } = useOrganization();
  const queryClient = useQueryClient();

  const { data: changes = [], isLoading } = useQuery({
    queryKey: ["change_controls", orgId],
    queryFn: () => ChangeControlRepo.filter({ organization_id: orgId }, "-created_date"),
    enabled: !!orgId, staleTime: 60000
  });

  const mutation = useMutation({
    mutationFn: data => editing?.id ? ChangeControlRepo.update(editing.id, data) : ChangeControlRepo.create({ ...data, organization_id: orgId, requested_date: format(new Date(), "yyyy-MM-dd") }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["change_controls"] }); setFormOpen(false); toast.success(editing ? "Updated" : "Change request created"); }
  });

  const openForm = (change = null) => { setEditing(change); setForm(change || { change_type: "process", priority: "medium", status: "draft" }); setFormOpen(true); };
  const active = changes.filter(c => !["completed", "closed", "rejected", "cancelled"].includes(c.status));
  const filtered = changes.filter(c => !searchQuery || c.title?.toLowerCase().includes(searchQuery.toLowerCase()) || c.change_number?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (orgLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 max-w-7xl mx-auto py-4 sm:py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2"><GitBranch className="w-6 h-6 text-purple-500" /> Change Control</h1><p className="text-slate-500 text-sm mt-1">Equipment, process, formulation, and facility changes</p></div>
        <Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> New Change Request</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><GitBranch className="w-5 h-5 text-purple-600" /></div><div><p className="text-2xl font-bold">{active.length}</p><p className="text-xs text-slate-500">Active Changes</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-amber-100 rounded-lg"><Clock className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{changes.filter(c => c.status === "under_review").length}</p><p className="text-xs text-slate-500">Under Review</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-emerald-100 rounded-lg"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{changes.filter(c => c.status === "completed").length}</p><p className="text-xs text-slate-500">Completed</p></div></CardContent></Card>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search changes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" /></div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center"><GitBranch className="w-12 h-12 text-slate-300 mx-auto mb-4" /><h3 className="font-semibold mb-2">No change requests</h3><Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> Create First Request</Button></Card>
        ) : filtered.map(c => (
          <Card key={c.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1"><Badge className={cn("text-xs", STATUS_CONFIG[c.status])}>{c.status?.replace(/_/g, " ")}</Badge><Badge variant="outline" className="text-xs capitalize">{c.change_type?.replace(/_/g, " ")}</Badge>{c.priority === "critical" && <Badge className="bg-rose-600 text-white text-xs">Critical</Badge>}</div>
                <h3 className="font-semibold">{c.title}</h3>
                <p className="text-sm text-slate-500 line-clamp-1">{c.description}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  {c.change_number && <span>{c.change_number}</span>}
                  {c.requested_by_name && <span>By: {c.requested_by_name}</span>}
                  {c.requested_date && <span>{c.requested_date}</span>}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(c)}><Pencil className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Change Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title || ""} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><Select value={form.change_type || "process"} onValueChange={v => setForm(p => ({ ...p, change_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="equipment">Equipment</SelectItem><SelectItem value="process">Process</SelectItem><SelectItem value="formulation">Formulation</SelectItem><SelectItem value="facility">Facility</SelectItem><SelectItem value="supplier">Supplier</SelectItem><SelectItem value="packaging">Packaging</SelectItem><SelectItem value="documentation">Documentation</SelectItem></SelectContent></Select></div>
              <div><Label>Priority</Label><Select value={form.priority || "medium"} onValueChange={v => setForm(p => ({ ...p, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Description *</Label><Textarea value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
            <div><Label>Justification</Label><Textarea value={form.justification || ""} onChange={e => setForm(p => ({ ...p, justification: e.target.value }))} rows={2} /></div>
            <div><Label>Status</Label><Select value={form.status || "draft"} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.keys(STATUS_CONFIG).map(k => <SelectItem key={k} value={k}>{k.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Implementation Date</Label><Input type="date" value={form.implementation_date || ""} onChange={e => setForm(p => ({ ...p, implementation_date: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editing ? "Update" : "Create"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}