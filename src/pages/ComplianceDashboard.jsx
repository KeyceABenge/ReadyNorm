// @ts-nocheck
import { useState, useMemo, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ComplianceEvidenceRepo,
  ComplianceFrameworkRepo,
  ComplianceRequirementRepo,
  EmployeeTrainingRepo,
  OrganizationRepo,
  TaskRepo
} from "@/lib/adapters/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, CheckCircle2, XCircle, AlertTriangle, Plus, Calendar, Eye, Loader2
} from "lucide-react";
import { parseISO, differenceInDays } from "date-fns";
import ComplianceFrameworkCard from "@/components/compliance/ComplianceFrameworkCard";
import ComplianceRequirementsList from "@/components/compliance/ComplianceRequirementsList";
import ComplianceGapAnalysis from "@/components/compliance/ComplianceGapAnalysis";
import AuditPrepView from "@/components/compliance/AuditPrepView";
import FrameworkFormModal from "@/components/compliance/FrameworkFormModal";
import RequirementFormModal from "@/components/compliance/RequirementFormModal";
import { toast } from "sonner";

const FRAMEWORK_TEMPLATES = {
  fda_117: {
    name: "FDA 21 CFR Part 117",
    description: "Current Good Manufacturing Practice, Hazard Analysis, and Risk-Based Preventive Controls for Human Food",
    version: "2024"
  },
  fsma: {
    name: "FSMA Preventive Controls",
    description: "Food Safety Modernization Act - Preventive Controls for Human Food",
    version: "2024"
  },
  sqf: {
    name: "SQF Food Safety Code",
    description: "Safe Quality Food Program - Food Safety Code for Manufacturing",
    version: "Edition 9"
  },
  gfsi: {
    name: "GFSI Benchmarking",
    description: "Global Food Safety Initiative Benchmarking Requirements",
    version: "2024"
  },
  haccp: {
    name: "HACCP",
    description: "Hazard Analysis Critical Control Points",
    version: "Codex Alimentarius"
  },
  usda: {
    name: "USDA FSIS",
    description: "USDA Food Safety and Inspection Service Requirements",
    version: "2024"
  }
};

