import { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import {
  ControlRepo,
  EvidenceRepo,
  OrganizationRepo,
  PolicyRepo,
  RiskRepo,
  SOC2ControlRepo,
  SOC2EvidenceRepo,
  SOC2PolicyRepo,
  SOC2RiskRepo,
  SOC2VendorRepo,
  VendorRepo
} from "@/lib/adapters/database";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Shield, Loader2 } from "lucide-react";
import SOC2Overview from "@/components/soc2/SOC2Overview";
import SOC2PoliciesTab from "@/components/soc2/SOC2PoliciesTab";
import SOC2ControlsTab from "@/components/soc2/SOC2ControlsTab";
import SOC2EvidenceTab from "@/components/soc2/SOC2EvidenceTab";
import SOC2RisksTab from "@/components/soc2/SOC2RisksTab";
import SOC2VendorsTab from "@/components/soc2/SOC2VendorsTab";
import SOC2SystemDescription from "@/components/soc2/SOC2SystemDescription";
import SOC2ScheduleTab from "@/components/soc2/SOC2ScheduleTab";
import SOC2AuditTab from "@/components/soc2/SOC2AuditTab";
import SOC2GapsTab from "@/components/soc2/SOC2GapsTab";

export default function SOC2Dashboard() {
  const [orgId, setOrgId] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const getOrg = async () => {
      const storedSiteCode = localStorage.getItem("site_code");
      if (!storedSiteCode) {
        window.location.href = createPageUrl("Home");
        return;
      }
      const orgs = await OrganizationRepo.filter({ site_code: storedSiteCode, status: "active" });
      if (orgs.length > 0) {
        setOrgId(orgs[0].id);
      } else {
        window.location.href = createPageUrl("Home");
      }
    };
    getOrg();
  }, []);

  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: ["soc2_policies", orgId],
    queryFn: () => SOC2PolicyRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: controls = [], isLoading: controlsLoading } = useQuery({
    queryKey: ["soc2_controls", orgId],
    queryFn: () => SOC2ControlRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: evidence = [] } = useQuery({
    queryKey: ["soc2_evidence", orgId],
    queryFn: () => SOC2EvidenceRepo.filter({ organization_id: orgId }, "-collected_date", 500),
    enabled: !!orgId
  });

  const { data: risks = [] } = useQuery({
    queryKey: ["soc2_risks", orgId],
    queryFn: () => SOC2RiskRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["soc2_vendors", orgId],
    queryFn: () => SOC2VendorRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  if (!orgId || policiesLoading || controlsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = createPageUrl("Home")}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                Security & Compliance
              </h1>
              <p className="text-sm text-slate-500">Manage policies, controls, evidence, and audit readiness</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="controls">Controls</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="risks">Risks</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="gaps">Gaps</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="system-desc">System Description</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <SOC2Overview
              policies={policies}
              controls={controls}
              evidence={evidence}
              risks={risks}
              vendors={vendors}
              onNavigate={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="policies" className="mt-6">
            <SOC2PoliciesTab orgId={orgId} policies={policies} />
          </TabsContent>

          <TabsContent value="controls" className="mt-6">
            <SOC2ControlsTab orgId={orgId} controls={controls} evidence={evidence} />
          </TabsContent>

          <TabsContent value="evidence" className="mt-6">
            <SOC2EvidenceTab orgId={orgId} evidence={evidence} controls={controls} />
          </TabsContent>

          <TabsContent value="risks" className="mt-6">
            <SOC2RisksTab orgId={orgId} risks={risks} evidence={evidence} />
          </TabsContent>

          <TabsContent value="vendors" className="mt-6">
            <SOC2VendorsTab orgId={orgId} vendors={vendors} />
          </TabsContent>

          <TabsContent value="gaps" className="mt-6">
            <SOC2GapsTab
              controls={controls}
              evidence={evidence}
              policies={policies}
              onNavigate={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="audit" className="mt-6">
            <SOC2AuditTab
              controls={controls}
              evidence={evidence}
              policies={policies}
              risks={risks}
              vendors={vendors}
            />
          </TabsContent>

          <TabsContent value="system-desc" className="mt-6">
            <SOC2SystemDescription />
          </TabsContent>

          <TabsContent value="schedule" className="mt-6">
            <SOC2ScheduleTab controls={controls} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}