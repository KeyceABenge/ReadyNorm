import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, FoodSafetyPlanRepo, ProcessStepRepo, HazardAnalysisRepo, PreventiveControlRepo, FSPSettingsRepo, EmployeeRepo, AreaRepo } from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  FileCheck, Plus, ArrowLeft, LayoutDashboard, List, AlertTriangle,
  Shield, BarChart3, Settings, Clock, FileText, GitBranch
} from "lucide-react";

import FSPDashboard from "@/components/fsp/FSPDashboard.jsx";
import FSPlanList from "@/components/fsp/FSPlanList.jsx";
import FSPlanFormModal from "@/components/fsp/FSPlanFormModal.jsx";
import FSPlanDetailModal from "@/components/fsp/FSPlanDetailModal.jsx";
import HazardAnalysisView from "@/components/fsp/HazardAnalysisView.jsx";
import PreventiveControlsView from "@/components/fsp/PreventiveControlsView.jsx";
import FSPAnalytics from "@/components/fsp/FSPAnalytics.jsx";
import FSPSettingsPanel from "@/components/fsp/FSPSettingsPanel.jsx";

export default function FoodSafetyPlanPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const initializeOrg = async () => {
      const siteCode = localStorage.getItem("site_code");
      if (siteCode) {
        const orgs = await OrganizationRepo.filter({ site_code: siteCode, status: "active" });
        if (orgs.length > 0) {
          setOrganizationId(orgs[0].id);
        }
      }
      getCurrentUser().then(setUser).catch(() => {});
    };
    initializeOrg();
  }, []);

  const { data: plans = [], refetch: refetchPlans } = useQuery({
    queryKey: ["fsp_plans", organizationId],
    queryFn: () => FoodSafetyPlanRepo.filter({ organization_id: organizationId }, "-created_date"),
    enabled: !!organizationId
  });

  const { data: processSteps = [], refetch: refetchSteps } = useQuery({
    queryKey: ["process_steps", organizationId],
    queryFn: () => ProcessStepRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: hazards = [], refetch: refetchHazards } = useQuery({
    queryKey: ["hazard_analysis", organizationId],
    queryFn: () => HazardAnalysisRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: controls = [], refetch: refetchControls } = useQuery({
    queryKey: ["preventive_controls", organizationId],
    queryFn: () => PreventiveControlRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: settings = [], refetch: refetchSettings } = useQuery({
    queryKey: ["fsp_settings", organizationId],
    queryFn: () => FSPSettingsRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", organizationId],
    queryFn: () => EmployeeRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["areas", organizationId],
    queryFn: () => AreaRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const fspSettings = settings[0] || {};

  const handleRefresh = () => {
    refetchPlans(); refetchSteps(); refetchHazards(); refetchControls(); refetchSettings();
  };

  const activePlans = plans.filter(p => p.status === "active");
  const significantHazards = hazards.filter(h => h.is_significant);
  const activeControls = controls.filter(c => c.status === "active");
  const pendingValidation = controls.filter(c => c.validation_status === "pending" || c.validation_status === "revalidation_required");
  const overdueVerification = controls.filter(c => c.next_verification && new Date(c.next_verification) < new Date());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50 to-teal-50">
      <div className="bg-white/60 backdrop-blur-xl border-b border-white/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("FoodSafetyProgram")}>
                <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Food Safety Plan</h1>
                  <p className="text-xs text-slate-500">HACCP / HARPC Management</p>
                </div>
              </div>
            </div>
            <Button onClick={() => setShowPlanForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />New Plan
            </Button>
          </div>
        </div>
      </div>

      {(pendingValidation.length > 0 || overdueVerification.length > 0) && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              {pendingValidation.length > 0 && <span className="font-medium">{pendingValidation.length} control{pendingValidation.length > 1 ? "s" : ""} pending validation. </span>}
              {overdueVerification.length > 0 && <span className="font-medium">{overdueVerification.length} verification{overdueVerification.length > 1 ? "s" : ""} overdue.</span>}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-500" /><span className="text-xs text-slate-500">Active Plans</span></div>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{activePlans.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2"><GitBranch className="w-4 h-4 text-blue-500" /><span className="text-xs text-slate-500">Process Steps</span></div>
              <p className="text-2xl font-bold text-blue-600 mt-1">{processSteps.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /><span className="text-xs text-slate-500">Significant Hazards</span></div>
              <p className="text-2xl font-bold text-amber-600 mt-1">{significantHazards.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-purple-500" /><span className="text-xs text-slate-500">Active Controls</span></div>
              <p className="text-2xl font-bold text-purple-600 mt-1">{activeControls.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/80">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-rose-500" /><span className="text-xs text-slate-500">Pending Validation</span></div>
              <p className="text-2xl font-bold text-rose-600 mt-1">{pendingValidation.length}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/60 backdrop-blur-xl border border-white/80 mb-6">
            <TabsTrigger value="dashboard" className="gap-2"><LayoutDashboard className="w-4 h-4" />Dashboard</TabsTrigger>
            <TabsTrigger value="plans" className="gap-2"><List className="w-4 h-4" />Plans</TabsTrigger>
            <TabsTrigger value="hazards" className="gap-2"><AlertTriangle className="w-4 h-4" />Hazard Analysis</TabsTrigger>
            <TabsTrigger value="controls" className="gap-2"><Shield className="w-4 h-4" />Controls</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="w-4 h-4" />Analytics</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings className="w-4 h-4" />Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <FSPDashboard plans={plans} processSteps={processSteps} hazards={hazards} controls={controls} onSelectPlan={setSelectedPlan} />
          </TabsContent>
          <TabsContent value="plans">
            <FSPlanList plans={plans} onSelectPlan={setSelectedPlan} onRefresh={handleRefresh} />
          </TabsContent>
          <TabsContent value="hazards">
            <HazardAnalysisView plans={plans} processSteps={processSteps} hazards={hazards} controls={controls} organizationId={organizationId} user={user} settings={fspSettings} onRefresh={handleRefresh} />
          </TabsContent>
          <TabsContent value="controls">
            <PreventiveControlsView plans={plans} processSteps={processSteps} hazards={hazards} controls={controls} organizationId={organizationId} user={user} employees={employees} onRefresh={handleRefresh} />
          </TabsContent>
          <TabsContent value="analytics">
            <FSPAnalytics plans={plans} processSteps={processSteps} hazards={hazards} controls={controls} />
          </TabsContent>
          <TabsContent value="settings">
            <FSPSettingsPanel settings={fspSettings} organizationId={organizationId} employees={employees} onRefresh={handleRefresh} />
          </TabsContent>
        </Tabs>
      </div>

      <FSPlanFormModal open={showPlanForm} onOpenChange={setShowPlanForm} organizationId={organizationId} user={user} employees={employees} onSuccess={handleRefresh} />

      {selectedPlan && (
        <FSPlanDetailModal open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)} plan={selectedPlan} processSteps={processSteps.filter(s => s.plan_id === selectedPlan.id)} hazards={hazards.filter(h => h.plan_id === selectedPlan.id)} controls={controls.filter(c => c.plan_id === selectedPlan.id)} user={user} employees={employees} areas={areas} organizationId={organizationId} onRefresh={handleRefresh} />
      )}
    </div>
  );
}