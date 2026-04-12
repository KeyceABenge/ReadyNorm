// @ts-nocheck
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, OrganizationGroupRepo, AccessRequestRepo, SiteSettingsRepo, EMPSampleRepo, PestFindingRepo, SDSDocumentRepo } from "@/lib/adapters/database";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Microscope, Bug, FileCheck, AlertCircle, CheckCircle2, ShieldAlert
} from "lucide-react";
import { getDeviceId } from "@/components/access/AccessRequestForm";
import ReadyNormLoader from "@/components/loading/ReadyNormLoader";

const FOOD_SAFETY_MODULES = [
  {
    id: "environmental_monitoring",
    title: "Environmental Monitoring",
    description: "EMP sampling, pathogen tracking, zone management, and reswab workflows",
    icon: Microscope,
    color: "from-emerald-500 to-emerald-600",
    page: "EnvironmentalMonitoring",
    settingsKey: "environmental_monitoring"
  },
  {
    id: "pest_control",
    title: "Pest Control",
    description: "Device management, service reports, threshold monitoring, and escalations",
    icon: Bug,
    color: "from-purple-500 to-purple-600",
    page: "PestControl",
    settingsKey: "pest_control"
  },
  {
    id: "food_safety_plan",
    title: "Food Safety Plan (HACCP/HARPC)",
    description: "Hazard analysis, preventive controls, monitoring, verification, and validation",
    icon: FileCheck,
    color: "from-teal-500 to-cyan-500",
    page: "FoodSafetyPlan",
    settingsKey: "food_safety_plan"
  },
  {
    id: "ccp_monitoring",
    title: "CCP & Process Monitoring",
    description: "Critical control points, temperature logs, and deviation tracking",
    icon: FileCheck,
    color: "from-orange-500 to-red-500",
    page: "CCPMonitoring"
  },
  {
    id: "recall_management",
    title: "Recall & Traceability",
    description: "Mock recalls, traceability exercises, and recall readiness",
    icon: AlertCircle,
    color: "from-rose-500 to-rose-600",
    page: "RecallManagement"
  },
  {
    id: "water_testing",
    title: "Water Testing",
    description: "Potability, chlorine, coliform, and water quality monitoring",
    icon: Microscope,
    color: "from-blue-500 to-cyan-500",
    page: "WaterTesting"
  },
  {
    id: "glass_brittle",
    title: "Glass & Brittle Plastics",
    description: "Register, audit, and track breakage incidents",
    icon: AlertCircle,
    color: "from-sky-500 to-blue-500",
    page: "GlassBrittleProgram"
  },
  {
    id: "foreign_material",
    title: "Foreign Material Control",
    description: "Metal detection, X-ray rejects, and FM incident tracking",
    icon: AlertCircle,
    color: "from-amber-500 to-orange-500",
    page: "ForeignMaterialControl"
  },
  {
    id: "label_verification",
    title: "Label Verification",
    description: "Pre-run, changeover, and allergen label checks",
    icon: FileCheck,
    color: "from-teal-500 to-emerald-500",
    page: "LabelVerificationProgram"
  },
  {
    id: "visitor_management",
    title: "Visitor & Contractor Log",
    description: "Sign-in/out, GMP acknowledgment, and access tracking",
    icon: Bug,
    color: "from-violet-500 to-purple-500",
    page: "VisitorManagement"
  }
];

