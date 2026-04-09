import { useState } from "react";
import { CompetencyEvaluationRepo, EmployeeRepo, TaskRepo, EmployeeTrainingRepo, SSOPRepo } from "@/lib/adapters/database";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardCheck, Users, Settings, 
  CheckCircle2, Clock, AlertTriangle, Loader2
} from "lucide-react";
import PendingEvaluationsQueue from "@/components/competency/PendingEvaluationsQueue";
import QualificationsMatrix from "@/components/competency/QualificationsMatrix";
import EvaluatorSettingsPanel from "@/components/competency/EvaluatorSettingsPanel";

export default function CompetencyManagement({ organizationId }) {
  const [activeTab, setActiveTab] = useState("pending");
  const queryClient = useQueryClient();

  const { data: evaluations = [], isLoading: evalsLoading } = useQuery({
    queryKey: ["competency_evaluations", organizationId],
    queryFn: () => CompetencyEvaluationRepo.filter({ 
      organization_id: organizationId 
    }, "-created_date"),
    enabled: !!organizationId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", organizationId],
    queryFn: () => EmployeeRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", organizationId],
    queryFn: () => TaskRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: trainings = [] } = useQuery({
    queryKey: ["employee_trainings_all", organizationId],
    queryFn: () => EmployeeTrainingRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: ssops = [] } = useQuery({
    queryKey: ["ssops", organizationId],
    queryFn: () => SSOPRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  // Calculate stats
  const pendingCount = evaluations.filter(e => 
    e.status === "evaluation_required" || e.status === "scheduled"
  ).length;
  
  const competentCount = evaluations.filter(e => e.status === "competent").length;
  
  const needsAttentionCount = evaluations.filter(e => 
    e.status === "needs_coaching" || e.status === "not_competent" || e.status === "expired"
  ).length;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["competency_evaluations"] });
  };

  if (evalsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Competency Management</h2>
        <p className="text-slate-500 mt-1">
          Track training completions and hands-on competency evaluations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
                <p className="text-sm text-slate-500">Pending Evaluations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{competentCount}</p>
                <p className="text-sm text-slate-500">Qualified Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-100">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{needsAttentionCount}</p>
                <p className="text-sm text-slate-500">Need Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="pending" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Pending Evaluations
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-600">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="matrix" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" />
            Qualifications Matrix
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            <Settings className="w-4 h-4 mr-2" />
            Evaluator Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <PendingEvaluationsQueue 
            evaluations={evaluations}
            ssops={ssops}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="matrix" className="mt-6">
          <QualificationsMatrix
            tasks={tasks}
            employees={employees}
            trainings={trainings}
            evaluations={evaluations}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <EvaluatorSettingsPanel organizationId={organizationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}