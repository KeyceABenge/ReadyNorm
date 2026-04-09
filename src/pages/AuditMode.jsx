import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, TaskRepo, EmployeeRepo, AreaSignOffRepo, DrainLocationRepo, DrainCleaningRecordRepo, RainDiverterRepo, DiverterInspectionRepo, ChemicalInventoryRecordRepo, ChemicalCountEntryRepo, CompetencyEvaluationRepo, EmployeeTrainingRepo, TrainingDocumentRepo, AreaRepo, ProductionLineRepo, AssetRepo } from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import AuditModeView from "@/components/audit/AuditModeView";
import { createPageUrl } from "@/utils";

export default function AuditMode() {
  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);

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

  // Load all data needed for audit view
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["audit_tasks", orgId],
    queryFn: () => TaskRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    staleTime: 60000
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["audit_employees", orgId],
    queryFn: () => EmployeeRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    staleTime: 60000
  });

  const { data: areaSignOffs = [] } = useQuery({
    queryKey: ["audit_signoffs", orgId],
    queryFn: () => AreaSignOffRepo.filter({ organization_id: orgId }, "-signed_off_at", 500),
    enabled: !!orgId,
    staleTime: 60000
  });

  const { data: drainLocations = [] } = useQuery({
    queryKey: ["audit_drains", orgId],
    queryFn: () => DrainLocationRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    staleTime: 60000
  });

  const { data: drainCleaningRecords = [] } = useQuery({
    queryKey: ["audit_drain_records", orgId],
    queryFn: () => DrainCleaningRecordRepo.filter({ organization_id: orgId }, "-cleaned_at", 500),
    enabled: !!orgId,
    staleTime: 60000
  });

  const { data: rainDiverters = [] } = useQuery({
    queryKey: ["audit_diverters", orgId],
    queryFn: () => RainDiverterRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    staleTime: 60000
  });

  const { data: diverterInspections = [] } = useQuery({
    queryKey: ["audit_diverter_inspections", orgId],
    queryFn: () => DiverterInspectionRepo.filter({ organization_id: orgId }, "-inspection_date", 500),
    enabled: !!orgId,
    staleTime: 60000
  });

  const { data: chemicalInventoryRecords = [] } = useQuery({
    queryKey: ["audit_inventory_records", orgId],
    queryFn: () => ChemicalInventoryRecordRepo.filter({ organization_id: orgId }, "-completed_at", 100),
    enabled: !!orgId,
    staleTime: 60000
  });

  const { data: chemicalCountEntries = [] } = useQuery({
    queryKey: ["audit_count_entries", orgId],
    queryFn: () => ChemicalCountEntryRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    staleTime: 60000
  });

  const { data: competencyEvaluations = [] } = useQuery({
    queryKey: ["audit_competency", orgId],
    queryFn: () => CompetencyEvaluationRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    staleTime: 60000
  });

  const { data: employeeTrainings = [] } = useQuery({
    queryKey: ["audit_trainings", orgId],
    queryFn: () => EmployeeTrainingRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    staleTime: 60000
  });

  const { data: trainingDocuments = [] } = useQuery({
    queryKey: ["audit_training_docs", orgId],
    queryFn: () => TrainingDocumentRepo.filter({ organization_id: orgId, status: "active" }),
    enabled: !!orgId,
    staleTime: 60000
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["audit_areas", orgId],
    queryFn: () => AreaRepo.filter({ organization_id: orgId, status: "active" }),
    enabled: !!orgId,
    staleTime: 60000
  });

  const { data: productionLines = [] } = useQuery({
    queryKey: ["audit_lines", orgId],
    queryFn: () => ProductionLineRepo.filter({ organization_id: orgId, status: "active" }),
    enabled: !!orgId,
    staleTime: 60000
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["audit_assets", orgId],
    queryFn: () => AssetRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    staleTime: 60000
  });

  // Loading
  if (tasksLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading audit data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <AuditModeView
          tasks={tasks}
          employees={employees}
          areaSignOffs={areaSignOffs}
          drainLocations={drainLocations}
          drainCleaningRecords={drainCleaningRecords}
          rainDiverters={rainDiverters}
          diverterInspections={diverterInspections}
          chemicalInventoryRecords={chemicalInventoryRecords}
          chemicalCountEntries={chemicalCountEntries}
          competencyEvaluations={competencyEvaluations}
          employeeTrainings={employeeTrainings}
          trainingDocuments={trainingDocuments}
          areas={areas}
          productionLines={productionLines}
          assets={assets}
          organizationId={orgId}
        />
      </div>
    </div>
  );
}