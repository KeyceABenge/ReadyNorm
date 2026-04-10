// @ts-nocheck
import { useState, useEffect } from "react";
import { isAuthenticated, getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, AccessRequestRepo, EmployeeRepo, CrewRepo, SiteSettingsRepo, RoleConfigRepo } from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Users, Search, Sun, Moon, ShieldAlert, Calendar } from "lucide-react";
import ReadyNormLoader from "@/components/loading/ReadyNormLoader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { findOrCreateShiftSession, inferActiveShift } from "@/components/session/ShiftSessionEngine";
import PinEntryModal from "@/components/employee/PinEntryModal";
import ActiveOnShiftBanner from "@/components/employee/ActiveOnShiftBanner";
import CrewOrgChart from "@/components/employee/CrewOrgChart";
import { getDeviceId } from "@/components/access/AccessRequestForm";
import ProxiedImage from "@/components/ui/ProxiedImage";

export default function EmployeeLogin() {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [siteCode, setSiteCode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [pinModalEmployee, setPinModalEmployee] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Get site code and validate
  useEffect(() => {
    const initializeSite = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSiteCode = urlParams.get('site');
      const storedSiteCode = localStorage.getItem('site_code');
      const code = urlSiteCode || storedSiteCode;

      if (!code) {
        window.location.href = createPageUrl("Home");
        return;
      }

      try {
        const orgs = await OrganizationRepo.filter({ site_code: code, status: "active" });
        if (orgs.length === 0) {
          toast.error("Invalid site code");
          localStorage.removeItem('site_code');
          window.location.href = createPageUrl("Home");
          return;
        }

        setSiteCode(code);
        setOrganization(orgs[0]);
        localStorage.setItem('site_code', code);
        
        // Check if site creator - bypass access check
        let isSiteCreator = false;
        try {
          const isAuth = await isAuthenticated();
          if (isAuth) {
            const user = await getCurrentUser();
            if (user.role === "admin" || user.email === orgs[0].created_by) {
              isSiteCreator = true;
            }
          }
        } catch (e) { /* not authenticated */ }
        
        if (!isSiteCreator) {
          // Check device access approval
          const deviceId = getDeviceId();
          const requests = await AccessRequestRepo.filter({
            organization_id: orgs[0].id,
            device_id: deviceId,
            status: "approved"
          });
          if (requests.length === 0) {
            setAccessDenied(true);
            setIsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error("Error validating site:", e);
        window.location.href = createPageUrl("Home");
      } finally {
        setIsLoading(false);
      }
    };

    initializeSite();
  }, []);

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["employees", organization?.id],
    queryFn: () => EmployeeRepo.filter({ organization_id: organization.id, status: "active" }),
    enabled: !!organization
  });

  const { data: crews = [] } = useQuery({
    queryKey: ["crews", organization?.id],
    queryFn: () => CrewRepo.filter({ organization_id: organization.id, status: "active" }),
    enabled: !!organization
  });

  const { data: siteSettings = [] } = useQuery({
    queryKey: ["site_settings", organization?.id],
    queryFn: () => SiteSettingsRepo.filter({ organization_id: organization.id }),
    enabled: !!organization
  });

  const { data: roleConfigs = [] } = useQuery({
    queryKey: ["role_configs", organization?.id],
    queryFn: () => RoleConfigRepo.filter({ organization_id: organization.id }),
    enabled: !!organization
  });

  // Get current shift info for display - prefer crew-based shifts
  const currentSettings = siteSettings[0] || {};
  const siteActiveShift = inferActiveShift(currentSettings.shifts || []);
  // For the login page banner, show the site-wide shift 
  const activeShift = siteActiveShift;

  const handleSelectEmployee = async (employee) => {
    // If employee has a PIN, show PIN modal
    if (employee.pin_code) {
      setPinModalEmployee(employee);
    } else {
      setSelectedEmployee(employee);
      await createSession(employee);
    }
  };

  const handlePinSuccess = async () => {
    setPinModalEmployee(null);
    setSelectedEmployee(pinModalEmployee);
    await createSession(pinModalEmployee);
  };

  const createSession = async (employee) => {
    let session = null;
    let isNew = true;
    let shift = { name: "Shift" };
    let previousShiftEnded = false;

    try {
      const settings = siteSettings[0] || {};
      const result = await findOrCreateShiftSession(employee, organization, settings, crews);
      session = result.session;
      isNew = result.isNew;
      shift = result.shift;
      previousShiftEnded = result.previousShiftEnded;
    } catch (e) {
      // DB session creation failed (e.g. RLS policy) — build a local-only session
      // so the employee can still use the app. Session won't persist across devices
      // but the shift will work on this device.
      console.warn("[EmployeeLogin] Session DB error (using local fallback):", e?.message);
      session = {
        id: crypto.randomUUID(),
        organization_id: organization.id,
        employee_id: employee.id,
        employee_name: employee.name,
        session_date: new Date().toISOString().split("T")[0],
        status: "active",
        selected_tasks: [],
        completed_tasks: [],
        start_time: new Date().toISOString(),
        _local_only: true,
      };
    }

    localStorage.setItem("selectedEmployee", JSON.stringify(employee));
    localStorage.setItem("employeeSession", JSON.stringify(session));

    if (previousShiftEnded && isNew) {
      toast.info(`Previous shift ended. Starting new ${shift.name} session.`);
    } else if (isNew) {
      toast.success(`Starting ${shift.name} session`);
    } else {
      toast.success(`Resuming ${shift.name} session`);
    }

    setTimeout(() => {
      window.location.href = createPageUrl("EmployeeDashboard");
    }, 300);
  };

  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'short' });
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const dayNum = now.getDate();

  if (isLoading || employeesLoading || !organization) {
    return <ReadyNormLoader />;
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="text-center max-w-sm p-8 rounded-2xl border-0 shadow-sm">
          <div className="w-16 h-16 mx-auto bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-[#e8734a]" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Required</h2>
          <p className="text-sm text-slate-500 mb-6">
            You need to request access before you can use this portal.
          </p>
          <Button 
            onClick={() => window.location.href = createPageUrl("Home")}
            className="bg-slate-900 hover:bg-slate-800 rounded-full px-6"
          >
            Request Access
          </Button>
        </Card>
      </div>
    );
  }

  const isDayShift = parseInt(activeShift?.start_time?.split(":")[0] || 0) >= 5 && 
    parseInt(activeShift?.start_time?.split(":")[0] || 0) < 17;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50">
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">

        {/* Top Bar */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6 sm:mb-8"
        >
          <button 
            onClick={() => window.location.href = createPageUrl("Home")}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>

          <div className="flex items-center gap-2">
            {currentSettings?.logo_url ? (
              <ProxiedImage src={currentSettings.logo_url} alt="" className="h-6 w-auto" />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
                <span className="text-white text-xs font-bold">{organization.name?.charAt(0)}</span>
              </div>
            )}
            <span className="text-sm font-semibold text-slate-900 hidden sm:block">{organization.name}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Site</span>
            <code className="text-xs font-mono font-bold text-slate-800">{siteCode}</code>
          </div>
        </motion.div>

        {/* Date + Shift Card Row */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-wrap items-center gap-3 mb-6 sm:mb-8"
        >
          {/* Date pill */}
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 px-4 py-2.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <span className="text-lg font-bold text-slate-900">{dayNum}</span>
            </div>
            <div className="leading-tight">
              <span className="text-xs text-slate-400 block">{dayName},</span>
              <span className="text-sm font-semibold text-slate-900">{monthName}</span>
            </div>
            <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block" />
            <Calendar className="w-4 h-4 text-slate-400 hidden sm:block" />
          </div>

          {/* Shift badges - show all crew shifts */}
          {crews.length > 0 ? (
            crews.filter(c => c.shift_start_time && c.shift_end_time).map(crew => {
              const crewStartHour = parseInt(crew.shift_start_time?.split(":")[0] || 0);
              const isDay = crewStartHour >= 5 && crewStartHour < 17;
              return (
                <div key={crew.id} className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-2 text-white font-medium text-xs shadow-sm"
                )} style={{ backgroundColor: crew.color || (isDay ? "#e8734a" : "#1e293b") }}>
                  {isDay ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  <span>{crew.name}</span>
                  <span className="text-white/70 text-[10px]">{crew.shift_start_time}–{crew.shift_end_time}</span>
                </div>
              );
            })
          ) : activeShift ? (
            <div className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2.5 text-white font-medium text-sm shadow-sm",
              isDayShift ? "bg-[#e8734a]" : "bg-slate-800"
            )}>
              {isDayShift ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{activeShift.name}</span>
              <span className="text-white/70 text-xs">{activeShift.start_time} – {activeShift.end_time}</span>
            </div>
          ) : null}

          {/* Employee count */}
          <div className="flex items-center gap-1.5 bg-white rounded-full border border-slate-200 px-3 py-2 shadow-sm">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-600">{employees.length} employees</span>
          </div>
        </motion.div>

        {/* Hero prompt */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
            Hey, ready to start? 👋
          </h1>
          <p className="text-base sm:text-lg text-slate-400 mt-1">
            Select your name below to begin your shift
          </p>
        </motion.div>

        {/* Active on Shift */}
        <ActiveOnShiftBanner
          organizationId={organization?.id}
          activeShift={activeShift}
          employees={employees}
          onSelectEmployee={handleSelectEmployee}
        />

        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6 relative max-w-md"
        >
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 text-sm bg-white border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#e8734a]/20 focus:border-[#e8734a]/40"
          />
        </motion.div>

        {/* Crew Org Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <CrewOrgChart
            crews={crews}
            employees={employees}
            roleConfigs={roleConfigs}
            searchQuery={searchQuery}
            selectedEmployee={selectedEmployee}
            onSelectEmployee={handleSelectEmployee}
          />
        </motion.div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8 sm:mt-12 pb-6"
        >
          <p className="text-xs text-slate-400 mb-3">
            Don't see your name? Contact your manager
          </p>
        </motion.div>

        {/* PIN Entry Modal */}
        <PinEntryModal
          open={!!pinModalEmployee}
          onClose={() => setPinModalEmployee(null)}
          employee={pinModalEmployee}
          onSuccess={handlePinSuccess}
        />
      </div>
    </div>
  );
}