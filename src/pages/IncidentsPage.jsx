// @ts-nocheck
import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, IncidentRepo, EmployeeRepo, TaskRepo, AreaRepo, DrainLocationRepo, RainDiverterRepo, SSOPRepo, TrainingDocumentRepo, CompetencyEvaluationRepo } from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import IncidentResponseEngine from "@/components/incidents/IncidentResponseEngine";
import { createPageUrl } from "@/utils";
import PullToRefresh from "@/components/mobile/PullToRefresh";

export default function IncidentsPage() {
  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const getUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        
        // CRITICAL: Get organization_id ONLY from site_code in localStorage
        const storedSiteCode = localStorage.getItem('site_code');
        if (!storedSiteCode) {
          window.location.href = createPageUrl("Home");
          return;
        }
        
        const orgs = await OrganizationRepo.filter({ site_code: storedSiteCode, status: "active" });
        if (orgs.length > 0) {
          setOrgId(orgs[0].id);
        } else {
          localStorage.removeItem('site_code');
          window.location.href = createPageUrl("Home");
        }
      } catch (e) {
        window.location.href = '/ManagerLogin';
      }
    };
    getUser();
  }, []);

  const { data: incidents = [], isLoading, refetch: refetchIncidents } = useQuery({
    queryKey: ["incidents", orgId],
    queryFn: () => IncidentRepo.filter({ organization_id: orgId }, "-created_date"),
    enabled: !!orgId
  });
  
  // Pull to refresh handler
  const handlePullToRefresh = async () => {
    await Promise.all([
      refetchIncidents(),
      queryClient.invalidateQueries({ queryKey: ["incident_employees"] }),
      queryClient.invalidateQueries({ queryKey: ["incident_tasks"] }),
      queryClient.invalidateQueries({ queryKey: ["incident_areas"] })
    ]);
  };

  const { data: employees = [] } = useQuery({
    queryKey: ["incident_employees", orgId],
    queryFn: () => EmployeeRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["incident_tasks", orgId],
    queryFn: () => TaskRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["incident_areas", orgId],
    queryFn: () => AreaRepo.filter({ organization_id: orgId, status: "active" }),
    enabled: !!orgId
  });

  const { data: drainLocations = [] } = useQuery({
    queryKey: ["incident_drains", orgId],
    queryFn: () => DrainLocationRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: rainDiverters = [] } = useQuery({
    queryKey: ["incident_diverters", orgId],
    queryFn: () => RainDiverterRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: ssops = [] } = useQuery({
    queryKey: ["incident_ssops", orgId],
    queryFn: () => SSOPRepo.filter({ organization_id: orgId, status: "active" }),
    enabled: !!orgId
  });

  const { data: trainingDocuments = [] } = useQuery({
    queryKey: ["incident_training", orgId],
    queryFn: () => TrainingDocumentRepo.filter({ organization_id: orgId, status: "active" }),
    enabled: !!orgId
  });

  const { data: competencyEvaluations = [] } = useQuery({
    queryKey: ["incident_competency", orgId],
    queryFn: () => CompetencyEvaluationRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const createMutation = useMutation({
    mutationFn: (data) => IncidentRepo.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents"] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => IncidentRepo.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents"] })
  });

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handlePullToRefresh} className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <IncidentResponseEngine
          incidents={incidents}
          tasks={tasks}
          employees={employees}
          drainLocations={drainLocations}
          rainDiverters={rainDiverters}
          ssops={ssops}
          trainingDocuments={trainingDocuments}
          competencyEvaluations={competencyEvaluations}
          areas={areas}
          organizationId={orgId}
          currentUser={user}
          onCreateIncident={(data) => createMutation.mutateAsync(data)}
          onUpdateIncident={(id, data) => updateMutation.mutateAsync({ id, data })}
        />
      </div>
    </PullToRefresh>
  );
}