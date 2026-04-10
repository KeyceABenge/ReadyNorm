// @ts-nocheck
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Play, Loader2, 
  ArrowLeft,
  RefreshCw, FileText, Zap
} from "lucide-react";
import { createPageUrl } from "@/utils";
import FailureSimulator from "@/components/validation/FailureSimulator";
import ValidationResults from "@/components/validation/ValidationResults";
import SystemHealthCheck from "@/components/validation/SystemHealthCheck";
import { AuditFindingRepo, CAPARepo, EMPSampleRepo, OrganizationRepo, PestFindingRepo, RiskEntryRepo, SanitationDowntimeRepo } from "@/lib/adapters/database";

export default function SystemValidation() {
  const [activeTab, setActiveTab] = useState("simulate");
  const [organizationId, setOrganizationId] = useState(null);
  const [user, setUser] = useState(null);
  const [simulationResults, setSimulationResults] = useState([]);

  const queryClient = useQueryClient();

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        if (userData.organization_id) {
          setOrganizationId(userData.organization_id);
        } else {
          const siteCode = localStorage.getItem("site_code");
          if (siteCode) {
            const orgs = await OrganizationRepo.filter({ site_code: siteCode });
            if (orgs.length > 0) setOrganizationId(orgs[0].id);
          }
        }
      } catch (e) {
        console.error("Init error:", e);
      }
    };
    init();
  }, []);

  // Fetch data for validation
  const { data: capas = [], refetch: refetchCapas } = useQuery({
    queryKey: ["validation_capas", organizationId],
    queryFn: () => CAPARepo.filter({ organization_id: organizationId }, "-created_date", 50),
    enabled: !!organizationId
  });

  const { data: riskEntries = [], refetch: refetchRisks } = useQuery({
    queryKey: ["validation_risks", organizationId],
    queryFn: () => RiskEntryRepo.filter({ organization_id: organizationId }, "-created_date", 50),
    enabled: !!organizationId
  });

  const { data: empSamples = [] } = useQuery({
    queryKey: ["validation_emp", organizationId],
    queryFn: () => EMPSampleRepo.filter({ organization_id: organizationId }, "-created_date", 20),
    enabled: !!organizationId
  });

  const { data: pestFindings = [] } = useQuery({
    queryKey: ["validation_pest", organizationId],
    queryFn: () => PestFindingRepo.filter({ organization_id: organizationId }, "-created_date", 20),
    enabled: !!organizationId
  });

  const { data: auditFindings = [] } = useQuery({
    queryKey: ["validation_audit", organizationId],
    queryFn: () => AuditFindingRepo.filter({ organization_id: organizationId }, "-created_date", 20),
    enabled: !!organizationId
  });

  const { data: downtimes = [] } = useQuery({
    queryKey: ["validation_downtime", organizationId],
    queryFn: () => SanitationDowntimeRepo.filter({ organization_id: organizationId }, "-created_date", 20),
    enabled: !!organizationId
  });

  const handleRefreshAll = () => {
    refetchCapas();
    refetchRisks();
    queryClient.invalidateQueries({ queryKey: ["validation_emp"] });
    queryClient.invalidateQueries({ queryKey: ["validation_pest"] });
    queryClient.invalidateQueries({ queryKey: ["validation_audit"] });
    queryClient.invalidateQueries({ queryKey: ["validation_downtime"] });
  };

  const handleSimulationComplete = (results) => {
    setSimulationResults(prev => [...prev, results]);
    handleRefreshAll();
  };

  if (!organizationId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-orange-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => window.location.href = createPageUrl("Home")} className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">System Validation</h1>
                  <p className="text-sm text-slate-400">Stress test & verify system behavior</p>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefreshAll} className="border-slate-600 text-slate-300 hover:text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="simulate" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
              <Play className="w-4 h-4 mr-2" />
              Run Simulations
            </TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              Results ({simulationResults.length})
            </TabsTrigger>
            <TabsTrigger value="health" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              System Health
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simulate">
            <FailureSimulator
              organizationId={organizationId}
              user={user}
              onSimulationComplete={handleSimulationComplete}
            />
          </TabsContent>

          <TabsContent value="results">
            <ValidationResults
              results={simulationResults}
              capas={capas}
              riskEntries={riskEntries}
              empSamples={empSamples}
              pestFindings={pestFindings}
              auditFindings={auditFindings}
              downtimes={downtimes}
            />
          </TabsContent>

          <TabsContent value="health">
            <SystemHealthCheck
              organizationId={organizationId}
              capas={capas}
              riskEntries={riskEntries}
              empSamples={empSamples}
              pestFindings={pestFindings}
              auditFindings={auditFindings}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}