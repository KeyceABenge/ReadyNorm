import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { Plus, Search, Shield, CheckCircle2, Clock } from "lucide-react";
import { PreventiveControlRepo } from "@/lib/adapters/database";

const CONTROL_TYPE_CONFIG = {
  process: { color: "bg-blue-100 text-blue-700", label: "Process Control" },
  sanitation: { color: "bg-emerald-100 text-emerald-700", label: "Sanitation Control" },
  allergen: { color: "bg-purple-100 text-purple-700", label: "Allergen Control" },
  supply_chain: { color: "bg-amber-100 text-amber-700", label: "Supply Chain Control" },
  ccp: { color: "bg-rose-100 text-rose-700", label: "Critical Control Point" }
};

const VALIDATION_CONFIG = {
  pending: { color: "bg-amber-100 text-amber-700", label: "Pending Validation" },
  validated: { color: "bg-emerald-100 text-emerald-700", label: "Validated" },
  revalidation_required: { color: "bg-rose-100 text-rose-700", label: "Revalidation Required" }
};

export default function PreventiveControlsView({ plans, processSteps, hazards, controls, organizationId, user, employees, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterValidation, setFilterValidation] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [newControl, setNewControl] = useState({
    plan_id: "", control_type: "process", title: "", description: "",
    process_step_id: "", monitoring_procedure: "", monitoring_frequency: "",
    corrective_action_procedure: "", owner_email: ""
  });

  const activePlans = plans.filter(p => ["active", "draft", "approved"].includes(p.status));
  const significantHazards = hazards.filter(h => h.is_significant && !h.linked_preventive_control_id);

  const filteredControls = controls.filter(c => {
    const matchSearch = c.title?.toLowerCase().includes(search.toLowerCase()) || c.control_number?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || c.control_type === filterType;
    const matchValidation = filterValidation === "all" || c.validation_status === filterValidation;
    return matchSearch && matchType && matchValidation;
  });

  const handleAddControl = async () => {
    if (!newControl.plan_id || !newControl.title) { toast.error("Fill required fields"); return; }
    try {
      const owner = employees.find(e => e.email === newControl.owner_email);
      const step = processSteps.find(s => s.id === newControl.process_step_id);
      const controlNumber = newControl.control_type === "ccp" 
        ? `CCP-${controls.filter(c => c.control_type === "ccp").length + 1}`
        : `PC-${controls.filter(c => c.control_type !== "ccp").length + 1}`;

      await PreventiveControlRepo.create({
        organization_id: organizationId,
        plan_id: newControl.plan_id,
        control_number: controlNumber,
        control_type: newControl.control_type,
        title: newControl.title,
        description: newControl.description,
        process_step_id: newControl.process_step_id,
        step_name: step?.step_name,
        monitoring_procedure: newControl.monitoring_procedure,
        monitoring_frequency: newControl.monitoring_frequency,
        corrective_action_procedure: newControl.corrective_action_procedure,
        owner_email: newControl.owner_email,
        owner_name: owner?.name,
        status: "draft",
        validation_status: "pending",
        next_verification: format(addDays(new Date(), 7), "yyyy-MM-dd")
      });
      toast.success("Control added"); setShowForm(false);
      setNewControl({ plan_id: "", control_type: "process", title: "", description: "", process_step_id: "", monitoring_procedure: "", monitoring_frequency: "", corrective_action_procedure: "", owner_email: "" });
      onRefresh();
    } catch (e) { toast.error("Failed to add"); }
  };

  const markValidated = async (control) => {
    try {
      await PreventiveControlRepo.update(control.id, {
        validation_status: "validated",
        validation_date: format(new Date(), "yyyy-MM-dd"),
        status: "active"
      });
      toast.success("Marked as validated"); onRefresh();
    } catch (e) { toast.error("Failed to update"); }
  };

  return (
    <div className="space-y-4">
      {significantHazards.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="py-3">
            <p className="text-sm text-amber-800"><strong>{significantHazards.length} significant hazard{significantHazards.length > 1 ? "s" : ""}</strong> without preventive controls assigned</p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search controls..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/60" />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40 bg-white/60"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(CONTROL_TYPE_CONFIG).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterValidation} onValueChange={setFilterValidation}>
              <SelectTrigger className="w-40 bg-white/60"><SelectValue placeholder="Validation" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(VALIDATION_CONFIG).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />Add Control
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-slate-500">{filteredControls.length} controls</p>

      <div className="grid gap-3">
        {filteredControls.length === 0 ? (
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="py-12 text-center"><Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-slate-500">No controls found</p></CardContent>
          </Card>
        ) : (
          filteredControls.map(c => (
            <Card key={c.id} className="bg-white/60 backdrop-blur-xl border-white/80">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-400">{c.control_number}</span>
                      <Badge className={CONTROL_TYPE_CONFIG[c.control_type]?.color}>{CONTROL_TYPE_CONFIG[c.control_type]?.label}</Badge>
                      <Badge className={VALIDATION_CONFIG[c.validation_status]?.color}>{VALIDATION_CONFIG[c.validation_status]?.label}</Badge>
                    </div>
                    <h3 className="text-sm font-medium text-slate-800">{c.title}</h3>
                    {c.step_name && <p className="text-xs text-slate-500">Step: {c.step_name}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      {c.owner_name && <span>Owner: {c.owner_name}</span>}
                      {c.monitoring_frequency && <span>Monitoring: {c.monitoring_frequency}</span>}
                      {c.next_verification && (
                        <span className={new Date(c.next_verification) < new Date() ? "text-amber-600 font-medium" : ""}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          Verify: {format(new Date(c.next_verification), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                  {c.validation_status === "pending" && (
                    <Button size="sm" variant="outline" onClick={() => markValidated(c)}>
                      <CheckCircle2 className="w-4 h-4 mr-1" />Validate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Preventive Control</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Food Safety Plan *</Label>
                <Select value={newControl.plan_id} onValueChange={(v) => setNewControl(prev => ({ ...prev, plan_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                  <SelectContent>{activePlans.map(p => (<SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Control Type</Label>
                <Select value={newControl.control_type} onValueChange={(v) => setNewControl(prev => ({ ...prev, control_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CONTROL_TYPE_CONFIG).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Control Title *</Label><Input value={newControl.title} onChange={(e) => setNewControl(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g., Thermal Processing Control" /></div>
            <div><Label>Description</Label><Textarea value={newControl.description} onChange={(e) => setNewControl(prev => ({ ...prev, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Process Step</Label>
                <Select value={newControl.process_step_id} onValueChange={(v) => setNewControl(prev => ({ ...prev, process_step_id: v }))} disabled={!newControl.plan_id}>
                  <SelectTrigger><SelectValue placeholder="Select step" /></SelectTrigger>
                  <SelectContent>{processSteps.filter(s => s.plan_id === newControl.plan_id).map(s => (<SelectItem key={s.id} value={s.id}>{s.step_number}. {s.step_name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Owner</Label>
                <Select value={newControl.owner_email} onValueChange={(v) => setNewControl(prev => ({ ...prev, owner_email: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{employees.map(e => (<SelectItem key={e.id} value={e.email}>{e.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Monitoring Procedure</Label><Textarea value={newControl.monitoring_procedure} onChange={(e) => setNewControl(prev => ({ ...prev, monitoring_procedure: e.target.value }))} placeholder="How this control is monitored" rows={2} /></div>
            <div><Label>Monitoring Frequency</Label><Input value={newControl.monitoring_frequency} onChange={(e) => setNewControl(prev => ({ ...prev, monitoring_frequency: e.target.value }))} placeholder="e.g., Continuous, Every batch, Daily" /></div>
            <div><Label>Corrective Action Procedure</Label><Textarea value={newControl.corrective_action_procedure} onChange={(e) => setNewControl(prev => ({ ...prev, corrective_action_procedure: e.target.value }))} placeholder="Steps when deviation occurs" rows={2} /></div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleAddControl} className="bg-emerald-600 hover:bg-emerald-700">Add Control</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}