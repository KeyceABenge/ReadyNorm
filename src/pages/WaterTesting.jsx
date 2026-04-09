// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useOrganization from "@/components/auth/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Droplets, CheckCircle2, XCircle, Loader2, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function WaterTesting() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const { organizationId: orgId, isLoading: orgLoading } = useOrganization();
  const queryClient = useQueryClient();

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["water_tests", orgId],
    queryFn: () => WaterTestRepo.filter({ organization_id: orgId }, "-sample_date"),
    enabled: !!orgId, staleTime: 60000
  });

  const mutation = useMutation({
    mutationFn: data => editing?.id ? WaterTestRepo.update(editing.id, data) : WaterTestRepo.create({ ...data, organization_id: orgId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["water_tests"] }); setFormOpen(false); toast.success("Water test saved"); }
  });

  const openForm = (test = null) => { setEditing(test); setForm(test || { test_type: "chlorine", result_status: "pass", source: "municipal", frequency: "monthly", sample_date: new Date().toISOString() }); setFormOpen(true); };
  const failures = tests.filter(t => t.result_status === "fail");

  if (orgLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 max-w-7xl mx-auto py-4 sm:py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2"><Droplets className="w-6 h-6 text-blue-500" /> Water Testing</h1><p className="text-slate-500 text-sm mt-1">Potability, chlorine, coliform, and quality testing</p></div>
        <Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> Record Test</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Droplets className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{tests.length}</p><p className="text-xs text-slate-500">Total Tests</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-emerald-100 rounded-lg"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{tests.filter(t => t.result_status === "pass").length}</p><p className="text-xs text-slate-500">Passed</p></div></CardContent></Card>
        <Card className={failures.length > 0 ? "border-rose-200" : ""}><CardContent className="p-4 flex items-center gap-3"><div className={cn("p-2 rounded-lg", failures.length > 0 ? "bg-rose-100" : "bg-slate-100")}><XCircle className={cn("w-5 h-5", failures.length > 0 ? "text-rose-600" : "text-slate-400")} /></div><div><p className="text-2xl font-bold">{failures.length}</p><p className="text-xs text-slate-500">Failed</p></div></CardContent></Card>
      </div>

      <div className="space-y-3">
        {tests.length === 0 ? (
          <Card className="p-12 text-center"><Droplets className="w-12 h-12 text-slate-300 mx-auto mb-4" /><h3 className="font-semibold mb-2">No water tests recorded</h3><Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> Record First Test</Button></Card>
        ) : tests.map(test => (
          <Card key={test.id} className={cn("p-4", test.result_status === "fail" && "border-rose-200 bg-rose-50/30")}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={test.result_status === "pass" ? "bg-emerald-100 text-emerald-700" : test.result_status === "fail" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}>{test.result_status}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{test.test_type?.replace(/_/g, " ")}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{test.source?.replace(/_/g, " ")}</Badge>
                </div>
                <h3 className="font-semibold">{test.test_point_name}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  {test.result_value != null && <span>Result: {test.result_value} {test.result_unit}</span>}
                  {test.sample_date && <span>{format(parseISO(test.sample_date), "MMM d, yyyy")}</span>}
                  {test.tested_by_name && <span>By: {test.tested_by_name}</span>}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(test)}><Pencil className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Record"} Water Test</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Test Point Name *</Label><Input value={form.test_point_name || ""} onChange={e => setForm(p => ({ ...p, test_point_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Test Type</Label><Select value={form.test_type || "chlorine"} onValueChange={v => setForm(p => ({ ...p, test_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="potability">Potability</SelectItem><SelectItem value="chlorine">Chlorine</SelectItem><SelectItem value="coliform">Coliform</SelectItem><SelectItem value="e_coli">E. coli</SelectItem><SelectItem value="ph">pH</SelectItem><SelectItem value="temperature">Temperature</SelectItem><SelectItem value="hardness">Hardness</SelectItem></SelectContent></Select></div>
              <div><Label>Source</Label><Select value={form.source || "municipal"} onValueChange={v => setForm(p => ({ ...p, source: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="municipal">Municipal</SelectItem><SelectItem value="well">Well</SelectItem><SelectItem value="ice_machine">Ice Machine</SelectItem><SelectItem value="rinse_water">Rinse Water</SelectItem><SelectItem value="boiler">Boiler</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Result Value</Label><Input type="number" step="0.01" value={form.result_value ?? ""} onChange={e => setForm(p => ({ ...p, result_value: parseFloat(e.target.value) || null }))} /></div>
              <div><Label>Unit</Label><Input value={form.result_unit || ""} onChange={e => setForm(p => ({ ...p, result_unit: e.target.value }))} placeholder="ppm, CFU, etc." /></div>
              <div><Label>Result</Label><Select value={form.result_status || "pass"} onValueChange={v => setForm(p => ({ ...p, result_status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pass">Pass</SelectItem><SelectItem value="fail">Fail</SelectItem><SelectItem value="pending_lab">Pending Lab</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Location</Label><Input value={form.location || ""} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
            <div><Label>Tested By</Label><Input value={form.tested_by_name || ""} onChange={e => setForm(p => ({ ...p, tested_by_name: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}