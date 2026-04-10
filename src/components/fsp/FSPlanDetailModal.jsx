import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, History, CheckCircle2, GitBranch, AlertTriangle, Shield } from "lucide-react";
import { FoodSafetyPlanRepo, ProcessStepRepo } from "@/lib/adapters/database";

const STATUS_CONFIG = { draft: "Draft", under_review: "Under Review", approved: "Approved", active: "Active", superseded: "Superseded", archived: "Archived" };

export default function FSPlanDetailModal({ open, onOpenChange, plan, processSteps, hazards, controls, user, employees, areas, organizationId, onRefresh }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStep, setNewStep] = useState({ step_name: "", category: "processing", description: "" });

  const addLog = (action, details) => [...(plan.activity_log || []), { timestamp: new Date().toISOString(), action, user_email: user?.email, user_name: user?.full_name, details }];

  const updateStatus = async (newStatus) => {
    setIsUpdating(true);
    try {
      const updates = { status: newStatus, activity_log: addLog("status_change", `Status changed to ${STATUS_CONFIG[newStatus]}`) };
      if (newStatus === "active" && !plan.effective_date) updates.effective_date = format(new Date(), "yyyy-MM-dd");
      if (newStatus === "approved") {
        updates.approval_history = [...(plan.approval_history || []), { version: plan.version, approved_by: user?.full_name, approved_at: new Date().toISOString() }];
      }
      await FoodSafetyPlanRepo.update(plan.id, updates);
      toast.success("Status updated"); onRefresh();
    } catch (e) { toast.error("Failed to update"); }
    setIsUpdating(false);
  };

  const addProcessStep = async () => {
    if (!newStep.step_name) { toast.error("Enter step name"); return; }
    try {
      const stepNumber = processSteps.length + 1;
      await ProcessStepRepo.create({
        organization_id: organizationId, plan_id: plan.id, step_number: stepNumber,
        step_name: newStep.step_name, category: newStep.category, description: newStep.description, status: "active"
      });
      toast.success("Step added"); setNewStep({ step_name: "", category: "processing", description: "" }); onRefresh();
    } catch (e) { toast.error("Failed to add step"); }
  };

  const significantHazards = hazards.filter(h => h.is_significant);
  const activeControls = controls.filter(c => c.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-mono text-slate-400 mb-1">{plan.plan_number}</p>
              <DialogTitle className="text-lg">{plan.title}</DialogTitle>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-emerald-100 text-emerald-700">{plan.plan_type?.toUpperCase()}</Badge>
              <Badge variant="outline">v{plan.version}</Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="process">Process Steps ({processSteps.length})</TabsTrigger>
            <TabsTrigger value="hazards">Hazards ({significantHazards.length})</TabsTrigger>
            <TabsTrigger value="controls">Controls ({activeControls.length})</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Status</p><Badge className={plan.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>{STATUS_CONFIG[plan.status]}</Badge></div>
              <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Product Category</p><p className="text-sm font-medium">{plan.product_category || "—"}</p></div>
              <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Team Leader</p><p className="text-sm font-medium">{plan.team_leader_name || "Not assigned"}</p></div>
              <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Effective Date</p><p className="text-sm font-medium">{plan.effective_date ? format(new Date(plan.effective_date), "MMM d, yyyy") : "—"}</p></div>
            </div>
            {plan.product_description && <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Product Description</p><p className="text-sm">{plan.product_description}</p></div>}
            {plan.scope && <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Scope</p><p className="text-sm">{plan.scope}</p></div>}

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center"><GitBranch className="w-5 h-5 text-blue-500 mx-auto mb-1" /><p className="text-2xl font-bold text-blue-700">{processSteps.length}</p><p className="text-xs text-blue-600">Process Steps</p></div>
              <div className="p-4 bg-amber-50 rounded-lg text-center"><AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" /><p className="text-2xl font-bold text-amber-700">{significantHazards.length}</p><p className="text-xs text-amber-600">Significant Hazards</p></div>
              <div className="p-4 bg-purple-50 rounded-lg text-center"><Shield className="w-5 h-5 text-purple-500 mx-auto mb-1" /><p className="text-2xl font-bold text-purple-700">{activeControls.length}</p><p className="text-xs text-purple-600">Preventive Controls</p></div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-slate-700 mb-3">Actions</p>
              <div className="flex flex-wrap gap-2">
                {plan.status === "draft" && <Button size="sm" variant="outline" onClick={() => updateStatus("under_review")}>Submit for Review</Button>}
                {plan.status === "under_review" && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus("approved")}><CheckCircle2 className="w-4 h-4 mr-1" />Approve</Button>}
                {plan.status === "approved" && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus("active")}>Make Active</Button>}
                {plan.status === "active" && <Button size="sm" variant="outline" onClick={() => updateStatus("under_review")}>Revise Plan</Button>}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="process" className="space-y-4 mt-4">
            <div className="p-3 bg-emerald-50 rounded-lg space-y-3">
              <p className="text-sm font-medium text-emerald-700">Add Process Step</p>
              <div className="grid grid-cols-3 gap-3">
                <Input placeholder="Step name" value={newStep.step_name} onChange={(e) => setNewStep(prev => ({ ...prev, step_name: e.target.value }))} />
                <Select value={newStep.category} onValueChange={(v) => setNewStep(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receiving">Receiving</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                    <SelectItem value="preparation">Preparation</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="packaging">Packaging</SelectItem>
                    <SelectItem value="distribution">Distribution</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addProcessStep} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" />Add</Button>
              </div>
            </div>
            <div className="space-y-2">
              {processSteps.sort((a, b) => a.step_number - b.step_number).map(step => (
                <div key={step.id} className="p-3 bg-white/80 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">{step.step_number}</span>
                        <Badge variant="outline" className="capitalize">{step.category}</Badge>
                        {step.is_ccp && <Badge className="bg-rose-100 text-rose-700">CCP</Badge>}
                        {step.is_preventive_control && <Badge className="bg-purple-100 text-purple-700">PC</Badge>}
                      </div>
                      <p className="text-sm font-medium text-slate-800">{step.step_name}</p>
                      {step.description && <p className="text-xs text-slate-500">{step.description}</p>}
                    </div>
                    <span className="text-xs text-slate-400">{hazards.filter(h => h.process_step_id === step.id).length} hazards</span>
                  </div>
                </div>
              ))}
              {processSteps.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No process steps defined</p>}
            </div>
          </TabsContent>

          <TabsContent value="hazards" className="mt-4">
            <div className="space-y-2">
              {significantHazards.map(h => (
                <div key={h.id} className="p-3 bg-white/80 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={h.hazard_type === "biological" ? "bg-rose-100 text-rose-700" : h.hazard_type === "chemical" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}>{h.hazard_type}</Badge>
                        <span className="text-xs text-slate-500">L:{h.likelihood} × S:{h.severity} = {h.risk_score}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-800">{h.hazard_name}</p>
                      <p className="text-xs text-slate-500">{h.step_name}</p>
                    </div>
                    {h.linked_preventive_control_id ? <Badge className="bg-emerald-100 text-emerald-700">Controlled</Badge> : <Badge className="bg-rose-100 text-rose-700">Needs Control</Badge>}
                  </div>
                </div>
              ))}
              {significantHazards.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No significant hazards</p>}
            </div>
          </TabsContent>

          <TabsContent value="controls" className="mt-4">
            <div className="space-y-2">
              {activeControls.map(c => (
                <div key={c.id} className="p-3 bg-white/80 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-400">{c.control_number}</span>
                        <Badge className={c.control_type === "ccp" ? "bg-rose-100 text-rose-700" : c.control_type === "process" ? "bg-blue-100 text-blue-700" : c.control_type === "sanitation" ? "bg-emerald-100 text-emerald-700" : "bg-purple-100 text-purple-700"}>{c.control_type}</Badge>
                      </div>
                      <p className="text-sm font-medium text-slate-800">{c.title}</p>
                      <p className="text-xs text-slate-500">{(c.hazards_controlled || []).length} hazards controlled</p>
                    </div>
                    <Badge className={c.validation_status === "validated" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>{c.validation_status}</Badge>
                  </div>
                </div>
              ))}
              {activeControls.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No preventive controls</p>}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-700">Revision History</h4>
              {(plan.revision_history || []).slice().reverse().map((r, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline">v{r.version}</Badge>
                    <span className="text-xs text-slate-500">{format(new Date(r.date), "MMM d, yyyy")}</span>
                  </div>
                  <p className="text-sm text-slate-700">{r.description}</p>
                  <p className="text-xs text-slate-400">{r.changed_by}</p>
                </div>
              ))}
              <h4 className="text-sm font-medium text-slate-700 mt-4">Activity Log</h4>
              {(plan.activity_log || []).slice().reverse().slice(0, 10).map((log, idx) => (
                <div key={idx} className="flex gap-3 p-2 bg-slate-50 rounded-lg">
                  <History className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div><p className="text-sm text-slate-700">{log.details}</p><p className="text-xs text-slate-400">{log.user_name} • {format(new Date(log.timestamp), "MMM d, yyyy h:mm a")}</p></div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}