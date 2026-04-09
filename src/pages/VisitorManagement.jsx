// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VisitorLogRepo } from "@/lib/adapters/database";
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
import { Plus, Users, Loader2, Search, LogIn, LogOut, Clock } from "lucide-react";
import { format, parseISO, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function VisitorManagement() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const { organizationId: orgId, isLoading: orgLoading } = useOrganization();
  const queryClient = useQueryClient();

  const { data: visitors = [], isLoading } = useQuery({
    queryKey: ["visitor_logs", orgId],
    queryFn: () => VisitorLogRepo.filter({ organization_id: orgId }, "-sign_in_time"),
    enabled: !!orgId, staleTime: 30000
  });

  const mutation = useMutation({
    mutationFn: data => editing?.id ? VisitorLogRepo.update(editing.id, data) : VisitorLogRepo.create({ ...data, organization_id: orgId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["visitor_logs"] }); setFormOpen(false); toast.success(editing ? "Updated" : "Visitor signed in"); }
  });

  const openForm = (visitor = null) => {
    setEditing(visitor);
    setForm(visitor || { visitor_type: "visitor", sign_in_time: new Date().toISOString(), gmp_training_acknowledged: false, allergen_disclosure_acknowledged: false, ppe_provided: false, escort_required: true, photo_id_verified: false, status: "signed_in" });
    setFormOpen(true);
  };

  const signOut = (visitor) => {
    VisitorLogRepo.update(visitor.id, { sign_out_time: new Date().toISOString(), status: "signed_out" }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["visitor_logs"] });
      toast.success(`${visitor.visitor_name} signed out`);
    });
  };

  const currentlyIn = visitors.filter(v => v.status === "signed_in");
  const todayVisitors = visitors.filter(v => v.sign_in_time && isToday(parseISO(v.sign_in_time)));
  const filtered = visitors.filter(v => !searchQuery || v.visitor_name?.toLowerCase().includes(searchQuery.toLowerCase()) || v.company?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (orgLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 max-w-7xl mx-auto py-4 sm:py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2"><Users className="w-6 h-6 text-violet-500" /> Visitor & Contractor Log</h1><p className="text-slate-500 text-sm mt-1">Sign-in/out, GMP acknowledgment, and access tracking</p></div>
        <Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> Sign In Visitor</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className={currentlyIn.length > 0 ? "border-blue-200 bg-blue-50/50" : ""}><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><LogIn className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{currentlyIn.length}</p><p className="text-xs text-slate-500">Currently In</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-emerald-100 rounded-lg"><Clock className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{todayVisitors.length}</p><p className="text-xs text-slate-500">Today</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-slate-100 rounded-lg"><Users className="w-5 h-5 text-slate-600" /></div><div><p className="text-2xl font-bold">{visitors.length}</p><p className="text-xs text-slate-500">Total</p></div></CardContent></Card>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search visitors..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" /></div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center"><Users className="w-12 h-12 text-slate-300 mx-auto mb-4" /><h3 className="font-semibold mb-2">No visitor records</h3><Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> Sign In First Visitor</Button></Card>
        ) : filtered.map(v => (
          <Card key={v.id} className={cn("p-4", v.status === "signed_in" && "border-blue-200 bg-blue-50/30")}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={v.status === "signed_in" ? "bg-blue-100 text-blue-700" : v.status === "signed_out" ? "bg-slate-100 text-slate-600" : "bg-rose-100 text-rose-700"}>{v.status === "signed_in" ? "On Site" : v.status === "signed_out" ? "Signed Out" : "Denied"}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{v.visitor_type?.replace(/_/g, " ")}</Badge>
                  {v.gmp_training_acknowledged && <Badge className="bg-emerald-100 text-emerald-700 text-xs">GMP ✓</Badge>}
                </div>
                <h3 className="font-semibold">{v.visitor_name}{v.company ? ` — ${v.company}` : ""}</h3>
                <p className="text-sm text-slate-500">{v.purpose}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  {v.host_name && <span>Host: {v.host_name}</span>}
                  {v.sign_in_time && <span>In: {format(parseISO(v.sign_in_time), "MMM d h:mm a")}</span>}
                  {v.sign_out_time && <span>Out: {format(parseISO(v.sign_out_time), "h:mm a")}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                {v.status === "signed_in" && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => signOut(v)}><LogOut className="w-3 h-3 mr-1" /> Sign Out</Button>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Sign In"} Visitor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Visitor Name *</Label><Input value={form.visitor_name || ""} onChange={e => setForm(p => ({ ...p, visitor_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Company</Label><Input value={form.company || ""} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} /></div>
              <div><Label>Type</Label><Select value={form.visitor_type || "visitor"} onValueChange={v => setForm(p => ({ ...p, visitor_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="visitor">Visitor</SelectItem><SelectItem value="contractor">Contractor</SelectItem><SelectItem value="auditor">Auditor</SelectItem><SelectItem value="vendor">Vendor</SelectItem><SelectItem value="government_inspector">Gov Inspector</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Purpose *</Label><Input value={form.purpose || ""} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Host Name</Label><Input value={form.host_name || ""} onChange={e => setForm(p => ({ ...p, host_name: e.target.value }))} /></div>
              <div><Label>Badge #</Label><Input value={form.badge_number || ""} onChange={e => setForm(p => ({ ...p, badge_number: e.target.value }))} /></div>
            </div>
            <div className="space-y-2 border-t pt-3">
              {[["gmp_training_acknowledged", "GMP Training Acknowledged"], ["allergen_disclosure_acknowledged", "Allergen Disclosure Acknowledged"], ["photo_id_verified", "Photo ID Verified"], ["ppe_provided", "PPE Provided"], ["escort_required", "Escort Required"]].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between"><Label className="text-sm">{label}</Label><Switch checked={form[key] ?? false} onCheckedChange={v => setForm(p => ({ ...p, [key]: v }))} /></div>
              ))}
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editing ? "Update" : "Sign In"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}