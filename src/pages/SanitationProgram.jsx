// @ts-nocheck
import { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { isAuthenticated, getCurrentUser, redirectToLogin } from "@/lib/adapters/auth";
import { OrganizationRepo, OrganizationGroupRepo, TaskRepo, EmployeeSessionRepo, SiteSettingsRepo, EmployeeRepo, CrewRepo, AccessRequestRepo } from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Brush, Users, ClipboardCheck, ShieldCheck, Search,
  CheckCircle2, Clock, ListChecks, Droplets, FlaskConical,
  ChevronRight, ShieldAlert
} from "lucide-react";
import ReadyNormLoader from "@/components/loading/ReadyNormLoader";
import { getDeviceId } from "@/components/access/AccessRequestForm";

const MANAGER_ACTIONS = [
  {
    id: "manager",
    title: "Sanitation Manager Dashboard",
    description: "Full dashboard access, scheduling, analytics, and team management",
    icon: ShieldCheck,
    color: "from-slate-700 to-slate-900",
    page: "ManagerDashboard",
    requiresAuth: true
  },
  {
    id: "preop",
    title: "Pre-Operational Inspection",
    description: "Inspect production lines before operations begin",
    icon: ClipboardCheck,
    color: "from-purple-500 to-purple-600",
    page: "PreOpInspection",
    requiresAuth: true,
    setupQA: true
  },
  {
    id: "postclean",
    title: "Post-Clean Inspection",
    description: "Verify cleaning quality on completed line cleanings",
    icon: Search,
    color: "from-cyan-500 to-cyan-600",
    page: "PostCleanInspection",
    requiresAuth: true,
    setupQA: true
  }
];

