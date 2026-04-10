// @ts-nocheck
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, GraduationCap, Users, Grid3X3, ClipboardCheck, BarChart3, Settings, AlertTriangle, Brain, ArrowLeft } from "lucide-react";
import TrainingDashboard from "@/components/training-competency/TrainingDashboard.jsx";
import TrainingMatrixManager from "@/components/training-competency/TrainingMatrixManager.jsx";
import EmployeeTrainingView from "@/components/training-competency/EmployeeTrainingView.jsx";
import CompetencyMatrix from "@/components/training-competency/CompetencyMatrix.jsx";
import TrainingGapAnalysis from "@/components/training-competency/TrainingGapAnalysis.jsx";
import TrainingReports from "@/components/training-competency/TrainingReports.jsx";
import TrainingCompetencySettingsPanel from "@/components/training-competency/TrainingCompetencySettingsPanel.jsx";
import {
  AreaRepo,
  CompetencyRecordRepo,
  EmployeeRepo,
  OrganizationRepo,
  TaskRepo,
  TrainingCompetencySettingsRepo,
  TrainingDocumentRepo,
  TrainingMatrixRepo,
  TrainingRecordRepo
} from "@/lib/adapters/database";

export default function TrainingCompetency() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [organizationId, setOrganizationId] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      const siteCode = localStorage.getItem("site_code");
      if (siteCode) {
        const orgs = await OrganizationRepo.filter({ site_code: siteCode, status: "active" });
        if (orgs.length > 0) setOrganizationId(orgs[0].id);
      }
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (e) {}
    };
    init();
  }, []);

  const { data: matrices = [], isLoading: matricesLoading, refetch: refetchMatrices } = useQuery({
    queryKey: ["training_matrices", organizationId],
    queryFn: () => TrainingMatrixRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: trainingRecords = [], refetch: refetchRecords } = useQuery({
    queryKey: ["training_records", organizationId],
    queryFn: () => TrainingRecordRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: competencyRecords = [], refetch: refetchCompetency } = useQuery({
    queryKey: ["competency_records", organizationId],
    queryFn: () => CompetencyRecordRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: settings = [], refetch: refetchSettings } = useQuery({
    queryKey: ["training_settings", organizationId],
    queryFn: () => TrainingCompetencySettingsRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees_training", organizationId],
    queryFn: () => EmployeeRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const { data: trainingDocs = [] } = useQuery({
    queryKey: ["training_docs", organizationId],
    queryFn: () => TrainingDocumentRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["areas_training", organizationId],
    queryFn: () => AreaRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks_training", organizationId],
    queryFn: () => TaskRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const refetchAll = () => {
    refetchMatrices();
    refetchRecords();
    refetchCompetency();
    refetchSettings();
  };

  if (matricesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-orange-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  // Calculate stats
  const today = new Date();
  const completedCount = trainingRecords.filter(r => r.status === "completed").length;
  const assignedCount = trainingRecords.filter(r => r.status === "assigned" || r.status === "in_progress").length;
  const expiredCount = trainingRecords.filter(r => r.status === "expired").length;
  const overdueCount = trainingRecords.filter(r => 
    (r.status === "assigned" || r.status === "in_progress") && 
    r.due_date && new Date(r.due_date) < today
  ).length;
  const expiringCount = trainingRecords.filter(r => {
    if (r.status !== "completed" || !r.expiration_date) return false;
    const expDate = new Date(r.expiration_date);
    const daysUntil = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    return daysUntil > 0 && daysUntil <= 30;
  }).length;

  const competentCount = competencyRecords.filter(r => r.status === "competent").length;
  const pendingEvals = competencyRecords.filter(r => r.status === "pending" || r.status === "in_progress").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-orange-50">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Link to={createPageUrl("QualityProgram")}>
              <Button variant="ghost" size="icon" className="mr-1">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="p-2.5 bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-lg">
              <GraduationCap className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Training & Competency</h1>
              <p className="text-sm text-slate-600">Manage training matrices, records, and competency evaluations</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-1">Completed</p>
            <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-1">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{assignedCount}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-1">Overdue</p>
            <p className="text-2xl font-bold text-rose-600">{overdueCount}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-1">Expiring Soon</p>
            <p className="text-2xl font-bold text-amber-600">{expiringCount}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-1">Expired</p>
            <p className="text-2xl font-bold text-slate-600">{expiredCount}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-1">Competent</p>
            <p className="text-2xl font-bold text-teal-600">{competentCount}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-1">Pending Evals</p>
            <p className="text-2xl font-bold text-purple-600">{pendingEvals}</p>
          </div>
        </div>

        {/* Alert Banner */}
        {(overdueCount > 0 || expiredCount > 0) && (
          <div className="mb-6 bg-rose-50/80 backdrop-blur-sm border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <p className="text-sm text-rose-800">
              {overdueCount > 0 && <span className="font-semibold">{overdueCount} overdue training(s)</span>}
              {overdueCount > 0 && expiredCount > 0 && " and "}
              {expiredCount > 0 && <span className="font-semibold">{expiredCount} expired training(s)</span>}
              {" require attention"}
            </p>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/60 backdrop-blur-xl border border-white/80 p-1 rounded-xl mb-6 flex-wrap h-auto">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-white rounded-lg">
              <BarChart3 className="w-4 h-4 mr-1.5" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="matrices" className="data-[state=active]:bg-white rounded-lg">
              <Grid3X3 className="w-4 h-4 mr-1.5" />
              Training Matrices
            </TabsTrigger>
            <TabsTrigger value="employees" className="data-[state=active]:bg-white rounded-lg">
              <Users className="w-4 h-4 mr-1.5" />
              Employee Training
              {overdueCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] rounded-full">{overdueCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="competency" className="data-[state=active]:bg-white rounded-lg">
              <ClipboardCheck className="w-4 h-4 mr-1.5" />
              Competency Matrix
            </TabsTrigger>
            <TabsTrigger value="gaps" className="data-[state=active]:bg-white rounded-lg">
              <Brain className="w-4 h-4 mr-1.5" />
              Gap Analysis
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-white rounded-lg">
              Reports
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-white rounded-lg">
              <Settings className="w-4 h-4 mr-1.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <TrainingDashboard
              trainingRecords={trainingRecords}
              competencyRecords={competencyRecords}
              matrices={matrices}
              employees={employees}
              trainingDocs={trainingDocs}
              organizationId={organizationId}
            />
          </TabsContent>

          <TabsContent value="matrices">
            <TrainingMatrixManager
              matrices={matrices}
              trainingDocs={trainingDocs}
              employees={employees}
              areas={areas}
              tasks={tasks}
              organizationId={organizationId}
              settings={settings[0]}
              onRefresh={refetchMatrices}
            />
          </TabsContent>

          <TabsContent value="employees">
            <EmployeeTrainingView
              employees={employees}
              trainingRecords={trainingRecords}
              competencyRecords={competencyRecords}
              matrices={matrices}
              trainingDocs={trainingDocs}
              organizationId={organizationId}
              settings={settings[0]}
              user={user}
              onRefresh={refetchAll}
            />
          </TabsContent>

          <TabsContent value="competency">
            <CompetencyMatrix
              employees={employees}
              competencyRecords={competencyRecords}
              trainingRecords={trainingRecords}
              tasks={tasks}
              areas={areas}
              organizationId={organizationId}
              settings={settings[0]}
              user={user}
              onRefresh={refetchCompetency}
            />
          </TabsContent>

          <TabsContent value="gaps">
            <TrainingGapAnalysis
              employees={employees}
              trainingRecords={trainingRecords}
              competencyRecords={competencyRecords}
              matrices={matrices}
              areas={areas}
              tasks={tasks}
              organizationId={organizationId}
              settings={settings[0]}
            />
          </TabsContent>

          <TabsContent value="reports">
            <TrainingReports
              trainingRecords={trainingRecords}
              competencyRecords={competencyRecords}
              employees={employees}
              matrices={matrices}
              trainingDocs={trainingDocs}
            />
          </TabsContent>

          <TabsContent value="settings">
            <TrainingCompetencySettingsPanel
              settings={settings[0]}
              organizationId={organizationId}
              employees={employees}
              onRefresh={refetchSettings}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}