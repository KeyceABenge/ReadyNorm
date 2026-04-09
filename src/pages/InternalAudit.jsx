import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, AuditStandardRepo, AuditSectionRepo, AuditRequirementRepo, AuditPlanRepo, ScheduledAuditRepo, AuditResultRepo, AuditFindingRepo, CAPARepo, EmployeeRepo } from "@/lib/adapters/database";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, Calendar, FileText, ClipboardCheck, 
  Settings, BarChart3, AlertTriangle, ArrowLeft
} from "lucide-react";
import { createPageUrl } from "@/utils";
import AuditDashboard from "@/components/audit/internal/AuditDashboard.jsx";
import AuditStandardsManager from "@/components/audit/internal/AuditStandardsManager.jsx";
import AuditPlanManager from "@/components/audit/internal/AuditPlanManager.jsx";
import AuditExecution from "@/components/audit/internal/AuditExecution.jsx";
import AuditReports from "@/components/audit/internal/AuditReports.jsx";
import AuditSettings from "@/components/audit/internal/AuditSettings.jsx";
import AuditFindingsReview from "@/components/audit/internal/AuditFindingsReview.jsx";

export default function InternalAudit() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [organization, setOrganization] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        
        const siteCode = localStorage.getItem("site_code");
        if (siteCode) {
          const orgs = await OrganizationRepo.filter({ site_code: siteCode, status: "active" });
          if (orgs.length > 0) setOrganization(orgs[0]);
        }
      } catch (e) {
        console.error("Init error:", e);
      }
    };
    init();
  }, []);

  const { data: standards = [], refetch: refetchStandards } = useQuery({
    queryKey: ["audit_standards", organization?.id],
    queryFn: () => AuditStandardRepo.filter({ organization_id: organization.id }),
    enabled: !!organization?.id,
  });

  const { data: sections = [], refetch: refetchSections } = useQuery({
    queryKey: ["audit_sections", organization?.id],
    queryFn: () => AuditSectionRepo.filter({ organization_id: organization.id }),
    enabled: !!organization?.id,
  });

  const { data: requirements = [], refetch: refetchRequirements } = useQuery({
    queryKey: ["audit_requirements", organization?.id],
    queryFn: () => AuditRequirementRepo.filter({ organization_id: organization.id }),
    enabled: !!organization?.id,
  });

  const { data: plans = [], refetch: refetchPlans } = useQuery({
    queryKey: ["audit_plans", organization?.id],
    queryFn: () => AuditPlanRepo.filter({ organization_id: organization.id }),
    enabled: !!organization?.id,
  });

  const { data: scheduledAudits = [], refetch: refetchScheduled } = useQuery({
    queryKey: ["scheduled_audits", organization?.id],
    queryFn: () => ScheduledAuditRepo.filter({ organization_id: organization.id }),
    enabled: !!organization?.id,
  });

  const { data: results = [], refetch: refetchResults } = useQuery({
    queryKey: ["audit_results", organization?.id],
    queryFn: () => AuditResultRepo.filter({ organization_id: organization.id }),
    enabled: !!organization?.id,
  });

  const { data: findings = [], refetch: refetchFindings } = useQuery({
    queryKey: ["audit_findings", organization?.id],
    queryFn: () => AuditFindingRepo.filter({ organization_id: organization.id }),
    enabled: !!organization?.id,
  });

  const { data: capas = [] } = useQuery({
    queryKey: ["capas_audit", organization?.id],
    queryFn: () => CAPARepo.filter({ organization_id: organization.id, source: "audit" }),
    enabled: !!organization?.id,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", organization?.id],
    queryFn: () => EmployeeRepo.filter({ organization_id: organization.id, status: "active" }),
    enabled: !!organization?.id,
  });

  const refetchAll = () => {
    refetchStandards();
    refetchSections();
    refetchRequirements();
    refetchPlans();
    refetchScheduled();
    refetchResults();
    refetchFindings();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("QualityProgram")}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Internal Audit Program</h1>
              <p className="text-sm text-slate-600">Continuous compliance auditing against standards</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="standards" className="gap-2">
              <FileText className="w-4 h-4" />
              Standards
            </TabsTrigger>
            <TabsTrigger value="plan" className="gap-2">
              <Calendar className="w-4 h-4" />
              Audit Plan
            </TabsTrigger>
            <TabsTrigger value="execute" className="gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Execute Audits
            </TabsTrigger>
            <TabsTrigger value="findings" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Findings
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AuditDashboard 
              standards={standards}
              sections={sections}
              scheduledAudits={scheduledAudits}
              results={results}
              findings={findings}
              onNavigate={setActiveTab}
              organization={organization}
            />
          </TabsContent>

          <TabsContent value="standards">
            <AuditStandardsManager 
              organization={organization}
              standards={standards}
              sections={sections}
              requirements={requirements}
              onRefresh={refetchAll}
            />
          </TabsContent>

          <TabsContent value="plan">
            <AuditPlanManager 
              organization={organization}
              user={user}
              standards={standards}
              sections={sections}
              plans={plans}
              scheduledAudits={scheduledAudits}
              employees={employees}
              onRefresh={refetchAll}
            />
          </TabsContent>

          <TabsContent value="execute">
            <AuditExecution 
              organization={organization}
              user={user}
              standards={standards}
              sections={sections}
              requirements={requirements}
              scheduledAudits={scheduledAudits}
              results={results}
              findings={findings}
              onRefresh={refetchAll}
            />
          </TabsContent>

          <TabsContent value="findings">
            <AuditFindingsReview 
              findings={findings}
              standards={standards}
              sections={sections}
              results={results}
              capas={capas}
              organizationId={organization?.id}
              user={user}
              onRefresh={refetchAll}
            />
          </TabsContent>

          <TabsContent value="reports">
            <AuditReports 
              standards={standards}
              sections={sections}
              results={results}
              findings={findings}
              scheduledAudits={scheduledAudits}
            />
          </TabsContent>

          <TabsContent value="settings">
            <AuditSettings 
              organization={organization}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}