export default function SanitationProgram() {
  const [organizationId, setOrganizationId] = useState(null);
  const [siteCode, setSiteCode] = useState(null);
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
      const isAuth = await isAuthenticated();
      if (!isAuth) return null;
      return getCurrentUser();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (code) setSiteCode(code);
    
    if (!code) {
      setAccessChecked(true);
      return;
    }

    if (!orgDone) return; // still loading

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
        // Admin role or email matches created_by (new Supabase orgs)
        if (user.role === "admin" || user.email === org.created_by) {
          setAccessApproved(true); setAccessChecked(true); return;
        }
        // Legacy orgs: created_by may be a Base44 ObjectId — verify via org group owner_email
        if (isUuid(org.org_group_id)) {
          try {
            const groups = await OrganizationGroupRepo.filter({ id: org.org_group_id, owner_email: user.email });
            if (groups.length > 0) { setAccessApproved(true); setAccessChecked(true); return; }
          } catch (_) {}
        }
      }

      // Device-based access request, with email fallback for authenticated users
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

  // Fetch summary data
  const { data: tasks = [] } = useQuery({
    queryKey: ["san_tasks", organizationId],
    queryFn: () => TaskRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId,
    staleTime: 60000
  });

  // Fetch ALL of today's sessions (active + ended) for completion metrics
  const { data: sessions = [] } = useQuery({
    queryKey: ["san_sessions", organizationId],
    staleTime: 30000,
    queryFn: async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const todaySessions = await EmployeeSessionRepo.filter({ 
        organization_id: organizationId, 
        session_date: todayStr
      });
      
      // Auto-close stale active sessions in the background
      const now = new Date();
      const staleSessions = todaySessions.filter(s => {
        if (s.status !== "active") return false;
        const lastActivity = s.last_activity_at || s.start_time;
        if (!lastActivity) return true;
        return (now - new Date(lastActivity)) / (1000 * 60 * 60) > 12;
      });
      
      if (staleSessions.length > 0) {
        Promise.all(staleSessions.map(s => 
          EmployeeSessionRepo.update(s.id, {
            status: "auto_ended",
            end_time: s.last_activity_at || now.toISOString(),
            end_reason: "auto_shift_end"
          }).catch(() => {})
        ));
      }
      
      return todaySessions;
    },
    enabled: !!organizationId
  });

  const { data: siteSettings = [] } = useQuery({
    queryKey: ["san_site_settings", organizationId],
    queryFn: () => SiteSettingsRepo.filter({ organization_id: organizationId }),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["san_employees", organizationId],
    queryFn: () => EmployeeRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId,
    staleTime: 60000
  });

  const { data: crews = [] } = useQuery({
    queryKey: ["san_crews", organizationId],
    queryFn: () => CrewRepo.filter({ organization_id: organizationId, status: "active" }),
    enabled: !!organizationId,
    staleTime: 60000
  });

  // Calculate metrics
  const activeSessions = sessions.filter(s => s.status === "active").length;
  const activeEmployees = employees.length;

  // Determine if a shift is currently active based on SiteSettings shift windows
  const settings = siteSettings[0];
  const shifts = settings?.shifts || [
    { id: "shift_1", name: "Day Shift", start_time: "05:00", end_time: "17:00" },
    { id: "shift_2", name: "Night Shift", start_time: "17:00", end_time: "05:00" }
  ];
  
  const getCurrentShift = () => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    
    for (const shift of shifts) {
      const [startH, startM] = (shift.start_time || "00:00").split(":").map(Number);
      const [endH, endM] = (shift.end_time || "23:59").split(":").map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      const buffer = shift.buffer_before_minutes || 30;
      
      if (endMin > startMin) {
        // Same day shift
        if (nowMinutes >= (startMin - buffer) && nowMinutes < (endMin + (shift.buffer_after_minutes || 30))) {
          return shift;
        }
      } else {
        // Overnight shift
        if (nowMinutes >= (startMin - buffer) || nowMinutes < (endMin + (shift.buffer_after_minutes || 30))) {
          return shift;
        }
      }
    }
    return null;
  };

  const currentShift = getCurrentShift();
  const shiftIsActive = !!currentShift || activeSessions > 0;

  // Calculate expected employees for the current shift based on crew schedules
  const expectedEmployees = (() => {
    if (!currentShift || crews.length === 0) return 0;
    const todayDate = new Date().toISOString().slice(0, 10);
    const selectedId = currentShift.id;
    const [selStartH] = (currentShift.start_time || "06:00").split(":").map(Number);
    const [selEndH] = (currentShift.end_time || "14:30").split(":").map(Number);
    const selIsNight = selEndH <= selStartH;
    const memberEmails = new Set();

    for (const crew of crews) {
      if (!crew.members || crew.members.length === 0) continue;

      // Match crew to shift
      if (crew.shift_id) {
        if (crew.shift_id !== selectedId) continue;
      } else {
        const isPrimary = selectedId === "shift_1" || selectedId === "shift_2";
        if (!isPrimary) continue;
        const cStart = crew.shift_start_time;
        const cEnd = crew.shift_end_time;
        let crewIsNight = false;
        if (cStart && cEnd) { crewIsNight = parseInt(cEnd.split(":")[0]) <= parseInt(cStart.split(":")[0]); }
        else if (!cStart && cEnd) { crewIsNight = true; }
        else { crewIsNight = (crew.name || "").toLowerCase().includes("night"); }
        if (crewIsNight !== selIsNight) continue;
      }

      // Check schedule pattern for today
      if (crew.schedule_pattern && crew.schedule_pattern.length > 0 && crew.schedule_pattern_start_date) {
        const patternStart = new Date(crew.schedule_pattern_start_date + "T00:00:00Z");
        const targetDate = new Date(todayDate + "T00:00:00Z");
        const diffDays = Math.floor((targetDate - patternStart) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) continue;
        const totalPatternDays = crew.schedule_pattern.length * 7;
        const dayInPattern = ((diffDays % totalPatternDays) + totalPatternDays) % totalPatternDays;
        const weekIndex = Math.floor(dayInPattern / 7);
        const dayOfWeek = dayInPattern % 7;
        const weekPattern = crew.schedule_pattern[weekIndex];
        if (!weekPattern || weekPattern[dayOfWeek] !== true) continue;
      } else {
        continue;
      }

      for (const email of crew.members) memberEmails.add(email);
    }
    return memberEmails.size;
  })();

  // Today's completion rate from all of today's sessions
  const totalSelected = sessions.reduce((sum, s) => sum + (s.tasks_selected_count || s.selected_tasks?.length || 0), 0);
  const totalCompleted = sessions.reduce((sum, s) => sum + (s.tasks_completed_count || s.completed_tasks?.length || 0), 0);
  const completionRate = totalSelected > 0 ? Math.round((totalCompleted / totalSelected) * 100) : 0;

  // Predicted rate: extrapolate based on shift time elapsed
  const predictedRate = (() => {
    if (totalSelected === 0 || !currentShift) return completionRate;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const [sH, sM] = (currentShift.start_time || "05:00").split(":").map(Number);
    const [eH, eM] = (currentShift.end_time || "17:00").split(":").map(Number);
    let shiftLen = (eH * 60 + eM) - (sH * 60 + sM);
    if (shiftLen <= 0) shiftLen += 1440;
    let elapsed = nowMin - (sH * 60 + sM);
    if (elapsed < 0) elapsed += 1440;
    const pctElapsed = Math.min(elapsed / shiftLen, 1);
    if (pctElapsed < 0.05) return completionRate;
    return Math.min(Math.round(completionRate / pctElapsed), 100);
  })();

  const handleActionClick = async (action) => {
    // All manager actions require auth
    try {
      const isAuth = await isAuthenticated();
      if (!isAuth) {
        redirectToLogin(createPageUrl(action.page));
        return;
      }
      const user = await getCurrentUser();
      
      // For Pre-Op inspection, set up the manager as a QA inspector
      if (action.setupQA) {
        const qaData = {
          email: user.email,
          name: user.display_name || user.full_name || user.email,
          organization_id: organizationId,
          is_qa_team: true
        };
        localStorage.setItem("selectedQAEmployee", JSON.stringify(qaData));
      }
      
      window.location.href = createPageUrl(action.page);
    } catch (e) {
      redirectToLogin(createPageUrl(action.page));
    }
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
          <p className="text-sm text-slate-600 mb-4">
            You need to request and receive access approval before using this program.
          </p>
          <Button onClick={() => window.location.href = createPageUrl("Home")}>
            Request Access
          </Button>
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
            <Brush className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-slate-900">Sanitation Program</span>
          </div>

          {siteCode && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Site</span>
              <code className="text-xs font-mono font-bold text-slate-800">{siteCode}</code>
            </div>
          )}
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 bg-white border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {activeSessions}
                  {expectedEmployees > 0 && (
                    <span className="text-sm font-normal text-slate-400">/{expectedEmployees}</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">Active Sessions</p>
                {expectedEmployees > 0 && activeSessions < expectedEmployees && (
                  <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                    {expectedEmployees - activeSessions} not started
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <ListChecks className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-900">{completionRate}%</p>
                <p className="text-xs text-slate-500">{totalCompleted}/{totalSelected} tasks done</p>
              </div>
            </div>
            {currentShift && totalSelected > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Projected end-of-shift</span>
                  <span className={`text-sm font-bold ${predictedRate >= 90 ? "text-emerald-600" : predictedRate >= 70 ? "text-amber-600" : "text-red-500"}`}>
                    {predictedRate}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all ${predictedRate >= 90 ? "bg-emerald-500" : predictedRate >= 70 ? "bg-amber-500" : "bg-red-400"}`}
                    style={{ width: `${Math.min(predictedRate, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </Card>

          <Card className="p-4 bg-white border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{activeEmployees}</p>
                <p className="text-xs text-slate-500">Active Employees</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${shiftIsActive ? "bg-green-100" : "bg-slate-100"}`}>
                {shiftIsActive ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <Clock className="w-5 h-5 text-slate-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {shiftIsActive ? (currentShift?.name || "Shift Active") : "No Active Shift"}
                </p>
                <p className="text-xs text-slate-500">Current Status</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Manager Actions */}
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Manager Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {MANAGER_ACTIONS.map((action, index) => {
            const Icon = action.icon;

            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="p-5 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 bg-white border-slate-200 rounded-2xl shadow-sm group"
                  onClick={() => handleActionClick(action)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-slate-700">{action.title}</h3>
                      <p className="text-sm text-slate-500">{action.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Info */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Program Features</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <ListChecks className="w-4 h-4 text-blue-500" />
              Master Sanitation Schedule
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Brush className="w-4 h-4 text-blue-500" />
              Line Cleanings
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Droplets className="w-4 h-4 text-blue-500" />
              Drain Management
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <FlaskConical className="w-4 h-4 text-blue-500" />
              Chemical Titration
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}