export default function FoodSafetyProgram() {
  const [organizationId, setOrganizationId] = useState(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessApproved, setAccessApproved] = useState(false);

  const code = localStorage.getItem("site_code");

  // Use shared cached org query
  const { data: cachedOrg, isSuccess: orgDone } = useQuery({
    queryKey: ["organization_by_site_code", code],
    queryFn: async () => {
      let orgs = await OrganizationRepo.filter({ site_code: code, status: "active" });
      if (!orgs?.length) orgs = await OrganizationRepo.filter({ site_code: code });
      return orgs[0] || null;
    },
    enabled: !!code,
    staleTime: 10 * 60 * 1000,
  });

  const { data: cachedUser, isSuccess: authDone } = useQuery({
    queryKey: ["auth_me"],
    queryFn: async () => {
      return await getCurrentUser();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (!code) {
      window.location.href = createPageUrl("Home");
      return;
    }

    if (!orgDone) return;

    if (!cachedOrg) {
      setAccessChecked(true);
      return;
    }

    setOrganizationId(cachedOrg.id);

    if (!authDone) return;

    const checkAccess = async () => {
      const isUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
      const user = cachedUser;
      const org = cachedOrg;

      if (user) {
        if (user.role === "admin" || user.email === org.created_by) {
          setAccessApproved(true); setAccessChecked(true); return;
        }
        if (isUuid(org.org_group_id)) {
          try {
            const groups = await OrganizationGroupRepo.filter({ id: org.org_group_id, owner_email: user.email });
            if (groups.length > 0) { setAccessApproved(true); setAccessChecked(true); return; }
          } catch (_) {}
        }
      }

      const deviceId = getDeviceId();
      try {
        let requests = await AccessRequestRepo.filter({ organization_id: org.id, device_id: deviceId, status: "approved" });
        if (requests.length === 0 && user?.email) {
          requests = await AccessRequestRepo.filter({ organization_id: org.id, requester_email: user.email.toLowerCase(), status: "approved" });
        }
        setAccessApproved(requests.length > 0);
      } catch (_) {}
      setAccessChecked(true);
    };

    checkAccess();
  }, [code, cachedOrg, cachedUser, orgDone, authDone]);

  const { data: siteSettings = [] } = useQuery({
    queryKey: ["site_settings", organizationId],
    queryFn: () => SiteSettingsRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId,
    initialData: []
  });

  const settings = siteSettings[0] || { programs_enabled: {} };
  const programsEnabled = settings.programs_enabled || {};

  // Fetch summary data
  const { data: empSamples = [] } = useQuery({
    queryKey: ["fs_emp_samples", organizationId],
    queryFn: () => EMPSampleRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: pestFindings = [] } = useQuery({
    queryKey: ["fs_pest_findings", organizationId],
    queryFn: () => PestFindingRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: fspPlans = [] } = useQuery({
    queryKey: ["fs_plans", organizationId],
    queryFn: () => SDSDocumentRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  // Calculate metrics
  const positiveEMP = empSamples.filter(s => s.result === "positive" || s.result === "presumptive_positive").length;
  const pendingReswabs = empSamples.filter(s => s.reswab_required && s.reswab_status !== "completed").length;
  const criticalPest = pestFindings.filter(f => f.threshold_exceeded && f.exceedance_severity === "critical").length;
  const activePlans = fspPlans.filter(p => p.status === "active").length;

  const handleModuleClick = (page) => {
    sessionStorage.setItem('standalone_program', 'true');
    window.location.href = createPageUrl(page);
  };

  if (!accessChecked) {
    return <ReadyNormLoader />;
  }

  if (accessChecked && !accessApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Required</h2>
          <p className="text-sm text-slate-600 mb-4">You need approved access to use this program.</p>
          <Button onClick={() => window.location.href = createPageUrl("Home")}>Request Access</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50">
      {/* Top Bar */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 pt-4 sm:pt-6">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6 sm:mb-8"
        >
          <button 
            onClick={() => window.location.href = createPageUrl("Home")}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>

          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-900 hidden sm:block">Food Safety Program</span>
            <span className="text-sm font-semibold text-slate-900 sm:hidden">Food Safety</span>
          </div>

          <div className="w-10" /> {/* Spacer for centering */}
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 pb-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 bg-white border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Microscope className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{positiveEMP}</p>
                <p className="text-xs text-slate-500">EMP Positives</p>
              </div>
            </div>
            {pendingReswabs > 0 && (
              <Badge className="mt-2 bg-amber-100 text-amber-700 text-xs">
                {pendingReswabs} Reswabs Pending
              </Badge>
            )}
          </Card>

          <Card className="p-4 bg-white border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Bug className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{criticalPest}</p>
                <p className="text-xs text-slate-500">Critical Pest Issues</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <FileCheck className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{activePlans}</p>
                <p className="text-xs text-slate-500">Active FSP Plans</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${criticalPest === 0 && positiveEMP === 0 ? "bg-green-100" : "bg-amber-100"}`}>
                {criticalPest === 0 && positiveEMP === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {criticalPest === 0 && positiveEMP === 0 ? "All Clear" : "Attention Needed"}
                </p>
                <p className="text-xs text-slate-500">System Status</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FOOD_SAFETY_MODULES.map((module, index) => {
            const Icon = module.icon;

            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="p-6 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 bg-white border-slate-200 rounded-2xl shadow-sm"
                  onClick={() => handleModuleClick(module.page)}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900 mb-2">{module.title}</h3>
                  <p className="text-sm text-slate-500">{module.description}</p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}