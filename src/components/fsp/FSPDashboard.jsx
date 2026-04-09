import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, CheckCircle2, Clock, ArrowRight, FileText } from "lucide-react";

const CONTROL_TYPE_CONFIG = {
  process: { color: "bg-blue-100 text-blue-700", label: "Process" },
  sanitation: { color: "bg-emerald-100 text-emerald-700", label: "Sanitation" },
  allergen: { color: "bg-purple-100 text-purple-700", label: "Allergen" },
  supply_chain: { color: "bg-amber-100 text-amber-700", label: "Supply Chain" },
  ccp: { color: "bg-rose-100 text-rose-700", label: "CCP" }
};

const HAZARD_TYPE_CONFIG = {
  biological: { color: "bg-rose-100 text-rose-700" },
  chemical: { color: "bg-amber-100 text-amber-700" },
  physical: { color: "bg-blue-100 text-blue-700" },
  allergen: { color: "bg-purple-100 text-purple-700" },
  radiological: { color: "bg-slate-100 text-slate-700" }
};

export default function FSPDashboard({ plans, processSteps, hazards, controls, onSelectPlan }) {
  const activePlans = plans.filter(p => p.status === "active");
  const significantHazards = hazards.filter(h => h.is_significant);
  const activeControls = controls.filter(c => c.status === "active");
  const now = new Date();

  const pendingValidation = controls.filter(c => c.validation_status === "pending" || c.validation_status === "revalidation_required");
  const overdueVerification = controls.filter(c => c.next_verification && new Date(c.next_verification) < now);
  const upcomingReviews = plans.filter(p => {
    if (!p.next_review_date) return false;
    const d = new Date(p.next_review_date);
    return d <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  });

  const hazardsByType = { biological: 0, chemical: 0, physical: 0, allergen: 0 };
  significantHazards.forEach(h => { if (hazardsByType[h.hazard_type] !== undefined) hazardsByType[h.hazard_type]++; });

  const controlsByType = { process: 0, sanitation: 0, allergen: 0, supply_chain: 0, ccp: 0 };
  activeControls.forEach(c => { if (controlsByType[c.control_type] !== undefined) controlsByType[c.control_type]++; });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-500" />Active Food Safety Plans</CardTitle>
          </CardHeader>
          <CardContent>
            {activePlans.length === 0 ? (
              <div className="text-center py-6"><p className="text-sm text-slate-500">No active plans</p></div>
            ) : (
              <div className="space-y-2">
                {activePlans.slice(0, 5).map(plan => (
                  <div key={plan.id} onClick={() => onSelectPlan(plan)} className="p-3 bg-white/80 rounded-lg border border-slate-100 hover:border-slate-200 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-400">{plan.plan_number}</span>
                          <Badge className="bg-emerald-100 text-emerald-700">{plan.plan_type?.toUpperCase()}</Badge>
                          <Badge variant="outline">v{plan.version}</Badge>
                        </div>
                        <p className="text-sm font-medium text-slate-800">{plan.title}</p>
                        <p className="text-xs text-slate-500">{plan.product_category} • {processSteps.filter(s => s.plan_id === plan.id).length} steps • {hazards.filter(h => h.plan_id === plan.id && h.is_significant).length} significant hazards</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="pb-3"><CardTitle className="text-base">Hazards by Type</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(hazardsByType).filter(([, v]) => v > 0).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700 capitalize">{type}</span>
                  <Badge className={HAZARD_TYPE_CONFIG[type]?.color}>{count}</Badge>
                </div>
              ))}
              {Object.values(hazardsByType).every(v => v === 0) && <p className="text-sm text-slate-500 text-center py-4">No significant hazards</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-purple-500" />Preventive Controls Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(controlsByType).map(([type, count]) => (
                <div key={type} className="p-3 bg-slate-50 rounded-lg">
                  <Badge className={CONTROL_TYPE_CONFIG[type]?.color}>{CONTROL_TYPE_CONFIG[type]?.label}</Badge>
                  <p className="text-2xl font-bold text-slate-800 mt-2">{count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" />Attention Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingValidation.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-sm font-medium text-amber-800">{pendingValidation.length} Controls Pending Validation</p>
                  <p className="text-xs text-amber-600">Scientific validation required</p>
                </div>
              )}
              {overdueVerification.length > 0 && (
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                  <p className="text-sm font-medium text-rose-800">{overdueVerification.length} Verifications Overdue</p>
                  <p className="text-xs text-rose-600">Verification activities needed</p>
                </div>
              )}
              {upcomingReviews.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm font-medium text-blue-800">{upcomingReviews.length} Plan Reviews Due</p>
                  <p className="text-xs text-blue-600">Within next 30 days</p>
                </div>
              )}
              {pendingValidation.length === 0 && overdueVerification.length === 0 && upcomingReviews.length === 0 && (
                <div className="text-center py-4"><CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" /><p className="text-sm text-slate-500">All items current</p></div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/60 backdrop-blur-xl border-white/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Significant Hazards</CardTitle>
        </CardHeader>
        <CardContent>
          {significantHazards.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No significant hazards identified</p>
          ) : (
            <div className="grid gap-2">
              {significantHazards.slice(0, 6).map(hazard => (
                <div key={hazard.id} className="p-3 bg-white/80 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={HAZARD_TYPE_CONFIG[hazard.hazard_type]?.color}>{hazard.hazard_type}</Badge>
                        <span className="text-xs text-slate-500">Score: {hazard.risk_score}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-800">{hazard.hazard_name}</p>
                      <p className="text-xs text-slate-500">{hazard.step_name}</p>
                    </div>
                    {hazard.linked_preventive_control_id ? (
                      <Badge className="bg-emerald-100 text-emerald-700">Controlled</Badge>
                    ) : (
                      <Badge className="bg-rose-100 text-rose-700">Needs Control</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}