export default function ComplianceDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [frameworkModalOpen, setFrameworkModalOpen] = useState(false);
  const [requirementModalOpen, setRequirementModalOpen] = useState(false);
  const [editingFramework, setEditingFramework] = useState(null);
  const [editingRequirement, setEditingRequirement] = useState(null);
  const [orgId, setOrgId] = useState(null);

  const queryClient = useQueryClient();

  // Get org ID - CRITICAL: Only from site_code in localStorage
  useEffect(() => {
    const getOrg = async () => {
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
    };
    getOrg();
  }, []);

  const { data: frameworks = [], isLoading: frameworksLoading } = useQuery({
    queryKey: ["compliance_frameworks", orgId],
    queryFn: () => ComplianceFrameworkRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ["compliance_requirements", orgId],
    queryFn: () => ComplianceRequirementRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: evidence = [] } = useQuery({
    queryKey: ["compliance_evidence", orgId],
    queryFn: () => ComplianceEvidenceRepo.filter({ organization_id: orgId }, "-evidence_date", 500),
    enabled: !!orgId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks_compliance", orgId],
    queryFn: () => TaskRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: trainings = [] } = useQuery({
    queryKey: ["trainings_compliance", orgId],
    queryFn: () => EmployeeTrainingRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const frameworkMutation = useMutation({
    mutationFn: ({ id, data }) => 
      id ? ComplianceFrameworkRepo.update(id, data) 
         : ComplianceFrameworkRepo.create({ ...data, organization_id: orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance_frameworks"] });
      setFrameworkModalOpen(false);
      setEditingFramework(null);
      toast.success("Framework saved");
    }
  });

  const requirementMutation = useMutation({
    mutationFn: ({ id, data }) => 
      id ? ComplianceRequirementRepo.update(id, data)
         : ComplianceRequirementRepo.create({ ...data, organization_id: orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance_requirements"] });
      setRequirementModalOpen(false);
      setEditingRequirement(null);
      toast.success("Requirement saved");
    }
  });

  // Calculate compliance stats
  const complianceStats = useMemo(() => {
    const stats = {
      totalFrameworks: frameworks.length,
      activeFrameworks: frameworks.filter(f => f.is_active).length,
      totalRequirements: requirements.length,
      compliant: requirements.filter(r => r.status === "compliant").length,
      nonCompliant: requirements.filter(r => r.status === "non_compliant").length,
      partial: requirements.filter(r => r.status === "partial").length,
      notAssessed: requirements.filter(r => r.status === "not_assessed").length,
      criticalGaps: requirements.filter(r => r.criticality === "critical" && r.status !== "compliant").length,
      upcomingAudits: frameworks.filter(f => {
        if (!f.next_audit_date) return false;
        const days = differenceInDays(parseISO(f.next_audit_date), new Date());
        return days >= 0 && days <= 90;
      }).length
    };
    stats.overallScore = stats.totalRequirements > 0 
      ? Math.round((stats.compliant / stats.totalRequirements) * 100)
      : 0;
    return stats;
  }, [frameworks, requirements]);

  // Group requirements by framework
  const requirementsByFramework = useMemo(() => {
    const grouped = {};
    frameworks.forEach(f => {
      grouped[f.id] = requirements.filter(r => r.framework_id === f.id);
    });
    return grouped;
  }, [frameworks, requirements]);

  const handleAddFramework = (code) => {
    const template = FRAMEWORK_TEMPLATES[code];
    if (template) {
      setEditingFramework({ code, ...template });
    } else {
      setEditingFramework({ code: "custom" });
    }
    setFrameworkModalOpen(true);
  };

  if (frameworksLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-7 h-7 text-purple-600" />
              Regulatory Compliance
            </h1>
            <p className="text-slate-500 mt-1">
              Track compliance with FDA, FSMA, SQF, GFSI and other standards
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setActiveTab("audit-prep")}>
              <Eye className="w-4 h-4 mr-2" />
              Audit Prep Mode
            </Button>
            <Button onClick={() => handleAddFramework(null)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Framework
            </Button>
          </div>
        </div>

        {/* Overall Compliance Score */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="lg:col-span-2 bg-gradient-to-br from-purple-600 to-purple-800 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm">Overall Compliance Score</p>
                  <p className="text-5xl font-bold mt-1">{complianceStats.overallScore}%</p>
                  <p className="text-purple-200 text-sm mt-2">
                    {complianceStats.compliant} of {complianceStats.totalRequirements} requirements met
                  </p>
                </div>
                <div className="w-24 h-24 rounded-full border-4 border-purple-400 flex items-center justify-center">
                  <Shield className="w-10 h-10 text-purple-200" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Compliant</p>
                  <p className="text-2xl font-bold text-emerald-600">{complianceStats.compliant}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Non-Compliant</p>
                  <p className="text-2xl font-bold text-rose-600">{complianceStats.nonCompliant}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Critical Gaps</p>
                  <p className="text-2xl font-bold text-amber-600">{complianceStats.criticalGaps}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Audits Alert */}
        {complianceStats.upcomingAudits > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center gap-4">
              <Calendar className="w-6 h-6 text-amber-600" />
              <div className="flex-1">
                <p className="font-medium text-amber-900">
                  {complianceStats.upcomingAudits} audit{complianceStats.upcomingAudits > 1 ? 's' : ''} scheduled in the next 90 days
                </p>
                <p className="text-sm text-amber-700">Review requirements and ensure all evidence is current</p>
              </div>
              <Button variant="outline" className="border-amber-300" onClick={() => setActiveTab("audit-prep")}>
                Prepare Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border">
            <TabsTrigger value="overview">Frameworks</TabsTrigger>
            <TabsTrigger value="requirements">Requirements</TabsTrigger>
            <TabsTrigger value="gaps">Gap Analysis</TabsTrigger>
            <TabsTrigger value="audit-prep">Audit Prep</TabsTrigger>
          </TabsList>

          {/* Overview - Frameworks */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {frameworks.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="py-12 text-center">
                  <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Compliance Frameworks</h3>
                  <p className="text-slate-500 mb-6">Add a regulatory framework to start tracking compliance</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {Object.entries(FRAMEWORK_TEMPLATES).map(([code, template]) => (
                      <Button
                        key={code}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddFramework(code)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {template.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {frameworks.map(framework => (
                  <ComplianceFrameworkCard
                    key={framework.id}
                    framework={framework}
                    requirements={requirementsByFramework[framework.id] || []}
                    onEdit={() => {
                      setEditingFramework(framework);
                      setFrameworkModalOpen(true);
                    }}
                    onSelect={() => {
                      setSelectedFramework(framework);
                      setActiveTab("requirements");
                    }}
                    onAddRequirement={() => {
                      setEditingRequirement({ framework_id: framework.id, framework_code: framework.code });
                      setRequirementModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Requirements */}
          <TabsContent value="requirements" className="mt-6">
            <ComplianceRequirementsList
              frameworks={frameworks}
              requirements={requirements}
              evidence={evidence}
              selectedFramework={selectedFramework}
              onSelectFramework={setSelectedFramework}
              onEditRequirement={(req) => {
                setEditingRequirement(req);
                setRequirementModalOpen(true);
              }}
              onAddRequirement={(frameworkId) => {
                const fw = frameworks.find(f => f.id === frameworkId);
                setEditingRequirement({ framework_id: frameworkId, framework_code: fw?.code });
                setRequirementModalOpen(true);
              }}
            />
          </TabsContent>

          {/* Gap Analysis */}
          <TabsContent value="gaps" className="mt-6">
            <ComplianceGapAnalysis
              frameworks={frameworks}
              requirements={requirements}
              evidence={evidence}
              tasks={tasks}
              trainings={trainings}
            />
          </TabsContent>

          {/* Audit Prep */}
          <TabsContent value="audit-prep" className="mt-6">
            <AuditPrepView
              frameworks={frameworks}
              requirements={requirements}
              evidence={evidence}
              organizationId={orgId}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <FrameworkFormModal
        open={frameworkModalOpen}
        onOpenChange={setFrameworkModalOpen}
        framework={editingFramework}
        templates={FRAMEWORK_TEMPLATES}
        onSave={(data) => frameworkMutation.mutate({ id: editingFramework?.id, data })}
        isLoading={frameworkMutation.isPending}
      />

      <RequirementFormModal
        open={requirementModalOpen}
        onOpenChange={setRequirementModalOpen}
        requirement={editingRequirement}
        frameworks={frameworks}
        tasks={tasks}
        onSave={(data) => requirementMutation.mutate({ id: editingRequirement?.id, data })}
        isLoading={requirementMutation.isPending}
      />
    </div>
  );
}