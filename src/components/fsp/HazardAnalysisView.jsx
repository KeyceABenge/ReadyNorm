import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const HAZARD_TYPE_CONFIG = {
  biological: { color: "bg-rose-100 text-rose-700", label: "Biological" },
  chemical: { color: "bg-amber-100 text-amber-700", label: "Chemical" },
  physical: { color: "bg-blue-100 text-blue-700", label: "Physical" },
  allergen: { color: "bg-purple-100 text-purple-700", label: "Allergen" },
  radiological: { color: "bg-slate-100 text-slate-700", label: "Radiological" }
};

export default function HazardAnalysisView({ plans, processSteps, hazards, controls, organizationId, user, settings, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterSignificant, setFilterSignificant] = useState("all");
  const [selectedPlan, setSelectedPlan] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [newHazard, setNewHazard] = useState({
    plan_id: "", process_step_id: "", hazard_type: "biological", hazard_name: "",
    hazard_description: "", source: "", likelihood: 3, severity: 3, justification: "", existing_controls: ""
  });

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const activePlans = plans.filter(p => ["active", "draft", "approved"].includes(p.status));
  const stepsForPlan = processSteps.filter(s => newHazard.plan_id === "" || s.plan_id === newHazard.plan_id);

  const filteredHazards = hazards.filter(h => {
    const matchSearch = h.hazard_name?.toLowerCase().includes(search.toLowerCase()) || h.step_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || h.hazard_type === filterType;
    const matchSignificant = filterSignificant === "all" || (filterSignificant === "yes" ? h.is_significant : !h.is_significant);
    const matchPlan = selectedPlan === "all" || h.plan_id === selectedPlan;
    return matchSearch && matchType && matchSignificant && matchPlan;
  });

  const riskScore = newHazard.likelihood * newHazard.severity;
  const isSignificant = riskScore >= (settings?.significance_threshold || 9);

  const handleAddHazard = async () => {
    if (!newHazard.plan_id || !newHazard.process_step_id || !newHazard.hazard_name) {
      toast.error("Fill required fields"); return;
    }
    try {
      const step = processSteps.find(s => s.id === newHazard.process_step_id);
      await HazardAnalysisRepo.create({
        organization_id: organizationId,
        plan_id: newHazard.plan_id,
        process_step_id: newHazard.process_step_id,
        step_name: step?.step_name,
        hazard_type: newHazard.hazard_type,
        hazard_name: newHazard.hazard_name,
        hazard_description: newHazard.hazard_description,
        source: newHazard.source,
        likelihood: newHazard.likelihood,
        severity: newHazard.severity,
        risk_score: riskScore,
        is_significant: isSignificant,
        justification: newHazard.justification,
        existing_controls: newHazard.existing_controls,
        requires_preventive_control: isSignificant,
        status: "identified",
        last_evaluated: new Date().toISOString(),
        evaluated_by: user?.email
      });
      toast.success("Hazard added"); setShowForm(false);
      setNewHazard({ plan_id: "", process_step_id: "", hazard_type: "biological", hazard_name: "", hazard_description: "", source: "", likelihood: 3, severity: 3, justification: "", existing_controls: "" });
      onRefresh();
    } catch (e) { toast.error("Failed to add"); }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardContent className="pt-4">
          <div className={cn("flex gap-3", isMobile ? "flex-col" : "flex-wrap")}>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search hazards..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/60" />
            </div>
            <div className={cn("flex gap-2", isMobile && "flex-wrap")}>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className={cn("bg-white/60", isMobile ? "flex-1 min-w-[120px]" : "w-40")}><SelectValue placeholder="Plan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  {activePlans.map(p => (<SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className={cn("bg-white/60", isMobile ? "flex-1 min-w-[100px]" : "w-32")}><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(HAZARD_TYPE_CONFIG).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={filterSignificant} onValueChange={setFilterSignificant}>
                <SelectTrigger className={cn("bg-white/60", isMobile ? "flex-1 min-w-[120px]" : "w-36")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hazards</SelectItem>
                  <SelectItem value="yes">Significant Only</SelectItem>
                  <SelectItem value="no">Non-Significant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowForm(true)} className={cn("bg-emerald-600 hover:bg-emerald-700", isMobile && "w-full")}>
              <Plus className="w-4 h-4 mr-2" />Add Hazard
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-slate-500">{filteredHazards.length} hazards • {filteredHazards.filter(h => h.is_significant).length} significant</p>

      <div className="grid gap-3">
        {filteredHazards.length === 0 ? (
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="py-12 text-center"><AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-slate-500">No hazards found</p></CardContent>
          </Card>
        ) : isMobile ? (
          // Mobile card-based list
          filteredHazards.map(h => (
            <Card key={h.id} className="bg-white/60 backdrop-blur-xl border-white/80 active:bg-slate-50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={HAZARD_TYPE_CONFIG[h.hazard_type]?.color + " text-xs"}>{HAZARD_TYPE_CONFIG[h.hazard_type]?.label}</Badge>
                  <span className="text-xs text-slate-500 font-medium">Risk: {h.risk_score}</span>
                </div>
                <h3 className="text-sm font-medium text-slate-800 mb-1 line-clamp-2">{h.hazard_name}</h3>
                <p className="text-xs text-slate-500 mb-2 truncate">{h.step_name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {h.is_significant && <Badge className="bg-rose-100 text-rose-700 text-xs">Significant</Badge>}
                  {h.linked_preventive_control_id ? (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">Controlled</Badge>
                  ) : h.is_significant && (
                    <Badge className="bg-amber-100 text-amber-700 text-xs">Needs Control</Badge>
                  )}
                  <Badge variant="outline" className="capitalize text-xs">{h.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          // Desktop view
          filteredHazards.map(h => (
            <Card key={h.id} className="bg-white/60 backdrop-blur-xl border-white/80">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className={HAZARD_TYPE_CONFIG[h.hazard_type]?.color}>{HAZARD_TYPE_CONFIG[h.hazard_type]?.label}</Badge>
                      {h.is_significant && <Badge className="bg-rose-100 text-rose-700">Significant</Badge>}
                      <span className="text-xs text-slate-500">L:{h.likelihood} × S:{h.severity} = <strong>{h.risk_score}</strong></span>
                    </div>
                    <h3 className="text-sm font-medium text-slate-800">{h.hazard_name}</h3>
                    <p className="text-xs text-slate-500">{h.step_name}</p>
                    {h.hazard_description && <p className="text-xs text-slate-400 mt-1">{h.hazard_description}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {h.linked_preventive_control_id ? <Badge className="bg-emerald-100 text-emerald-700">Controlled</Badge> : h.is_significant && <Badge className="bg-amber-100 text-amber-700">Needs Control</Badge>}
                    <Badge variant="outline" className="capitalize">{h.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Hazard</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Food Safety Plan *</Label>
                <Select value={newHazard.plan_id} onValueChange={(v) => setNewHazard(prev => ({ ...prev, plan_id: v, process_step_id: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                  <SelectContent>{activePlans.map(p => (<SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Process Step *</Label>
                <Select value={newHazard.process_step_id} onValueChange={(v) => setNewHazard(prev => ({ ...prev, process_step_id: v }))} disabled={!newHazard.plan_id}>
                  <SelectTrigger><SelectValue placeholder="Select step" /></SelectTrigger>
                  <SelectContent>{stepsForPlan.map(s => (<SelectItem key={s.id} value={s.id}>{s.step_number}. {s.step_name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Hazard Type</Label>
                <Select value={newHazard.hazard_type} onValueChange={(v) => setNewHazard(prev => ({ ...prev, hazard_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(HAZARD_TYPE_CONFIG).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Hazard Name *</Label><Input value={newHazard.hazard_name} onChange={(e) => setNewHazard(prev => ({ ...prev, hazard_name: e.target.value }))} placeholder="e.g., Salmonella" /></div>
            </div>
            <div><Label>Description</Label><Textarea value={newHazard.hazard_description} onChange={(e) => setNewHazard(prev => ({ ...prev, hazard_description: e.target.value }))} rows={2} /></div>
            <div><Label>Source</Label><Input value={newHazard.source} onChange={(e) => setNewHazard(prev => ({ ...prev, source: e.target.value }))} placeholder="Where introduced or controlled" /></div>
            <div className="p-4 bg-slate-50 rounded-lg space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Risk Assessment</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Likelihood (1-5)</Label>
                  <Select value={String(newHazard.likelihood)} onValueChange={(v) => setNewHazard(prev => ({ ...prev, likelihood: parseInt(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="1">1 - Rare</SelectItem><SelectItem value="2">2 - Unlikely</SelectItem><SelectItem value="3">3 - Possible</SelectItem><SelectItem value="4">4 - Likely</SelectItem><SelectItem value="5">5 - Almost Certain</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Severity (1-5)</Label>
                  <Select value={String(newHazard.severity)} onValueChange={(v) => setNewHazard(prev => ({ ...prev, severity: parseInt(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="1">1 - Negligible</SelectItem><SelectItem value="2">2 - Minor</SelectItem><SelectItem value="3">3 - Moderate</SelectItem><SelectItem value="4">4 - Serious</SelectItem><SelectItem value="5">5 - Catastrophic</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-white rounded-lg">
                <span className="text-sm text-slate-600">Risk Score:</span>
                <span className="text-2xl font-bold text-slate-800">{riskScore}</span>
                {isSignificant ? <Badge className="bg-rose-100 text-rose-700">SIGNIFICANT</Badge> : <Badge className="bg-slate-100 text-slate-600">Not Significant</Badge>}
              </div>
            </div>
            <div><Label>Justification</Label><Textarea value={newHazard.justification} onChange={(e) => setNewHazard(prev => ({ ...prev, justification: e.target.value }))} placeholder="Rationale for significance determination" rows={2} /></div>
            <div><Label>Existing Controls</Label><Textarea value={newHazard.existing_controls} onChange={(e) => setNewHazard(prev => ({ ...prev, existing_controls: e.target.value }))} placeholder="Controls already in place" rows={2} /></div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleAddHazard} className="bg-emerald-600 hover:bg-emerald-700">Add Hazard</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}