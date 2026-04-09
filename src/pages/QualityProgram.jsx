// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Award, FolderOpen, ClipboardList, AlertTriangle, AlertOctagon,
  MessageSquareWarning, Truck, GraduationCap, Shield, ShieldAlert
} from "lucide-react";
import { getDeviceId } from "@/components/access/AccessRequestForm";
import ReadyNormLoader from "@/components/loading/ReadyNormLoader";
import { isAuthenticated, getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, OrganizationGroupRepo, AccessRequestRepo, SiteSettingsRepo, CAPARepo, IssueRepo, CustomerComplaintRepo, ScheduledAuditRepo } from "@/lib/adapters/database";

const QUALITY_MODULES = [
  {
    id: "document_control",
    title: "Document Control",
    description: "Policies, SOPs, version control, and approval workflows",
    icon: FolderOpen,
    color: "from-indigo-500 to-indigo-600",
    page: "DocumentControl",
    settingsKey: "document_control"
  },
  {
    id: "internal_audit",
    title: "Internal Audit",
    description: "Audit scheduling, findings, and compliance frameworks",
    icon: ClipboardList,
    color: "from-slate-600 to-slate-800",
    page: "InternalAudit",
    settingsKey: "internal_audit"
  },
  {
    id: "capa",
    title: "CAPA",
    description: "Corrective and preventive actions with root cause analysis",
    icon: AlertTriangle,
    color: "from-amber-500 to-amber-600",
    page: "CAPAProgram",
    settingsKey: "capa"
  },
  {
    id: "issues_management",
    title: "Issues & Nonconformance",
    description: "Report, track, and resolve quality issues",
    icon: AlertOctagon,
    color: "from-rose-500 to-orange-500",
    page: "IssuesManagement",
    settingsKey: "issues_management"
  },
  {
    id: "customer_complaints",
    title: "Customer Complaints",
    description: "Log, investigate, and resolve customer complaints",
    icon: MessageSquareWarning,
    color: "from-purple-500 to-pink-500",
    page: "CustomerComplaints",
    settingsKey: "customer_complaints"
  },
  {
    id: "supplier_management",
    title: "Supplier Management",
    description: "Approved suppliers, materials, and risk oversight",
    icon: Truck,
    color: "from-cyan-500 to-teal-500",
    page: "SupplierManagement",
    settingsKey: "supplier_management"
  },
  {
    id: "receiving_inspections",
    title: "Receiving Inspections",
    description: "Incoming material inspection, temperature checks, and COA review",
    icon: Truck,
    color: "from-sky-500 to-blue-500",
    page: "ReceivingInspections"
  },
  {
    id: "hold_release",
    title: "Hold & Release",
    description: "Product quarantine, disposition decisions, and release tracking",
    icon: Shield,
    color: "from-rose-500 to-rose-600",
    page: "HoldReleaseManagement"
  },
  {
    id: "change_control",
    title: "Change Control",
    description: "Equipment, process, formulation, and facility change management",
    icon: ClipboardList,
    color: "from-violet-500 to-purple-600",
    page: "ChangeControlProgram"
  },
  {
    id: "calibration",
    title: "Calibration Tracking",
    description: "Equipment calibration schedules, records, and verification",
    icon: ClipboardList,
    color: "from-indigo-500 to-blue-500",
    page: "CalibrationTracking"
  },
  {
    id: "training_competency",
    title: "Training & Competency",
    description: "Training matrices, evaluations, and certification tracking",
    icon: GraduationCap,
    color: "from-teal-500 to-teal-600",
    page: "TrainingCompetency",
    settingsKey: "training_competency"
  },
  {
    id: "risk_management",
    title: "Risk & Management Review",
    description: "Risk register and leadership oversight workflows",
    icon: Shield,
    color: "from-purple-500 to-indigo-500",
    page: "RiskManagement",
    settingsKey: "risk_management"
  }
];

export default function QualityProgram() {
  const [organizationId, setOrganizationId] = useState(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessApproved, setAccessApproved] = useState(false);
  const navigate = useNavigate();

  const code = localStorage.getItem("site_code");

  // Use shared cached org query (same as SanitationProgram / Layout)
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
      const isAuth = await isAuthenticated();
      if (!isAuth) return null;
      return getCurrentUser();
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

  // Fetch summary data for badges
  const { data: capas = [] } = useQuery({
    queryKey: ["quality_capas", organizationId],
    queryFn: () => CAPARepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: issues = [] } = useQuery({
    queryKey: ["quality_issues", organizationId],
    queryFn: () => IssueRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: complaints = [] } = useQuery({
    queryKey: ["quality_complaints", organizationId],
    queryFn: () => CustomerComplaintRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: audits = [] } = useQuery({
    queryKey: ["quality_audits", organizationId],
    queryFn: () => ScheduledAuditRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  // Calculate metrics
  const openCapas = capas.filter(c => c.status !== "closed").length;
  const criticalCapas = capas.filter(c => c.severity === "critical" && c.status !== "closed").length;
  const openIssues = issues.filter(i => i.status !== "closed").length;
  const openComplaints = complaints.filter(c => c.status !== "closed" && c.status !== "responded").length;
  const upcomingAudits = audits.filter(a => a.status === "scheduled").length;

  const handleModuleClick = (page) => {
    sessionStorage.setItem('standalone_program', 'true');
    navigate(createPageUrl(page));
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
            <Award className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-semibold text-slate-900 hidden sm:block">Quality Management System</span>
            <span className="text-sm font-semibold text-slate-900 sm:hidden">Quality</span>
          </div>

          <div className="w-10" /> {/* Spacer for centering */}
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 pb-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 bg-white border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{openCapas}</p>
                <p className="text-xs text-slate-500">Open CAPAs</p>
              </div>
            </div>
            {criticalCapas > 0 && (
              <Badge className="mt-2 bg-red-100 text-red-700 text-xs">
                {criticalCapas} Critical
              </Badge>
            )}
          </Card>

          <Card className="p-4 bg-white border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <AlertOctagon className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{openIssues}</p>
                <p className="text-xs text-slate-500">Open Issues</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageSquareWarning className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{openComplaints}</p>
                <p className="text-xs text-slate-500">Open Complaints</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <ClipboardList className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{upcomingAudits}</p>
                <p className="text-xs text-slate-500">Upcoming Audits</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUALITY_MODULES.map((module, index) => {
            const Icon = module.icon;

            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="p-5 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 bg-white border-slate-200 rounded-2xl shadow-sm"
                  onClick={() => handleModuleClick(module.page)}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{module.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{module.description}</p>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleModuleClick("CAPAProgram")}
              className="text-amber-600 border-amber-200 hover:bg-amber-50"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Create CAPA
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleModuleClick("IssuesManagement")}
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <AlertOctagon className="w-4 h-4 mr-2" />
              Report Issue
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleModuleClick("CustomerComplaints")}
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <MessageSquareWarning className="w-4 h-4 mr-2" />
              Log Complaint
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleModuleClick("InternalAudit")}
              className="text-slate-600 border-slate-200 hover:bg-slate-50"
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              Schedule Audit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}